/**
 * International E.164. A leading + and country code are required.
 * National numbers without a country code are rejected.
 */
export function normalizeE164(input: string | null | undefined): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;
  let compact = raw.replace(/[\s().-]/g, '');
  if (compact.startsWith('00')) compact = `+${compact.slice(2)}`;
  if (!compact.startsWith('+')) return null;
  const digits = compact.slice(1);
  if (!/^[1-9]\d{7,14}$/.test(digits)) return null;
  return `+${digits}`;
}

/** WhatsApp Cloud API recipient, digits only, no plus. */
export function whatsAppRecipient(e164: string): string {
  return e164.replace(/\D/g, '');
}
