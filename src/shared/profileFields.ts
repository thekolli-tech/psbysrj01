/**
 * Optional profile text. These values describe a person.
 * They are not roles and they do not grant access.
 */

export const PROFILE_TEXT_MAX = 80;

export type ProfileFieldResult =
  | { omit: true }
  | { omit: false; value: string | null }
  | { error: string };

export function readProfileField(input: unknown, present: boolean, label: string): ProfileFieldResult {
  if (!present) return { omit: true };
  if (input === null) return { omit: false, value: null };
  if (typeof input !== 'string') return { error: `${label} must be text.` };
  const normalized = input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/[<>]/.test(normalized)) return { error: `${label} cannot include HTML.` };
  if (normalized.length > PROFILE_TEXT_MAX) {
    return { error: `${label} must be ${PROFILE_TEXT_MAX} characters or fewer.` };
  }
  return { omit: false, value: normalized.length === 0 ? null : normalized };
}

export function readProfilePatch(body: unknown): {
  townCity: ProfileFieldResult;
  profession: ProfileFieldResult;
} {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    townCity: readProfileField(record.townCity, Object.prototype.hasOwnProperty.call(record, 'townCity'), 'Town/City'),
    profession: readProfileField(record.profession, Object.prototype.hasOwnProperty.call(record, 'profession'), 'Profession')
  };
}
