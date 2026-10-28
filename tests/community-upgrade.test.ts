import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { POSTGRES_ADDITIVE_SQL, SQLITE_TABLE_SQL, SQLITE_COLUMN_STATEMENTS, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

test('schema definitions include all community upgrade tables and columns non-destructively', () => {
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS user_follows/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS community_bookmarks/);
  assert.match(POSTGRES_ADDITIVE_SQL, /interests\s+TEXT/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /company\s+TEXT/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /post_type\s+(VARCHAR\(32\)|TEXT)/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /poll_options\s+TEXT/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /ama_host_name\s+(VARCHAR\(255\)|TEXT)/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /is_ama_answer\s+(SMALLINT|INTEGER)/i);

  assert.match(SQLITE_TABLE_SQL, /CREATE TABLE IF NOT EXISTS user_follows/);
  assert.match(SQLITE_TABLE_SQL, /CREATE TABLE IF NOT EXISTS community_bookmarks/);
  const columnStatements = SQLITE_COLUMN_STATEMENTS.join(' ');
  assert.match(columnStatements, /ADD COLUMN interests TEXT/i);
  assert.match(columnStatements, /ADD COLUMN company TEXT/i);
  assert.match(columnStatements, /ADD COLUMN post_type TEXT/i);
  assert.match(columnStatements, /ADD COLUMN is_ama_answer INTEGER/i);
});

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-comm-upg-${process.pid}.db`;

const { initDatabase, createUser, createPost, createComment } = await import('../src/server/db.ts');
await initDatabase();

const password = 'UpgradePass123!';
const userA = await createUser({
  name: 'Community Pioneer',
  email: `pioneer_${process.pid}@example.com`,
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const userB = await createUser({
  name: 'Community Expert',
  email: `expert_${process.pid}@example.com`,
  role: 'AGENT',
  password,
  isVerified: true
});

const adminUser = await createUser({
  name: 'Community Admin',
  email: `admin_${process.pid}@example.com`,
  role: 'SUPER_ADMIN',
  password,
  isVerified: true
});

const { app } = await import('../server.ts');
const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

const login = async (email: string) => {
  const res = await fetch(`${base}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  const cookies = res.headers.getSetCookie?.() || [];
  const sessionCookie = cookies.map(c => c.split(';')[0]).find(c => c.startsWith('ps_session=')) || '';
  return { data, cookie: sessionCookie };
};

test('Community upgrade: duplicate question checking endpoint', async () => {
  // Create an initial question
  const post = await createPost({
    authorId: userA.id,
    authorName: userA.name,
    authorRole: 'PROPERTY_SEEKER',
    title: 'Is RERA registration mandatory for Kokapet plots before launch?',
    content: 'Looking for legal clarity on Kokapet layouts without registration.',
    topic: 'Legal & RERA',
    postType: 'QUESTION',
    visibility: 'PUBLIC'
  });
  assert.ok(post.id);

  // Check duplicate with matching keywords
  const matchRes = await fetch(`${base}/api/community/check-duplicate?title=${encodeURIComponent('Kokapet plots RERA registration')}`);
  const matchData = await matchRes.json();
  assert.equal(matchRes.status, 200);
  assert.equal(matchData.exists, true);
  assert.ok(matchData.matches.length > 0);
  assert.equal(matchData.matches[0].id, post.id);

  // Check duplicate with completely different title
  const diffRes = await fetch(`${base}/api/community/check-duplicate?title=${encodeURIComponent('Completely unrelated interior paint ideas')}`);
  const diffData = await diffRes.json();
  assert.equal(diffRes.status, 200);
  assert.equal(diffData.exists, false);
});

test('Community upgrade: user public profile and follow/unfollow lifecycle', async () => {
  const { cookie: cookieA } = await login(userA.email);
  const { cookie: cookieB } = await login(userB.email);

  // User B updates profile with profession, company, interests
  const updateRes = await fetch(`${base}/api/me/profile`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({
      profession: 'Real Estate Agent',
      company: 'Hyderabad Realty Advisory',
      interests: 'RERA Compliance, Kokapet & Neopolis, Luxury Villas'
    })
  });
  assert.equal(updateRes.status, 200);

  // User A gets public profile of User B before following
  const profRes1 = await fetch(`${base}/api/users/${userB.id}/profile`, {
    headers: { Cookie: cookieA }
  });
  const profData1 = await profRes1.json();
  assert.equal(profRes1.status, 200);
  assert.equal(profData1.profile.name, userB.name);
  assert.equal(profData1.profile.profession, 'Real Estate Agent');
  assert.equal(profData1.profile.company, 'Hyderabad Realty Advisory');
  assert.ok(profData1.profile.interests.includes('Kokapet & Neopolis'));
  assert.equal(profData1.profile.followerCount, 0);
  assert.equal(profData1.profile.isFollowing, false);

  // User A follows User B
  const followRes1 = await fetch(`${base}/api/users/${userB.id}/follow`, {
    method: 'POST',
    headers: { Cookie: cookieA }
  });
  const followData1 = await followRes1.json();
  assert.equal(followRes1.status, 200);
  assert.equal(followData1.following, true);
  assert.equal(followData1.followerCount, 1);

  // User A gets public profile again - should show isFollowing true and followerCount 1
  const profRes2 = await fetch(`${base}/api/users/${userB.id}/profile`, {
    headers: { Cookie: cookieA }
  });
  const profData2 = await profRes2.json();
  assert.equal(profData2.profile.followerCount, 1);
  assert.equal(profData2.profile.isFollowing, true);

  // User A unfollows User B
  const followRes2 = await fetch(`${base}/api/users/${userB.id}/follow`, {
    method: 'POST',
    headers: { Cookie: cookieA }
  });
  const followData2 = await followRes2.json();
  assert.equal(followRes2.status, 200);
  assert.equal(followData2.following, false);
  assert.equal(followData2.followerCount, 0);

  // Self follow should be rejected
  const selfFollow = await fetch(`${base}/api/users/${userA.id}/follow`, {
    method: 'POST',
    headers: { Cookie: cookieA }
  });
  assert.equal(selfFollow.status, 400);
});

