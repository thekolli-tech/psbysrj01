import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { OtpCooldownError } from '../src/server/otpCrypto.ts';
import { redactDatabaseError } from '../src/server/postgres.ts';
import { allowRequest } from '../src/server/rateLimit.ts';

/**
 * Mocked Resend plus local SQLite.
 * This file does not call api.resend.com and does not open Neon.
 */

process.env.NODE_ENV = 'test';
// Empty, not deleted. Importing server.ts loads dotenv, which would fill a missing DATABASE_URL from .env and attach these tests to Neon.
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-email-otp-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
delete process.env.RESEND_API_KEY;
delete process.env.EMAIL_FROM;
delete process.env.RESEND_FROM;

const { initDatabase, generateOtp, verifyOtp, findUserByEmail, createUser, getSqliteDb } = await import('../src/server/db.ts');
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
  assert.match(issued.otp, /^\d{6}$/);
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
    if (!missing.sent) assert.equal(missing.code, 'EMAIL_NOT_CONFIGURED');
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
    if (!wrongFrom.sent) assert.equal(wrongFrom.code, 'EMAIL_SENDER_INVALID');
    assert.equal(wrongFromCalled, false);

    process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
    const failed = await issueEmailOtp('provider-down@example.com', 'EMAIL_VERIFICATION', async () => new Response('no', { status: 422 }));
    assert.equal(failed.sent, false);
    if (!failed.sent) assert.equal(failed.code, 'EMAIL_DELIVERY_FAILED');
    assert.equal(await verifyOtp('provider-down@example.com', 'EMAIL_VERIFICATION', '123456'), false);
    const leftover = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL').get('provider-down@example.com') as { count: number };
    assert.equal(Number(leftover.count), 0);

    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    delete process.env.OTP_HASH_SECRET;
    let pepperFetch = false;
    const blocked = await issueEmailOtp('no-pepper@example.com', 'EMAIL_VERIFICATION', async () => {
      pepperFetch = true;
      return new Response('{}', { status: 200 });
    });
    assert.equal(blocked.sent, false);
    if (!blocked.sent) assert.equal(blocked.code, 'OTP_NOT_CONFIGURED');
    assert.equal(pepperFetch, false);
    const pepperRows = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ?').get('no-pepper@example.com') as { count: number };
    assert.equal(Number(pepperRows.count), 0);

    process.env.NODE_ENV = 'production';
    const blockedProd = await issueEmailOtp('no-pepper-prod@example.com', 'EMAIL_VERIFICATION', async () => {
      pepperFetch = true;
      return new Response('{}', { status: 200 });
    });
    process.env.NODE_ENV = previousEnv;
    process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
    assert.equal(blockedProd.sent, false);
    assert.equal(pepperFetch, false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    process.env.NODE_ENV = 'test';
    process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
    process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
    process.env.RESEND_API_KEY = 're_test_mock_key';
  }
});

