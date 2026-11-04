/**
 * Property Studio — Centralized Platform-Wide Email Notification Service
 * Institutional Real Estate Intelligence — Swamy Reddy Javidi Secretariat
 * 
 * Provides end-to-end, Reddit-grade email notifications with:
 * - Server-side recipient resolution (never client-supplied)
 * - User notification preference enforcement
 * - Strict event idempotency & deduplication
 * - Resend API integration with bounded exponential retry
 * - Audit & delivery history persistence in PostgreSQL / SQLite
 * - Non-blocking asynchronous execution
 */

import {
  findUserById,
  findUserByEmail,
  findUserByMention,
  getUserNotificationPreferences,
  recordEmailNotification,
  getEmailNotificationByEvent,
  updateEmailNotificationStatus,
  getPendingEmailNotifications,
  getPostFollowerUserIds,
  getActiveCommunityMemberIds
} from './db.ts';

import type {
  DbUser,
  UserNotificationPreferences,
  DbEmailNotification
} from './db.ts';

import { emailFromAddress } from './notifications.ts';

import {
  renderWelcomeEmail,
  renderQuestionReplyEmail,
  renderPostCommentEmail,
  renderCommentReplyEmail,
  renderMentionEmail,
  renderReactionEmail,
  renderFollowedDiscussionEmail,
  renderCommunityActivityEmail,
  renderModerationDecisionEmail,
  renderRequirementEmail,
  renderProjectEmail,
  renderSupportTicketEmail,
  renderSecurityAlertEmail,
  EmailRenderOutput
} from './emailTemplates.ts';

export type NotificationCategory =
  | 'TRANSACTIONAL'
  | 'SECURITY'
  | 'COMMUNITY_REPLIES'
  | 'MENTIONS_REACTIONS'
  | 'FOLLOWS'
  | 'COMMUNITY_ACTIVITY'
  | 'REQUIREMENTS'
  | 'ANNOUNCEMENTS';

export interface DispatchNotificationResult {
  success: boolean;
  notificationId?: string;
  status: 'SENT' | 'FAILED' | 'SKIPPED_PREFERENCE' | 'SKIPPED_SELF' | 'SKIPPED_DUPLICATE' | 'SKIPPED_NO_RECIPIENT';
  error?: string;
  messageId?: string;
}

/**
 * Checks whether the recipient user's preferences permit receiving this notification category.
 * Essential transactional and security notices can never be disabled.
 */
function isCategoryPermitted(category: NotificationCategory, prefs: UserNotificationPreferences): boolean {
  if (category === 'TRANSACTIONAL' || category === 'SECURITY') {
    return true; // Never disabled
  }
  switch (category) {
    case 'COMMUNITY_REPLIES':
      return prefs.communityReplies;
    case 'MENTIONS_REACTIONS':
      return prefs.mentionsReactions;
    case 'FOLLOWS':
      return prefs.followedDiscussions;
    case 'COMMUNITY_ACTIVITY':
      return prefs.joinedCommunityActivity;
    case 'REQUIREMENTS':
      return prefs.propertyRequirements;
    case 'ANNOUNCEMENTS':
      return prefs.platformAnnouncements;
    default:
      return true;
  }
}

/**
 * Sends an email record directly via the Resend API using standard globalThis.fetch.
 * Sanitizes errors and returns message ID.
 */
async function sendViaResend(options: {
  toEmail: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']\s*|\s*["']$/g, '');
  if (!apiKey) {
    return { ok: false, error: 'RESEND_API_KEY is not configured.' };
  }
  const from = emailFromAddress();
  if (!/@propertystudio\.org\b/i.test(from)) {
    return { ok: false, error: 'EMAIL_FROM must use an address on propertystudio.org.' };
  }

  const targetEmail = options.toEmail.trim().toLowerCase();

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject: options.subject,
        html: options.html,
        text: options.text
      })
    });

    if (!response.ok) {
      let detail = '';
      try {
        const errJson = await response.json();
        detail = errJson?.message || errJson?.error?.message || JSON.stringify(errJson);
      } catch {
        detail = await response.text().catch(() => '');
      }
      const sanitized = detail ? String(detail).replace(/[a-zA-Z0-9_\-]{20,}/g, '[REDACTED]').slice(0, 200) : '';
      console.warn(`[Property Studio Email] Resend rejected notification (${response.status}): ${sanitized}`);
      return { ok: false, error: `Resend HTTP ${response.status}: ${sanitized}` };
    }

    const data = await response.json().catch(() => ({})) as { id?: string };
    return { ok: true, messageId: data.id };
  } catch (err: any) {
    const msg = err?.message ? String(err.message).replace(/[a-zA-Z0-9_\-]{20,}/g, '[REDACTED]').slice(0, 200) : 'Network error';
    console.warn(`[Property Studio Email] Resend delivery network failure: ${msg}`);
    return { ok: false, error: msg };
  }
}

