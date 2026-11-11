import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-google-phone-verify-${process.pid}.db`;
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';
process.env.TWO_FACTOR_API_KEY = 'test-2factor-api-key-live-simulation';
process.env.OTP_HASH_SECRET = 'test-otp-hash-secret-for-phone-verification';

const {
  initDatabase,
  createUser,
  findUserByEmail,
  findUserById,
  getSqliteDb
} = await import('../src/server/db.ts');
await initDatabase();

// Pre-create existing users
const password = 'GooglePass123!';

// Existing Google user WITHOUT verified phone
const existingUnverifiedUser = await createUser({
  name: 'Unverified Google User',
  email: 'unverified.google@example.com',
  role: 'PROPERTY_SEEKER',
  phone: '',
  phoneVerified: false,
  password,
  isVerified: true
});

// Existing Google user WITH verified phone
const existingVerifiedUser = await createUser({
  name: 'Verified Google User',
  email: 'verified.google@example.com',
  role: 'PROPERTY_SEEKER',
  phone: '+919849011111',
  phoneVerified: true,
  password,
  isVerified: true
});

// Existing third-party user owning a phone number
const existingOtherUser = await createUser({
  name: 'Existing Phone Owner',
  email: 'other.owner@example.com',
  role: 'PROPERTY_SEEKER',
  phone: '+919849099999',
  phoneVerified: true,
  password,
  isVerified: true
});

const { app } = await import('../server.ts');
const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

function makeTestToken(payload: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString('base64');
  return `test-google-token:${base64}`;
}

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const session = response.headers.getSetCookie?.().map(v => v.split(';')[0]).find(v => v.startsWith('ps_session='));
  return { status: response.status, json, cookie: session || cookie || '', headers: response.headers };
}

test('Property Studio — Mandatory Mobile Verification for Google OAuth Users', async (t) => {
  let newGoogleSessionCookie = '';
  let unverifiedExistingSessionCookie = '';
  let verifiedExistingSessionCookie = '';

  await t.test('Scenario 1: New Google user — Google OAuth succeeds, mobile verification mandatory, protected APIs blocked', async () => {
    const token = makeTestToken({
      sub: 'google-sub-new-seeker-001',
      email: 'new.google.seeker@example.com',
      email_verified: true,
      name: 'Aditya Rao',
      picture: 'https://lh3.googleusercontent.com/aditya.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const authRes = await api('POST', '/api/auth/google', { credential: token });
    assert.equal(authRes.status, 200);
    assert.equal(authRes.json.success, true);
    assert.equal(authRes.json.isNewUser, true);
    assert.equal(authRes.json.requiresPhoneVerification, true, 'New Google user MUST require phone verification');
    assert.equal(authRes.json.phoneVerified, false, 'New Google user phoneVerified must be false initially');
    assert.ok(authRes.cookie.startsWith('ps_session='), 'Active session cookie must be issued');
    newGoogleSessionCookie = authRes.cookie;

    // Database check: phone_verified must be 0
    const dbRecord = await findUserByEmail('new.google.seeker@example.com');
    assert.ok(dbRecord);
    assert.equal(Number(dbRecord.phone_verified || 0), 0);

    // Protected API check: Direct access must be blocked with HTTP 403
    const protectedRes = await api('GET', '/api/me/bookmarks', undefined, newGoogleSessionCookie);
    assert.equal(protectedRes.status, 403, 'Direct access to protected API must return HTTP 403');
    assert.equal(protectedRes.json.code, 'PHONE_VERIFICATION_REQUIRED');
    assert.equal(protectedRes.json.phoneVerified, false);
  });

  await t.test('Scenario 2: Existing Google user without verified mobile — Signs in, no duplicate account, flagged for mandatory verification', async () => {
    const token = makeTestToken({
      sub: 'google-sub-existing-unverified',
      email: 'unverified.google@example.com',
      email_verified: true,
      name: 'Unverified Google User',
      picture: 'https://lh3.googleusercontent.com/unverified.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const authRes = await api('POST', '/api/auth/google', { credential: token });
    assert.equal(authRes.status, 200);
    assert.equal(authRes.json.success, true);
    assert.equal(authRes.json.isNewUser, false, 'Must identify existing account without duplicate creation');
    assert.equal(authRes.json.user.id, existingUnverifiedUser.id, 'User ID must match existing account');
    assert.equal(authRes.json.requiresPhoneVerification, true, 'Must require mandatory phone verification');
    assert.equal(authRes.json.phoneVerified, false);
    unverifiedExistingSessionCookie = authRes.cookie;

    // Direct access to protected APIs must be blocked with HTTP 403
    const bookmarksRes = await api('GET', '/api/me/bookmarks', undefined, unverifiedExistingSessionCookie);
    assert.equal(bookmarksRes.status, 403);
    assert.equal(bookmarksRes.json.code, 'PHONE_VERIFICATION_REQUIRED');

    const notifRes = await api('GET', '/api/notifications', undefined, unverifiedExistingSessionCookie);
    assert.equal(notifRes.status, 403);
    assert.equal(notifRes.json.code, 'PHONE_VERIFICATION_REQUIRED');
  });

  await t.test('Scenario 3: Existing Google user with verified mobile — Signs in normally, no OTP requested, APIs accessible', async () => {
    const token = makeTestToken({
      sub: 'google-sub-existing-verified',
      email: 'verified.google@example.com',
      email_verified: true,
      name: 'Verified Google User',
      picture: 'https://lh3.googleusercontent.com/verified.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const authRes = await api('POST', '/api/auth/google', { credential: token });
    assert.equal(authRes.status, 200);
    assert.equal(authRes.json.success, true);
    assert.equal(authRes.json.isNewUser, false);
    assert.equal(authRes.json.user.id, existingVerifiedUser.id);
    assert.equal(authRes.json.requiresPhoneVerification, false, 'Must NOT require phone verification again');
    assert.equal(authRes.json.phoneVerified, true);
    verifiedExistingSessionCookie = authRes.cookie;

    // Protected API access must succeed normally (HTTP 200)
    const bookmarksRes = await api('GET', '/api/me/bookmarks', undefined, verifiedExistingSessionCookie);
    assert.equal(bookmarksRes.status, 200, 'Verified user must have full access to protected APIs');
    assert.ok(Array.isArray(bookmarksRes.json.posts));
  });

  await t.test('Scenario 4: Direct API access — Unverified Google session receives HTTP 403 across protected endpoints', async () => {
    // 1. GET /api/me/bookmarks
    const r1 = await api('GET', '/api/me/bookmarks', undefined, newGoogleSessionCookie);
    assert.equal(r1.status, 403);
    assert.equal(r1.json.code, 'PHONE_VERIFICATION_REQUIRED');

    // 2. POST /api/community/posts
    const r2 = await api('POST', '/api/community/posts', { title: 'Test Post', content: 'Testing block' }, newGoogleSessionCookie);
    assert.equal(r2.status, 403);
    assert.equal(r2.json.code, 'PHONE_VERIFICATION_REQUIRED');

    // 3. GET /api/community/posts
    const r3 = await api('GET', '/api/community/posts', undefined, newGoogleSessionCookie);
    assert.equal(r3.status, 403);
    assert.equal(r3.json.code, 'PHONE_VERIFICATION_REQUIRED');

    // 4. GET /api/notifications
    const r4 = await api('GET', '/api/notifications', undefined, newGoogleSessionCookie);
    assert.equal(r4.status, 403);
    assert.equal(r4.json.code, 'PHONE_VERIFICATION_REQUIRED');

    // 5. POST /api/communities
    const r5 = await api('POST', '/api/communities', { name: 'Test Comm' }, newGoogleSessionCookie);
    assert.equal(r5.status, 403);
    assert.equal(r5.json.code, 'PHONE_VERIFICATION_REQUIRED');

    // Unauthenticated request without cookie must return 401
    const unauthRes = await api('GET', '/api/me/bookmarks');
    assert.equal(unauthRes.status, 401, 'Unauthenticated guest receives 401');
  });

  await t.test('Scenario 5: Successful verification — 2Factor verification associates phone, completes session, unlocks protected APIs', async () => {
    const targetPhone = '+919849055555';

    // 1. Phone collision defense: Attempting to verify a phone already owned by another user fails with HTTP 409
    const collisionRes = await api('POST', '/api/auth/send-phone-otp', {
      phone: '+919849099999' // owned by existingOtherUser
    }, newGoogleSessionCookie);
    assert.equal(collisionRes.status, 409);
    assert.equal(collisionRes.json.code, 'PHONE_ALREADY_REGISTERED');

    // 2. Dispatch OTP to available phone
    // Mock fetch for 2Factor during test
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (url: any, init?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('2factor.in/API/V1/')) {
        if (urlStr.includes('/SMS/VERIFY/') || urlStr.includes('/VOICE/VERIFY/')) {
          if (urlStr.includes('/654321')) {
            return new Response(JSON.stringify({
              Status: 'Success',
              Details: 'OTP Matched'
            }), { status: 200, headers: { 'content-type': 'application/json' } });
          }
          return new Response(JSON.stringify({
            Status: 'Error',
            Details: 'OTP Mismatch'
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
        if (urlStr.includes('/SMS/')) {
          return new Response(JSON.stringify({
            Status: 'Success',
            Details: 'mock-google-session-uuid-777'
          }), { status: 200, headers: { 'content-type': 'application/json' } });
        }
      }
      return originalFetch(url, init);
    };

    try {
      const sendRes = await api('POST', '/api/auth/send-phone-otp', {
        phone: targetPhone,
        channel: 'sms'
      }, newGoogleSessionCookie);
      assert.equal(sendRes.status, 200);
      assert.equal(sendRes.json.provider, '2factor');

      // 3. Verify OTP code with 2Factor
      const verifyRes = await api('POST', '/api/auth/verify-phone-otp', {
        phone: targetPhone,
        otp: '654321',
        sessionId: sendRes.json.messageId,
        channel: 'sms'
      }, newGoogleSessionCookie);

      assert.equal(verifyRes.status, 200);
      assert.equal(verifyRes.json.success, true);
      assert.equal(verifyRes.json.verified, true);
      assert.equal(verifyRes.json.phoneVerified, true);
      assert.equal(verifyRes.json.requiresPhoneVerification, false);
      assert.equal(verifyRes.json.user.phone, targetPhone);
      assert.equal(verifyRes.json.user.phone_verified, 1);

      // 4. Verify authoritative database association
      const updatedUser = await findUserByEmail('new.google.seeker@example.com');
      assert.ok(updatedUser);
      assert.equal(updatedUser.phone, targetPhone, 'Phone must be persisted to authoritative user record');
      assert.equal(Number(updatedUser.phone_verified), 1, 'phone_verified must be set to 1 in database');

      // 5. Subsequent calls to protected application APIs now SUCCEED (HTTP 200)
      const unlockedBookmarks = await api('GET', '/api/me/bookmarks', undefined, newGoogleSessionCookie);
      assert.equal(unlockedBookmarks.status, 200, 'Protected API is now unlocked and accessible');
      assert.ok(Array.isArray(unlockedBookmarks.json.posts));

      const unlockedNotifs = await api('GET', '/api/notifications', undefined, newGoogleSessionCookie);
      assert.equal(unlockedNotifs.status, 200, 'Notifications endpoint is now unlocked and accessible');

      // 6. GET /api/auth/me reflects the verified phone state
      const meRes = await api('GET', '/api/auth/me', undefined, newGoogleSessionCookie);
      assert.equal(meRes.status, 200);
      assert.equal(meRes.json.user.phoneVerified, true);
      assert.equal(meRes.json.user.requiresPhoneVerification, false);
      assert.equal(meRes.json.user.phone, targetPhone);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  server.close();
});
