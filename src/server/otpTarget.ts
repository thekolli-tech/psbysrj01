import { normalizeIndianMobile } from '../shared/indianMobile.ts';

export class InvalidPhoneError extends Error {
  readonly statusCode = 400;

  constructor() {
    super('A valid Indian mobile number is required');
    this.name = 'InvalidPhoneError';
  }
}

/** Storage key for an OTP challenge. Phone challenges always use E.164. */
export function canonicalOtpTarget(type: string, target: string): string {
  if (type === 'PHONE_VERIFICATION' || type === 'PHONE_REGISTRATION_GRANT') {
    const mobile = normalizeIndianMobile(target);
    if (!mobile) throw new InvalidPhoneError();
    return mobile;
  }
  return target.trim().toLowerCase();
}
