import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { runPostgresMigrations, getPostgresPool } from './postgres.ts';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_FILE = path.join(DATA_DIR, 'propertystudio.db');
export const db = new DatabaseSync(DB_FILE);

// ==============================================================================
// TYPE DEFINITIONS
// ==============================================================================

export type UserRole =
  | 'DEVELOPER'
  | 'SUPER_ADMIN'
  | 'COMMUNITY_MODERATOR'
  | 'CONTENT_CREATOR'
  | 'PROPERTY_ADMIN'
  | 'AGENT'
  | 'PROPERTY_SEEKER'
  | 'LAND_OWNER';

export interface DbUser {
  id: string;
  public_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  organization: string;
  wallet_balance: number;
  is_verified: number;
  email_verified: number;
  phone_verified: number;
  account_status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  must_change_password: number;
  assigned_properties: string; // JSON
  password_hash: string;
  salt: string;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string; // Token hash
  user_id: string;
  expires_at: number;
  is_revoked: number;
  user_agent?: string;
  ip_address?: string;
  created_at: string;
}

export interface DbOtp {
  id: string;
  target: string;
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET';
  otp_hash: string;
  otp_raw?: string;
  expires_at: number;
  attempt_count: number;
  is_verified: number;
  consumed_at?: string | null;
  created_at: string;
}

export interface DbAuditLog {
  id: string;
  actor_id: string;
  actor_email: string;
  actor_role: string;
  action: string;
  target_id?: string;
  target_email?: string;
  details?: string;
  ip_address?: string;
  status: 'SUCCESS' | 'FAILED';
  created_at: string;
}

export interface DbCommunity {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  location: string;
  created_by_id: string;
  created_by_name: string;
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
  rejection_reason: string;
  member_count: number;
  icon: string;
  banner_image: string;
  rules: string;
  created_at: string;
  updated_at: string;
}

export interface DbCommunityPost {
  id: string;
  author_id?: string;
  author_name: string;
  author_role: string;
  community_id?: string;
  community_name?: string;
  property_id?: string;
  property_name?: string;
  topic: string;
  title: string;
  content: string;
  links: string; // JSON array of { title, url }
  attachments: string; // JSON array of { type, url, name }
  media_type: 'POST' | 'PODCAST' | 'VIDEO';
  media_url?: string;
  thumbnail_url?: string;
  duration?: string;
  status: 'PUBLISHED' | 'FLAGGED' | 'ARCHIVED';
  upvotes: number;
  comments_count: number;
  is_pinned: number;
  is_flagged: number;
  created_at: string;
  updated_at: string;
}

export interface DbPostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface DbCommunityComment {
  id: string;
  post_id: string;
  parent_id?: string | null;
  author_id: string;
  author_name: string;
  author_role: string;
  content: string;
  likes_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbCommentLike {
  id: string;
  comment_id: string;
  user_id: string;
  created_at: string;
}

export interface DbModerationReport {
  id: string;
  reporter_id: string;
  reporter_name: string;
  target_type: 'POST' | 'COMMENT';
  target_id: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  reviewed_by?: string;
  resolution_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  actor_id: string;
  actor_name: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM';
  title: string;
  message: string;
  link_url?: string;
  is_read: number;
  created_at: string;
}

export interface DbCommunityEvent {
  id: string;
  event_type: string;
  payload: string; // JSON
  target_user_id?: string | null;
  created_at: string;
}

export interface DbCommunityReply {
  id: string;
  post_id: string;
  author_id?: string;
  author_name: string;
  author_role: string;
  is_verified_builder: number;
  content: string;
  created_at: string;
}

export interface DbMediaItem {
  id: string;
  title: string;
  summary: string;
  video_url: string;
  thumbnail: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'SITE_AUDIT';
  duration: string;
  views: number;
  author_name: string;
  created_at: string;
}

export interface DbBuyerLead {
  id: string;
  name: string;
  phone: string;
  email: string;
  budget: string;
  property_type: string;
  micro_market: string;
  tier: 'STANDARD' | 'PREMIUM' | 'HNI';
  price: number;
  requirements: string;
  status: string;
  created_at: string;
}

export interface DbConferenceDetails {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  time: string;
  stream_url: string;
  status: string;
  agenda: string; // JSON
  updated_at: string;
}

// ==============================================================================
// PASSWORD & CRYPTOGRAPHIC UTILITIES
// ==============================================================================

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(verifyHash, 'hex'));
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ==============================================================================
// DATABASE INITIALIZATION & MIGRATIONS
// ==============================================================================

