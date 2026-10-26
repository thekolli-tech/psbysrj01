import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  communityPostShareUrl,
  readCommunitySearch,
  readCommunityVote
} from '../src/shared/communityEngagement.ts';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');

test('community search, votes, and share links stay public and validated', () => {
  assert.deepEqual(readCommunitySearch('  canal  '), { q: 'canal' });
  assert.equal('error' in readCommunitySearch('<b>canal</b>'), true);
  assert.equal('error' in readCommunitySearch('x'.repeat(81)), true);
  assert.equal(readCommunityVote(1), 1);
  assert.equal(readCommunityVote(-1), -1);
  const invalidVote = readCommunityVote(2);
  assert.equal(typeof invalidVote === 'object' && invalidVote.error.length > 0, true);
  const url = communityPostShareUrl('https://psbysrj01.vercel.app/', 'post_abc_123');
  assert.equal(url, 'https://psbysrj01.vercel.app/?view=community&post=post_abc_123');
  assert.equal(url.includes('phone'), false);
  assert.equal(url.includes('town'), false);
  assert.equal(communityPostShareUrl('https://psbysrj01.vercel.app', 'bad id'), '');
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS community_post_votes/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS community_post_follows/);
  const forum = readFileSync(join(root, 'src/components/community/CommunityForum.tsx'), 'utf8');
  assert.equal(forum.includes('score: 10'), false);
  assert.match(forum, /\/vote/);
  assert.match(forum, /\/follow/);
});

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-community-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

const { initDatabase, createUser, findUserById, updateUserProfileFields } = await import('../src/server/db.ts');
await initDatabase();

