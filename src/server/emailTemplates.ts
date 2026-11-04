/**
 * Property Studio — Centralized Platform-Wide Email Notification Templates
 * Institutional Real Estate Intelligence — Swamy Reddy Javidi Secretariat
 * 
 * High-performance, responsive HTML and plain-text templates with strict branding.
 */

export interface EmailRenderOutput {
  subject: string;
  html: string;
  text: string;
}

const PRODUCTION_BASE_URL = 'https://psbysrj01.vercel.app';

function getBaseUrl(): string {
  const custom = (process.env.APP_BASE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (custom) {
    return custom.startsWith('http') ? custom : `https://${custom}`;
  }
  return PRODUCTION_BASE_URL;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Common Property Studio Base Email Layout
 */
function renderBaseLayout(options: {
  previewText: string;
  badge: { text: string; bg: string; color: string };
  title: string;
  recipientName: string;
  bodyHtml: string;
  ctaButton?: { text: string; url: string };
  secondaryNote?: string;
  unsubscribeUrl?: string;
}): string {
  const baseUrl = getBaseUrl();
  const ctaHtml = options.ctaButton
    ? `
      <div style="margin: 32px 0 24px 0; text-align: center;">
        <a href="${escapeHtml(options.ctaButton.url)}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2); letter-spacing: 0.3px;">
          ${escapeHtml(options.ctaButton.text)} &rarr;
        </a>
      </div>
    `
    : '';

  const secondaryHtml = options.secondaryNote
    ? `
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 18px; margin: 24px 0;">
        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
          ${options.secondaryNote}
        </p>
      </div>
    `
    : '';

  const unsubscribeHtml = options.unsubscribeUrl
    ? `
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 12px 0 0 0;">
        You received this notification based on your Property Studio account preferences. 
        <a href="${escapeHtml(options.unsubscribeUrl)}" style="color: #d97706; text-decoration: underline;">Manage notification preferences or unsubscribe</a>.
      </p>
    `
    : `
      <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 12px 0 0 0;">
        This is an essential transactional or security notice for your registered Property Studio account.
      </p>
    `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(options.title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px 12px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); }
    .header { background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #f59e0b; }
    .content { padding: 36px 32px; }
    @media only screen and (max-width: 480px) {
      .content { padding: 24px 20px !important; }
    }
  </style>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px 12px; color: #1e293b;">
  <!-- Preview Text -->
  <div style="display: none; max-height: 0px; overflow: hidden; font-size: 1px; line-height: 1px; color: #fff; opacity: 0;">
    ${escapeHtml(options.previewText)}
  </div>

  <div class="container" style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
    <!-- Brand Header -->
    <div class="header" style="background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #f59e0b;">
      <a href="${baseUrl}" target="_blank" style="text-decoration: none; display: inline-block;">
        <div style="font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
          PROPERTY <span style="color: #f59e0b;">STUDIO</span>
        </div>
        <div style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px;">
          Institutional Real Estate Intelligence
        </div>
      </a>
    </div>

    <!-- Content Body -->
    <div class="content" style="padding: 36px 32px;">
      <!-- Category Badge -->
      <div style="display: inline-block; background-color: ${options.badge.bg}; color: ${options.badge.color}; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px;">
        ${escapeHtml(options.badge.text)}
      </div>

      <h1 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 16px 0; line-height: 1.3;">
        ${escapeHtml(options.title)}
      </h1>

      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
        Hello <strong>${escapeHtml(options.recipientName)}</strong>,
      </p>

      ${options.bodyHtml}

      ${ctaHtml}
      ${secondaryHtml}

      <!-- Footer Info & Support -->
      <div style="border-top: 1px solid #e2e8f0; padding-top: 24px; margin-top: 32px;">
        <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-bottom: 4px;">
          Property Studio Secretariat
        </div>
        <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
          Executive Leadership: Swamy Reddy Javidi, CEO<br>
          Enquiries Desk: <a href="mailto:info@propertystudio.org" style="color: #d97706; text-decoration: none;">info@propertystudio.org</a> · Tel: +91 9014 55 55 66<br>
          Hyderabad, Telangana, India
        </div>
        ${unsubscribeHtml}
      </div>
    </div>
  </div>
</body>
</html>`;
}

// ==============================================================================
// 1. WELCOME EMAIL (PHASE 1)
// ==============================================================================
export function renderWelcomeEmail(params: {
  recipientName: string;
  recipientEmail: string;
  role: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const roleDisplay = formatRoleDisplay(params.role);
  const roleHighlights = getRoleHighlights(params.role);

  const subject = `Welcome to Property Studio, ${params.recipientName}!`;
  const previewText = `Your registration is confirmed as ${roleDisplay}. Access your dashboard now.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 18px 0;">
      Welcome to <strong>Property Studio</strong> — India’s institutional real estate intelligence and multimedia platform. Your account registration and email verification have been successfully completed.
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 14px 18px; margin: 20px 0;">
      <div style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px;">Your Property Studio Profile Role</div>
      <div style="font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 4px;">${escapeHtml(roleDisplay)}</div>
    </div>

    <div style="margin: 20px 0;">
      <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">Key Features Available to Your Account:</div>
      <ul style="font-size: 13px; line-height: 1.6; color: #475569; margin: 0; padding-left: 20px;">
        ${roleHighlights.map(h => `<li style="margin-bottom: 6px;">${escapeHtml(h)}</li>`).join('')}
      </ul>
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Account Verified', bg: '#ecfdf5', color: '#047857' },
    title: 'Registration Confirmed — Welcome to Property Studio',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Access Your Member Dashboard',
      url: `${baseUrl}/`
    },
    secondaryNote: '💡 <strong>Pro-Tip:</strong> Complete your profile details and set your preferred property micro-markets in Hyderabad and beyond to receive customized real-time market updates.',
    unsubscribeUrl
  });

  const text = `Welcome to Property Studio, ${params.recipientName}!\n\n` +
    `Your account registration and email verification have been successfully completed.\n` +
    `Your Role: ${roleDisplay}\n\n` +
    `Features Available:\n` +
    roleHighlights.map(h => `• ${h}`).join('\n') +
    `\n\nAccess your dashboard: ${baseUrl}/\n\n` +
    `Official Support: info@propertystudio.org | +91 9014 55 55 66\nProperty Studio Secretariat`;

  return { subject, html, text };
}

