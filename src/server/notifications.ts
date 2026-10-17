export interface EmailDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

export interface SmsDispatchResult {
  success: boolean;
  provider: string;
  messageId?: string;
  error?: string;
}

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

/** Providers with enough configuration to attempt a real SMS send. */
export function configuredSmsProviders(): string[] {
  const providers: string[] = [];
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) providers.push('Twilio');
  if (process.env.FAST2SMS_API_KEY) providers.push('Fast2SMS');
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) providers.push('MSG91');
  if (process.env.TWOFACTOR_API_KEY) providers.push('2Factor');
  if (process.env.TEXTLOCAL_API_KEY) providers.push('Textlocal');
  return providers;
}

/**
 * Sends a phone verification code through a configured SMS provider.
 * Returns failure when no provider is configured or every attempt is rejected.
 */
export async function sendRealSmsOtp(toPhone: string, otp: string): Promise<SmsDispatchResult> {
  const cleanPhone = toPhone.trim().replace(/[\s-]/g, '');
  const messageText = `Property Studio: Your mobile verification OTP is ${otp}. Valid for 10 minutes only. Sent strictly from Property Studio. Do not share.`;

  // 1. Check Twilio Credentials
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER) {
    try {
      const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`);
      params.append('From', process.env.TWILIO_SENDER_ID || process.env.TWILIO_PHONE_NUMBER);
      params.append('Body', messageText);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        }
      );

      const data = await res.json();
      if (res.ok) {
        console.log('[Property Studio] SMS provider accepted a verification message via Twilio.');
        return { success: true, provider: 'twilio', messageId: data.sid };
      } else {
        console.warn(`[Property Studio] Twilio SMS was not accepted. Status ${res.status}.`);
      }
    } catch (err: any) {
      console.warn('[Property Studio] Twilio dispatch failed:', err.message);
    }
  }

  // 2. Check Fast2SMS API Key (Popular for Indian mobile numbers)
  if (process.env.FAST2SMS_API_KEY) {
    try {
      // Extract 10-digit number for Indian mobile numbers
      const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
      const tenDigit = digitsOnly.slice(-10);

      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: otp,
          numbers: tenDigit,
          sender_id: process.env.FAST2SMS_SENDER_ID || 'PROPST'
        })
      });

      const data = await res.json();
      if (res.ok && data.return) {
        console.log('[Property Studio] SMS provider accepted a verification message via Fast2SMS.');
        return { success: true, provider: 'fast2sms', messageId: data.request_id };
      }
    } catch (err: any) {
      console.warn('[Property Studio] Fast2SMS dispatch failed:', err.message);
    }
  }

  // 3. Check MSG91 Auth Key
  if (process.env.MSG91_AUTH_KEY && process.env.MSG91_TEMPLATE_ID) {
    try {
      const digitsOnly = cleanPhone.replace(/[^0-9]/g, '');
      const res = await fetch(
        `https://api.msg91.com/api/v5/otp?template_id=${process.env.MSG91_TEMPLATE_ID}&mobile=${digitsOnly}&authkey=${process.env.MSG91_AUTH_KEY}&otp=${otp}`,
        { method: 'GET' }
      );
      if (res.ok) {
        console.log('[Property Studio] SMS provider accepted a verification message via MSG91.');
        return { success: true, provider: 'msg91' };
      }
    } catch (err: any) {
      console.warn('[Property Studio] MSG91 dispatch failed:', err.message);
    }
  }

  // 4. Check 2Factor API Key (India)
  if (process.env.TWOFACTOR_API_KEY) {
    try {
      const digitsOnly = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
      const res = await fetch(
        `https://2factor.in/API/V1/${process.env.TWOFACTOR_API_KEY}/SMS/${digitsOnly}/${otp}/PropertyStudio`
      );
      const data = await res.json();
      if (res.ok && data.Status === 'Success') {
        console.log('[Property Studio] SMS provider accepted a verification message via 2Factor.');
        return { success: true, provider: '2factor', messageId: data.Details };
      }
    } catch (err: any) {
      console.warn('[Property Studio] 2Factor dispatch failed:', err.message);
    }
  }

  // 5. Check Textlocal API Key
  if (process.env.TEXTLOCAL_API_KEY) {
    try {
      const digitsOnly = cleanPhone.replace(/[^0-9]/g, '').slice(-10);
      const params = new URLSearchParams();
      params.append('apikey', process.env.TEXTLOCAL_API_KEY);
      params.append('numbers', `91${digitsOnly}`);
      params.append('message', messageText);
      params.append('sender', process.env.TEXTLOCAL_SENDER || 'PROPST');
      const res = await fetch('https://api.textlocal.in/send/?' + params.toString());
      if (res.ok) {
        console.log('[Property Studio] SMS provider accepted a verification message via Textlocal.');
        return { success: true, provider: 'textlocal' };
      }
    } catch (err: any) {
      console.warn('[Property Studio] Textlocal dispatch failed:', err.message);
    }
  }

  if (configuredSmsProviders().length === 0) {
    return { success: false, provider: 'unconfigured', error: 'SMS provider is not configured.' };
  }
  return { success: false, provider: 'unconfigured', error: 'SMS provider did not accept the verification message.' };
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
