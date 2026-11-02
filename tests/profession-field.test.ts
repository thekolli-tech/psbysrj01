import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import test from 'node:test';

/**
 * Profession Field Validation & Registration Tests.
 * Tests single-line text input specification, mandatory validation,
 * whitespace trimming, non-destructive persistence, and security isolation.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-profession-test-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';

const {
  initDatabase,
  findUserByEmail,
  findUserById,
  createUser,
  generateOtp
} = await import('../src/server/db.ts');

await initDatabase();
const { app } = await import('../server.ts');

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

// Intercept email OTPs for registration testing
const otpMap = new Map<string, string>();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const body = JSON.parse(String(init?.body || '{}'));
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    const recipient = String(body.to?.[0] || '');
    otpMap.set(recipient, code);
    return new Response(JSON.stringify({ id: 'email_mock_profession_test' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return originalFetch(url, init);
}) as typeof fetch;

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

test.after(() => {
  globalThis.fetch = originalFetch;
  return new Promise<void>(resolve => (server as Server).close(() => resolve()));
});

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await originalFetch(`${baseUrl}${path}`, {
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

test('1. Frontend UI specification: Single-line short-answer input replaces select dropdown', () => {
  const source = read('src/components/common/LoginModal.tsx');

  // Exact specifications
  assert.match(source, /id="signup-profession"/);
  assert.match(source, /name="profession"/);
  assert.match(source, /type="text"/);
  assert.match(source, /placeholder="Enter your profession"/);
  assert.match(source, /Profession \*/);
  assert.match(source, /autoComplete="off"/);

  // No dropdown or predefined options allowed
  assert.doesNotMatch(source, /<select[^>]*id="signup-profession"/);
  assert.doesNotMatch(source, /<option value="Buyer">Buyer<\/option>/);
  assert.doesNotMatch(source, /<option value="Seller">Seller<\/option>/);
  assert.doesNotMatch(source, /<option value="Real Estate Agent">/);
  assert.doesNotMatch(source, /<option value="Builder \/ Developer">/);

  // Mandatory validation messages in frontend code
  assert.match(source, /Please enter your profession\./);
});

test('2. Backend rejects empty profession string with 400', async () => {
  const email = 'empty-prof@example.com';
  await api('POST', '/api/auth/send-email-otp', { email });
  const otp = otpMap.get(email) || '123456';

  const res = await api('POST', '/api/auth/register', {
    name: 'Empty Prof User',
    email,
    password: 'SecurePass123!',
    role: 'CHANNEL_PARTNER',
    profession: '',
    otp
  });

  assert.equal(res.status, 400);
  assert.equal(res.json?.error, 'Please enter your profession.');
});

test('3. Backend rejects whitespace-only profession string with 400', async () => {
  const email = 'whitespace-prof@example.com';
  await api('POST', '/api/auth/send-email-otp', { email });
  const otp = otpMap.get(email) || '123456';

  const res = await api('POST', '/api/auth/register', {
    name: 'Whitespace Prof User',
    email,
    password: 'SecurePass123!',
    role: 'CHANNEL_PARTNER',
    profession: '     ',
    otp
  });

  assert.equal(res.status, 400);
  assert.equal(res.json?.error, 'Please enter your profession.');
});

test('4. Backend rejects null profession with 400', async () => {
  const email = 'null-prof@example.com';
  await api('POST', '/api/auth/send-email-otp', { email });
  const otp = otpMap.get(email) || '123456';

  const res = await api('POST', '/api/auth/register', {
    name: 'Null Prof User',
    email,
    password: 'SecurePass123!',
    role: 'CHANNEL_PARTNER',
    profession: null,
    otp
  });

  assert.equal(res.status, 400);
  assert.equal(res.json?.error, 'Please enter your profession.');
});

test('5. Backend accepts and trims legitimate user professions', async () => {
  const professionsToTest = [
    { raw: '  Software Engineer  ', expected: 'Software Engineer' },
    { raw: 'Digital Marketing Manager', expected: 'Digital Marketing Manager' },
    { raw: 'Doctor', expected: 'Doctor' },
    { raw: 'Architect', expected: 'Architect' },
    { raw: 'Real Estate Developer', expected: 'Real Estate Developer' },
    { raw: '  Entrepreneur  ', expected: 'Entrepreneur' }
  ];

  for (let i = 0; i < professionsToTest.length; i++) {
    const item = professionsToTest[i];
    const email = `prof-test-${i}@example.com`;
    await api('POST', '/api/auth/send-email-otp', { email });
    const otp = otpMap.get(email) || '123456';

    const res = await api('POST', '/api/auth/register', {
      name: `User ${i}`,
      email,
      password: 'SecurePassword123!',
      role: 'CHANNEL_PARTNER',
      profession: item.raw,
      otp
    });

    assert.equal(res.status, 200, `Failed for ${item.raw}: ${JSON.stringify(res.json)}`);
    assert.equal(res.json?.user?.profession, item.expected);

    // Verify database record directly
    const userInDb = await findUserByEmail(email);
    assert.ok(userInDb);
    assert.equal(userInDb.profession, item.expected);
  }
});

test('6. Security: Rejects HTML injection in profession', async () => {
  const email = 'xss-prof@example.com';
  await api('POST', '/api/auth/send-email-otp', { email });
  const otp = otpMap.get(email) || '123456';

  const res = await api('POST', '/api/auth/register', {
    name: 'XSS Prof User',
    email,
    password: 'SecurePass123!',
    role: 'CHANNEL_PARTNER',
    profession: '<script>alert("XSS")</script>',
    otp
  });

  assert.equal(res.status, 400);
  assert.equal(res.json?.error, 'Profession cannot include HTML.');
});

test('7. Profile editing allows updating profession without changing role', async () => {
  const email = 'profile-edit-prof@example.com';
  const password = 'SecurePass123!';
  await api('POST', '/api/auth/send-email-otp', { email });
  const otp = otpMap.get(email) || '123456';

  const regRes = await api('POST', '/api/auth/register', {
    name: 'Editable Prof User',
    email,
    password,
    role: 'PROPERTY_SEEKER',
    profession: 'Student',
    otp
  });
  assert.equal(regRes.status, 200);

  // Login
  const loginRes = await api('POST', '/api/auth/login', { email, password });
  assert.equal(loginRes.status, 200);
  const cookie = loginRes.cookie;

  // Edit profile profession
  const patchRes = await api('PATCH', '/api/me/profile', { profession: '  Data Scientist  ' }, cookie);
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.json?.user?.profession, 'Data Scientist');
  assert.equal(patchRes.json?.user?.role, 'PROPERTY_SEEKER'); // Role unchanged
});