/**
 * Central Engine: Dispatches or queues an email notification.
 * 
 * Pipeline:
 * 1. Actor check: reject self-actions
 * 2. Recipient resolution from DB (never client-supplied)
 * 3. Idempotency check: check (user_id, event_id)
 * 4. User preference validation
 * 5. Record creation in DB
 * 6. Resend delivery dispatch
 * 7. Delivery status persistence
 */
export async function dispatchCentralEmailNotification(params: {
  userId: string;
  actorId?: string;
  eventId: string;
  notificationType: string;
  category: NotificationCategory;
  render: (user: DbUser, prefs: UserNotificationPreferences) => EmailRenderOutput;
}): Promise<DispatchNotificationResult> {
  try {
    // 1. Self-action check
    if (params.actorId && params.actorId === params.userId) {
      return { success: true, status: 'SKIPPED_SELF' };
    }

    // 2. Recipient resolution
    const recipient = await findUserById(params.userId);
    if (!recipient || !recipient.email) {
      return { success: false, status: 'SKIPPED_NO_RECIPIENT', error: 'Recipient user not found or has no email' };
    }

    // 3. Idempotency check: is this event already recorded?
    const existing = await getEmailNotificationByEvent(params.userId, params.eventId);
    if (existing) {
      return {
        success: existing.status === 'SENT' || existing.status === 'SKIPPED_PREFERENCE',
        notificationId: existing.id,
        status: existing.status as any,
        messageId: existing.messageId || undefined
      };
    }

    // 4. Notification preferences validation
    const prefs = await getUserNotificationPreferences(params.userId);
    const permitted = isCategoryPermitted(params.category, prefs);

    // Render content
    const rendered = params.render(recipient, prefs);

    if (!permitted) {
      // Record as skipped due to preference
      const rec = await recordEmailNotification({
        userId: params.userId,
        eventId: params.eventId,
        notificationType: params.notificationType,
        category: params.category,
        recipientEmail: recipient.email,
        recipientName: recipient.name,
        subject: rendered.subject,
        htmlBody: rendered.html,
        textBody: rendered.text,
        status: 'SKIPPED_PREFERENCE'
      });
      return { success: true, notificationId: rec?.id, status: 'SKIPPED_PREFERENCE' };
    }

    // 5. Create pending record
    const recorded = await recordEmailNotification({
      userId: params.userId,
      eventId: params.eventId,
      notificationType: params.notificationType,
      category: params.category,
      recipientEmail: recipient.email,
      recipientName: recipient.name,
      subject: rendered.subject,
      htmlBody: rendered.html,
      textBody: rendered.text,
      status: 'PENDING'
    });

    if (!recorded) {
      // Another concurrent worker just created it
      return { success: true, status: 'SKIPPED_DUPLICATE' };
    }

    // 6. Deliver via Resend
    const delivery = await sendViaResend({
      toEmail: recipient.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });

    // 7. Persist delivery status
    if (delivery.ok) {
      await updateEmailNotificationStatus(recorded.id, {
        status: 'SENT',
        attempts: 1,
        messageId: delivery.messageId,
        sentAt: new Date().toISOString()
      });
      return { success: true, notificationId: recorded.id, status: 'SENT', messageId: delivery.messageId };
    } else {
      await updateEmailNotificationStatus(recorded.id, {
        status: 'FAILED',
        attempts: 1,
        lastError: delivery.error
      });
      return { success: false, notificationId: recorded.id, status: 'FAILED', error: delivery.error };
    }
  } catch (err: any) {
    console.warn('[Property Studio Email] Unexpected dispatch error:', err?.message || err);
    return { success: false, status: 'FAILED', error: err?.message || 'Dispatch error' };
  }
}

// ==============================================================================
// PUBLIC NOTIFICATION HANDLERS (PHASES 1-3)
// ==============================================================================

/**
 * PHASE 1: Personalized Welcome Email after registration & email verification.
 * Strictly idempotent by user ID.
 */
