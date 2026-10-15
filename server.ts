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
  generateOtp,
  verifyOtp,
  isTargetVerified,
  getAllCommunities,
  getCommunityById,
  createCommunity,
  updateCommunityStatus,
  deleteCommunity,
  updateLastLogin
} from './src/server/db.ts';
import { checkPostgresHealth } from './src/server/postgres.ts';
import {
  migrateSqliteToPostgres,
  reconcileSqliteAndPostgres,
  reverseSyncPostgresToSqlite
} from './src/server/postgresMigration.ts';
import { sendRealEmailOtp, sendRealSmsOtp, getNotificationGatewayStatus } from './src/server/notifications.ts';
import { connectMongoDB, saveRegistrationToMongo, getMongoHealth } from './src/server/mongodb.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB asynchronously if configured
connectMongoDB().catch(err => {
  console.warn('[MongoDB Init Warning]:', err.message);
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cookieParser());

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

export function broadcastSseEvent(eventType: string, data: any, targetUserId?: string): void {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
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
        res.write(`event: ${ev.event_type}\ndata: ${ev.payload}\n\n`);
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

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ error: 'No account found matching this email address' });
      return;
    }

    if (user.account_status === 'DISABLED' || user.account_status === 'SUSPENDED') {
      res.status(403).json({ error: 'This account has been suspended. Please contact administrator.' });
      return;
    }

    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      res.status(401).json({ error: 'Invalid password. Please check your credentials.' });
      return;
    }

    // Create session in authoritative database
    const { token } = await createSession(user.id, req.headers['user-agent'], req.ip);
    await updateLastLogin(user.id);

    // Set secure HttpOnly cookie
    res.cookie('ps_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    const { password_hash, salt, ...safeUser } = user;
    res.json({
      success: true,
      token,
      user: {
        ...safeUser,
        isVerified: Boolean(safeUser.is_verified),
        assignedPropertyIds: JSON.parse(safeUser.assigned_properties || '[]')
      }
    });
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
  const { password_hash, salt, ...safeUser } = req.user;
  res.json({
    user: {
      ...safeUser,
      isVerified: Boolean(safeUser.is_verified),
      assignedPropertyIds: JSON.parse(safeUser.assigned_properties || '[]')
    }
  });
});

