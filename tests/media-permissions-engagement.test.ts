import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('Schema and UI invariants for Media & Podcast permissions and engagement', () => {
  // 1. Additive schema contains engagement tables and remains non-destructive
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS media_likes/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS media_reactions/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS media_comments/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS media_shares/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS media_reposts/);

  // 2. MediaEngine.tsx UI role permissions
  const mediaEngine = read('src/components/media/MediaEngine.tsx');
  // Role check is defined
  assert.match(mediaEngine, /currentUser\?\.role === 'SUPER_ADMIN'/);
  // Post button is guarded
  assert.match(mediaEngine, /\{isSuperAdmin && \(\s*<button[\s\S]*?Post Video \/ Podcast Update/);
  // Empty state upload button is guarded by isSuperAdmin
  assert.match(mediaEngine, /\{isSuperAdmin \? 'Super Admin Broadcast Studio' : 'No Video Broadcasts Published Yet'\}/);
  assert.match(mediaEngine, /Check back soon for upcoming masterclasses and builder podcasts hosted by Swamy Reddy Javidi\./);
  // Toolbar contains Repost button with Repeat icon
  assert.match(mediaEngine, /<Repeat/);
  assert.match(mediaEngine, /handleRepost/);
  // Modal creation is guarded
  assert.match(mediaEngine, /isPostModalOpen && isSuperAdmin/);

  // 3. UserDashboard.tsx contains reposted broadcast feed with attribution & links
  const userDash = read('src/components/dashboard/UserDashboard.tsx');
  assert.match(userDash, /My Reposted Broadcasts & Podcasts/);
  assert.match(userDash, /Original broadcast by/);
  assert.match(userDash, /Watch Original Broadcast/);
  assert.match(userDash, /\/api\/me\/reposts/);
});

// Setup isolated local SQLite database for backend testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-media-test-${process.pid}.db`;

const {
  initDatabase,
  createUser,
  createSession,
  getAllMedia,
  getMediaById
} = await import('../src/server/db.ts');

await initDatabase();
const { app } = await import('../server.ts');

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
});

