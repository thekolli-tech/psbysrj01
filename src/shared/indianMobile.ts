const NATIONAL_MOBILE = /^[6-9]\d{9}$/;

/**
 * Canonical Indian mobile number in E.164, or null when the input is not one.
 * Accepts 10 digits starting 6-9, an optional leading 0, and an optional 91 or +91 prefix.
 */
export function normalizeIndianMobile(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const compact = input.trim().replace(/[\s().-]/g, '');
  if (!compact) return null;
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  if (!/^\d+$/.test(digits)) return null;
  let national = digits;
  if (digits.length === 12 && digits.startsWith('91')) national = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) national = digits.slice(1);
  else if (digits.length !== 10) return null;
  if (!NATIONAL_MOBILE.test(national)) return null;
  return `+91${national}`;
}

export function indianNationalDigits(e164: string): string {
  return e164.startsWith('+91') ? e164.slice(3) : '';
}

/** True when a stored phone is the same Indian mobile, including legacy 0 and 91 prefixes. */
export function storedPhoneMatches(stored: unknown, e164: string): boolean {
  if (typeof stored !== 'string') return false;
  const national = indianNationalDigits(e164);
  if (!national) return false;
  const digits = stored.replace(/\D/g, '');
  return digits === national || digits === `0${national}` || digits === `91${national}`;
}
