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
delete process.env.FAST2SMS_API_KEY;
delete process.env.FAST2SMS_OTP_ID;
delete process.env.FAST2SMS_OTP_VARIABLES;
delete process.env.FAST2SMS_SENDER_ID;

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
  assert.equal(sms.json.code, 'SMS_NOT_CONFIGURED');
  assert.equal(sms.json.success, undefined);
  assert.match(sms.contentType, /application\/json/);
  const smsRows = getSqliteDb().prepare('SELECT COUNT(*) AS count FROM otps WHERE target = ?').get('+919800011199') as { count: number };
  assert.equal(Number(smsRows.count), 0);
  assert.equal(await findUserByEmail('seeker-bypass@example.com'), null);

  const seekerEmail = 'seeker-bypass@example.com';
  const seekerSent = await api('/api/auth/send-email-otp', { email: seekerEmail });
  assert.equal(seekerSent.status, 200, seekerSent.raw);
  const seekerCode = deliveries[deliveries.length - 1].html.match(/>(\d{6})</)?.[1] || '';
  const seekerBypass = await api('/api/auth/register', {
    name: 'Seeker Bypass',
    email: seekerEmail,
    password: 'Longpassword1!',
    role: 'PROPERTY_SEEKER',
    phone: '+919800011199',
    otp: seekerCode,
    phoneVerified: true
  });
  assert.equal(seekerBypass.status, 400);
  assert.equal(await findUserByEmail(seekerEmail), null);

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
  delete process.env.FAST2SMS_OTP_ID;
  let providerCalls = 0;
  const previousFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    providerCalls += 1;
    return new Response(JSON.stringify({ return: false }), { status: 422, headers: { 'content-type': 'application/json' } });
  }) as typeof fetch;
  const missingTemplate = await sendRealSmsOtp('+919800011188', '654321');
  assert.equal(missingTemplate.success, false);
  assert.equal(providerCalls, 0);
  process.env.FAST2SMS_OTP_ID = 'otp-template-test';
  const rejectedSms = await sendRealSmsOtp('+919800011188', '654321');
  globalThis.fetch = previousFetch;
  delete process.env.FAST2SMS_API_KEY;
  delete process.env.FAST2SMS_OTP_ID;
  assert.equal(rejectedSms.success, false);
  assert.equal(providerCalls, 1);
  assert.equal(JSON.stringify(rejectedSms).includes('654321'), false);
  assert.equal(JSON.stringify(rejectedSms).includes('test-sms-key-not-real'), false);

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