function formatRoleDisplay(role: string): string {
  switch (role) {
    case 'PROPERTY_SEEKER': return 'Property Seeker';
    case 'RERA_AGENT': return 'RERA Certified Channel Partner';
    case 'NON_RERA_AGENT': return 'Non-RERA Real Estate Agent';
    case 'WORKING_SALES_PROFESSIONAL': return 'Working Sales Professional';
    case 'RESELLER': return 'Reseller';
    case 'TRADER_INVESTOR': return 'Trader / Investor';
    case 'LAND_OWNER': return 'Land Owner';
    case 'DEVELOPER': return 'Real Estate Developer';
    case 'VENDOR': return 'Contractor / Vendor';
    case 'SUPER_ADMIN': return 'Super Admin';
    default: return role.replace(/_/g, ' ');
  }
}

function getRoleHighlights(role: string): string[] {
  switch (role) {
    case 'DEVELOPER':
      return [
        'Claim and manage verified property development ventures with official builder badges.',
        'Host interactive corporate conferences with live slide decks and institutional Q&A.',
        'Receive direct, qualified buyer enquiries routed securely through our secretariat.'
      ];
    case 'RERA_AGENT':
    case 'NON_RERA_AGENT':
    case 'WORKING_SALES_PROFESSIONAL':
      return [
        'Access the verified buyer lead marketplace with 100% consent-cleared requirements.',
        'Represent buyers and syndicate verified residential and commercial inventories.',
        'Participate in professional community hubs and developer project launch discussions.'
      ];
    case 'TRADER_INVESTOR':
    case 'LAND_OWNER':
      return [
        'Explore early-tranche pre-launch opportunities and institutional yield analytics.',
        'Submit land parcels for joint-development matching with Tier-1 builders.',
        'Engage in private due-diligence discussions with real estate analysts.'
      ];
    default: // PROPERTY_SEEKER
      return [
        'Browse 100% legally vetted projects with verified RERA disclosures and master plans.',
        'Post encrypted buyer requirements to receive direct developer offers without spam.',
        'Participate in hyper-local community forums and attend live digital project showcases.'
      ];
  }
}

// ==============================================================================
// 2. COMMUNITY NOTIFICATIONS (PHASE 2)
// ==============================================================================

/**
 * Question Reply / Answer Notification
 */
