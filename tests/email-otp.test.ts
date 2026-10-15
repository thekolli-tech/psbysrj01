import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { OtpCooldownError } from '../src/server/otpCrypto.ts';
import { redactDatabaseError } from '../src/server/postgres.ts';

/**
 * Mocked Resend plus local SQLite.
 * This file does not call api.resend.com and does not open Neon.
 */

process.env.NODE_ENV = 'test';
delete process.env.DATABASE_URL;
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-email-otp-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.RESEND_FROM;

const { initDatabase, generateOtp, verifyOtp, findUserByEmail, getSqliteDb } = await import('../src/server/db.ts');
const { issueEmailOtp } = await import('../src/server/emailOtp.ts');
await initDatabase();

let tail: Promise<void> = Promise.resolve();
function queued(name: string, fn: () => Promise<void>): void {
  const run = tail.then(fn);
  tail = run.then(() => undefined, () => undefined);
  test(name, () => run);
}

queued('OTP hash, expiry, reuse, attempts, and cooldown on local SQLite', async () => {
  const email = 'otp-success@example.com';
  const issued = await generateOtp(email, 'EMAIL_VERIFICATION');
  const row = getSqliteDb().prepare('SELECT otp_raw, otp_hash FROM otps WHERE target = ?').get(email) as { otp_raw: string | null; otp_hash: string };
  assert.equal(row.otp_raw, null);
  assert.equal(row.otp_hash.includes(issued.otp), false);
  assert.match(row.otp_hash, /^[a-f0-9]{32}\.[a-f0-9]{64}$/);
  assert.equal(await verifyOtp(email, 'EMAIL_VERIFICATION', issued.otp), true);
  assert.equal(await verifyOtp(email, 'EMAIL_VERIFICATION', issued.otp), false);

  const invalidEmail = 'otp-invalid@example.com';
  const invalidIssued = await generateOtp(invalidEmail, 'EMAIL_VERIFICATION');
  assert.equal(await verifyOtp(invalidEmail, 'EMAIL_VERIFICATION', '000000'), false);
  assert.equal(await verifyOtp(invalidEmail, 'EMAIL_VERIFICATION', invalidIssued.otp), true);

  const expiring = 'otp-expired@example.com';
  const expired = await generateOtp(expiring, 'EMAIL_VERIFICATION');
  getSqliteDb().prepare('UPDATE otps SET expires_at = ? WHERE target = ?').run(Date.now() - 1000, expiring);
  assert.equal(await verifyOtp(expiring, 'EMAIL_VERIFICATION', expired.otp), false);

  const limited = 'otp-limited@example.com';
  const limitedCode = await generateOtp(limited, 'EMAIL_VERIFICATION');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal(await verifyOtp(limited, 'EMAIL_VERIFICATION', '111111'), false);
  }
  assert.equal(await verifyOtp(limited, 'EMAIL_VERIFICATION', limitedCode.otp), false);

  const cooled = 'otp-cooldown@example.com';
  await generateOtp(cooled, 'EMAIL_VERIFICATION');
  await assert.rejects(() => generateOtp(cooled, 'EMAIL_VERIFICATION'), OtpCooldownError);
});

queued('mocked Resend delivery, provider failure, and sender guard', async () => {
  process.env.RESEND_API_KEY = 're_test_mock_key';
  process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };
  console.warn = (...args: unknown[]) => { logs.push(args.map(String).join(' ')); };

  try {
    let captured: { url: string; init: RequestInit } | null = null;
    const sent = await issueEmailOtp('delivered-mock@example.com', 'EMAIL_VERIFICATION', async (url, init) => {
      captured = { url: String(url), init: init || {} };
      return new Response(JSON.stringify({ id: 'email_mock_1' }), { status: 200 });
    });
    assert.equal(sent.sent, true);
    assert.ok(captured);
    const request = captured as { url: string; init: RequestInit };
    assert.equal(request.url, 'https://api.resend.com/emails');
    const headers = request.init.headers as Record<string, string>;
    assert.equal(headers.Authorization, 'Bearer re_test_mock_key');
    const body = JSON.parse(String(request.init.body));
    assert.equal(body.from, 'Property Studio <otp@propertystudio.org>');
    assert.equal(body.subject, 'Your Property Studio verification code');
    assert.doesNotMatch(body.subject, /\d{6}/);
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    assert.equal(code.length, 6);
    assert.equal(logs.some(line => line.includes(code) || line.includes('re_test_mock_key')), false);
    assert.equal(await verifyOtp('delivered-mock@example.com', 'EMAIL_VERIFICATION', code), true);

    let called = false;
    delete process.env.RESEND_API_KEY;
    const missing = await issueEmailOtp('missing-key@example.com', 'EMAIL_VERIFICATION', async () => {
      called = true;
      return new Response('{}', { status: 200 });
    });
    assert.equal(missing.sent, false);
    assert.equal(called, false);
    assert.equal(await findUserByEmail('missing-key@example.com'), null);

    process.env.RESEND_API_KEY = 're_test_mock_key';
    process.env.EMAIL_FROM = 'Property Studio <onboarding@resend.dev>';
    let wrongFromCalled = false;
    const wrongFrom = await issueEmailOtp('wrong-from@example.com', 'EMAIL_VERIFICATION', async () => {
      wrongFromCalled = true;
      return new Response('{}', { status: 200 });
    });
    assert.equal(wrongFrom.sent, false);
    assert.equal(wrongFromCalled, false);

    process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
    const failed = await issueEmailOtp('provider-down@example.com', 'EMAIL_VERIFICATION', async () => new Response('no', { status: 422 }));
    assert.equal(failed.sent, false);
    assert.equal(await verifyOtp('provider-down@example.com', 'EMAIL_VERIFICATION', '123456'), false);
    const leftover = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL').get('provider-down@example.com') as { count: number };
    assert.equal(Number(leftover.count), 0);

    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    delete process.env.OTP_HASH_SECRET;
    const blocked = await issueEmailOtp('no-pepper@example.com', 'EMAIL_VERIFICATION', async () => new Response('{}', { status: 200 }));
    process.env.NODE_ENV = previousEnv;
    process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
    assert.equal(blocked.sent, false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    process.env.NODE_ENV = 'test';
    process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
    process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
    process.env.RESEND_API_KEY = 're_test_mock_key';
  }
});