test('Backend API enforces Super Admin-only broadcast publishing, editing, and deleting', async () => {
  // Create Super Admin, Developer, and Property Seeker
  const adminUser = await createUser({
    name: 'Super Admin Host',
    email: `admin_media_${Date.now()}@example.com`,
    phone: '+919999900001',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(adminUser.id);

  const devUser = await createUser({
    name: 'Real Estate Developer',
    email: `dev_media_${Date.now()}@example.com`,
    phone: '+919999900002',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const devSession = await createSession(devUser.id);

  const seekerUser = await createUser({
    name: 'Property Seeker Member',
    email: `seeker_media_${Date.now()}@example.com`,
    phone: '+919999900003',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seekerUser.id);

  const broadcastPayload = {
    title: 'Financial District Sky Mansion Structural Audit',
    summary: 'Technical foundation inspection and load calculations for Kokapet high-rises.',
    video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
    type: 'MASTERCLASS',
    duration: '35:20',
    author_name: 'Swamy Reddy Javidi'
  };

  // 1. Unauthenticated creation is blocked (401)
  const unauthRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(broadcastPayload)
  });
  assert.equal(unauthRes.status, 401);

  // 2. Developer is blocked (403 Forbidden)
  const devCreateRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devSession.token}`
    },
    body: JSON.stringify(broadcastPayload)
  });
  assert.equal(devCreateRes.status, 403);
  const devErr = await devCreateRes.json();
  assert.match(devErr.error, /Only Super Admin can upload, create, edit, delete, and publish/);

  // 3. Property Seeker is blocked (403 Forbidden)
  const seekerCreateRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify(broadcastPayload)
  });
  assert.equal(seekerCreateRes.status, 403);

  // 4. Super Admin succeeds (200 OK)
  const adminCreateRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify(broadcastPayload)
  });
  assert.equal(adminCreateRes.status, 200);
  const adminCreateData = await adminCreateRes.json();
  assert.equal(adminCreateData.success, true);
  assert.ok(adminCreateData.mediaId);
  const mediaId = adminCreateData.mediaId;

  // 5. Everyone can watch and browse (Public endpoints)
  const publicListRes = await fetch(`${baseUrl}/api/media`);
  assert.equal(publicListRes.status, 200);
  const publicList = await publicListRes.json();
  assert.ok(Array.isArray(publicList.items));
  assert.ok(publicList.items.some((item: any) => item.id === mediaId));

  const publicItemRes = await fetch(`${baseUrl}/api/media/${mediaId}`);
  assert.equal(publicItemRes.status, 200);
  const publicItem = await publicItemRes.json();
  assert.equal(publicItem.item.id, mediaId);
  assert.equal(publicItem.item.title, broadcastPayload.title);

  // 6. Super Admin can edit broadcast
  const adminUpdateRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({ title: 'Financial District Sky Mansion Structural Audit (Updated)' })
  });
  assert.equal(adminUpdateRes.status, 200);

  // Developer cannot edit
  const devUpdateRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devSession.token}`
    },
    body: JSON.stringify({ title: 'Developer Hacked Title' })
  });
  assert.equal(devUpdateRes.status, 403);

  // Developer cannot delete
  const devDeleteRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${devSession.token}` }
  });
  assert.equal(devDeleteRes.status, 403);

  // Seeker cannot delete
  const seekerDeleteRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(seekerDeleteRes.status, 403);
});

test('Engagement: All authenticated users can like, react, comment, share, and repost with persistence', async () => {
  const adminUser = await createUser({
    name: 'Super Admin Broadcast Host',
    email: `admin_eng_${Date.now()}@example.com`,
    phone: '+919999900010',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(adminUser.id);

  const seekerUser = await createUser({
    name: 'Anita Sharma',
    email: `anita_eng_${Date.now()}@example.com`,
    phone: '+919999900011',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seekerUser.id);

  const devUser = await createUser({
    name: 'Prestige Developer',
    email: `dev_eng_${Date.now()}@example.com`,
    phone: '+919999900012',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const devSession = await createSession(devUser.id);

  // Create test media broadcast
  const createRes = await fetch(`${baseUrl}/api/media`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({
      title: 'Deccan Granite Soil Load & Pile Depth Masterclass',
      summary: 'Deep engineering breakdown for 50+ floor sky villas in Kokapet.',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab',
      type: 'MASTERCLASS',
      duration: '42:15',
      author_name: 'Swamy Reddy Javidi'
    })
  });
  const { mediaId } = await createRes.json();

  // 1. Unauthenticated engagement is rejected (401)
  const unauthLike = await fetch(`${baseUrl}/api/media/${mediaId}/like`, { method: 'POST' });
  assert.equal(unauthLike.status, 401);

  const unauthComment = await fetch(`${baseUrl}/api/media/${mediaId}/comment`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Should be rejected' })
  });
  assert.equal(unauthComment.status, 401);

  const unauthRepost = await fetch(`${baseUrl}/api/media/${mediaId}/repost`, { method: 'POST' });
  assert.equal(unauthRepost.status, 401);

  // 2. Like & Unlike (duplicate prevention & accurate count)
  const likeRes1 = await fetch(`${baseUrl}/api/media/${mediaId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(likeRes1.status, 200);
  const likeData1 = await likeRes1.json();
  assert.equal(likeData1.liked, true);
  assert.equal(likeData1.count, 1);

  // Second user also likes
  const likeResDev = await fetch(`${baseUrl}/api/media/${mediaId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${devSession.token}` }
  });
  assert.equal(likeResDev.status, 200);
  const likeDataDev = await likeResDev.json();
  assert.equal(likeDataDev.liked, true);
  assert.equal(likeDataDev.count, 2);

  // Seeker unlikes (toggle)
  const unlikeRes = await fetch(`${baseUrl}/api/media/${mediaId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(unlikeRes.status, 200);
  const unlikeData = await unlikeRes.json();
  assert.equal(unlikeData.liked, false);
  assert.equal(unlikeData.count, 1);

  // Seeker re-likes
  await fetch(`${baseUrl}/api/media/${mediaId}/like`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });

  // 3. Reaction
  const reactRes = await fetch(`${baseUrl}/api/media/${mediaId}/react`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ reactionType: 'INSIGHTFUL' })
  });
  assert.equal(reactRes.status, 200);
  const reactData = await reactRes.json();
  assert.equal(reactData.reaction, 'INSIGHTFUL');
  assert.equal(reactData.count, 1);

  // 4. Commenting with server validation
  const emptyCommentRes = await fetch(`${baseUrl}/api/media/${mediaId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ text: '   ' })
  });
  assert.equal(emptyCommentRes.status, 400);

  const commentRes = await fetch(`${baseUrl}/api/media/${mediaId}/comment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ text: 'Excellent breakdown of Deccan granite bedrock vs high-rise foundation!' })
  });
  assert.equal(commentRes.status, 200);
  const commentData = await commentRes.json();
  assert.equal(commentData.success, true);
  assert.equal(commentData.comment.author_name, 'Anita Sharma');

  // Verify comments list
  const commentsListRes = await fetch(`${baseUrl}/api/media/${mediaId}/comments`);
  assert.equal(commentsListRes.status, 200);
  const commentsList = await commentsListRes.json();
  assert.equal(commentsList.comments.length >= 1, true);
  assert.equal(commentsList.comments[0].text, 'Excellent breakdown of Deccan granite bedrock vs high-rise foundation!');

  // 5. Sharing
  const shareRes = await fetch(`${baseUrl}/api/media/${mediaId}/share`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ platform: 'TWITTER' })
  });
  assert.equal(shareRes.status, 200);
  const shareData = await shareRes.json();
  assert.equal(shareData.count >= 1, true);

  // 6. Reposts: Attribution and NO media duplication
  const initialMediaItems = await getAllMedia();
  const initialMediaCount = initialMediaItems.length;

  const repostRes = await fetch(`${baseUrl}/api/media/${mediaId}/repost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ note: 'Must-watch structural audit before buying high-rises in Kokapet.' })
  });
  assert.equal(repostRes.status, 200);
  const repostData = await repostRes.json();
  assert.equal(repostData.reposted, true);
  assert.equal(repostData.count, 1);

  // CRITICAL CHECK: Media items table count did NOT increase (media file is NOT duplicated)
  const afterRepostMediaItems = await getAllMedia();
  assert.equal(afterRepostMediaItems.length, initialMediaCount);

  // Verify User Dashboard feed (/api/me/reposts) includes the repost with original creator attribution
  const myRepostsRes = await fetch(`${baseUrl}/api/me/reposts`, {
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(myRepostsRes.status, 200);
  const myReposts = await myRepostsRes.json();
  assert.equal(Array.isArray(myReposts.reposts), true);
  assert.equal(myReposts.reposts.length, 1);

  const myRepost = myReposts.reposts[0];
  assert.equal(myRepost.mediaId, mediaId);
  assert.equal(myRepost.title, 'Deccan Granite Soil Load & Pile Depth Masterclass');
  assert.equal(myRepost.originalCreator, 'Swamy Reddy Javidi');
  assert.ok(myRepost.videoUrl);
  assert.ok(myRepost.thumbnail);
  assert.equal(myRepost.note, 'Must-watch structural audit before buying high-rises in Kokapet.');

  // 7. Engagement stats endpoint returns aggregate state
  const engRes = await fetch(`${baseUrl}/api/media/${mediaId}/engagement`, {
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(engRes.status, 200);
  const engData = await engRes.json();
  assert.equal(engData.engagement.likesCount, 2);
  assert.equal(engData.engagement.hasLiked, true);
  assert.equal(engData.engagement.commentsCount, 1);
  assert.equal(engData.engagement.repostsCount, 1);
  assert.equal(engData.engagement.hasReposted, true);

  // 8. Super Admin can delete media item
  const adminDeleteRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminSession.token}` }
  });
  assert.equal(adminDeleteRes.status, 200);
});
