import { discardUnconsumedOtp, generateOtp } from './db.ts';
import { sendResendOtp } from './notifications.ts';

type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

export type EmailOtpFailureCode =
  | 'OTP_NOT_CONFIGURED'
  | 'EMAIL_NOT_CONFIGURED'
  | 'EMAIL_SENDER_INVALID'
  | 'EMAIL_DELIVERY_FAILED';

export function publicEmailOtpFailure(code: EmailOtpFailureCode): { status: number; error: string; code: EmailOtpFailureCode } {
  if (code === 'OTP_NOT_CONFIGURED') {
    return { status: 503, code, error: 'Email verification is not configured. No code was sent and no account was created.' };
  }
  if (code === 'EMAIL_NOT_CONFIGURED') {
    return { status: 503, code, error: 'Email delivery is not configured. No code was sent and no account was created.' };
  }
  if (code === 'EMAIL_SENDER_INVALID') {
    return { status: 503, code, error: 'The email sender is not a propertystudio.org address. No code was sent and no account was created.' };
  }
  return {
    status: 502,
    code,
    error: 'The email provider did not accept the verification code. No code remains active and no account was created.'
  };
}

function emailFailureCode(error: string): EmailOtpFailureCode {
  if (/OTP_HASH_SECRET/i.test(error)) return 'OTP_NOT_CONFIGURED';
  if (/RESEND_API_KEY/i.test(error)) return 'EMAIL_NOT_CONFIGURED';
  if (/propertystudio\.org/i.test(error)) return 'EMAIL_SENDER_INVALID';
  return 'EMAIL_DELIVERY_FAILED';
}

/**
 * Creates a single-use email code and hands it only to Resend.
 * A provider failure deletes the unconsumed code and does not verify an account.
 */
export async function issueEmailOtp(
  email: string,
  type: OtpPurpose,
  fetchImpl: typeof fetch = fetch
): Promise<{ sent: true; expiresAt: number; provider: string } | { sent: false; code: EmailOtpFailureCode; error: string }> {
  if (!process.env.OTP_HASH_SECRET) {
    return { sent: false, code: 'OTP_NOT_CONFIGURED', error: 'OTP_HASH_SECRET is not configured.' };
  }
  const { otp, expiresAt } = await generateOtp(email, type);
  const delivery = await sendResendOtp(email.trim().toLowerCase(), otp, fetchImpl);
  if (!delivery.success) {
    await discardUnconsumedOtp(email, type);
    const error = delivery.error || 'Email delivery failed.';
    return { sent: false, code: emailFailureCode(error), error };
  }
  return { sent: true, expiresAt, provider: delivery.provider };
}
