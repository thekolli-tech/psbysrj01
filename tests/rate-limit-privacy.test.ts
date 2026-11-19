import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';
import {
  clientKey,
  resolveRateKey,
  normalizeRateLimitIdentity,
  hashRateLimitIdentity,
  getRateLimitKeySecret,
  allowMemoryRequest,
  RATE_LIMIT_DERIVATION_DOMAIN,
  TEST_ONLY_RATE_LIMIT_SEED
} from '../src/server/rateLimit.ts';

test('Phase 4A: Rate-Limit Privacy Hardening Suite', async (t) => {
  const originalEnv = { ...process.env };

  t.afterEach(() => {
    process.env = { ...originalEnv };
  });

  // ============================================================================
  // 1. PRIVACY & PLAINTEXT REMOVAL
  // ============================================================================

  await t.test('Plaintext emails NEVER appear in generated rate limit keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const email = 'sensitive.director@propertystudio.org';
    const key = clientKey('203.0.113.45', 'login', email);

    assert.equal(key.includes('sensitive'), false, 'Email username must not appear in key');
    assert.equal(key.includes('director'), false, 'Email parts must not appear in key');
    assert.equal(key.includes('propertystudio.org'), false, 'Email domain must not appear in key');
    assert.equal(key.includes('@'), false, '@ symbol must not appear in key');
    assert.match(key, /^ps:rl:login:203\.0\.113\.45:id_[a-f0-9]{32}$/);
  });

  await t.test('Plaintext phone numbers NEVER appear in generated rate limit keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const rawPhones = [
      '+91 90123 45678',
      '9012345678',
      '09012345678',
      '+91-90123-45678',
      '919012345678'
    ];

    for (const phone of rawPhones) {
      const key = clientKey('198.51.100.10', 'phone-otp', phone);
      assert.equal(key.includes('9012345678'), false, 'Digits must not appear in key');
      assert.equal(key.includes('90123'), false, 'Prefix digits must not appear in key');
      assert.equal(key.includes('+91'), false, 'Country code must not appear in key');
      assert.match(key, /^ps:rl:phone-otp:198\.51\.100\.10:id_[a-f0-9]{32}$/);
    }
  });

  // ============================================================================
  // 2. CANONICAL NORMALIZATION & IDENTITY COLLAPSE PREVENTION
  // ============================================================================

  await t.test('Equivalent normalized emails generate IDENTICAL keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const key1 = clientKey('198.51.100.10', 'login', 'Swamy.Reddy@Example.COM');
    const key2 = clientKey('198.51.100.10', 'login', '  swamy.reddy@example.com  ');
    const key3 = clientKey('198.51.100.10', 'login', 'SWAMY.REDDY@EXAMPLE.COM');

    assert.equal(key1, key2, 'Whitespace and uppercase variations must map to same bucket');
    assert.equal(key2, key3, 'All-caps variation must map to same bucket');
  });

  await t.test('Equivalent Indian mobile formats generate IDENTICAL keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const keyCanonical = clientKey('198.51.100.10', 'phone-otp', '+919876543210');
    const key10Digit = clientKey('198.51.100.10', 'phone-otp', '9876543210');
    const keyLeadingZero = clientKey('198.51.100.10', 'phone-otp', '09876543210');
    const keyDashed = clientKey('198.51.100.10', 'phone-otp', '+91-98765-43210');
    const keySpaced = clientKey('198.51.100.10', 'phone-otp', '+91 98765 43210');
    const keyPrefix91 = clientKey('198.51.100.10', 'phone-otp', '919876543210');

    assert.equal(key10Digit, keyCanonical, '10-digit format must match canonical E.164');
    assert.equal(keyLeadingZero, keyCanonical, 'Leading-zero format must match canonical E.164');
    assert.equal(keyDashed, keyCanonical, 'Dashed format must match canonical E.164');
    assert.equal(keySpaced, keyCanonical, 'Spaced format must match canonical E.164');
    assert.equal(keyPrefix91, keyCanonical, '91-prefix format must match canonical E.164');
  });

  await t.test('International phone formats normalize consistently', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const usKey1 = clientKey('198.51.100.10', 'phone-otp', '+1 (555) 123-4567');
    const usKey2 = clientKey('198.51.100.10', 'phone-otp', '+15551234567');
    assert.equal(usKey1, usKey2, 'US format variations must match');

    const ukKey1 = clientKey('198.51.100.10', 'phone-otp', '+44 20 7946 0991');
    const ukKey2 = clientKey('198.51.100.10', 'phone-otp', '+442079460991');
    assert.equal(ukKey1, ukKey2, 'UK format variations must match');

    assert.notEqual(usKey1, ukKey1, 'Different international numbers must produce distinct keys');
  });

  await t.test('Domain tagging mathematically prevents distinct identity types from collapsing', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';

    // String 'invalid' vs email 'invalid@domain.com'
    const keyRawInvalid = clientKey('198.51.100.10', 'phone-otp', 'invalid');
    const keyEmailInvalid = clientKey('198.51.100.10', 'login', 'invalid@domain.com');
    assert.notEqual(keyRawInvalid, keyEmailInvalid, 'Raw "invalid" must not collapse with email');

    // Phone digits '9876543210' vs raw string 'user9876543210'
    const keyPhone = clientKey('198.51.100.10', 'phone-otp', '9876543210');
    const keyRaw = clientKey('198.51.100.10', 'phone-otp', 'raw_9876543210');
    assert.notEqual(keyPhone, keyRaw, 'Phone must not collapse with raw string');

    // Malformed email inputs
    const keyMalformed1 = clientKey('198.51.100.10', 'login', '@bad.com');
    const keyMalformed2 = clientKey('198.51.100.10', 'login', 'bad@');
    assert.notEqual(keyMalformed1, keyMalformed2, 'Different malformed emails must be distinct');
  });

  await t.test('Different identities generate DIFFERENT keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const keyEmail1 = clientKey('198.51.100.10', 'login', 'user1@example.com');
    const keyEmail2 = clientKey('198.51.100.10', 'login', 'user2@example.com');
    assert.notEqual(keyEmail1, keyEmail2, 'Different emails must have distinct rate limit keys');

    const keyPhone1 = clientKey('198.51.100.10', 'phone-otp', '9876543210');
    const keyPhone2 = clientKey('198.51.100.10', 'phone-otp', '9876543211');
    assert.notEqual(keyPhone1, keyPhone2, 'Different phones must have distinct rate limit keys');
  });

  // ============================================================================
  // 3. SECRET MANAGEMENT, DOMAIN SEPARATION & PRODUCTION FAILURE POLICY
  // ============================================================================

  await t.test('Domain-separated fallback derives isolated key from OTP_HASH_SECRET', () => {
    delete process.env.RATE_LIMIT_KEY_SECRET;
    process.env.OTP_HASH_SECRET = 'production-live-otp-hash-secret-xyz';
    delete process.env.SESSION_SECRET;

    const derived = getRateLimitKeySecret();
    assert.notEqual(derived, process.env.OTP_HASH_SECRET, 'Derived key must never equal raw source secret');

    const expectedDerived = crypto
      .createHmac('sha256', 'production-live-otp-hash-secret-xyz')
      .update(RATE_LIMIT_DERIVATION_DOMAIN)
      .digest('hex');
    assert.equal(derived, expectedDerived, 'Derived key must match HMAC domain separation');
  });

  await t.test('Production strictly REJECTS missing secrets and refuses static fallback', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.RATE_LIMIT_KEY_SECRET;
    delete process.env.OTP_HASH_SECRET;
    delete process.env.SESSION_SECRET;

    assert.throws(
      () => getRateLimitKeySecret(),
      /Missing RATE_LIMIT_KEY_SECRET in production environment/,
      'Production must refuse to generate keys with static seed when all secrets are missing'
    );
  });

  await t.test('Development/test allows isolated test seed when secrets are missing', () => {
    process.env.NODE_ENV = 'test';
    delete process.env.RATE_LIMIT_KEY_SECRET;
    delete process.env.OTP_HASH_SECRET;
    delete process.env.SESSION_SECRET;

    const secret = getRateLimitKeySecret();
    assert.equal(secret, TEST_ONLY_RATE_LIMIT_SEED);
  });

  await t.test('Secret rotation cleanly creates a new key namespace', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'secret-generation-1';
    const keyGen1 = clientKey('198.51.100.10', 'login', 'rotate@example.com');

    process.env.RATE_LIMIT_KEY_SECRET = 'secret-generation-2';
    const keyGen2 = clientKey('198.51.100.10', 'login', 'rotate@example.com');

    assert.notEqual(keyGen1, keyGen2, 'Rotating secret must generate new key namespace');
  });

  // ============================================================================
  // 4. IP PSEUDONYMIZATION & PRODUCTION DEFAULT
  // ============================================================================

  await t.test('Production enables IP pseudonymization by default', () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_KEY_SECRET = 'prod-secret-999';
    delete process.env.RATE_LIMIT_PSEUDONYMIZE_IP;

    const key = clientKey('203.0.113.195', 'login', 'user@example.com');
    assert.equal(key.includes('203.0.113.195'), false, 'Raw IP must be pseudonymized in production by default');
    assert.match(key, /^ps:rl:login:ip_[a-f0-9]{16}:id_/);
  });

  await t.test('Production allows explicit opt-out of IP pseudonymization', () => {
    process.env.NODE_ENV = 'production';
    process.env.RATE_LIMIT_KEY_SECRET = 'prod-secret-999';
    process.env.RATE_LIMIT_PSEUDONYMIZE_IP = 'false';

    const key = clientKey('203.0.113.195', 'login', 'user@example.com');
    assert.match(key, /^ps:rl:login:203\.0\.113\.195:id_/, 'Raw IP should be preserved when explicitly set to false');
  });

  await t.test('Development/test preserves clean IP by default', () => {
    process.env.NODE_ENV = 'test';
    process.env.RATE_LIMIT_KEY_SECRET = 'dev-secret-111';
    delete process.env.RATE_LIMIT_PSEUDONYMIZE_IP;

    const key = clientKey('203.0.113.195', 'login', 'user@example.com');
    assert.match(key, /^ps:rl:login:203\.0\.113\.195:id_/);
  });

  // ============================================================================
  // 5. RATE LIMIT ENFORCEMENT & CONTEXT-AWARE ROUTING
  // ============================================================================

  await t.test('End-to-end memory rate limit enforcement blocks bursts with pseudonymous keys', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const targetEmail = `burst-${Date.now()}@test.org`;
    const key = clientKey('198.51.100.22', 'auth_burst', targetEmail);

    const limit = 3;
    const windowMs = 5000;

    // Hits 1, 2, 3 allowed
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);

    // Hit 4 rejected with positive retryAfter
    const blocked = allowMemoryRequest(key, limit, windowMs);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 5);
  });

  await t.test('Empty identity produces standard IP-only key format without trailing garbage', () => {
    process.env.RATE_LIMIT_KEY_SECRET = 'test-secret-salt-alpha';
    const key = clientKey('198.51.100.22', 'public_read', '');
    assert.equal(key, 'ps:rl:public_read:198.51.100.22:');
  });

  await t.test('resolveRateKey preserves authenticated user isolation', () => {
    const mockAuthReq = {
      user: { id: 'usr_authenticated_tenant_99' },
      ip: '198.51.100.22'
    } as any;
    const key = resolveRateKey(mockAuthReq, 'create_post', 'ignored_email@test.org');
    assert.equal(key, 'ps:rl:create_post:user:usr_authenticated_tenant_99');
  });
});
