/**
 * Property Studio Definitive Role-Based Email OTP Policy
 *
 * Exact OTP routing destination by authoritative account role:
 * - Super Admin (SUPER_ADMIN): info@propertystudio.org
 * - Developer (DEVELOPER): thekolli.in@gmail.com
 * - Property Seeker (PROPERTY_SEEKER): Registered account email
 * - Every other existing role: Registered account email
 * - Future roles: Registered account email by default
 *
 * Mandatory backend security rules:
 * 1. Determine actual account role from authoritative database record.
 * 2. Never trust role or recipient email supplied by the frontend.
 * 3. Verify OTP against the correct account and intended operation.
 */

export const DESIGNATED_ROLE_OTP_RECIPIENTS: Record<string, string> = {
  SUPER_ADMIN: 'info@propertystudio.org',
  DEVELOPER: 'thekolli.in@gmail.com'
};

export interface ResolvedOtpDestination {
  recipientEmail: string;
  authoritativeRole: string;
  isRerouted: boolean;
  registeredEmail: string;
  accountUserId?: string;
}

/**
 * Resolves the authoritative OTP recipient email based on the database record.
 * Never uses untrusted frontend input.
 */
export function resolveAuthoritativeOtpDestination(user: {
  id?: string;
  role: string | null | undefined;
  email: string;
}): ResolvedOtpDestination {
  const authoritativeRole = String(user.role || '').toUpperCase().trim();
  const registeredEmail = String(user.email || '').trim().toLowerCase();

  if (authoritativeRole === 'SUPER_ADMIN') {
    return {
      recipientEmail: DESIGNATED_ROLE_OTP_RECIPIENTS.SUPER_ADMIN,
      authoritativeRole: 'SUPER_ADMIN',
      isRerouted: true,
      registeredEmail,
      accountUserId: user.id
    };
  }

  if (authoritativeRole === 'DEVELOPER') {
    return {
      recipientEmail: DESIGNATED_ROLE_OTP_RECIPIENTS.DEVELOPER,
      authoritativeRole: 'DEVELOPER',
      isRerouted: true,
      registeredEmail,
      accountUserId: user.id
    };
  }

  // Property Seeker and all other current/future roles receive OTPs at their own registered email
  return {
    recipientEmail: registeredEmail,
    authoritativeRole,
    isRerouted: false,
    registeredEmail,
    accountUserId: user.id
  };
}

/**
 * Masks an email address for safe public disclosure (e.g., "in***@propertystudio.org").
 */
export function maskEmailForDisplay(email: string): string {
  const parts = email.split('@');
  if (parts.length !== 2) return '***';
  const name = parts[0];
  const domain = parts[1];
  if (name.length <= 2) {
    return `${name[0] || '*'}***@${domain}`;
  }
  return `${name.slice(0, 2)}***@${domain}`;
}

/**
 * Validates a password against Property Studio security policy:
 * - Minimum 8 characters
 * - Cannot exceed 128 characters
 * - Cannot be pure whitespace
 */
export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, error: 'Password is required' };
  }
  if (password.trim().length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password cannot exceed 128 characters' };
  }
  return { valid: true };
}
