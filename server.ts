import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  isPostgresAuthoritative,
  findUserByEmail,
  findUserById,
  getAllUsers,
  createUser,
  updateUser,
  updateUserRole,
  deleteUser,
  suspendUser,
  createAuditLog,
  changePassword,
  resetPassword,
  verifyPassword,
  recoverDeveloperAccount,
  createSession,
  getSession,
  revokeSession,
  getAuditLogs,
  getAllPosts,
  getPostById,
  createPost,
  updatePost,
  deletePost,
  pinPost,
  upvotePost,
  togglePostLike,
  getCommentsForPost,
  createComment,
  deleteComment,
  toggleCommentLike,
  createModerationReport,
  getAllModerationReports,
  resolveModerationReport,
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  getCommunityEventsSince,
  getAllMedia,
  createMedia,
  deleteMedia,
  getAllLeads,
  createLead,
  deleteLead,
  getConferenceDetails,
  updateConferenceDetails,
  findUserByPhone,
  verifyOtp,
  registerVerifiedUser,
  getAllCommunities,
  getCommunityById,
  createCommunity,
  updateCommunityStatus,
  deleteCommunity,
  updateLastLogin
} from './src/server/db.ts';
import { checkPostgresHealth, checkSchemaReadiness, redactDatabaseError } from './src/server/postgres.ts';
import { getNotificationGatewayStatus } from './src/server/notifications.ts';
import { createHostedApiHandler, expressPathForHostedRequest } from './src/server/hostedApi.ts';
import { issueEmailOtp, publicEmailOtpFailure } from './src/server/emailOtp.ts';
import { issuePhoneOtp } from './src/server/phoneOtp.ts';
import { whatsAppSettings } from './src/server/whatsappOtp.ts';
import { LEGAL_CONSENT_VERSION, legalDocumentForPath } from './src/shared/legal.ts';
import { renderLegalHtml } from './src/server/legalHtml.ts';
import { serializeAccount } from './src/server/accountView.ts';
import { RegistrationRejected } from './src/server/registrationError.ts';
import { OtpCooldownError } from './src/server/otpCrypto.ts';
import { registerPlatformRoutes } from './src/server/platformRoutes.ts';
import { upsertProfessionalProfile } from './src/server/commerce.ts';
import { buildHealthReport } from './src/server/health.ts';
import { canViewModeratedContent, communityReplayVisible, selfServeStorageRole } from './src/shared/policy.ts';
import { isAllowedAvatar } from './src/shared/avatars.ts';
import { normalizeE164 } from './src/shared/phone.ts';
import { scrubPhoneFields } from './src/shared/phonePrivacy.ts';
import { allowRequest, clientKey } from './src/server/rateLimit.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.set('trust proxy', 1);
app.use(express.json());
app.use(cookieParser());

function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000
  };
}

// Extend Express Request type for authenticated session
interface AuthenticatedRequest extends Request {
  user?: any;
  sessionToken?: string;
}

// Global Authentication Middleware (Asynchronous session verification)
const authenticateUser = async (req: AuthenticatedRequest, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const token = req.cookies?.ps_session || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (token) {
      const sessionData = await getSession(token);
      if (sessionData) {
        req.user = sessionData.user;
        req.sessionToken = token;
      }
    }
    next();
  } catch (err) {
    next(err);
  }
};

app.use(authenticateUser);

// Authorization Guards
const requireAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required. Please sign in.' });
    return;
  }
  next();
};

const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || (req.user.role !== 'DEVELOPER' && req.user.role !== 'SUPER_ADMIN')) {
    res.status(403).json({ error: 'Access denied: Super Administrator or Developer privileges required.' });
    return;
  }
  next();
};

const requireSuperAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    res.status(403).json({ error: 'Only a Super Admin can approve or reject this content.' });
    return;
  }
  next();
};

function rejectIfRateLimited(req: Request, res: Response, action: string, identity = ''): boolean {
  const allowed = allowRequest(clientKey(req.ip, action, identity), action === 'login' ? 20 : 8, 15 * 60 * 1000);
  if (!allowed) {
    res.status(429).json({ error: 'Too many attempts. Wait and try again.' });
    return true;
  }
  return false;
}

const requireDeveloper = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'DEVELOPER') {
    res.status(403).json({ error: 'Access denied: Platform Developer (Owner) privileges required.' });
    return;
  }
  next();
};

// ==============================================================================
// REAL-TIME SSE (SERVER-SENT EVENTS) INFRASTRUCTURE
// ==============================================================================

interface SseClient {
  id: string;
  userId?: string;
  res: Response;
}

const sseClients = new Set<SseClient>();