queued('database errors do not retain a PostgreSQL connection string', async () => {
  const leaked = 'connect ECONNREFUSED postgresql://app:s3cret@ep-example.neon.tech/neondb?sslmode=require';
  const safe = redactDatabaseError(leaked);
  assert.equal(safe.includes('s3cret'), false);
  assert.match(safe, /postgresql:\/\/\[redacted\]/);
});

queued('HTTP registration uses mocked Resend and verifies email before creating a user', async () => {
  process.env.RESEND_API_KEY = 're_test_mock_key';
  process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
  const deliveries: Array<{ html: string; from: string; subject: string }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === 'https://api.resend.com/emails') {
      const body = JSON.parse(String(init?.body || '{}'));
      deliveries.push({ html: body.html, from: body.from, subject: body.subject });
      return new Response(JSON.stringify({ id: 'email_mock_http' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(url, init);
  }) as typeof fetch;

  const { app } = await import('../server.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const closeServer = () => new Promise<void>(resolve => (server as Server).close(() => resolve()));

  try {
  async function api(path: string, body: unknown) {
    const response = await originalFetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const json = await response.json();
    return { status: response.status, json, raw: JSON.stringify(json) };
  }

  const email = 'register-mock@example.com';
  const sent = await api('/api/auth/send-email-otp', { email });
  assert.equal(sent.status, 200, sent.raw);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0].from, 'Property Studio <otp@propertystudio.org>');
  assert.equal(sent.json.otp, undefined);
  const code = deliveries[0].html.match(/>(\d{6})</)?.[1] || '';
  assert.equal(sent.raw.includes(code), false);

  const cooldown = await api('/api/auth/send-email-otp', { email });
  assert.equal(cooldown.status, 429);

  const invalid = await api('/api/auth/verify-email-otp', { email, otp: '000000' });
  assert.equal(invalid.status, 400);
  const verified = await api('/api/auth/verify-email-otp', { email, otp: code });
  assert.equal(verified.status, 200);
  const reused = await api('/api/auth/verify-email-otp', { email, otp: code });
  assert.equal(reused.status, 400);

  const registered = await api('/api/auth/register', {
    name: 'Mock Registrant',
    email,
    password: 'Longpassword1!',
    role: 'CHANNEL_PARTNER',
    otp: code
  });
  assert.equal(registered.status, 200, registered.raw);
  assert.equal(registered.raw.includes(code), false);
  const user = await findUserByEmail(email);
  assert.equal(user?.email_verified, 1);

  globalThis.fetch = (async () => new Response('upstream down', { status: 503 })) as typeof fetch;
  const failedEmail = 'provider-fail@example.com';
  const failedSend = await api('/api/auth/send-email-otp', { email: failedEmail });
  assert.equal(failedSend.status, 502);
  assert.equal(failedSend.raw.includes('re_test_mock_key'), false);
  const failedRegister = await api('/api/auth/register', {
    name: 'Should Not Exist',
    email: failedEmail,
    password: 'Longpassword1!',
    role: 'CHANNEL_PARTNER',
    otp: '123456'
  });
  assert.equal(failedRegister.status, 400);
  assert.equal(await findUserByEmail(failedEmail), null);
  } finally {
    globalThis.fetch = originalFetch;
    await closeServer();
  }
});