queued('email OTP requests stop after 8 attempts in 15 minutes', async () => {
  const key = 'email-otp:203.0.113.10:rate-unit@example.com';
  for (let attempt = 0; attempt < 8; attempt += 1) {
    assert.equal(allowRequest(key, 8, 15 * 60 * 1000), true);
  }
  assert.equal(allowRequest(key, 8, 15 * 60 * 1000), false);
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

  if (process.env.DATABASE_URL) {
    throw new Error('Refusing to import the server while DATABASE_URL is set. OTP tests stay on local SQLite.');
  }
  process.env.DATABASE_URL = '';
  const { app } = await import('../server.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const closeServer = () => new Promise<void>(resolve => (server as Server).close(() => resolve()));

  try {
  async function api(path: string, body: unknown) {
    const response = await originalFetch(`http://127.0.0.1:${port}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: '*/*' },
      body: JSON.stringify(body)
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, json, raw: text, contentType: response.headers.get('content-type') || '' };
  }

  const email = 'register-mock@example.com';
  const sent = await api('/api/auth/send-email-otp', { email });
  assert.equal(sent.status, 200, sent.raw);
  assert.match(sent.contentType, /application\/json/);
  assert.equal(sent.raw.includes('The page could not be found'), false);
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
  assert.equal(registered.json.token, undefined);
  assert.equal(registered.raw.includes(code), false);
  const replay = await api('/api/auth/register', {
    name: 'Mock Registrant',
    email,
    password: 'Longpassword1!',
    role: 'CHANNEL_PARTNER',
    otp: code
  });
  assert.equal(replay.status, 400);
  assert.equal(await findUserByEmail(email) !== null, true);
  const user = await findUserByEmail(email);
  assert.equal(user?.email_verified, 1);

  const unknownReset = await api('/api/auth/forgot-password', { email: 'nobody-reset@example.com' });
  assert.equal(unknownReset.status, 200);
  const deliveriesBeforeReset = deliveries.length;
  await createUser({
    name: 'Reset User',
    email: 'reset-user@example.com',
    password: 'Longpassword1!',
    role: 'PROPERTY_SEEKER',
    isVerified: true
  });
  const knownReset = await api('/api/auth/forgot-password', { email: 'reset-user@example.com' });
  assert.equal(knownReset.status, 200);
  assert.deepEqual(knownReset.json, unknownReset.json);
  assert.equal(knownReset.json.expiresAt, undefined);
  assert.equal(knownReset.json.deliveredVia, undefined);
  assert.equal(deliveries.length, deliveriesBeforeReset + 1);
  const resetHtml = deliveries[deliveries.length - 1].html;
  const resetCode = resetHtml.match(/>(\d{6})</)?.[1] || '';
  assert.equal(knownReset.raw.includes(resetCode), false);
  const cooledReset = await api('/api/auth/forgot-password', { email: 'reset-user@example.com' });
  assert.deepEqual(cooledReset.json, unknownReset.json);
  assert.equal(deliveries.length, deliveriesBeforeReset + 1);

  const rateEmail = 'rate-limit@example.com';
  const firstRate = await api('/api/auth/send-email-otp', { email: rateEmail });
  assert.equal(firstRate.status, 200, firstRate.raw);
  for (let attempt = 0; attempt < 7; attempt += 1) {
    const waiting = await api('/api/auth/send-email-otp', { email: rateEmail });
    assert.equal(waiting.status, 429);
    assert.match(waiting.json.error, /Please wait/);
  }
  const capped = await api('/api/auth/send-email-otp', { email: rateEmail });
  assert.equal(capped.status, 429);
  assert.equal(capped.json.error, 'Too many attempts. Wait and try again.');

  const missing = await api('/api/auth/does-not-exist', {});
  assert.equal(missing.status, 404);
  assert.match(missing.contentType, /application\/json/);
  assert.equal(missing.json.error, 'Not found');
  assert.equal(missing.raw.includes('The page could not be found'), false);

  const sms = await api('/api/auth/send-phone-otp', { phone: '+919800011199' });
  assert.equal(sms.status, 503);
  assert.equal(sms.json.code, 'WHATSAPP_NOT_CONFIGURED');
  assert.equal(sms.json.success, undefined);
  assert.match(sms.contentType, /application\/json/);
  const smsRows = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ?').get('+919800011199') as { count: number };
  assert.equal(Number(smsRows.count), 0);
  assert.equal(await findUserByEmail('seeker-bypass@example.com'), null);

  const privileged = await api('/api/auth/register', {
    name: 'Not An Admin',
    email: 'not-admin@example.com',
    password: 'Longpassword1!',
    role: 'SUPER_ADMIN',
    otp: '123456'
  });
  assert.equal(privileged.status, 403);
  assert.equal(await findUserByEmail('not-admin@example.com'), null);
  const developerSignup = await api('/api/auth/register', {
    name: 'Not A Developer',
    email: 'not-developer@example.com',
    password: 'Longpassword1!',
    role: 'DEVELOPER',
    otp: '123456'
  });
  assert.equal(developerSignup.status, 403);
  assert.equal(await findUserByEmail('not-developer@example.com'), null);

  const seekerEmail = 'seeker-email-only@example.com';
  const seekerSent = await api('/api/auth/send-email-otp', { email: seekerEmail });
  assert.equal(seekerSent.status, 200, seekerSent.raw);
  const seekerCode = deliveries[deliveries.length - 1].html.match(/>(\d{6})</)?.[1] || '';
  const seekerRegistered = await api('/api/auth/register', {
    name: 'Email Only Seeker',
    email: seekerEmail,
    password: 'Longpassword1!',
    role: 'PROPERTY_SEEKER',
    phone: '+14155550199',
    otp: seekerCode,
    phoneVerified: true,
    phoneOtp: '000000'
  });
  assert.equal(seekerRegistered.status, 400, seekerRegistered.raw);
  assert.equal(await findUserByEmail(seekerEmail), null);
  const seekerReplay = await api('/api/auth/register', {
    name: 'Email Only Seeker',
    email: seekerEmail,
    password: 'Longpassword1!',
    role: 'PROPERTY_SEEKER',
    phone: '+14155550199',
    otp: seekerCode
  });
  assert.equal(seekerReplay.status, 400);
  assert.equal(await findUserByEmail(seekerEmail), null);

  const ownerFallbackEmail = 'seeker-login-standin@example.com';
  const ownerFallbackSent = await api('/api/auth/send-email-otp', { email: ownerFallbackEmail });
  assert.equal(ownerFallbackSent.status, 200, ownerFallbackSent.raw);
  const ownerFallbackCode = deliveries[deliveries.length - 1].html.match(/>(\d{6})</)?.[1] || '';
  const ownerFallback = await api('/api/auth/register', {
    name: 'Email Only Partner',
    email: ownerFallbackEmail,
    password: 'Longpassword1!',
    role: 'CHANNEL_PARTNER',
    otp: ownerFallbackCode
  });
  assert.equal(ownerFallback.status, 200, ownerFallback.raw);

  const seekerLogin = await originalFetch(`http://127.0.0.1:${port}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ email: ownerFallbackEmail, password: 'Longpassword1!' })
  });
  const seekerLoginJson = await seekerLogin.json() as { user?: { role?: string }; token?: string };
  assert.equal(seekerLogin.status, 200);
  assert.equal(seekerLoginJson.user?.role, 'CHANNEL_PARTNER');
  assert.equal(seekerLoginJson.token, undefined);
  const sessionCookie = String(seekerLogin.headers.get('set-cookie') || '').split(';')[0];
  assert.match(sessionCookie, /^ps_session=/);
  const seekerMe = await originalFetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie: sessionCookie, accept: 'application/json' } });
  const seekerMeJson = await seekerMe.json() as { user?: { email?: string } };
  assert.equal(seekerMeJson.user?.email, ownerFallbackEmail);
  const seekerLogout = await originalFetch(`http://127.0.0.1:${port}/api/auth/logout`, {
    method: 'POST',
    headers: { cookie: sessionCookie, accept: 'application/json' }
  });
  assert.equal(seekerLogout.status, 200);
  const afterLogout = await originalFetch(`http://127.0.0.1:${port}/api/auth/me`, { headers: { cookie: sessionCookie, accept: 'application/json' } });
  const afterLogoutJson = await afterLogout.json() as { user?: unknown };
  assert.equal(afterLogoutJson.user, null);
  const revokedNotifications = await originalFetch(`http://127.0.0.1:${port}/api/notifications`, {
    headers: { cookie: sessionCookie, accept: 'application/json' }
  });
  assert.equal(revokedNotifications.status, 401);
  const anonymousNotifications = await originalFetch(`http://127.0.0.1:${port}/api/notifications`, {
    headers: { accept: 'application/json' }
  });
  assert.equal(anonymousNotifications.status, 401);

  const ownerEmail = 'landowner-register@example.com';
  const ownerSent = await api('/api/auth/send-email-otp', { email: ownerEmail });
  assert.equal(ownerSent.status, 200, ownerSent.raw);
  const ownerCode = deliveries[deliveries.length - 1].html.match(/>(\d{6})</)?.[1] || '';
  const owner = await api('/api/auth/register', {
    name: 'Land Owner',
    email: ownerEmail,
    password: 'Longpassword1!',
    role: 'LANDOWNER',
    otp: ownerCode
  });
  assert.equal(owner.status, 200, owner.raw);
  assert.equal((await findUserByEmail(ownerEmail))?.role, 'LANDOWNER');

  const savedKey = process.env.RESEND_API_KEY;
  const savedFrom = process.env.EMAIL_FROM;
  const savedPepper = process.env.OTP_HASH_SECRET;
  delete process.env.RESEND_API_KEY;
  const missingProvider = await api('/api/auth/send-email-otp', { email: 'missing-provider@example.com' });
  process.env.RESEND_API_KEY = savedKey;
  assert.equal(missingProvider.status, 503);
  assert.equal(missingProvider.json.code, 'EMAIL_NOT_CONFIGURED');
  assert.equal(missingProvider.json.success, undefined);
  assert.equal(await findUserByEmail('missing-provider@example.com'), null);

  process.env.EMAIL_FROM = 'Person <person@example.com>';
  const badSender = await api('/api/auth/send-email-otp', { email: 'bad-sender@example.com' });
  process.env.EMAIL_FROM = savedFrom;
  assert.equal(badSender.status, 503);
  assert.equal(badSender.json.code, 'EMAIL_SENDER_INVALID');
  assert.equal(await findUserByEmail('bad-sender@example.com'), null);

  delete process.env.OTP_HASH_SECRET;
  const missingPepper = await api('/api/auth/send-email-otp', { email: 'missing-pepper@example.com' });
  process.env.OTP_HASH_SECRET = savedPepper;
  assert.equal(missingPepper.status, 503);
  assert.equal(missingPepper.json.code, 'OTP_NOT_CONFIGURED');
  assert.equal(await findUserByEmail('missing-pepper@example.com'), null);

  const { sendRealSmsOtp } = await import('../src/server/notifications.ts');
  process.env.FAST2SMS_API_KEY = 'test-sms-key-not-real';
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => new Response(JSON.stringify({ return: false }), { status: 422, headers: { 'content-type': 'application/json' } })) as typeof fetch;
  const rejectedSms = await sendRealSmsOtp('+919800011188', '654321');
  globalThis.fetch = previousFetch;
  delete process.env.FAST2SMS_API_KEY;
  assert.equal(rejectedSms.success, false);
  assert.equal(JSON.stringify(rejectedSms).includes('654321'), false);

  await createUser({
    name: 'Reset Failure',
    email: 'reset-fail@example.com',
    password: 'Longpassword1!',
    role: 'PROPERTY_SEEKER',
    isVerified: true
  });
  globalThis.fetch = (async () => new Response('upstream down', { status: 503 })) as typeof fetch;
  const failedReset = await api('/api/auth/forgot-password', { email: 'reset-fail@example.com' });
  assert.equal(failedReset.status, 200);
  assert.deepEqual(failedReset.json, unknownReset.json);
  const failedResetRows = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL').get('reset-fail@example.com') as { count: number };
  assert.equal(Number(failedResetRows.count), 0);
  const failedEmail = 'provider-fail@example.com';
  const failedSend = await api('/api/auth/send-email-otp', { email: failedEmail });
  assert.equal(failedSend.status, 502);
  assert.equal(failedSend.json.code, 'EMAIL_DELIVERY_FAILED');
  assert.equal(failedSend.json.success, undefined);
  assert.equal(failedSend.raw.includes('re_test_mock_key'), false);
  assert.equal(failedSend.raw.includes('upstream down'), false);
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
