import { findUserById, listProtectedPhones } from './db.ts';
import { canReadFullPhone, redactPhoneDigitsInValue, scrubPhoneFields } from '../shared/phonePrivacy.ts';

/**
 * Public responses mask saved mobile numbers inside text.
 * The database row is not edited. Super Admin and Developer responses are left intact.
 * The viewer's own number is left intact so account screens can still show it.
 */
export async function presentPublicText<T>(
  value: T,
  viewer?: { id?: string | null; role?: string | null } | null,
  options?: { preservePhoneFields?: boolean }
): Promise<T> {
  const scrubbed = (options?.preservePhoneFields ? value : scrubPhoneFields(value)) as T;
  if (canReadFullPhone(viewer?.role)) return scrubbed;
  const phones = await listProtectedPhones();
  const own = viewer?.id ? String((await findUserById(viewer.id))?.phone || '') : '';
  const ownDigits = own.replace(/\D/g, '');
  const hidden = phones.filter(phone => phone.replace(/\D/g, '') !== ownDigits);
  return redactPhoneDigitsInValue(scrubbed, hidden) as T;
}