function accountResponse(user: any, viewer = { id: user?.id, role: user?.role }) {
  return {
    ...serializeAccount(user, viewer),
    isVerified: Boolean(user?.is_verified)
  };
}

export function broadcastSseEvent(eventType: string, data: any, targetUserId?: string): void {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(scrubPhoneFields(data))}\n\n`;
  for (const client of sseClients) {
    if (!targetUserId || client.userId === targetUserId) {
      try {
        client.res.write(payload);
      } catch (_e) {
        sseClients.delete(client);
      }
    }
  }
}

// SSE Connection Endpoint with persistent replay from database
app.get('/api/community/events', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const client: SseClient = {
    id: clientId,
    userId: req.user?.id,
    res
  };
  sseClients.add(client);

  // Send initial handshake
  res.write(`event: CONNECTED\ndata: ${JSON.stringify({ clientId, timestamp: new Date().toISOString() })}\n\n`);

  // Replay missed events from authoritative database if client provides Last-Event-ID / Last-Timestamp
  const lastTime = req.headers['last-event-id'] as string;
  if (lastTime) {
    try {
      const missedEvents = await getCommunityEventsSince(lastTime, req.user?.id);
      for (const ev of missedEvents) {
        let payload: any = {};
        try {
          payload = JSON.parse(ev.payload);
        } catch {
          payload = {};
        }
        if (!communityReplayVisible(payload, req.user)) {
          continue;
        }
        res.write(`event: ${ev.event_type}\ndata: ${JSON.stringify(scrubPhoneFields(payload))}\n\n`);
      }
    } catch (_e) {}
  }

  // Heartbeat ping every 15s to keep connection active
  const heartbeatTimer = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch (_e) {
      clearInterval(heartbeatTimer);
      sseClients.delete(client);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeatTimer);
    sseClients.delete(client);
  });
});

// ==============================================================================
// AUTHENTICATION & SESSION ROUTES
// ==============================================================================

// Login endpoint
app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }
    if (rejectIfRateLimited(req, res, 'login', String(email))) return;

    const user = await findUserByEmail(email);
    const passwordMatches = Boolean(user) && verifyPassword(password, user!.password_hash, user!.salt);
    if (!user || !passwordMatches) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    if (user.account_status === 'DISABLED' || user.account_status === 'SUSPENDED') {
      res.status(403).json({ error: 'This account has been suspended. Please contact administrator.' });
      return;
    }

    // Create session in authoritative database
    const { token } = await createSession(user.id, req.headers['user-agent'], req.ip);
    await updateLastLogin(user.id);

    // Set secure HttpOnly cookie
    res.cookie('ps_session', token, sessionCookieOptions());

    res.json({ success: true, user: accountResponse(user) });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Server error during login' });
  }
});

// Logout endpoint
app.post('/api/auth/logout', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  if (req.sessionToken) {
    await revokeSession(req.sessionToken);
  }
  res.clearCookie('ps_session');
  res.json({ success: true, message: 'Logged out successfully' });
});

// Get currently authenticated user
app.get('/api/auth/me', (req: AuthenticatedRequest, res: Response): void => {
  if (!req.user) {
    res.json({ user: null });
    return;
  }
  res.json({ user: accountResponse(req.user) });
});

// Send Email OTP for Account Registration
app.post('/api/auth/send-email-otp', async (req: Request, res: Response): Promise<void> => {
  if (rejectIfRateLimited(req, res, 'email-otp', String(req.body?.email || ''))) return;
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'An account with this email address already exists' });
      return;
    }
    const issued = await issueEmailOtp(email, 'EMAIL_VERIFICATION');
    if (!issued.sent) {
      console.warn(`[Property Studio] Verification email was not issued (${issued.code}).`);
      const failure = publicEmailOtpFailure(issued.code);
      res.status(failure.status).json({ error: failure.error, code: failure.code });
      return;
    }

    res.json({
      success: true,
      message: 'Property Studio verification code dispatched. Check the inbox for that address.',
      expiresAt: issued.expiresAt,
      deliveredVia: issued.provider
    });
  } catch (err: any) {
    if (err instanceof OtpCooldownError || err?.name === 'OtpCooldownError') {
      res.status(429).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Unable to send a verification code.' });
  }
});

// Verify Email OTP
app.post('/api/auth/verify-email-otp', async (req: Request, res: Response): Promise<void> => {
  if (rejectIfRateLimited(req, res, 'verify-email-otp', String(req.body?.email || ''))) return;
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      res.status(400).json({ error: 'Email and verification code are required' });
      return;
    }
    const isValid = await verifyOtp(email, 'EMAIL_VERIFICATION', otp);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired verification code' });
      return;
    }
    res.json({ success: true, verified: true, message: 'Email address verified successfully' });
  } catch {
    res.status(500).json({ error: 'Unable to verify the code.' });
  }
});

// Self-Service Forgot Password
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  if (rejectIfRateLimited(req, res, 'forgot-password', String(req.body?.email || ''))) return;
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    const acknowledgement = {
      success: true,
      message: 'If an active account exists with this email address, a password reset code has been dispatched.'
    };
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      try {
        await issueEmailOtp(email, 'PASSWORD_RESET');
      } catch (err: any) {
        if (!(err instanceof OtpCooldownError) && err?.name !== 'OtpCooldownError') {
          console.warn('[Property Studio] Password reset email was not issued.');
        }
      }
    }
    res.json(acknowledgement);
  } catch {
    res.status(500).json({ error: 'Unable to process password reset request' });
  }
});

// Self-Service Reset Password
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
  if (rejectIfRateLimited(req, res, 'reset-password', String(req.body?.email || ''))) return;
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: 'Email, verification code, and new password are required' });
      return;
    }

    if (newPassword.length < 8) {
      res.status(400).json({ error: 'New password must be at least 8 characters long' });
      return;
    }

    const targetUser = await findUserByEmail(email);
    if (!targetUser) {
      res.status(400).json({ error: 'Invalid reset request' });
      return;
    }

    const isValid = await verifyOtp(email, 'PASSWORD_RESET', otp);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired password reset verification code' });
      return;
    }

    await resetPassword(targetUser.id, newPassword);

    await createAuditLog({
      actorId: targetUser.id,
      actorEmail: targetUser.email,
      actorRole: targetUser.role,
      action: 'USER_PASSWORD_RESET_VIA_OTP',
      targetId: targetUser.id,
      targetEmail: targetUser.email
    });

    res.json({ success: true, message: 'Password has been successfully reset. You may now sign in with your new password.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password' });
  }
});

// Send Phone OTP. Property Seeker registration cannot finish without a real provider delivery.
app.post('/api/auth/send-phone-otp', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const normalized = normalizeE164(req.body?.phone);
  if (!normalized) {
    res.status(400).json({ error: 'A valid international mobile number in E.164 format is required.' });
    return;
  }
  if (rejectIfRateLimited(req, res, 'phone-otp', normalized)) return;
  const acknowledgement = {
    success: true,
    message: 'If this mobile number can be verified, a WhatsApp code has been sent.',
    deliveredVia: 'whatsapp'
  };
  try {
    if (!whatsAppSettings()) {
      res.status(503).json({
        error: 'WhatsApp verification is not configured. No code was sent and no account was created.',
        code: 'WHATSAPP_NOT_CONFIGURED'
      });
      return;
    }
    const existing = await findUserByPhone(normalized);
    if (existing && existing.id !== req.user?.id) {
      res.json(acknowledgement);
      return;
    }
    const issued = await issuePhoneOtp(normalized);
    if (!issued.sent) {
      const status = issued.code === 'WHATSAPP_NOT_CONFIGURED' ? 503 : 502;
      res.status(status).json({
        error: issued.code === 'WHATSAPP_NOT_CONFIGURED'
          ? 'WhatsApp verification is not configured. No code was sent and no account was created.'
          : 'WhatsApp did not accept the verification code. No code remains active and no account was created.',
        code: issued.code
      });
      return;
    }
    res.json(acknowledgement);
  } catch (err: any) {
    if (err instanceof OtpCooldownError || err?.name === 'OtpCooldownError') {
      res.status(429).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'Unable to send a verification code.' });
  }
});

// Verify Phone OTP
app.post('/api/auth/verify-phone-otp', async (req: Request, res: Response): Promise<void> => {
  const phone = normalizeE164(req.body?.phone);
  if (rejectIfRateLimited(req, res, 'verify-phone-otp', phone || String(req.body?.phone || ''))) return;
  try {
    const otp = req.body?.otp;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone number and verification code are required' });
      return;
    }
    const isValid = await verifyOtp(phone, 'PHONE_VERIFICATION', otp);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired WhatsApp verification code' });
      return;
    }
    res.json({ success: true, verified: true, message: 'Phone number successfully verified' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Registration endpoint
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  if (rejectIfRateLimited(req, res, 'register', String(req.body?.email || ''))) return;
  try {
    const { name, email, password, role, phone, organization, otp, phoneOtp } = req.body;
    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required' });
      return;
    }

    if (!otp) {
      res.status(400).json({ error: 'Email verification code (OTP) is required to register' });
      return;
    }

    const requestedRole = String(role || '').trim();
    if (requestedRole === 'SUPER_ADMIN' || requestedRole === 'DEVELOPER') {
      res.status(403).json({ error: 'That role cannot be registered through self-service. No account was created.' });
      return;
    }

    if (req.body?.acceptLegal !== true) {
      res.status(400).json({
        error: 'Accept the Privacy Policy and Terms & Conditions to create an account.',
        code: 'LEGAL_CONSENT_REQUIRED'
      });
      return;
    }

    const safeRole = selfServeStorageRole(requestedRole);
    const seeker = safeRole === 'PROPERTY_SEEKER';
    const normalizedPhone = normalizeE164(phone);
    if (phone && String(phone).trim() && !normalizedPhone) {
      res.status(400).json({ error: 'A valid international mobile number in E.164 format is required.' });
      return;
    }
    if (!seeker && normalizedPhone) {
      res.status(400).json({
        error: 'This registration uses email verification only. A mobile number was not saved and no account was created.',
        code: 'PHONE_NOT_ACCEPTED'
      });
      return;
    }
    if (seeker && !normalizedPhone) {
      res.status(400).json({ error: 'Property Seeker registration requires a valid international mobile number.' });
      return;
    }
    if (seeker && !phoneOtp) {
      res.status(400).json({ error: 'WhatsApp verification code is required for Property Seeker registration.' });
      return;
    }
    if (normalizedPhone) {
      const taken = await findUserByPhone(normalizedPhone);
      if (taken) {
        res.status(400).json({ error: 'Registration could not be completed.' });
        return;
      }
    }

    const acceptedAt = new Date().toISOString();
    const newUser = await registerVerifiedUser({
      name,
      email,
      password,
      role: safeRole,
      phone: normalizedPhone || '',
      organization: organization?.trim() || '',
      otp: String(otp),
      phoneOtp: seeker ? String(phoneOtp) : undefined,
      requirePhone: seeker,
      legalConsentVersion: LEGAL_CONSENT_VERSION,
      legalConsentAt: acceptedAt
    });
    await createAuditLog({
      actorId: newUser.id,
      actorEmail: newUser.email,
      actorRole: newUser.role,
      action: 'LEGAL_CONSENT_ACCEPTED',
      targetId: newUser.id,
      targetEmail: newUser.email,
      details: { version: LEGAL_CONSENT_VERSION, acceptedAt }
    });

    const { token } = await createSession(newUser.id, req.headers['user-agent'], req.ip);
    res.cookie('ps_session', token, sessionCookieOptions());

    if (safeRole !== 'PROPERTY_SEEKER') {
      try {
        await upsertProfessionalProfile({
          userId: newUser.id,
          role: safeRole,
          organization: organization?.trim() || ''
        });
      } catch {
        console.error('[Property Studio] The new account was created, but its professional profile was not.');
      }
    }

    res.json({ success: true, user: accountResponse(newUser) });
  } catch (err: any) {
    if (err instanceof RegistrationRejected || err?.name === 'RegistrationRejected') {
      res.status(err.statusCode || 400).json({ error: err.message });
      return;
    }
    const message = typeof err?.message === 'string' && !/postgres|sqlite|constraint|select |insert /i.test(err.message)
      ? err.message
      : 'Registration failed';
    res.status(400).json({ error: message });
  }
});

// Change Password
app.post('/api/auth/change-password', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required' });
      return;
    }

    const ok = await changePassword(req.user.id, currentPassword, newPassword);
    if (!ok) {
      res.status(400).json({ error: 'Incorrect current password' });
      return;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to update password' });
  }
});

// Lost Developer Account Recovery endpoint
app.post('/api/auth/recover-developer', async (req: Request, res: Response): Promise<void> => {
  try {
    const { recoverySecret, newPassword } = req.body;
    if (!recoverySecret || !newPassword) {
      res.status(400).json({ error: 'Recovery secret and new password are required' });
      return;
    }

    const result = await recoverDeveloperAccount(recoverySecret, newPassword);
    if (!result.success) {
      res.status(403).json({ error: result.error });
      return;
    }

    res.json({ success: true, message: 'Developer account successfully recovered. You may now log in.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Notification gateway status check
app.get('/api/notifications/status', (_req: Request, res: Response): void => {
  res.json({ success: true, ...getNotificationGatewayStatus() });
});

// Database, Authoritative Engine & Integration Health Check
app.get('/api/database/status', async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildHealthReport();
    const pgStatus = isPostgresAuthoritative() ? await checkPostgresHealth() : { connected: false as const };
    const schema = isPostgresAuthoritative() ? await checkSchemaReadiness() : null;
    if ('error' in pgStatus && pgStatus.error) {
      console.error(`[Property Studio] Database status check failed: ${pgStatus.error}`);
    }
    if (schema?.error) {
      console.error(`[Property Studio] Schema status check failed: ${schema.error}`);
    }
    res.status(report.httpStatus).json({
      success: report.httpStatus === 200,
      authoritativeDatabase: report.body,
      integrations: {
        postgres: {
          connected: pgStatus.connected,
          latencyMs: 'latencyMs' in pgStatus ? pgStatus.latencyMs : undefined,
          schemaReady: schema?.ready ?? false,
          missingTables: schema?.missing ?? []
        },
        mongodb: { configured: false, connected: false, role: 'NOT_USED' }
      }
    });
  } catch (err) {
    console.error('[Property Studio] Database status failed:', redactDatabaseError(err instanceof Error ? err.message : 'status failed'));
    res.status(503).json({ success: false, error: 'Database status is unavailable.' });
  }
});

app.get('/api/mongodb/status', (_req: Request, res: Response): void => {
  res.json({
    success: true,
    configured: false,
    connected: false,
    role: 'NOT_USED',
    status: 'NOT_CONFIGURED'
  });
});

app.post('/api/admin/migrate-to-postgres', requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  res.status(410).json({ error: 'SQLite import is not available over HTTP. Deployment does not import old records.' });
});

app.get('/api/admin/reconcile-databases', requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  res.status(410).json({ error: 'Database reconciliation against SQLite is disabled in the running service.' });
});

app.post('/api/admin/reverse-sync-to-sqlite', requireAdmin, (_req: AuthenticatedRequest, res: Response): void => {
  res.status(410).json({ error: 'SQLite reverse-sync is disabled. PostgreSQL remains the authoritative store.' });
});

// ==============================================================================
// PRIVILEGED USER & ROLE ADMINISTRATION
// ==============================================================================

// Get all users
app.get('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    await createAuditLog({
      actorId: req.user?.id,
      actorEmail: req.user?.email,
      actorRole: req.user?.role,
      action: 'PHONE_ACCESS',
      details: { route: '/api/admin/users', count: users.length }
    });
    res.json({
      users: users.map(u => accountResponse(u, {
        id: req.user?.id,
        role: req.user?.role
      }))
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create user account
app.post('/api/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, email, phone, role, organization, password } = req.body;
    if (!name || !email) {
      res.status(400).json({ error: 'Name and email are required' });
      return;
    }
    const normalizedPhone = phone ? normalizeE164(phone) : '';
    if (phone && !normalizedPhone) {
      res.status(400).json({ error: 'A valid international mobile number in E.164 format is required.' });
      return;
    }
    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(400).json({ error: 'A user with this email already exists' });
      return;
    }

    if (role === 'DEVELOPER' && req.user.role !== 'DEVELOPER') {
      res.status(403).json({ error: 'Access Denied: Only Platform Developers can create Developer accounts.' });
      return;
    }
    if (role === 'SUPER_ADMIN' && req.user.role !== 'DEVELOPER') {
      res.status(403).json({ error: 'Access Denied: Only Platform Developers can create Super Admin accounts.' });
      return;
    }

    const newUser = await createUser({
      name,
      email,
      phone: normalizedPhone || '',
      role: role || 'PROPERTY_SEEKER',
      organization,
      password: password || undefined,
      isVerified: true
    });

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_USER_CREATED',
      targetId: newUser.id,
      targetEmail: newUser.email,
      details: { role: newUser.role }
    });

    res.json({
      success: true,
      user: accountResponse(newUser, { id: req.user.id, role: req.user.role })
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset user password
app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters.' });
      return;
    }

    const targetUser = await findUserById(req.params.id);
    if (!targetUser) {
      res.status(404).json({ error: 'Target user not found.' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN' && targetUser.role === 'DEVELOPER') {
      res.status(403).json({ error: 'Access Denied: Super Admins cannot reset passwords for Developer accounts.' });
      return;
    }

    if (req.user.role === 'SUPER_ADMIN' && targetUser.role === 'SUPER_ADMIN' && req.user.id !== targetUser.id) {
      res.status(403).json({ error: 'Access Denied: Only Platform Developers can reset Super Admin passwords.' });
      return;
    }

    await resetPassword(targetUser.id, newPassword);

    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'ADMIN_PASSWORD_RESET',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      details: { targetRole: targetUser.role }
    });

    res.json({ success: true, message: `Password reset successfully for ${targetUser.email}` });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Change user role
app.patch('/api/admin/users/:id/role', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { role } = req.body;
    if (!role) {
      res.status(400).json({ error: 'New role is required' });
      return;
    }

    const result = await updateUserRole(req.user, req.params.id, role);
    if (!result.success) {
      res.status(403).json({ error: result.error });
      return;
    }

    res.json({ success: true, user: accountResponse(result.user, { id: req.user.id, role: req.user.role }) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Suspend or activate user
app.post('/api/admin/users/:id/suspend', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { suspend } = req.body;
    const result = await suspendUser(req.user, req.params.id, Boolean(suspend));
    if (!result.success) {
      res.status(403).json({ error: result.error });
      return;
    }
    res.json({ success: true, message: suspend ? 'User suspended' : 'User activated' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete user account
app.delete('/api/admin/users/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await deleteUser(req.user, req.params.id);
    if (!result.success) {
      res.status(403).json({ error: result.error });
      return;
    }
    res.json({ success: true, message: 'User account removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Immutable Audit Logs
app.get('/api/admin/audit-logs', requireDeveloper, async (req: Request, res: Response): Promise<void> => {
  try {
    const limit = Number(req.query.limit) || 50;
    const offset = Number(req.query.offset) || 0;
    const action = req.query.action as string | undefined;
    const logs = await getAuditLogs(limit, offset, action);
    res.json({ logs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// LIVE COMMUNITY — POSTS, LINKS, PODCASTS, VIDEOS & LIKES
// ==============================================================================

// Fetch all community posts
app.get('/api/community/posts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const communityId = req.query.communityId as string | undefined;
    const topic = req.query.topic as string | undefined;
    const mediaType = req.query.mediaType as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;

    const posts = await getAllPosts({
      communityId,
      topic,
      mediaType,
      limit,
      offset,
      currentUserId: req.user?.id
    });

    res.json({ posts });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch single post with full comments
app.get('/api/community/posts/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const post = await getPostById(req.params.id, req.user?.id);
    if (!post || !canViewModeratedContent(post.status, post.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ post });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create community post
app.post('/api/community/posts', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, content, topic, communityId, communityName, propertyId, propertyName, links, attachments, mediaType, mediaUrl, thumbnailUrl, duration } = req.body;
    if (!title || !content || !topic) {
      res.status(400).json({ error: 'Title, content, and topic are required' });
      return;
    }

    const post = await createPost({
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      communityId,
      communityName,
      propertyId,
      propertyName,
      topic,
      title,
      content,
      links,
      attachments,
      mediaType: mediaType || 'POST',
      mediaUrl,
      thumbnailUrl,
      duration
    });

    broadcastSseEvent('POST_CREATED', { id: post.id, status: post.status }, req.user.id);
    res.json({ success: true, post });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update post
app.put('/api/community/posts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isElevated = req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_ADMIN';
    const updated = await updatePost(req.params.id, req.user.id, req.body, isElevated);
    if (!updated) {
      res.status(403).json({ error: 'Unauthorized to edit this post' });
      return;
    }
    broadcastSseEvent('POST_UPDATED', { id: updated.id, status: updated.status }, req.user.id);
    res.json({ success: true, post: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete post
app.delete('/api/community/posts/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isElevated = req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_ADMIN';
    const ok = await deletePost(req.params.id, req.user.id, isElevated);
    if (!ok) {
      res.status(403).json({ error: 'Unauthorized to delete this post' });
      return;
    }
    broadcastSseEvent('POST_DELETED', { id: req.params.id });
    res.json({ success: true, message: 'Post removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Pin / Unpin post
app.patch('/api/community/posts/:id/pin', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { isPinned } = req.body;
    await pinPost(req.params.id, Boolean(isPinned));
    broadcastSseEvent('POST_UPDATED', { id: req.params.id, isPinned });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts/:id/upvote', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const post = await getPostById(req.params.id, req.user?.id);
    if (!post || !canViewModeratedContent(post.status, post.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const result = await togglePostLike(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/community/posts/:id/reply', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const content = String(req.body?.content || '').trim();
    if (!content) {
      res.status(400).json({ error: 'Comment content cannot be empty' });
      return;
    }
    const parentPost = await getPostById(req.params.id, req.user?.id);
    if (!parentPost || !canViewModeratedContent(parentPost.status, parentPost.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const comment = await createComment({
      postId: req.params.id,
      parentId: null,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      content
    });
    res.json({ success: true, comment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/admin/posts/:id', requireSuperAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const ok = await deletePost(req.params.id, req.user.id, true);
    if (!ok) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Post Like
app.post('/api/community/posts/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const post = await getPostById(req.params.id, req.user?.id);
    if (!post || !canViewModeratedContent(post.status, post.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const result = await togglePostLike(req.params.id, req.user.id);
    if (post.status === 'APPROVED' || post.status === 'PUBLISHED') {
      broadcastSseEvent('LIKE_CHANGED', { postId: req.params.id, upvotes: result.upvotes });
    }
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// COMMENTS & NESTED REPLIES
// ==============================================================================

// Fetch comments for a post
app.get('/api/community/posts/:id/comments', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const post = await getPostById(req.params.id, req.user?.id);
    if (!post || !canViewModeratedContent(post.status, post.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }
    const comments = await getCommentsForPost(req.params.id, req.user?.id);
    res.json({ comments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment or nested reply to a post
app.post('/api/community/posts/:id/comments', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { content, parentId } = req.body;
    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Comment content cannot be empty' });
      return;
    }
    const parentPost = await getPostById(req.params.id, req.user?.id);
    if (!parentPost || !canViewModeratedContent(parentPost.status, parentPost.authorId, req.user)) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const comment = await createComment({
      postId: req.params.id,
      parentId: parentId || null,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      content: content.trim()
    });

    if (parentPost.status === 'APPROVED' || parentPost.status === 'PUBLISHED') {
      broadcastSseEvent('COMMENT_CREATED', comment);
    }
    res.json({ success: true, comment });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Delete comment
app.delete('/api/community/comments/:id', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isElevated = req.user.role === 'DEVELOPER' || req.user.role === 'SUPER_ADMIN';
    const ok = await deleteComment(req.params.id, req.user.id, isElevated);
    if (!ok) {
      res.status(403).json({ error: 'Unauthorized to delete this comment' });
      return;
    }
    broadcastSseEvent('COMMENT_DELETED', { id: req.params.id });
    res.json({ success: true, message: 'Comment removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Comment Like
app.post('/api/community/comments/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await toggleCommentLike(req.params.id, req.user.id);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MODERATION REPORTS
// ==============================================================================

app.post('/api/community/reports', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { targetType, targetId, reason } = req.body;
    if (!targetType || !targetId || !reason) {
      res.status(400).json({ error: 'Target type, target ID, and reason are required' });
      return;
    }

    const report = await createModerationReport({
      reporterId: req.user.id,
      reporterName: req.user.name,
      targetType,
      targetId,
      reason
    });

    res.json({ success: true, report });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/admin/reports', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const status = req.query.status as string | undefined;
    const reports = await getAllModerationReports(status);
    res.json({ reports });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/reports/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { status, resolutionNotes } = req.body;
    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }
    await resolveModerationReport(req.params.id, req.user.name, status, resolutionNotes);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// USER NOTIFICATIONS
// ==============================================================================

app.get('/api/notifications', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const notifications = await getUserNotifications(req.user.id);
    const unreadCount = await getUnreadNotificationCount(req.user.id);
    res.json(scrubPhoneFields({ notifications, unreadCount }));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notifications/unread-count', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const count = await getUnreadNotificationCount(req.user.id);
    res.json({ unreadCount: count });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await markNotificationRead(req.params.id, req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await markAllNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// COMMUNITIES MANAGEMENT
// ==============================================================================

app.get('/api/communities', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const approved = await getAllCommunities('APPROVED');
    if (!req.user) {
      res.json({ communities: approved });
      return;
    }
    const all = await getAllCommunities();
    const own = all.filter(community => community.created_by_id === req.user!.id && community.status !== 'APPROVED');
    const seen = new Set(approved.map(community => community.id));
    res.json({ communities: [...own.filter(community => !seen.has(community.id)), ...approved] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/communities/all', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const communities = await getAllCommunities();
    res.json({ communities });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/communities', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category, location, rules } = req.body;
    if (!name || !description || !category) {
      res.status(400).json({ error: 'Name, description, and category are required' });
      return;
    }

    const newCommunity = await createCommunity({
      name,
      description,
      category,
      location,
      rules,
      createdById: req.user.id,
      createdByName: req.user.name
    });

    res.json({ success: true, community: newCommunity });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/communities/:id/status', requireSuperAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reason, rejection_reason: rejectionReason } = req.body;
    const recordedReason = reason || rejectionReason;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
      return;
    }

    const updated = await updateCommunityStatus(req.params.id, status, recordedReason);
    if (!updated) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    res.json({ success: true, community: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/communities/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteCommunity(req.params.id);
    res.json({ success: true, message: 'Community removed' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// MEDIA, LEADS & CONFERENCE
// ==============================================================================

app.get('/api/media', async (_req: Request, res: Response): Promise<void> => {
  try {
    const items = await getAllMedia();
    res.json({ items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/media', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const mediaId = await createMedia(req.body);
    res.json({ success: true, mediaId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.delete('/api/media/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteMedia(req.params.id);
    res.json({ success: true, message: 'Media item deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/leads/:id', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    await deleteLead(req.params.id);
    res.json({ success: true, message: 'Lead deleted' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/conference', async (_req: Request, res: Response): Promise<void> => {
  try {
    const conference = await getConferenceDetails();
    res.json({ conference });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/conference', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const updated = await updateConferenceDetails(req.body);
    res.json({ success: true, conference: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/health', async (_req: Request, res: Response): Promise<void> => {
  try {
    const report = await buildHealthReport();
    res.status(report.httpStatus).json(report.body);
  } catch (err) {
    console.error('[Property Studio] Health report failed:', redactDatabaseError(err instanceof Error ? err.message : 'health failed'));
    res.status(503).json({
      status: 'UNAVAILABLE',
      authoritativeDatabase: 'unconfigured',
      sqliteFallback: false,
      database: { connected: false, schemaReady: false, missingTables: [], code: 'DATABASE_STARTUP_FAILED' }
    });
  }
});

app.post('/api/auth/change-phone', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const phone = normalizeE164(req.body?.phone);
    const otp = String(req.body?.otp || '');
    if (!phone || !otp) {
      res.status(400).json({ error: 'Mobile number and WhatsApp verification code are required.' });
      return;
    }
    const taken = await findUserByPhone(phone);
    if (taken && taken.id !== req.user.id) {
      res.status(400).json({ error: 'That mobile number cannot be used.' });
      return;
    }
    const valid = await verifyOtp(phone, 'PHONE_VERIFICATION', otp);
    if (!valid) {
      res.status(400).json({ error: 'Invalid or expired WhatsApp verification code.' });
      return;
    }
    const updated = await updateUser(req.user.id, { phone, phone_verified: 1 });
    await createAuditLog({
      actorId: req.user.id,
      actorEmail: req.user.email,
      actorRole: req.user.role,
      action: 'PHONE_CHANGED',
      targetId: req.user.id,
      details: { verified: true }
    });
    req.user = updated;
    res.json({ success: true, user: accountResponse(updated) });
  } catch {
    res.status(400).json({ error: 'The mobile number could not be changed.' });
  }
});

app.patch('/api/me/avatar', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const avatarId = String(req.body?.avatarId || '');
    if (!isAllowedAvatar(avatarId)) {
      res.status(400).json({ error: 'Choose an avatar from the studio library.' });
      return;
    }
    const before = req.user;
    const updated = await updateUser(req.user.id, { avatar: avatarId });
    if (!updated || updated.role !== before.role || Number(updated.phone_verified) !== Number(before.phone_verified) || Number(updated.email_verified) !== Number(before.email_verified)) {
      res.status(409).json({ error: 'Avatar selection did not change account verification.' });
      return;
    }
    res.json({ success: true, user: accountResponse(updated) });
  } catch {
    res.status(400).json({ error: 'The avatar could not be saved.' });
  }
});

registerPlatformRoutes(app, { requireAuth, requireAdmin });

app.use('/api', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

function sendLegalPage(req: Request, res: Response): void {
  const document = legalDocumentForPath(req.path);
  if (!document) {
    res.status(404).type('html').send('Not found');
    return;
  }
  res.status(200).type('html').send(renderLegalHtml(document));
}

app.get('/privacy-policy', sendLegalPage);
app.get('/terms-and-conditions', sendLegalPage);

// ==============================================================================
// VITE DEV SERVER & PRODUCTION STATIC SERVING
// ==============================================================================

async function start() {
  // Ensure database initialization executes and verifies authoritative engine
  try {
    await initDatabase();
  } catch (err: any) {
    console.error('[Property Studio] FATAL: Authoritative database initialization failed:', err);
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req: Request, res: Response) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Property Studio] Live server running on http://0.0.0.0:${PORT}`);
    if (isPostgresAuthoritative()) {
      console.log(`[Property Studio] Authoritative engine: PostgreSQL (Neon / Managed Pooling Active)`);
    } else {
      console.log(`[Property Studio] Authoritative engine: SQLite (Local Development Persistence)`);
    }
  });
}

const entry = process.argv[1] || '';
if (entry.endsWith('server.ts') || entry.endsWith('server.js')) {
  start().catch(err => {
    console.error('[Property Studio] Failed to start server:', err);
    process.exit(1);
  });
}

export { app, initDatabase, expressPathForHostedRequest, createHostedApiHandler };
