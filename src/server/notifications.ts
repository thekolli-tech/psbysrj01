import { configuredWhatsAppProviders } from './whatsappOtp.ts';

export { configuredWhatsAppProviders, sendWhatsAppOtp, sendWhatsAppModerationAlert } from './whatsappOtp.ts';
export type { ModerationAlertData, WhatsAppAlertResult } from './whatsappOtp.ts';

export interface EmailDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export type { WhatsAppDispatchResult } from './whatsappOtp.ts';

/**
 * Registration and password-reset email codes are sent only through Resend
 * from an address on propertystudio.org. There is no testing-domain fallback.
 */
export function emailFromAddress(): string {
  let from = (process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Property Studio <otp@propertystudio.org>').trim();
  while ((from.startsWith('"') && from.endsWith('"')) || (from.startsWith("'") && from.endsWith("'"))) {
    from = from.slice(1, -1).trim();
  }
  const match = from.match(/^(.*?)\s*<([^>]+)>$/);
  if (match) {
    const name = match[1].replace(/["']/g, '').trim();
    const email = match[2].trim().toLowerCase();
    return name ? `${name} <${email}>` : email;
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    return `Property Studio <${from.toLowerCase()}>`;
  }
  return from;
}

export async function sendResendOtp(
  toEmail: string,
  otp: string,
  purpose: string = 'Account Verification',
  fetchImpl: typeof fetch = fetch
): Promise<EmailDispatchResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']\s*|\s*["']$/g, '');
  if (!apiKey) {
    return { success: false, provider: 'resend', error: 'RESEND_API_KEY is not configured.' };
  }
  const from = emailFromAddress();
  if (!/@propertystudio\.org\b/i.test(from)) {
    return { success: false, provider: 'resend', error: 'EMAIL_FROM must use an address on propertystudio.org.' };
  }

  const targetEmail = toEmail.trim().toLowerCase();
  const htmlContent = otpEmailHtml(otp, purpose);
  const textContent = `Property Studio\n\nPurpose: ${purpose}\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes. Property Studio staff will NEVER ask for this code. If you did not request this, please contact support immediately.\n`;
  const subject = purpose && purpose !== 'Account Verification'
    ? `Your Property Studio verification code — ${purpose}`
    : 'Your Property Studio verification code';

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject,
        html: htmlContent,
        text: textContent
      })
    });
    if (!response.ok) {
      let detail = '';
      try {
        const errJson = await response.json();
        detail = errJson?.message || errJson?.error?.message || (typeof errJson === 'string' ? errJson : JSON.stringify(errJson));
      } catch {
        detail = await response.text().catch(() => '');
      }
      const sanitizedDetail = detail
        ? String(detail).replace(/[a-zA-Z0-9_\-]{20,}/g, '[REDACTED]').slice(0, 300)
        : '';
      console.warn(
        `[Property Studio] Resend rejected the verification email with status ${response.status}${
          sanitizedDetail ? `: ${sanitizedDetail}` : '.'
        }`
      );
      return { success: false, provider: 'resend', error: 'Resend did not accept the verification email.' };
    }
    const data = await response.json().catch(() => ({})) as { id?: string };
    console.log('[Property Studio] Verification email accepted by Resend.');
    return { success: true, provider: 'resend', messageId: data.id };
  } catch (err: any) {
    const msg = err?.message
      ? String(err.message).replace(/[a-zA-Z0-9_\-]{20,}/g, '[REDACTED]').slice(0, 200)
      : '';
    console.warn(`[Property Studio] Resend request failed before a response was received${msg ? `: ${msg}` : '.'}`);
    return { success: false, provider: 'resend', error: 'Resend request failed.' };
  }
}

