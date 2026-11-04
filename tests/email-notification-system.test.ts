process.env.DB_ENGINE = 'sqlite';
delete process.env.DATABASE_URL;

import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';

import {
  initDatabase,
  createUser,
  findUserById,
  findUserByEmail,
  getUserNotificationPreferences,
  updateUserNotificationPreferences,
  getPreferencesByUnsubscribeToken,
  recordEmailNotification,
  getEmailNotificationByEvent,
  getPendingEmailNotifications
} from '../src/server/db.ts';

import {
  sendWelcomeNotification,
  sendQuestionReplyNotification,
  sendPostCommentNotification,
  sendCommentReplyNotification,
  sendMentionNotifications,
  sendReactionNotification,
  sendFollowedDiscussionNotifications,
  sendCommunityActivityNotifications,
  sendModerationDecisionEmailNotification,
  sendRequirementNotification,
  sendProjectNotification,
  sendSupportTicketUserConfirmation,
  sendSecurityAlertNotification,
  flushPendingEmailNotifications
} from '../src/server/emailNotificationService.ts';

import {
  renderWelcomeEmail,
  renderQuestionReplyEmail,
  renderPostCommentEmail,
  renderCommentReplyEmail,
  renderMentionEmail,
  renderReactionEmail,
  renderRequirementEmail,
  renderProjectEmail,
  renderSupportTicketEmail,
  renderSecurityAlertEmail
} from '../src/server/emailTemplates.ts';

// Initialize SQLite database
await initDatabase();

