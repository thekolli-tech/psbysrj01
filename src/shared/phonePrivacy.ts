import { maskPhone } from './policy.ts';

/**
 * Future paid contact access must plug in here.
 * This release never grants phone visibility from a wallet credit or an unlock row.
 */
export function paidContactAccessGranted(_proof?: unknown): false {
  return false;
}

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
