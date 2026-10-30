import test from 'node:test';
import assert from 'node:assert/strict';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

// Setup isolated local SQLite database for backend testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = join(tmpdir(), `ps-comm-mod-test-${process.pid}-${Date.now()}.db`);

const {
  initDatabase,
  createUser,
  createSession,
  getUserNotifications,
  getUnreadNotificationCount
} = await import('../src/server/db.ts');

const {
  sendWhatsAppModerationAlert
} = await import('../src/server/whatsappOtp.ts');

await initDatabase();
const { app } = await import('../server.ts');

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
});

test('1. Property Seeker submits a question: defaults to PENDING_APPROVAL, visible to author & Super Admin, hidden from other seekers', async () => {
  const seekerAuthor = await createUser({
    name: 'Charan Seeker',
    email: `seeker_author_${Date.now()}@example.com`,
    phone: '+919011122201',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const authorSession = await createSession(seekerAuthor.id);

  const seekerViewer = await createUser({
    name: 'Suresh Viewer',
    email: `seeker_viewer_${Date.now()}@example.com`,
    phone: '+919011122202',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const viewerSession = await createSession(seekerViewer.id);

  const superAdmin = await createUser({
    name: 'Swamy SuperAdmin',
    email: `admin_mod_${Date.now()}@example.com`,
    phone: '+919030057488',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  // Author creates a community post / question
  const createPostRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorSession.token}`
    },
    body: JSON.stringify({
      title: 'Is Kokapet Neopolis Phase 2 RERA registered?',
      content: 'Seeking clarity on Tower 4 approvals and expected handover schedule.',
      topic: 'Kokapet & Neopolis',
      postType: 'QUESTION'
    })
  });
  assert.equal(createPostRes.status, 200);
  const postData = await createPostRes.json();
  const postId = postData.post.id;
  assert.equal(postData.post.status, 'PENDING_APPROVAL');

  // Author CAN see their own pending post in feed
  const authorFeedRes = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${authorSession.token}` }
  });
  const authorFeed = await authorFeedRes.json();
  assert.ok(authorFeed.posts.some((p: any) => p.id === postId && p.status === 'PENDING_APPROVAL'));

  // Other seeker CANNOT see author's pending post
  const viewerFeedRes = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${viewerSession.token}` }
  });
  const viewerFeed = await viewerFeedRes.json();
  assert.ok(!viewerFeed.posts.some((p: any) => p.id === postId));

  // Super Admin CAN see the pending post in community feed AND moderation queue
  const adminFeedRes = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${adminSession.token}` }
  });
  const adminFeed = await adminFeedRes.json();
  assert.ok(adminFeed.posts.some((p: any) => p.id === postId));

  const modQueueRes = await fetch(`${baseUrl}/api/admin/moderation/queue`, {
    headers: { Authorization: `Bearer ${adminSession.token}` }
  });
  const modQueue = await modQueueRes.json();
  assert.ok(modQueue.posts.some((p: any) => p.id === postId));
});

