/**
 * Shared authorization and publication rules.
 * Safe to import from the server and the browser. No secrets and no I/O.
 */

export const CANONICAL_ROLES = [
  'SUPER_ADMIN',
  'DEVELOPER',
  'LANDOWNER',
  'CHANNEL_PARTNER',
  'RESELLER',
  'RERA_AGENT',
  'REAL_ESTATE_MEDIA',
  'PROPERTY_SEEKER'
] as const;

export type CanonicalRole = (typeof CANONICAL_ROLES)[number];

/** Legacy values that must keep working for accounts already stored. */
const ROLE_ALIASES: Record<string, CanonicalRole> = {
  LAND_OWNER: 'LANDOWNER',
  AGENT: 'CHANNEL_PARTNER',
  CONTENT_CREATOR: 'REAL_ESTATE_MEDIA'
};

const PROFESSIONAL_CANONICAL = new Set<CanonicalRole>([
  'LANDOWNER',
  'CHANNEL_PARTNER',
  'RESELLER',
  'RERA_AGENT',
  'REAL_ESTATE_MEDIA'
]);

const LEGACY_PROFESSIONAL = new Set(['PROPERTY_ADMIN', 'COMMUNITY_MODERATOR']);

export const SELF_SERVE_ROLES = new Set([
  'PROPERTY_SEEKER',
  'LANDOWNER',
  'LAND_OWNER',
  'CHANNEL_PARTNER',
  'RESELLER',
  'RERA_AGENT',
  'REAL_ESTATE_MEDIA',
  'AGENT',
  'CONTENT_CREATOR'
]);

export const PUBLIC_CONTENT_STATUSES = new Set(['APPROVED', 'PUBLISHED']);
export const CONSENT_VERSION = '2026-10-15';
export const CONSENT_PURPOSE =
  'Share my contact details with eligible verified professionals solely to respond to this property enquiry.';

export function canonicalRole(role: string | null | undefined): string {
  const value = String(role || '').trim();
  return ROLE_ALIASES[value] || value;
}

export function isSelfServeRole(role: string | null | undefined): boolean {
  return SELF_SERVE_ROLES.has(String(role || '').trim());
}

export function storageRole(role: string): string {
  const trimmed = String(role || '').trim();
  if (trimmed === 'LAND_OWNER') return 'LANDOWNER';
  if (trimmed === 'CONTENT_CREATOR') return 'REAL_ESTATE_MEDIA';
  if (trimmed === 'AGENT') return 'CHANNEL_PARTNER';
  return trimmed;
}

const SELF_SERVE_STORAGE: Record<string, CanonicalRole> = {
  PROPERTY_SEEKER: 'PROPERTY_SEEKER',
  LANDOWNER: 'LANDOWNER',
  LAND_OWNER: 'LANDOWNER',
  CHANNEL_PARTNER: 'CHANNEL_PARTNER',
  RESELLER: 'RESELLER',
  RERA_AGENT: 'RERA_AGENT',
  REAL_ESTATE_MEDIA: 'REAL_ESTATE_MEDIA',
  AGENT: 'CHANNEL_PARTNER',
  CONTENT_CREATOR: 'REAL_ESTATE_MEDIA'
};

/** Registration roles only. Privileged roles are never returned. */
export function selfServeStorageRole(role: string | null | undefined): CanonicalRole {
  return SELF_SERVE_STORAGE[String(role || '').trim()] || 'PROPERTY_SEEKER';
}

export function isPlatformAdmin(role: string | null | undefined): boolean {
  const value = canonicalRole(role);
  return value === 'SUPER_ADMIN' || value === 'DEVELOPER';
}

export function isPropertySeeker(role: string | null | undefined): boolean {
  return canonicalRole(role) === 'PROPERTY_SEEKER';
}