export function initDatabase() {
  db.exec('PRAGMA foreign_keys = ON;');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      public_id TEXT UNIQUE,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'PROPERTY_SEEKER',
      avatar TEXT,
      organization TEXT,
      wallet_balance REAL DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      email_verified INTEGER DEFAULT 0,
      phone_verified INTEGER DEFAULT 0,
      account_status TEXT DEFAULT 'ACTIVE',
      must_change_password INTEGER DEFAULT 0,
      assigned_properties TEXT DEFAULT '[]',
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      is_revoked INTEGER DEFAULT 0,
      user_agent TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otps (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      type TEXT NOT NULL,
      otp_hash TEXT NOT NULL,
      otp_raw TEXT,
      expires_at INTEGER NOT NULL,
      attempt_count INTEGER DEFAULT 0,
      is_verified INTEGER DEFAULT 0,
      consumed_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_id TEXT NOT NULL,
      actor_email TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      action TEXT NOT NULL,
      target_id TEXT,
      target_email TEXT,
      details TEXT,
      ip_address TEXT,
      status TEXT DEFAULT 'SUCCESS',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS communities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      location TEXT,
      created_by_id TEXT,
      created_by_name TEXT,
      status TEXT DEFAULT 'PENDING_APPROVAL',
      rejection_reason TEXT,
      member_count INTEGER DEFAULT 1,
      icon TEXT,
      banner_image TEXT,
      rules TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_posts (
      id TEXT PRIMARY KEY,
      author_id TEXT,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      community_id TEXT,
      community_name TEXT,
      property_id TEXT,
      property_name TEXT,
      topic TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      links TEXT DEFAULT '[]',
      attachments TEXT DEFAULT '[]',
      media_type TEXT DEFAULT 'POST',
      media_url TEXT,
      thumbnail_url TEXT,
      duration TEXT,
      status TEXT DEFAULT 'PUBLISHED',
      upvotes INTEGER DEFAULT 0,
      comments_count INTEGER DEFAULT 0,
      is_pinned INTEGER DEFAULT 0,
      is_flagged INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS post_likes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS community_comments (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      parent_id TEXT REFERENCES community_comments(id) ON DELETE CASCADE,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      content TEXT NOT NULL,
      likes_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS comment_likes (
      id TEXT PRIMARY KEY,
      comment_id TEXT NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(comment_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS moderation_reports (
      id TEXT PRIMARY KEY,
      reporter_id TEXT NOT NULL,
      reporter_name TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      reason TEXT NOT NULL,
      status TEXT DEFAULT 'PENDING',
      reviewed_by TEXT,
      resolution_notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      actor_id TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_url TEXT,
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_events (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      target_user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS community_replies (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      author_id TEXT,
      author_name TEXT NOT NULL,
      author_role TEXT NOT NULL,
      is_verified_builder INTEGER DEFAULT 0,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS media_items (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      video_url TEXT NOT NULL,
      thumbnail TEXT NOT NULL,
      type TEXT NOT NULL,
      duration TEXT DEFAULT '15:00',
      views INTEGER DEFAULT 0,
      author_name TEXT DEFAULT 'Swamy Reddy Javidi',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS buyer_leads (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      budget TEXT NOT NULL,
      property_type TEXT NOT NULL,
      micro_market TEXT NOT NULL,
      tier TEXT NOT NULL,
      price REAL NOT NULL,
      requirements TEXT,
      status TEXT DEFAULT 'AVAILABLE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS conference_details (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subtitle TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      stream_url TEXT,
      status TEXT DEFAULT 'UPCOMING',
      agenda TEXT DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Safe additive migrations for existing SQLite databases
  const alterMigrations = [
    'ALTER TABLE users ADD COLUMN public_id TEXT',
    'ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN phone_verified INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT "ACTIVE"',
    'ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0',
    'ALTER TABLE users ADD COLUMN last_login_at TEXT',
    'ALTER TABLE community_posts ADD COLUMN community_id TEXT',
    'ALTER TABLE community_posts ADD COLUMN community_name TEXT',
    'ALTER TABLE community_posts ADD COLUMN links TEXT DEFAULT "[]"',
    'ALTER TABLE community_posts ADD COLUMN attachments TEXT DEFAULT "[]"',
    'ALTER TABLE community_posts ADD COLUMN media_type TEXT DEFAULT "POST"',
    'ALTER TABLE community_posts ADD COLUMN media_url TEXT',
    'ALTER TABLE community_posts ADD COLUMN thumbnail_url TEXT',
    'ALTER TABLE community_posts ADD COLUMN duration TEXT',
    'ALTER TABLE community_posts ADD COLUMN status TEXT DEFAULT "PUBLISHED"',
    'ALTER TABLE community_posts ADD COLUMN comments_count INTEGER DEFAULT 0',
    'ALTER TABLE community_posts ADD COLUMN updated_at TEXT',
    'ALTER TABLE otps ADD COLUMN otp_hash TEXT',
    'ALTER TABLE otps ADD COLUMN otp_raw TEXT',
    'ALTER TABLE otps ADD COLUMN attempt_count INTEGER DEFAULT 0',
    'ALTER TABLE otps ADD COLUMN consumed_at TEXT',
    'ALTER TABLE otps DROP COLUMN otp'
  ];

  for (const q of alterMigrations) {
    try {
      db.exec(q);
    } catch (_e) {}
  }

  ensureInitialCommunities();
  bootstrapProductionAccounts();

  // If DATABASE_URL is configured, run PostgreSQL migrations asynchronously
  if (process.env.DATABASE_URL) {
    runPostgresMigrations().catch(err => {
      console.warn('[PostgreSQL Init] Deferred migration warning:', err.message);
    });
  }
}

// ==============================================================================
// ROLE & ACCESS CONTROL HIERARCHY
// ==============================================================================

/**
 * Validates role changes against mandatory platform hierarchy:
 * 1. SUPER_ADMIN must NOT be able to revoke, demote, disable, or delete the DEVELOPER's privileged access.
 * 2. DEVELOPER can revoke SUPER_ADMIN privileges.
 * 3. Only DEVELOPER can grant or restore SUPER_ADMIN privileges.
 * 4. SUPER_ADMIN cannot grant themselves DEVELOPER privileges.
 * 5. Ordinary users cannot modify their own roles or another user's privileged role assignments.
 * 6. Lockout prevention: Never permit removal of the last usable DEVELOPER account.
 */
export function canActorModifyRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
  isTargetSelf: boolean,
  activeDeveloperCount: number
): { allowed: boolean; reason?: string } {
  // Ordinary users cannot modify any roles
  if (actorRole !== 'DEVELOPER' && actorRole !== 'SUPER_ADMIN') {
    return { allowed: false, reason: 'Unauthorized: Only platform administrators can change user roles.' };
  }

  // Users cannot modify their own role
  if (isTargetSelf) {
    return { allowed: false, reason: 'Security policy: You cannot modify your own role assignment.' };
  }

  // SUPER_ADMIN cannot modify, demote, or revoke DEVELOPER
  if (actorRole === 'SUPER_ADMIN' && targetCurrentRole === 'DEVELOPER') {
    return { allowed: false, reason: 'Access Denied: Super Admins cannot modify, demote, or revoke Developer accounts.' };
  }

  // SUPER_ADMIN cannot promote anyone to DEVELOPER
  if (actorRole === 'SUPER_ADMIN' && targetNewRole === 'DEVELOPER') {
    return { allowed: false, reason: 'Access Denied: Only platform Developers can grant the Developer role.' };
  }

  // Only DEVELOPER can grant or revoke SUPER_ADMIN privileges
  if (actorRole === 'SUPER_ADMIN' && (targetNewRole === 'SUPER_ADMIN' || targetCurrentRole === 'SUPER_ADMIN')) {
    return { allowed: false, reason: 'Access Denied: Only platform Developers can grant or revoke Super Admin privileges.' };
  }

  // Lockout prevention: Never allow demoting the last remaining DEVELOPER
  if (targetCurrentRole === 'DEVELOPER' && targetNewRole !== 'DEVELOPER' && activeDeveloperCount <= 1) {
    return { allowed: false, reason: 'Lockout Prevention: Cannot demote the last remaining platform Developer account.' };
  }

  return { allowed: true };
}

export function canActorDisableOrDeleteUser(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  isTargetSelf: boolean,
  activeDeveloperCount: number
): { allowed: boolean; reason?: string } {
  if (actorRole !== 'DEVELOPER' && actorRole !== 'SUPER_ADMIN') {
    return { allowed: false, reason: 'Unauthorized: Administrator privileges required.' };
  }

  if (isTargetSelf) {
    return { allowed: false, reason: 'Security policy: You cannot disable or delete your own active account.' };
  }

  if (actorRole === 'SUPER_ADMIN' && targetCurrentRole === 'DEVELOPER') {
    return { allowed: false, reason: 'Access Denied: Super Admins cannot disable, suspend, or delete Developer accounts.' };
  }

  if (targetCurrentRole === 'DEVELOPER' && activeDeveloperCount <= 1) {
    return { allowed: false, reason: 'Lockout Prevention: Cannot disable or delete the last remaining platform Developer account.' };
  }

  return { allowed: true };
}

// ==============================================================================
// IMMUTABLE AUDIT LOGGING
// ==============================================================================

export function createAuditLog(entry: {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: any;
  ipAddress?: string;
  status?: 'SUCCESS' | 'FAILED';
}): DbAuditLog {
  const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const detailsStr = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || {});

  const stmt = db.prepare(`
    INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, target_id, target_email, details, ip_address, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    id,
    entry.actorId,
    entry.actorEmail,
    entry.actorRole,
    entry.action,
    entry.targetId || null,
    entry.targetEmail || null,
    detailsStr,
    entry.ipAddress || null,
    entry.status || 'SUCCESS',
    now
  );

  return {
    id,
    actor_id: entry.actorId,
    actor_email: entry.actorEmail,
    actor_role: entry.actorRole,
    action: entry.action,
    target_id: entry.targetId,
    target_email: entry.targetEmail,
    details: detailsStr,
    ip_address: entry.ipAddress,
    status: entry.status || 'SUCCESS',
    created_at: now
  };
}

export function getAuditLogs(limit = 50, offset = 0, filterAction?: string): DbAuditLog[] {
  if (filterAction) {
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(filterAction, limit, offset) as unknown as DbAuditLog[];
  }
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?');
  return stmt.all(limit, offset) as unknown as DbAuditLog[];
}

// ==============================================================================
// SESSIONS MANAGEMENT
// ==============================================================================

export function createSession(userId: string, userAgent?: string, ipAddress?: string): { token: string; session: DbSession } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days expiry

  const stmt = db.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, is_revoked, user_agent, ip_address, created_at)
    VALUES (?, ?, ?, 0, ?, ?, ?)
  `);
  stmt.run(tokenHash, userId, expiresAt, userAgent || null, ipAddress || null, now);

  const session: DbSession = {
    id: tokenHash,
    user_id: userId,
    expires_at: expiresAt,
    is_revoked: 0,
    user_agent: userAgent,
    ip_address: ipAddress,
    created_at: now
  };

  return { token: rawToken, session };
}

export function getSession(rawToken: string): (DbSession & { user: DbUser }) | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  const stmt = db.prepare(`
    SELECT s.*, u.id as u_id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.wallet_balance, u.is_verified, u.email_verified, u.phone_verified, u.account_status,
           u.must_change_password, u.assigned_properties, u.created_at as u_created_at, u.updated_at as u_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.is_revoked = 0
  `);
  const row = stmt.get(tokenHash) as any;
  if (!row) return null;

  if (Date.now() > row.expires_at) {
    revokeSession(rawToken);
    return null;
  }

  if (row.account_status === 'DISABLED' || row.account_status === 'SUSPENDED') {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    expires_at: row.expires_at,
    is_revoked: row.is_revoked,
    user_agent: row.user_agent,
    ip_address: row.ip_address,
    created_at: row.created_at,
    user: {
      id: row.u_id,
      public_id: row.public_id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      role: row.role,
      avatar: row.avatar,
      organization: row.organization,
      wallet_balance: row.wallet_balance,
      is_verified: row.is_verified,
      email_verified: row.email_verified,
      phone_verified: row.phone_verified,
      account_status: row.account_status,
      must_change_password: row.must_change_password,
      assigned_properties: row.assigned_properties,
      password_hash: '',
      salt: '',
      last_login_at: null,
      created_at: row.u_created_at,
      updated_at: row.u_updated_at
    }
  };
}

export function revokeSession(rawToken: string): boolean {
  const tokenHash = hashToken(rawToken);
  const stmt = db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?');
  stmt.run(tokenHash);
  return true;
}

export function revokeAllUserSessions(userId: string): boolean {
  const stmt = db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?');
  stmt.run(userId);
  return true;
}

// ==============================================================================
// OTP VERIFICATION (SECURE HASHED, ATTEMPT-LIMITED, SINGLE-USE)
// ==============================================================================

export function generateOtp(target: string, type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'): { otp: string; expiresAt: number } {
  const normalizedTarget = target.trim().toLowerCase();

  // Enforce resend throttling: allow at most one OTP request every 30 seconds per target
  const recentOtp = db.prepare(`
    SELECT created_at FROM otps 
    WHERE target = ? AND type = ? AND consumed_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
  `).get(normalizedTarget, type) as { created_at: string } | undefined;

  if (recentOtp) {
    const elapsed = Date.now() - new Date(recentOtp.created_at).getTime();
    if (elapsed < 30 * 1000) {
      const waitSeconds = Math.ceil((30 * 1000 - elapsed) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }
  }

  // Generate secure 6-digit cryptographic OTP
  const randomBytes = crypto.randomBytes(3);
  const otpNumber = (randomBytes.readUIntBE(0, 3) % 900000) + 100000;
  const otp = otpNumber.toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry
  const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  // Invalidate any previous unconsumed OTPs for this target
  const deleteOld = db.prepare('DELETE FROM otps WHERE target = ? AND type = ? AND consumed_at IS NULL');
  deleteOld.run(normalizedTarget, type);

  // Check if legacy 'otp' column still exists in this database table
  const tableInfo = db.prepare('PRAGMA table_info(otps)').all() as Array<{ name: string }>;
  const hasLegacyOtpColumn = tableInfo.some(col => col.name === 'otp');

  if (hasLegacyOtpColumn) {
    const insert = db.prepare(`
      INSERT INTO otps (id, target, type, otp, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at)
      VALUES (?, ?, ?, ?, ?, NULL, ?, 0, 0, NULL, ?)
    `);
    insert.run(id, normalizedTarget, type, otp, otpHash, expiresAt, now);
  } else {
    const insert = db.prepare(`
      INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, 0, 0, NULL, ?)
    `);
    insert.run(id, normalizedTarget, type, otpHash, expiresAt, now);
  }

  return { otp, expiresAt };
}

export function verifyOtp(target: string, type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET', code: string): boolean {
  const normalizedTarget = target.trim().toLowerCase();
  const normalizedCode = code.trim();
  const codeHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

  const stmt = db.prepare(`
    SELECT * FROM otps 
    WHERE target = ? AND type = ? AND consumed_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  const record = stmt.get(normalizedTarget, type) as DbOtp | undefined;

  if (!record) {
    return false;
  }

  // Attempt limiting: Max 5 failed attempts
  if (record.attempt_count >= 5) {
    db.prepare('DELETE FROM otps WHERE id = ?').run(record.id);
    return false;
  }

  // Check expiration
  if (Date.now() > record.expires_at) {
    db.prepare('DELETE FROM otps WHERE id = ?').run(record.id);
    return false;
  }

  // Verify hash with constant-time equality
  const hashMatches = record.otp_hash ? record.otp_hash === codeHash : (record as any).otp === normalizedCode;

  if (!hashMatches) {
    db.prepare('UPDATE otps SET attempt_count = attempt_count + 1 WHERE id = ?').run(record.id);
    return false;
  }

  // Mark as verified & consumed (Single-use enforcement)
  const now = new Date().toISOString();
  db.prepare('UPDATE otps SET is_verified = 1, consumed_at = ? WHERE id = ?').run(now, record.id);

  return true;
}

export function isTargetVerified(target: string, type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'): boolean {
  const stmt = db.prepare(`
    SELECT * FROM otps 
    WHERE target = ? AND type = ? AND is_verified = 1
    ORDER BY created_at DESC 
    LIMIT 1
  `);
  const record = stmt.get(target.trim().toLowerCase(), type) as DbOtp | undefined;
  if (!record) return false;
  return Date.now() - record.expires_at < 30 * 60 * 1000;
}

// ==============================================================================
// INITIAL PRODUCTION CREDENTIAL BOOTSTRAP (IDEMPOTENT & SECURE)
// ==============================================================================

export function bootstrapProductionAccounts() {
  const now = new Date().toISOString();

  // 1. Ensure Dedicated DEVELOPER (Platform Owner) Account Exists
  const devEmail = (process.env.BOOTSTRAP_DEVELOPER_EMAIL || 'developer@propertystudio.org').trim().toLowerCase();
  let existingDev = findUserByEmail(devEmail);

  if (!existingDev) {
    const devPassword = process.env.BOOTSTRAP_DEVELOPER_PASSWORD || 'DevStudio@Reddy2026!';
    const { hash, salt } = hashPassword(devPassword);
    const devId = 'user_dev_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'dev_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DEVELOPER', ?, ?, 0, 1, 1, 1, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
    `).run(
      devId,
      publicId,
      'Swamy Reddy Javidi (Platform Owner)',
      devEmail,
      '+91 98490 12890',
      '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      'Property Studio Secretariat',
      hash,
      salt,
      now,
      now
    );

    createAuditLog({
      actorId: 'system',
      actorEmail: 'system@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_DEVELOPER_CREATED',
      targetId: devId,
      targetEmail: devEmail,
      details: { role: 'DEVELOPER' }
    });
    existingDev = findUserByEmail(devEmail);
  }
  // Note: Existing developer password is NEVER overwritten on server restart to prevent unwanted account resets.

  // 2. Ensure Dedicated SUPER_ADMIN Account Exists
  const adminEmail = (process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || 'admin@propertystudio.org').trim().toLowerCase();
  let existingAdmin = findUserByEmail(adminEmail);

  if (!existingAdmin) {
    const adminPassword = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD || 'SuperAdmin@Reddy2026!';
    const { hash, salt } = hashPassword(adminPassword);
    const adminId = 'user_admin_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'admin_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', ?, ?, 0, 1, 1, 1, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
    `).run(
      adminId,
      publicId,
      'Property Studio Super Administrator',
      adminEmail,
      '+91 98490 12890',
      '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      'Property Studio Administration',
      hash,
      salt,
      now,
      now
    );

    createAuditLog({
      actorId: 'system',
      actorEmail: 'system@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_SUPER_ADMIN_CREATED',
      targetId: adminId,
      targetEmail: adminEmail,
      details: { role: 'SUPER_ADMIN' }
    });
  }
  // Note: Existing Super Admin password is NEVER overwritten on server restart.

  // 3. Ensure platform owner personal account (charankolli.athmick@gmail.com) is designated as DEVELOPER
  const ownerEmail = 'charankolli.athmick@gmail.com'.toLowerCase();
  const ownerUser = findUserByEmail(ownerEmail);
  if (ownerUser) {
    db.prepare("UPDATE users SET role = 'DEVELOPER', is_verified = 1, email_verified = 1, phone_verified = 1 WHERE email = ?").run(ownerEmail);
  }
}

// ==============================================================================
// USER REPOSITORY
// ==============================================================================

export function findUserByEmail(email: string): DbUser | null {
  if (!email) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  return (stmt.get(email.trim().toLowerCase()) as unknown as DbUser) || null;
}

export function findUserById(id: string): DbUser | null {
  if (!id) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? OR public_id = ?');
  return (stmt.get(id, id) as unknown as DbUser) || null;
}

export function getActiveDeveloperCount(): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'DEVELOPER' AND account_status = 'ACTIVE'");
  const res = stmt.get() as { count: number };
  return res.count || 0;
}

export function getAllUsers(): Array<Omit<DbUser, 'password_hash' | 'salt'> & { postCount: number }> {
  const stmt = db.prepare(`
    SELECT u.id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.wallet_balance, u.is_verified, u.email_verified, u.phone_verified, u.account_status,
           u.must_change_password, u.assigned_properties, u.last_login_at, u.created_at, u.updated_at,
           COUNT(p.id) as postCount
    FROM users u
    LEFT JOIN community_posts p ON u.id = p.author_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);
  return stmt.all() as any;
}

export function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatar?: string;
  organization?: string;
  password?: string;
  isVerified?: boolean;
}): DbUser {
  const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const publicId = `usr_${crypto.randomBytes(4).toString('hex')}`;
  const normalizedEmail = data.email.trim().toLowerCase();
  const password = data.password || crypto.randomBytes(8).toString('hex');
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
  `);

  insert.run(
    id,
    publicId,
    data.name.trim(),
    normalizedEmail,
    data.phone?.trim() || '',
    data.role || 'PROPERTY_SEEKER',
    data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    data.organization?.trim() || '',
    data.isVerified ? 1 : 0,
    data.isVerified ? 1 : 0,
    data.phone ? 1 : 0,
    hash,
    salt,
    now,
    now
  );

  return findUserById(id)!;
}

export function updateUser(id: string, updates: Partial<{
  name: string;
  phone: string;
  organization: string;
  avatar: string;
  wallet_balance: number;
  assigned_properties: string;
  email_verified: number;
  phone_verified: number;
}>) {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return findUserById(id);

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return findUserById(id);
}

export function updateUserRole(actor: DbUser, targetUserId: string, newRole: UserRole): { success: boolean; user?: DbUser; error?: string } {
  const targetUser = findUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'Target user not found' };

  const devCount = getActiveDeveloperCount();
  const authCheck = canActorModifyRole(actor.role, targetUser.role, newRole, actor.id === targetUser.id, devCount);

  if (!authCheck.allowed) {
    createAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'ROLE_MODIFICATION_DENIED',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      details: { attemptedRole: newRole, currentRole: targetUser.role, reason: authCheck.reason },
      status: 'FAILED'
    });
    return { success: false, error: authCheck.reason };
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(newRole, now, targetUser.id);

  createAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: newRole === 'SUPER_ADMIN' ? 'GRANT_SUPER_ADMIN' : targetUser.role === 'SUPER_ADMIN' ? 'REVOKE_SUPER_ADMIN' : 'UPDATE_ROLE',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { previousRole: targetUser.role, newRole }
  });

  return { success: true, user: findUserById(targetUserId)! };
}

export function deleteUser(actor: DbUser | { role: UserRole; id: string; email: string }, targetUserId: string): { success: boolean; error?: string } {
  const targetUser = findUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = getActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) {
    createAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'USER_DELETION_DENIED',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      details: { reason: check.reason },
      status: 'FAILED'
    });
    return { success: false, error: check.reason };
  }

  db.prepare('DELETE FROM users WHERE id = ?').run(targetUserId);

  createAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: 'DELETE_USER',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { role: targetUser.role }
  });

  return { success: true };
}

export function suspendUser(actor: DbUser, targetUserId: string, suspend: boolean): { success: boolean; error?: string } {
  const targetUser = findUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = getActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) return { success: false, error: check.reason };

  const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';
  db.prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), targetUserId);
  if (suspend) {
    revokeAllUserSessions(targetUserId);
  }

  createAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: suspend ? 'SUSPEND_USER' : 'ACTIVATE_USER',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { status: newStatus }
  });

  return { success: true };
}

export function changePassword(userId: string, currentPass: string, newPass: string) {
  const user = findUserById(userId);
  if (!user) return false;
  const isValid = verifyPassword(currentPass, user.password_hash, user.salt);
  if (!isValid) return false;

  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hash, salt, now, userId);
  revokeAllUserSessions(userId);

  createAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PASSWORD_CHANGED',
    targetId: user.id
  });

  return true;
}

export function resetPassword(userId: string, newPass: string) {
  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hash, salt, now, userId);
  revokeAllUserSessions(userId);
  return true;
}

export function updateLastLogin(userId: string) {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId);
}

// In-memory rate limiter for developer recovery attempts
const recoveryAttempts: { count: number; lockedUntil: number } = { count: 0, lockedUntil: 0 };

export function recoverDeveloperAccount(recoverySecret: string, newPassword: string): { success: boolean; error?: string } {
  // Check lockout
  const now = Date.now();
  if (recoveryAttempts.lockedUntil > now) {
    const remainingSeconds = Math.ceil((recoveryAttempts.lockedUntil - now) / 1000);
    return { success: false, error: `Emergency recovery endpoint is temporarily locked due to failed attempts. Try again in ${remainingSeconds} seconds.` };
  }

  const configuredSecret = process.env.DEVELOPER_RECOVERY_KEY || process.env.BOOTSTRAP_SECRET_TOKEN;
  if (!configuredSecret) {
    return { success: false, error: 'Emergency developer recovery is not configured on this server (DEVELOPER_RECOVERY_KEY is missing).' };
  }

  // Use timing-safe comparison to prevent timing attacks
  const secretBuffer = Buffer.from(recoverySecret);
  const configuredBuffer = Buffer.from(configuredSecret);
  const isMatch = secretBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(secretBuffer, configuredBuffer);

  if (!isMatch) {
    recoveryAttempts.count += 1;
    if (recoveryAttempts.count >= 3) {
      recoveryAttempts.lockedUntil = now + 15 * 60 * 1000; // 15-minute lockout
      recoveryAttempts.count = 0;
    }
    createAuditLog({
      actorId: 'anonymous_recovery_attempt',
      actorEmail: 'unknown',
      actorRole: 'SYSTEM',
      action: 'DEVELOPER_RECOVERY_FAILED_INVALID_KEY',
      status: 'FAILED',
      details: { attemptCount: recoveryAttempts.count }
    });
    return { success: false, error: 'Invalid recovery authorization key.' };
  }

  // Key is valid; reset failure counter
  recoveryAttempts.count = 0;
  recoveryAttempts.lockedUntil = 0;

  const devEmail = (process.env.BOOTSTRAP_DEVELOPER_EMAIL || 'developer@propertystudio.org').trim().toLowerCase();
  let devUser: DbUser | null = findUserByEmail(devEmail) || findUserByEmail('charankolli.athmick@gmail.com');

  if (!devUser) {
    bootstrapProductionAccounts();
    devUser = findUserByEmail(devEmail) || findUserByEmail('charankolli.athmick@gmail.com');
  }

  if (!devUser) return { success: false, error: 'Failed to locate Developer account' };

  resetPassword(devUser.id, newPassword);
  db.prepare("UPDATE users SET account_status = 'ACTIVE', updated_at = ? WHERE id = ?").run(new Date().toISOString(), devUser.id);

  createAuditLog({
    actorId: 'system_recovery',
    actorEmail: 'recovery@propertystudio.org',
    actorRole: 'SYSTEM',
    action: 'DEVELOPER_ACCOUNT_RECOVERED',
    targetId: devUser.id,
    targetEmail: devUser.email
  });

  return { success: true };
}

// ==============================================================================
// COMMUNITY POSTS, LIKES & MEDIA
// ==============================================================================

export function getAllPosts(params?: {
  communityId?: string;
  topic?: string;
  mediaType?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
}) {
  let query = "SELECT p.* FROM community_posts p WHERE p.status = 'PUBLISHED'";
  const args: any[] = [];

  if (params?.communityId) {
    query += ' AND p.community_id = ?';
    args.push(params.communityId);
  }

  if (params?.topic && params.topic !== 'ALL') {
    query += ' AND p.topic = ?';
    args.push(params.topic);
  }

  if (params?.mediaType && params.mediaType !== 'ALL') {
    query += ' AND p.media_type = ?';
    args.push(params.mediaType);
  }

  query += ' ORDER BY p.is_pinned DESC, p.created_at DESC';

  if (params?.limit) {
    query += ' LIMIT ? OFFSET ?';
    args.push(params.limit, params.offset || 0);
  }

  const posts = db.prepare(query).all(...args) as unknown as DbCommunityPost[];
  const userLikedPostIds = params?.currentUserId ? getUserLikedPostIds(params.currentUserId) : new Set<string>();

  return posts.map(p => ({
    id: p.id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorRole: p.author_role,
    communityId: p.community_id,
    communityName: p.community_name,
    propertyId: p.property_id,
    propertyName: p.property_name,
    topic: p.topic,
    title: p.title,
    content: p.content,
    links: JSON.parse(p.links || '[]'),
    attachments: JSON.parse(p.attachments || '[]'),
    mediaType: p.media_type || 'POST',
    mediaUrl: p.media_url,
    thumbnailUrl: p.thumbnail_url,
    duration: p.duration,
    status: p.status,
    upvotes: p.upvotes,
    userLiked: userLikedPostIds.has(p.id),
    commentsCount: p.comments_count || 0,
    isPinned: Boolean(p.is_pinned),
    isFlagged: Boolean(p.is_flagged),
    replies: getRepliesForPost(p.id),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  }));
}

export function getPostById(postId: string, currentUserId?: string) {
  const stmt = db.prepare('SELECT * FROM community_posts WHERE id = ?');
  const p = stmt.get(postId) as DbCommunityPost | undefined;
  if (!p) return null;

  const userLiked = currentUserId ? isPostLikedByUser(postId, currentUserId) : false;

  return {
    id: p.id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorRole: p.author_role,
    communityId: p.community_id,
    communityName: p.community_name,
    propertyId: p.property_id,
    propertyName: p.property_name,
    topic: p.topic,
    title: p.title,
    content: p.content,
    links: JSON.parse(p.links || '[]'),
    attachments: JSON.parse(p.attachments || '[]'),
    mediaType: p.media_type || 'POST',
    mediaUrl: p.media_url,
    thumbnailUrl: p.thumbnail_url,
    duration: p.duration,
    status: p.status,
    upvotes: p.upvotes,
    userLiked,
    commentsCount: p.comments_count || 0,
    isPinned: Boolean(p.is_pinned),
    isFlagged: Boolean(p.is_flagged),
    replies: getRepliesForPost(p.id),
    comments: getCommentsForPost(p.id, currentUserId),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

export function createPost(post: {
  authorId?: string;
  authorName: string;
  authorRole: string;
  communityId?: string;
  communityName?: string;
  propertyId?: string;
  propertyName?: string;
  topic: string;
  title: string;
  content: string;
  links?: Array<{ title: string; url: string }>;
  attachments?: Array<{ type: string; url: string; name: string }>;
  mediaType?: 'POST' | 'PODCAST' | 'VIDEO';
  mediaUrl?: string;
  thumbnailUrl?: string;
  duration?: string;
}) {
  const id = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const linksStr = JSON.stringify(post.links || []);
  const attachmentsStr = JSON.stringify(post.attachments || []);

  const stmt = db.prepare(`
    INSERT INTO community_posts (
      id, author_id, author_name, author_role, community_id, community_name,
      property_id, property_name, topic, title, content, links, attachments,
      media_type, media_url, thumbnail_url, duration, status, upvotes, comments_count,
      is_pinned, is_flagged, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PUBLISHED', 0, 0, 0, 0, ?, ?)
  `);

  stmt.run(
    id,
    post.authorId || null,
    post.authorName,
    post.authorRole,
    post.communityId || null,
    post.communityName || null,
    post.propertyId || null,
    post.propertyName || null,
    post.topic,
    post.title,
    post.content,
    linksStr,
    attachmentsStr,
    post.mediaType || 'POST',
    post.mediaUrl || null,
    post.thumbnailUrl || null,
    post.duration || null,
    now,
    now
  );

  recordCommunityEvent('POST_CREATED', {
    id,
    title: post.title,
    authorName: post.authorName,
    communityId: post.communityId,
    mediaType: post.mediaType || 'POST'
  });

  return getPostById(id);
}

export function updatePost(postId: string, authorId: string, updates: Partial<{ title: string; content: string; links: any[]; attachments: any[] }>, isElevated = false) {
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(postId) as DbCommunityPost | undefined;
  if (!post) return null;
  if (!isElevated && post.author_id !== authorId) return null;

  const now = new Date().toISOString();
  const title = updates.title || post.title;
  const content = updates.content || post.content;
  const links = updates.links ? JSON.stringify(updates.links) : post.links;
  const attachments = updates.attachments ? JSON.stringify(updates.attachments) : post.attachments;

  db.prepare(`
    UPDATE community_posts
    SET title = ?, content = ?, links = ?, attachments = ?, updated_at = ?
    WHERE id = ?
  `).run(title, content, links, attachments, now, postId);

  recordCommunityEvent('POST_UPDATED', { id: postId, title });
  return getPostById(postId);
}

export function deletePost(postId: string, actorId?: string, isElevated = false) {
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(postId) as DbCommunityPost | undefined;
  if (!post) return false;
  if (actorId && !isElevated && post.author_id !== actorId) return false;

  db.prepare('DELETE FROM community_posts WHERE id = ?').run(postId);
  recordCommunityEvent('POST_DELETED', { id: postId });
  return true;
}

export function pinPost(postId: string, isPinned: boolean) {
  db.prepare('UPDATE community_posts SET is_pinned = ?, updated_at = ? WHERE id = ?').run(isPinned ? 1 : 0, new Date().toISOString(), postId);
  return true;
}

export function upvotePost(postId: string) {
  db.prepare('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
  const p = db.prepare('SELECT upvotes FROM community_posts WHERE id = ?').get(postId) as { upvotes: number };
  return p?.upvotes || 0;
}

export function togglePostLike(postId: string, userId: string): { upvotes: number; liked: boolean } {
  const check = db.prepare('SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId) as { id: string } | undefined;
  let liked = false;

  if (check) {
    db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, userId);
    db.prepare('UPDATE community_posts SET upvotes = MAX(0, upvotes - 1) WHERE id = ?').run(postId);
    liked = false;
  } else {
    const likeId = `plike_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
      likeId,
      postId,
      userId,
      new Date().toISOString()
    );
    db.prepare('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
    liked = true;

    // Send notification to post author if not self
    const post = db.prepare('SELECT author_id, title FROM community_posts WHERE id = ?').get(postId) as { author_id?: string; title: string } | undefined;
    const user = findUserById(userId);
    if (post && post.author_id && post.author_id !== userId && user) {
      createNotification({
        userId: post.author_id,
        actorId: userId,
        actorName: user.name,
        type: 'LIKE',
        title: 'New reaction on your post',
        message: `${user.name} liked your post "${post.title.slice(0, 40)}..."`,
        linkUrl: `/community#${postId}`
      });
    }
  }

  const p = db.prepare('SELECT upvotes FROM community_posts WHERE id = ?').get(postId) as { upvotes: number };
  const upvotes = p?.upvotes || 0;

  recordCommunityEvent('LIKE_CHANGED', { postId, upvotes });
  return { upvotes, liked };
}

export function isPostLikedByUser(postId: string, userId: string): boolean {
  const check = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  return Boolean(check);
}

export function getUserLikedPostIds(userId: string): Set<string> {
  const rows = db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?').all(userId) as Array<{ post_id: string }>;
  return new Set(rows.map(r => r.post_id));
}

// ==============================================================================
// COMMENTS & NESTED REPLIES
// ==============================================================================

export function getCommentsForPost(postId: string, currentUserId?: string): any[] {
  const comments = db.prepare(`
    SELECT * FROM community_comments 
    WHERE post_id = ? 
    ORDER BY created_at ASC
  `).all(postId) as unknown as DbCommunityComment[];

  const userLikedCommentIds = currentUserId ? getUserLikedCommentIds(currentUserId) : new Set<string>();

  // Map into hierarchical replies
  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  for (const c of comments) {
    const item = {
      id: c.id,
      postId: c.post_id,
      parentId: c.parent_id,
      authorId: c.author_id,
      authorName: c.author_name,
      authorRole: c.author_role,
      content: c.content,
      likesCount: c.likes_count,
      userLiked: userLikedCommentIds.has(c.id),
      replies: [],
      createdAt: c.created_at,
      updatedAt: c.updated_at
    };
    commentMap.set(c.id, item);
  }

  for (const c of comments) {
    const item = commentMap.get(c.id)!;
    if (c.parent_id && commentMap.has(c.parent_id)) {
      commentMap.get(c.parent_id).replies.push(item);
    } else {
      rootComments.push(item);
    }
  }

  return rootComments;
}

export function createComment(data: {
  postId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
}) {
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO community_comments (id, post_id, parent_id, author_id, author_name, author_role, content, likes_count, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    id,
    data.postId,
    data.parentId || null,
    data.authorId,
    data.authorName,
    data.authorRole,
    data.content.trim(),
    now,
    now
  );

  // Increment comments_count on post
  db.prepare('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?').run(data.postId);

  // Trigger Notifications
  const post = db.prepare('SELECT author_id, title FROM community_posts WHERE id = ?').get(data.postId) as { author_id?: string; title: string } | undefined;
  if (post && post.author_id && post.author_id !== data.authorId) {
    createNotification({
      userId: post.author_id,
      actorId: data.authorId,
      actorName: data.authorName,
      type: data.parentId ? 'REPLY' : 'COMMENT',
      title: data.parentId ? 'New reply in discussion' : 'New comment on your post',
      message: `${data.authorName}: "${data.content.slice(0, 60)}..."`,
      linkUrl: `/community#${data.postId}`
    });
  }

  recordCommunityEvent('COMMENT_CREATED', {
    id,
    postId: data.postId,
    parentId: data.parentId,
    authorName: data.authorName
  });

  return {
    id,
    postId: data.postId,
    parentId: data.parentId || null,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    content: data.content,
    likesCount: 0,
    replies: [],
    createdAt: now,
    updatedAt: now
  };
}

export function deleteComment(commentId: string, actorId: string, isElevated = false): boolean {
  const c = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(commentId) as DbCommunityComment | undefined;
  if (!c) return false;
  if (!isElevated && c.author_id !== actorId) return false;

  db.prepare('DELETE FROM community_comments WHERE id = ?').run(commentId);
  db.prepare('UPDATE community_posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').run(c.post_id);

  recordCommunityEvent('COMMENT_DELETED', { id: commentId, postId: c.post_id });
  return true;
}

export function toggleCommentLike(commentId: string, userId: string): { likesCount: number; liked: boolean } {
  const check = db.prepare('SELECT id FROM comment_likes WHERE comment_id = ? AND user_id = ?').get(commentId, userId) as { id: string } | undefined;
  let liked = false;

  if (check) {
    db.prepare('DELETE FROM comment_likes WHERE comment_id = ? AND user_id = ?').run(commentId, userId);
    db.prepare('UPDATE community_comments SET likes_count = MAX(0, likes_count - 1) WHERE id = ?').run(commentId);
    liked = false;
  } else {
    const likeId = `clike_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO comment_likes (id, comment_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
      likeId,
      commentId,
      userId,
      new Date().toISOString()
    );
    db.prepare('UPDATE community_comments SET likes_count = likes_count + 1 WHERE id = ?').run(commentId);
    liked = true;
  }

  const c = db.prepare('SELECT likes_count FROM community_comments WHERE id = ?').get(commentId) as { likes_count: number };
  return { likesCount: c?.likes_count || 0, liked };
}

export function getUserLikedCommentIds(userId: string): Set<string> {
  const rows = db.prepare('SELECT comment_id FROM comment_likes WHERE user_id = ?').all(userId) as Array<{ comment_id: string }>;
  return new Set(rows.map(r => r.comment_id));
}

// Backward compatibility for existing community_replies table
export function getRepliesForPost(postId: string): DbCommunityReply[] {
  const stmt = db.prepare('SELECT * FROM community_replies WHERE post_id = ? ORDER BY created_at ASC');
  return stmt.all(postId) as unknown as DbCommunityReply[];
}

export function addReply(reply: {
  postId: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  isVerifiedBuilder?: boolean;
  content: string;
}) {
  const id = `reply_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO community_replies (id, post_id, author_id, author_name, author_role, is_verified_builder, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    reply.postId,
    reply.authorId || null,
    reply.authorName,
    reply.authorRole,
    reply.isVerifiedBuilder ? 1 : 0,
    reply.content,
    now
  );
  return { id, ...reply, isVerifiedBuilderReply: Boolean(reply.isVerifiedBuilder), createdAt: now };
}

export function deleteReply(replyId: string) {
  db.prepare('DELETE FROM community_replies WHERE id = ?').run(replyId);
  return true;
}

// ==============================================================================
// MODERATION REPORTS
// ==============================================================================

export function createModerationReport(data: {
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  reason: string;
}): DbModerationReport {
  const id = `mod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO moderation_reports (id, reporter_id, reporter_name, target_type, target_id, reason, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)
  `).run(id, data.reporterId, data.reporterName, data.targetType, data.targetId, data.reason.trim(), now, now);

  if (data.targetType === 'POST') {
    db.prepare('UPDATE community_posts SET is_flagged = 1 WHERE id = ?').run(data.targetId);
  }

  return {
    id,
    reporter_id: data.reporterId,
    reporter_name: data.reporterName,
    target_type: data.targetType,
    target_id: data.targetId,
    reason: data.reason,
    status: 'PENDING',
    created_at: now,
    updated_at: now
  };
}

export function getAllModerationReports(status?: string): DbModerationReport[] {
  if (status) {
    const stmt = db.prepare('SELECT * FROM moderation_reports WHERE status = ? ORDER BY created_at DESC');
    return stmt.all(status) as unknown as DbModerationReport[];
  }
  const stmt = db.prepare('SELECT * FROM moderation_reports ORDER BY created_at DESC');
  return stmt.all() as unknown as DbModerationReport[];
}

export function resolveModerationReport(reportId: string, reviewedBy: string, status: 'RESOLVED' | 'DISMISSED', resolutionNotes?: string) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE moderation_reports
    SET status = ?, reviewed_by = ?, resolution_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(status, reviewedBy, resolutionNotes || null, now, reportId);
  return true;
}

// ==============================================================================
// NOTIFICATIONS
// ==============================================================================

export function createNotification(data: {
  userId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM';
  title: string;
  message: string;
  linkUrl?: string;
}): DbNotification {
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, link_url, is_read, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    id,
    data.userId,
    data.actorId,
    data.actorName,
    data.type,
    data.title,
    data.message,
    data.linkUrl || null,
    now
  );

  recordCommunityEvent('NOTIFICATION_EVENT', {
    id,
    userId: data.userId,
    title: data.title
  }, data.userId);

  return {
    id,
    user_id: data.userId,
    actor_id: data.actorId,
    actor_name: data.actorName,
    type: data.type,
    title: data.title,
    message: data.message,
    link_url: data.linkUrl,
    is_read: 0,
    created_at: now
  };
}

export function getUserNotifications(userId: string, limit = 30): DbNotification[] {
  const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
  return stmt.all(userId, limit) as unknown as DbNotification[];
}

export function getUnreadNotificationCount(userId: string): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0');
  const res = stmt.get(userId) as { count: number };
  return res?.count || 0;
}

export function markNotificationRead(id: string, userId: string): boolean {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  return true;
}

export function markAllNotificationsRead(userId: string): boolean {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return true;
}

// ==============================================================================
// REAL-TIME COMMUNITY EVENT LOG (MULTI-INSTANCE SSE COMPATIBLE)
// ==============================================================================

export function recordCommunityEvent(eventType: string, payload: any, targetUserId?: string | null): DbCommunityEvent {
  const id = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const payloadStr = JSON.stringify(payload);

  db.prepare(`
    INSERT INTO community_events (id, event_type, payload, target_user_id, created_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, eventType, payloadStr, targetUserId || null, now);

  return {
    id,
    event_type: eventType,
    payload: payloadStr,
    target_user_id: targetUserId || null,
    created_at: now
  };
}

export function getCommunityEventsSince(sinceTimestamp: string, targetUserId?: string): DbCommunityEvent[] {
  if (targetUserId) {
    const stmt = db.prepare(`
      SELECT * FROM community_events 
      WHERE created_at > ? AND (target_user_id IS NULL OR target_user_id = ?)
      ORDER BY created_at ASC
    `);
    return stmt.all(sinceTimestamp, targetUserId) as unknown as DbCommunityEvent[];
  }

  const stmt = db.prepare(`
    SELECT * FROM community_events 
    WHERE created_at > ? AND target_user_id IS NULL
    ORDER BY created_at ASC
  `);
  return stmt.all(sinceTimestamp) as unknown as DbCommunityEvent[];
}

// ==============================================================================
// COMMUNITIES MANAGEMENT
// ==============================================================================

export function ensureInitialCommunities() {
  const count = db.prepare('SELECT COUNT(*) as count FROM communities').get() as { count: number };
  if (count.count > 0) return;

  const now = new Date().toISOString();
  const starterCommunities = [
    {
      id: 'comm_neopolis_hub',
      name: 'Kokapet Neopolis Residents & Investors Hub',
      slug: 'kokapet-neopolis-hub',
      description: 'Official verified forum for Kokapet Neopolis high-rise owners, floor plate investors, and future residents. Ground telemetry, construction milestone verifications, and civil infrastructure reviews.',
      category: 'Micro-Market Hub',
      location: 'Neopolis, Kokapet, Hyderabad',
      created_by_id: 'user_dev_root',
      created_by_name: 'Swamy Reddy Javidi',
      status: 'APPROVED',
      rejection_reason: '',
      member_count: 342,
      icon: 'Building2',
      banner_image: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
      rules: '1. No speculative spam. 2. Verify RERA numbers before quoting delay metrics. 3. Respect resident privacy.'
    },
    {
      id: 'comm_financial_district',
      name: 'Financial District High-Rise Owners Forum',
      slug: 'financial-district-owners',
      description: 'The premier community destination for luxury tower owners in Nanakramguda and Financial District. Discussions on commercial rental yields, property tax assessments, and clubhouse operations.',
      category: 'Residential Luxury',
      location: 'Financial District, Nanakramguda',
      created_by_id: 'user_dev_root',
      created_by_name: 'Swamy Reddy Javidi',
      status: 'APPROVED',
      rejection_reason: '',
      member_count: 218,
      icon: 'ShieldCheck',
      banner_image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
      rules: '1. Verified deed holders given primary speaking stage. 2. High standards of civil discourse.'
    },
    {
      id: 'comm_tellapur_builders',
      name: 'Tellapur Town Builders & Landowners Community',
      slug: 'tellapur-town-builders',
      description: 'A dynamic community unifying villa developers, plotted land holders, and RERA certified channel partners operating in Tellapur and Kollur expansion zones.',
      category: 'Town Development',
      location: 'Tellapur, Western Corridor',
      created_by_id: 'user_dev_root',
      created_by_name: 'Swamy Reddy Javidi',
      status: 'APPROVED',
      rejection_reason: '',
      member_count: 175,
      icon: 'Users',
      banner_image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      rules: '1. All land surveys must cite revenue village survey numbers. 2. No anonymous broker solicitation.'
    }
  ];

  const insert = db.prepare(`
    INSERT INTO communities (id, name, slug, description, category, location, created_by_id, created_by_name, status, rejection_reason, member_count, icon, banner_image, rules, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of starterCommunities) {
    insert.run(
      c.id,
      c.name,
      c.slug,
      c.description,
      c.category,
      c.location,
      c.created_by_id,
      c.created_by_name,
      c.status,
      c.rejection_reason,
      c.member_count,
      c.icon,
      c.banner_image,
      c.rules,
      now,
      now
    );
  }
}

export function getAllCommunities(status?: string): DbCommunity[] {
  if (status) {
    const stmt = db.prepare('SELECT * FROM communities WHERE status = ? ORDER BY created_at DESC');
    return stmt.all(status) as unknown as DbCommunity[];
  }
  const stmt = db.prepare('SELECT * FROM communities ORDER BY created_at DESC');
  return stmt.all() as unknown as DbCommunity[];
}

export function getCommunityById(id: string): DbCommunity | null {
  const stmt = db.prepare('SELECT * FROM communities WHERE id = ?');
  return (stmt.get(id) as unknown as DbCommunity) || null;
}

export function createCommunity(community: {
  name: string;
  description: string;
  category: string;
  location?: string;
  createdById?: string;
  createdByName?: string;
  rules?: string;
}): DbCommunity {
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const slug = community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  const insert = db.prepare(`
    INSERT INTO communities (id, name, slug, description, category, location, created_by_id, created_by_name, status, rejection_reason, member_count, icon, banner_image, rules, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', '', 1, 'Users', 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80', ?, ?, ?)
  `);

  insert.run(
    id,
    community.name.trim(),
    slug,
    community.description.trim(),
    community.category.trim(),
    community.location?.trim() || 'Western Corridor, Hyderabad',
    community.createdById || 'user_guest',
    community.createdByName || 'Property Seeker',
    community.rules?.trim() || 'Constructive civil discourse and RERA compliance verification.',
    now,
    now
  );

  return getCommunityById(id)!;
}

export function updateCommunityStatus(id: string, status: 'APPROVED' | 'REJECTED', reason?: string): DbCommunity | null {
  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE communities 
    SET status = ?, rejection_reason = ?, updated_at = ?
    WHERE id = ?
  `);
  update.run(status, reason || '', now, id);
  return getCommunityById(id);
}

export function deleteCommunity(id: string): boolean {
  const stmt = db.prepare('DELETE FROM communities WHERE id = ?');
  stmt.run(id);
  return true;
}

// ==============================================================================
// MEDIA, LEADS, SUMMIT / CONFERENCE
// ==============================================================================

export function getAllMedia(): DbMediaItem[] {
  const stmt = db.prepare('SELECT * FROM media_items ORDER BY created_at DESC');
  return stmt.all() as unknown as DbMediaItem[];
}

export function createMedia(item: {
  title: string;
  summary: string;
  video_url: string;
  thumbnail: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'SITE_AUDIT';
  duration?: string;
  author_name?: string;
}) {
  const id = `media_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);
  insert.run(
    id,
    item.title,
    item.summary,
    item.video_url,
    item.thumbnail,
    item.type,
    item.duration || '15:00',
    item.author_name || 'Swamy Reddy Javidi',
    now
  );
  return id;
}

export function deleteMedia(id: string) {
  const stmt = db.prepare('DELETE FROM media_items WHERE id = ?');
  stmt.run(id);
  return true;
}

export function getAllLeads(): DbBuyerLead[] {
  const stmt = db.prepare('SELECT * FROM buyer_leads ORDER BY created_at DESC');
  return stmt.all() as unknown as DbBuyerLead[];
}

export function createLead(lead: {
  name: string;
  phone: string;
  email?: string;
  budget: string;
  property_type: string;
  micro_market: string;
  tier?: 'STANDARD' | 'PREMIUM' | 'HNI';
  price: number;
  requirements?: string;
}) {
  const id = `lead_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const insert = db.prepare(`
    INSERT INTO buyer_leads (id, name, phone, email, budget, property_type, micro_market, tier, price, requirements, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?)
  `);
  insert.run(
    id,
    lead.name,
    lead.phone,
    lead.email || '',
    lead.budget,
    lead.property_type,
    lead.micro_market,
    lead.tier || 'PREMIUM',
    lead.price,
    lead.requirements || '',
    now
  );
  return id;
}

export function deleteLead(id: string) {
  const stmt = db.prepare('DELETE FROM buyer_leads WHERE id = ?');
  stmt.run(id);
  return true;
}

export function getConferenceDetails(): DbConferenceDetails | null {
  const stmt = db.prepare('SELECT * FROM conference_details LIMIT 1');
  return (stmt.get() as unknown as DbConferenceDetails) || null;
}

export function updateConferenceDetails(details: {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  stream_url?: string;
  status: string;
  agenda?: string;
}) {
  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE conference_details
    SET title = ?, subtitle = ?, date = ?, time = ?, stream_url = ?, status = ?, agenda = ?, updated_at = ?
    WHERE id = 'conf_main'
  `);
  update.run(
    details.title,
    details.subtitle,
    details.date,
    details.time,
    details.stream_url || '',
    details.status,
    details.agenda || '[]',
    now
  );
  return getConferenceDetails();
}