test('2. Super Admin official posts publish immediately as APPROVED without pending state', async () => {
  const superAdmin = await createUser({
    name: 'Admin Official',
    email: `admin_official_${Date.now()}@example.com`,
    phone: '+919030057489',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  const seeker = await createUser({
    name: 'Seeker Public',
    email: `seeker_pub_${Date.now()}@example.com`,
    phone: '+919011122203',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  // Super Admin creates official post
  const createRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({
      title: 'Official Platform Notice: Q4 2026 Hyderabad Infrastructure Audit',
      content: 'Detailed audit report of 100-meter Trumpet interchanges and western corridor growth.',
      topic: 'Infrastructure & Connectivity',
      postType: 'POST'
    })
  });
  assert.equal(createRes.status, 200);
  const data = await createRes.json();
  assert.equal(data.post.status, 'APPROVED');

  // Property Seeker immediately sees the official post
  const seekerFeedRes = await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  const seekerFeed = await seekerFeedRes.json();
  assert.ok(seekerFeed.posts.some((p: any) => p.id === data.post.id && p.status === 'APPROVED'));
});

test('3. Super Admin approves/rejects questions: public feed updates, author receives notification', async () => {
  const author = await createUser({
    name: 'Kavita Seeker',
    email: `kavita_${Date.now()}@example.com`,
    phone: '+919011122204',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const authorSession = await createSession(author.id);

  const superAdmin = await createUser({
    name: 'Moderator Admin',
    email: `admin_action_${Date.now()}@example.com`,
    phone: '+919030057490',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  const viewer = await createUser({
    name: 'Viewer Seeker',
    email: `viewer_action_${Date.now()}@example.com`,
    phone: '+919011122205',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const viewerSession = await createSession(viewer.id);

  // Create question 1 (to be approved)
  const post1Res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorSession.token}`
    },
    body: JSON.stringify({
      title: 'What are the current rental yields in Financial District?',
      content: 'Comparing 3BHK high-rise vs gated community villas.',
      topic: 'Rental Yield & ROI',
      postType: 'QUESTION'
    })
  });
  const post1Data = await post1Res.json();
  const post1Id = post1Data.post.id;

  // Super Admin approves question 1
  const approveRes = await fetch(`${baseUrl}/api/admin/posts/${post1Id}/moderation`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  assert.equal(approveRes.status, 200);

  // Now other seeker CAN see approved post 1
  const viewerFeed1 = await (await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${viewerSession.token}` }
  })).json();
  assert.ok(viewerFeed1.posts.some((p: any) => p.id === post1Id && p.status === 'APPROVED'));

  // Author received notification about approval
  const authorNotifs1 = await getUserNotifications(author.id);
  assert.ok(authorNotifs1.some((n: any) => n.type === 'MODERATION' && n.title.includes('Approved')));

  // Create question 2 (to be rejected)
  const post2Res = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorSession.token}`
    },
    body: JSON.stringify({
      title: 'Spam promotion question link',
      content: 'Buy unauthorized lands without RERA check here: example.com',
      topic: 'Land & Plotting Guidelines',
      postType: 'QUESTION'
    })
  });
  const post2Data = await post2Res.json();
  const post2Id = post2Data.post.id;

  // Super Admin rejects question 2 with reason
  const rejectRes = await fetch(`${baseUrl}/api/admin/posts/${post2Id}/moderation`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({ status: 'REJECTED', reason: 'Unverified promotion violates RERA disclosure policy' })
  });
  assert.equal(rejectRes.status, 200);

  // Other seeker CANNOT see rejected post 2
  const viewerFeed2 = await (await fetch(`${baseUrl}/api/community/posts`, {
    headers: { Authorization: `Bearer ${viewerSession.token}` }
  })).json();
  assert.ok(!viewerFeed2.posts.some((p: any) => p.id === post2Id));

  // Author sees notification with rejection reason
  const authorNotifs2 = await getUserNotifications(author.id);
  assert.ok(authorNotifs2.some((n: any) => n.type === 'MODERATION' && n.message.includes('Unverified promotion')));
});

test('4. Community Creation Request: Property Seeker request defaults to PENDING_APPROVAL, admin approves, discovery updates', async () => {
  const seekerRequester = await createUser({
    name: 'Deepak Requester',
    email: `deepak_${Date.now()}@example.com`,
    phone: '+919011122206',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const requesterSession = await createSession(seekerRequester.id);

  const otherSeeker = await createUser({
    name: 'Other Seeker',
    email: `other_${Date.now()}@example.com`,
    phone: '+919011122207',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const otherSession = await createSession(otherSeeker.id);

  const superAdmin = await createUser({
    name: 'Admin Approver',
    email: `admin_comm_${Date.now()}@example.com`,
    phone: '+919030057491',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  // Property Seeker submits community creation request
  const commRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${requesterSession.token}`
    },
    body: JSON.stringify({
      name: 'Narsingi Villa Owners Circle',
      description: 'Exclusive community for luxury villa owners in Narsingi.',
      category: 'Asset Class Hub',
      location: 'Narsingi, Hyderabad',
      visibility: 'PUBLIC'
    })
  });
  assert.equal(commRes.status, 200);
  const commData = await commRes.json();
  const commId = commData.community.id;
  assert.equal(commData.community.status, 'PENDING_APPROVAL');

  // Requester CAN see their own pending community in communities list
  const requesterCommList = await (await fetch(`${baseUrl}/api/communities`, {
    headers: { Authorization: `Bearer ${requesterSession.token}` }
  })).json();
  assert.ok(requesterCommList.communities.some((c: any) => c.id === commId));

  // Other seeker CANNOT see the unapproved community
  const otherCommList = await (await fetch(`${baseUrl}/api/communities`, {
    headers: { Authorization: `Bearer ${otherSession.token}` }
  })).json();
  assert.ok(!otherCommList.communities.some((c: any) => c.id === commId));

  // Super Admin approves the community
  const approveCommRes = await fetch(`${baseUrl}/api/admin/communities/${commId}/moderation`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({ status: 'APPROVED' })
  });
  assert.equal(approveCommRes.status, 200);

  // Now other seeker CAN see the approved community in discovery
  const otherCommListAfter = await (await fetch(`${baseUrl}/api/communities`, {
    headers: { Authorization: `Bearer ${otherSession.token}` }
  })).json();
  assert.ok(otherCommListAfter.communities.some((c: any) => c.id === commId && c.status === 'APPROVED'));

  // Requester received approval notification
  const requesterNotifs = await getUserNotifications(seekerRequester.id);
  assert.ok(requesterNotifs.some((n: any) => n.type === 'MODERATION' && n.title.includes('Community Has Been Approved')));
});