function otpEmailHtml(otp: string, purpose: string = 'Account Verification'): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Property Studio Verification Code</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
    <div style="background: #0f172a; padding: 32px 24px; text-align: center; border-bottom: 3px solid #d97706;">
      <div style="display: inline-block; font-size: 22px; font-weight: 900; letter-spacing: -0.5px; color: #ffffff;">
        PROPERTY <span style="color: #f59e0b;">STUDIO</span>
      </div>
      <div style="color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 6px;">
        Institutional Real Estate Intelligence
      </div>
    </div>
    <div style="padding: 36px 32px;">
      <div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; padding: 4px 10px; border-radius: 9999px; margin-bottom: 16px;">
        ${purpose}
      </div>
      <h2 style="font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 12px 0;">
        Your Single-Use Verification Code
      </h2>
      <p style="font-size: 14px; line-height: 1.6; color: #475569; margin: 0 0 24px 0;">
        Use the authorization code below to complete your requested operation. This code is linked exclusively to your account.
      </p>
      <div style="background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
        <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f172a; display: inline-block;">${otp}</span>
      </div>
      <div style="background-color: #f1f5f9; border-radius: 10px; padding: 14px 18px; margin: 24px 0;">
        <p style="font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;">
          ⏱ <strong>Expires in 10 minutes.</strong> Single-use only. Any subsequent request invalidates previous codes.
        </p>
      </div>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 28px;">
        <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
          <strong>Security Warning:</strong> Property Studio personnel will NEVER ask for this verification code. If you did not initiate this request, please immediately contact our security desk at <a href="mailto:info@propertystudio.org" style="color: #d97706; text-decoration: none;">info@propertystudio.org</a>.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function sendPasswordChangeConfirmation(
  toEmail: string,
  userName: string = 'Property Studio Member',
  fetchImpl: typeof fetch = fetch
): Promise<EmailDispatchResult> {
  const apiKey = (process.env.RESEND_API_KEY || '').trim().replace(/^["']\s*|\s*["']$/g, '');
  if (!apiKey) {
    return { success: false, provider: 'resend', error: 'RESEND_API_KEY is not configured.' };
  }
  const from = emailFromAddress();
  const targetEmail = toEmail.trim().toLowerCase();

  const html = `<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background: #0b1120; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 20px; overflow: hidden;">
    <div style="background: #0f172a; padding: 28px; text-align: center; border-bottom: 3px solid #10b981;">
      <h1 style="color: #fff; margin: 0; font-size: 22px;">Property Studio Security Alert</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="color: #0f172a; margin-top: 0;">Password Successfully Updated</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.6;">
        Hello <strong>${userName}</strong>, this is confirmation that the password for your Property Studio account was changed successfully via mandatory OTP validation.
      </p>
      <p style="color: #64748b; font-size: 12px;">
        Timestamp: <strong>${new Date().toUTCString()}</strong>
      </p>
      <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
          If you did NOT make this change, your account may be compromised. Please contact <a href="mailto:info@propertystudio.org" style="color: #d97706;">info@propertystudio.org</a> immediately.
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [targetEmail],
        subject: 'Security Alert: Your Property Studio password was updated',
        html,
        text: `Property Studio Security Alert\n\nYour account password was updated successfully at ${new Date().toUTCString()}.\nIf you did not perform this action, contact info@propertystudio.org immediately.\n`
      })
    });
    return { success: response.ok, provider: 'resend' };
  } catch (err: any) {
    return { success: false, provider: 'resend', error: err?.message };
  }
}

export async function sendRealEmailOtp(toEmail: string, otp: string, _recipientName?: string): Promise<EmailDispatchResult> {
  return sendResendOtp(toEmail, otp);
}

/**
 * Returns summary of active notification providers configured in environment
 */
export function getNotificationGatewayStatus() {
  const from = emailFromAddress();
  const resendReady = Boolean(process.env.RESEND_API_KEY) && /@propertystudio\.org\b/i.test(from);
  const emailProviders: string[] = resendReady ? ['Resend'] : [];

  const whatsappProviders = configuredWhatsAppProviders();

  return {
    emailConfigured: emailProviders.length > 0,
    emailProviders,
    whatsappConfigured: whatsappProviders.length > 0,
    whatsappProviders
  };
}


import { createNotification, getSuperAdminUserIds } from './db.ts';
import { sendWhatsAppModerationAlert } from './whatsappOtp.ts';

export async function notifySuperAdminsOnSubmission(data: {
  type: 'COMMUNITY_POST' | 'COMMUNITY_REQUEST';
  title: string;
  submitterId: string;
  submitterName: string;
  submitterRole: string;
  communityName?: string;
  itemId: string;
}): Promise<void> {
  try {
    const adminIds = await getSuperAdminUserIds();
    const notificationTitle = data.type === 'COMMUNITY_POST'
      ? 'New Community Question Pending Approval'
      : 'New Community Creation Request Pending Approval';

    const message = data.type === 'COMMUNITY_POST'
      ? `${data.submitterName} (${data.submitterRole}) submitted question "${data.title}" for review.`
      : `${data.submitterName} (${data.submitterRole}) requested to create community "${data.title}".`;

    for (const adminId of adminIds) {
      try {
        await createNotification({
          userId: adminId,
          actorId: data.submitterId,
          actorName: data.submitterName,
          type: 'MODERATION',
          title: notificationTitle,
          message,
          linkUrl: '/admin?tab=MODERATION'
        });
        try {
          const { broadcastSseEvent, recordActivity } = await import('./events.ts');
          broadcastSseEvent('NOTIFICATION_CREATED', { userId: adminId }, adminId);
          recordActivity('notifications');
        } catch {}
      } catch (err) {
        console.warn('[Property Studio] Failed to insert admin notification:', err);
      }
    }

    // Trigger WhatsApp notification to Super Admin (+91 90300 57488)
    const alertResult = await sendWhatsAppModerationAlert({
      submissionType: data.type,
      title: data.title,
      submitterName: data.submitterName,
      submitterRole: data.submitterRole,
      communityName: data.communityName,
      submissionTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      pendingStatus: 'PENDING_APPROVAL',
      moderationUrl: 'https://psbysrj01.vercel.app/admin?tab=MODERATION'
    });

    console.log('[Property Studio] Super Admin notification dispatched. In-app: ok. WhatsApp status:', alertResult.status);
  } catch (err: any) {
    console.warn('[Property Studio] Error in notifySuperAdminsOnSubmission:', err?.message || err);
  }
}

export async function notifyAuthorOnModerationDecision(data: {
  authorId: string;
  targetType: 'POST' | 'COMMUNITY';
  title: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reason?: string;
}): Promise<void> {
  try {
    const isPost = data.targetType === 'POST';
    const isApproved = data.status === 'APPROVED';

    const notifTitle = isApproved
      ? (isPost ? 'Your Question Has Been Approved!' : 'Your Community Has Been Approved!')
      : (isPost ? 'Question Review Status Update' : 'Community Review Status Update');

    const message = isApproved
      ? (isPost
          ? `Your question "${data.title}" was approved by an administrator and is now live in the community feed.`
          : `Your community "${data.title}" was approved by an administrator and is now live!`)
      : (isPost
          ? `Your question "${data.title}" was not approved${data.reason ? ': ' + data.reason : '.'}`
          : `Your community "${data.title}" was not approved${data.reason ? ': ' + data.reason : '.'}`);

    await createNotification({
      userId: data.authorId,
      actorId: 'system_admin',
      actorName: 'Super Admin',
      type: 'MODERATION',
      title: notifTitle,
      message,
      linkUrl: '/community'
    });
    try {
      const { broadcastSseEvent, recordActivity } = await import('./events.ts');
      broadcastSseEvent('NOTIFICATION_CREATED', { userId: data.authorId }, data.authorId);
      recordActivity('notifications');
    } catch {}
  } catch (err: any) {
    console.warn('[Property Studio] Error in notifyAuthorOnModerationDecision:', err?.message || err);
  }
}
