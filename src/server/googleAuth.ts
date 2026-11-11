import crypto from 'node:crypto';
import {
  findUserByEmail,
  createUser,
  createSession,
  updateLastLogin,
  updateUserProfileFields
} from './db.ts';
import type { DbUser } from './db.ts';
import type { UserRole } from '../types/index.ts';

export interface GoogleIdentity {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  givenName?: string;
  familyName?: string;
  picture?: string;
}

export interface GoogleAuthResult {
  success: boolean;
  user?: any;
  isNewUser?: boolean;
  isProfileComplete?: boolean;
  requiresPhoneVerification?: boolean;
  phoneVerified?: boolean;
  googlePicture?: string;
  sessionToken?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Checks if a user profile is complete according to Property Studio requirements:
 * - Valid non-empty name
 * - Valid non-empty avatar
 * - At least one interest selected
 * - If in a professional role, a non-empty profession is required
 */
export function isUserProfileComplete(user: {
  name?: string | null;
  role?: string | null;
  avatar?: string | null;
  profession?: string | null;
  interests?: string[] | string | null;
}): boolean {
  if (!user || typeof user !== 'object') return false;
  if (!user.name || !user.name.trim()) return false;
  if (!user.avatar || !user.avatar.trim()) return false;

  // Interests check: must have at least 1 interest
  let parsedInterests: string[] = [];
  if (Array.isArray(user.interests)) {
    parsedInterests = user.interests;
  } else if (typeof user.interests === 'string' && user.interests.trim()) {
    try {
      const parsed = JSON.parse(user.interests);
      if (Array.isArray(parsed)) parsedInterests = parsed;
    } catch {
      if (user.interests.trim().length > 0) parsedInterests = [user.interests.trim()];
    }
  }
  if (!parsedInterests || parsedInterests.length === 0) return false;

  // Professional roles require non-empty profession
  const profRoles = ['DEVELOPER', 'LANDOWNER', 'CHANNEL_PARTNER', 'RESELLER', 'RERA_AGENT', 'REAL_ESTATE_MEDIA'];
  if (user.role && profRoles.includes(user.role)) {
    if (!user.profession || !user.profession.trim()) {
      return false;
    }
  }

  return true;
}

const OAUTH_STATE_SECRET = process.env.OTP_HASH_SECRET || 'property-studio-google-oauth-state-secret';

/**
 * Generates an HMAC-signed CSRF defense state token for Google OAuth 2.0.
 */
export function createGoogleOAuthState(): string {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  const payload = `${timestamp}:${nonce}`;
  const hmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

/**
 * Validates a Google OAuth state token to defend against CSRF attacks.
 */
export function validateGoogleOAuthState(state?: string): boolean {
  if (!state || typeof state !== 'string') return false;
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8');
    const [timestampStr, nonce, hmac] = decoded.split(':');
    if (!timestampStr || !nonce || !hmac) return false;

    const timestamp = Number(timestampStr);
    // Reject states older than 15 minutes or from the future
    if (Date.now() - timestamp > 15 * 60 * 1000 || timestamp > Date.now() + 60 * 1000) {
      return false;
    }

    const payload = `${timestampStr}:${nonce}`;
    const expectedHmac = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(payload).digest('hex');
    if (hmac.length !== expectedHmac.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch {
    return false;
  }
}

/**
 * Checks whether Google OAuth is configured on this environment.
 */
export function isGoogleOAuthConfigured(): boolean {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  return Boolean(clientId);
}

/**
 * Generates the full Google OAuth 2.0 authorization URL.
 */
export function getGoogleOAuthAuthorizeUrl(redirectUri: string, state: string): string {
  const clientId = (process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  if (!clientId) {
    throw new Error('Google OAuth Client ID is not configured on the server. Please set GOOGLE_CLIENT_ID or VITE_GOOGLE_CLIENT_ID.');
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Verifies a Google OpenID Connect ID token.
 * Validates cryptographic signature, issuer, audience, and expiration.
 */
export async function verifyGoogleIdToken(
  token: string,
  expectedClientId?: string
): Promise<{ valid: boolean; identity?: GoogleIdentity; error?: string }> {
  if (!token || typeof token !== 'string') {
    return { valid: false, error: 'Token is required' };
  }

  const trimmed = token.trim();

  // Test environment mock support: deterministic test harness without external network dependency
  if (process.env.NODE_ENV === 'test' && trimmed.startsWith('test-google-token:')) {
    try {
      const payloadBase64 = trimmed.replace('test-google-token:', '');
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(jsonStr);

      if (payload.exp && Number(payload.exp) * 1000 <= Date.now()) {
        return { valid: false, error: 'Token has expired' };
      }
      if (payload.email_verified === false) {
        return { valid: false, error: 'Google account email is not verified' };
      }
      if (payload.iss && payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
        return { valid: false, error: 'Invalid token issuer' };
      }
      const configuredAud = expectedClientId || process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
      if (configuredAud && payload.aud && payload.aud !== configuredAud) {
        return { valid: false, error: 'Invalid token audience: client ID mismatch' };
      }

      return {
        valid: true,
        identity: {
          googleId: payload.sub || 'test-google-sub-id',
          email: String(payload.email || '').toLowerCase().trim(),
          emailVerified: Boolean(payload.email_verified ?? true),
          name: payload.name || String(payload.email || '').split('@')[0],
          givenName: payload.given_name,
          familyName: payload.family_name,
          picture: payload.picture
        }
      };
    } catch {
      return { valid: false, error: 'Malformed test token' };
    }
  }

  // Parse JWT parts
  const parts = trimmed.split('.');
  if (parts.length !== 3) {
    return { valid: false, error: 'Malformed ID token: must contain 3 segments' };
  }

  let payload: any;
  try {
    payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Invalid token encoding' };
  }

  // Pre-validate expiration
  if (!payload.exp || Number(payload.exp) * 1000 <= Date.now()) {
    return { valid: false, error: 'Token has expired' };
  }

  // Pre-validate issuer
  if (payload.iss !== 'https://accounts.google.com' && payload.iss !== 'accounts.google.com') {
    return { valid: false, error: 'Invalid token issuer: expected accounts.google.com' };
  }

  // Pre-validate audience if client ID is configured
  const configuredAud = expectedClientId || process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  if (configuredAud && payload.aud !== configuredAud) {
    return { valid: false, error: 'Invalid token audience: client ID mismatch' };
  }

  // Authoritative signature validation via Google TokenInfo endpoint
  try {
    const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(trimmed)}`);
    const googleInfo = await res.json() as any;

    if (!res.ok || googleInfo.error) {
      return {
        valid: false,
        error: googleInfo.error_description || googleInfo.error || 'Token verification failed with Google'
      };
    }

    if (!googleInfo.email_verified || googleInfo.email_verified === 'false') {
      return { valid: false, error: 'Google account email is not verified' };
    }

    return {
      valid: true,
      identity: {
        googleId: googleInfo.sub,
        email: String(googleInfo.email).toLowerCase().trim(),
        emailVerified: googleInfo.email_verified === 'true' || googleInfo.email_verified === true,
        name: googleInfo.name || String(googleInfo.email).split('@')[0],
        givenName: googleInfo.given_name,
        familyName: googleInfo.family_name,
        picture: googleInfo.picture
      }
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Google verification service unreachable: ${err?.message || 'Network error'}`
    };
  }
}

/**
 * Exchanges Google OAuth 2.0 authorization code for tokens and extracts verified identity.
 */
export async function exchangeGoogleCodeForIdentity(
  code: string,
  redirectUri: string
): Promise<{ valid: boolean; identity?: GoogleIdentity; error?: string }> {
  if (process.env.NODE_ENV === 'test' && code.startsWith('test-google-code:')) {
    try {
      const payloadBase64 = code.replace('test-google-code:', '');
      const jsonStr = Buffer.from(payloadBase64, 'base64').toString('utf-8');
      const payload = JSON.parse(jsonStr);
      return {
        valid: true,
        identity: {
          googleId: payload.sub || 'test-google-sub-id',
          email: String(payload.email || '').toLowerCase().trim(),
          emailVerified: Boolean(payload.email_verified ?? true),
          name: payload.name || String(payload.email || '').split('@')[0],
          givenName: payload.given_name,
          familyName: payload.family_name,
          picture: payload.picture
        }
      };
    } catch {
      return { valid: false, error: 'Malformed test code' };
    }
  }

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.VITE_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return {
      valid: false,
      error: 'Google OAuth client secret is not configured on the server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.'
    };
  }

  try {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      })
    });

