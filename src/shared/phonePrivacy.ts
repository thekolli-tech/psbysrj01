import { maskPhone } from './policy.ts';

/**
 * Future paid contact access must plug in here.
 * This release never grants phone visibility from a wallet credit or an unlock row.
 */
export function paidContactAccessGranted(_proof?: unknown): false {
  return false;
}

export const OWN_PHONE_CONTENT_MESSAGE = 'Remove your own mobile number from the text. Nothing was saved.';

export function canReadFullPhone(role: string | null | undefined): boolean {
  return role === 'SUPER_ADMIN' || role === 'DEVELOPER';
}

export function presentPhone(
  phone: string | null | undefined,
  viewer: { id?: string | null; role?: string | null } | null | undefined,
  ownerId?: string | null
): string {
  const value = String(phone || '');
  if (!value) return '';
  const self = Boolean(viewer?.id && ownerId && viewer.id === ownerId);
  if (self || canReadFullPhone(viewer?.role) || paidContactAccessGranted()) return value;
  return maskPhone(value);
}

const PHONE_KEY = /phone|mobile|msisdn|wa_id/i;

/** True when text contains this saved number, ignoring spaces and punctuation. */
export function containsPhoneDigits(text: string, phone: string | null | undefined): boolean {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8 || !text) return false;
  return new RegExp(digits.split('').join('\\D*')).test(text);
}

/** Masks one saved number inside text. The caller keeps the original stored text. */
export function redactPhoneDigits(text: string, phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 8 || !text) return text;
  return text.replace(new RegExp(digits.split('').join('\\D*'), 'g'), maskPhone(phone));
}

/** Walks a response and masks saved numbers in strings. Keys and stored rows are left unchanged. */
export function redactPhoneDigitsInValue(value: unknown, phones: string[]): unknown {
  if (typeof value === 'string') {
    return phones.reduce((current, phone) => redactPhoneDigits(current, phone), value);
  }
  if (Array.isArray(value)) return value.map(item => redactPhoneDigitsInValue(item, phones));
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    output[key] = redactPhoneDigitsInValue(child, phones);
  }
  return output;
}

/** Removes phone-bearing fields from public feeds and event replay. */
export function scrubPhoneFields(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrubPhoneFields);
  if (!value || typeof value !== 'object') return value;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (PHONE_KEY.test(key)) continue;
    output[key] = scrubPhoneFields(child);
  }
  return output;
}