export function isProfessionalRole(role: string | null | undefined): boolean {
  const raw = String(role || '').trim();
  if (LEGACY_PROFESSIONAL.has(raw)) return true;
  const value = canonicalRole(raw);
  return PROFESSIONAL_CANONICAL.has(value as CanonicalRole);
}

export type AppDestination =
  | 'PROPERTIES'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'PROFESSIONAL'
  | 'PROPERTY_ADMIN';

export function postLoginDestination(role: string | null | undefined): AppDestination {
  const raw = String(role || '').trim();
  if (raw === 'DEVELOPER') return 'DEVELOPER';
  if (raw === 'SUPER_ADMIN') return 'ADMIN';
  if (raw === 'PROPERTY_ADMIN') return 'PROPERTY_ADMIN';
  if (isPropertySeeker(raw)) return 'PROPERTIES';
  if (isProfessionalRole(raw)) return 'PROFESSIONAL';
  return 'PROPERTIES';
}

export function canAccessAdminApi(role: string | null | undefined): boolean {
  return isPlatformAdmin(role);
}

export function canModerate(role: string | null | undefined): boolean {
  return isPlatformAdmin(role);
}

export function canAccessProfessionalSurface(role: string | null | undefined): boolean {
  return isPlatformAdmin(role) || isProfessionalRole(role);
}

export interface Viewer {
  id?: string | null;
  role?: string | null;
}

export function canViewModeratedContent(
  status: string | null | undefined,
  authorId: string | null | undefined,
  viewer?: Viewer | null
): boolean {
  if (PUBLIC_CONTENT_STATUSES.has(String(status || ''))) return true;
  if (!viewer) return false;
  if (viewer.id && authorId && viewer.id === authorId) return true;
  return canModerate(viewer.role);
}

/**
 * Replay must not publish a pending edit. A title or body without a public
 * status stays hidden, including rows recorded before status was stored.
 */
export function communityReplayVisible(
  payload: Record<string, unknown> | null | undefined,
  viewer?: Viewer | null
): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const narrative = String(payload.title || payload.content || '').trim();
  const status = typeof payload.status === 'string' ? payload.status : '';
  if (!status) return narrative.length === 0;
  const authorId = typeof payload.authorId === 'string' ? payload.authorId : null;
  return canViewModeratedContent(status, authorId, viewer);
}

export function isPublicListing(status: string | null | undefined): boolean {
  return String(status || '') === 'APPROVED';
}

export function listingEligibleForLeads(status: string | null | undefined): boolean {
  return isPublicListing(status);
}

/**
 * A supplied RERA number never verifies a professional by itself.
 */
export function initialVerificationStatus(_reraNumber?: string | null): 'PENDING' {
  return 'PENDING';
}

export function maskName(name: string | null | undefined): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'Seeker';
  return parts
    .map(part => (part.length <= 1 ? '*' : `${part.slice(0, 1)}***`))
    .join(' ');
}

export function maskPhone(phone: string | null | undefined): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `******${digits.slice(-4)}`;
}

export function maskEmail(email: string | null | undefined): string {
  const value = String(email || '').trim();
  const at = value.indexOf('@');
  if (at <= 0) return '***';
  return `${value.slice(0, 1)}***${value.slice(at)}`;
}

export interface BootstrapSubject {
  email: string;
}

/** Existing accounts are never rewritten, elevated, or given a new password. */
export function bootstrapPlan(existing: BootstrapSubject | null | undefined): 'create' | 'unchanged' {
  return existing ? 'unchanged' : 'create';
}

export function paymentGrantsAccess(status: string | null | undefined): boolean {
  return String(status || '') === 'VERIFIED';
}

export function paymentProviderStatus(env: {
  PAYMENT_PROVIDER?: string;
  PAYMENT_WEBHOOK_SECRET?: string;
}): 'CONFIGURED' | 'NOT_CONFIGURED' {
  if (env.PAYMENT_PROVIDER && env.PAYMENT_WEBHOOK_SECRET) return 'CONFIGURED';
  return 'NOT_CONFIGURED';
}
