import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { LEGAL_CONSENT_VERSION, legalDocumentForPath } from '../src/shared/legal.ts';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-legal-pages-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

test('legal routes identify the public documents', () => {
  assert.equal(legalDocumentForPath('/privacy-policy')?.title, 'Privacy Policy');
  assert.equal(legalDocumentForPath('/terms-and-conditions/')?.title, 'Terms & Conditions');
  assert.equal(legalDocumentForPath('/api/auth/me'), null);
});

test('public legal pages and registration consent', async () => {
  const { initDatabase, findUserByEmail, getSqliteDb } = await import('../src/server/db.ts');
  await initDatabase();
  const originalFetch = globalThis.fetch;
  const emails: string[] = [];
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    if (String(url) === 'https://api.resend.com/emails') {
      const body = JSON.parse(String(init?.body || '{}'));
      emails.push(String(body.html || ''));
      return new Response(JSON.stringify({ id: 'email_legal' }), { status: 200, headers: { 'content-type': 'application/json' } });
    }
    return originalFetch(url, init);
  }) as typeof fetch;

  const { app } = await import('../server.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  async function getPage(path: string) {
    const response = await originalFetch(`${base}${path}`, { headers: { accept: 'text/html' } });
    const text = await response.text();
    return { status: response.status, type: response.headers.get('content-type') || '', text };
  }

  try {
    for (const path of ['/privacy-policy', '/terms-and-conditions']) {
      const page = await getPage(path);
      assert.equal(page.status, 200, path);
      assert.match(page.type, /text\/html/);
      assert.match(page.text, /Last updated: 17 October 2026/);
      assert.match(page.text, /Draft for operator and legal review/);
      assert.match(page.text, /To be confirmed by the operator/);
      assert.match(page.text, /info@propertystudio\.org/);
      assert.match(page.text, /href="\/privacy-policy"/);
      assert.match(page.text, /href="\/terms-and-conditions"/);
      assert.equal(page.text.includes('encrypted at rest'), false);
      assert.equal(page.text.includes('never shared'), false);
    }
    const privacy = await getPage('/privacy-policy');
    assert.match(privacy.text, /cannot upload/);
    assert.match(privacy.text, /WhatsApp Cloud API/);
    assert.match(privacy.text, /does not claim that a live WhatsApp message has been delivered/);
    const terms = await getPage('/terms-and-conditions');
    assert.match(terms.text, /Payments are not available in this release/);
    assert.match(terms.text, /does not set a price/);

    async function post(path: string, body: unknown) {
      const response = await originalFetch(`${base}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body)
      });
      const text = await response.text();
      return { status: response.status, json: text ? JSON.parse(text) : null };
    }

    const email = 'legal-consent@example.com';
    assert.equal((await post('/api/auth/send-email-otp', { email })).status, 200);
    const code = emails.at(-1)?.match(/>(\d{6})</)?.[1] || '';
    const missing = await post('/api/auth/register', {
      name: 'No Consent',
      email,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: code
    });
    assert.equal(missing.status, 400);
    assert.equal(missing.json.code, 'LEGAL_CONSENT_REQUIRED');
    assert.equal(await findUserByEmail(email), null);

    const stringly = await post('/api/auth/register', {
      name: 'String Consent',
      email,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: code,
      acceptLegal: 'true'
    });
    assert.equal(stringly.status, 400);
    assert.equal(stringly.json.code, 'LEGAL_CONSENT_REQUIRED');
    assert.equal(await findUserByEmail(email), null);

    const accepted = await post('/api/auth/register', {
      name: 'Accepted',
      email,
      password: 'Longpassword1!',
      role: 'LANDOWNER',
      otp: code,
      acceptLegal: true
    });
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json));
    const row = getSqliteDb().prepare('SELECT legal_consent_version, legal_consent_at, phone_verified, email_verified FROM users WHERE email = ?').get(email) as {
      legal_consent_version: string;
      legal_consent_at: string;
      phone_verified: number;
      email_verified: number;
    };
    assert.equal(row.legal_consent_version, LEGAL_CONSENT_VERSION);
    assert.match(row.legal_consent_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(Number(row.email_verified), 1);
    assert.equal(Number(row.phone_verified), 0);
    const audit = getSqliteDb().prepare(`SELECT details FROM audit_logs WHERE action = 'LEGAL_CONSENT_ACCEPTED' AND target_email = ?`).get(email) as { details: string };
    assert.match(audit.details, new RegExp(LEGAL_CONSENT_VERSION));
    assert.equal(audit.details.includes(code), false);
  } finally {
    globalThis.fetch = originalFetch;
    await new Promise<void>(resolve => (server as Server).close(() => resolve()));
  }
});
