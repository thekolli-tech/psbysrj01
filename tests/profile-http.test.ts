import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-profile-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

const { initDatabase, createUser, findUserById, updateUser } = await import('../src/server/db.ts');
await initDatabase();

const password = 'ProfilePass123!';
const seekerPhone = '+919000011122';
const seeker = await createUser({
  name: 'Profile Seeker',
  email: 'profile.seeker@example.com',
  phone: seekerPhone,
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
await createUser({
  name: 'Profile Admin',
  email: 'profile.admin@example.com',
  role: 'SUPER_ADMIN',
  password,
  isVerified: true
});

const { app } = await import('../server.ts');
const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const session = response.headers.getSetCookie?.().map(value => value.split(';')[0]).find(value => value.startsWith('ps_session='));
  return { status: response.status, json, cookie: session || cookie || '' };
}

async function login(email: string): Promise<string> {
  const result = await api('POST', '/api/auth/login', { email, password });
  assert.equal(result.status, 200, JSON.stringify(result.json));
  return result.cookie;
}

test('town/city and profession save without changing role, registration, or private community data', async (t) => {
  t.after(() => new Promise<void>(resolve => (server as Server).close(() => resolve())));

  const before = await findUserById(seeker.id);
  assert.equal(before?.town_city ?? null, null);
  assert.equal(before?.profession ?? null, null);
  assert.equal(before?.role, 'PROPERTY_SEEKER');

  const anonymous = await api('PATCH', '/api/me/profile', { townCity: 'Hyderabad', profession: 'Architect' });
  assert.equal(anonymous.status, 401);

  const registration = await api('POST', '/api/auth/register', {
    name: 'Still Needs OTP',
    email: 'otp.required@example.com',
    password,
    role: 'PROPERTY_SEEKER',
    phone: '+919000011199',
    townCity: 'Hyderabad',
    profession: 'Architect'
  });
  assert.equal(registration.status, 400);
  assert.match(registration.json.error, /OTP/);

  const seekerCookie = await login('profile.seeker@example.com');
  const invalid = await api('PATCH', '/api/me/profile', { townCity: 'x'.repeat(81) }, seekerCookie);
  assert.equal(invalid.status, 400);

  const saved = await api('PATCH', '/api/me/profile', {
    townCity: '  Hyderabad  ',
    profession: 'Architect',
    role: 'DEVELOPER'
  }, seekerCookie);
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
  assert.equal(saved.json.user.townCity, 'Hyderabad');
  assert.equal(saved.json.user.profession, 'Architect');
  assert.equal(saved.json.user.role, 'PROPERTY_SEEKER');
  assert.equal(saved.json.user.password_hash, undefined);

  const professionOnly = await api('PATCH', '/api/me/profile', { profession: 'Planner' }, seekerCookie);
  assert.equal(professionOnly.status, 200);
  assert.equal(professionOnly.json.user.profession, 'Planner');
  assert.equal(professionOnly.json.user.townCity, 'Hyderabad');

  const kept = await updateUser(seeker.id, { organization: 'Kept Organization' });
  assert.equal(kept?.organization, 'Kept Organization');
  assert.equal(kept?.town_city, 'Hyderabad');
  assert.equal(kept?.profession, 'Planner');
  assert.equal(kept?.role, 'PROPERTY_SEEKER');

  const post = await api('POST', '/api/community/posts', {
    title: 'Corridor question',
    content: 'What is the current approval status?',
    topic: 'Legal & RERA'
  }, seekerCookie);
  assert.equal(post.status, 200, JSON.stringify(post.json));

  const adminCookie = await login('profile.admin@example.com');
  const approved = await api('PATCH', `/api/admin/posts/${post.json.post.id}/moderation`, { status: 'APPROVED' }, adminCookie);
  assert.equal(approved.status, 200, JSON.stringify(approved.json));

  // Task 7: Guest access must return 401; authenticated member can read posts
  const guestPosts = await api('GET', '/api/community/posts');
  assert.equal(guestPosts.status, 401);
  const memberPosts = await api('GET', '/api/community/posts', undefined, seekerCookie);
  assert.equal(memberPosts.status, 200);
  const visible = memberPosts.json.posts.find((item: any) => item.id === post.json.post.id);
  assert.equal(visible.authorProfession, 'Planner');
  assert.equal(visible.authorRole, 'PROPERTY_SEEKER');
  const serialized = JSON.stringify(visible);
  assert.equal(serialized.includes(seekerPhone), false);
  assert.equal(serialized.includes('Hyderabad'), false);
  assert.equal(serialized.includes('townCity'), false);
  assert.equal(serialized.includes('town_city'), false);
});