// Send Email OTP for Account Registration
app.post('/api/auth/send-email-otp', async (req: Request, res: Response): Promise<void> => {
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
    const { otp, expiresAt } = await generateOtp(email, 'EMAIL_VERIFICATION');

    const dispatchResult = await sendRealEmailOtp(email.trim(), otp);

    if (!dispatchResult.success) {
      res.status(502).json({
        error: dispatchResult.error || 'Failed to dispatch verification email from Property Studio. Please check email provider configuration.'
      });
      return;
    }

    res.json({
      success: true,
      message: `Property Studio verification code dispatched to ${email}. Please check your inbox.`,
      expiresAt,
      deliveredVia: dispatchResult.provider
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Email OTP
app.post('/api/auth/verify-email-otp', async (req: Request, res: Response): Promise<void> => {
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
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Self-Service Forgot Password
app.post('/api/auth/forgot-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email address is required' });
      return;
    }

    const existingUser = await findUserByEmail(email);
    if (!existingUser) {
      res.json({
        success: true,
        message: 'If an active account exists with this email address, a password reset code has been dispatched.'
      });
      return;
    }

    const { otp, expiresAt } = await generateOtp(email, 'PASSWORD_RESET');
    const dispatchResult = await sendRealEmailOtp(email.trim(), otp);

    if (!dispatchResult.success) {
      res.status(502).json({
        error: dispatchResult.error || 'Failed to dispatch password reset email. Please try again later.'
      });
      return;
    }

    res.json({
      success: true,
      message: 'If an active account exists with this email address, a password reset code has been dispatched.',
      expiresAt,
      deliveredVia: dispatchResult.provider
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Unable to process password reset request' });
  }
});

// Self-Service Reset Password
app.post('/api/auth/reset-password', async (req: Request, res: Response): Promise<void> => {
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

// Send Phone OTP
app.post('/api/auth/send-phone-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone } = req.body;
    if (!phone || phone.trim().length < 8) {
      res.status(400).json({ error: 'Valid mobile number is required' });
      return;
    }
    const { otp, expiresAt } = await generateOtp(phone, 'PHONE_VERIFICATION');
    const dispatchResult = await sendRealSmsOtp(phone.trim(), otp);

    res.json({
      success: true,
      message: `Property Studio SMS verification OTP dispatched to ${phone}.`,
      expiresAt,
      deliveredVia: dispatchResult.provider
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Verify Phone OTP
app.post('/api/auth/verify-phone-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) {
      res.status(400).json({ error: 'Phone number and verification code are required' });
      return;
    }
    const isValid = await verifyOtp(phone, 'PHONE_VERIFICATION', otp);
    if (!isValid) {
      res.status(400).json({ error: 'Invalid or expired SMS OTP code' });
      return;
    }
    res.json({ success: true, verified: true, message: 'Phone number successfully verified' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Registration endpoint
app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
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

    const isVerified = (await verifyOtp(email, 'EMAIL_VERIFICATION', otp)) || (await isTargetVerified(email, 'EMAIL_VERIFICATION'));
    if (!isVerified) {
      res.status(400).json({ error: 'Invalid or expired email verification code' });
      return;
    }

    const safeRole = (role === 'AGENT' || role === 'CONTENT_CREATOR' || role === 'LAND_OWNER')
      ? role
      : 'PROPERTY_SEEKER';

    let isPhoneVerified = false;
    if (safeRole === 'PROPERTY_SEEKER') {
      if (!phone || phone.trim().length < 8) {
        res.status(400).json({ error: 'Mobile phone number is mandatory for Property Seeker registration.' });
        return;
      }

      const isMobileVerified = (phoneOtp && (await verifyOtp(phone.trim(), 'PHONE_VERIFICATION', phoneOtp))) ||
                               (await isTargetVerified(phone.trim(), 'PHONE_VERIFICATION'));
      if (!isMobileVerified) {
        res.status(400).json({ error: 'Mobile number OTP verification is required for Property Seeker registration. Please verify your mobile phone.' });
        return;
      }
      isPhoneVerified = true;
    } else {
      if (phone && phoneOtp) {
        isPhoneVerified = Boolean((await verifyOtp(phone.trim(), 'PHONE_VERIFICATION', phoneOtp)) || (await isTargetVerified(phone.trim(), 'PHONE_VERIFICATION')));
      }
    }

    const newUser = await createUser({
      name,
      email,
      password,
      role: safeRole,
      phone: phone?.trim() || '',
      organization: organization?.trim() || '',
      isVerified: true
    });

    if (!newUser) {
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    if (isPhoneVerified) {
      await updateUser(newUser.id, { phone_verified: 1 });
      newUser.phone_verified = 1;
    }

    saveRegistrationToMongo(newUser, {
      ip_address: req.ip,
      user_agent: req.headers['user-agent']
    }).catch(err => {
      console.warn('[MongoDB Storage Warning]:', err.message);
    });

    const { token } = await createSession(newUser.id, req.headers['user-agent'], req.ip);
    res.cookie('ps_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    const { password_hash, salt, ...safeUser } = newUser;
    res.json({
      success: true,
      token,
      user: {
        ...safeUser,
        isVerified: true,
        phone_verified: isPhoneVerified ? 1 : 0,
        assignedPropertyIds: JSON.parse(safeUser.assigned_properties || '[]')
      }
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Registration failed' });
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
  const pgConfigured = isPostgresAuthoritative();
  const pgStatus = await checkPostgresHealth();
  const mongoStatus = await getMongoHealth();

  let authoritativeDatabase;
  if (pgConfigured) {
    if (pgStatus.connected) {
      authoritativeDatabase = {
        engine: 'postgresql_managed',
        status: 'HEALTHY',
        latencyMs: pgStatus.latencyMs,
        durableStorage: true,
        description: 'Primary authoritative ACID database for all users, sessions, posts, comments, likes, leads, and events.'
      };
    } else {
      authoritativeDatabase = {
        engine: 'postgresql_managed',
        status: 'UNAVAILABLE',
        error: pgStatus.error || 'Failed to connect to managed PostgreSQL',
        durableStorage: true,
        description: 'PostgreSQL is designated as authoritative via DATABASE_URL but is currently unreachable. Silent SQLite fallback is disabled.'
      };
    }
  } else {
    authoritativeDatabase = {
      engine: 'sqlite_ephemeral',
      path: './data/propertystudio.db',
      status: 'ACTIVE_LOCAL_DEV',
      durableStorage: false,
      warning: 'Operating in local development mode on container filesystem. Configure DATABASE_URL for Neon PostgreSQL authoritative persistence.',
      description: 'Authoritative database in local-development mode. Production deployment requires DATABASE_URL.'
    };
  }

  res.json({
    success: pgConfigured ? pgStatus.connected : true,
    authoritativeDatabase,
    integrations: {
      postgres: pgStatus,
      mongodb: {
        ...mongoStatus,
        role: 'Secondary persistence & export layer (Active and verified)'
      }
    }
  });
});

// MongoDB Registration Storage Status
app.get('/api/mongodb/status', async (_req: Request, res: Response): Promise<void> => {
  const status = await getMongoHealth();
  res.json({ success: true, ...status });
});

// Trigger SQLite-to-PostgreSQL Data Migration (Developer & Super Admin only)
app.post('/api/admin/migrate-to-postgres', requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await migrateSqliteToPostgres();
    if (!result.success) {
      res.status(500).json({ error: result.error, stats: result.stats });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reconcile and audit source vs destination record counts (Developer & Super Admin only)
app.get('/api/admin/reconcile-databases', requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await reconcileSqliteAndPostgres();
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Emergency Rollback: Reverse-sync post-cutover delta records from PostgreSQL back into SQLite
app.post('/api/admin/reverse-sync-to-sqlite', requireAdmin, async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await reverseSyncPostgresToSqlite();
    if (!result.success) {
      res.status(500).json({ error: result.error, stats: result.stats });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==============================================================================
// PRIVILEGED USER & ROLE ADMINISTRATION
// ==============================================================================

// Get all users
app.get('/api/admin/users', requireAdmin, async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await getAllUsers();
    res.json({
      users: users.map(u => ({
        ...u,
        isVerified: Boolean(u.is_verified),
        assignedPropertyIds: JSON.parse(u.assigned_properties || '[]')
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
      phone,
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

    res.json({ success: true, user: newUser });
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

    res.json({ success: true, user: result.user });
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
    if (!post) {
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

    broadcastSseEvent('POST_CREATED', post);
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
    broadcastSseEvent('POST_UPDATED', updated);
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

// Toggle Post Like
app.post('/api/community/posts/:id/like', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const result = await togglePostLike(req.params.id, req.user.id);
    broadcastSseEvent('LIKE_CHANGED', { postId: req.params.id, upvotes: result.upvotes });
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

    const comment = await createComment({
      postId: req.params.id,
      parentId: parentId || null,
      authorId: req.user.id,
      authorName: req.user.name,
      authorRole: req.user.role,
      content: content.trim()
    });

    broadcastSseEvent('COMMENT_CREATED', comment);
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
    res.json({ notifications, unreadCount });
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

app.get('/api/communities', async (_req: Request, res: Response): Promise<void> => {
  try {
    const communities = await getAllCommunities('APPROVED');
    res.json({ communities });
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

app.patch('/api/admin/communities/:id/status', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, reason } = req.body;
    if (!status || (status !== 'APPROVED' && status !== 'REJECTED')) {
      res.status(400).json({ error: 'Status must be APPROVED or REJECTED' });
      return;
    }

    const updated = await updateCommunityStatus(req.params.id, status, reason);
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

app.get('/api/leads', async (_req: Request, res: Response): Promise<void> => {
  try {
    const leads = await getAllLeads();
    res.json({ leads });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/leads', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const leadId = await createLead(req.body);
    res.json({ success: true, leadId });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
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

app.get('/api/health', (_req: Request, res: Response): void => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    authoritativeDatabase: isPostgresAuthoritative() ? 'PostgreSQL' : 'SQLite'
  });
});

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
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
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

start().catch(err => {
  console.error('[Property Studio] Failed to start server:', err);
  process.exit(1);
});