queued('Property Seeker registration requires a real Fast2SMS OTP and an email OTP', async () => {
  process.env.RESEND_API_KEY = 're_test_mock_key';
  process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
  process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
  delete process.env.FAST2SMS_API_KEY;
  delete process.env.FAST2SMS_OTP_ID;
  delete process.env.FAST2SMS_OTP_VARIABLES;
  delete process.env.PAYMENT_PROVIDER;
  delete process.env.PAYMENT_WEBHOOK_SECRET;

  const emailCodes = new Map<string, string>();
  const smsRequests: Array<{ body: Record<string, unknown>; authorization: string }> = [];
  let smsMode: 'accept' | 'reject' | 'false' | 'throw' = 'accept';
  const originalFetch = globalThis.fetch;
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url);
    if (target === 'https://api.resend.com/emails') {
      const body = JSON.parse(String(init?.body || '{}'));
      const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
      emailCodes.set(String(body.to?.[0] || '').toLowerCase(), code);
      return new Response(JSON.stringify({ id: 'email_mock_sms' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    if (target === 'https://www.fast2sms.com/dev/otp/send') {
      const headers = init?.headers as Record<string, string>;
      const body = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      smsRequests.push({ body, authorization: headers.Authorization });
      if (smsMode === 'throw') throw new Error('provider network failure');
      if (smsMode === 'reject') return new Response(JSON.stringify({ return: false, status_code: 401 }), { status: 401 });
      if (smsMode === 'false') return new Response(JSON.stringify({ return: false, status_code: 200 }), { status: 200 });
      return new Response(JSON.stringify({ return: true, status_code: 200, request_id: 'req_mock_sms', message: 'OTP sent successfully' }), { status: 200 });
    }
    throw new Error(`Refusing an unexpected network call during the SMS test: ${target}`);
  }) as typeof fetch;

  const { app } = await import('../server.ts');
  const { createUser } = await import('../src/server/db.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;

  async function api(path: string, body?: unknown, method = body === undefined ? 'GET' : 'POST') {
    const response = await originalFetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: response.status, json, raw: text };
  }

  function phoneCode(national: string): string {
    const match = [...smsRequests].reverse().find((request) => request.body.mobile === national);
    return String(match?.body.otp || '');
  }

  function releasePhoneCooldown(target: string): void {
    getSqliteDb().prepare(`UPDATE otps SET created_at = ? WHERE target = ? AND type = 'PHONE_VERIFICATION' AND consumed_at IS NULL`).run(new Date(Date.now() - 120_000).toISOString(), target);
  }

  try {
    for (const phone of ['12345', '5800011199', '+14155550199', '980001119']) {
      const invalid = await api('/api/auth/send-phone-otp', { phone });
      assert.equal(invalid.status, 400, invalid.raw);
      assert.equal(invalid.json.error, 'A valid Indian mobile number is required');
      assert.equal(invalid.json.success, undefined);
    }
    assert.equal(smsRequests.length, 0);

    const unconfigured = await api('/api/auth/send-phone-otp', { phone: '+91 98000-11201' });
    assert.equal(unconfigured.status, 503);
    assert.equal(unconfigured.json.code, 'SMS_NOT_CONFIGURED');
    assert.equal(unconfigured.json.success, undefined);
    assert.equal(smsRequests.length, 0);
    const unconfiguredRows = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM otps WHERE target = ?`).get('+919800011201') as { count: number };
    assert.equal(Number(unconfiguredRows.count), 0);

    process.env.FAST2SMS_API_KEY = 'test-sms-key-not-real';
    const keyOnly = await api('/api/auth/send-phone-otp', { phone: '9800011201' });
    assert.equal(keyOnly.status, 503);
    assert.equal(keyOnly.json.code, 'SMS_NOT_CONFIGURED');
    assert.equal(smsRequests.length, 0);

    delete process.env.FAST2SMS_API_KEY;
    process.env.FAST2SMS_OTP_ID = 'otp-template-test';
    const templateOnly = await api('/api/auth/send-phone-otp', { phone: '9800011201' });
    assert.equal(templateOnly.status, 503);
    assert.equal(templateOnly.json.code, 'SMS_NOT_CONFIGURED');
    process.env.FAST2SMS_API_KEY = 'test-sms-key-not-real';

    smsMode = 'reject';
    const rejected = await api('/api/auth/send-phone-otp', { phone: '+919800011201' });
    assert.equal(rejected.status, 502);
    assert.equal(rejected.json.code, 'SMS_DELIVERY_FAILED');
    assert.equal(rejected.json.success, undefined);
    assert.equal(rejected.raw.includes('test-sms-key-not-real'), false);
    assert.equal(rejected.raw.includes(phoneCode('9800011201')), false);
    const rejectedRows = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM otps WHERE target = ? AND consumed_at IS NULL`).get('+919800011201') as { count: number };
    assert.equal(Number(rejectedRows.count), 0);

    smsMode = 'false';
    const falseSuccess = await api('/api/auth/send-phone-otp', { phone: '919800011201' });
    assert.equal(falseSuccess.status, 502);
    assert.equal(falseSuccess.json.success, undefined);

    smsMode = 'throw';
    const thrown = await api('/api/auth/send-phone-otp', { phone: '09800011201' });
    assert.equal(thrown.status, 502);
    assert.equal(thrown.json.code, 'SMS_DELIVERY_FAILED');

    smsMode = 'accept';
    const callsBeforeCooldown = smsRequests.length;
    const firstFormatted = await api('/api/auth/send-phone-otp', { phone: '+91 98000-11202' });
    assert.equal(firstFormatted.status, 200, firstFormatted.raw);
    assert.equal(firstFormatted.json.success, true);
    assert.equal(firstFormatted.json.deliveredVia, 'fast2sms');
    assert.equal(firstFormatted.json.otp, undefined);
    const sentCode = phoneCode('9800011202');
    assert.match(sentCode, /^\d{6}$/);
    assert.equal(firstFormatted.raw.includes(sentCode), false);
    assert.equal(smsRequests.at(-1)?.authorization, 'test-sms-key-not-real');
    assert.equal(smsRequests.at(-1)?.body.sender_id, undefined);
    assert.equal(smsRequests.at(-1)?.body.otp_id, 'otp-template-test');
    assert.equal(smsRequests.at(-1)?.body.otp_expiry, 10);
    assert.equal(smsRequests.at(-1)?.body.otp_length, 6);
    const stored = getSqliteDb().prepare(`SELECT otp_raw, otp_hash FROM otps WHERE target = ? AND type = 'PHONE_VERIFICATION' AND consumed_at IS NULL`).get('+919800011202') as { otp_raw: string | null; otp_hash: string };
    assert.equal(stored.otp_raw, null);
    assert.equal(stored.otp_hash.includes(sentCode), false);
    assert.match(stored.otp_hash, /^[a-f0-9]{32}\.[a-f0-9]{64}$/);

    const cooled = await api('/api/auth/send-phone-otp', { phone: '9800011202' });
    assert.equal(cooled.status, 429);
    assert.match(cooled.json.error, /Please wait/);
    assert.equal(smsRequests.length, callsBeforeCooldown + 1);

    const wrongVerify = await api('/api/auth/verify-phone-otp', { phone: '+919800011202', otp: '000000' });
    assert.equal(wrongVerify.status, 400);
    const verified = await api('/api/auth/verify-phone-otp', { phone: '9800011202', otp: sentCode });
    assert.equal(verified.status, 200);
    const replayVerify = await api('/api/auth/verify-phone-otp', { phone: '+91 98000 11202', otp: sentCode });
    assert.equal(replayVerify.status, 400);

    const seekerEmail = 'seeker-sms@example.com';
    const seekerSent = await api('/api/auth/send-email-otp', { email: seekerEmail });
    assert.equal(seekerSent.status, 200, seekerSent.raw);
    const emailOnly = await api('/api/auth/register', {
      name: 'Email Only',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '9800011202',
      otp: emailCodes.get(seekerEmail),
      phoneVerified: true
    });
    assert.equal(emailOnly.status, 400);
    assert.equal(await findUserByEmail(seekerEmail), null);

    const registered = await api('/api/auth/register', {
      name: 'SMS Seeker',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '+91 98000-11202',
      otp: emailCodes.get(seekerEmail),
      phoneOtp: sentCode,
      phoneVerified: false
    });
    assert.equal(registered.status, 200, registered.raw);
    assert.equal(registered.json.token, undefined);
    assert.equal(registered.raw.includes(sentCode), false);
    const seeker = await findUserByEmail(seekerEmail);
    assert.equal(seeker?.phone, '+919800011202');
    assert.equal(Number(seeker?.phone_verified), 1);
    const replayEmail = 'seeker-sms-replay@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: replayEmail })).status, 200);
    const replayAccount = await api('/api/auth/register', {
      name: 'SMS Seeker',
      email: replayEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '9800011202',
      otp: emailCodes.get(replayEmail),
      phoneOtp: sentCode
    });
    assert.equal(replayAccount.status, 400);
    assert.equal(await findUserByEmail(replayEmail), null);

    const duplicateEmail = 'seeker-duplicate-phone@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: duplicateEmail })).status, 200);
    releasePhoneCooldown('+919800011202');
    const duplicateSms = await api('/api/auth/send-phone-otp', { phone: '09800011202' });
    assert.equal(duplicateSms.status, 200, duplicateSms.raw);
    const duplicate = await api('/api/auth/register', {
      name: 'Duplicate Phone',
      email: duplicateEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '+919800011202',
      otp: emailCodes.get(duplicateEmail),
      phoneOtp: phoneCode('9800011202')
    });
    assert.equal(duplicate.status, 400);
    assert.equal(duplicate.json.error, 'An account with this mobile number already exists');
    assert.equal(duplicate.raw.includes(seekerEmail), false);
    assert.equal(await findUserByEmail(duplicateEmail), null);
    assert.equal((await findUserByEmail(seekerEmail))?.phone, '+919800011202');

    await createUser({ name: 'Legacy Phone', email: 'legacy-phone@example.com', password: 'Longpassword1!', role: 'LANDOWNER', phone: '09800013301' });
    const legacyEmail = 'legacy-clash@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: legacyEmail })).status, 200);
    const legacySms = await api('/api/auth/send-phone-otp', { phone: '+91 98000 13301' });
    assert.equal(legacySms.status, 200, legacySms.raw);
    const legacy = await api('/api/auth/register', {
      name: 'Legacy Clash',
      email: legacyEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '9800013301',
      otp: emailCodes.get(legacyEmail),
      phoneOtp: phoneCode('9800013301')
    });
    assert.equal(legacy.status, 400);
    assert.equal(legacy.json.error, 'An account with this mobile number already exists');
    assert.equal(await findUserByEmail(legacyEmail), null);

    const transferEmail = 'transfer-phone@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: transferEmail })).status, 200);
    const transferSms = await api('/api/auth/send-phone-otp', { phone: '9800014401' });
    assert.equal(transferSms.status, 200, transferSms.raw);
    const transferCode = phoneCode('9800014401');
    const transferred = await api('/api/auth/register', {
      name: 'Transfer',
      email: transferEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '9800014402',
      otp: emailCodes.get(transferEmail),
      phoneOtp: transferCode
    });
    assert.equal(transferred.status, 400);
    assert.equal(await findUserByEmail(transferEmail), null);
    const bound = await api('/api/auth/register', {
      name: 'Transfer',
      email: transferEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '+919800014401',
      otp: emailCodes.get(transferEmail),
      phoneOtp: transferCode
    });
    assert.equal(bound.status, 200, bound.raw);
    assert.equal((await findUserByEmail(transferEmail))?.phone, '+919800014401');

    const expiredEmail = 'expired-phone@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: expiredEmail })).status, 200);
    const expiredSms = await api('/api/auth/send-phone-otp', { phone: '9800015501' });
    assert.equal(expiredSms.status, 200, expiredSms.raw);
    getSqliteDb().prepare(`UPDATE otps SET expires_at = ? WHERE target = ? AND consumed_at IS NULL`).run(Date.now() - 1000, '+919800015501');
    const expiredVerify = await api('/api/auth/verify-phone-otp', { phone: '9800015501', otp: phoneCode('9800015501') });
    assert.equal(expiredVerify.status, 400);
    const expiredRegister = await api('/api/auth/register', {
      name: 'Expired',
      email: expiredEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '9800015501',
      otp: emailCodes.get(expiredEmail),
      phoneOtp: phoneCode('9800015501')
    });
    assert.equal(expiredRegister.status, 400);
    assert.equal(await findUserByEmail(expiredEmail), null);

    const racePhone = '9800016601';
    const raceSms = await api('/api/auth/send-phone-otp', { phone: racePhone });
    assert.equal(raceSms.status, 200, raceSms.raw);
    const raceCode = phoneCode(racePhone);
    const race = await Promise.all([
      api('/api/auth/verify-phone-otp', { phone: racePhone, otp: raceCode }),
      api('/api/auth/verify-phone-otp', { phone: `+91${racePhone}`, otp: raceCode })
    ]);
    assert.equal(race.filter((result) => result.status === 200).length, 1);

    const raceEmailA = 'race-phone-a@example.com';
    const raceEmailB = 'race-phone-b@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: raceEmailA })).status, 200);
    assert.equal((await api('/api/auth/send-email-otp', { email: raceEmailB })).status, 200);
    const sharedSms = await api('/api/auth/send-phone-otp', { phone: '9800017701' });
    assert.equal(sharedSms.status, 200, sharedSms.raw);
    const sharedCode = phoneCode('9800017701');
    const sharedRace = await Promise.all([
      api('/api/auth/register', { name: 'Race A', email: raceEmailA, password: 'Longpassword1!', role: 'PROPERTY_SEEKER', phone: '9800017701', otp: emailCodes.get(raceEmailA), phoneOtp: sharedCode }),
      api('/api/auth/register', { name: 'Race B', email: raceEmailB, password: 'Longpassword1!', role: 'PROPERTY_SEEKER', phone: '+91 98000 17701', otp: emailCodes.get(raceEmailB), phoneOtp: sharedCode })
    ]);
    assert.equal(sharedRace.filter((result) => result.status === 200).length, 1);
    const sharedUsers = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM users WHERE phone = ?`).get('+919800017701') as { count: number };
    assert.equal(Number(sharedUsers.count), 1);

    const privilegedEmail = 'privileged-sms@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: privilegedEmail })).status, 200);
    const privilegedSms = await api('/api/auth/send-phone-otp', { phone: '9800018801' });
    assert.equal(privilegedSms.status, 200, privilegedSms.raw);
    const privilegedCode = phoneCode('9800018801');
    for (const role of ['SUPER_ADMIN', 'DEVELOPER']) {
      const privileged = await api('/api/auth/register', {
        name: 'Privileged',
        email: privilegedEmail,
        password: 'Longpassword1!',
        role,
        phone: '9800018801',
        otp: emailCodes.get(privilegedEmail),
        phoneOtp: privilegedCode
      });
      assert.equal(privileged.status, 403);
    }
    assert.equal(await findUserByEmail(privilegedEmail), null);
    const privilegedStillValid = await api('/api/auth/verify-phone-otp', { phone: '9800018801', otp: privilegedCode });
    assert.equal(privilegedStillValid.status, 200);

    const ownerEmail = 'owner-no-sms@example.com';
    assert.equal((await api('/api/auth/send-email-otp', { email: ownerEmail })).status, 200);
    const owner = await api('/api/auth/register', {
      name: 'Land Owner',
      email: ownerEmail,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: emailCodes.get(ownerEmail)
    });
    assert.equal(owner.status, 200, owner.raw);
    assert.equal(Number((await findUserByEmail(ownerEmail))?.phone_verified), 0);

    const limitedPhone = '+919800019901';
    const limitedNational = '9800019901';
    const beforeLimit = smsRequests.length;
    const firstLimit = await api('/api/auth/send-phone-otp', { phone: limitedPhone });
    assert.equal(firstLimit.status, 200, firstLimit.raw);
    for (let attempt = 0; attempt < 7; attempt += 1) {
      releasePhoneCooldown(limitedPhone);
      const again = await api('/api/auth/send-phone-otp', { phone: limitedNational });
      assert.equal(again.status, 200, again.raw);
    }
    releasePhoneCooldown(limitedPhone);
    const capped = await api('/api/auth/send-phone-otp', { phone: limitedPhone });
    assert.equal(capped.status, 429);
    assert.equal(capped.json.error, 'Too many attempts. Wait and try again.');
    assert.equal(smsRequests.length, beforeLimit + 8);

    const attemptPhone = '9800012211';
    const attemptSms = await api('/api/auth/send-phone-otp', { phone: attemptPhone });
    assert.equal(attemptSms.status, 200, attemptSms.raw);
    const attemptCode = phoneCode(attemptPhone);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const wrong = await api('/api/auth/verify-phone-otp', { phone: attemptPhone, otp: '000000' });
      assert.equal(wrong.status, 400);
    }
    const exhausted = await api('/api/auth/verify-phone-otp', { phone: attemptPhone, otp: attemptCode });
    assert.equal(exhausted.status, 400);

    const savedPepper = process.env.OTP_HASH_SECRET;
    delete process.env.OTP_HASH_SECRET;
    const callsBeforePepper = smsRequests.length;
    const noPepper = await api('/api/auth/send-phone-otp', { phone: '9800012212' });
    process.env.OTP_HASH_SECRET = savedPepper;
    assert.equal(noPepper.status, 503);
    assert.equal(noPepper.json.code, 'OTP_NOT_CONFIGURED');
    assert.equal(noPepper.json.success, undefined);
    assert.equal(smsRequests.length, callsBeforePepper);

    const health = await api('/api/health');
    assert.equal(health.json.payments, 'NOT_CONFIGURED');
    assert.equal(health.json.configuration.sms, true);
    assert.equal(health.json.environment.FAST2SMS_API_KEY, true);
    assert.equal(health.json.environment.FAST2SMS_OTP_ID, true);
    assert.equal(health.raw.includes('test-sms-key-not-real'), false);
    assert.equal(health.raw.includes('otp-template-test'), false);
    assert.equal(logs.join('\n').includes('test-sms-key-not-real'), false);
    assert.equal(logs.join('\n').includes(sentCode), false);

    for (let extra = 0; extra < 4; extra += 1) {
      const stillInvalid = await api('/api/auth/send-phone-otp', { phone: `1234567${extra}` });
      assert.equal(stillInvalid.status, 400);
    }
    const invalidCapped = await api('/api/auth/send-phone-otp', { phone: 'not-a-phone' });
    assert.equal(invalidCapped.status, 429);
    assert.equal(invalidCapped.json.error, 'Too many attempts. Wait and try again.');
    assert.equal(smsRequests.length, callsBeforePepper);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
    delete process.env.FAST2SMS_API_KEY;
    delete process.env.FAST2SMS_OTP_ID;
    delete process.env.FAST2SMS_OTP_VARIABLES;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
