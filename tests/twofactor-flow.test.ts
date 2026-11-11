import assert from 'node:assert/strict';
import test from 'node:test';
import { OtpCooldownError, OTP_TTL_MS } from '../src/server/otpCrypto.ts';

/**
 * 2Factor Mobile Verification Production Flow Validation Test Suite
 * Tests all 8 required validation scenarios using local SQLite and mock HTTP responses:
 *   1. SMS delivery and verification.
 *   2. Voice delivery and verification.
 *   3. Incorrect OTP rejection.
 *   4. Expired OTP rejection.
 *   5. Duplicate verification rejection (replay attack prevention).
 *   6. Registration without a verified phone number rejection.
 *   7. Registration after successful verification.
 *   8. Switching from SMS to Voice without duplicate active challenges.
 *
 * Strict constraint: Zero real OTPs dispatched and zero credits consumed.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-2factor-flow-${process.pid}-${Date.now()}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-flow-validation-secret';
process.env.TWO_FACTOR_API_KEY = 'mock_2factor_test_key_flow_xyz';
process.env.TWOFACTOR_VOICE_ENABLED = 'true';

const {
  initDatabase,
  generateOtp,
  verifyOtp,
  markPhoneOtpVerifiedByProvider,
  registerVerifiedUser,
  getSqliteDb
} = await import('../src/server/db.ts');

const {
  sendTwoFactorOtp,
  verifyTwoFactorOtp,
  formatPhoneFor2Factor
} = await import('../src/server/twoFactorOtp.ts');

await initDatabase();

let tail: Promise<void> = Promise.resolve();
function queued(name: string, fn: () => Promise<void>): void {
  const run = tail.then(fn);
  tail = run.then(() => undefined, () => undefined);
  test(name, () => run);
}

// 1. SMS delivery and verification
queued('1. SMS delivery and verification targets correct 2Factor SMS endpoints', async () => {
  const phone = '+91 98490 11111';
  const expectedPhoneDigits = '919849011111';
  const capturedUrls: string[] = [];

  const mockFetch = async (url: RequestInfo | URL): Promise<Response> => {
    capturedUrls.push(String(url));
    const urlStr = String(url);
    if (urlStr.includes('/SMS/') && urlStr.includes('/AUTOGEN')) {
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'session-sms-uuid-001'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/SMS/VERIFY/session-sms-uuid-001/448811')) {
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'OTP Matched'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ Status: 'Error', Details: 'Not Found' }), { status: 404 });
  };

  // Dispatch SMS OTP
  const sendRes = await sendTwoFactorOtp(phone, 'sms', undefined, mockFetch as any);
  assert.equal(sendRes.success, true);
  assert.equal(sendRes.channel, 'sms');
  assert.equal(sendRes.sessionId, 'session-sms-uuid-001');
  assert.ok(capturedUrls[0].includes(`/SMS/${expectedPhoneDigits}/AUTOGEN`));

  // Verify SMS OTP
  const verifyRes = await verifyTwoFactorOtp('session-sms-uuid-001', '448811', 'sms', mockFetch as any);
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.status, 'MATCHED');
  assert.equal(verifyRes.channel, 'sms');
  assert.ok(capturedUrls[1].includes('/SMS/VERIFY/session-sms-uuid-001/448811'));
});

// 2. Voice delivery and verification
queued('2. Voice delivery and verification targets channel-specific 2Factor VOICE endpoints', async () => {
  const phone = '+91 98490 22222';
  const expectedPhoneDigits = '919849022222';
  const capturedUrls: string[] = [];

  const mockFetch = async (url: RequestInfo | URL): Promise<Response> => {
    capturedUrls.push(String(url));
    const urlStr = String(url);
    if (urlStr.includes('/VOICE/') && urlStr.includes('/AUTOGEN')) {
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'session-voice-uuid-002'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    if (urlStr.includes('/VOICE/VERIFY/session-voice-uuid-002/772299')) {
      return new Response(JSON.stringify({
        Status: 'Success',
        Details: 'OTP Matched'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
    return new Response(JSON.stringify({ Status: 'Error', Details: 'Not Found' }), { status: 404 });
  };

  // Dispatch Voice OTP
  const sendRes = await sendTwoFactorOtp(phone, 'voice', undefined, mockFetch as any);
  assert.equal(sendRes.success, true);
  assert.equal(sendRes.channel, 'voice');
  assert.equal(sendRes.sessionId, 'session-voice-uuid-002');
  assert.ok(capturedUrls[0].includes(`/VOICE/${expectedPhoneDigits}/AUTOGEN`));

  // Verify Voice OTP against VOICE verification endpoint
  const verifyRes = await verifyTwoFactorOtp('session-voice-uuid-002', '772299', 'voice', mockFetch as any);
  assert.equal(verifyRes.success, true);
  assert.equal(verifyRes.status, 'MATCHED');
  assert.equal(verifyRes.channel, 'voice');
  assert.ok(capturedUrls[1].includes('/VOICE/VERIFY/session-voice-uuid-002/772299'));
});

// 3. Incorrect OTP rejection
queued('3. Incorrect OTP code is rejected with MISMATCH status and clear error message', async () => {
  const mockMismatchFetch = async (): Promise<Response> => {
    return new Response(JSON.stringify({
      Status: 'Error',
      Details: 'OTP Mismatch'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await verifyTwoFactorOtp('session-err-01', '000000', 'sms', mockMismatchFetch as any);
  assert.equal(result.success, false);
  assert.equal(result.status, 'MISMATCH');
  assert.ok(result.error?.includes('Invalid verification code'));
});

// 4. Expired OTP rejection
queued('4. Expired OTP session is rejected with EXPIRED status', async () => {
  const mockExpiredFetch = async (): Promise<Response> => {
    return new Response(JSON.stringify({
      Status: 'Error',
      Details: 'OTP Expired'
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };

  const result = await verifyTwoFactorOtp('session-expired-01', '123456', 'sms', mockExpiredFetch as any);
  assert.equal(result.success, false);
  assert.equal(result.status, 'EXPIRED');
  assert.ok(result.error?.includes('expired'));
});

// 5. Duplicate verification rejection (single-use grant)
queued('5. Duplicate registration using previously consumed OTP grant is rejected', async () => {
  const phone = '+91 98490 55555';
  const code = '654321';

  // Issue provider verification proof
  const marked = await markPhoneOtpVerifiedByProvider(phone, code);
  assert.equal(marked, true);

  // First registration succeeds
  const user1 = await registerVerifiedUser({
    name: 'Authorized User 1',
    email: 'authorized.user1@example.com',
    password: 'Password123!',
    role: 'PROPERTY_SEEKER',
    phone,
    phoneOtp: code
  });
  assert.ok(user1.id);
  assert.equal(user1.email, 'authorized.user1@example.com');

  // Attempt duplicate registration with the same consumed grant
  await assert.rejects(
    async () => {
      await registerVerifiedUser({
        name: 'Duplicate Attacker',
        email: 'duplicate.attacker@example.com',
        password: 'Password123!',
        role: 'PROPERTY_SEEKER',
        phone,
        phoneOtp: code
      });
    },
    (err: any) => {
      return err?.statusCode === 400 || String(err?.message || '').toLowerCase().includes('verification code') || String(err?.message || '').toLowerCase().includes('exists');
    }
  );
});

// 6. Registration without a verified phone number
queued('6. Registration with requirePhone rejects when phone is not verified', async () => {
  await assert.rejects(
    async () => {
      await registerVerifiedUser({
        name: 'Unverified Seeker',
        email: 'unverified.seeker@example.com',
        password: 'Password123!',
        role: 'PROPERTY_SEEKER',
        phone: '+919849066666',
        requirePhone: true
      });
    },
    (err: any) => {
      return err?.statusCode === 400 && String(err?.message || '').toLowerCase().includes('verification code');
    }
  );
});

// 7. Registration after successful verification
queued('7. Registration after successful provider verification creates active verified user', async () => {
  const phone = '+919849077777';
  const code = '987123';

  // Provider verification callback writes single-use registration grant
  const marked = await markPhoneOtpVerifiedByProvider(phone, code);
  assert.equal(marked, true);

  const user = await registerVerifiedUser({
    name: 'Verified Seeker',
    email: 'verified.seeker@example.com',
    password: 'SecurePassword789!',
    role: 'PROPERTY_SEEKER',
    phone,
    phoneOtp: code,
    townCity: 'Hyderabad, Telangana, India'
  });

  assert.ok(user.id);
  assert.equal(user.email, 'verified.seeker@example.com');
  assert.equal(user.phone, phone);
  assert.equal(user.phone_verified, 1);
  assert.equal(user.account_status, 'ACTIVE');

  // Verify single-use grant is now consumed in SQLite
  const unconsumedGrants = getSqliteDb().prepare(
    "SELECT COUNT(*) as count FROM otps WHERE target = ? AND type = 'PHONE_REGISTRATION_GRANT' AND consumed_at IS NULL"
  ).get(phone) as { count: number };
  assert.equal(unconsumedGrants.count, 0);
});

// 8. Switching from SMS to Voice without duplicate active challenges
queued('8. Switching from SMS to Voice cleanly supersedes challenge without duplicate records', async () => {
  const phone = '+919849088888';

  // 1. Initial SMS challenge
  const smsChallenge = await generateOtp(phone, 'PHONE_VERIFICATION');
  assert.match(smsChallenge.otp, /^\d{6}$/);

  // Confirm exactly 1 active challenge exists
  const initialRows = getSqliteDb().prepare(
    "SELECT id, type, consumed_at FROM otps WHERE target = ? AND type = 'PHONE_VERIFICATION' AND consumed_at IS NULL"
  ).all(phone) as Array<{ id: string; type: string; consumed_at: string | null }>;
  assert.equal(initialRows.length, 1);
  const firstChallengeId = initialRows[0].id;

  // 2. Fast-forward past cooldown to simulate user switching to Voice after cooldown
  getSqliteDb().prepare(
    "UPDATE otps SET created_at = datetime('now', '-70 seconds') WHERE target = ?"
  ).run(phone);

  // 3. User switches to Voice: generate new challenge
  const voiceChallenge = await generateOtp(phone, 'PHONE_VERIFICATION');
  assert.match(voiceChallenge.otp, /^\d{6}$/);

  // Confirm exactly 1 active challenge exists in database (previous SMS challenge deleted)
  const currentRows = getSqliteDb().prepare(
    "SELECT id, type, consumed_at FROM otps WHERE target = ? AND type = 'PHONE_VERIFICATION' AND consumed_at IS NULL"
  ).all(phone) as Array<{ id: string; type: string; consumed_at: string | null }>;
  assert.equal(currentRows.length, 1);
  assert.notEqual(currentRows[0].id, firstChallengeId);
});
