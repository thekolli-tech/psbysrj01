import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

// Setup isolated local SQLite database for backend testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = join(tmpdir(), `ps-global-feed-scroll-${process.pid}-${Date.now()}.db`);

const {
  initDatabase,
  createUser,
  createSession,
  createCommunity,
  createPost
} = await import('../src/server/db.ts');

const {
  recordActivity,
  getActivityTimestamps,
  broadcastSseEvent
} = await import('../src/server/events.ts');

await initDatabase();
const { app } = await import('../server.ts');

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
});

test('1. Authoritative Live Sync Status endpoint reports activity timestamps and update flags', async () => {
  const before = Date.now() - 1000;
  const res = await fetch(`${baseUrl}/api/live/sync-status?since=${before}`);
  assert.equal(res.status, 200);
  const data = await res.json();

  assert.equal(typeof data.hasUpdates, 'boolean');
  assert.ok(data.timestamps);
  assert.ok(data.timestamps.posts > 0);
  assert.ok(data.timestamps.communities > 0);
  assert.ok(data.timestamps.lastUpdated > 0);

  // Calling recordActivity updates timestamp
  const t0 = data.timestamps.posts;
  await new Promise(r => setTimeout(r, 10));
  recordActivity('posts');
  const afterRes = await fetch(`${baseUrl}/api/live/sync-status?since=${t0}`);
  const afterData = await afterRes.json();
  assert.equal(afterData.hasUpdates, true);
  assert.equal(afterData.postsUpdated, true);
  assert.ok(afterData.timestamps.posts > t0);
});

test('2. Super Admin post approval updates live sync status and broadcasts approval event', async () => {
  const seeker = await createUser({
    name: 'Seeker Online 1',
    email: `seeker_sync_${Date.now()}@example.com`,
    phone: '+919011199001',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const admin = await createUser({
    name: 'SuperAdmin Sync',
    email: `admin_sync_${Date.now()}@example.com`,
    phone: '+919030057488',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(admin.id);

  // Seeker submits post -> PENDING_APPROVAL
  const createRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      title: 'Real-time sync test discussion',
      content: 'Testing instant global feed publishing on admin approval.',
      topic: 'Kokapet & Neopolis'
    })
  });
  assert.equal(createRes.status, 200);
  const { post } = await createRes.json();
  assert.equal(post.status, 'PENDING_APPROVAL');

  const stampBeforeApprove = getActivityTimestamps().posts;
  await new Promise(r => setTimeout(r, 10));

  // Admin approves post via moderation endpoint
  const approveRes = await fetch(`${baseUrl}/api/admin/posts/${post.id}/moderation`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  assert.equal(approveRes.status, 200);

  // Sync status must reflect posts update
  const syncRes = await fetch(`${baseUrl}/api/live/sync-status?since=${stampBeforeApprove}`);
  const syncData = await syncRes.json();
  assert.equal(syncData.postsUpdated, true);
  assert.ok(syncData.timestamps.posts > stampBeforeApprove);

  // Approved post is now visible in seeker's feed without manual page reload
  const feedRes = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  const feedData = await feedRes.json();
  const found = feedData.posts.find((p: any) => p.id === post.id);
  assert.ok(found, 'Approved post is now published and visible to online users');
  assert.equal(found.status, 'APPROVED');
});

test('3. Engagement updates (vote, follow, repost) update live activity timestamps', async () => {
  const seeker = await createUser({
    name: 'Seeker Engager',
    email: `seeker_eng_${Date.now()}@example.com`,
    phone: '+919011199002',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const session = await createSession(seeker.id);

  const post = await createPost({
    authorId: seeker.id,
    authorName: seeker.name,
    authorRole: 'PROPERTY_SEEKER',
    topic: 'Kokapet & Neopolis',
    title: 'Engagement Live Sync Test',
    content: 'Testing engagement updates live across browser sessions.'
  });

  const stampBeforeVote = getActivityTimestamps().posts;
  await new Promise(r => setTimeout(r, 10));

  // Cast vote
  const voteRes = await fetch(`${baseUrl}/api/community/posts/${post.id}/vote`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`
    },
    body: JSON.stringify({ vote: 1 })
  });
  assert.equal(voteRes.status, 200);

  // Check sync status reflects live post update
  const checkRes = await fetch(`${baseUrl}/api/live/sync-status?since=${stampBeforeVote}`);
  const checkData = await checkRes.json();
  assert.equal(checkData.postsUpdated, true);
  assert.ok(checkData.timestamps.posts > stampBeforeVote);
});

test('4. CSS & layout rules guarantee desktop horizontal scrollbar visibility while maintaining APK touch swipe', () => {
  const css = readFileSync('src/index.css', 'utf8');

  // Desktop media query (min-width: 769px) has visible scrollbars
  assert.match(css, /@media \(min-width: 769px\)/);
  assert.match(css, /scrollbar-width:\s*thin/);
  assert.match(css, /scrollbar-color:\s*#94a3b8\s+#f1f5f9/);
  assert.match(css, /::-webkit-scrollbar/);
  assert.match(css, /height:\s*8px/);

  // Desktop .overflow-x-auto elements explicitly display horizontal scrollbars
  assert.match(css, /\.overflow-x-auto::-webkit-scrollbar/);
  assert.match(css, /display:\s*block/);

  // Mobile / APK media query hides scrollbar indicators for touch swipe
  assert.match(css, /@media \(max-width: 768px\)/);
  assert.match(css, /scrollbar-width:\s*none/);

  // App root container in desktop mode allows horizontal scrolling when content overflows
  const app = readFileSync('src/App.tsx', 'utf8');
  assert.match(app, /overflow-x-auto/);
});

test('5. Private community discussions remain strictly guarded from non-members during global live sync', async () => {
  const admin = await createUser({
    name: 'Admin Priv',
    email: `admin_priv_${Date.now()}@example.com`,
    phone: '+919011199003',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(admin.id);

  const nonMember = await createUser({
    name: 'Non Member User',
    email: `nonmember_${Date.now()}@example.com`,
    phone: '+919011199004',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const nonMemberSession = await createSession(nonMember.id);

  // Create a private community
  const community = await createCommunity({
    name: 'Secret Private Syndicate',
    description: 'Private gated community hub',
    category: 'Investor Syndicate',
    createdById: admin.id,
    createdByName: admin.name,
    visibility: 'PRIVATE',
    status: 'APPROVED'
  });

  // Create an approved post in private community
  const privatePost = await createPost({
    authorId: admin.id,
    authorName: admin.name,
    authorRole: 'SUPER_ADMIN',
    communityId: community.id,
    communityName: community.name,
    topic: 'Luxury Villas & Communities',
    title: 'Private Investor Memo Q4',
    content: 'Internal confidential distribution figures.',
    visibility: 'COMMUNITY'
  });

  // Non-member fetches feed - private post must NEVER leak into non-member feed
  const nonMemberFeed = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${nonMemberSession.token}` }
  });
  const nonMemberData = await nonMemberFeed.json();
  const leakFound = nonMemberData.posts.some((p: any) => p.id === privatePost.id);
  assert.equal(leakFound, false, 'Private community post must not appear in non-member feed');

  // Direct fetch by non-member must return 403
  const directFetch = await fetch(`${baseUrl}/api/community/posts/${privatePost.id}`, {
    headers: { Authorization: `Bearer ${nonMemberSession.token}` }
  });
  assert.equal(directFetch.status, 403, 'Direct access to private post by non-member is blocked');
});
