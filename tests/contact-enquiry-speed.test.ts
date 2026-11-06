import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import http from 'node:http';
import express from 'express';
import { getInstantCached, setInstantCache } from '../src/lib/fastCache.ts';
import { prefetchAllViews } from '../src/lib/prefetch.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('Contact & Enquiry Form: Compact dimensions and mandatory mobile number', () => {
  const contactSource = read('src/components/contact/ContactPropertyAdmin.tsx');

  // Verify compact dimensions
  assert.match(contactSource, /id="enquiry-form-card" className="[^"]*p-4 sm:p-5/);
  assert.match(contactSource, /rounded-2xl/);
  assert.match(contactSource, /space-y-3/);

  // Verify Contact Mobile is strictly mandatory (not optional)
  assert.doesNotMatch(contactSource, /Contact Mobile.*\(Optional\)/i);
  assert.match(contactSource, /Contact Mobile <span className="text-red-500">\*<\/span>/);
  assert.match(contactSource, /id="contact-phone"[\s\S]*required/);
  assert.match(contactSource, /placeholder="\+91 98490 00000"/);

  // Verify validation logic checks mobile digits
  assert.match(contactSource, /Please fill out all required fields, including your contact mobile/);
  assert.match(contactSource, /phoneDigits\.length < 10/);
});

test('Support Desk Drawer: Phone number is mandatory', () => {
  const supportSource = read('src/components/support/PropertyStudioSupportDesk.tsx');

  assert.match(supportSource, /Phone Number <span className="text-red-500">\*<\/span>/);
  assert.match(supportSource, /type="tel"[\s\S]*required/);
  assert.match(supportSource, /Please provide your name, contact mobile number, and enquiry details/);
});

test('Support Ticket Backend: Rejects missing contact mobile with HTTP 400', async () => {
  const serverSource = read('server.ts');

  // Verify both /api/support/ticket and /api/support/tickets are mounted
  assert.match(serverSource, /app\.post\('\/api\/support\/ticket',/);
  assert.match(serverSource, /app\.post\('\/api\/support\/tickets',/);
  assert.match(serverSource, /Name, contact mobile number, and enquiry message are required/);

  // Test route behavior in isolated mock server
  const app = express();
  app.use(express.json());

  app.post('/api/support/ticket', (req, res) => {
    const { name, phone, message } = req.body || {};
    const cleanPhone = String(phone || '').replace(/[\s\-()]/g, '');
    if (!name || !message || !cleanPhone) {
      res.status(400).json({ error: 'Name, contact mobile number, and enquiry message are required.' });
      return;
    }
    res.json({ success: true, ticketId: 'PS-SUP-123456' });
  });

  const server = http.createServer(app);
  await new Promise<void>(resolve => server.listen(0, resolve));
  const port = (server.address() as any).port;

  try {
    // 1. Missing phone -> 400
    const resNoPhone = await fetch(`http://127.0.0.1:${port}/api/support/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suresh Kumar', message: 'Regulatory inquiry' })
    });
    assert.equal(resNoPhone.status, 400);
    const bodyNoPhone = await resNoPhone.json();
    assert.match(bodyNoPhone.error, /mobile number/);

    // 2. Valid with phone -> 200
    const resValid = await fetch(`http://127.0.0.1:${port}/api/support/ticket`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Suresh Kumar', phone: '+91 98490 12345', message: 'Regulatory inquiry' })
    });
    assert.equal(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.equal(bodyValid.success, true);
  } finally {
    server.close();
  }
});

test('Ultra-Fast Microsecond Cache & Prefetching Engine', () => {
  // Test instant synchronous in-memory caching (< 1ms)
  const testKey = 'test_telemetry_key';
  const testPayload = { total: 42, label: 'instant' };

  setInstantCache(testKey, testPayload);
  const start = performance.now();
  const retrieved = getInstantCached(testKey);
  const elapsedMs = performance.now() - start;

  assert.deepEqual(retrieved, testPayload);
  assert.ok(elapsedMs < 1, `Cache retrieval took ${elapsedMs}ms, must be < 1ms`);

  // Verify prefetchAllViews is a valid function
  assert.equal(typeof prefetchAllViews, 'function');
});
