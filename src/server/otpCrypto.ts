import crypto from 'node:crypto';

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;

export class OtpCooldownError extends Error {
  readonly statusCode = 429;
  constructor(waitSeconds: number) {
    super(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    this.name = 'OtpCooldownError';
  }
}

/** Six digits from a cryptographic generator. Never log the result. */
export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}

export function sealOtp(code: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const digest = hashOtp(code, salt);
  return `${salt}.${digest}`;
}

export function otpMatches(stored: string, code: string): boolean {
  const splitAt = stored.indexOf('.');
  if (splitAt <= 0) return false;
  const salt = stored.slice(0, splitAt);
  const digest = stored.slice(splitAt + 1);
  const actual = hashOtp(code, salt);
  const left = Buffer.from(digest);
  const right = Buffer.from(actual);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function hashOtp(code: string, salt: string): string {
  const pepper = process.env.OTP_HASH_SECRET || '';
  return crypto.createHmac('sha256', pepper).update(`${salt}:${code.trim()}`).digest('hex');
}
