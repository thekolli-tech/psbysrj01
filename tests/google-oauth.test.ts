import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-google-oauth-${process.pid}.db`;
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret';

const { initDatabase, createUser, findUserByEmail, updateUserProfileFields, getSqliteDb } = await import('../src/server/db.ts');
await initDatabase();

// Pre-create existing users
const password = 'GooglePass123!';
await createUser({
  name: 'Existing Admin',
  email: 'existing.admin@example.com',
  role: 'SUPER_ADMIN',
  password,
  isVerified: true
});

await createUser({
  name: 'Existing Seeker',
  email: 'existing.seeker@example.com',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

// Create a suspended user
const suspendedUser = await createUser({
  name: 'Suspended User',
  email: 'suspended.user@example.com',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
const sqlite = getSqliteDb();
sqlite.prepare('UPDATE users SET account_status = ? WHERE id = ?').run('SUSPENDED', suspendedUser.id);

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

function makeTestCode(payload: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(payload);
  const base64 = Buffer.from(jsonStr).toString('base64');
  return `test-google-code:${base64}`;
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

test('Property Studio — Production Google OAuth 2.0 & OpenID Connect Integration', async (t) => {
  let adminSessionCookie = '';
  let newSeekerCookie = '';

  await t.test('1. GET /api/auth/config exposes googleClientId safely without secret', async () => {
    const res = await api('GET', '/api/auth/config');
    assert.equal(res.status, 200);
    assert.equal(res.json.googleClientId, 'test-google-client-id.apps.googleusercontent.com');
    assert.equal(res.json.googleAuthEnabled, true);
    assert.equal(res.json.googleClientSecret, undefined, 'Client secret must NEVER be exposed via config');
  });

  await t.test('2. Sign in with existing account via Google preserves role & issues session', async () => {
    const validToken = makeTestToken({
      sub: 'google-sub-admin-123',
      email: 'existing.admin@example.com',
      email_verified: true,
      name: 'Existing Admin Google',
      picture: 'https://lh3.googleusercontent.com/test-admin-photo.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: validToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.isNewUser, false);
    assert.equal(res.json.user.email, 'existing.admin@example.com');
    assert.equal(res.json.user.role, 'SUPER_ADMIN', 'Existing SUPER_ADMIN role must be strictly preserved');
    assert.ok(res.cookie.startsWith('ps_session='), 'HttpOnly session cookie must be issued');
    adminSessionCookie = res.cookie;

    // Verify session enables authenticated access
    const meRes = await api('GET', '/api/auth/me', undefined, adminSessionCookie);
    assert.equal(meRes.status, 200);
    assert.equal(meRes.json.user.email, 'existing.admin@example.com');
    assert.equal(meRes.json.user.role, 'SUPER_ADMIN');
  });

  await t.test('3. Sign in with new Google user creates account with default PROPERTY_SEEKER role', async () => {
    const validNewUserToken = makeTestToken({
      sub: 'google-sub-newuser-456',
      email: 'new.buyer.google@example.com',
      email_verified: true,
      name: 'Priya Sharma',
      picture: 'https://lh3.googleusercontent.com/priya.jpg',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: validNewUserToken });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.isNewUser, true);
    assert.equal(res.json.user.email, 'new.buyer.google@example.com');
    assert.equal(res.json.user.name, 'Priya Sharma');
    assert.equal(res.json.user.role, 'PROPERTY_SEEKER', 'New account must default to PROPERTY_SEEKER, never privileged');
    assert.equal(res.json.user.isVerified, true, 'Google email is pre-verified');
    assert.equal(res.json.user.townCity, 'Hyderabad, Telangana, India', 'Default platform territory fixed to Hyderabad');
    assert.ok(res.cookie.startsWith('ps_session='), 'HttpOnly session cookie must be issued for new users');
    newSeekerCookie = res.cookie;

    // Database verification: verify persisted record
    const dbRecord = await findUserByEmail('new.buyer.google@example.com');
    assert.ok(dbRecord, 'User must be created in authoritative database');
    assert.equal(dbRecord.role, 'PROPERTY_SEEKER');
    assert.notEqual(dbRecord.role, 'SUPER_ADMIN', 'Never assign SUPER_ADMIN to new Google signup');
    assert.notEqual(dbRecord.role, 'DEVELOPER', 'Never assign DEVELOPER to new Google signup');
  });

  await t.test('4. Authorization code flow exchange works identically', async () => {
    const validCode = makeTestCode({
      sub: 'google-sub-code-flow',
      email: 'codeflow.investor@example.com',
      email_verified: true,
      name: 'Ramesh Patel',
      picture: 'https://lh3.googleusercontent.com/ramesh.jpg'
    });

    const res = await api('POST', '/api/auth/google', { code: validCode, redirectUri: 'postmessage' });
    assert.equal(res.status, 200);
    assert.equal(res.json.success, true);
    assert.equal(res.json.user.email, 'codeflow.investor@example.com');
    assert.equal(res.json.user.role, 'PROPERTY_SEEKER');
    assert.ok(res.cookie.startsWith('ps_session='));
  });

  await t.test('5. Suspended user logging in via Google is rejected with HTTP 403', async () => {
    const suspendedToken = makeTestToken({
      sub: 'google-sub-suspended',
      email: 'suspended.user@example.com',
      email_verified: true,
      name: 'Suspended Person',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: suspendedToken });
    assert.equal(res.status, 403);
    assert.match(res.json.error, /suspended/i);
  });

  await t.test('6. Expired Google token is rejected with HTTP 401', async () => {
    const expiredToken = makeTestToken({
      sub: 'google-sub-expired',
      email: 'expired.user@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) - 100, // in the past
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: expiredToken });
    assert.equal(res.status, 401);
    assert.match(res.json.error, /expired/i);
  });

  await t.test('7. Unverified Google email is rejected with HTTP 400/401', async () => {
    const unverifiedToken = makeTestToken({
      sub: 'google-sub-unverified',
      email: 'unverified@example.com',
      email_verified: false,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: unverifiedToken });
    assert.ok(res.status === 400 || res.status === 401);
    assert.match(res.json.error, /not verified/i);
  });

  await t.test('8. Audience mismatch token is rejected with HTTP 401', async () => {
    const mismatchToken = makeTestToken({
      sub: 'google-sub-mismatch',
      email: 'mismatch@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'wrong-client-id.apps.googleusercontent.com'
    });

    const res = await api('POST', '/api/auth/google', { credential: mismatchToken });
    assert.equal(res.status, 401);
    assert.match(res.json.error, /client id mismatch/i);
  });

  await t.test('9. Cancelled Google authentication in callback is handled cleanly', async () => {
    const res = await fetch(`${base}/api/auth/google/callback?error=access_denied`);
    const html = await res.text();
    assert.equal(res.status, 400);
    assert.match(html, /Google sign-in was cancelled/i);
    assert.match(html, /GOOGLE_AUTH_ERROR/);
  });

  await t.test('10. Missing state token in callback is rejected (CSRF defense)', async () => {
    const res = await fetch(`${base}/api/auth/google/callback?code=some-code`);
    const html = await res.text();
    assert.equal(res.status, 400);
    assert.match(html, /OAuth state token/i);
  });

  await t.test('11. Logout and subsequent login flow works properly', async () => {
    // Current session is valid
    const meBefore = await api('GET', '/api/auth/me', undefined, newSeekerCookie);
    assert.equal(meBefore.status, 200);
    assert.equal(meBefore.json.user.email, 'new.buyer.google@example.com');

    // Logout
    const logoutRes = await api('POST', '/api/auth/logout', undefined, newSeekerCookie);
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.json.success, true);

    // After logout, session is revoked and cleared
    const meAfter = await api('GET', '/api/auth/me', undefined, newSeekerCookie);
    assert.equal(meAfter.status, 200);
    assert.equal(meAfter.json.user, null, 'Session must be revoked after logout');

    // Subsequent login with same Google account logs back in smoothly
    const loginAgainToken = makeTestToken({
      sub: 'google-sub-newuser-456',
      email: 'new.buyer.google@example.com',
      email_verified: true,
      exp: Math.floor(Date.now() / 1000) + 3600,
      iss: 'https://accounts.google.com',
      aud: 'test-google-client-id.apps.googleusercontent.com'
    });
    const reLoginRes = await api('POST', '/api/auth/google', { credential: loginAgainToken });
    assert.equal(reLoginRes.status, 200);
    assert.equal(reLoginRes.json.isNewUser, false, 'Should recognize existing account');
    assert.equal(reLoginRes.json.user.email, 'new.buyer.google@example.com');
  });

  await t.test('12. Existing email/password authentication remains intact', async () => {
    const loginRes = await api('POST', '/api/auth/login', {
      email: 'existing.admin@example.com',
      password: 'GooglePass123!'
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.json.success, true);
    assert.equal(loginRes.json.user.email, 'existing.admin@example.com');
    assert.equal(loginRes.json.user.role, 'SUPER_ADMIN');
  });

  await t.test('13. GET /api/auth/google/authorize builds valid URL containing non-empty client_id', async () => {
    const res = await api('GET', '/api/auth/google/authorize');
    assert.equal(res.status, 200);
    assert.ok(res.json.authUrl);
    assert.match(res.json.authUrl, /client_id=test-google-client-id\.apps\.googleusercontent\.com/);
    assert.match(res.json.authUrl, /scope=openid\+email\+profile/);
    assert.ok(!res.json.authUrl.includes('client_id=&'), 'Must never generate empty client_id parameter');
  });

  await t.test('14. Missing GOOGLE_CLIENT_ID fails safely with 400 without redirecting to Google', async () => {
    const originalClientId = process.env.GOOGLE_CLIENT_ID;
    const originalViteId = process.env.VITE_GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;

    try {
      // JSON request mode
      const res = await api('GET', '/api/auth/google/authorize');
      assert.equal(res.status, 400);
      assert.match(res.json.error, /GOOGLE_CLIENT_ID/);

      // Redirect mode: returns friendly HTML rather than Google raw 400 error
      const htmlRes = await fetch(`${base}/api/auth/google/authorize?mode=redirect`, { redirect: 'manual' });
      assert.equal(htmlRes.status, 400);
      const html = await htmlRes.text();
      assert.match(html, /Google Sign-In Configuration Required/);
      assert.match(html, /GOOGLE_CLIENT_ID/);
      assert.ok(!htmlRes.headers.get('location'), 'Must NOT redirect when client_id is missing');
    } finally {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
      if (originalViteId) process.env.VITE_GOOGLE_CLIENT_ID = originalViteId;
    }
  });

  // Teardown
  server.close();
});