export function renderQuestionReplyEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  answerSnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `${params.actorName} answered your question: "${truncate(params.postTitle, 50)}"`;
  const previewText = `${params.actorName} provided a new answer to your question on Property Studio.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      <strong>${escapeHtml(params.actorName)}</strong> posted a new reply to your community question <em>"${escapeHtml(params.postTitle)}"</em>:
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; border-radius: 8px; padding: 16px; margin: 18px 0; font-style: italic; color: #334155; font-size: 13px; line-height: 1.6;">
      "${escapeHtml(truncate(params.answerSnippet, 280))}"
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Community Q&A', bg: '#eff6ff', color: '#1d4ed8' },
    title: 'New Reply to Your Question',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'View Answer & Reply',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `${params.actorName} answered your question on Property Studio:\n\n` +
    `Question: "${params.postTitle}"\n` +
    `Reply: "${truncate(params.answerSnippet, 200)}"\n\n` +
    `View discussion: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * Post Comment Notification
 */
export function renderPostCommentEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  commentSnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `${params.actorName} commented on your post: "${truncate(params.postTitle, 50)}"`;
  const previewText = `${params.actorName} left a comment on your discussion.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      <strong>${escapeHtml(params.actorName)}</strong> added a comment to your post <em>"${escapeHtml(params.postTitle)}"</em>:
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #0f172a; border-radius: 8px; padding: 16px; margin: 18px 0; color: #334155; font-size: 13px; line-height: 1.6;">
      "${escapeHtml(truncate(params.commentSnippet, 280))}"
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Post Comment', bg: '#f1f5f9', color: '#0f172a' },
    title: 'New Comment on Your Post',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'View Comment & Respond',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `${params.actorName} commented on your post "${params.postTitle}":\n\n` +
    `"${truncate(params.commentSnippet, 200)}"\n\n` +
    `View: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * Nested Comment Reply Notification
 */
export function renderCommentReplyEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  parentSnippet?: string;
  replySnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `${params.actorName} replied to your comment in "${truncate(params.postTitle, 45)}"`;
  const previewText = `${params.actorName} replied to your comment.`;

  const parentHtml = params.parentSnippet
    ? `
      <div style="background-color: #f1f5f9; border-radius: 6px; padding: 10px 14px; margin-bottom: 12px; font-size: 12px; color: #64748b; font-style: italic;">
        Your comment: "${escapeHtml(truncate(params.parentSnippet, 140))}"
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      <strong>${escapeHtml(params.actorName)}</strong> replied to your comment on <em>"${escapeHtml(params.postTitle)}"</em>:
    </p>

    ${parentHtml}

    <div style="background-color: #f8fafc; border-left: 4px solid #10b981; border-radius: 8px; padding: 16px; margin: 18px 0; color: #334155; font-size: 13px; line-height: 1.6;">
      "${escapeHtml(truncate(params.replySnippet, 280))}"
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Comment Reply', bg: '#ecfdf5', color: '#047857' },
    title: 'New Reply to Your Comment',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'View Reply in Thread',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `${params.actorName} replied to your comment on "${params.postTitle}":\n\n` +
    `"${truncate(params.replySnippet, 200)}"\n\n` +
    `View: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * User Mention Notification (@user)
 */
export function renderMentionEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  contextSnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `${params.actorName} mentioned you in "${truncate(params.postTitle, 45)}"`;
  const previewText = `${params.actorName} mentioned your handle in a community conversation.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      <strong>${escapeHtml(params.actorName)}</strong> mentioned you in a discussion on <em>"${escapeHtml(params.postTitle)}"</em>:
    </p>

    <div style="background-color: #fefce8; border-left: 4px solid #ca8a04; border-radius: 8px; padding: 16px; margin: 18px 0; color: #854d0e; font-size: 13px; line-height: 1.6;">
      "${escapeHtml(truncate(params.contextSnippet, 280))}"
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Mention', bg: '#fef9c3', color: '#a16207' },
    title: 'You Were Mentioned',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Join the Conversation',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `${params.actorName} mentioned you in "${params.postTitle}":\n\n` +
    `"${truncate(params.contextSnippet, 200)}"\n\n` +
    `View: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * Reaction / Upvote Notification
 */
