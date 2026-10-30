import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('Schema and UI invariants for Community creation, membership, and discussion reposts', () => {
  // 1. Additive schema contains visibility column, community_members, and community_post_reposts tables
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE communities ADD COLUMN IF NOT EXISTS visibility VARCHAR\(32\)/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS community_members/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS community_post_reposts/);
  assert.match(POSTGRES_ADDITIVE_SQL, /UNIQUE\s*\(\s*community_id\s*,\s*user_id\s*\)/i);
  assert.match(POSTGRES_ADDITIVE_SQL, /UNIQUE\s*\(\s*post_id\s*,\s*user_id\s*\)/i);

  // 2. CommunityForum.tsx UI: Community proposal modal and submission
  const communityForum = read('src/components/community/CommunityForum.tsx');
  assert.match(communityForum, /PROPOSE_COMMUNITY/);
  assert.match(communityForum, /handleCreateCommunitySubmit/);

  // 3. Discussion Repost with Repeat icon and attribution
  assert.match(communityForum, /handleToggleRepost/);
  assert.match(communityForum, /<Repeat/);
  assert.match(communityForum, /repostDiscussion/);

  // 4. Dedicated Community Hub Page & Private community locking
  assert.match(communityForum, /activeCommunity/);
  assert.match(communityForum, /canAccessSelectedCommunity/);
  assert.match(communityForum, /Private Community Hub/);
  assert.match(communityForum, /Request Access/);

  // 5. Community Management Modal
  assert.match(communityForum, /MANAGE_COMMUNITY/);
  assert.match(communityForum, /handleUpdateCommunitySettings/);
  assert.match(communityForum, /handleMemberStatusChange/);
  assert.match(communityForum, /handleMemberRoleChange/);

  // 6. UserDashboard.tsx contains joined communities and discussion reposts
  const userDash = read('src/components/dashboard/UserDashboard.tsx');
  assert.match(userDash, /My Joined Communities/);
  assert.match(userDash, /My Discussion Reposts/);
  assert.match(userDash, /\/api\/me\/communities/);
  assert.match(userDash, /\/api\/me\/discussion-reposts/);
});

// Setup isolated local SQLite database for backend testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = join(tmpdir(), `ps-comm-test-${process.pid}-${Date.now()}.db`);

const {
  initDatabase,
  createUser,
  createSession,
  getCommunityById
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

test('Community Creation Permissions: Property Seekers request defaults to PENDING_APPROVAL, Developers and Admins approved', async () => {
  // Create test accounts
  const seeker = await createUser({
    name: 'Seeker Rajesh',
    email: `seeker_comm_${Date.now()}@example.com`,
    phone: '+919988112201',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const developer = await createUser({
    name: 'Aparna Developer Lead',
    email: `dev_comm_${Date.now()}@example.com`,
    phone: '+919988112202',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const devSession = await createSession(developer.id);

  const agent = await createUser({
    name: 'Kokapet Agent Kiran',
    email: `agent_comm_${Date.now()}@example.com`,
    phone: '+919988112203',
    role: 'AGENT',
    password: 'Password123!',
    isVerified: true
  });
  const agentSession = await createSession(agent.id);

  const superAdmin = await createUser({
    name: 'Admin Swamy',
    email: `admin_comm_${Date.now()}@example.com`,
    phone: '+919988112204',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  // 1. Property Seeker requests community -> 200 Success with status PENDING_APPROVAL
  const seekerCreateRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({
      name: 'Seeker Proposed Community',
      category: 'Residential',
      location: 'Gachibowli, Hyderabad',
      description: 'Proposed by seeker awaiting admin review',
      visibility: 'PUBLIC'
    })
  });
  assert.equal(seekerCreateRes.status, 200);
  const seekerData = await seekerCreateRes.json();
  assert.equal(seekerData.community.status, 'PENDING_APPROVAL');

  // 2. Developer can create public community -> 200/201 Success
  const devCreateRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${devSession.token}`
    },
    body: JSON.stringify({
      name: 'Neopolis High-Rise Owners Club',
      category: 'Micro-Market Hub',
      location: 'Kokapet Neopolis, Hyderabad',
      description: 'Official discussions for luxury high-rise developments in Neopolis.',
      visibility: 'PUBLIC',
      rules: 'Verify RERA registration before posting floor plans.'
    })
  });
  assert.equal(devCreateRes.status, 200);
  const devCommData = await devCreateRes.json();
  assert.equal(devCommData.success, true);
  assert.ok(devCommData.community?.id);
  assert.equal(devCommData.community.visibility, 'PUBLIC');

  // Verify creator is automatically registered as CREATOR and ACTIVE
  const devCreatedHub = await getCommunityById(devCommData.community.id, developer.id);
  assert.ok(devCreatedHub);
  assert.equal(devCreatedHub.membership_role, 'CREATOR');
  assert.equal(devCreatedHub.membership_status, 'ACTIVE');

  // 3. Agent can create private community -> 200/201 Success
  const agentCreateRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${agentSession.token}`
    },
    body: JSON.stringify({
      name: 'Western Corridor HNIs Syndicate',
      category: 'Investor Syndicate',
      location: 'Financial District, Hyderabad',
      description: 'Private closed syndicate for accredited land and pre-launch investors.',
      visibility: 'PRIVATE',
      rules: 'Strict confidentiality. Invitation and approval only.'
    })
  });
  assert.equal(agentCreateRes.status, 200);
  const agentCommData = await agentCreateRes.json();
  assert.equal(agentCommData.community.visibility, 'PRIVATE');

  // 4. Super Admin can create community -> 200/201 Success
  const adminCreateRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({
      name: 'Telangana RERA & Legal Oversight Circle',
      category: 'Legal & RERA',
      location: 'Hyderabad, Telangana',
      description: 'Advisory hub for consumer court and RERA rulings.',
      visibility: 'PUBLIC'
    })
  });
  assert.equal(adminCreateRes.status, 200);
});