test('Community upgrade: bookmarking posts and personal bookmark feed', async () => {
  const { cookie: cookieA } = await login(userA.email);
  const { cookie: adminCookie } = await login(adminUser.email);

  const testPost = await createPost({
    authorId: userB.id,
    authorName: userB.name,
    authorRole: 'AGENT',
    title: 'Top 5 Investment Locations in West Hyderabad 2026',
    content: 'Comparative yields across Neopolis, Financial District, and Tellapur.',
    topic: 'Resale & Rental Yield',
    postType: 'POST',
    visibility: 'PUBLIC'
  });

  // Approve post for community visibility
  await fetch(`${base}/api/admin/posts/${testPost.id}/moderation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'APPROVED' })
  });

  // User A bookmarks the post
  const bmRes1 = await fetch(`${base}/api/community/posts/${testPost.id}/bookmark`, {
    method: 'POST',
    headers: { Cookie: cookieA }
  });
  const bmData1 = await bmRes1.json();
  assert.equal(bmRes1.status, 200);
  assert.equal(bmData1.bookmarked, true);
  assert.equal(bmData1.bookmarkCount, 1);

  // User A retrieves bookmarked posts
  const myBmRes = await fetch(`${base}/api/me/bookmarks`, {
    headers: { Cookie: cookieA }
  });
  const myBmData = await myBmRes.json();
  assert.equal(myBmRes.status, 200);
  assert.ok(Array.isArray(myBmData.posts));
  assert.ok(myBmData.posts.some((p: any) => p.id === testPost.id));

  // User A unbookmarks the post
  const bmRes2 = await fetch(`${base}/api/community/posts/${testPost.id}/bookmark`, {
    method: 'POST',
    headers: { Cookie: cookieA }
  });
  const bmData2 = await bmRes2.json();
  assert.equal(bmRes2.status, 200);
  assert.equal(bmData2.bookmarked, false);
  assert.equal(bmData2.bookmarkCount, 0);
});

test('Community upgrade: interactive poll voting', async () => {
  const { cookie: cookieA } = await login(userA.email);
  const { cookie: cookieB } = await login(userB.email);
  const { cookie: adminCookie } = await login(adminUser.email);

  const pollOptions = [
    { id: 'opt_1', text: 'Ready-to-move Apartments', votes: 0 },
    { id: 'opt_2', text: 'Under-construction high rises', votes: 0 },
    { id: 'opt_3', text: 'Plotted development', votes: 0 }
  ];

  const pollPost = await createPost({
    authorId: userA.id,
    authorName: userA.name,
    authorRole: 'PROPERTY_SEEKER',
    title: 'Which asset type gives the highest ROI in Hyderabad?',
    content: 'Vote in our community poll.',
    topic: 'Resale & Rental Yield',
    postType: 'POLL',
    visibility: 'PUBLIC',
    pollOptions
  });

  // Approve poll post for community participation
  await fetch(`${base}/api/admin/posts/${pollPost.id}/moderation`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
    body: JSON.stringify({ status: 'APPROVED' })
  });

  // User A votes for option 1
  const voteResA = await fetch(`${base}/api/community/posts/${pollPost.id}/poll-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({ optionId: 'opt_1' })
  });
  const voteDataA = await voteResA.json();
  assert.equal(voteResA.status, 200);
  assert.equal(voteDataA.userVotedOptionId, 'opt_1');
  const opt1 = voteDataA.pollOptions.find((o: any) => o.id === 'opt_1');
  assert.equal(opt1.votes, 1);

  // User B votes for option 2
  const voteResB = await fetch(`${base}/api/community/posts/${pollPost.id}/poll-vote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({ optionId: 'opt_2' })
  });
  const voteDataB = await voteResB.json();
  assert.equal(voteResB.status, 200);
  assert.equal(voteDataB.userVotedOptionId, 'opt_2');
  const opt2 = voteDataB.pollOptions.find((o: any) => o.id === 'opt_2');
  assert.equal(opt2.votes, 1);
});

test('Community upgrade: AMA session creation and verified host reply marking', async () => {
  const testAmaPost = await createPost({
    authorId: userB.id,
    authorName: userB.name,
    authorRole: 'AGENT',
    title: 'AMA: High-Rise Structural Audits & RERA Compliance in 2026',
    content: 'Ask me anything about foundation engineering and RERA handover standards.',
    topic: 'Construction Updates',
    postType: 'AMA',
    visibility: 'PUBLIC',
    amaHostName: 'Ar. Sanjay Kolli',
    amaHostRole: 'Principal Structural Architect',
    amaStatus: 'LIVE'
  });
  assert.equal(testAmaPost.postType, 'AMA');
  assert.equal(testAmaPost.amaHostName, 'Ar. Sanjay Kolli');

  // Add a verified host answer comment
  const answer = await createComment({
    postId: testAmaPost.id,
    authorId: userB.id,
    authorName: 'Ar. Sanjay Kolli',
    authorRole: 'AGENT',
    content: 'Regarding soil testing: We require minimum 3 borehole samples down to hard strata.',
    isAmaAnswer: true
  });
  assert.ok(answer.id);
  assert.equal(Boolean(answer.isAmaAnswer), true);
});

test.after(() => {
  server.close();
});