export function renderReactionEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `Your post "${truncate(params.postTitle, 45)}" received an upvote`;
  const previewText = `${params.actorName} reacted to your post on Property Studio.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      <strong>${escapeHtml(params.actorName)}</strong> upvoted your community discussion:
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 18px 0; font-weight: 700; color: #0f172a; font-size: 14px;">
      "${escapeHtml(params.postTitle)}"
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0;">
      Upvotes boost your discussion's prominence in the community feed and syndicate insights across institutional stakeholders.
    </p>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Community Upvote', bg: '#fef3c7', color: '#b45309' },
    title: 'New Upvote on Your Discussion',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'View Discussion Analytics',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `${params.actorName} upvoted your post "${params.postTitle}".\n\nView: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * Followed Discussion Update Notification
 */
export function renderFollowedDiscussionEmail(params: {
  recipientName: string;
  actorName: string;
  postTitle: string;
  updateSnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `New activity in followed discussion: "${truncate(params.postTitle, 45)}"`;
  const previewText = `New update posted by ${params.actorName}.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      A discussion you are following, <em>"${escapeHtml(params.postTitle)}"</em>, has new activity from <strong>${escapeHtml(params.actorName)}</strong>:
    </p>

    <div style="background-color: #f8fafc; border-left: 4px solid #6366f1; border-radius: 8px; padding: 16px; margin: 18px 0; color: #334155; font-size: 13px; line-height: 1.6;">
      "${escapeHtml(truncate(params.updateSnippet, 280))}"
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Followed Discussion', bg: '#e0e7ff', color: '#4338ca' },
    title: 'Discussion Activity Update',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Open Followed Discussion',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `New activity in followed discussion "${params.postTitle}" by ${params.actorName}:\n\n` +
    `"${truncate(params.updateSnippet, 200)}"\n\n` +
    `View: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

/**
 * Joined Community Activity Notification
 */
export function renderCommunityActivityEmail(params: {
  recipientName: string;
  communityName: string;
  postTitle: string;
  postSnippet: string;
  postId: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `[${params.communityName}] New verified discussion: "${truncate(params.postTitle, 40)}"`;
  const previewText = `New discussion published in ${params.communityName}.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      A new verified discussion was published in a community hub you joined, <strong>${escapeHtml(params.communityName)}</strong>:
    </p>

    <div style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 18px; margin: 18px 0;">
      <div style="font-size: 15px; font-weight: 800; color: #0f172a; margin-bottom: 8px;">
        ${escapeHtml(params.postTitle)}
      </div>
      <div style="font-size: 13px; color: #475569; line-height: 1.6;">
        ${escapeHtml(truncate(params.postSnippet, 240))}
      </div>
    </div>
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge: { text: params.communityName, bg: '#f1f5f9', color: '#0f172a' },
    title: 'New Community Discussion',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Read & Participate',
      url: `${baseUrl}/community?post=${params.postId}`
    },
    unsubscribeUrl
  });

  const text = `New discussion in ${params.communityName}:\n\n` +
    `"${params.postTitle}"\n\n` +
    `${truncate(params.postSnippet, 200)}\n\n` +
    `View: ${baseUrl}/community?post=${params.postId}\n`;

  return { subject, html, text };
}

// ==============================================================================
// 3. ACCOUNT, MODERATION & PROPERTY NOTIFICATIONS (PHASE 3)
// ==============================================================================

/**
 * Moderation Decision Notification (Post, Community, Review, Verification, Membership)
 */
export function renderModerationDecisionEmail(params: {
  recipientName: string;
  targetType: 'POST' | 'COMMUNITY' | 'COMMENT' | 'REVIEW' | 'VERIFICATION' | 'MEMBERSHIP';
  title: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'VERIFIED' | 'ACTIVE' | 'REMOVED';
  reason?: string;
  linkUrl?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const isApproved = params.status === 'APPROVED' || params.status === 'VERIFIED' || params.status === 'ACTIVE';
  const typeLabel =
    params.targetType === 'POST' ? 'Question / Discussion' :
    params.targetType === 'COMMUNITY' ? 'Community Hub' :
    params.targetType === 'COMMENT' ? 'Comment' :
    params.targetType === 'REVIEW' ? 'Review & Rating' :
    params.targetType === 'VERIFICATION' ? 'Professional Verification' :
    params.targetType === 'MEMBERSHIP' ? 'Community Membership' : 'Content Submission';

  const subject = isApproved
    ? `Approved: Your ${typeLabel} on Property Studio`
    : `Status Update: Your ${typeLabel} review decision`;

  const previewText = isApproved
    ? `Your ${typeLabel.toLowerCase()} "${params.title}" has been approved by administrators.`
    : `Important review decision regarding your ${typeLabel.toLowerCase()} "${params.title}".`;

  const badge = isApproved
    ? { text: params.status === 'VERIFIED' ? 'Verified' : 'Approved & Active', bg: '#ecfdf5', color: '#047857' }
    : params.status === 'SUSPENDED'
      ? { text: 'Suspended', bg: '#fffbeb', color: '#b45309' }
      : { text: 'Review Notice', bg: '#fef2f2', color: '#b91c1c' };

  const reasonHtml = params.reason
    ? `
      <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; border-radius: 8px; padding: 14px 18px; margin: 18px 0; color: #9f1239; font-size: 13px; line-height: 1.5;">
        <strong>Moderation Notes:</strong> ${escapeHtml(params.reason)}
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      ${
        isApproved
          ? `Our administration has approved your ${typeLabel.toLowerCase()} <strong>"${escapeHtml(params.title)}"</strong>. It is now active on Property Studio.`
          : `Our administration has reviewed your ${typeLabel.toLowerCase()} <strong>"${escapeHtml(params.title)}"</strong> and updated its status to <strong>${escapeHtml(params.status)}</strong>.`
      }
    </p>

    ${reasonHtml}

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0;">
      ${
        isApproved
          ? 'You can now view live engagement and member activity directly on the platform.'
          : 'If you wish to update or appeal this decision, please contact the secretariat desk at info@propertystudio.org or call +91 9014 55 55 66.'
      }
    </p>
  `;

  const targetLink = params.linkUrl
    ? (params.linkUrl.startsWith('http') ? params.linkUrl : `${baseUrl}${params.linkUrl}`)
    : `${baseUrl}/community`;

  const html = renderBaseLayout({
    previewText,
    badge,
    title: isApproved ? `${typeLabel} Approved` : `${typeLabel} Status Update`,
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: isApproved
      ? { text: 'View on Platform', url: targetLink }
      : { text: 'Open Dashboard', url: `${baseUrl}/dashboard` }
  });

  const text = `${subject}\n\n` +
    `Hello ${params.recipientName},\n\n` +
    `${typeLabel}: "${params.title}"\n` +
    `Status: ${params.status}\n` +
    (params.reason ? `Reason: ${params.reason}\n\n` : '\n') +
    `Platform: ${baseUrl}/\n`;

  return { subject, html, text };
}

/**
 * Property Requirement Notification (Submission Confirmation & Status Changes)
 */
export function renderRequirementEmail(params: {
  recipientName: string;
  action: 'SUBMITTED' | 'APPROVED' | 'MATCH_FOUND' | 'STATUS_CHANGE';
  requirementId: string;
  propertyType: string;
  location: string;
  budget: string;
  notes?: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const isSubmission = params.action === 'SUBMITTED';

  const subject = isSubmission
    ? `Requirement Logged: ${params.propertyType} in ${params.location} [${params.requirementId}]`
    : `Requirement Update: ${params.propertyType} [${params.requirementId}]`;

  const previewText = isSubmission
    ? `Your property requirement has been encrypted and published to verified syndicates.`
    : `New status update for your Property Studio requirement.`;

  const badge = isSubmission
    ? { text: 'Requirement Logged', bg: '#eff6ff', color: '#1d4ed8' }
    : { text: 'Requirement Active', bg: '#ecfdf5', color: '#047857' };

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      ${
        isSubmission
          ? 'Your property acquisition requirement has been recorded with encrypted data-masking on Property Studio. Verified developers and institutional syndicates matching your specifications will be able to submit qualified project proposals.'
          : 'There is an important status update regarding your property acquisition requirement.'
      }
    </p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Reference ID:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${escapeHtml(params.requirementId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Property Category:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${escapeHtml(params.propertyType)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Target Locality:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${escapeHtml(params.location)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Budget Allocation:</td>
          <td style="padding: 6px 0; color: #059669; font-weight: 800;">${escapeHtml(params.budget)}</td>
        </tr>
      </table>
    </div>

    ${params.notes ? `<p style="font-size: 13px; color: #475569; line-height: 1.5;">${escapeHtml(params.notes)}</p>` : ''}
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText,
    badge,
    title: isSubmission ? 'Property Requirement Registered' : 'Requirement Status Update',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'View Requirements Dashboard',
      url: `${baseUrl}/`
    },
    secondaryNote: '🔒 <strong>Privacy Assurance:</strong> Your contact number and personal email remain 100% confidential. Developers only see masked requirements until you explicitly authorize connection.',
    unsubscribeUrl
  });

  const text = `${subject}\n\n` +
    `Hello ${params.recipientName},\n\n` +
    `Requirement ID: ${params.requirementId}\n` +
    `Type: ${params.propertyType}\n` +
    `Location: ${params.location}\n` +
    `Budget: ${params.budget}\n\n` +
    `View details: ${baseUrl}/\n`;

  return { subject, html, text };
}

/**
 * Developer Project Submission & Decision Notification
 */
export function renderProjectEmail(params: {
  recipientName: string;
  action: 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'INFO_REQUESTED' | 'SUSPENDED' | 'PAUSED';
  listingTitle: string;
  listingId: string;
  reason?: string;
  unsubscribeToken?: string;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const isApproved = params.action === 'APPROVED';
  const isSubmission = params.action === 'SUBMITTED';

  let subject = `Project Submission: "${params.listingTitle}"`;
  let badge = { text: 'Under Audit', bg: '#eff6ff', color: '#1d4ed8' };
  let headline = 'Project Venture Registered for Review';

  if (isApproved) {
    subject = `Official Approval: "${params.listingTitle}" is Live on Property Studio`;
    badge = { text: 'Approved & Published', bg: '#ecfdf5', color: '#047857' };
    headline = 'Project Approved & Live on Platform';
  } else if (params.action === 'REJECTED') {
    subject = `Audit Status: "${params.listingTitle}" Review Feedback`;
    badge = { text: 'Revision Required', bg: '#fef2f2', color: '#b91c1c' };
    headline = 'Project Audit & Verification Notice';
  } else if (params.action === 'SUSPENDED' || params.action === 'PAUSED') {
    subject = `Venture Notice: "${params.listingTitle}" Publication ${params.action}`;
    badge = { text: params.action, bg: '#fffbeb', color: '#b45309' };
    headline = `Project Venture ${params.action}`;
  }

  const reasonHtml = params.reason
    ? `
      <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 18px; margin: 18px 0; color: #991b1b; font-size: 13px; line-height: 1.5;">
        <strong>Audit Committee Remarks:</strong> ${escapeHtml(params.reason)}
      </div>
    `
    : '';

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      ${
        isApproved
          ? `We are pleased to inform you that your development venture <strong>"${escapeHtml(params.listingTitle)}"</strong> has successfully passed the Property Studio regulatory audit and is now live.`
          : isSubmission
            ? `Your venture <strong>"${escapeHtml(params.listingTitle)}"</strong> was received and logged for due diligence by our audit committee.`
            : `Our audit committee has reviewed your venture submission <strong>"${escapeHtml(params.listingTitle)}"</strong> and requires adjustments before publication.`
      }
    </p>

    <div style="background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 14px 18px; margin: 18px 0;">
      <span style="font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase;">Project Reference:</span>
      <div style="font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px;">${escapeHtml(params.listingTitle)} <span style="font-family: monospace; font-size: 12px; color: #64748b;">(${escapeHtml(params.listingId)})</span></div>
    </div>

    ${reasonHtml}
  `;

  const unsubscribeUrl = params.unsubscribeToken ? `${baseUrl}/unsubscribe?token=${params.unsubscribeToken}` : undefined;

  const html = renderBaseLayout({
    previewText: subject,
    badge,
    title: headline,
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: isApproved ? 'View Live Venture Listing' : 'Open Developer Console',
      url: `${baseUrl}/`
    },
    unsubscribeUrl
  });

  const text = `${subject}\n\n` +
    `Hello ${params.recipientName},\n\n` +
    `Project: "${params.listingTitle}" (${params.listingId})\n` +
    `Status: ${params.action}\n` +
    (params.reason ? `Feedback: ${params.reason}\n\n` : '\n') +
    `Platform: ${baseUrl}/\n`;

  return { subject, html, text };
}

/**
 * Support Ticket Confirmation & Updates
 */
export function renderSupportTicketEmail(params: {
  recipientName: string;
  ticketId: string;
  topic: string;
  messageExcerpt: string;
  statusUpdate?: string;
  isConfirmation: boolean;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = params.isConfirmation
    ? `Enquiry Received: ${params.ticketId} — ${params.topic}`
    : `Support Update: Ticket ${params.ticketId} — ${params.topic}`;

  const previewText = params.isConfirmation
    ? `Your enquiry has been logged with the Secretariat under CEO Swamy Reddy Javidi.`
    : `Update regarding your Property Studio support ticket ${params.ticketId}.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      ${
        params.isConfirmation
          ? `Thank you for reaching out to the Property Studio Official Secretariat under the leadership of CEO Swamy Reddy Javidi. Your enquiry has been registered under ticket identifier <strong>${escapeHtml(params.ticketId)}</strong>.`
          : `There is a response update regarding your support ticket <strong>${escapeHtml(params.ticketId)}</strong>.`
      }
    </p>

    <div style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 18px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Ticket ID:</td>
          <td style="padding: 6px 0; color: #0f172a; font-family: monospace; font-weight: 700;">${escapeHtml(params.ticketId)}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Category:</td>
          <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${escapeHtml(params.topic)}</td>
        </tr>
        ${params.statusUpdate ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Status:</td>
          <td style="padding: 6px 0; color: #059669; font-weight: 700;">${escapeHtml(params.statusUpdate)}</td>
        </tr>
        ` : ''}
      </table>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px dashed #cbd5e1; font-size: 13px; color: #334155; line-height: 1.5;">
        <strong>Your Enquiry Message:</strong><br>
        <span style="font-style: italic; color: #475569;">"${escapeHtml(truncate(params.messageExcerpt, 350))}"</span>
      </div>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0;">
      Our secretariat team resolves requests within 24 business hours. If your query is time-critical, you may quote this ticket ID via telephone or WhatsApp at +91 9014 55 55 66.
    </p>
  `;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Official Secretariat Desk', bg: '#fef3c7', color: '#92400e' },
    title: params.isConfirmation ? 'Support Enquiry Received' : 'Support Desk Ticket Update',
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Visit Secretariat Portal',
      url: `${baseUrl}/`
    }
  });

  const text = `${subject}\n\n` +
    `Hello ${params.recipientName},\n\n` +
    `Your support enquiry (${params.ticketId}) has been received.\n` +
    `Category: ${params.topic}\n` +
    `Message: "${truncate(params.messageExcerpt, 200)}"\n\n` +
    `Secretariat: info@propertystudio.org | +91 9014 55 55 66\n`;

  return { subject, html, text };
}

/**
 * Account Security & Restriction Alert
 */
export function renderSecurityAlertEmail(params: {
  recipientName: string;
  title: string;
  message: string;
  timestamp?: string;
  actionRequired?: boolean;
}): EmailRenderOutput {
  const baseUrl = getBaseUrl();
  const subject = `Security Notice: ${params.title}`;
  const previewText = `Important security notice regarding your Property Studio account.`;

  const bodyHtml = `
    <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 16px 0;">
      ${escapeHtml(params.message)}
    </p>

    <div style="background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; padding: 12px 16px; margin: 18px 0; font-size: 12px; color: #64748b;">
      <div>Notice Generated: <strong>${escapeHtml(params.timestamp || new Date().toUTCString())}</strong></div>
      <div>Security Desk: <strong>info@propertystudio.org</strong></div>
    </div>

    <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin: 16px 0;">
      If you did not initiate this action or believe this alert was issued in error, please immediately contact our security desk at <a href="mailto:info@propertystudio.org" style="color: #d97706; text-decoration: none;">info@propertystudio.org</a>.
    </p>
  `;

  const html = renderBaseLayout({
    previewText,
    badge: { text: 'Security Notice', bg: '#fef2f2', color: '#b91c1c' },
    title: params.title,
    recipientName: params.recipientName,
    bodyHtml,
    ctaButton: {
      text: 'Review Account Security',
      url: `${baseUrl}/`
    }
  });

  const text = `${subject}\n\n` +
    `Hello ${params.recipientName},\n\n` +
    `${params.message}\n\n` +
    `Security Desk: info@propertystudio.org\n`;

  return { subject, html, text };
}

function truncate(str: string, maxLen: number): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + '...';
}