// Ensure test seeker exists
let testUser = await findUserByEmail('seeker_notif@propertystudio.org');
if (!testUser) {
  testUser = await createUser({
    name: 'Ananya Rao',
    email: 'seeker_notif@propertystudio.org',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
}

// Test Setup: mock Resend deliveries
const deliveredEmails: Array<{
  to: string[];
  from: string;
  subject: string;
  html: string;
  text: string;
}> = [];

let mockResendShouldFail = false;

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
  const urlStr = String(url);
  if (urlStr === 'https://api.resend.com/emails') {
    const bodyStr = String(init?.body || '{}');
    const isOtpEmail = />\d{6}</.test(bodyStr) || bodyStr.includes('verification code') || bodyStr.includes('Password Reset');
    if (isOtpEmail) {
      return originalFetch(url, init);
    }
    if (mockResendShouldFail) {
      return new Response(JSON.stringify({ error: { message: 'Service Unavailable' } }), {
        status: 503,
        headers: { 'content-type': 'application/json' }
      });
    }
    const body = JSON.parse(bodyStr);
    deliveredEmails.push(body);
    return new Response(JSON.stringify({ id: `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}` }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }
  return originalFetch(url, init);
}) as typeof fetch;

test.after(() => {
  globalThis.fetch = originalFetch;
});

process.env.RESEND_API_KEY = 're_test_mock_email_key';
process.env.EMAIL_FROM = 'Property Studio <info@propertystudio.org>';

test('Phase 1: Welcome email renders with role highlights, dashboard CTA, and support info', () => {
  const welcome = renderWelcomeEmail({
    recipientName: 'Arjun Rao',
    recipientEmail: 'arjun@example.com',
    role: 'PROPERTY_SEEKER',
    unsubscribeToken: 'token_123'
  });

  assert.match(welcome.subject, /Welcome to Property Studio, Arjun Rao!/);
  assert.match(welcome.html, /Property Seeker/);
  assert.match(welcome.html, /Access Your Member Dashboard/);
  assert.match(welcome.html, /info@propertystudio\.org/);
  assert.match(welcome.html, /\+91 9014 55 55 66/);
  assert.match(welcome.html, /Swamy Reddy Javidi/);
  assert.match(welcome.html, /token_123/);
});

test('Phase 1: Developer welcome email displays developer-specific capabilities', () => {
  const devWelcome = renderWelcomeEmail({
    recipientName: 'Rajesh Sharma',
    recipientEmail: 'rajesh@builder.com',
    role: 'DEVELOPER'
  });

  assert.match(devWelcome.html, /Real Estate Developer/);
  assert.match(devWelcome.html, /Claim and manage verified property development ventures/);
  assert.match(devWelcome.html, /Host interactive corporate conferences/);
});

test('Phase 2 & 6: Community email templates follow Property Studio visual branding', () => {
  const reply = renderQuestionReplyEmail({
    recipientName: 'Kavita Reddy',
    actorName: 'Swamy Reddy Javidi',
    postTitle: 'What is the RERA status of Aparna Zenon?',
    answerSnippet: 'The phase-1 occupation certificate was issued and verified by our secretariat desk.',
    postId: 'post_zenon_01'
  });

  assert.match(reply.subject, /Swamy Reddy Javidi answered your question/);
  assert.match(reply.html, /PROPERTY <span style="color: #f59e0b;">STUDIO<\/span>/);
  assert.match(reply.html, /Aparna Zenon/);
  assert.match(reply.html, /View Answer &amp; Reply/);

  const mention = renderMentionEmail({
    recipientName: 'Vikram Mehta',
    actorName: 'Ananya Rao',
    postTitle: 'Kokapet Villa Opportunities',
    contextSnippet: 'Hey @vikram_mehta check this out',
    postId: 'post_kokapet_02'
  });

  assert.match(mention.subject, /Ananya Rao mentioned you/);
  assert.match(mention.html, /You Were Mentioned/);
});

test('Phase 3: Support ticket confirmation email renders ticket ID and secretariat SLA', () => {
  const ticket = renderSupportTicketEmail({
    recipientName: 'Lakshmi Narayana',
    ticketId: 'PS-SUP-994411',
    topic: 'Regulatory Audit Enquiry',
    messageExcerpt: 'Please verify the master layout plan for financial district project.',
    isConfirmation: true
  });

  assert.match(ticket.subject, /Enquiry Received: PS-SUP-994411/);
  assert.match(ticket.html, /PS-SUP-994411/);
  assert.match(ticket.html, /24 business hours/);
  assert.match(ticket.html, /Official Secretariat Desk/);
});

test('Phase 3: Property requirement & Project decision templates', () => {
  const req = renderRequirementEmail({
    recipientName: 'Sunita Jain',
    action: 'SUBMITTED',
    requirementId: 'REQ-HYD-550',
    propertyType: '4 BHK Luxury Apartment',
    location: 'Gachibowli, Hyderabad',
    budget: '₹ 4.50 Crores'
  });

  assert.match(req.subject, /Requirement Logged: 4 BHK Luxury Apartment/);
  assert.match(req.html, /REQ-HYD-550/);
  assert.match(req.html, /₹ 4\.50 Crores/);

  const proj = renderProjectEmail({
    recipientName: 'Prestige Group Rep',
    action: 'APPROVED',
    listingTitle: 'Prestige High Fields Tower C',
    listingId: 'proj_prestige_01'
  });

  assert.match(proj.subject, /Official Approval: "Prestige High Fields Tower C"/);
  assert.match(proj.html, /Approved &amp; Published/);
});

test('Phase 4: User Notification Preferences defaults and persistence', async () => {
  const testUserId = `test_usr_${Date.now()}`;

  // 1. Sensible defaults on first query
  const prefs = await getUserNotificationPreferences(testUserId);
  assert.equal(prefs.userId, testUserId);
  assert.equal(prefs.communityReplies, true);
  assert.equal(prefs.mentionsReactions, true);
  assert.equal(prefs.followedDiscussions, true);
  assert.equal(prefs.joinedCommunityActivity, true);
  assert.equal(prefs.propertyRequirements, true);
  assert.equal(prefs.platformAnnouncements, true);
  assert.ok(prefs.unsubscribeToken && prefs.unsubscribeToken.length >= 24);

  // 2. Update preferences
  const updated = await updateUserNotificationPreferences(testUserId, {
    communityReplies: false,
    mentionsReactions: false
  });
  assert.equal(updated.communityReplies, false);
  assert.equal(updated.mentionsReactions, false);
  assert.equal(updated.followedDiscussions, true); // preserved

  // 3. Re-query confirms persistence
  const reloaded = await getUserNotificationPreferences(testUserId);
  assert.equal(reloaded.communityReplies, false);
  assert.equal(reloaded.mentionsReactions, false);
  assert.equal(reloaded.followedDiscussions, true);

  // 4. Token lookup
  const byToken = await getPreferencesByUnsubscribeToken(prefs.unsubscribeToken);
  assert.ok(byToken);
  assert.equal(byToken.userId, testUserId);
  assert.equal(byToken.preferences.communityReplies, false);
});

test('Phase 5 & 7: Central notification engine enforces actor exclusion (self-action)', async () => {
  deliveredEmails.length = 0;

  // Attempt to notify user of their own reply
  const result = await sendQuestionReplyNotification({
    questionAuthorId: testUser.id,
    actorId: testUser.id, // Self-action!
    actorName: testUser.name,
    postTitle: 'Test Question',
    answerSnippet: 'My own reply',
    postId: 'post_test_self',
    commentId: 'cmt_test_self'
  });

  assert.equal(result.status, 'SKIPPED_SELF');
  assert.equal(deliveredEmails.length, 0, 'No email sent for self action');
});

test('Phase 5 & 7: Strict idempotency prevents duplicate email delivery', async () => {
  // Reset preferences to enabled
  await updateUserNotificationPreferences(testUser.id, {
    communityReplies: true
  });

  deliveredEmails.length = 0;

  const eventId = `idem_test_${Date.now()}`;

  // First dispatch
  const res1 = await sendQuestionReplyNotification({
    questionAuthorId: testUser.id,
    actorId: 'other_user_123',
    actorName: 'Other Member',
    postTitle: 'Test Question',
    answerSnippet: 'An interesting answer',
    postId: 'post_idem_1',
    commentId: eventId
  });

  assert.equal(res1.status, 'SENT');
  assert.equal(deliveredEmails.length, 1);
  const firstMessageId = res1.messageId;

  // Second dispatch with identical event ID
  const res2 = await sendQuestionReplyNotification({
    questionAuthorId: testUser.id,
    actorId: 'other_user_123',
    actorName: 'Other Member',
    postTitle: 'Test Question',
    answerSnippet: 'An interesting answer',
    postId: 'post_idem_1',
    commentId: eventId
  });

  assert.equal(res2.status, 'SENT');
  assert.equal(res2.messageId, firstMessageId);
  assert.equal(deliveredEmails.length, 1, 'Duplicate event must NOT trigger additional email delivery');
});

test('Phase 4 & 5: Preference enforcement skips non-essential notifications when disabled', async () => {
  // Disable community replies
  await updateUserNotificationPreferences(testUser.id, {
    communityReplies: false
  });

  deliveredEmails.length = 0;

  const res = await sendPostCommentNotification({
    postAuthorId: testUser.id,
    actorId: 'user_commenter_99',
    actorName: 'Commenter Guy',
    postTitle: 'Discussion with Disabled Notifications',
    commentSnippet: 'A comment that should not send email',
    postId: 'post_pref_test',
    commentId: `cmt_pref_${Date.now()}`
  });

  assert.equal(res.status, 'SKIPPED_PREFERENCE');
  assert.equal(deliveredEmails.length, 0, 'Email must not be sent when category preference is disabled');
});

test('Phase 4: Transactional security alerts deliver even if community preferences are disabled', async () => {
  // Disable all non-essential preferences
  await updateUserNotificationPreferences(testUser.id, {
    communityReplies: false,
    mentionsReactions: false,
    followedDiscussions: false,
    joinedCommunityActivity: false,
    propertyRequirements: false,
    platformAnnouncements: false
  });

  deliveredEmails.length = 0;

  const res = await sendSecurityAlertNotification({
    userId: testUser.id,
    title: 'Critical Security Alert',
    message: 'Your account password was updated from an unrecognized device.'
  });

  assert.equal(res.status, 'SENT');
  assert.equal(deliveredEmails.length, 1, 'Security and transactional notices must ALWAYS deliver');
  assert.match(deliveredEmails[0].subject, /Critical Security Alert/);
});

test('Phase 5: Transient failure handling and bounded retry', async () => {
  await updateUserNotificationPreferences(testUser.id, {
    propertyRequirements: true
  });

  // Enable failure mock
  mockResendShouldFail = true;

  const failRes = await sendRequirementNotification({
    seekerId: testUser.id,
    action: 'MATCH_FOUND',
    requirementId: `req_fail_${Date.now()}`,
    propertyType: 'Penthouse',
    location: 'Kokapet',
    budget: '₹ 8 Crores'
  });

  assert.equal(failRes.status, 'FAILED');
  assert.ok(failRes.error);

  // Disable failure mock and flush queue
  mockResendShouldFail = false;
  const flushResult = await flushPendingEmailNotifications(10);
  assert.ok(flushResult.sent >= 1, 'Pending failed notification was successfully retried');
});

test('Phase 4: HTTP GET /api/notifications/preferences and PUT /api/notifications/preferences', async () => {
  // Reset preferences for clean HTTP test run
  await updateUserNotificationPreferences(testUser.id, {
    communityReplies: true,
    mentionsReactions: true,
    followedDiscussions: true,
    joinedCommunityActivity: true,
    propertyRequirements: true,
    platformAnnouncements: true
  });

  const { app } = await import('../server.ts');
  const server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const base = `http://127.0.0.1:${port}`;

  try {
    // 1. Login
    const loginRes = await fetch(`${base}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'seeker_notif@propertystudio.org', password: 'Password123!' })
    });
    assert.equal(loginRes.status, 200);
    const sessionCookie = loginRes.headers.getSetCookie?.().find(c => c.startsWith('ps_session='));
    assert.ok(sessionCookie);

    // 2. GET preferences
    const getRes = await fetch(`${base}/api/notifications/preferences`, {
      headers: { cookie: sessionCookie }
    });
    if (getRes.status !== 200) {
      console.log('GET /api/notifications/preferences failed with:', getRes.status, await getRes.text());
    }
    assert.equal(getRes.status, 200);
    const getData = await getRes.json();
    assert.ok(getData.success);
    assert.ok(getData.preferences);
    assert.equal(typeof getData.preferences.communityReplies, 'boolean');

    // 3. PUT preferences
    const putRes = await fetch(`${base}/api/notifications/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: sessionCookie
      },
      body: JSON.stringify({
        communityReplies: false,
        platformAnnouncements: false
      })
    });
    assert.equal(putRes.status, 200);
    const putData = await putRes.json();
    assert.equal(putData.preferences.communityReplies, false);
    assert.equal(putData.preferences.platformAnnouncements, false);
    assert.equal(putData.preferences.followedDiscussions, true); // default preserved

    // 4. Public Unsubscribe token info
    const token = getData.preferences.unsubscribeToken;
    const unsubGetRes = await fetch(`${base}/api/notifications/unsubscribe?token=${token}`);
    assert.equal(unsubGetRes.status, 200);
    const unsubGetData = await unsubGetRes.json();
    assert.equal(unsubGetData.user.email, 'seeker_notif@propertystudio.org');

    // 5. 1-click Unsubscribe all
    const unsubPostRes = await fetch(`${base}/api/notifications/unsubscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, all: true })
    });
    assert.equal(unsubPostRes.status, 200);
    const unsubPostData = await unsubPostRes.json();
    assert.equal(unsubPostData.preferences.communityReplies, false);
    assert.equal(unsubPostData.preferences.followedDiscussions, false);
    assert.equal(unsubPostData.preferences.propertyRequirements, false);

  } finally {
    await new Promise<void>(resolve => server.close(() => resolve()));
  }
});
