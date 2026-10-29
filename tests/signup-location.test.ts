import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import test from 'node:test';

/**
 * Hyderabad Default Signup Location Tests.
 * Runs on isolated local SQLite with mocked email OTP. Production database remains protected.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-signup-location-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
delete process.env.RESEND_FROM;

const {
  initDatabase,
  findUserByEmail,
  findUserById,
  createUser,
  registerVerifiedUser,
  generateOtp
} = await import('../src/server/db.ts');

await initDatabase();
const { app } = await import('../server.ts');

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

// Capture outgoing mocked verification codes
const otpMap = new Map<string, string>();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const body = JSON.parse(String(init?.body || '{}'));
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    const recipient = String(body.to?.[0] || '');
    otpMap.set(recipient, code);
    return new Response(JSON.stringify({ id: 'email_mock_signup_location' }), {
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

test('LoginModal component fixes signup location to Hyderabad, Telangana, India and supports viewport scrolling', () => {
  const loginModalSource = read('src/components/common/LoginModal.tsx');

  // Must declare Hyderabad, Telangana, India as default
  assert.match(loginModalSource, /DEFAULT_SIGNUP_LOCATION\s*=\s*'Hyderabad, Telangana, India'/);

  // Must render non-editable, locked input with signup-location id and fixed value
  assert.match(loginModalSource, /id="signup-location"/);
  assert.match(loginModalSource, /name="location"/);
  assert.match(loginModalSource, /value=\{DEFAULT_SIGNUP_LOCATION\}/);
  assert.match(loginModalSource, /readOnly/);

  // Must inform user of fixed Hyderabad territory and not allow changing
  assert.match(loginModalSource, /Platform location is fixed to Hyderabad, Telangana, India\./);
  assert.doesNotMatch(loginModalSource, /You may change this before registering\./);

  // Must have scrollable viewport-constrained container and compact layout
  assert.match(loginModalSource, /max-h-\[92vh\]|max-h-\[90vh\]/);
  assert.match(loginModalSource, /overflow-y-auto/);

  // Must send townCity / location in the register request payload
  assert.match(loginModalSource, /townCity:\s*DEFAULT_SIGNUP_LOCATION/);
  assert.match(loginModalSource, /location:\s*DEFAULT_SIGNUP_LOCATION/);

  // Must show fixed location on OTP confirmation screen
  assert.match(loginModalSource, /Location:/);
  assert.match(loginModalSource, /DEFAULT_SIGNUP_LOCATION/);
});

test('Backend registerVerifiedUser defaults town_city to Hyderabad, Telangana, India when omitted', async () => {
  const email = 'default-loc-repo@example.com';
  const issued = await generateOtp(email, 'EMAIL_VERIFICATION');

  const registered = await registerVerifiedUser({
    name: 'Default Location User',
    email,
    password: 'Password123!',
    role: 'CHANNEL_PARTNER',
    otp: issued.otp,
    requirePhone: false
  });

  assert.equal(registered.town_city, 'Hyderabad, Telangana, India');

  // Confirm database row directly
  const inDb = await findUserById(registered.id);
  assert.equal(inDb?.town_city, 'Hyderabad, Telangana, India');
});

test('Backend registerVerifiedUser persists user-customized location when changed', async () => {
  const email = 'custom-loc-repo@example.com';
  const issued = await generateOtp(email, 'EMAIL_VERIFICATION');

  const customLocation = 'Bengaluru, Karnataka, India';
  const registered = await registerVerifiedUser({
    name: 'Bengaluru User',
    email,
    password: 'Password123!',
    role: 'CHANNEL_PARTNER',
    townCity: customLocation,
    otp: issued.otp,
    requirePhone: false
  });

  assert.equal(registered.town_city, customLocation);

  const inDb = await findUserById(registered.id);
  assert.equal(inDb?.town_city, customLocation);
});

test('HTTP POST /api/auth/register defaults to Hyderabad, Telangana, India and returns in profile', async () => {
  const email = 'http-default-loc@example.com';

  // 1. Request Email OTP
  const otpRes = await api('POST', '/api/auth/send-email-otp', { email });
  assert.equal(otpRes.status, 200);

  const code = otpMap.get(email);
  assert.ok(code && code.length === 6, 'Verification code should have been captured');

  // 2. Register without specifying location (default fallback)
  const regRes = await api('POST', '/api/auth/register', {
    name: 'Suresh Chandra',
    email,
    password: 'SecurePassword123!',
    role: 'CHANNEL_PARTNER',
    otp: code
  });

  assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
  assert.equal(regRes.json.success, true);
  assert.equal(regRes.json.user.townCity, 'Hyderabad, Telangana, India');
  assert.equal(regRes.json.user.town_city, 'Hyderabad, Telangana, India');

  // 3. Verify user in database
  const userInDb = await findUserByEmail(email);
  assert.equal(userInDb?.town_city, 'Hyderabad, Telangana, India');

  // 4. Verify persistence after login via /api/auth/me session
  assert.ok(regRes.cookie, 'Session cookie must be issued on registration');
  const meRes = await api('GET', '/api/auth/me', undefined, regRes.cookie);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.json.user.townCity, 'Hyderabad, Telangana, India');
  assert.equal(meRes.json.user.town_city, 'Hyderabad, Telangana, India');
});

test('HTTP POST /api/auth/register persists user-customized location and persists after login', async () => {
  const email = 'http-custom-loc@example.com';

  const otpRes = await api('POST', '/api/auth/send-email-otp', { email });
  assert.equal(otpRes.status, 200);

  const code = otpMap.get(email);
  assert.ok(code && code.length === 6);

  const chosenLocation = 'Warangal, Telangana, India';
  const regRes = await api('POST', '/api/auth/register', {
    name: 'Warangal Member',
    email,
    password: 'SecurePassword123!',
    role: 'RESELLER',
    townCity: chosenLocation,
    otp: code
  });

  assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
  assert.equal(regRes.json.success, true);
  assert.equal(regRes.json.user.townCity, chosenLocation);

  const userInDb = await findUserByEmail(email);
  assert.equal(userInDb?.town_city, chosenLocation);

  const meRes = await api('GET', '/api/auth/me', undefined, regRes.cookie);
  assert.equal(meRes.status, 200);
  assert.equal(meRes.json.user.townCity, chosenLocation);
});

test('HTTP POST /api/auth/register supports separate city and state fields', async () => {
  const email = 'http-city-state@example.com';

  const otpRes = await api('POST', '/api/auth/send-email-otp', { email });
  assert.equal(otpRes.status, 200);

  const code = otpMap.get(email);
  assert.ok(code && code.length === 6);

  const regRes = await api('POST', '/api/auth/register', {
    name: 'Hyderabad Dual Field User',
    email,
    password: 'SecurePassword123!',
    role: 'LANDOWNER',
    city: 'Hyderabad',
    state: 'Telangana, India',
    otp: code
  });

  assert.equal(regRes.status, 200, JSON.stringify(regRes.json));
  assert.equal(regRes.json.user.townCity, 'Hyderabad, Telangana, India');
});

test('Registration rejects invalid location input containing HTML or exceeding 80 characters', async () => {
  const emailHtml = 'invalid-html-loc@example.com';
  await api('POST', '/api/auth/send-email-otp', { email: emailHtml });
  const codeHtml = otpMap.get(emailHtml)!;

  const htmlRes = await api('POST', '/api/auth/register', {
    name: 'Attacker',
    email: emailHtml,
    password: 'Password123!',
    role: 'CHANNEL_PARTNER',
    townCity: 'Hyderabad <script>alert(1)</script>',
    otp: codeHtml
  });
  assert.equal(htmlRes.status, 400);
  assert.match(htmlRes.json.error, /Location cannot include HTML/);

  const emailLong = 'invalid-long-loc@example.com';
  await api('POST', '/api/auth/send-email-otp', { email: emailLong });
  const codeLong = otpMap.get(emailLong)!;

  const longRes = await api('POST', '/api/auth/register', {
    name: 'Long Location User',
    email: emailLong,
    password: 'Password123!',
    role: 'CHANNEL_PARTNER',
    townCity: 'A'.repeat(81),
    otp: codeLong
  });
  assert.equal(longRes.status, 400);
  assert.match(longRes.json.error, /Location must be 80 characters or fewer/);
});

test('Existing users with saved locations are never overwritten during new user registrations', async () => {
  // Create an existing user with an existing custom location
  const existingEmail = 'existing-user-loc@example.com';
  const existingUser = await createUser({
    name: 'Existing Member',
    email: existingEmail,
    role: 'LANDOWNER',
    townCity: 'Mumbai, Maharashtra, India',
    isVerified: true
  });
  assert.equal(existingUser.town_city, 'Mumbai, Maharashtra, India');

  // Register another user
  const newEmail = 'new-user-non-overwrite@example.com';
  await api('POST', '/api/auth/send-email-otp', { email: newEmail });
  const code = otpMap.get(newEmail)!;

  await api('POST', '/api/auth/register', {
    name: 'Another User',
    email: newEmail,
    password: 'Password123!',
    role: 'CHANNEL_PARTNER',
    otp: code
  });

  // Verify existing user's location is completely preserved
  const rechecked = await findUserById(existingUser.id);
  assert.equal(rechecked?.town_city, 'Mumbai, Maharashtra, India');
});
