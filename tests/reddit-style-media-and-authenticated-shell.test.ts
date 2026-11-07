import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-reddit-media-${process.pid}-${Date.now()}.db`;

const {
  initDatabase,
  createUser,
  createSession
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

test('1. Role-gated video upload: Non-Super Admin accounts are blocked from direct video uploads (403 Forbidden)', async () => {
  const seeker = await createUser({
    name: 'Normal Seeker',
    email: `seeker_video_${Date.now()}@example.com`,
    phone: '+919111222333',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  // Attempt raw video data upload
  const res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      title: 'Attempting Direct Video File Upload',
      content: 'This should be rejected for non-super admins.',
      topic: 'Construction Updates',
      mediaType: 'VIDEO',
      mediaUrl: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='
    })
  });

  assert.equal(res.status, 403);
  const data = await res.json();
  assert.match(data.error, /Direct video file upload is exclusively reserved for Super Admin accounts/);
});

test('2. Video Links: Everyone (including Property Seekers) can share video links (YouTube, Vimeo, etc.)', async () => {
  const seeker = await createUser({
    name: 'Seeker Linker',
    email: `seeker_link_${Date.now()}@example.com`,
    phone: '+919111222334',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      title: 'Neopolis Drone Tour November 2026',
      content: 'Comprehensive walkthrough of road progress in Kokapet Golden Mile.',
      topic: 'Construction Updates',
      mediaType: 'VIDEO',
      mediaUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.post.mediaUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
});

test('3. Image Upload: Everyone can upload image files/data', async () => {
  const seeker = await createUser({
    name: 'Seeker Photographer',
    email: `seeker_photo_${Date.now()}@example.com`,
    phone: '+919111222335',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      title: 'Site Progress Snapshot Tellapur',
      content: 'Captured from boundary wall elevation.',
      topic: 'Luxury Villas & Communities',
      mediaType: 'IMAGE',
      mediaUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      attachments: [{
        type: 'image',
        url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        name: 'site-plan.png'
      }]
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.post.mediaUrl.startsWith('data:image/png'));
});

test('4. Link Sharing: Everyone can share external links with Reddit-style preview', async () => {
  const seeker = await createUser({
    name: 'Seeker Sharer',
    email: `seeker_share_${Date.now()}@example.com`,
    phone: '+919111222336',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      title: 'Telangana RERA Order on Layout Sanctions',
      content: 'Detailed legal breakdown from the government portal.',
      topic: 'Legal & RERA',
      mediaType: 'POST',
      links: [{
        url: 'https://rera.telangana.gov.in/orders/2026-circular-42',
        title: 'TG RERA Sanction Guidelines'
      }]
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.post.links[0].url, 'https://rera.telangana.gov.in/orders/2026-circular-42');
});

test('5. Super Admin can upload direct video broadcasts', async () => {
  const admin = await createUser({
    name: 'Super Admin Broadcaster',
    email: `super_video_${Date.now()}@example.com`,
    phone: '+919111222337',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(admin.id);

  const res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({
      title: 'Official Executive Summit Keynote Broadcast',
      content: 'Direct broadcast of platform executive summit keynote.',
      topic: 'General Discussion',
      mediaType: 'VIDEO',
      mediaUrl: 'data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDE='
    })
  });

  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.success, true);
  assert.ok(data.post.mediaUrl.startsWith('data:video/mp4'));
});

test('6. Authenticated Shell Invariant: App.tsx suppresses public header and footer for logged-in users', () => {
  const appSource = readFileSync(join(process.cwd(), 'src/App.tsx'), 'utf8');

  // Header must be null when isLoggedIn is true
  assert.match(appSource, /\{isLoggedIn \? null : isForcedMobile \?/);

  // Footer must be suppressed when isLoggedIn is true
  assert.match(appSource, /\{!isLoggedIn && \(/);
  assert.match(appSource, /<footer className="bg-\[#FAFCFD\]/);

  // AuthenticatedAppLayout must be the root wrapper for logged-in users
  assert.match(appSource, /\{isLoggedIn \? \(\s*<AuthenticatedAppLayout/);
});

test('7. Mockup Cleanliness Invariant: No mock baseline posts or communities are injected', () => {
  const feedSource = readFileSync(join(process.cwd(), 'src/components/authenticated/CommunityFeed.tsx'), 'utf8');
  assert.match(feedSource, /export const BASELINE_COMMUNITY_POSTS: CommunityPost\[\] = \[\];/);
  assert.doesNotMatch(feedSource, /BASELINE_COMMUNITY_POSTS\.forEach/);

  const suggestedSource = readFileSync(join(process.cwd(), 'src/components/authenticated/SuggestedCommunities.tsx'), 'utf8');
  assert.match(suggestedSource, /const BASELINE_COMMUNITIES: CommunityHub\[\] = \[\];/);
  assert.doesNotMatch(suggestedSource, /BASELINE_COMMUNITIES\.forEach/);

  const trendingSource = readFileSync(join(process.cwd(), 'src/components/authenticated/TrendingDiscussions.tsx'), 'utf8');
  assert.doesNotMatch(trendingSource, /BASELINE_COMMUNITY_POSTS\.forEach/);
});

test('8. PostComposer implements Reddit-style tabs and Super Admin video file lock', () => {
  const composerSource = readFileSync(join(process.cwd(), 'src/components/authenticated/PostComposer.tsx'), 'utf8');

  // Tabs
  assert.match(composerSource, /'POST'/);
  assert.match(composerSource, /'IMAGE'/);
  assert.match(composerSource, /'VIDEO'/);
  assert.match(composerSource, /'LINK'/);

  // Image upload
  assert.match(composerSource, /accept="image\/\*"/);
  assert.match(composerSource, /handleImageFileChange/);

  // Video links
  assert.match(composerSource, /Video Link \(Everyone\)/);
  assert.match(composerSource, /videoLinkUrl/);

  // Direct video file upload restricted to SUPER_ADMIN
  assert.match(composerSource, /Direct Video File Upload is Super Admin Only/);
  assert.match(composerSource, /Direct video file upload is exclusively reserved for Super Admin/);
  assert.match(composerSource, /currentUser\?\.role === 'SUPER_ADMIN'/);
});
