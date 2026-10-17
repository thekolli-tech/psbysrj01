import { configuredSmsProviders, sendRealSmsOtp } from './smsOtp.ts';

export { configuredSmsProviders, sendRealSmsOtp };

export interface EmailDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export type { SmsDispatchResult } from './smsOtp.ts';

/**
 * Registration and password-reset email codes are sent only through Resend
 * from an address on propertystudio.org. There is no testing-domain fallback.
 */
export function emailFromAddress(): string {
  return (process.env.EMAIL_FROM || process.env.RESEND_FROM || 'Property Studio <otp@propertystudio.org>').trim();
}

export async function sendResendOtp(
  toEmail: string,
  otp: string,
  fetchImpl: typeof fetch = fetch
): Promise<EmailDispatchResult> {
  if (!process.env.RESEND_API_KEY) {
    return { success: false, provider: 'resend', error: 'RESEND_API_KEY is not configured.' };
  }
  const from = emailFromAddress();
  if (!/@propertystudio\.org\b/i.test(from)) {
    return { success: false, provider: 'resend', error: 'EMAIL_FROM must use an address on propertystudio.org.' };
  }

  const htmlContent = otpEmailHtml(otp);
  const textContent = `Property Studio\n\nYour 6-digit verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it.\n`;
  try {
    const response = await fetchImpl('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [toEmail],
        subject: 'Your Property Studio verification code',
        html: htmlContent,
        text: textContent
      })
    });
    if (!response.ok) {
      console.warn(`[Property Studio] Resend rejected the verification email with status ${response.status}.`);
      return { success: false, provider: 'resend', error: 'Resend did not accept the verification email.' };
    }
    const data = await response.json().catch(() => ({})) as { id?: string };
    console.log('[Property Studio] Verification email accepted by Resend.');
    return { success: true, provider: 'resend', messageId: data.id };
  } catch {
    console.warn('[Property Studio] Resend request failed before a response was received.');
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

  const smsProviders = configuredSmsProviders();

  return {
    emailConfigured: emailProviders.length > 0,
    emailProviders,
    smsConfigured: smsProviders.length > 0,
    smsProviders
  };
}