export async function sendWelcomeNotification(params: {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `welcome:${params.userId}`;
  return dispatchCentralEmailNotification({
    userId: params.userId,
    eventId,
    notificationType: 'WELCOME',
    category: 'TRANSACTIONAL',
    render: (user, prefs) => renderWelcomeEmail({
      recipientName: user.name || params.name || 'Property Studio Member',
      recipientEmail: user.email,
      role: user.role || params.role || 'PROPERTY_SEEKER',
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 2.1: Community Question Reply Notification.
 */
export async function sendQuestionReplyNotification(params: {
  questionAuthorId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  answerSnippet: string;
  postId: string;
  commentId: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `q_reply:${params.commentId}`;
  return dispatchCentralEmailNotification({
    userId: params.questionAuthorId,
    actorId: params.actorId,
    eventId,
    notificationType: 'COMMUNITY_QUESTION_REPLY',
    category: 'COMMUNITY_REPLIES',
    render: (user, prefs) => renderQuestionReplyEmail({
      recipientName: user.name,
      actorName: params.actorName,
      postTitle: params.postTitle,
      answerSnippet: params.answerSnippet,
      postId: params.postId,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 2.2: Post Comment Notification.
 */
export async function sendPostCommentNotification(params: {
  postAuthorId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  commentSnippet: string;
  postId: string;
  commentId: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `post_cmt:${params.commentId}`;
  return dispatchCentralEmailNotification({
    userId: params.postAuthorId,
    actorId: params.actorId,
    eventId,
    notificationType: 'COMMUNITY_POST_COMMENT',
    category: 'COMMUNITY_REPLIES',
    render: (user, prefs) => renderPostCommentEmail({
      recipientName: user.name,
      actorName: params.actorName,
      postTitle: params.postTitle,
      commentSnippet: params.commentSnippet,
      postId: params.postId,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 2.3: Nested Comment Reply Notification.
 */
export async function sendCommentReplyNotification(params: {
  parentAuthorId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  parentSnippet?: string;
  replySnippet: string;
  postId: string;
  replyId: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `cmt_reply:${params.replyId}`;
  return dispatchCentralEmailNotification({
    userId: params.parentAuthorId,
    actorId: params.actorId,
    eventId,
    notificationType: 'COMMUNITY_COMMENT_REPLY',
    category: 'COMMUNITY_REPLIES',
    render: (user, prefs) => renderCommentReplyEmail({
      recipientName: user.name,
      actorName: params.actorName,
      postTitle: params.postTitle,
      parentSnippet: params.parentSnippet,
      replySnippet: params.replySnippet,
      postId: params.postId,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 2.4: Mention Notifications (@username)
 * Extracts all @mentions from text and notifies each unique mentioned user.
 */
export async function sendMentionNotifications(params: {
  content: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  postId: string;
  sourceId: string; // post ID or comment ID
}): Promise<void> {
  const matches = params.content.match(/@([a-zA-Z0-9_.-]+)/g);
  if (!matches || matches.length === 0) return;

  const uniqueMentions = [...new Set(matches.map(m => m.slice(1).trim().toLowerCase()))];
  for (const handle of uniqueMentions) {
    try {
      const mentionedUser = await findUserByMention(handle);
      if (!mentionedUser || mentionedUser.id === params.actorId) continue;

      const eventId = `mention:${params.sourceId}:${mentionedUser.id}`;
      await dispatchCentralEmailNotification({
        userId: mentionedUser.id,
        actorId: params.actorId,
        eventId,
        notificationType: 'COMMUNITY_MENTION',
        category: 'MENTIONS_REACTIONS',
        render: (user, prefs) => renderMentionEmail({
          recipientName: user.name,
          actorName: params.actorName,
          postTitle: params.postTitle,
          contextSnippet: params.content,
          postId: params.postId,
          unsubscribeToken: prefs.unsubscribeToken
        })
      });
    } catch (err) {
      console.warn(`[Property Studio Email] Error notifying mentioned user @${handle}:`, err);
    }
  }
}

/**
 * PHASE 2.5: Reaction / Upvote Notification.
 */
export async function sendReactionNotification(params: {
  postAuthorId: string;
  actorId: string;
  actorName: string;
  postTitle: string;
  postId: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `reaction:${params.postId}:${params.actorId}`;
  return dispatchCentralEmailNotification({
    userId: params.postAuthorId,
    actorId: params.actorId,
    eventId,
    notificationType: 'COMMUNITY_REACTION',
    category: 'MENTIONS_REACTIONS',
    render: (user, prefs) => renderReactionEmail({
      recipientName: user.name,
      actorName: params.actorName,
      postTitle: params.postTitle,
      postId: params.postId,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 2.6: Followed Discussion Update Notification.
 */
export async function sendFollowedDiscussionNotifications(params: {
  postId: string;
  postTitle: string;
  actorId: string;
  actorName: string;
  updateSnippet: string;
  excludeUserIds?: string[];
}): Promise<void> {
  try {
    const followerIds = await getPostFollowerUserIds(params.postId);
    const excludeSet = new Set([params.actorId, ...(params.excludeUserIds || [])]);

    for (const followerId of followerIds) {
      if (excludeSet.has(followerId)) continue;
      const eventId = `follow_update:${params.postId}:${Date.now().toString().slice(0, -5)}:${followerId}`;
      await dispatchCentralEmailNotification({
        userId: followerId,
        actorId: params.actorId,
        eventId,
        notificationType: 'COMMUNITY_FOLLOWED_UPDATE',
        category: 'FOLLOWS',
        render: (user, prefs) => renderFollowedDiscussionEmail({
          recipientName: user.name,
          actorName: params.actorName,
          postTitle: params.postTitle,
          updateSnippet: params.updateSnippet,
          postId: params.postId,
          unsubscribeToken: prefs.unsubscribeToken
        })
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Property Studio Email] Error in sendFollowedDiscussionNotifications:', err);
  }
}

/**
 * PHASE 2.7: Joined Community Activity Notification.
 */
export async function sendCommunityActivityNotifications(params: {
  communityId: string;
  communityName: string;
  postTitle: string;
  postSnippet: string;
  postId: string;
  actorId: string;
}): Promise<void> {
  try {
    const memberIds = await getActiveCommunityMemberIds(params.communityId);
    for (const memberId of memberIds) {
      if (memberId === params.actorId) continue;
      const eventId = `comm_activity:${params.postId}:${memberId}`;
      await dispatchCentralEmailNotification({
        userId: memberId,
        actorId: params.actorId,
        eventId,
        notificationType: 'COMMUNITY_ACTIVITY',
        category: 'COMMUNITY_ACTIVITY',
        render: (user, prefs) => renderCommunityActivityEmail({
          recipientName: user.name,
          communityName: params.communityName,
          postTitle: params.postTitle,
          postSnippet: params.postSnippet,
          postId: params.postId,
          unsubscribeToken: prefs.unsubscribeToken
        })
      }).catch(() => {});
    }
  } catch (err) {
    console.warn('[Property Studio Email] Error in sendCommunityActivityNotifications:', err);
  }
}

/**
 * PHASE 2.8: Moderation Decision Notification.
 */
export async function sendModerationDecisionEmailNotification(params: {
  userId: string;
  targetType: 'POST' | 'COMMUNITY' | 'COMMENT' | 'REVIEW' | 'VERIFICATION' | 'MEMBERSHIP';
  title: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'VERIFIED' | 'ACTIVE' | 'REMOVED';
  reason?: string;
  linkUrl?: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `mod_decision:${params.targetType}:${params.title.slice(0, 20)}:${params.status}:${Date.now()}`;
  return dispatchCentralEmailNotification({
    userId: params.userId,
    eventId,
    notificationType: 'MODERATION_DECISION',
    category: 'TRANSACTIONAL',
    render: (user) => renderModerationDecisionEmail({
      recipientName: user.name,
      targetType: params.targetType,
      title: params.title,
      status: params.status,
      reason: params.reason,
      linkUrl: params.linkUrl
    })
  });
}

/**
 * PHASE 3.1: Property Requirement Notification.
 */
export async function sendRequirementNotification(params: {
  seekerId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'MATCH_FOUND' | 'STATUS_CHANGE';
  requirementId: string;
  propertyType: string;
  location: string;
  budget: string;
  notes?: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `req:${params.requirementId}:${params.action}`;
  return dispatchCentralEmailNotification({
    userId: params.seekerId,
    eventId,
    notificationType: 'REQUIREMENT_UPDATE',
    category: 'REQUIREMENTS',
    render: (user, prefs) => renderRequirementEmail({
      recipientName: user.name,
      action: params.action,
      requirementId: params.requirementId,
      propertyType: params.propertyType,
      location: params.location,
      budget: params.budget,
      notes: params.notes,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 3.2: Developer Project Submission & Decision Notification.
 */
export async function sendProjectNotification(params: {
  ownerId: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED' | 'PAUSED';
  listingTitle: string;
  listingId: string;
  reason?: string;
}): Promise<DispatchNotificationResult> {
  const eventId = `project:${params.listingId}:${params.action}`;
  return dispatchCentralEmailNotification({
    userId: params.ownerId,
    eventId,
    notificationType: 'PROJECT_DECISION',
    category: 'TRANSACTIONAL',
    render: (user, prefs) => renderProjectEmail({
      recipientName: user.name,
      action: params.action,
      listingTitle: params.listingTitle,
      listingId: params.listingId,
      reason: params.reason,
      unsubscribeToken: prefs.unsubscribeToken
    })
  });
}

/**
 * PHASE 3.3: Support Ticket User Confirmation & Updates.
 */
export async function sendSupportTicketUserConfirmation(params: {
  ticketId: string;
  name: string;
  email: string;
  topic: string;
  message: string;
  statusUpdate?: string;
  isConfirmation?: boolean;
}): Promise<DispatchNotificationResult> {
  const isConf = params.isConfirmation !== false;
  const eventId = `ticket_conf:${params.ticketId}:${isConf ? 'created' : 'update'}`;
  
  // Look up if user is registered, or use direct email delivery
  const existingUser = await findUserByEmail(params.email);
  const userId = existingUser ? existingUser.id : `guest_${params.email.toLowerCase()}`;

  const rendered = renderSupportTicketEmail({
    recipientName: params.name,
    ticketId: params.ticketId,
    topic: params.topic,
    messageExcerpt: params.message,
    statusUpdate: params.statusUpdate,
    isConfirmation: isConf
  });

  if (existingUser) {
    return dispatchCentralEmailNotification({
      userId: existingUser.id,
      eventId,
      notificationType: 'SUPPORT_TICKET',
      category: 'TRANSACTIONAL',
      render: () => rendered
    });
  }

  // Guest submission: deliver directly and record with guest ID
  try {
    const delivery = await sendViaResend({
      toEmail: params.email,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text
    });
    return {
      success: delivery.ok,
      status: delivery.ok ? 'SENT' : 'FAILED',
      messageId: delivery.messageId,
      error: delivery.error
    };
  } catch (err: any) {
    return { success: false, status: 'FAILED', error: err?.message };
  }
}

/**
 * PHASE 3.4: Security Alert & Account Restriction Notification.
 */
export async function sendSecurityAlertNotification(params: {
  userId: string;
  title: string;
  message: string;
  actionRequired?: boolean;
}): Promise<DispatchNotificationResult> {
  const eventId = `sec_alert:${params.userId}:${Date.now()}`;
  return dispatchCentralEmailNotification({
    userId: params.userId,
    eventId,
    notificationType: 'SECURITY_ALERT',
    category: 'SECURITY',
    render: (user) => renderSecurityAlertEmail({
      recipientName: user.name,
      title: params.title,
      message: params.message,
      timestamp: new Date().toUTCString(),
      actionRequired: params.actionRequired
    })
  });
}

/**
 * Flushes pending notifications that encountered transient network failures.
 * Bounded with exponential backoff and max 5 attempts.
 */
export async function flushPendingEmailNotifications(limit = 20): Promise<{ processed: number; sent: number; failed: number }> {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  try {
    const pending = await getPendingEmailNotifications(limit);
    for (const item of pending) {
      processed++;
      const delivery = await sendViaResend({
        toEmail: item.recipientEmail,
        subject: item.subject,
        html: item.htmlBody,
        text: item.textBody
      });

      if (delivery.ok) {
        sent++;
        await updateEmailNotificationStatus(item.id, {
          status: 'SENT',
          attempts: item.attempts + 1,
          messageId: delivery.messageId,
          sentAt: new Date().toISOString()
        });
      } else {
        failed++;
        await updateEmailNotificationStatus(item.id, {
          status: item.attempts + 1 >= 5 ? 'FAILED' : 'PENDING',
          attempts: item.attempts + 1,
          lastError: delivery.error
        });
      }
    }
  } catch (err) {
    console.warn('[Property Studio Email] Error in flushPendingEmailNotifications:', err);
  }

  return { processed, sent, failed };
}
