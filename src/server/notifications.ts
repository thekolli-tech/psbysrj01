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
  const htmlContent = otpEmailHtml(otp);
  const textContent = `Property Studio\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.\n`;
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
        subject: 'Your Property Studio verification code',
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

function otpEmailHtml(otp: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#0f172a;padding:20px"><div style="max-width:540px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden"><div style="background:#0b1120;color:#fff;padding:28px;text-align:center;border-bottom:3px solid #f59e0b"><h1 style="margin:0">Property Studio</h1></div><div style="padding:32px"><p>Use this code to verify your email address:</p><p style="font-family:monospace;font-size:32px;letter-spacing:6px;text-align:center">${otp}</p><p>The code expires in 10 minutes. Property Studio will never ask you to share it.</p></div></div></body></html>`;
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
  } catch (err: any) {
    console.warn('[Property Studio] Error in notifyAuthorOnModerationDecision:', err?.message || err);
  }
}
