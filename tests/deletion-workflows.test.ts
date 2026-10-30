import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');

test('database schema supports non-destructive requirement and post deletion columns', () => {
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deleted_at/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deleted_by/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_status/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_reason/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_requested_at/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_requested_by/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_reviewed_at/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_reviewed_by/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS deletion_rejection_reason/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ADD COLUMN IF NOT EXISTS previous_status/);
});

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-deletion-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

const {
  initDatabase,
  createUser,
  findUserById,
  getUserNotifications,
  getPostById
} = await import('../src/server/db.ts');
await initDatabase();

const password = 'DeletionWorkflowPass123!';

const seeker = await createUser({
  name: 'Requirement Owner Seeker',
  email: 'deletion.seeker@example.com',
  phone: '+919111122233',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const peer = await createUser({
  name: 'Independent Peer Seeker',
  email: 'deletion.peer@example.com',
  phone: '+919111122244',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const admin = await createUser({
  name: 'Workflow Super Admin',
  email: 'deletion.admin@example.com',
  phone: '+919111122255',
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

test('Property Seeker requirement direct soft-deletion workflow', async (t) => {
  const seekerCookie = await login(seeker.email);
  const peerCookie = await login(peer.email);
  const adminCookie = await login(admin.email);

  // 1. Create a requirement
  const createRes = await api('POST', '/api/requirements', {
    propertyType: 'Villa',
    location: 'Kokapet, Hyderabad',
    budget: '₹4.5 Cr - ₹6 Cr',
    details: 'Looking for west-facing high-floor villa with 4 car parks.'
  }, seekerCookie);
  assert.equal(createRes.status, 201, JSON.stringify(createRes.json));
  const reqId = createRes.json.requirement.id;
  assert.ok(reqId);
  assert.equal(createRes.json.requirement.status, 'ACTIVE');

  // Verify requirement appears in active list
  const activeListBefore = await api('GET', '/api/requirements', undefined, seekerCookie);
  assert.equal(activeListBefore.status, 200);
  assert.equal(activeListBefore.json.requirements.some((r: any) => r.id === reqId), true);

  // 2. Peer attempting to delete requirement fails (404)
  const peerDelete = await api('DELETE', `/api/requirements/${reqId}`, undefined, peerCookie);
  assert.equal(peerDelete.status, 404);

  // 3. Seeker deletes their own requirement
  const deleteRes = await api('DELETE', `/api/requirements/${reqId}`, undefined, seekerCookie);
  assert.equal(deleteRes.status, 200, JSON.stringify(deleteRes.json));
  assert.equal(deleteRes.json.success, true);
  assert.equal(deleteRes.json.requirement.status, 'DELETED');
  assert.ok(deleteRes.json.requirement.deletedAt);
  assert.equal(deleteRes.json.requirement.deletedBy, seeker.id);

  // 4. Deleted requirement is excluded from active requirement list
  const activeListAfter = await api('GET', '/api/requirements', undefined, seekerCookie);
  assert.equal(activeListAfter.status, 200);
  assert.equal(activeListAfter.json.requirements.some((r: any) => r.id === reqId), false);

  // 5. Admin can still inspect historical requirement in admin list
  const adminList = await api('GET', '/api/admin/requirements', undefined, adminCookie);
  assert.equal(adminList.status, 200);
  const archivedReq = adminList.json.requirements.find((r: any) => r.id === reqId);
  assert.ok(archivedReq);
  assert.equal(archivedReq.status, 'DELETED');

  // 6. Verify seeker in-app notification
  const seekerNotifs = await getUserNotifications(seeker.id);
  assert.equal(seekerNotifs.some(n => n.title === 'Requirement Removed'), true);
});

test('Community Post owner deletion request & Super Admin approval workflow', async (t) => {
  t.after(() => new Promise<void>(resolve => (server as Server).close(() => resolve())));

  const seekerCookie = await login(seeker.email);
  const peerCookie = await login(peer.email);
  const adminCookie = await login(admin.email);

  // 1. Create a community post as seeker and approve it
  const createPostRes = await api('POST', '/api/community/posts', {
    title: 'Kokapet high-rise foundation structural query',
    content: 'Are builders using diaphragm walls or conventional piling in Kokapet Neopolis sector?',
    topic: 'High-Rise Construction'
  }, seekerCookie);
  assert.equal(createPostRes.status, 200, JSON.stringify(createPostRes.json));
  const postId = createPostRes.json.post?.id || createPostRes.json.id;

  // Approve post so it is live
  const approveRes = await api('PATCH', `/api/admin/posts/${postId}/moderation`, {
    status: 'APPROVED'
  }, adminCookie);
  assert.equal(approveRes.status, 200, JSON.stringify(approveRes.json));

  // 2. Author attempts direct deletion via DELETE /api/community/posts/:id -> 403 Forbidden
  const directDelete = await api('DELETE', `/api/community/posts/${postId}`, undefined, seekerCookie);
  assert.equal(directDelete.status, 403, 'Author should not be allowed to directly bypass deletion approval');
  assert.match(directDelete.json.error, /Direct post deletion is disabled for post owners/);

  // 3. Validation on deletion request:
  // Missing reason
  const badReq1 = await api('POST', `/api/community/posts/${postId}/request-deletion`, {}, seekerCookie);
  assert.equal(badReq1.status, 400);

  // Too short reason (< 10 chars)
  const badReq2 = await api('POST', `/api/community/posts/${postId}/request-deletion`, { reason: 'Too short' }, seekerCookie);
  assert.equal(badReq2.status, 400);
  assert.match(badReq2.json.error, /between 10 and 500 characters/);

  // Non-owner requesting deletion -> 403
  const badReq3 = await api('POST', `/api/community/posts/${postId}/request-deletion`, {
    reason: 'I do not own this post but want it gone'
  }, peerCookie);
  assert.equal(badReq3.status, 403);
  assert.match(badReq3.json.error, /Only the post author can request deletion/);

  // 4. Valid deletion request by author
  const deletionReason = 'Structural analysis verified by structural consultant; question no longer needed.';
  const validReq = await api('POST', `/api/community/posts/${postId}/request-deletion`, {
    reason: deletionReason
  }, seekerCookie);
  assert.equal(validReq.status, 200, JSON.stringify(validReq.json));
  assert.equal(validReq.json.success, true);
  assert.equal(validReq.json.post.status, 'PENDING_DELETION');
  assert.equal(validReq.json.post.deletionStatus, 'PENDING');
  assert.equal(validReq.json.post.deletionReason, deletionReason);
  assert.equal(validReq.json.post.previousStatus, 'APPROVED');

  // Duplicate deletion request returns 409 Conflict
  const duplicateReq = await api('POST', `/api/community/posts/${postId}/request-deletion`, {
    reason: deletionReason
  }, seekerCookie);
  assert.equal(duplicateReq.status, 409);

  // 5. Pending deletion post remains visible to community feed
  const publicFeed = await api('GET', '/api/community/posts', undefined, peerCookie);
  assert.equal(publicFeed.status, 200);
  const feedPost = publicFeed.json.posts.find((p: any) => p.id === postId);
  assert.ok(feedPost, 'Pending deletion post must remain visible to eligible audience');
  assert.equal(feedPost.status, 'PENDING_DELETION');

  // 6. Moderation queue exposes the deletion request
  const modQueue = await api('GET', '/api/admin/moderation/queue', undefined, adminCookie);
  assert.equal(modQueue.status, 200);
  assert.ok(Array.isArray(modQueue.json.deletionRequests));
  const queueItem = modQueue.json.deletionRequests.find((r: any) => r.id === postId);
  assert.ok(queueItem, 'Deletion request must appear in admin moderation queue');
  assert.equal(queueItem.deletion_reason || queueItem.deletionReason, deletionReason);

  // Dedicated deletion requests endpoint
  const dedicatedRequests = await api('GET', '/api/admin/posts/deletion-requests', undefined, adminCookie);
  assert.equal(dedicatedRequests.status, 200);
  assert.equal(dedicatedRequests.json.requests.some((r: any) => r.id === postId), true);

  // 7. Super Admin rejects deletion request with mandatory reason
  // Reject without reason fails (400)
  const emptyReject = await api('POST', `/api/admin/posts/${postId}/reject-deletion`, {}, adminCookie);
  assert.equal(emptyReject.status, 400);

  const rejectionReason = 'Discussion thread has 3 valuable community replies; post kept for archival clarity.';
  const rejectRes = await api('POST', `/api/admin/posts/${postId}/reject-deletion`, {
    reason: rejectionReason
  }, adminCookie);
  assert.equal(rejectRes.status, 200, JSON.stringify(rejectRes.json));
  assert.equal(rejectRes.json.success, true);
  assert.equal(rejectRes.json.post.status, 'APPROVED', 'Post status must be restored to previous status');
  assert.equal(rejectRes.json.post.deletionStatus, 'REJECTED');
  assert.equal(rejectRes.json.post.deletionRejectionReason, rejectionReason);

  // Verify author received rejection notification
  const seekerNotifsAfterReject = await getUserNotifications(seeker.id);
  assert.equal(seekerNotifsAfterReject.some(n => n.title === 'Post Deletion Request Declined'), true);

  // 8. Author submits deletion request again, and Super Admin approves
  const reRequest = await api('POST', `/api/community/posts/${postId}/request-deletion`, {
    reason: 'Updated: confidential soil test data mistakenly cited in content.'
  }, seekerCookie);
  assert.equal(reRequest.status, 200);

  // Peer calling approve-deletion fails (403)
  const peerApprove = await api('POST', `/api/admin/posts/${postId}/approve-deletion`, {}, peerCookie);
  assert.equal(peerApprove.status, 403);

  // Super Admin approves deletion
  const approveDeletion = await api('POST', `/api/admin/posts/${postId}/approve-deletion`, {}, adminCookie);
  assert.equal(approveDeletion.status, 200, JSON.stringify(approveDeletion.json));
  assert.equal(approveDeletion.json.success, true);
  assert.equal(approveDeletion.json.post.status, 'DELETED');
  assert.equal(approveDeletion.json.post.deletionStatus, 'APPROVED');

  // 9. Post is soft-deleted: removed from public feed
  const publicFeedAfterApproval = await api('GET', '/api/community/posts', undefined, peerCookie);
  assert.equal(publicFeedAfterApproval.status, 200);
  assert.equal(publicFeedAfterApproval.json.posts.some((p: any) => p.id === postId), false, 'Approved deleted post must not be in public feed');

  // Database record is preserved (NOT deleted permanently)
  const dbRecord = await getPostById(postId);
  assert.ok(dbRecord, 'Post record must be preserved in database (soft delete)');
  assert.equal(dbRecord.status, 'DELETED');
  assert.equal(dbRecord.deletionStatus, 'APPROVED');

  // Author received approval notification
  const seekerNotifsFinal = await getUserNotifications(seeker.id);
  assert.equal(seekerNotifsFinal.some(n => n.title === 'Post Deletion Approved'), true);

  // 10. Super Admin direct deletion capability check
  const officialPost = await api('POST', '/api/community/posts', {
    title: 'Official Super Admin Notice',
    content: 'Temporary advisory on Kokapet Neopolis link road construction.',
    topic: 'Livability & Amenities'
  }, adminCookie);
  assert.equal(officialPost.status, 200);
  const officialPostId = officialPost.json.post?.id || officialPost.json.id;

  const adminDirectDelete = await api('DELETE', `/api/community/posts/${officialPostId}`, undefined, adminCookie);
  assert.equal(adminDirectDelete.status, 200);
  const deletedOfficialPost = await getPostById(officialPostId);
  assert.ok(deletedOfficialPost);
  assert.equal(deletedOfficialPost.status, 'DELETED');
});
