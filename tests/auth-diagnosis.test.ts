import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyPassword, hashPassword } from '../src/server/db.ts';
import { readApiResponse } from '../src/lib/apiResponse.ts';
import { POSTGRES_ADDITIVE_SQL } from '../src/server/platformSchema.ts';

test('verifyPassword handles invalid, malformed, or mismatched inputs safely without throwing', () => {
  const { hash, salt } = hashPassword('CorrectPassword123!');

  // Correct credentials match
  assert.equal(verifyPassword('CorrectPassword123!', hash, salt), true);

  // Wrong password returns false
  assert.equal(verifyPassword('WrongPassword123!', hash, salt), false);

  // Missing or empty password, hash, or salt returns false without throwing
  assert.equal(verifyPassword('', hash, salt), false);
  assert.equal(verifyPassword('password', '', salt), false);
  assert.equal(verifyPassword('password', hash, ''), false);

  // Mismatched buffer length does not throw RangeError (crypto.timingSafeEqual guard)
  assert.equal(verifyPassword('password', 'short', salt), false);
  assert.equal(verifyPassword('password', 'invalid_hex_string_xyz', salt), false);
});

test('readApiResponse uses provided fallback on host or non-JSON errors', async () => {
  // Plain text / HTML error response (e.g. from Vercel edge or crash)
  const htmlResponse = new Response('<html><body>500 Internal Server Error</body></html>', {
    status: 500,
    headers: { 'content-type': 'text/html' }
  });

  // When provided a custom fallback (such as for login), it uses the custom fallback
  const loginResult = await readApiResponse(htmlResponse, 'Invalid credentials. Please verify your email and password.');
  assert.equal(loginResult.ok, false);
  assert.equal(loginResult.error, 'Invalid credentials. Please verify your email and password.');
  assert.doesNotMatch(loginResult.error, /No account was created/);

  // When no fallback is provided, it maintains backwards compatibility with registration failure message
  const regHtmlResponse = new Response('<html><body>500 Internal Server Error</body></html>', {
    status: 500,
    headers: { 'content-type': 'text/html' }
  });
  const regResult = await readApiResponse(regHtmlResponse);
  assert.equal(regResult.ok, false);
  assert.match(regResult.error, /No account was created/);

  // JSON error responses preserve the server error message
  const jsonResponse = new Response(JSON.stringify({ error: 'Invalid email or password.' }), {
    status: 401,
    headers: { 'content-type': 'application/json' }
  });
  const jsonResult = await readApiResponse(jsonResponse, 'Invalid credentials. Please verify your email and password.');
  assert.equal(jsonResult.ok, false);
  assert.equal(jsonResult.error, 'Invalid email or password.');
});

test('POSTGRES_ADDITIVE_SQL ensures sessions table supports 64-bit timestamps and long IP strings', () => {
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE sessions ALTER COLUMN expires_at TYPE BIGINT;/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE sessions ALTER COLUMN ip_address TYPE TEXT;/);
});