test('Community Settings & Member Management Permissions: Creators and Admins only', async () => {
  const seeker = await createUser({
    name: 'Seeker Ananya',
    email: `seeker_settings_${Date.now()}@example.com`,
    phone: '+919988112205',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seeker.id);

  const creatorDev = await createUser({
    name: 'Dev Creator Mohan',
    email: `dev_creator_${Date.now()}@example.com`,
    phone: '+919988112206',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const creatorSession = await createSession(creatorDev.id);

  const otherDev = await createUser({
    name: 'Dev Competitor Rahul',
    email: `dev_other_${Date.now()}@example.com`,
    phone: '+919988112207',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const otherDevSession = await createSession(otherDev.id);

  const superAdmin = await createUser({
    name: 'SuperAdmin Sunita',
    email: `admin_settings_${Date.now()}@example.com`,
    phone: '+919988112208',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const adminSession = await createSession(superAdmin.id);

  // Create community by creatorDev
  const createRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorSession.token}`
    },
    body: JSON.stringify({
      name: 'Madhapur Commercial Office Hub',
      category: 'Commercial',
      location: 'Madhapur, Hyderabad',
      description: 'Discussions on Grade-A office leasing.',
      visibility: 'PUBLIC'
    })
  });
  const createData = await createRes.json();
  const commId = createData.community.id;

  // 1. Property Seeker cannot update community settings -> 403
  const seekerUpdateRes = await fetch(`${baseUrl}/api/communities/${commId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ name: 'Hacked by Seeker' })
  });
  assert.equal(seekerUpdateRes.status, 403);

  // 2. Unrelated Developer cannot update someone else\'s community settings -> 403
  const otherDevUpdateRes = await fetch(`${baseUrl}/api/communities/${commId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${otherDevSession.token}`
    },
    body: JSON.stringify({ name: 'Tampered by Other Dev' })
  });
  assert.equal(otherDevUpdateRes.status, 403);

  // 3. Creator can update community details -> 200
  const creatorUpdateRes = await fetch(`${baseUrl}/api/communities/${commId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorSession.token}`
    },
    body: JSON.stringify({
      name: 'Madhapur Grade-A Commercial Asset Hub',
      description: 'Verified cap-rate analyses for Hitec City and Madhapur IT parks.'
    })
  });
  assert.equal(creatorUpdateRes.status, 200);
  const updatedData = await creatorUpdateRes.json();
  assert.equal(updatedData.community.name, 'Madhapur Grade-A Commercial Asset Hub');

  // 4. Super Admin can update community settings -> 200
  const adminUpdateRes = await fetch(`${baseUrl}/api/communities/${commId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    },
    body: JSON.stringify({
      location: 'Madhapur & HITEC City, Hyderabad'
    })
  });
  assert.equal(adminUpdateRes.status, 200);
});

test('Public vs Private Community Joining & Private Post Security Enforcement', async () => {
  const seeker1 = await createUser({
    name: 'Seeker Suresh',
    email: `seeker_join1_${Date.now()}@example.com`,
    phone: '+919988112209',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seeker1Session = await createSession(seeker1.id);

  const seeker2 = await createUser({
    name: 'Seeker Kavita',
    email: `seeker_join2_${Date.now()}@example.com`,
    phone: '+919988112210',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seeker2Session = await createSession(seeker2.id);

  const creatorAgent = await createUser({
    name: 'Agent Creator Naresh',
    email: `agent_priv_creator_${Date.now()}@example.com`,
    phone: '+919988112211',
    role: 'AGENT',
    password: 'Password123!',
    isVerified: true
  });
  const creatorSession = await createSession(creatorAgent.id);

  // 1. Create a Public Community and a Private Community
  const pubRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorSession.token}`
    },
    body: JSON.stringify({
      name: 'Kollur Luxury Villa Corridor',
      category: 'Villas & Gated Communities',
      location: 'Kollur, Outer Ring Road',
      description: 'Public community for villa buyers in Kollur.',
      visibility: 'PUBLIC'
    })
  });
  const pubCommId = (await pubRes.json()).community.id;

  const privRes = await fetch(`${baseUrl}/api/communities`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorSession.token}`
    },
    body: JSON.stringify({
      name: 'Neopolis Land Pre-Launch Syndicate',
      category: 'Investor Syndicate',
      location: 'Neopolis Phase 2',
      description: 'Private closed investment circle.',
      visibility: 'PRIVATE'
    })
  });
  const privCommId = (await privRes.json()).community.id;

  // 2. Seeker 1 joins Public Community -> Immediate ACTIVE
  const joinPubRes = await fetch(`${baseUrl}/api/communities/${pubCommId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seeker1Session.token}` }
  });
  assert.equal(joinPubRes.status, 200);
  const joinPubData = await joinPubRes.json();
  assert.equal(joinPubData.status, 'ACTIVE');

  // Verify member count incremented
  const pubHub = await getCommunityById(pubCommId, seeker1.id);
  assert.ok(pubHub);
  assert.equal(pubHub.membership_status, 'ACTIVE');
  assert.equal(pubHub.member_count, 2); // Creator + Seeker 1

  // 3. Seeker 1 joins Private Community -> Status is PENDING
  const joinPrivRes = await fetch(`${baseUrl}/api/communities/${privCommId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seeker1Session.token}` }
  });
  assert.equal(joinPrivRes.status, 200);
  const joinPrivData = await joinPrivRes.json();
  assert.equal(joinPrivData.status, 'PENDING');

  // While PENDING, Seeker 1 cannot post in private community -> 403
  const pendingPostRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seeker1Session.token}`
    },
    body: JSON.stringify({
      title: 'Premature Private Question',
      content: 'Can I see the pre-launch rates?',
      topic: 'Kokapet & Neopolis',
      communityId: privCommId
    })
  });
  assert.equal(pendingPostRes.status, 403);

  // 4. Creator lists members and approves Seeker 1
  const membersRes = await fetch(`${baseUrl}/api/communities/${privCommId}/members`, {
    headers: { Authorization: `Bearer ${creatorSession.token}` }
  });
  assert.equal(membersRes.status, 200);
  const membersData = await membersRes.json();
  const pendingMember = membersData.members.find((m: any) => m.userId === seeker1.id);
  assert.ok(pendingMember);
  assert.equal(pendingMember.status, 'PENDING');

  // Creator approves member
  const approveRes = await fetch(`${baseUrl}/api/communities/${privCommId}/members/${seeker1.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${creatorSession.token}`
    },
    body: JSON.stringify({ status: 'ACTIVE' })
  });
  assert.equal(approveRes.status, 200);

  // 5. Now Seeker 1 is ACTIVE in private community: can post successfully!
  const activePostRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seeker1Session.token}`
    },
    body: JSON.stringify({
      title: 'Neopolis Phase 2 Land Auction Estimates',
      content: 'What are the expected bids per square yard for the upcoming auction?',
      topic: 'Price Trends & Market Updates',
      communityId: privCommId,
      visibility: 'COMMUNITY'
    })
  });
  assert.equal(activePostRes.status, 200);
  const privatePost = (await activePostRes.json()).post;
  assert.ok(privatePost?.id);

  // 6. Seeker 2 (NOT a member) is blocked from viewing private post directly -> 403
  const seeker2ViewRes = await fetch(`${baseUrl}/api/community/posts/${privatePost.id}`, {
    headers: { Authorization: `Bearer ${seeker2Session.token}` }
  });
  assert.equal(seeker2ViewRes.status, 403);

  // Seeker 2 is blocked from commenting on private post -> 403
  const seeker2CommentRes = await fetch(`${baseUrl}/api/community/posts/${privatePost.id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seeker2Session.token}`
    },
    body: JSON.stringify({ content: 'Unauthorized intruder comment' })
  });
  assert.equal(seeker2CommentRes.status, 403);

  // 7. Active member Seeker 1 can comment on the private post -> 200
  const seeker1CommentRes = await fetch(`${baseUrl}/api/community/posts/${privatePost.id}/reply`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seeker1Session.token}`
    },
    body: JSON.stringify({ content: 'I estimate bids will touch 1.15 lakh per sq yd.' })
  });
  assert.equal(seeker1CommentRes.status, 200);

  // 8. Seeker 1 leaves the public community -> 200
  const leavePubRes = await fetch(`${baseUrl}/api/communities/${pubCommId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${seeker1Session.token}` }
  });
  assert.equal(leavePubRes.status, 200);

  // Creator cannot leave their own community -> 400
  const creatorLeaveRes = await fetch(`${baseUrl}/api/communities/${privCommId}/leave`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${creatorSession.token}` }
  });
  assert.equal(creatorLeaveRes.status, 400);
});

test('Discussion Reposting: Attribution, Count persistence, Duplicate Prevention, and Feed integration', async () => {
  const authorUser = await createUser({
    name: 'Architect Ramesh',
    email: `architect_${Date.now()}@example.com`,
    phone: '+919988112212',
    role: 'AGENT',
    organization: 'Kolli Architectural Consultancy',
    password: 'Password123!',
    isVerified: true
  });
  const authorSession = await createSession(authorUser.id);

  const seekerUser = await createUser({
    name: 'Seeker Deepak',
    email: `seeker_repost_${Date.now()}@example.com`,
    phone: '+919988112213',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seekerUser.id);

  // 1. Author posts a public architectural analysis
  const postRes = await fetch(`${baseUrl}/api/community/posts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authorSession.token}`
    },
    body: JSON.stringify({
      title: 'Structural Vaastu & Cross-Ventilation in High-Rise Towers',
      content: 'Detailed analysis of Southwest corner load balancing and East-facing balcony airflow dynamics.',
      topic: 'Architecture & Vaastu',
      visibility: 'PUBLIC'
    })
  });
  assert.equal(postRes.status, 200);
  const postId = (await postRes.json()).post.id;

  // 2. Seeker reposts the discussion -> returns success and reposted: true
  const repost1Res = await fetch(`${baseUrl}/api/community/posts/${postId}/repost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ note: 'Crucial Vaastu insights for floor plan evaluation.' })
  });
  assert.equal(repost1Res.status, 200);
  const repost1Data = await repost1Res.json();
  assert.equal(repost1Data.success, true);
  assert.equal(repost1Data.reposted, true);
  assert.equal(repost1Data.count, 1);

  // 3. Second repost call toggles it off (duplicate prevention) -> returns reposted: false, count: 0
  const repost2Res = await fetch(`${baseUrl}/api/community/posts/${postId}/repost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    }
  });
  assert.equal(repost2Res.status, 200);
  const repost2Data = await repost2Res.json();
  assert.equal(repost2Data.success, true);
  assert.equal(repost2Data.reposted, false);
  assert.equal(repost2Data.count, 0);

  // 4. Repost again to keep it active
  const repost3Res = await fetch(`${baseUrl}/api/community/posts/${postId}/repost`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${seekerSession.token}`
    },
    body: JSON.stringify({ note: 'Recommended read for high-rise buyers.' })
  });
  assert.equal((await repost3Res.json()).reposted, true);

  // 5. Seeker fetches their discussion reposts (`/api/me/discussion-reposts`)
  const userRepostsRes = await fetch(`${baseUrl}/api/me/discussion-reposts`, {
    headers: { Authorization: `Bearer ${seekerSession.token}` }
  });
  assert.equal(userRepostsRes.status, 200);
  const userRepostsData = await userRepostsRes.json();
  assert.ok(Array.isArray(userRepostsData.reposts));
  assert.equal(userRepostsData.reposts.length, 1);

  const myRepost = userRepostsData.reposts[0];
  assert.equal(myRepost.postId, postId);
  assert.equal(myRepost.title, 'Structural Vaastu & Cross-Ventilation in High-Rise Towers');
  // Attribution is preserved:
  assert.equal(myRepost.originalAuthorName, 'Architect Ramesh');
  assert.equal(myRepost.originalAuthorRole, 'AGENT');
  assert.equal(myRepost.topic, 'Architecture & Vaastu');
  assert.ok(myRepost.shareLink.includes(postId));
  assert.equal(myRepost.note, 'Recommended read for high-rise buyers.');
});
