import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { readApiResponse } from '../src/lib/apiResponse.ts';
import { classifyDatabaseStartupFailure, expressPathForHostedRequest } from '../src/server/hostedApi.ts';

test('hosted API paths keep the Express /api prefix', () => {
  assert.equal(expressPathForHostedRequest('/auth/send-email-otp'), '/api/auth/send-email-otp');
  assert.equal(expressPathForHostedRequest('/api/auth/send-email-otp'), '/api/auth/send-email-otp');
  assert.equal(expressPathForHostedRequest('/api/health?ready=1'), '/api/health?ready=1');
  assert.equal(expressPathForHostedRequest('/auth/register?role=seeker'), '/api/auth/register?role=seeker');
  assert.equal(
    expressPathForHostedRequest('/api/index?__ps_path=auth/send-email-otp'),
    '/api/auth/send-email-otp'
  );
  assert.equal(
    expressPathForHostedRequest('/api/index?__ps_path=auth/send-email-otp&ready=1'),
    '/api/auth/send-email-otp?ready=1'
  );
  assert.equal(expressPathForHostedRequest('/api/health?__ps_path=auth/register'), '/api/health?__ps_path=auth/register');
  assert.equal(expressPathForHostedRequest('/api/index?__ps_path=../server.ts'), '/api');
});

test('plain-text Vercel 404 becomes a safe registration error', async () => {
  const response = new Response('The page could not be found\n\nNOT_FOUND\n', {
    status: 404,
    headers: { 'content-type': 'text/plain; charset=utf-8' }
  });
  const parsed = await readApiResponse(response);
  assert.equal(parsed.ok, false);
  assert.equal(parsed.data, null);
  assert.equal(parsed.error.includes('The page could not be found'), false);
  assert.match(parsed.error, /No account was created/);
});

test('Vercel JSON 404 object is not shown as a token error', async () => {
  const response = new Response(JSON.stringify({ error: { code: '404', message: 'The page could not be found' } }), {
    status: 404,
    headers: { 'content-type': 'application/json' }
  });
  const parsed = await readApiResponse(response);
  assert.equal(parsed.error.includes('[object Object]'), false);
  assert.equal(parsed.error.includes('Unexpected token'), false);
  assert.match(parsed.error, /No account was created/);
});

test('startup failures keep a safe public code and a redacted log detail', () => {
  const missing = classifyDatabaseStartupFailure(new Error('Production startup requires DATABASE_URL. Refusing to start on SQLite.'));
  assert.equal(missing.code, 'DATABASE_NOT_CONFIGURED');
  assert.match(missing.error, /No account was created/);

  const offline = classifyDatabaseStartupFailure(new Error('Authoritative PostgreSQL is unavailable (connect ECONNREFUSED postgresql://app:s3cret@ep-example.neon.tech/neondb). Startup refused.'));
  assert.equal(offline.code, 'DATABASE_UNREACHABLE');
  assert.equal(offline.logDetail.includes('s3cret'), false);
  assert.match(offline.logDetail, /postgresql:\/\/\[redacted\]/);

  const schema = classifyDatabaseStartupFailure(new Error('PostgreSQL schema is not ready. Missing: otps.'));
  assert.equal(schema.code, 'SCHEMA_NOT_READY');
  assert.equal(schema.error.includes('otps'), false);
});

test('application JSON 503 is shown instead of the host 404 message', async () => {
  const response = new Response(JSON.stringify({
    error: 'Registration is not configured for this deployment. No account was created.',
    code: 'DATABASE_NOT_CONFIGURED'
  }), { status: 503, headers: { 'content-type': 'application/json' } });
  const parsed = await readApiResponse(response);
  assert.equal(parsed.error, 'Registration is not configured for this deployment. No account was created.');
  assert.equal(parsed.error.includes('not available on this site yet'), false);
});

test('Vercel deployment wires /api to the Express server bundle', () => {
  const config = JSON.parse(fs.readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    outputDirectory?: string;
    rewrites?: unknown;
    functions?: Record<string, { includeFiles?: string }>;
  };
  const handler = fs.readFileSync(new URL('../api/index.js', import.meta.url), 'utf8');
  const hosted = fs.readFileSync(new URL('../src/server/hostedApi.ts', import.meta.url), 'utf8');
  const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { engines?: { node?: string } };
  const nodeVersion = fs.readFileSync(new URL('../.node-version', import.meta.url), 'utf8').trim();
  assert.equal(fs.existsSync(new URL('../api/[...path].js', import.meta.url)), false);
  assert.equal(config.outputDirectory, 'dist');
  assert.deepEqual(config.rewrites, [
    { source: '/api/:path*', destination: '/api/index?__ps_path=:path*' },
    { source: '/privacy-policy', destination: '/index.html' },
    { source: '/terms-and-conditions', destination: '/index.html' }
  ]);
  assert.match(config.functions?.['api/**/*.js']?.includeFiles || '', /dist-server/);
  assert.match(handler, /initDatabase/);
  assert.match(handler, /dist-server\/index\.mjs/);
  assert.match(handler, /expressPathForHostedRequest/);
  assert.match(handler, /createHostedApiHandler/);
  assert.match(hosted, /The registration service is unavailable\. No account was created\./);
  assert.match(hosted, /application\/json/);
  assert.equal(pkg.engines?.node, '22.x');
  assert.equal(nodeVersion, '22');
});
