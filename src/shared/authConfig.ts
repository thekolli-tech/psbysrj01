/**
 * Authentication configuration and feature flags.
 *
 * Mobile number OTP verification across Property Studio signup and authentication
 * is temporarily disabled by default.
 *
 * To re-enable mobile phone OTP verification in the future:
 * Set the environment variable `REQUIRE_PHONE_OTP=true` (or `ENABLE_PHONE_OTP=true`)
 * in your server environment or Vercel project settings.
 */

export function isPhoneOtpRequired(): boolean {
  if (typeof process !== 'undefined' && process?.env) {
    const val = (process.env.REQUIRE_PHONE_OTP || process.env.ENABLE_PHONE_OTP || '').trim().toLowerCase();
    return val === 'true' || val === '1';
  }
  return false;
}
