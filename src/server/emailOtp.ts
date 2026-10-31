import { discardUnconsumedOtp, generateOtp } from './db.ts';
import { sendResendOtp } from './notifications.ts';

export type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE' | string;

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
 * Backward compatible: (target, type, fetchImpl, options)
 * Supports delivery to a designated security destination (e.g. for Super Admin or Developer)
 * while binding the database OTP challenge to the authoritative target.
 * A provider failure deletes the unconsumed code.
 */
export async function issueEmailOtp(
  target: string,
  type: OtpPurpose,
  fetchImpl: typeof fetch = fetch,
  options: {
    deliveryRecipient?: string;
    purposeLabel?: string;
  } = {}
): Promise<{ sent: true; expiresAt: number; provider: string; deliveredTo?: string } | { sent: false; code: EmailOtpFailureCode; error: string }> {
  if (!process.env.OTP_HASH_SECRET) {
    return { sent: false, code: 'OTP_NOT_CONFIGURED', error: 'OTP_HASH_SECRET is not configured.' };
  }
  const deliveryRecipient = (options.deliveryRecipient || target).trim().toLowerCase();
  const purpose = options.purposeLabel || (type === 'PASSWORD_CHANGE' ? 'Password Change' : (type === 'PASSWORD_RESET' ? 'Password Reset' : 'Account Verification'));

  const { otp, expiresAt } = await generateOtp(target, type as any);
  const delivery = await sendResendOtp(deliveryRecipient, otp, purpose, fetchImpl);
  if (!delivery.success) {
    await discardUnconsumedOtp(target, type as any);
    const error = delivery.error || 'Email delivery failed.';
    return { sent: false, code: emailFailureCode(error), error };
  }
  return { sent: true, expiresAt, provider: delivery.provider, deliveredTo: deliveryRecipient };
}