    const tokenData = await res.json() as any;
    if (!res.ok || tokenData.error) {
      return {
        valid: false,
        error: tokenData.error_description || tokenData.error || 'Failed to exchange authorization code with Google'
      };
    }

    // Verify ID Token if returned
    if (tokenData.id_token) {
      return verifyGoogleIdToken(tokenData.id_token, clientId);
    }

    // Fallback: query userinfo endpoint with access_token
    if (tokenData.access_token) {
      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const info = await userinfoRes.json() as any;
      if (!userinfoRes.ok || info.error) {
        return { valid: false, error: info.error_description || 'Failed to fetch user profile from Google' };
      }
      return {
        valid: true,
        identity: {
          googleId: info.sub,
          email: String(info.email).toLowerCase().trim(),
          emailVerified: info.email_verified === true || info.email_verified === 'true',
          name: info.name || String(info.email).split('@')[0],
          givenName: info.given_name,
          familyName: info.family_name,
          picture: info.picture
        }
      };
    }

    return { valid: false, error: 'No ID token or access token received from Google' };
  } catch (err: any) {
    return { valid: false, error: `Google token exchange failed: ${err?.message || 'Network error'}` };
  }
}

/**
 * Authenticates or registers a verified Google identity into the Property Studio database.
 * Preserves existing accounts and roles; creates new accounts with PROPERTY_SEEKER.
 * Never assigns privileged roles (Super Admin, Developer).
 */
