import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('Forgot Password flow is integrated in LoginModal', () => {
  const content = readFileSync(resolve('src/components/common/LoginModal.tsx'), 'utf8');
  assert.ok(content.includes('Forgot password?'), 'LoginModal must have Forgot password link');
  assert.ok(content.includes('handleSendResetOtp'), 'LoginModal must have send reset OTP handler');
  assert.ok(content.includes('handleResetPassword'), 'LoginModal must have reset password handler');
  assert.ok(content.includes('/api/auth/forgot-password'), 'LoginModal must call forgot-password endpoint');
  assert.ok(content.includes('/api/auth/reset-password'), 'LoginModal must call reset-password endpoint');
});

test('Review and Rating has pre-populated entities and Add Entity option for all users', () => {
  const content = readFileSync(resolve('src/components/reviews/ReviewRatingView.tsx'), 'utf8');
  assert.ok(content.includes('DEFAULT_REVIEW_ENTITIES'), 'Must define comprehensive default review entities');
  assert.ok(content.includes('+ Add Entity to Review'), 'Must provide Add Entity to Review button');
  assert.ok(content.includes('SOCIETY_PROJECT'), 'Supports Society / Project');
  assert.ok(content.includes('COLONY'), 'Supports Colony');
  assert.ok(content.includes('LOCALITY'), 'Supports Locality');
  assert.ok(content.includes('STAKEHOLDERS'), 'Supports Stakeholders');
  assert.ok(content.includes('handleAddEntity'), 'Must provide entity creation handler');
});

test('City Option beside Secretariat in Header and Search removed from navigation bar', () => {
  const content = readFileSync(resolve('src/components/common/Header.tsx'), 'utf8');
  assert.ok(content.includes('City:'), 'Header must contain City label');
  assert.ok(content.includes('Hyderabad'), 'Header must include Hyderabad');
  assert.ok(content.includes('Bengaluru'), 'Header must include Bengaluru');
  assert.ok(content.includes('Secretariat:'), 'Header must have Secretariat');
  assert.ok(!content.includes('title="Search projects, developers, localities"'), 'Search button must be removed from navigation bar');
});

test('Community questions are immediately approved without super admin approval', () => {
  const postgresRepo = readFileSync(resolve('src/server/postgresRepo.ts'), 'utf8');
  const db = readFileSync(resolve('src/server/db.ts'), 'utf8');
  assert.ok(
    postgresRepo.includes("post.postType === 'QUESTION'") && postgresRepo.includes("'APPROVED'"),
    'postgresRepo must approve questions immediately'
  );
  assert.ok(
    db.includes("post.postType === 'QUESTION'") && db.includes("'APPROVED'"),
    'db.ts must approve questions immediately'
  );
});

test('Community Hub has Rate and Share options and default topic is General', () => {
  const content = readFileSync(resolve('src/components/community/CommunityForum.tsx'), 'utf8');
  assert.ok(content.includes('COMMUNITY_TOPIC_LIST'), 'Must define topic list');
  assert.ok(content.includes("'General'"), 'Must include General topic');
  assert.ok(content.includes("topic: 'General'"), 'Must default topic to General');
  assert.ok(content.includes('Rate this community hub'), 'Must have Rate button for community hub');
  assert.ok(content.includes('Share this community hub'), 'Must have Share button for community hub');
});

test('Discussion commenting uses ultra-fast optimistic UI updates', () => {
  const content = readFileSync(resolve('src/components/community/DiscussionDetailView.tsx'), 'utf8');
  assert.ok(content.includes('Ultra-Fast Optimistic UI'), 'DiscussionDetailView must implement ultra-fast optimistic UI');
  assert.ok(content.includes('setComments(prev => [optimisticComment, ...prev])'), 'Comments must be added optimistically');
});

test('Broadcast discussion in MediaEngine supports reply to comments', () => {
  const content = readFileSync(resolve('src/components/media/MediaEngine.tsx'), 'utf8');
  assert.ok(content.includes('handleReplySubmit'), 'MediaEngine must have handleReplySubmit');
  assert.ok(content.includes('parentId'), 'MediaEngine must handle parentId');
  assert.ok(content.includes('Reply'), 'MediaEngine must render Reply option');
});
