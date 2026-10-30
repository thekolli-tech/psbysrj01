import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import test, { after } from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');

test('Module 10.6: Database schema supports nested comments, avatars, and non-destructive deletion', () => {
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS author_avatar TEXT/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS is_deleted SMALLINT DEFAULT 0/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS deleted_by VARCHAR\(64\)/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE community_comments ADD COLUMN IF NOT EXISTS original_content TEXT/);
});

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-reddit-discussion-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

const {
  initDatabase,
  createUser,
  createCommunity,
  createComment,
  getCommentsForPost,
  getCommentById,
  updateComment,
  deleteComment
} = await import('../src/server/db.ts');
await initDatabase();

const password = 'DiscussionWorkflowPass123!';

const author = await createUser({
  name: 'Discussion Author Seeker',
  email: 'discussion.author@example.com',
  phone: '+919222233344',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const commenter1 = await createUser({
  name: 'Active Commenter One',
  email: 'commenter1@example.com',
  phone: '+919222233355',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const commenter2 = await createUser({
  name: 'Nested Replier Two',
  email: 'commenter2@example.com',
  phone: '+919222233366',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});

const admin = await createUser({
  name: 'Super Admin Moderator',
  email: 'discussion.admin@example.com',
  phone: '+919222233377',
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
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(cookie ? { Cookie: cookie } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: response.status, headers: response.headers, json };
}

async function loginUser(email: string) {
  const loginRes = await api('POST', '/api/auth/login', { email, password });
  assert.equal(loginRes.status, 200, `Login failed for ${email}`);
  const raw = loginRes.headers.get('set-cookie');
  assert.ok(raw, 'Expected set-cookie header');
  return raw.split(';')[0];
}

const authorCookie = await loginUser(author.email);
const commenter1Cookie = await loginUser(commenter1.email);
const commenter2Cookie = await loginUser(commenter2.email);
const adminCookie = await loginUser(admin.email);

// Create an approved discussion post
const postRes = await api(
  'POST',
  '/api/community/posts',
  {
    title: 'How should I verify a property title before purchasing in Kokapet?',
    content: 'Looking for verified legal guidelines, Dharani / TG RERA search procedures, and parent deed inspection advice.',
    topic: 'Legal & RERA',
    visibility: 'PUBLIC'
  },
  adminCookie // admin creates as approved
);
assert.equal(postRes.status, 200);
const post1Id = postRes.json.post.id;

// Create a second discussion post to test cross-discussion injection prevention
const post2Res = await api(
  'POST',
  '/api/community/posts',
  {
    title: 'Water infrastructure and flood zones in Tellapur & Mokila',
    content: 'Discussion on drainage corridors, HMWSSB water connections, and underground sump planning.',
    topic: 'Livability & Amenities',
    visibility: 'PUBLIC'
  },
  adminCookie
);
assert.equal(post2Res.status, 200);
const post2Id = post2Res.json.post.id;

test('Module 10.1: Discussion detail endpoint returns complete original question and metadata', async () => {
  const res = await api('GET', `/api/community/posts/${post1Id}`, undefined, commenter1Cookie);
  assert.equal(res.status, 200);
  assert.equal(res.json.post.id, post1Id);
  assert.equal(res.json.post.title, 'How should I verify a property title before purchasing in Kokapet?');
  assert.ok(res.json.post.content.includes('Dharani / TG RERA search'));
  assert.equal(res.json.post.topic, 'Legal & RERA');
});

test('Module 10.3: User can submit a top-level comment and comment count increments', async () => {
  const commentRes = await api(
    'POST',
    `/api/community/posts/${post1Id}/comments`,
    {
      content: 'Always check the 30-year Encumbrance Certificate (EC) directly from the sub-registrar portal before paying advance.'
    },
    commenter1Cookie
  );
  assert.equal(commentRes.status, 200);
  assert.equal(commentRes.json.success, true);
  assert.equal(commentRes.json.comment.authorName, commenter1.name);
  assert.equal(commentRes.json.comment.parentId, null);
  assert.equal(commentRes.json.comment.postId, post1Id);

  // Check comments count updated
  const postCheck = await api('GET', `/api/community/posts/${post1Id}`, undefined, commenter1Cookie);
  assert.equal(postCheck.json.post.commentsCount, 1);
});

test('Module 10.2: User can reply to a top-level comment and replies attach to correct parent', async () => {
  const commentsRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  assert.equal(commentsRes.status, 200);
  const rootComment = commentsRes.json.comments[0];
  assert.ok(rootComment, 'Expected at least 1 root comment');

  const replyRes = await api(
    'POST',
    `/api/community/posts/${post1Id}/comments`,
    {
      content: 'Also make sure to check Link Documents going back at least 34 years to rule out ancestral partition disputes.',
      parentId: rootComment.id
    },
    commenter2Cookie
  );
  assert.equal(replyRes.status, 200);
  assert.equal(replyRes.json.success, true);
  assert.equal(replyRes.json.comment.parentId, rootComment.id);

  // Check tree structure
  const updatedTree = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  assert.equal(updatedTree.status, 200);
  assert.equal(updatedTree.json.comments.length, 1, 'Still 1 root comment');
  assert.equal(updatedTree.json.comments[0].replies.length, 1, 'Root comment has 1 nested reply');
  assert.equal(updatedTree.json.comments[0].replies[0].id, replyRes.json.comment.id);
  assert.equal(updatedTree.json.totalComments, 2);
});

test('Module 10.2: User can reply to another reply (multi-level deep threading)', async () => {
  const commentsRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const rootComment = commentsRes.json.comments[0];
  const reply1 = rootComment.replies[0];

  const subReplyRes = await api(
    'POST',
    `/api/community/posts/${post1Id}/comments`,
    {
      content: 'Agreed! Revenue records (Pahani / ROR-1B) are also vital if the land was converted from agricultural.',
      parentId: reply1.id
    },
    authorCookie
  );
  assert.equal(subReplyRes.status, 200);
  assert.equal(subReplyRes.json.success, true);
  assert.equal(subReplyRes.json.comment.parentId, reply1.id);

  // Check 3-level deep tree
  const treeRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const root = treeRes.json.comments[0];
  assert.equal(root.replies.length, 1);
  const level1 = root.replies[0];
  assert.equal(level1.replies.length, 1, 'Level 1 has 1 nested grandchild reply');
  assert.equal(level1.replies[0].id, subReplyRes.json.comment.id);
  assert.equal(treeRes.json.totalComments, 3);
});

test('Module 10.6: Cross-discussion reply injection is rejected with HTTP 400', async () => {
  const commentsRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const post1CommentId = commentsRes.json.comments[0].id;

  // Attempt to attach a reply to post2 using a parentId from post1
  const injectionRes = await api(
    'POST',
    `/api/community/posts/${post2Id}/comments`,
    {
      content: 'Malicious attempt to attach to parent from another post',
      parentId: post1CommentId
    },
    commenter2Cookie
  );
  assert.equal(injectionRes.status, 400);
  assert.match(injectionRes.json.error, /Parent comment does not belong to this discussion/i);
});

test('Module 10.6: Non-existent parentId returns HTTP 404', async () => {
  const badParentRes = await api(
    'POST',
    `/api/community/posts/${post1Id}/comments`,
    {
      content: 'Attempt to attach to non-existent parent',
      parentId: 'comm_nonexistent_9999'
    },
    commenter2Cookie
  );
  assert.equal(badParentRes.status, 404);
  assert.match(badParentRes.json.error, /Parent comment not found/i);
});

test('Module 10.6: Private community discussions require membership to view and comment', async () => {
  // Create a private community
  const privComm = await createCommunity({
    name: 'Ultra High Net Worth Syndicate Circle',
    category: 'Investment Syndicate',
    description: 'Private syndicated real estate acquisitions in Hyderabad Financial District.',
    visibility: 'PRIVATE',
    status: 'APPROVED',
    createdById: admin.id,
    createdByName: admin.name
  });

  // Create a post in private community
  const privPostRes = await api(
    'POST',
    '/api/community/posts',
    {
      title: 'Off-Market 10 Acre Land Syndicate in Mokila',
      content: 'Confidential syndicate opportunity with clear agricultural NOC and master plan zone clearance.',
      topic: 'Land & Plotting Guidelines',
      communityId: privComm.id,
      visibility: 'COMMUNITY'
    },
    adminCookie
  );
  assert.equal(privPostRes.status, 200);
  const privPostId = privPostRes.json.post.id;

  // Non-member commenter1 attempts to view comments -> 403
  const guestCommentsRes = await api('GET', `/api/community/posts/${privPostId}/comments`, undefined, commenter1Cookie);
  assert.equal(guestCommentsRes.status, 403);
  assert.match(guestCommentsRes.json.error, /private community/i);

  // Non-member attempts to post a comment -> 403
  const guestPostCommentRes = await api(
    'POST',
    `/api/community/posts/${privPostId}/comments`,
    { content: 'Disallowed attempt to comment in private hub' },
    commenter1Cookie
  );
  assert.equal(guestPostCommentRes.status, 403);
  assert.match(guestPostCommentRes.json.error, /private community/i);
});

test('Module 10.4: User can edit own comment and cannot edit other users comments', async () => {
  const commentsRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const commenter1Comment = commentsRes.json.comments[0];

  // Commenter 2 tries to edit commenter 1's comment -> 403
  const unauthorizedEdit = await api(
    'PATCH',
    `/api/community/comments/${commenter1Comment.id}`,
    { content: 'Unauthorized edit attempt' },
    commenter2Cookie
  );
  assert.equal(unauthorizedEdit.status, 403);

  // Commenter 1 edits own comment -> 200
  const validEdit = await api(
    'PATCH',
    `/api/community/comments/${commenter1Comment.id}`,
    { content: 'Always check the 30-year Encumbrance Certificate (EC) directly from IGRS Telangana portal.' },
    commenter1Cookie
  );
  assert.equal(validEdit.status, 200);
  assert.equal(validEdit.json.comment.content, 'Always check the 30-year Encumbrance Certificate (EC) directly from IGRS Telangana portal.');
});

test('Module 10.4: Comment deletion preserves reply tree with non-destructive placeholder', async () => {
  const commentsRes = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const parentComment = commentsRes.json.comments[0];
  assert.ok(parentComment.replies.length > 0, 'Parent must have replies to test non-destructive placeholder');
  const childReplyId = parentComment.replies[0].id;

  // Delete parent comment
  const deleteRes = await api('DELETE', `/api/community/comments/${parentComment.id}`, undefined, commenter1Cookie);
  assert.equal(deleteRes.status, 200);

  // Verify tree: parent is placeholder, child replies remain attached!
  const updatedTree = await api('GET', `/api/community/posts/${post1Id}/comments`, undefined, commenter1Cookie);
  const deletedParent = updatedTree.json.comments[0];
  assert.equal(deletedParent.id, parentComment.id);
  assert.equal(deletedParent.isDeleted, true);
  assert.equal(deletedParent.content, '[This comment was deleted by the author]');
  assert.equal(deletedParent.authorName, '[deleted]');
  assert.equal(deletedParent.replies.length, 1, 'Child reply preserved under deleted parent');
  assert.equal(deletedParent.replies[0].id, childReplyId);

  // Delete leaf comment without replies: MUST BE SOFT DELETED, NEVER PURGED FROM DATABASE
  const deleteLeafRes = await api('DELETE', `/api/community/comments/${childReplyId}`, undefined, commenter2Cookie);
  assert.equal(deleteLeafRes.status, 200);

  // Verify database record still exists in SQLite / Postgres with is_deleted = 1 and original_content preserved
  const leafInDb = await getCommentById(childReplyId);
  assert.ok(leafInDb, 'Leaf comment MUST NEVER be permanently purged from database');
  assert.equal(leafInDb.is_deleted, 1);
  assert.ok(leafInDb.original_content, 'Original comment content must be preserved for audit history');
  assert.equal(leafInDb.deleted_by, commenter2.id);

  // Check post active comments count decremented (from 2 to 1 because grandchild reply is still active)
  const postAfterLeafDelete = await api('GET', `/api/community/posts/${post1Id}`, undefined, commenter1Cookie);
  assert.equal(postAfterLeafDelete.json.post.commentsCount, 1);

  // Restore comment through restoration endpoint
  const restoreRes = await api('POST', `/api/community/comments/${childReplyId}/restore`, undefined, commenter2Cookie);
  assert.equal(restoreRes.status, 200);

  const restoredLeaf = await getCommentById(childReplyId);
  assert.ok(restoredLeaf, 'Restored comment must exist in database');
  assert.equal(restoredLeaf.is_deleted, 0);
  assert.equal(restoredLeaf.content, restoredLeaf.original_content);

  // Check post active comments count restored (back to 2)
  const postAfterRestore = await api('GET', `/api/community/posts/${post1Id}`, undefined, commenter1Cookie);
  assert.equal(postAfterRestore.json.post.commentsCount, 2);
});

test('Module 10.5: Sorting by best, newest, oldest works properly', async () => {
  // Create 3 top-level comments on post2 with varying likes
  const cA = await api('POST', `/api/community/posts/${post2Id}/comments`, { content: 'Comment A: Tellapur pipeline' }, commenter1Cookie);
  const cB = await api('POST', `/api/community/posts/${post2Id}/comments`, { content: 'Comment B: Mokila groundwater' }, commenter2Cookie);
  const cC = await api('POST', `/api/community/posts/${post2Id}/comments`, { content: 'Comment C: Drainage gradients' }, authorCookie);

  // Like Comment B twice
  await api('POST', `/api/community/comments/${cB.json.comment.id}/like`, undefined, authorCookie);
  await api('POST', `/api/community/comments/${cB.json.comment.id}/like`, undefined, commenter1Cookie);

  // Sort best: Comment B should be first
  const bestRes = await api('GET', `/api/community/posts/${post2Id}/comments?sort=best`, undefined, commenter1Cookie);
  assert.equal(bestRes.status, 200);
  assert.equal(bestRes.json.comments[0].id, cB.json.comment.id);

  // Sort newest: Comment C should be first
  const newestRes = await api('GET', `/api/community/posts/${post2Id}/comments?sort=newest`, undefined, commenter1Cookie);
  assert.equal(newestRes.status, 200);
  assert.equal(newestRes.json.comments[0].id, cC.json.comment.id);

  // Sort oldest: Comment A should be first
  const oldestRes = await api('GET', `/api/community/posts/${post2Id}/comments?sort=oldest`, undefined, commenter1Cookie);
  assert.equal(oldestRes.status, 200);
  assert.equal(oldestRes.json.comments[0].id, cA.json.comment.id);
});

test('Module 10.5: Pagination does not duplicate or omit comments', async () => {
  const page1 = await api('GET', `/api/community/posts/${post2Id}/comments?sort=oldest&limit=2&page=1`, undefined, commenter1Cookie);
  assert.equal(page1.status, 200);
  assert.equal(page1.json.comments.length, 2);
  assert.equal(page1.json.hasMore, true);
  assert.equal(page1.json.totalRoots, 3);

  const page2 = await api('GET', `/api/community/posts/${post2Id}/comments?sort=oldest&limit=2&page=2`, undefined, commenter1Cookie);
  assert.equal(page2.status, 200);
  assert.equal(page2.json.comments.length, 1);
  assert.equal(page2.json.hasMore, false);

  // Verify no overlap
  const p1Ids = page1.json.comments.map((c: any) => c.id);
  const p2Ids = page2.json.comments.map((c: any) => c.id);
  for (const id of p2Ids) {
    assert.equal(p1Ids.includes(id), false, `Page 2 comment ${id} duplicated from page 1`);
  }
});

test('Module 9 & 10.1: Frontend DiscussionDetailView component integrates all requirements', () => {
  const detailFile = readFileSync(join(root, 'src/components/community/DiscussionDetailView.tsx'), 'utf8');
  const forumFile = readFileSync(join(root, 'src/components/community/CommunityForum.tsx'), 'utf8');
  // Complete detail view and back navigation
  assert.match(detailFile, /Back to Discussions Feed/);
  assert.match(detailFile, /Discussion Comments/);
  // Separation of question and comments
  assert.match(detailFile, /Main Discussion Post Card/);
  // Composer with loading state
  assert.match(detailFile, /Commenting\.\.\./);
  assert.match(detailFile, /Replying\.\.\./);
  assert.match(forumFile, /Posting\.\.\./);
  assert.match(forumFile, /Publishing\.\.\./);
  assert.match(detailFile, /Reposting\.\.\./);
  assert.match(detailFile, /Saving\.\.\./);
  // Thread indentation clamp for mobile
  assert.match(detailFile, /depth >= 4/);
  // Non-destructive placeholder
  assert.match(detailFile, /\[This comment was deleted by the author\]/);
  // Sort modes
  assert.match(detailFile, /Best Comments/);
  assert.match(detailFile, /Newest First/);
  assert.match(detailFile, /Oldest First/);
  // Pagination
  assert.match(detailFile, /Load More Comments/);
});

after(() => {
  server.close();
});
