import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

/**
 * Local SQLite and a mocked email provider.
 * These cases do not open Neon and do not send real email.
 */

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-registration-concurrency-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
delete process.env.RESEND_FROM;

const { initDatabase, findUserByEmail, getSqliteDb, isTargetVerified } = await import('../src/server/db.ts');
await initDatabase();
const { app } = await import('../server.ts');

const codes = new Map<string, string>();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const body = JSON.parse(String(init?.body || '{}'));
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    codes.set(String(body.to?.[0] || ''), code);
    return new Response(JSON.stringify({ id: 'email_mock_concurrent' }), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return originalFetch(url, init);
}) as typeof fetch;

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;

async function api(path: string, body?: unknown) {
  const response = await originalFetch(`http://127.0.0.1:${port}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
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

test('twenty independent registrations, single-use OTP claims, and no token exposure', async (t) => {
  t.after(() => new Promise<void>((resolve) => server.close(() => resolve())));
  const logs: string[] = [];
  const originalLog = console.log;
  const originalWarn = console.warn;
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(' '));
  console.warn = (...args: unknown[]) => logs.push(args.map(String).join(' '));

  try {
    const emails = Array.from({ length: 20 }, (_value, index) => `flow-${index}@example.com`);
    const sent = await Promise.all(emails.map((email) => api('/api/auth/send-email-otp', { email })));
    assert.equal(sent.every((result) => result.status === 200 && result.json.success === true && result.json.otp === undefined), true);

    const cross = await api('/api/auth/verify-email-otp', { email: emails[1], otp: codes.get(emails[0]) });
    assert.equal(cross.status, 400);

    const grantEmail = 'grant-removed@example.com';
    const grantSent = await api('/api/auth/send-email-otp', { email: grantEmail });
    assert.equal(grantSent.status, 200, grantSent.raw);
    const grantVerified = await api('/api/auth/verify-email-otp', { email: grantEmail, otp: codes.get(grantEmail) });
    assert.equal(grantVerified.status, 200);
    assert.equal(await isTargetVerified(grantEmail, 'EMAIL_VERIFICATION'), false);
    getSqliteDb().prepare(`DELETE FROM otps WHERE target = ? AND type = 'REGISTRATION_GRANT'`).run(grantEmail);
    const consumedRowAlone = await api('/api/auth/register', {
      name: 'Consumed Row',
      email: grantEmail,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: codes.get(grantEmail)
    });
    assert.equal(consumedRowAlone.status, 400);
    assert.equal(await findUserByEmail(grantEmail), null);

    const raceEmail = 'same-code-race@example.com';
    const raceSent = await api('/api/auth/send-email-otp', { email: raceEmail });
    assert.equal(raceSent.status, 200, raceSent.raw);
    const sameCodeRaces = await Promise.all([
      api('/api/auth/verify-email-otp', { email: raceEmail, otp: codes.get(raceEmail) }),
      api('/api/auth/verify-email-otp', { email: raceEmail, otp: codes.get(raceEmail) })
    ]);
    assert.equal(sameCodeRaces.filter((result) => result.status === 200).length, 1);

    const parallelEmail = 'parallel-register@example.com';
    const parallelSent = await api('/api/auth/send-email-otp', { email: parallelEmail });
    assert.equal(parallelSent.status, 200, parallelSent.raw);
    const parallelCode = codes.get(parallelEmail);
    const parallelRegisters = await Promise.all([0, 1].map(() => api('/api/auth/register', {
      name: 'Parallel',
      email: `Parallel-Register@example.com`,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: parallelCode
    })));
    assert.equal(parallelRegisters.filter((result) => result.status === 200).length, 1);
    assert.equal(parallelRegisters.every((result) => result.json?.token === undefined), true);
    assert.equal(parallelRegisters.every((result) => !result.raw.includes(String(parallelCode))), true);
    const parallelUsers = getSqliteDb().prepare(`SELECT COUNT(*) AS count FROM users WHERE email = ?`).get(parallelEmail) as { count: number };
    assert.equal(Number(parallelUsers.count), 1);

    const registered = await Promise.all(emails.map((email, index) => api('/api/auth/register', {
      name: `Flow ${index}`,
      email,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: codes.get(email)
    })));
    assert.equal(registered.filter((result) => result.status === 200).length, 20);
    const distinctUsers = getSqliteDb().prepare(`SELECT COUNT(DISTINCT email) AS count FROM users WHERE email LIKE 'flow-%@example.com'`).get() as { count: number };
    assert.equal(Number(distinctUsers.count), 20);

    const cooldownEmail = 'cooldown-parallel@example.com';
    const cooldown = await Promise.all([
      api('/api/auth/send-email-otp', { email: cooldownEmail }),
      api('/api/auth/send-email-otp', { email: cooldownEmail })
    ]);
    assert.equal(cooldown.filter((result) => result.status === 200).length, 1);
    assert.equal(cooldown.filter((result) => result.status === 429).length, 1);

    const wrong = await api('/api/auth/verify-email-otp', { email: cooldownEmail, otp: '000000' });
    assert.equal(wrong.status, 400);
    const expiredEmail = 'expired-parallel@example.com';
    const expiredSent = await api('/api/auth/send-email-otp', { email: expiredEmail });
    assert.equal(expiredSent.status, 200);
    getSqliteDb().prepare(`UPDATE otps SET expires_at = ? WHERE target = ? AND consumed_at IS NULL`).run(Date.now() - 1000, expiredEmail);
    const expired = await api('/api/auth/verify-email-otp', { email: expiredEmail, otp: codes.get(expiredEmail) });
    assert.equal(expired.status, 400);

    const previousFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('no', { status: 422 })) as typeof fetch;
    const rejected = await api('/api/auth/send-email-otp', { email: 'provider-rejected@example.com' });
    globalThis.fetch = previousFetch;
    assert.equal(rejected.status, 502);
    assert.equal(rejected.json.code, 'EMAIL_DELIVERY_FAILED');
    assert.equal(rejected.json.success, undefined);
    assert.equal(await findUserByEmail('provider-rejected@example.com'), null);

    const seekerEmail = 'seeker-email-only-concurrent@example.com';
    const seekerSent = await api('/api/auth/send-email-otp', { email: seekerEmail });
    assert.equal(seekerSent.status, 200, seekerSent.raw);
    const seekerReg = await api('/api/auth/register', {
      name: 'Seeker',
      email: seekerEmail,
      password: 'Longpassword1!',
      role: 'PROPERTY_SEEKER',
      phone: '+919800011122',
      otp: codes.get(seekerEmail)
    });
    assert.equal(seekerReg.status, 200, seekerReg.raw);
    assert.equal(seekerReg.json.success, true);
    assert.equal((await findUserByEmail(seekerEmail))?.phone, '+919800011122');

    const privileged = await api('/api/auth/register', {
      name: 'Admin',
      email: 'privileged@example.com',
      password: 'Longpassword1!',
      role: 'SUPER_ADMIN',
      otp: '000000'
    });
    assert.equal(privileged.status, 403);
    assert.equal(await findUserByEmail('privileged@example.com'), null);

    const joined = logs.join('\n');
    for (const code of codes.values()) assert.equal(joined.includes(code), false);
    assert.equal(joined.includes('re_test_mock_key'), false);
  } finally {
    console.log = originalLog;
    console.warn = originalWarn;
    globalThis.fetch = originalFetch;
  }
});
