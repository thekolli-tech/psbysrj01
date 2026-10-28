/**
 * Optional profile text. These values describe a person.
 * They are not roles and they do not grant access.
 */

import { validateAvatarUpload } from './avatar.ts';

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

export function readAvatarProfileField(input: unknown, present: boolean): ProfileFieldResult {
  if (!present) return { omit: true };
  if (input === null || input === '') return { omit: false, value: null };
  const check = validateAvatarUpload(input);
  if (!check.valid) return { error: check.error || 'Invalid avatar format or size' };
  return { omit: false, value: check.avatar || null };
}

export function readInterestsField(input: unknown, present: boolean): { omit: true } | { omit: false; value: string[] } | { error: string } {
  if (!present) return { omit: true };
  let list: unknown[] = [];
  if (typeof input === 'string') {
    list = input.split(',').map(s => s.trim()).filter(Boolean);
  } else if (Array.isArray(input)) {
    list = input;
  } else {
    return { error: 'Interests must be a list of topics.' };
  }
  const cleaned: string[] = [];
  for (const item of list) {
    if (typeof item !== 'string') continue;
    const norm = item.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
    if (norm && !/[<>]/.test(norm) && norm.length <= 60) {
      if (!cleaned.includes(norm)) cleaned.push(norm);
    }
  }
  return { omit: false, value: cleaned.slice(0, 30) };
}

export function readProfilePatch(body: unknown): {
  townCity: ProfileFieldResult;
  profession: ProfileFieldResult;
  company: ProfileFieldResult;
  avatar: ProfileFieldResult;
  interests: { omit: true } | { omit: false; value: string[] } | { error: string };
} {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    townCity: readProfileField(record.townCity, Object.prototype.hasOwnProperty.call(record, 'townCity'), 'Town/City'),
    profession: readProfileField(record.profession, Object.prototype.hasOwnProperty.call(record, 'profession'), 'Profession'),
    company: readProfileField(record.company, Object.prototype.hasOwnProperty.call(record, 'company'), 'Company'),
    avatar: readAvatarProfileField(record.avatar, Object.prototype.hasOwnProperty.call(record, 'avatar')),
    interests: readInterestsField(record.interests, Object.prototype.hasOwnProperty.call(record, 'interests'))
  };
}