const password = 'CommunityPass123!';
const seekerPhone = '+919000033344';
const seeker = await createUser({
  name: 'Community Seeker',
  email: 'community.seeker@example.com',
  phone: seekerPhone,
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
await updateUserProfileFields(seeker.id, { townCity: 'Hyderabad', profession: 'Architect' });
await createUser({
  name: 'Community Peer',
  email: 'community.peer@example.com',
  phone: '+919000033355',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
await createUser({
  name: 'Community Admin',
  email: 'community.admin@example.com',
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

test('persisted votes, follows, and question search keep roles and private fields unchanged', async (t) => {
  t.after(() => new Promise<void>(resolve => (server as Server).close(() => resolve())));

  const seekerCookie = await login('community.seeker@example.com');
  const peerCookie = await login('community.peer@example.com');
  const adminCookie = await login('community.admin@example.com');

  const created = await api('POST', '/api/community/posts', {
    title: 'Canal lining question',
    content: 'What is the current approval status?',
    topic: 'Legal & RERA'
  }, seekerCookie);
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const postId = created.json.post.id;

  const pending = await api('POST', '/api/community/posts', {
    title: 'Hidden pending question',
    content: 'This stays private until approval.',
    topic: 'Legal & RERA'
  }, seekerCookie);
  assert.equal(pending.status, 200, JSON.stringify(pending.json));

  const anonymousVote = await api('POST', `/api/community/posts/${postId}/vote`, { vote: 1 });
  assert.equal(anonymousVote.status, 401);
  const anonymousFollow = await api('POST', `/api/community/posts/${postId}/follow`);
  assert.equal(anonymousFollow.status, 401);

  const approved = await api('PATCH', `/api/admin/posts/${postId}/moderation`, { status: 'APPROVED' }, adminCookie);
  assert.equal(approved.status, 200, JSON.stringify(approved.json));

  assert.equal((await api('POST', `/api/community/posts/${postId}/vote`, { vote: 2, agreeCount: 99 }, seekerCookie)).status, 400);
  assert.equal((await api('POST', '/api/community/posts/bad!id/vote', { vote: 1 }, seekerCookie)).status, 400);
  assert.equal((await api('POST', '/api/community/posts/post_missing/vote', { vote: 1 }, seekerCookie)).status, 404);

  const agreed = await api('POST', `/api/community/posts/${postId}/vote`, { vote: 1, agreeCount: 50 }, seekerCookie);
  assert.equal(agreed.status, 200, JSON.stringify(agreed.json));
  assert.equal(agreed.json.agreeCount, 1);
  assert.equal(agreed.json.disagreeCount, 0);
  assert.equal(agreed.json.userVote, 1);

  const removed = await api('POST', `/api/community/posts/${postId}/vote`, { vote: 1 }, seekerCookie);
  assert.equal(removed.json.userVote, 0);
  assert.equal(removed.json.agreeCount, 0);

  const disagreed = await api('POST', `/api/community/posts/${postId}/vote`, { vote: -1 }, seekerCookie);
  assert.equal(disagreed.json.userVote, -1);
  assert.equal(disagreed.json.disagreeCount, 1);
  assert.equal(disagreed.json.agreeCount, 0);

  const peerAgreed = await api('POST', `/api/community/posts/${postId}/vote`, { vote: 1 }, peerCookie);
  assert.equal(peerAgreed.json.agreeCount, 1);
  assert.equal(peerAgreed.json.disagreeCount, 1);
  assert.equal(peerAgreed.json.userVote, 1);

  const hiddenVote = await api('POST', `/api/community/posts/${pending.json.post.id}/vote`, { vote: 1 }, peerCookie);
  assert.equal(hiddenVote.status, 404);

  const followed = await api('POST', `/api/community/posts/${postId}/follow`, { userId: 'someone-else' }, seekerCookie);
  assert.equal(followed.status, 200, JSON.stringify(followed.json));
  assert.equal(followed.json.following, true);
  assert.equal(followed.json.followerCount, 1);
  const unfollowed = await api('POST', `/api/community/posts/${postId}/follow`, undefined, seekerCookie);
  assert.equal(unfollowed.json.following, false);
  assert.equal(unfollowed.json.followerCount, 0);
  await api('POST', `/api/community/posts/${postId}/follow`, undefined, seekerCookie);

  const account = await findUserById(seeker.id);
  assert.equal(account?.role, 'PROPERTY_SEEKER');
  assert.equal(account?.profession, 'Architect');
  assert.equal(account?.town_city, 'Hyderabad');

  const publicPosts = await api('GET', '/api/community/posts');
  const visible = publicPosts.json.posts.find((item: any) => item.id === postId);
  assert.equal(visible.agreeCount, 1);
  assert.equal(visible.disagreeCount, 1);
  assert.equal(visible.userVote, 0);
  assert.equal(visible.followerCount, 1);
  assert.equal(visible.following, false);
  assert.equal(visible.authorProfession, 'Architect');
  const serialized = JSON.stringify(visible);
  assert.equal(serialized.includes(seekerPhone), false);
  assert.equal(serialized.includes('Hyderabad'), false);
  assert.equal(serialized.includes('townCity'), false);
  assert.equal(publicPosts.json.posts.some((item: any) => item.id === pending.json.post.id), false);

  const found = await api('GET', '/api/community/posts?q=canal%20lining');
  assert.equal(found.status, 200);
  assert.equal(found.json.posts.some((item: any) => item.id === postId), true);
  const missed = await api('GET', '/api/community/posts?q=' + encodeURIComponent("%' OR title LIKE '%"));
  assert.equal(missed.status, 200);
  assert.equal(missed.json.posts.some((item: any) => item.id === postId), false);
  assert.equal((await api('GET', '/api/community/posts?q=' + 'x'.repeat(81))).status, 400);
  assert.equal((await api('GET', '/api/community/posts?q=' + encodeURIComponent('<b>canal</b>'))).status, 400);

  const mine = await api('GET', '/api/community/posts', undefined, seekerCookie);
  const own = mine.json.posts.find((item: any) => item.id === postId);
  assert.equal(own.userVote, -1);
  assert.equal(own.following, true);
});