export async function authenticateGoogleIdentity(
  identity: GoogleIdentity,
  userAgent?: string,
  ip?: string
): Promise<GoogleAuthResult> {
  const email = identity.email.toLowerCase().trim();
  if (!email || !email.includes('@')) {
    return {
      success: false,
      statusCode: 400,
      error: 'A valid email address was not provided by Google'
    };
  }

  if (!identity.emailVerified) {
    return {
      success: false,
      statusCode: 400,
      error: 'Google account email is not verified'
    };
  }

  // 1. Look up user by verified Google email
  let user = await findUserByEmail(email);

  if (user) {
    // 2. Existing user check: enforce account suspensions and locks
    if (user.account_status === 'DISABLED' || user.account_status === 'SUSPENDED') {
      return {
        success: false,
        statusCode: 403,
        error: 'This account has been suspended. Please contact administrator.'
      };
    }

    // Role & permissions remain strictly intact (existing Super Admin, Developer, Partner, Seeker roles are preserved)
    // Update profile picture if user doesn't have a customized photo yet
    if ((!user.avatar || user.avatar.includes('dicebear')) && identity.picture) {
      try {
        await updateUserProfileFields(user.id, { avatar: identity.picture });
        user.avatar = identity.picture;
      } catch {}
    }

    // Create session in authoritative database
    const { token } = await createSession(user.id, userAgent, ip);
    await updateLastLogin(user.id);

    const { password_hash, salt, ...safeUser } = user;
    let assignedPropertyIds: string[] = [];
    if (Array.isArray(safeUser.assigned_properties)) {
      assignedPropertyIds = safeUser.assigned_properties;
    } else if (typeof safeUser.assigned_properties === 'string' && safeUser.assigned_properties.trim()) {
      try {
        const parsed = JSON.parse(safeUser.assigned_properties.trim());
        assignedPropertyIds = Array.isArray(parsed) ? parsed : [];
      } catch {
        assignedPropertyIds = [];
      }
    }

    const hasVerifiedPhone = user.role === 'SUPER_ADMIN' || Boolean(
      user.phone &&
      String(user.phone).trim() &&
      Number(user.phone_verified) === 1
    );
    const requiresPhoneVerification = !hasVerifiedPhone;
    const isProfileComplete = isUserProfileComplete(user);

    return {
      success: true,
      statusCode: 200,
      user: {
        ...safeUser,
        isVerified: Boolean(safeUser.is_verified),
        preferredLanguage: safeUser.preferred_language || 'en',
        assignedPropertyIds,
        phone_verified: Number(user.phone_verified || 0),
        phoneVerified: hasVerifiedPhone,
        requiresPhoneVerification,
        isProfileComplete
      },
      sessionToken: token,
      isNewUser: false,
      requiresPhoneVerification,
      phoneVerified: hasVerifiedPhone,
      isProfileComplete,
      googlePicture: identity.picture
    };
  }

  // 3. New account registration:
  // Requirement 7: Never automatically assign privileged roles such as Super Admin or Developer
  const safeRole: UserRole = 'PROPERTY_SEEKER';

  // Secure high-entropy random password hash so account cannot be password-guessed
  const randomPassword = crypto.randomBytes(32).toString('hex');

  const newUser = await createUser({
    name: identity.name || email.split('@')[0],
    email: email,
    role: safeRole,
    avatar: identity.picture,
    townCity: 'Hyderabad, Telangana, India',
    isVerified: true,
    phoneVerified: false,
    password: randomPassword
  });

  // Create session in authoritative database
  const { token } = await createSession(newUser.id, userAgent, ip);
  await updateLastLogin(newUser.id);

  const { password_hash, salt, ...safeUser } = newUser;
  return {
    success: true,
    statusCode: 200,
    user: {
      ...safeUser,
      townCity: newUser.town_city || 'Hyderabad, Telangana, India',
      profession: '',
      company: '',
      interests: [],
      isVerified: true,
      phone: '',
      phone_verified: 0,
      phoneVerified: false,
      requiresPhoneVerification: true,
      assignedPropertyIds: [],
      isProfileComplete: false
    },
    sessionToken: token,
    isNewUser: true,
    requiresPhoneVerification: true,
    phoneVerified: false,
    isProfileComplete: false,
    googlePicture: identity.picture
  };
}
