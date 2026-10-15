import { discardUnconsumedOtp, generateOtp } from './db.ts';
import { sendResendOtp } from './notifications.ts';

type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

/**
 * Creates a single-use email code and hands it only to Resend.
 * A provider failure deletes the unconsumed code and does not verify an account.
 */
export async function issueEmailOtp(
  email: string,
  type: OtpPurpose,
  fetchImpl: typeof fetch = fetch
): Promise<{ sent: true; expiresAt: number; provider: string } | { sent: false; error: string }> {
  if (process.env.NODE_ENV === 'production' && !process.env.OTP_HASH_SECRET) {
    return { sent: false, error: 'OTP_HASH_SECRET is not configured.' };
  }
  const { otp, expiresAt } = await generateOtp(email, type);
  const delivery = await sendResendOtp(email.trim().toLowerCase(), otp, fetchImpl);
  if (!delivery.success) {
    await discardUnconsumedOtp(email, type);
    return { sent: false, error: delivery.error || 'Email delivery failed.' };
  }
  return { sent: true, expiresAt, provider: delivery.provider };
}