test('5. WhatsApp Approval Alerts: targets +91 90300 57488, formats content and fails open safely when unconfigured', async () => {
  // Test 1: Unconfigured provider returns status UNCONFIGURED without throwing
  const unconfiguredResult = await sendWhatsAppModerationAlert({
    submissionType: 'COMMUNITY_POST',
    title: 'Wind Load Analysis for 50-Story Towers',
    submitterName: 'Ramesh Seeker',
    submitterRole: 'PROPERTY_SEEKER',
    communityName: 'High-Rise Engineering Hub'
  });
  assert.equal(unconfiguredResult.success, false);
  assert.equal(unconfiguredResult.status, 'UNCONFIGURED');
  assert.match(unconfiguredResult.error || '', /WhatsApp Cloud API is not configured/);

  // Test 2: Mock configured provider accepts formatted dispatch to +91 90300 57488
  process.env.WHATSAPP_ACCESS_TOKEN = 'test_token_moderation_alert';
  process.env.WHATSAPP_PHONE_NUMBER_ID = '109876543210';
  process.env.WHATSAPP_GRAPH_API_VERSION = 'v21.0';

  let capturedUrl = '';
  let capturedBody: any = null;

  const mockFetch: typeof fetch = async (url, init) => {
    capturedUrl = String(url);
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return new Response(JSON.stringify({
      messaging_product: 'whatsapp',
      messages: [{ id: 'wamid.HBgLOTE5MDMwMDU3NDg4FQIAERgSMTQ1' }]
    }), { status: 200 });
  };

  const configuredResult = await sendWhatsAppModerationAlert({
    submissionType: 'COMMUNITY_POST',
    title: 'Neopolis Land Acquisition Rates 2026',
    submitterName: 'Ananya Investor',
    submitterRole: 'PROPERTY_SEEKER',
    communityName: 'Kokapet Neopolis Hub'
  }, mockFetch);

  assert.equal(configuredResult.success, true);
  assert.equal(configuredResult.status, 'DELIVERED');
  assert.equal(configuredResult.messageId, 'wamid.HBgLOTE5MDMwMDU3NDg4FQIAERgSMTQ1');
  assert.match(capturedUrl, /109876543210\/messages/);
  // Recipient must be 919030057488 (+91 90300 57488 normalized)
  assert.equal(capturedBody.to, '919030057488');
  assert.match(capturedBody.text.body, /Super Admin Moderation Alert/);
  assert.match(capturedBody.text.body, /Neopolis Land Acquisition Rates 2026/);
  assert.match(capturedBody.text.body, /Ananya Investor/);
  assert.match(capturedBody.text.body, /https:\/\/psbysrj01\.vercel\.app\/admin\?tab=MODERATION/);

  delete process.env.WHATSAPP_ACCESS_TOKEN;
  delete process.env.WHATSAPP_PHONE_NUMBER_ID;
  delete process.env.WHATSAPP_GRAPH_API_VERSION;
});
