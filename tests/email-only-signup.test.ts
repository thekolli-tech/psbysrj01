import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { isPhoneOtpRequired } from '../src/shared/authConfig.ts';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-email-only-signup-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
delete process.env.REQUIRE_PHONE_OTP;
delete process.env.ENABLE_PHONE_OTP;

const {
  initDatabase,
  findUserByEmail,
  findUserById,
  generateOtp,
  verifyOtp
} = await import('../src/server/db.ts');

await initDatabase();
const { app } = await import('../server.ts');

const capturedOtpCodes = new Map<string, string>();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const body = JSON.parse(String(init?.body || '{}'));
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    const to = String(body.to?.[0] || '').toLowerCase();
    capturedOtpCodes.set(to, code);
    return new Response(JSON.stringify({ id: 'email_mock_signup' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return originalFetch(url, init);
}) as typeof fetch;

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

test.after(() => {
  globalThis.fetch = originalFetch;
  return new Promise<void>(resolve => (server as Server).close(() => resolve()));
});

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await originalFetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      accept: 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const sessionCookie = response.headers.getSetCookie?.()
    .map(value => value.split(';')[0])
    .find(value => value.startsWith('ps_session='));
  return { status: response.status, json, cookie: sessionCookie || cookie || '' };
}

test('isPhoneOtpRequired defaults to false and responds via GET /api/auth/config', async () => {
  delete process.env.REQUIRE_PHONE_OTP;
  delete process.env.ENABLE_PHONE_OTP;
  assert.equal(isPhoneOtpRequired(), false);

  const res = await api('GET', '/api/auth/config');
  assert.equal(res.status, 200);
  assert.equal(res.json.phoneOtpRequired, false);
});

test('Property Seeker registration succeeds with email OTP alone without phone number', async () => {
  const email = 'seeker.nophone@example.com';
  const password = 'StrongPassword123!';

  // Request email OTP
  const otpRes = await api('POST', '/api/auth/send-email-otp', { email });
  assert.equal(otpRes.status, 200);
  const otp = capturedOtpCodes.get(email);
  assert.ok(otp && otp.length === 6);

  // Register Property Seeker with NO phone number and NO phoneOtp
  const regRes = await api('POST', '/api/auth/register', {
    name: 'Ananya Sharma',
    email,
    password,
    role: 'PROPERTY_SEEKER',
    phone: '',
    otp
  });

  assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
  assert.equal(regRes.json.success, true);
  assert.equal(regRes.json.user.name, 'Ananya Sharma');
  assert.equal(regRes.json.user.email, email);
  assert.equal(regRes.json.user.role, 'PROPERTY_SEEKER');
  assert.equal(regRes.json.user.phone, '');
  assert.equal(regRes.json.user.phone_verified, 0);
  assert.ok(regRes.cookie, 'Session cookie must be issued on successful registration');

  // Verify database record
  const userInDb = await findUserByEmail(email);
  assert.ok(userInDb);
  assert.equal(userInDb.phone, '');
  assert.equal(Number(userInDb.phone_verified || 0), 0);

  // Verify login works without phone verification
  const loginRes = await api('POST', '/api/auth/login', { email, password });
  assert.equal(loginRes.status, 200);
  assert.equal(loginRes.json.success, true);
  assert.ok(loginRes.cookie);

  // Verify session endpoint
  const meRes = await api('GET', '/api/auth/me', undefined, loginRes.cookie);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.json.user.email, email);
});

test('Property Seeker registration saves phone number when optionally provided', async () => {
  const email = 'seeker.withphone@example.com';
  const password = 'StrongPassword123!';
  const rawPhone = '+91 98490 12345';

  // Request email OTP
  const otpRes = await api('POST', '/api/auth/send-email-otp', { email });
  assert.equal(otpRes.status, 200);
  const otp = capturedOtpCodes.get(email);
  assert.ok(otp);

  // Register Property Seeker with phone number provided, but NO phoneOtp
  const regRes = await api('POST', '/api/auth/register', {
    name: 'Vikram Reddy',
    email,
    password,
    role: 'PROPERTY_SEEKER',
    phone: rawPhone,
    otp
  });

  assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
  assert.equal(regRes.json.success, true);
  assert.equal(regRes.json.user.phone, '+919849012345');

  // Verify database row holds the saved phone number
  const userInDb = await findUserByEmail(email);
  assert.ok(userInDb);
  assert.equal(userInDb.phone, '+919849012345');
});

test('Email OTP verification is still mandatory and rejected if invalid or missing', async () => {
  // Missing OTP
  const noOtp = await api('POST', '/api/auth/register', {
    name: 'No OTP User',
    email: 'no.otp@example.com',
    password: 'Password123!',
    role: 'PROPERTY_SEEKER'
  });
  assert.equal(noOtp.status, 400);
  assert.match(noOtp.json.error, /verification code/i);

  // Invalid OTP
  const badOtp = await api('POST', '/api/auth/register', {
    name: 'Bad OTP User',
    email: 'bad.otp@example.com',
    password: 'Password123!',
    role: 'PROPERTY_SEEKER',
    otp: '000000'
  });
  assert.equal(badOtp.status, 400);
  assert.match(badOtp.json.error, /Invalid or expired/i);
});

test('Phone OTP can be re-enabled through REQUIRE_PHONE_OTP environment variable', async () => {
  try {
    process.env.REQUIRE_PHONE_OTP = 'true';
    assert.equal(isPhoneOtpRequired(), true);

    const configRes = await api('GET', '/api/auth/config');
    assert.equal(configRes.json.phoneOtpRequired, true);

    // Request email OTP
    const email = 'seeker.reenabled@example.com';
    await api('POST', '/api/auth/send-email-otp', { email });
    const otp = capturedOtpCodes.get(email);
    assert.ok(otp);

    // When phone OTP is re-enabled, Property Seeker without phone OTP must be rejected
    const blockedRes = await api('POST', '/api/auth/register', {
      name: 'Blocked User',
      email,
      password: 'Password123!',
      role: 'PROPERTY_SEEKER',
      phone: '+919849012345',
      otp
    });
    assert.equal(blockedRes.status, 400);
    assert.match(blockedRes.json.error, /Mobile number OTP verification is required/i);
  } finally {
    delete process.env.REQUIRE_PHONE_OTP;
  }
});
