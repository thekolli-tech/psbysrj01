import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-visitor-public-${process.pid}.db`;
process.env.OTP_HASH_SECRET = 'test-pepper-not-used-in-production';
process.env.RESEND_API_KEY = 're_test_mock_key';
process.env.EMAIL_FROM = 'Property Studio <otp@propertystudio.org>';

const capturedOtpCodes = new Map<string, string>();
const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  if (String(url) === 'https://api.resend.com/emails') {
    const body = JSON.parse(String(init?.body || '{}'));
    const code = String(body.html).match(/>(\d{6})</)?.[1] || '';
    const to = String(body.to?.[0] || '').toLowerCase();
    capturedOtpCodes.set(to, code);
    return new Response(JSON.stringify({ id: 'email_mock_signup' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return originalFetch(url, init);
}) as typeof fetch;

const { PLATFORM_ROLES, STAKEHOLDER_REVIEW_ROLES } = await import('../src/shared/platformRoles.ts');
const { initDatabase, findUserByEmail } = await import('../src/server/db.ts');
await initDatabase();
const { app } = await import('../server.ts');

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

test.after(() => {
  globalThis.fetch = originalFetch;
  return new Promise<void>(resolve => (server as Server).close(() => resolve()));
});

async function api(method: string, endpoint: string, body?: any, cookie?: string) {
  const url = `${base}${endpoint}`;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', accept: 'application/json' };
  if (cookie) headers.cookie = cookie;
  const res = await originalFetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json: any = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text };
}

test('1. Role labels in platformRoles.ts have NO explanations (only clean role titles)', () => {
  assert.equal(PLATFORM_ROLES.length, 14, 'Must have exactly 14 platform roles');
  
  PLATFORM_ROLES.forEach((role) => {
    assert.ok(
      !role.fullLabel.includes('–'),
      `Role fullLabel must not contain '–' explanation suffix: ${role.fullLabel}`
    );
    assert.equal(
      role.fullLabel,
      `${role.number}. ${role.title}`,
      `Role label must follow format '<number>. <title>': ${role.fullLabel}`
    );
  });

  // Verify specific roles match the uploaded screenshot requirements without explanation
  assert.equal(PLATFORM_ROLES[0].fullLabel, '1. Property Seeker');
  assert.equal(PLATFORM_ROLES[1].fullLabel, '2. RERA Certified Individual Realter/CP/Agent');
  assert.equal(PLATFORM_ROLES[4].fullLabel, '5. Working Sales Professional');
  assert.equal(PLATFORM_ROLES[5].fullLabel, '6. Reseller');
  assert.equal(PLATFORM_ROLES[6].fullLabel, '7. Trader / Investor');
  assert.equal(PLATFORM_ROLES[7].fullLabel, '8. Land Owner');
  assert.equal(PLATFORM_ROLES[8].fullLabel, '9. Developer');
  assert.equal(PLATFORM_ROLES[9].fullLabel, '10. Vendor');

  STAKEHOLDER_REVIEW_ROLES.forEach((title) => {
    assert.ok(
      !title.includes('–'),
      `Review role title must not contain '–' explanation suffix: ${title}`
    );
  });
});

test('2. Google sign-in is completely removed from LoginModal and PublicRedditHome', () => {
  const loginModalCode = fs.readFileSync(path.resolve('src/components/common/LoginModal.tsx'), 'utf-8');
  assert.ok(
    !loginModalCode.includes('Continue with Google'),
    'LoginModal must not contain Continue with Google button'
  );
  assert.ok(
    !loginModalCode.includes('or continue with'),
    'LoginModal must not contain social divider'
  );

  const publicHomeCode = fs.readFileSync(path.resolve('src/components/home/PublicRedditHome.tsx'), 'utf-8');
  assert.ok(
    !publicHomeCode.includes('Continue with Google'),
    'PublicRedditHome must not contain Continue with Google button'
  );
});

test('3. Public data access: Unauthenticated visitors can browse posts, discussions, and comments without login', async () => {
  // GET /api/community/posts without any auth headers or cookies
  const postsRes = await api('GET', '/api/community/posts');
  assert.equal(postsRes.status, 200, 'GET /api/community/posts must be publicly accessible to visitors');
  assert.ok(Array.isArray(postsRes.json.posts), 'Must return an array of posts');

  if (postsRes.json.posts.length > 0) {
    const samplePostId = postsRes.json.posts[0].id;

    // GET /api/community/posts/:id without login
    const singlePostRes = await api('GET', `/api/community/posts/${samplePostId}`);
    assert.equal(singlePostRes.status, 200, 'GET /api/community/posts/:id must be publicly accessible to visitors');
    assert.equal(singlePostRes.json.id, samplePostId);

    // GET /api/community/posts/:id/comments without login
    const commentsRes = await api('GET', `/api/community/posts/${samplePostId}/comments`);
    assert.equal(commentsRes.status, 200, 'GET /api/community/posts/:id/comments must be publicly accessible to visitors');
    assert.ok(Array.isArray(commentsRes.json.comments), 'Must return comments array to visitors');
  }

  // GET /api/communities without login
  const commRes = await api('GET', '/api/communities');
  assert.equal(commRes.status, 200, 'GET /api/communities must be accessible to visitors');
});

test('4. Gated interactive operations: Visitors CANNOT post, comment, react, or join without login', async () => {
  // Attempt to create post without login
  const createPostRes = await api('POST', '/api/community/posts', {
    title: 'Unauthenticated Post',
    content: 'Should fail without login'
  });
  assert.equal(createPostRes.status, 401, 'Creating a post must require login');

  // Attempt to comment without login
  const commentRes = await api('POST', '/api/community/posts/sample-id/comments', {
    content: 'Unauthenticated comment'
  });
  assert.equal(commentRes.status, 401, 'Commenting must require login');

  // Attempt to like without login
  const likeRes = await api('POST', '/api/community/posts/sample-id/like');
  assert.equal(likeRes.status, 401, 'Liking must require login');

  // Attempt to vote without login
  const voteRes = await api('POST', '/api/community/posts/sample-id/vote', { voteType: 'UP' });
  assert.equal(voteRes.status, 401, 'Voting must require login');

  // Attempt to join community without login
  const joinRes = await api('POST', '/api/communities/sample-comm/join');
  assert.equal(joinRes.status, 401, 'Joining community must require login');
});

test('5. Property Seeker registration uses Email OTP verification (mobile number NOT required)', async () => {
  const seekerEmail = `seeker-${Date.now()}@testseeker.org`;

  // Send Email OTP
  const sendEmailRes = await api('POST', '/api/auth/send-email-otp', { email: seekerEmail });
  assert.equal(sendEmailRes.status, 200, 'Send Email OTP should succeed');
  assert.equal(sendEmailRes.json.success, true);

  const emailOtp = capturedOtpCodes.get(seekerEmail.toLowerCase());
  assert.ok(emailOtp && emailOtp.length === 6, 'Mock should capture the 6-digit email OTP');

  // Register Property Seeker without mobile number (only email OTP)
  const regSeekerRes = await api('POST', '/api/auth/register', {
    name: 'Rohit Seeker',
    email: seekerEmail,
    password: 'SeekerPassword123!',
    role: 'PROPERTY_SEEKER',
    profession: 'Software Engineer',
    otp: emailOtp
  });

  assert.equal(regSeekerRes.status, 200, `Property Seeker registration should succeed: ${JSON.stringify(regSeekerRes.json)}`);
  assert.equal(regSeekerRes.json.success, true);
  assert.equal(regSeekerRes.json.user.role, 'PROPERTY_SEEKER');
  assert.equal(regSeekerRes.json.user.isVerified, true);

  // Property Seeker without mobile OTP must NOT be blocked by requireAuth
  const userRecord = await findUserByEmail(seekerEmail);
  assert.ok(userRecord, 'User should exist in database');
});

test('6. Non-Property-Seeker professional roles REQUIRE mobile phone OTP verification', async () => {
  const agentEmail = `agent-${Date.now()}@testrera.org`;

  // Attempt to register a professional role (RERA_AGENT) with only email OTP (no mobile OTP)
  const failRegRes = await api('POST', '/api/auth/register', {
    name: 'Vijay RERA Agent',
    email: agentEmail,
    password: 'AgentPassword123!',
    role: 'RERA_AGENT',
    profession: 'Channel Partner',
    otp: '123456'
  });

  assert.equal(failRegRes.status, 400, 'Professional registration must reject without valid mobile number');
  assert.match(failRegRes.json.error, /mobile number is required/i);

  // Attempt with mobile number but no phoneOtp
  const failPhoneOtpRes = await api('POST', '/api/auth/register', {
    name: 'Vijay RERA Agent',
    email: agentEmail,
    password: 'AgentPassword123!',
    role: 'RERA_AGENT',
    phone: '+919849012345',
    profession: 'Channel Partner',
    otp: '123456'
  });

  assert.equal(failPhoneOtpRes.status, 400, 'Professional registration must require phoneOtp');
  assert.match(failPhoneOtpRes.json.error, /Mobile number OTP verification is required/i);
});
