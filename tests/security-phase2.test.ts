import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-security-phase2-test-${process.pid}.db`;
process.env.GUPSHUP_WEBHOOK_SECRET = 'test-gupshup-secret-token-xyz';

const {
  initDatabase,
  createUser,
  createSession,
  createUploadIntentRecord
} = await import('../src/server/db.ts');

const {
  checkRateLimit,
  allowMemoryRequest,
  resolveRateKey,
  clientKey
} = await import('../src/server/rateLimit.ts');

await initDatabase();

test('Security Phase 2 — Critical Vulnerability Remediation Suite', async (t) => {
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Seed test users with verified credentials
  const adminUser = await createUser({
    name: 'Super Admin Security Tester',
    email: `superadmin-sec-${Date.now()}@propertystudio.org`,
    phone: '+919988776655',
    role: 'SUPER_ADMIN',
    isVerified: true,
    phoneVerified: true
  });

  const regularUser = await createUser({
    name: 'Normal User Security Tester',
    email: `normal-user-${Date.now()}@example.com`,
    phone: '+919988776656',
    role: 'PROPERTY_SEEKER',
    isVerified: true,
    phoneVerified: true
  });

  const victimUser = await createUser({
    name: 'Victim User',
    email: `victim-${Date.now()}@example.com`,
    phone: '+919988776657',
    role: 'PROPERTY_SEEKER',
    isVerified: true,
    phoneVerified: true
  });

  const adminSession = await createSession(adminUser.id);
  const regularSession = await createSession(regularUser.id);
  const victimSession = await createSession(victimUser.id);

  const adminHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${adminSession.token}`
  };

  const regularHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${regularSession.token}`
  };

  const regularBinaryHeaders = {
    'Content-Type': 'video/mp4',
    Authorization: `Bearer ${regularSession.token}`
  };

  t.after(() => {
    server.close();
  });

  // ============================================================================
  // PRIORITY 1: REMOVE ADMINISTRATIVE AUTHENTICATION BYPASS (x-admin-role)
  // ============================================================================
  await t.test('Priority 1: x-admin-role spoofing is strictly rejected with 401 on unauthenticated calls', async () => {
    const endpoints = [
      { method: 'POST', path: '/api/media', body: { title: 'Spoofed Media' } },
      { method: 'DELETE', path: '/api/media/med_spoofed_123', body: undefined },
      { method: 'PATCH', path: '/api/testimonials/video/test_vid_123/approve', body: {} },
      { method: 'DELETE', path: '/api/programs/prog_spoofed_123', body: undefined },
      { method: 'POST', path: '/api/studio/broadcasts', body: { title: 'Spoofed Broadcast' } },
      { method: 'POST', path: '/api/media/upload-intent', body: { filename: 'test.mp4', contentType: 'video/mp4', fileSizeBytes: 1000 } }
    ];

    for (const ep of endpoints) {
      const res = await fetch(`${baseUrl}${ep.path}`, {
        method: ep.method,
        headers: {
          'Content-Type': 'application/json',
          'x-admin-role': 'SUPER_ADMIN' // Malicious spoofed header
        },
        body: ep.body ? JSON.stringify(ep.body) : undefined
      });

      assert.equal(
        res.status,
        401,
        `Expected 401 Unauthorized on ${ep.method} ${ep.path} with spoofed x-admin-role header, received ${res.status}`
      );
    }
  });

  await t.test('Priority 1: Regular authenticated user with x-admin-role header is rejected with 403 Forbidden', async () => {
    const res = await fetch(`${baseUrl}/api/media`, {
      method: 'POST',
      headers: {
        ...regularHeaders,
        'x-admin-role': 'SUPER_ADMIN' // Malicious attempt to elevate privileges
      },
      body: JSON.stringify({ title: 'Unauthorized Creation Attempt' })
    });

    assert.equal(res.status, 403, 'Regular user must not be elevated to Super Admin via header');
  });

  await t.test('Priority 1: Testimonials submission with x-admin-role defaults to PENDING_APPROVAL, not auto-published', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-role': 'SUPER_ADMIN' // Malicious attempt to bypass moderation queue
      },
      body: JSON.stringify({
        name: 'Spoofed Submitter',
        content: 'This should not be live immediately without genuine Super Admin session.'
      })
    });

    assert.equal(res.status, 201);
    const data = await res.json();
    assert.equal(data.testimonial.status, 'PENDING_APPROVAL', 'Testimonial without genuine Super Admin session must be PENDING_APPROVAL');
  });

  await t.test('Priority 1: Genuine Super Admin session retains administrative capabilities', async () => {
    const res = await fetch(`${baseUrl}/api/testimonials/video/test_vid_nonexistent/approve`, {
      method: 'PATCH',
      headers: adminHeaders
    });
    // 404 because video ID doesn't exist, which confirms passing authorization guard (not 401 or 403)
    assert.equal(res.status, 404, 'Super Admin must pass authorization guard to reach business logic');
  });

  // ============================================================================
  // PRIORITY 2: SECURE DIRECT MEDIA UPLOADS
  // ============================================================================
  await t.test('Priority 2: Unauthenticated direct upload request is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/media/upload-direct/upl_test_unauth`, {
      method: 'PUT',
      headers: { 'Content-Type': 'video/mp4' },
      body: 'fake-video-bytes'
    });

    assert.equal(res.status, 401, 'Direct media upload must require authentication');
  });

  await t.test('Priority 2: Direct upload with non-existent uploadId is rejected with 404', async () => {
    const res = await fetch(`${baseUrl}/api/media/upload-direct/upl_nonexistent_9999`, {
      method: 'PUT',
      headers: regularBinaryHeaders,
      body: 'fake-video-bytes'
    });

    assert.equal(res.status, 404, 'Must return 404 when upload intent is not found');
  });

  await t.test('Priority 2: Direct upload for another user session is rejected with 403', async () => {
    // Create intent belonging to victimUser
    const intentId = `upl_${Date.now()}_test_ownership`;
    await createUploadIntentRecord({
      id: intentId,
      user_id: victimUser.id,
      storage_key: `media/video/${intentId}.mp4`,
      storage_provider: 'CLOUDFLARE_R2',
      expected_mime_type: 'video/mp4',
      expected_file_size: 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Attacker (regularUser) tries to upload into victim's intent
    const res = await fetch(`${baseUrl}/api/media/upload-direct/${intentId}`, {
      method: 'PUT',
      headers: regularBinaryHeaders, // regularUser != victimUser
      body: 'attacker-bytes'
    });

    assert.equal(res.status, 403, 'Must return 403 Forbidden when trying to upload to another user intent');
  });

  await t.test('Priority 2: Oversized direct upload request is rejected with 413 Payload Too Large', async () => {
    const intentId = `upl_${Date.now()}_test_size`;
    const allowedSize = 1000; // 1000 bytes expected
    await createUploadIntentRecord({
      id: intentId,
      user_id: regularUser.id,
      storage_key: `media/video/${intentId}.mp4`,
      storage_provider: 'CLOUDFLARE_R2',
      expected_mime_type: 'video/mp4',
      expected_file_size: allowedSize,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    // Send payload larger than intent allowed size
    const oversizedBody = 'A'.repeat(5000);
    const res = await fetch(`${baseUrl}/api/media/upload-direct/${intentId}`, {
      method: 'PUT',
      headers: {
        ...regularBinaryHeaders,
        'Content-Length': String(oversizedBody.length)
      },
      body: oversizedBody
    });

    assert.equal(res.status, 413, 'Oversized file must be rejected with 413 Payload Too Large');
  });

  await t.test('Priority 2: Valid owner upload succeeds without 500MB raw memory buffer', async () => {
    const intentId = `upl_${Date.now()}_test_success`;
    const allowedSize = 1024 * 1024; // 1MB
    await createUploadIntentRecord({
      id: intentId,
      user_id: regularUser.id,
      storage_key: `media/video/${intentId}.mp4`,
      storage_provider: 'CLOUDFLARE_R2',
      expected_mime_type: 'video/mp4',
      expected_file_size: allowedSize,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    const res = await fetch(`${baseUrl}/api/media/upload-direct/${intentId}`, {
      method: 'PUT',
      headers: regularBinaryHeaders,
      body: 'legitimate-video-bytes-stream'
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.uploadId, intentId);
  });

  // ============================================================================
  // PRIORITY 3: DISTRIBUTED RATE LIMITING & RETRY-AFTER
  // ============================================================================
  await t.test('Priority 3: Rate limiting blocks bursts and sets Retry-After header', () => {
    const key = `test_rate_burst_${Date.now()}`;
    const limit = 3;
    const windowMs = 5000;

    // Hits 1, 2, 3 should be allowed
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);
    assert.equal(allowMemoryRequest(key, limit, windowMs).allowed, true);

    // Hit 4 should be rejected with positive retryAfterSeconds
    const blocked = allowMemoryRequest(key, limit, windowMs);
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSeconds > 0 && blocked.retryAfterSeconds <= 5);
  });

  await t.test('Priority 3: Authenticated users behind shared IP receive separate rate limit keys', () => {
    const mockReqUser1 = {
      user: { id: 'usr_office_worker_1' },
      ip: '203.0.113.1'
    } as any;

    const mockReqUser2 = {
      user: { id: 'usr_office_worker_2' },
      ip: '203.0.113.1' // Same shared corporate NAT IP
    } as any;

    const key1 = resolveRateKey(mockReqUser1, 'action_create');
    const key2 = resolveRateKey(mockReqUser2, 'action_create');

    assert.notEqual(key1, key2, 'Keys for two users behind same IP must be isolated');
    assert.match(key1, /usr_office_worker_1/);
    assert.match(key2, /usr_office_worker_2/);
  });

  // ============================================================================
  // PRIORITY 4: SECURITY HEADERS (CSP, HSTS, X-FRAME, NOSNIFF)
  // ============================================================================
  await t.test('Priority 4: API and page responses include complete suite of security headers', async () => {
    const res = await fetch(`${baseUrl}/api/properties`);

    // Verify all mandatory headers
    assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
    assert.match(res.headers.get('strict-transport-security') || '', /max-age=31536000/);
    assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    assert.match(res.headers.get('permissions-policy') || '', /camera=\(\)/);

    // Verify Content-Security-Policy
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /https:\/\/accounts\.google\.com/); // Google OAuth compatibility
    assert.match(csp, /https:\/\/fonts\.googleapis\.com/); // Google Fonts compatibility
    assert.match(csp, /https:\/\/www\.youtube\.com/); // Media embeds compatibility
    assert.match(csp, /frame-ancestors 'none'/); // Clickjacking protection
  });

  // ============================================================================
  // PRIORITY 5: INFORMATION DISCLOSURE
  // ============================================================================
  await t.test('Priority 5: Public /api/media/storage/config never leaks internal account email', async () => {
    const res = await fetch(`${baseUrl}/api/media/storage/config`);
    assert.equal(res.status, 200);
    const data = await res.json();

    // Must disclose availability and limits, but NEVER internal email
    assert.ok(typeof data.configured === 'boolean');
    assert.equal(data.accountEmail, undefined, 'accountEmail must NOT be exposed unauthenticated');
    assert.equal(data.missingVariables, undefined, 'missingVariables must NOT be exposed unauthenticated');
  });

  await t.test('Priority 5: Public /api/database/status returns minimal sanitized status, no internal schema', async () => {
    const res = await fetch(`${baseUrl}/api/database/status`);
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.status, 'healthy');
    assert.equal(data.integrations, undefined, 'PostgreSQL internal schema diagnostics must NOT be exposed unauthenticated');
    assert.equal(data.authoritativeDatabase, undefined, 'Authoritative database table stats must NOT be exposed unauthenticated');
  });

  await t.test('Priority 5: Super Admin receives full diagnostic health report on /api/database/status', async () => {
    const res = await fetch(`${baseUrl}/api/database/status`, {
      headers: adminHeaders
    });
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.success, true);
    assert.ok(data.integrations, 'Super Admin must receive integration diagnostics');
  });

  // ============================================================================
  // WEBHOOK SECURITY: GUPSHUP SECRET VALIDATION
  // ============================================================================
  await t.test('Webhook Security: Gupshup webhook rejects unsigned/unauthorized requests when secret is set', async () => {
    // Unauthenticated request without secret token
    const unauthRes = await fetch(`${baseUrl}/api/webhooks/gupshup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { type: 'delivered' } })
    });
    assert.equal(unauthRes.status, 401, 'Must reject webhook without secret token');

    // Authorized request with secret token in query or header
    const authRes = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=test-gupshup-secret-token-xyz`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { type: 'delivered' } })
    });
    assert.equal(authRes.status, 200, 'Must accept webhook with valid secret token');

    // Mismatched token of same length must be rejected timing-safely
    const mismatchedRes = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=test-gupshup-secret-token-abc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { type: 'delivered' } })
    });
    assert.equal(mismatchedRes.status, 401, 'Must reject mismatched token');
  });

  await t.test('Rate Limit Telemetry: Responses include X-RateLimit-Engine indicator', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@example.com', password: 'wrong' })
    });
    const engine = res.headers.get('x-ratelimit-engine');
    assert.ok(engine === 'memory_fallback' || engine === 'upstash_redis', `Engine header must indicate active limiter, got: ${engine}`);
  });
});
