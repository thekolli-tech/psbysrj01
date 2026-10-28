import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { checkPostgresHealth, checkSchemaReadiness } from './postgres.ts';
import { applySqliteAdditiveSchema } from './platformSchema.ts';
import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, OtpCooldownError, generateOtpCode, sealOtp } from './otpCrypto.ts';
import { claimOtpProofSync, type SyncOtpClaimRunner } from './otpClaim.ts';
import { canonicalOtpTarget } from './otpTarget.ts';
import { isUniqueEmailError, RegistrationRejected } from './registrationError.ts';
import { indianNationalDigits, storedPhoneMatches, normalizeIndianMobile } from '../shared/indianMobile.ts';
import { communitySearchLikePattern } from '../shared/communityEngagement.ts';
import {
  pgFindUserByEmail,
  pgFindUserById,
  pgGetActiveDeveloperCount,
  pgGetAllUsers,
  pgCreateUser,
  pgUpdateUser,
  pgUpdateUserRole,
  pgDeleteUser,
  pgSuspendUser,
  pgChangePassword,
  pgResetPassword,
  pgUpdateLastLogin,
  pgRecoverDeveloperAccount,
  pgBootstrapProductionAccounts,
  pgCreateSession,
  pgGetSession,
  pgRevokeSession,
  pgRevokeAllUserSessions,
  pgGenerateOtp,
  pgVerifyOtp,
  pgIsTargetVerified,
  pgRegisterVerifiedUser,
  pgCreateAuditLog,
  pgGetAuditLogs,
  pgGetAllPosts,
  pgGetPostById,
  pgCastCommunityVote,
  pgToggleCommunityFollow,
  pgToggleBookmarkPost,
  pgGetUserBookmarkedPostIds,
  pgToggleFollowUser,
  pgGetUserFollowStats,
  pgGetUserFollowedUserIds,
  pgVoteCommunityPoll,
  pgCheckDuplicateQuestion,
  pgGetUserPublicProfile,
  pgCommunityEngagement,
  pgProfessionsByUserId,
  pgUpdateProfileFields,
  pgCreatePost,
  pgUpdatePost,
  pgDeletePost,
  pgPinPost,
  pgUpvotePost,
  pgTogglePostLike,
  pgIsPostLikedByUser,
  pgGetUserLikedPostIds,
  pgGetCommentsForPost,
  pgCreateComment,
  pgDeleteComment,
  pgToggleCommentLike,
  pgGetUserLikedCommentIds,
  pgGetRepliesForPost,
  pgAddReply,
  pgDeleteReply,
  pgCreateModerationReport,
  pgGetAllModerationReports,
  pgResolveModerationReport,
  pgCreateNotification,
  pgGetUserNotifications,
  pgGetUnreadNotificationCount,
  pgMarkNotificationRead,
  pgMarkAllNotificationsRead,
  pgRecordCommunityEvent,
  pgGetCommunityEventsSince,
  pgEnsureInitialCommunities,
  pgGetAllCommunities,
  pgGetCommunityById,
  pgCreateCommunity,
  pgUpdateCommunityStatus,
  pgDeleteCommunity,
  pgGetAllMedia,
  pgCreateMedia,
  pgDeleteMedia,
  pgGetAllLeads,
  pgCreateLead,
  pgDeleteLead,
  pgGetConferenceDetails,
  pgUpdateConferenceDetails
} from './postgresRepo.ts';

type SqliteDatabase = import('node:sqlite').DatabaseSync;

const DATA_DIR = path.resolve(process.cwd(), 'data');
let sqliteDb: SqliteDatabase | null = null;

/**
 * Returns true if managed PostgreSQL is designated as authoritative via DATABASE_URL.
 * When true, silent SQLite fallback is strictly prohibited.
 */
export function isPostgresAuthoritative(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

/** SQLite is available only as an explicit local-development database. */
export function isSqliteExplicit(): boolean {
  return !process.env.DATABASE_URL && process.env.DB_ENGINE === 'sqlite' && process.env.NODE_ENV !== 'production';
}

export function getSqliteDb(): SqliteDatabase {
  if (process.env.DATABASE_URL) {
    throw new Error('Refusing to open SQLite while DATABASE_URL is configured. PostgreSQL is authoritative and SQLite fallback is disabled.');
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Production refuses to open SQLite. Set DATABASE_URL for Neon PostgreSQL.');
  }
  if (process.env.DB_ENGINE !== 'sqlite') {
    throw new Error('SQLite is disabled. Set DATABASE_URL for PostgreSQL, or DB_ENGINE=sqlite for an explicit local-development database. Silent SQLite fallback is not allowed.');
  }
  if (!sqliteDb) {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    let dbFile = process.env.SQLITE_PATH || path.join(DATA_DIR, 'propertystudio.db');
    if (process.platform === 'win32' && dbFile.startsWith('/tmp/')) {
      const os = (process.getBuiltinModule ? process.getBuiltinModule('node:os') : null) as typeof import('node:os') | null;
      dbFile = path.join(os?.tmpdir?.() || process.env.TEMP || 'C:\\temp', path.basename(dbFile));
    }
    const dbDir = path.dirname(dbFile);
    if (!fs.existsSync(dbDir)) {
      try { fs.mkdirSync(dbDir, { recursive: true }); } catch {}
    }
    // A static import would evaluate node:sqlite while the Neon bundle loads.
    // import() is asynchronous, and SQLite callers are synchronous, so the
    // builtin is loaded here only after the checks above have passed.
    const sqlite = process.getBuiltinModule('node:' + 'sqlite') as typeof import('node:sqlite');
    sqliteDb = new sqlite.DatabaseSync(dbFile);
  }
  return sqliteDb;
}

export const db: SqliteDatabase = new Proxy({} as SqliteDatabase, {
  get(_target, prop) {
    const real = getSqliteDb() as any;
    const value = real[prop];
    return typeof value === 'function' ? value.bind(real) : value;
  }
});

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
  | 'LAND_OWNER'
  | 'LANDOWNER'
  | 'CHANNEL_PARTNER'
  | 'RESELLER'
  | 'RERA_AGENT'
  | 'REAL_ESTATE_MEDIA';

export interface DbUser {
  id: string;
  public_id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatar: string;
  organization: string;
  company?: string | null;
  town_city: string | null;
  profession: string | null;
  interests?: string | null;
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
  post_type?: string;
  visibility?: string;
  poll_options?: string;
  poll_votes?: string;
  ama_host_name?: string | null;
  ama_host_role?: string | null;
  ama_status?: string | null;
  ama_start_time?: string | null;
  ama_end_time?: string | null;
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
  is_ama_answer?: number;
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
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM' | 'FOLLOW';
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
  if (!password || !hash || !salt) return false;
  try {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    const a = Buffer.from(hash, 'hex');
    const b = Buffer.from(verifyHash, 'hex');
    if (a.length !== b.length || a.length === 0) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// ==============================================================================
// ROLE & ACCESS CONTROL HIERARCHY
// ==============================================================================

export function canActorModifyRole(
  actorRole: UserRole,
  targetCurrentRole: UserRole,
  targetNewRole: UserRole,
  isTargetSelf: boolean,
  activeDeveloperCount: number
): { allowed: boolean; reason?: string } {
  if (actorRole !== 'DEVELOPER' && actorRole !== 'SUPER_ADMIN') {
    return { allowed: false, reason: 'Unauthorized: Only platform administrators can change user roles.' };
  }

  if (isTargetSelf) {
    return { allowed: false, reason: 'Security policy: You cannot modify your own role assignment.' };
  }

  if (actorRole === 'SUPER_ADMIN' && targetCurrentRole === 'DEVELOPER') {
    return { allowed: false, reason: 'Access Denied: Super Admins cannot modify, demote, or revoke Developer accounts.' };
  }

  if (actorRole === 'SUPER_ADMIN' && targetNewRole === 'DEVELOPER') {
    return { allowed: false, reason: 'Access Denied: Only platform Developers can grant the Developer role.' };
  }

  if (actorRole === 'SUPER_ADMIN' && (targetNewRole === 'SUPER_ADMIN' || targetCurrentRole === 'SUPER_ADMIN')) {
    return { allowed: false, reason: 'Access Denied: Only platform Developers can grant or revoke Super Admin privileges.' };
  }

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
// DATABASE INITIALIZATION & MIGRATIONS
// ==============================================================================

export async function initDatabase(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('Production startup requires DATABASE_URL. Refusing to start on SQLite or an unconfigured database.');
  }
  if (isPostgresAuthoritative()) {
    const health = await checkPostgresHealth();
    if (!health.connected) {
      throw new Error(`Authoritative PostgreSQL is unavailable (${health.failure || 'UNKNOWN'}: ${health.error || 'connection failed'}). Startup refused. SQLite fallback is disabled.`);
    }
    const schema = await checkSchemaReadiness();
    if (!schema.ready) {
      throw new Error(`PostgreSQL schema is not ready. Missing: ${schema.missing.join(', ') || 'unknown'}. Run npm run db:init. Startup does not migrate, seed, import, or bootstrap accounts.`);
    }
    console.log('[Database] PostgreSQL connected and schema ready. No automatic seed, import, or account bootstrap.');
    return;
  }
  if (isSqliteExplicit()) {
    console.log('[Database] Explicit local SQLite mode. No demo seed and no privileged bootstrap.');
    sqliteInitDatabase();
    return;
  }
  throw new Error('No authoritative database configured. Set DATABASE_URL for Neon PostgreSQL. SQLite is available only when DB_ENGINE=sqlite and DATABASE_URL is unset.');
}

// ==============================================================================
// UNIFIED REPOSITORY DISPATCH
// ==============================================================================

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  if (isPostgresAuthoritative()) return pgFindUserByEmail(email);
  return sqliteFindUserByEmail(email);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  if (isPostgresAuthoritative()) return pgFindUserById(id);
  return sqliteFindUserById(id);
}

export async function getActiveDeveloperCount(): Promise<number> {
  if (isPostgresAuthoritative()) return pgGetActiveDeveloperCount();
  return sqliteGetActiveDeveloperCount();
}

export async function getAllUsers(): Promise<Array<Omit<DbUser, 'password_hash' | 'salt'> & { postCount: number }>> {
  if (isPostgresAuthoritative()) return pgGetAllUsers();
  return sqliteGetAllUsers();
}

export async function createUser(data: {
  name: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatar?: string;
  organization?: string;
  townCity?: string;
  password?: string;
  isVerified?: boolean;
}): Promise<DbUser> {
  if (isPostgresAuthoritative()) return pgCreateUser(data);
  return sqliteCreateUser(data);
}

export async function updateUser(id: string, updates: Partial<{
  name: string;
  phone: string;
  organization: string;
  avatar: string;
  wallet_balance: number;
  assigned_properties: string;
  email_verified: number;
  phone_verified: number;
}>): Promise<DbUser | null> {
  if (isPostgresAuthoritative()) return pgUpdateUser(id, updates);
  return sqliteUpdateUser(id, updates);
}

/** Updates only town/city and profession. Omitted keys are left unchanged. Role is not accepted. */
export async function updateUserProfileFields(
  id: string,
  fields: { townCity?: string | null; profession?: string | null; company?: string | null; avatar?: string | null; interests?: string[] | null }
): Promise<DbUser | null> {
  if (isPostgresAuthoritative()) return pgUpdateProfileFields(id, fields);
  return sqliteUpdateProfileFields(id, fields);
}

export async function updateUserRole(
  actor: DbUser,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; user?: DbUser; error?: string }> {
  if (isPostgresAuthoritative()) return pgUpdateUserRole(actor, targetUserId, newRole);
  return sqliteUpdateUserRole(actor, targetUserId, newRole);
}

export async function deleteUser(
  actor: DbUser | { role: UserRole; id: string; email: string },
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  if (isPostgresAuthoritative()) return pgDeleteUser(actor, targetUserId);
  return sqliteDeleteUser(actor, targetUserId);
}

export async function suspendUser(
  actor: DbUser,
  targetUserId: string,
  suspend: boolean
): Promise<{ success: boolean; error?: string }> {
  if (isPostgresAuthoritative()) return pgSuspendUser(actor, targetUserId, suspend);
  return sqliteSuspendUser(actor, targetUserId, suspend);
}

export async function changePassword(userId: string, currentPass: string, newPass: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgChangePassword(userId, currentPass, newPass);
  return sqliteChangePassword(userId, currentPass, newPass);
}

export async function resetPassword(userId: string, newPass: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgResetPassword(userId, newPass);
  return sqliteResetPassword(userId, newPass);
}

export async function updateLastLogin(userId: string): Promise<void> {
  if (isPostgresAuthoritative()) return pgUpdateLastLogin(userId);
  sqliteUpdateLastLogin(userId);
}

export async function recoverDeveloperAccount(
  recoverySecret: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (isPostgresAuthoritative()) return pgRecoverDeveloperAccount(recoverySecret, newPassword);
  return sqliteRecoverDeveloperAccount(recoverySecret, newPassword);
}

export async function bootstrapProductionAccounts(): Promise<void> {
  if (isPostgresAuthoritative()) return pgBootstrapProductionAccounts();
  sqliteBootstrapProductionAccounts();
}

export async function createSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ token: string; session: DbSession }> {
  if (isPostgresAuthoritative()) return pgCreateSession(userId, userAgent, ipAddress);
  return sqliteCreateSession(userId, userAgent, ipAddress);
}

export async function getSession(rawToken: string): Promise<(DbSession & { user: DbUser }) | null> {
  if (isPostgresAuthoritative()) return pgGetSession(rawToken);
  return sqliteGetSession(rawToken);
}

export async function revokeSession(rawToken: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgRevokeSession(rawToken);
  return sqliteRevokeSession(rawToken);
}

export async function revokeAllUserSessions(userId: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgRevokeAllUserSessions(userId);
  return sqliteRevokeAllUserSessions(userId);
}

export async function discardUnconsumedOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<void> {
  if (isPostgresAuthoritative()) {
    const { pgDiscardUnconsumedOtp } = await import('./postgresRepo.ts');
    await pgDiscardUnconsumedOtp(target, type);
    return;
  }
  sqliteDiscardUnconsumedOtp(target, type);
}

function sqliteDiscardUnconsumedOtp(target: string, type: string): void {
  db.prepare('DELETE FROM otps WHERE target = ? AND type = ? AND consumed_at IS NULL').run(canonicalOtpTarget(type, target), type);
}

export async function generateOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<{ otp: string; expiresAt: number }> {
  if (isPostgresAuthoritative()) return pgGenerateOtp(target, type);
  return sqliteGenerateOtp(target, type);
}

export async function verifyOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET',
  code: string
): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgVerifyOtp(target, type, code);
  return sqliteVerifyOtp(target, type, code);
}

export async function isTargetVerified(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgIsTargetVerified(target, type);
  return sqliteIsTargetVerified(target, type);
}

export async function registerVerifiedUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  townCity?: string;
  otp: string;
  phoneOtp?: string;
  requirePhone: boolean;
}): Promise<DbUser> {
  const payload = {
    ...data,
    townCity: data.townCity?.trim() || 'Hyderabad, Telangana, India'
  };
  if (isPostgresAuthoritative()) return pgRegisterVerifiedUser(payload);
  return sqliteRegisterVerifiedUser(payload);
}

export async function createAuditLog(entry: {
  actorId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetId?: string;
  targetEmail?: string;
  details?: any;
  ipAddress?: string;
  status?: 'SUCCESS' | 'FAILED';
}): Promise<DbAuditLog> {
  if (isPostgresAuthoritative()) return pgCreateAuditLog(entry);
  return sqliteCreateAuditLog(entry);
}

export async function getAuditLogs(limit = 50, offset = 0, filterAction?: string): Promise<DbAuditLog[]> {
  if (isPostgresAuthoritative()) return pgGetAuditLogs(limit, offset, filterAction);
  return sqliteGetAuditLogs(limit, offset, filterAction);
}

export async function getAllPosts(params?: {
  communityId?: string;
  topic?: string;
  mediaType?: string;
  q?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
}): Promise<any[]> {
  const posts = isPostgresAuthoritative() ? await pgGetAllPosts(params) : sqliteGetAllPosts(params);
  const withProfessions = await attachAuthorProfessions(posts);
  return attachCommunityEngagement(withProfessions, params?.currentUserId);
}

export async function getPostById(postId: string, currentUserId?: string): Promise<any> {
  const post = isPostgresAuthoritative() ? await pgGetPostById(postId, currentUserId) : sqliteGetPostById(postId, currentUserId);
  if (!post) return post;
  const [withProfession] = await attachAuthorProfessions([post]);
  const [enriched] = await attachCommunityEngagement([withProfession], currentUserId);
  return enriched;
}

export async function castCommunityVote(
  postId: string,
  userId: string,
  vote: 1 | -1 | 0
): Promise<{ agreeCount: number; disagreeCount: number; userVote: 1 | -1 | 0 } | null> {
  if (isPostgresAuthoritative()) return pgCastCommunityVote(postId, userId, vote);
  return sqliteCastCommunityVote(postId, userId, vote);
}

export async function toggleCommunityFollow(
  postId: string,
  userId: string
): Promise<{ following: boolean; followerCount: number } | null> {
  if (isPostgresAuthoritative()) return pgToggleCommunityFollow(postId, userId);
  return sqliteToggleCommunityFollow(postId, userId);
}

export async function toggleBookmarkPost(
  userId: string,
  postId: string
): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  if (isPostgresAuthoritative()) return pgToggleBookmarkPost(userId, postId);
  return sqliteToggleBookmarkPost(userId, postId);
}

export async function getUserBookmarkedPostIds(userId: string): Promise<string[]> {
  if (isPostgresAuthoritative()) return pgGetUserBookmarkedPostIds(userId);
  return sqliteGetUserBookmarkedPostIds(userId);
}

export async function toggleFollowUser(
  followerId: string,
  followingId: string
): Promise<{ following: boolean; followerCount: number; followingCount: number }> {
  if (isPostgresAuthoritative()) return pgToggleFollowUser(followerId, followingId);
  return sqliteToggleFollowUser(followerId, followingId);
}

export async function getUserFollowStats(
  userId: string,
  currentUserId?: string
): Promise<{ followerCount: number; followingCount: number; isFollowing: boolean }> {
  if (isPostgresAuthoritative()) return pgGetUserFollowStats(userId, currentUserId);
  return sqliteGetUserFollowStats(userId, currentUserId);
}

export async function getUserFollowedUserIds(followerId: string): Promise<string[]> {
  if (isPostgresAuthoritative()) return pgGetUserFollowedUserIds(followerId);
  return sqliteGetUserFollowedUserIds(followerId);
}

export async function voteCommunityPoll(
  postId: string,
  userId: string,
  optionId: string
): Promise<{ pollOptions: Array<{ id: string; text: string; votes: number }>; userVotedOptionId: string } | null> {
  if (isPostgresAuthoritative()) return pgVoteCommunityPoll(postId, userId, optionId);
  return sqliteVoteCommunityPoll(postId, userId, optionId);
}

export async function checkDuplicateQuestion(
  title: string
): Promise<{ exists: boolean; matches: Array<{ id: string; title: string; upvotes: number }> }> {
  if (isPostgresAuthoritative()) return pgCheckDuplicateQuestion(title);
  return sqliteCheckDuplicateQuestion(title);
}

export async function getUserPublicProfile(
  userId: string,
  currentUserId?: string
): Promise<any | null> {
  if (isPostgresAuthoritative()) return pgGetUserPublicProfile(userId, currentUserId);
  return sqliteGetUserPublicProfile(userId, currentUserId);
}

export async function createPost(post: {
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
  postType?: 'QUESTION' | 'POST' | 'POLL' | 'AMA';
  visibility?: 'PUBLIC' | 'COMMUNITY';
  pollOptions?: Array<{ id: string; text: string; votes?: number }>;
  amaHostName?: string;
  amaHostRole?: string;
  amaStatus?: 'UPCOMING' | 'LIVE' | 'ENDED';
  amaStartTime?: string;
  amaEndTime?: string;
}): Promise<any> {
  if (isPostgresAuthoritative()) return pgCreatePost(post);
  return sqliteCreatePost(post);
}

export async function updatePost(
  postId: string,
  authorId: string,
  updates: Partial<{ title: string; content: string; links: any[]; attachments: any[] }>,
  isElevated = false
): Promise<any> {
  if (isPostgresAuthoritative()) return pgUpdatePost(postId, authorId, updates, isElevated);
  return sqliteUpdatePost(postId, authorId, updates, isElevated);
}

export async function deletePost(postId: string, actorId?: string, isElevated = false): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeletePost(postId, actorId, isElevated);
  return sqliteDeletePost(postId, actorId, isElevated);
}

export async function pinPost(postId: string, isPinned: boolean): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgPinPost(postId, isPinned);
  return sqlitePinPost(postId, isPinned);
}

export async function upvotePost(postId: string): Promise<number> {
  if (isPostgresAuthoritative()) return pgUpvotePost(postId);
  return sqliteUpvotePost(postId);
}

export async function togglePostLike(postId: string, userId: string): Promise<{ upvotes: number; liked: boolean }> {
  if (isPostgresAuthoritative()) return pgTogglePostLike(postId, userId);
  return sqliteTogglePostLike(postId, userId);
}

export async function isPostLikedByUser(postId: string, userId: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgIsPostLikedByUser(postId, userId);
  return sqliteIsPostLikedByUser(postId, userId);
}

export async function getUserLikedPostIds(userId: string): Promise<Set<string>> {
  if (isPostgresAuthoritative()) return pgGetUserLikedPostIds(userId);
  return sqliteGetUserLikedPostIds(userId);
}

export async function getCommentsForPost(postId: string, currentUserId?: string): Promise<any[]> {
  if (isPostgresAuthoritative()) return pgGetCommentsForPost(postId, currentUserId);
  return sqliteGetCommentsForPost(postId, currentUserId);
}

export async function createComment(data: {
  postId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isAmaAnswer?: boolean;
}): Promise<any> {
  if (isPostgresAuthoritative()) return pgCreateComment(data);
  return sqliteCreateComment(data);
}

export async function deleteComment(commentId: string, actorId: string, isElevated = false): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeleteComment(commentId, actorId, isElevated);
  return sqliteDeleteComment(commentId, actorId, isElevated);
}

export async function toggleCommentLike(commentId: string, userId: string): Promise<{ likesCount: number; liked: boolean }> {
  if (isPostgresAuthoritative()) return pgToggleCommentLike(commentId, userId);
  return sqliteToggleCommentLike(commentId, userId);
}

export async function getUserLikedCommentIds(userId: string): Promise<Set<string>> {
  if (isPostgresAuthoritative()) return pgGetUserLikedCommentIds(userId);
  return sqliteGetUserLikedCommentIds(userId);
}

export async function getRepliesForPost(postId: string): Promise<DbCommunityReply[]> {
  if (isPostgresAuthoritative()) return pgGetRepliesForPost(postId);
  return sqliteGetRepliesForPost(postId);
}

export async function addReply(reply: {
  postId: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  isVerifiedBuilder?: boolean;
  content: string;
}): Promise<any> {
  if (isPostgresAuthoritative()) return pgAddReply(reply);
  return sqliteAddReply(reply);
}

export async function deleteReply(replyId: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeleteReply(replyId);
  return sqliteDeleteReply(replyId);
}

export async function createModerationReport(data: {
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  reason: string;
}): Promise<DbModerationReport> {
  if (isPostgresAuthoritative()) return pgCreateModerationReport(data);
  return sqliteCreateModerationReport(data);
}

export async function getAllModerationReports(status?: string): Promise<DbModerationReport[]> {
  if (isPostgresAuthoritative()) return pgGetAllModerationReports(status);
  return sqliteGetAllModerationReports(status);
}

export async function resolveModerationReport(
  reportId: string,
  reviewedBy: string,
  status: 'RESOLVED' | 'DISMISSED',
  resolutionNotes?: string
): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgResolveModerationReport(reportId, reviewedBy, status, resolutionNotes);
  return sqliteResolveModerationReport(reportId, reviewedBy, status, resolutionNotes);
}

export async function createNotification(data: {
  userId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM' | 'FOLLOW';
  title: string;
  message: string;
  linkUrl?: string;
}): Promise<DbNotification> {
  if (isPostgresAuthoritative()) return pgCreateNotification(data);
  return sqliteCreateNotification(data);
}

export async function getUserNotifications(userId: string, limit = 30): Promise<DbNotification[]> {
  if (isPostgresAuthoritative()) return pgGetUserNotifications(userId, limit);
  return sqliteGetUserNotifications(userId, limit);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (isPostgresAuthoritative()) return pgGetUnreadNotificationCount(userId);
  return sqliteGetUnreadNotificationCount(userId);
}

export async function markNotificationRead(id: string, userId: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgMarkNotificationRead(id, userId);
  return sqliteMarkNotificationRead(id, userId);
}

export async function markAllNotificationsRead(userId: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgMarkAllNotificationsRead(userId);
  return sqliteMarkAllNotificationsRead(userId);
}

export async function recordCommunityEvent(
  eventType: string,
  payload: any,
  targetUserId?: string | null
): Promise<DbCommunityEvent> {
  if (isPostgresAuthoritative()) return pgRecordCommunityEvent(eventType, payload, targetUserId);
  return sqliteRecordCommunityEvent(eventType, payload, targetUserId);
}

export async function getCommunityEventsSince(sinceTimestamp: string, targetUserId?: string): Promise<DbCommunityEvent[]> {
  if (isPostgresAuthoritative()) return pgGetCommunityEventsSince(sinceTimestamp, targetUserId);
  return sqliteGetCommunityEventsSince(sinceTimestamp, targetUserId);
}

export async function ensureInitialCommunities(): Promise<void> {
  if (isPostgresAuthoritative()) return pgEnsureInitialCommunities();
  sqliteEnsureInitialCommunities();
}

export async function getAllCommunities(status?: string): Promise<DbCommunity[]> {
  if (isPostgresAuthoritative()) return pgGetAllCommunities(status);
  return sqliteGetAllCommunities(status);
}

export async function getCommunityById(id: string): Promise<DbCommunity | null> {
  if (isPostgresAuthoritative()) return pgGetCommunityById(id);
  return sqliteGetCommunityById(id);
}

export async function createCommunity(community: {
  name: string;
  description: string;
  category: string;
  location?: string;
  createdById?: string;
  createdByName?: string;
  rules?: string;
}): Promise<DbCommunity> {
  if (isPostgresAuthoritative()) return pgCreateCommunity(community);
  return sqliteCreateCommunity(community);
}

export async function updateCommunityStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string
): Promise<DbCommunity | null> {
  if (isPostgresAuthoritative()) return pgUpdateCommunityStatus(id, status, reason);
  return sqliteUpdateCommunityStatus(id, status, reason);
}

export async function deleteCommunity(id: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeleteCommunity(id);
  return sqliteDeleteCommunity(id);
}

export async function getAllMedia(): Promise<DbMediaItem[]> {
  if (isPostgresAuthoritative()) return pgGetAllMedia();
  return sqliteGetAllMedia();
}

export async function createMedia(item: {
  title: string;
  summary: string;
  video_url: string;
  thumbnail: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'SITE_AUDIT';
  duration?: string;
  author_name?: string;
}): Promise<string> {
  if (isPostgresAuthoritative()) return pgCreateMedia(item);
  return sqliteCreateMedia(item);
}

export async function deleteMedia(id: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeleteMedia(id);
  return sqliteDeleteMedia(id);
}

export async function getAllLeads(): Promise<DbBuyerLead[]> {
  if (isPostgresAuthoritative()) return pgGetAllLeads();
  return sqliteGetAllLeads();
}

export async function createLead(lead: {
  name: string;
  phone: string;
  email?: string;
  budget: string;
  property_type: string;
  micro_market: string;
  tier?: 'STANDARD' | 'PREMIUM' | 'HNI';
  price: number;
  requirements?: string;
}): Promise<string> {
  if (isPostgresAuthoritative()) return pgCreateLead(lead);
  return sqliteCreateLead(lead);
}

export async function deleteLead(id: string): Promise<boolean> {
  if (isPostgresAuthoritative()) return pgDeleteLead(id);
  return sqliteDeleteLead(id);
}

export async function getConferenceDetails(): Promise<DbConferenceDetails> {
  if (isPostgresAuthoritative()) return pgGetConferenceDetails();
  return sqliteGetConferenceDetails();
}

export async function updateConferenceDetails(details: {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  stream_url?: string;
  status: string;
  agenda?: string;
}): Promise<DbConferenceDetails | null> {
  if (isPostgresAuthoritative()) return pgUpdateConferenceDetails(details);
  return sqliteUpdateConferenceDetails(details);
}

// ==============================================================================
// LOCAL SQLITE IMPLEMENTATION (RETAINED STRICTLY FOR LOCAL DEV & MIGRATION SOURCE)
// ==============================================================================

function sqliteInitDatabase(): void {
  db.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');

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
      company TEXT,
      town_city TEXT,
      profession TEXT,
      interests TEXT DEFAULT '[]',
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
      expires_at BIGINT NOT NULL,
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
      post_type TEXT DEFAULT 'POST',
      visibility TEXT DEFAULT 'PUBLIC',
      poll_options TEXT DEFAULT '[]',
      poll_votes TEXT DEFAULT '[]',
      ama_host_name TEXT,
      ama_host_role TEXT,
      ama_status TEXT DEFAULT 'LIVE',
      ama_start_time TEXT,
      ama_end_time TEXT,
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

    CREATE TABLE IF NOT EXISTS community_post_votes (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      vote INTEGER NOT NULL CHECK (vote IN (1, -1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS community_post_follows (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(post_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS user_follows (
      id TEXT PRIMARY KEY,
      follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(follower_id, following_id)
    );

    CREATE TABLE IF NOT EXISTS community_bookmarks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      post_id TEXT NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      UNIQUE(user_id, post_id)
    );

    CREATE TABLE IF NOT EXISTS property_requirements (
      id TEXT PRIMARY KEY,
      seeker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      property_type TEXT NOT NULL,
      location TEXT,
      budget TEXT,
      details TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS entity_reviews (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      body TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING',
      rejection_reason TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(entity_type, entity_id, author_id)
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
      is_ama_answer INTEGER DEFAULT 0,
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

  applySqliteAdditiveSchema(db);
}

function sqliteFindUserByEmail(email: string): DbUser | null {
  if (!email) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)');
  return (stmt.get(email.trim().toLowerCase()) as unknown as DbUser) || null;
}

function sqliteFindUserById(id: string): DbUser | null {
  if (!id) return null;
  const stmt = db.prepare('SELECT * FROM users WHERE id = ? OR public_id = ?');
  return (stmt.get(id, id) as unknown as DbUser) || null;
}

function sqliteProfessionsByUserId(ids: string[]): Map<string, string> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const marks = unique.map(() => '?').join(', ');
  const rows = db.prepare(`SELECT id, profession FROM users WHERE id IN (${marks})`).all(...unique) as Array<{ id: string; profession: string | null }>;
  return new Map(rows.map(row => [row.id, row.profession || '']));
}

function collectAuthorIds(value: any, ids: string[]): void {
  if (!value || typeof value !== 'object') return;
  if (typeof value.authorId === 'string') ids.push(value.authorId);
  if (typeof value.author_id === 'string') ids.push(value.author_id);
  for (const reply of value.replies || []) collectAuthorIds(reply, ids);
  for (const comment of value.comments || []) collectAuthorIds(comment, ids);
}

function withAuthorProfession(value: any, professions: Map<string, string>): any {
  if (!value || typeof value !== 'object') return value;
  const authorId = value.authorId || value.author_id || '';
  const next = {
    ...value,
    authorProfession: professions.get(authorId) || ''
  };
  if (Array.isArray(value.replies)) {
    next.replies = value.replies.map((reply: any) => ({
      ...withAuthorProfession(reply, professions),
      authorName: reply.authorName || reply.author_name || ''
    }));
  }
  if (Array.isArray(value.comments)) {
    next.comments = value.comments.map((comment: any) => withAuthorProfession(comment, professions));
  }
  return next;
}

async function attachAuthorProfessions(posts: any[]): Promise<any[]> {
  const ids: string[] = [];
  for (const post of posts) collectAuthorIds(post, ids);
  const professions = isPostgresAuthoritative()
    ? await pgProfessionsByUserId(ids)
    : sqliteProfessionsByUserId(ids);
  return posts.map(post => withAuthorProfession(post, professions));
}

type CommunityEngagement = {
  agreeCount: number;
  disagreeCount: number;
  userVote: 1 | -1 | 0;
  followerCount: number;
  following: boolean;
  bookmarked: boolean;
  bookmarkCount: number;
};

function emptyEngagement(): CommunityEngagement {
  return { agreeCount: 0, disagreeCount: 0, userVote: 0, followerCount: 0, following: false, bookmarked: false, bookmarkCount: 0 };
}

function sqliteCommunityEngagement(ids: string[], userId?: string): Map<string, CommunityEngagement> {
  const result = new Map<string, CommunityEngagement>();
  if (ids.length === 0) return result;
  const marks = ids.map(() => '?').join(', ');
  const votes = db.prepare(`
    SELECT post_id,
      SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS agree_count,
      SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS disagree_count
    FROM community_post_votes
    WHERE post_id IN (${marks})
    GROUP BY post_id
  `).all(...ids) as Array<{ post_id: string; agree_count: number | null; disagree_count: number | null }>;
  const follows = db.prepare(`
    SELECT post_id, COUNT(*) AS follower_count
    FROM community_post_follows
    WHERE post_id IN (${marks})
    GROUP BY post_id
  `).all(...ids) as Array<{ post_id: string; follower_count: number }>;
  const bookmarks = db.prepare(`
    SELECT post_id, COUNT(*) AS bookmark_count
    FROM community_bookmarks
    WHERE post_id IN (${marks})
    GROUP BY post_id
  `).all(...ids) as Array<{ post_id: string; bookmark_count: number }>;
  for (const row of votes) {
    const current = result.get(row.post_id) || emptyEngagement();
    current.agreeCount = Number(row.agree_count || 0);
    current.disagreeCount = Number(row.disagree_count || 0);
    result.set(row.post_id, current);
  }
  for (const row of follows) {
    const current = result.get(row.post_id) || emptyEngagement();
    current.followerCount = Number(row.follower_count || 0);
    result.set(row.post_id, current);
  }
  for (const row of bookmarks) {
    const current = result.get(row.post_id) || emptyEngagement();
    current.bookmarkCount = Number(row.bookmark_count || 0);
    result.set(row.post_id, current);
  }
  if (userId) {
    const mine = db.prepare(`
      SELECT post_id, vote FROM community_post_votes WHERE user_id = ? AND post_id IN (${marks})
    `).all(userId, ...ids) as Array<{ post_id: string; vote: number }>;
    const followed = db.prepare(`
      SELECT post_id FROM community_post_follows WHERE user_id = ? AND post_id IN (${marks})
    `).all(userId, ...ids) as Array<{ post_id: string }>;
    const bookmarked = db.prepare(`
      SELECT post_id FROM community_bookmarks WHERE user_id = ? AND post_id IN (${marks})
    `).all(userId, ...ids) as Array<{ post_id: string }>;
    for (const row of mine) {
      const current = result.get(row.post_id) || emptyEngagement();
      current.userVote = Number(row.vote) === -1 ? -1 : 1;
      result.set(row.post_id, current);
    }
    for (const row of followed) {
      const current = result.get(row.post_id) || emptyEngagement();
      current.following = true;
      result.set(row.post_id, current);
    }
    for (const row of bookmarked) {
      const current = result.get(row.post_id) || emptyEngagement();
      current.bookmarked = true;
      result.set(row.post_id, current);
    }
  }
  return result;
}

async function attachCommunityEngagement(posts: any[], userId?: string): Promise<any[]> {
  const ids = posts.map(post => String(post?.id || '')).filter(Boolean);
  const engagement = isPostgresAuthoritative()
    ? await pgCommunityEngagement(ids, userId)
    : sqliteCommunityEngagement(ids, userId);
  return posts.map(post => ({
    ...post,
    ...(engagement.get(post.id) || emptyEngagement())
  }));
}

function sqliteVoteSnapshot(postId: string, userId: string): { agreeCount: number; disagreeCount: number; userVote: 1 | -1 | 0 } {
  const row = sqliteCommunityEngagement([postId], userId).get(postId) || emptyEngagement();
  return { agreeCount: row.agreeCount, disagreeCount: row.disagreeCount, userVote: row.userVote };
}

function sqliteCastCommunityVote(
  postId: string,
  userId: string,
  vote: 1 | -1 | 0
): { agreeCount: number; disagreeCount: number; userVote: 1 | -1 | 0 } | null {
  const post = db.prepare('SELECT id FROM community_posts WHERE id = ?').get(postId);
  if (!post) return null;
  const existing = db.prepare('SELECT vote FROM community_post_votes WHERE post_id = ? AND user_id = ?').get(postId, userId) as { vote: number } | undefined;
  const now = new Date().toISOString();
  if (vote === 0 || (existing && Number(existing.vote) === vote)) {
    db.prepare('DELETE FROM community_post_votes WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else if (existing) {
    db.prepare('UPDATE community_post_votes SET vote = ?, updated_at = ? WHERE post_id = ? AND user_id = ?').run(vote, now, postId, userId);
  } else {
    const id = `vote_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare(`
      INSERT INTO community_post_votes (id, post_id, user_id, vote, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, postId, userId, vote, now, now);
  }
  return sqliteVoteSnapshot(postId, userId);
}

function sqliteToggleCommunityFollow(postId: string, userId: string): { following: boolean; followerCount: number } | null {
  const post = db.prepare('SELECT id FROM community_posts WHERE id = ?').get(postId);
  if (!post) return null;
  const existing = db.prepare('SELECT id FROM community_post_follows WHERE post_id = ? AND user_id = ?').get(postId, userId) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM community_post_follows WHERE post_id = ? AND user_id = ?').run(postId, userId);
  } else {
    const id = `follow_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO community_post_follows (id, post_id, user_id, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      postId,
      userId,
      new Date().toISOString()
    );
  }
  const row = sqliteCommunityEngagement([postId], userId).get(postId) || emptyEngagement();
  return { following: row.following, followerCount: row.followerCount };
}

function sqliteToggleBookmarkPost(userId: string, postId: string): { bookmarked: boolean; bookmarkCount: number } {
  const existing = db.prepare('SELECT id FROM community_bookmarks WHERE user_id = ? AND post_id = ?').get(userId, postId) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM community_bookmarks WHERE user_id = ? AND post_id = ?').run(userId, postId);
  } else {
    const id = `bkmk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO community_bookmarks (id, user_id, post_id, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      userId,
      postId,
      new Date().toISOString()
    );
  }
  const countRow = db.prepare('SELECT COUNT(*) as count FROM community_bookmarks WHERE post_id = ?').get(postId) as { count: number };
  return {
    bookmarked: !existing,
    bookmarkCount: Number(countRow?.count || 0)
  };
}

function sqliteGetUserBookmarkedPostIds(userId: string): string[] {
  const rows = db.prepare('SELECT post_id FROM community_bookmarks WHERE user_id = ? ORDER BY created_at DESC').all(userId) as Array<{ post_id: string }>;
  return rows.map(r => r.post_id);
}

function sqliteToggleFollowUser(followerId: string, followingId: string): { following: boolean; followerCount: number; followingCount: number } {
  if (followerId === followingId) throw new Error('Cannot follow yourself');
  const existing = db.prepare('SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?').get(followerId, followingId) as { id: string } | undefined;
  if (existing) {
    db.prepare('DELETE FROM user_follows WHERE follower_id = ? AND following_id = ?').run(followerId, followingId);
  } else {
    const id = `ufol_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    db.prepare('INSERT INTO user_follows (id, follower_id, following_id, created_at) VALUES (?, ?, ?, ?)').run(
      id,
      followerId,
      followingId,
      new Date().toISOString()
    );
    const followerUser = sqliteFindUserById(followerId);
    if (followerUser) {
      sqliteCreateNotification({
        userId: followingId,
        actorId: followerId,
        actorName: followerUser.name,
        type: 'FOLLOW',
        title: 'New follower',
        message: `${followerUser.name} started following you`,
        linkUrl: `/community/user/${followerId}`
      });
    }
  }
  const followerCountRow = db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?').get(followingId) as { count: number };
  const followingCountRow = db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?').get(followerId) as { count: number };
  return {
    following: !existing,
    followerCount: Number(followerCountRow?.count || 0),
    followingCount: Number(followingCountRow?.count || 0)
  };
}

function sqliteGetUserFollowStats(userId: string, currentUserId?: string): { followerCount: number; followingCount: number; isFollowing: boolean } {
  const followerCountRow = db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE following_id = ?').get(userId) as { count: number };
  const followingCountRow = db.prepare('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = ?').get(userId) as { count: number };
  let isFollowing = false;
  if (currentUserId) {
    const check = db.prepare('SELECT id FROM user_follows WHERE follower_id = ? AND following_id = ?').get(currentUserId, userId);
    isFollowing = Boolean(check);
  }
  return {
    followerCount: Number(followerCountRow?.count || 0),
    followingCount: Number(followingCountRow?.count || 0),
    isFollowing
  };
}

function sqliteGetUserFollowedUserIds(followerId: string): string[] {
  const rows = db.prepare('SELECT following_id FROM user_follows WHERE follower_id = ?').all(followerId) as Array<{ following_id: string }>;
  return rows.map(r => r.following_id);
}

function sqliteVoteCommunityPoll(
  postId: string,
  userId: string,
  optionId: string
): { pollOptions: Array<{ id: string; text: string; votes: number }>; userVotedOptionId: string } | null {
  const post = db.prepare('SELECT id, post_type, poll_options, poll_votes FROM community_posts WHERE id = ?').get(postId) as {
    id: string;
    post_type: string;
    poll_options: string | null;
    poll_votes: string | null;
  } | undefined;
  if (!post) return null;
  let options: Array<{ id: string; text: string; votes?: number }> = [];
  try { options = JSON.parse(post.poll_options || '[]'); } catch {}
  let votes: Record<string, string> = {};
  try { votes = JSON.parse(post.poll_votes || '{}'); } catch {}
  votes[userId] = optionId;

  const counts: Record<string, number> = {};
  for (const uid of Object.keys(votes)) {
    const optId = votes[uid];
    counts[optId] = (counts[optId] || 0) + 1;
  }
  const updatedOptions = options.map(opt => ({
    ...opt,
    votes: counts[opt.id] || 0
  }));

  db.prepare('UPDATE community_posts SET poll_options = ?, poll_votes = ?, updated_at = ? WHERE id = ?').run(
    JSON.stringify(updatedOptions),
    JSON.stringify(votes),
    new Date().toISOString(),
    postId
  );

  return {
    pollOptions: updatedOptions as Array<{ id: string; text: string; votes: number }>,
    userVotedOptionId: optionId
  };
}

function sqliteCheckDuplicateQuestion(title: string): { exists: boolean; matches: Array<{ id: string; title: string; upvotes: number }> } {
  const clean = title.trim().toLowerCase().replace(/[^\w\s]/g, '');
  if (!clean || clean.length < 5) return { exists: false, matches: [] };
  const queryWords = clean.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return { exists: false, matches: [] };

  const candidates = db.prepare(`
    SELECT id, title, upvotes FROM community_posts
    WHERE status IN ('APPROVED', 'PUBLISHED', 'PENDING_APPROVAL')
    ORDER BY id DESC LIMIT 100
  `).all() as Array<{ id: string; title: string; upvotes: number }>;

  const matchesWithScore: Array<{ id: string; title: string; upvotes: number; score: number }> = [];

  for (const c of candidates) {
    const cWords = new Set(c.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2));
    let matchCount = 0;
    for (const qw of queryWords) {
      if (cWords.has(qw) || Array.from(cWords).some(cw => cw.includes(qw) || qw.includes(cw))) {
        matchCount++;
      }
    }
    const threshold = queryWords.length <= 2 ? 1 : 2;
    if (matchCount >= threshold) {
      matchesWithScore.push({ ...c, score: matchCount });
    }
  }

  matchesWithScore.sort((a, b) => b.score - a.score || b.upvotes - a.upvotes);
  const matches = matchesWithScore.slice(0, 5).map(({ id, title, upvotes }) => ({ id, title, upvotes }));

  return {
    exists: matches.length > 0,
    matches
  };
}

function sqliteGetUserPublicProfile(userId: string, currentUserId?: string): any {
  const user = sqliteFindUserById(userId);
  if (!user) return null;
  const followStats = sqliteGetUserFollowStats(user.id, currentUserId);
  const posts = sqliteGetAllPosts({ currentUserId, limit: 10 }).filter(p => p.authorId === user.id);
  const postCountRow = db.prepare("SELECT COUNT(*) as count FROM community_posts WHERE author_id = ? AND status IN ('APPROVED', 'PUBLISHED')").get(user.id) as { count: number };
  const commentCountRow = db.prepare("SELECT COUNT(*) as count FROM community_comments WHERE author_id = ?").get(user.id) as { count: number };

  let interests: string[] = [];
  try {
    if (typeof user.interests === 'string') interests = JSON.parse(user.interests);
    else if (Array.isArray(user.interests)) interests = user.interests;
  } catch {}

  return {
    id: user.id,
    publicId: user.public_id,
    name: user.name,
    role: user.role,
    profession: user.profession || null,
    company: user.company || null,
    avatar: user.avatar || null,
    townCity: user.town_city || null,
    interests,
    isVerified: Boolean(user.is_verified),
    createdAt: user.created_at,
    followerCount: followStats.followerCount,
    followingCount: followStats.followingCount,
    isFollowing: followStats.isFollowing,
    stats: {
      totalPosts: Number(postCountRow?.count || 0),
      totalAnswers: Number(commentCountRow?.count || 0)
    },
    recentPosts: posts
  };
}

function sqliteGetActiveDeveloperCount(): number {
  const stmt = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'DEVELOPER' AND account_status = 'ACTIVE'");
  const res = stmt.get() as { count: number };
  return res?.count || 0;
}

function sqliteGetAllUsers(): Array<Omit<DbUser, 'password_hash' | 'salt'> & { postCount: number }> {
  const stmt = db.prepare(`
    SELECT u.id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.town_city, u.profession,
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

function sqliteCreateUser(data: {
  name: string;
  email: string;
  phone?: string;
  role?: UserRole;
  avatar?: string;
  organization?: string;
  townCity?: string;
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
    INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, town_city, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
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
    data.townCity ?? null,
    data.isVerified ? 1 : 0,
    data.isVerified ? 1 : 0,
    0,
    hash,
    salt,
    now,
    now
  );

  return sqliteFindUserById(id)!;
}

function sqliteUpdateUser(id: string, updates: Partial<{
  name: string;
  phone: string;
  organization: string;
  avatar: string;
  wallet_balance: number;
  assigned_properties: string;
  email_verified: number;
  phone_verified: number;
}>): DbUser | null {
  const fields: string[] = [];
  const values: any[] = [];

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = ?`);
      values.push(val);
    }
  }

  if (fields.length === 0) return sqliteFindUserById(id);

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());
  values.push(id);

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
  db.prepare(query).run(...values);
  return sqliteFindUserById(id);
}

function sqliteUpdateProfileFields(
  id: string,
  fields: { townCity?: string | null; profession?: string | null; company?: string | null; avatar?: string | null; interests?: string[] | null }
): DbUser | null {
  const sets: string[] = [];
  const values: Array<string | null> = [];
  if (fields.townCity !== undefined) {
    sets.push('town_city = ?');
    values.push(fields.townCity);
  }
  if (fields.profession !== undefined) {
    sets.push('profession = ?');
    values.push(fields.profession);
  }
  if (fields.company !== undefined) {
    sets.push('company = ?');
    values.push(fields.company);
  }
  if (fields.avatar !== undefined) {
    sets.push('avatar = ?');
    values.push(fields.avatar);
  }
  if (fields.interests !== undefined) {
    sets.push('interests = ?');
    values.push(fields.interests ? JSON.stringify(fields.interests) : null);
  }
  if (sets.length === 0) return sqliteFindUserById(id);
  sets.push('updated_at = ?');
  values.push(new Date().toISOString());
  db.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).run(...values, id);
  return sqliteFindUserById(id);
}

function sqliteUpdateUserRole(actor: DbUser, targetUserId: string, newRole: UserRole): { success: boolean; user?: DbUser; error?: string } {
  const targetUser = sqliteFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'Target user not found' };

  const devCount = sqliteGetActiveDeveloperCount();
  const authCheck = canActorModifyRole(actor.role, targetUser.role, newRole, actor.id === targetUser.id, devCount);

  if (!authCheck.allowed) {
    sqliteCreateAuditLog({
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

  sqliteCreateAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: newRole === 'SUPER_ADMIN' ? 'GRANT_SUPER_ADMIN' : targetUser.role === 'SUPER_ADMIN' ? 'REVOKE_SUPER_ADMIN' : 'UPDATE_ROLE',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { previousRole: targetUser.role, newRole }
  });

  return { success: true, user: sqliteFindUserById(targetUserId)! };
}

function sqliteDeleteUser(actor: DbUser | { role: UserRole; id: string; email: string }, targetUserId: string): { success: boolean; error?: string } {
  const targetUser = sqliteFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = sqliteGetActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) {
    sqliteCreateAuditLog({
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

  sqliteCreateAuditLog({
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

function sqliteSuspendUser(actor: DbUser, targetUserId: string, suspend: boolean): { success: boolean; error?: string } {
  const targetUser = sqliteFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = sqliteGetActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) return { success: false, error: check.reason };

  const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';
  db.prepare('UPDATE users SET account_status = ?, updated_at = ? WHERE id = ?').run(newStatus, new Date().toISOString(), targetUserId);
  if (suspend) {
    sqliteRevokeAllUserSessions(targetUserId);
  }

  sqliteCreateAuditLog({
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

function sqliteChangePassword(userId: string, currentPass: string, newPass: string): boolean {
  const user = sqliteFindUserById(userId);
  if (!user) return false;
  const isValid = verifyPassword(currentPass, user.password_hash, user.salt);
  if (!isValid) return false;

  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hash, salt, now, userId);
  sqliteRevokeAllUserSessions(userId);

  sqliteCreateAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PASSWORD_CHANGED',
    targetId: user.id
  });

  return true;
}

function sqliteResetPassword(userId: string, newPass: string): boolean {
  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET password_hash = ?, salt = ?, must_change_password = 0, updated_at = ? WHERE id = ?').run(hash, salt, now, userId);
  sqliteRevokeAllUserSessions(userId);
  return true;
}

function sqliteUpdateLastLogin(userId: string): void {
  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, userId);
}

const sqliteRecoveryAttempts: { count: number; lockedUntil: number } = { count: 0, lockedUntil: 0 };

function sqliteRecoverDeveloperAccount(recoverySecret: string, newPassword: string): { success: boolean; error?: string } {
  const now = Date.now();
  if (sqliteRecoveryAttempts.lockedUntil > now) {
    const remainingSeconds = Math.ceil((sqliteRecoveryAttempts.lockedUntil - now) / 1000);
    return { success: false, error: `Emergency recovery endpoint is temporarily locked due to failed attempts. Try again in ${remainingSeconds} seconds.` };
  }

  const configuredSecret = process.env.DEVELOPER_RECOVERY_KEY || process.env.BOOTSTRAP_SECRET_TOKEN;
  if (!configuredSecret) {
    return { success: false, error: 'Emergency developer recovery is not configured on this server (DEVELOPER_RECOVERY_KEY is missing).' };
  }

  const secretBuffer = Buffer.from(recoverySecret);
  const configuredBuffer = Buffer.from(configuredSecret);
  const isMatch = secretBuffer.length === configuredBuffer.length && crypto.timingSafeEqual(secretBuffer, configuredBuffer);

  if (!isMatch) {
    sqliteRecoveryAttempts.count += 1;
    if (sqliteRecoveryAttempts.count >= 3) {
      sqliteRecoveryAttempts.lockedUntil = now + 15 * 60 * 1000;
      sqliteRecoveryAttempts.count = 0;
    }
    sqliteCreateAuditLog({
      actorId: 'anonymous_recovery_attempt',
      actorEmail: 'unknown',
      actorRole: 'SYSTEM',
      action: 'DEVELOPER_RECOVERY_FAILED_INVALID_KEY',
      status: 'FAILED',
      details: { attemptCount: sqliteRecoveryAttempts.count }
    });
    return { success: false, error: 'Invalid recovery authorization key.' };
  }

  sqliteRecoveryAttempts.count = 0;
  sqliteRecoveryAttempts.lockedUntil = 0;

  const devEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL?.trim().toLowerCase();
  if (!devEmail) {
    return { success: false, error: 'BOOTSTRAP_DEVELOPER_EMAIL is not configured. Recovery will not guess an account.' };
  }
  const devUser = sqliteFindUserByEmail(devEmail);

  if (!devUser) {
    return { success: false, error: 'Developer account is not provisioned. Run npm run bootstrap. Recovery does not create accounts.' };
  }

  sqliteResetPassword(devUser.id, newPassword);
  db.prepare("UPDATE users SET account_status = 'ACTIVE', updated_at = ? WHERE id = ?").run(new Date().toISOString(), devUser.id);

  sqliteCreateAuditLog({
    actorId: 'system_recovery',
    actorEmail: 'recovery@propertystudio.org',
    actorRole: 'SYSTEM',
    action: 'DEVELOPER_ACCOUNT_RECOVERED',
    targetId: devUser.id,
    targetEmail: devUser.email
  });

  return { success: true };
}

function sqliteBootstrapProductionAccounts(): void {
  const now = new Date().toISOString();
  const devEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL?.trim().toLowerCase();
  const devPassword = process.env.BOOTSTRAP_DEVELOPER_PASSWORD;
  const adminEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  if (!devEmail || !devPassword || !adminEmail || !adminPassword) {
    throw new Error('Bootstrap requires BOOTSTRAP_DEVELOPER_EMAIL, BOOTSTRAP_DEVELOPER_PASSWORD, BOOTSTRAP_SUPER_ADMIN_EMAIL, and BOOTSTRAP_SUPER_ADMIN_PASSWORD. Refusing to invent credentials.');
  }

  const existingDev = sqliteFindUserByEmail(devEmail);

  if (!existingDev) {
    const { hash, salt } = hashPassword(devPassword);
    const devId = 'user_dev_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'dev_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DEVELOPER', ?, ?, 0, 1, 1, 1, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
    `).run(
      devId,
      publicId,
      'Platform Developer',
      devEmail,
      '',
      '',
      'Property Studio',
      hash,
      salt,
      now,
      now
    );

    sqliteCreateAuditLog({
      actorId: 'system',
      actorEmail: 'system@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_DEVELOPER_CREATED',
      targetId: devId,
      targetEmail: devEmail,
      details: { role: 'DEVELOPER' }
    });
  }

  const existingAdmin = sqliteFindUserByEmail(adminEmail);

  if (!existingAdmin) {
    const { hash, salt } = hashPassword(adminPassword);
    const adminId = 'user_admin_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'admin_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', ?, ?, 0, 1, 1, 1, 'ACTIVE', 0, '[]', ?, ?, ?, ?)
    `).run(
      adminId,
      publicId,
      'Platform Super Admin',
      adminEmail,
      '',
      '',
      'Property Studio',
      hash,
      salt,
      now,
      now
    );

    sqliteCreateAuditLog({
      actorId: 'system',
      actorEmail: 'system@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_SUPER_ADMIN_CREATED',
      targetId: adminId,
      targetEmail: adminEmail,
      details: { role: 'SUPER_ADMIN' }
    });
  }

}

function sqliteCreateSession(userId: string, userAgent?: string, ipAddress?: string): { token: string; session: DbSession } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;

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

function sqliteGetSession(rawToken: string): (DbSession & { user: DbUser }) | null {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  const stmt = db.prepare(`
    SELECT s.*, u.id as u_id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.town_city, u.profession,
           u.wallet_balance, u.is_verified, u.email_verified, u.phone_verified, u.account_status,
           u.must_change_password, u.assigned_properties, u.created_at as u_created_at, u.updated_at as u_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.is_revoked = 0
  `);
  const row = stmt.get(tokenHash) as any;
  if (!row) return null;

  if (Date.now() > row.expires_at) {
    sqliteRevokeSession(rawToken);
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
      town_city: row.town_city || null,
      profession: row.profession || null,
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

function sqliteRevokeSession(rawToken: string): boolean {
  const tokenHash = hashToken(rawToken);
  const stmt = db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?');
  stmt.run(tokenHash);
  return true;
}

function sqliteRevokeAllUserSessions(userId: string): boolean {
  const stmt = db.prepare('UPDATE sessions SET is_revoked = 1 WHERE user_id = ?');
  stmt.run(userId);
  return true;
}

let sqliteTransactionDepth = 0;

function sqliteTransaction<T>(fn: () => T): T {
  const database = getSqliteDb();
  const outer = sqliteTransactionDepth === 0;
  if (outer) database.exec('BEGIN IMMEDIATE');
  sqliteTransactionDepth += 1;
  try {
    const result = fn();
    if (outer) database.exec('COMMIT');
    return result;
  } catch (error) {
    if (outer) {
      try {
        database.exec('ROLLBACK');
      } catch {
        // The original error is the one the caller needs.
      }
    }
    throw error;
  } finally {
    sqliteTransactionDepth -= 1;
  }
}

function sqliteRunner(): SyncOtpClaimRunner {
  const database = getSqliteDb();
  return {
    query(sql: string, params: unknown[]) {
      const statement = database.prepare(sql);
      const values = params as Array<string | number | null>;
      if (/^\s*select/i.test(sql)) {
        const rows = statement.all(...values) as Array<{ id: string; otp_hash: string; expires_at: number; attempt_count: number }>;
        return { rows, changes: rows.length };
      }
      const result = statement.run(...values);
      return { rows: [], changes: Number(result.changes || 0) };
    }
  };
}

function sqliteGenerateOtp(target: string, type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'): { otp: string; expiresAt: number } {
  return sqliteTransaction(() => {
    const database = getSqliteDb();
    const normalizedTarget = canonicalOtpTarget(type, target);
    const recentOtp = database.prepare(`
      SELECT created_at FROM otps
      WHERE target = ? AND type = ? AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `).get(normalizedTarget, type) as { created_at: string } | undefined;

    if (recentOtp) {
      const elapsed = Date.now() - new Date(recentOtp.created_at).getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new OtpCooldownError(waitSeconds);
      }
    }

    const otp = generateOtpCode();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    database.prepare('DELETE FROM otps WHERE target = ? AND type = ? AND consumed_at IS NULL').run(normalizedTarget, type);
    database.prepare(`
      INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at)
      VALUES (?, ?, ?, ?, NULL, ?, 0, 0, NULL, ?)
    `).run(id, normalizedTarget, type, sealOtp(otp), expiresAt, now);
    return { otp, expiresAt };
  });
}

function sqliteVerifyOtp(target: string, type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET', code: string): boolean {
  const normalizedTarget = canonicalOtpTarget(type, target);
  return sqliteTransaction(() => claimOtpProofSync(sqliteRunner(), normalizedTarget, type, code));
}

function sqlitePhoneTaken(e164: string): boolean {
  if (!indianNationalDigits(e164)) return false;
  const rows = getSqliteDb().prepare(`SELECT phone FROM users`).all() as Array<{ phone: string | null }>;
  return rows.some((row) => storedPhoneMatches(row.phone, e164));
}

function sqliteRegisterVerifiedUser(data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
  organization?: string;
  townCity?: string;
  otp: string;
  phoneOtp?: string;
  requirePhone: boolean;
}): DbUser {
  const email = data.email.trim().toLowerCase();
  const phone = data.requirePhone
    ? canonicalOtpTarget('PHONE_VERIFICATION', data.phone || '')
    : (data.phone?.trim() ? (normalizeIndianMobile(data.phone) || data.phone.trim()) : '');
  return sqliteTransaction(() => {
    const emailOk = claimOtpProofSync(sqliteRunner(), email, 'EMAIL_VERIFICATION', data.otp, { issueGrant: false, allowGrantFallback: true });
    if (!emailOk) throw new RegistrationRejected(400, 'Invalid or expired email verification code');
    if (data.requirePhone) {
      const phoneOk = Boolean(data.phoneOtp) && claimOtpProofSync(sqliteRunner(), phone, 'PHONE_VERIFICATION', String(data.phoneOtp), { issueGrant: false, allowGrantFallback: true });
      if (!phoneOk) {
        throw new RegistrationRejected(400, 'Mobile number OTP verification is required for Property Seeker registration. Please verify your mobile phone.');
      }
      if (sqlitePhoneTaken(phone)) {
        throw new RegistrationRejected(400, 'An account with this mobile number already exists');
      }
    }
    try {
      const user = sqliteCreateUser({
        name: data.name,
        email,
        password: data.password,
        role: data.role,
        phone,
        organization: data.organization,
        townCity: data.townCity?.trim() || 'Hyderabad, Telangana, India',
        isVerified: true
      });
      if (data.requirePhone) {
        getSqliteDb().prepare('UPDATE users SET phone_verified = 1 WHERE id = ?').run(user.id);
        user.phone_verified = 1;
      }
      return user;
    } catch (error) {
      if (isUniqueEmailError(error)) throw new RegistrationRejected(400, 'An account with this email address already exists');
      throw error;
    }
  });
}

function sqliteIsTargetVerified(
  _target: string,
  _type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): boolean {
  return false;
}

function sqliteCreateAuditLog(entry: {
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

function sqliteGetAuditLogs(limit = 50, offset = 0, filterAction?: string): DbAuditLog[] {
  if (filterAction) {
    const stmt = db.prepare('SELECT * FROM audit_logs WHERE action = ? ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(filterAction, limit, offset) as unknown as DbAuditLog[];
  }
  const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ? OFFSET ?');
  return stmt.all(limit, offset) as unknown as DbAuditLog[];
}

function sqliteGetAllPosts(params?: {
  communityId?: string;
  topic?: string;
  mediaType?: string;
  q?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
}): any[] {
  let query = "SELECT p.* FROM community_posts p WHERE (p.status IN ('APPROVED', 'PUBLISHED') OR (p.author_id = ? AND p.status IN ('PENDING_APPROVAL', 'REJECTED', 'SUSPENDED')))";
  const args: any[] = [params?.currentUserId || ''];

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

  if (params?.q) {
    query += " AND (LOWER(p.title) LIKE ? ESCAPE '\\' OR LOWER(p.content) LIKE ? ESCAPE '\\')";
    const pattern = communitySearchLikePattern(params.q);
    args.push(pattern, pattern);
  }

  query += ' ORDER BY p.is_pinned DESC, p.created_at DESC';

  if (params?.limit) {
    query += ' LIMIT ? OFFSET ?';
    args.push(params.limit, params.offset || 0);
  }

  const posts = db.prepare(query).all(...args) as unknown as DbCommunityPost[];
  const userLikedPostIds = params?.currentUserId ? sqliteGetUserLikedPostIds(params.currentUserId) : new Set<string>();

  return posts.map(p => {
    let pollOptions = [];
    try { pollOptions = JSON.parse(p.poll_options || '[]'); } catch {}
    let pollVotes: Record<string, string> = {};
    try { pollVotes = JSON.parse(p.poll_votes || '{}'); } catch {}
    const userVotedOptionId = params?.currentUserId && pollVotes[params.currentUserId] ? pollVotes[params.currentUserId] : null;

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
      userLiked: userLikedPostIds.has(p.id),
      commentsCount: p.comments_count || 0,
      isPinned: Boolean(p.is_pinned),
      isFlagged: Boolean(p.is_flagged),
      postType: (p.post_type as any) || 'POST',
      visibility: (p.visibility as any) || 'PUBLIC',
      pollOptions,
      userVotedOptionId,
      amaHostName: p.ama_host_name || null,
      amaHostRole: p.ama_host_role || null,
      amaStatus: p.ama_status || null,
      amaStartTime: p.ama_start_time || null,
      amaEndTime: p.ama_end_time || null,
      replies: sqliteGetRepliesForPost(p.id),
      createdAt: p.created_at,
      updatedAt: p.updated_at
    };
  });
}

function sqliteGetPostById(postId: string, currentUserId?: string): any {
  const stmt = db.prepare('SELECT * FROM community_posts WHERE id = ?');
  const p = stmt.get(postId) as DbCommunityPost | undefined;
  if (!p) return null;

  const userLiked = currentUserId ? sqliteIsPostLikedByUser(postId, currentUserId) : false;

  let pollOptions = [];
  try { pollOptions = JSON.parse(p.poll_options || '[]'); } catch {}
  let pollVotes: Record<string, string> = {};
  try { pollVotes = JSON.parse(p.poll_votes || '{}'); } catch {}
  const userVotedOptionId = currentUserId && pollVotes[currentUserId] ? pollVotes[currentUserId] : null;

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
    postType: (p.post_type as any) || 'POST',
    visibility: (p.visibility as any) || 'PUBLIC',
    pollOptions,
    userVotedOptionId,
    amaHostName: p.ama_host_name || null,
    amaHostRole: p.ama_host_role || null,
    amaStatus: p.ama_status || null,
    amaStartTime: p.ama_start_time || null,
    amaEndTime: p.ama_end_time || null,
    replies: sqliteGetRepliesForPost(p.id),
    comments: sqliteGetCommentsForPost(p.id, currentUserId),
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

function sqliteCreatePost(post: {
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
  postType?: 'QUESTION' | 'POST' | 'POLL' | 'AMA';
  visibility?: 'PUBLIC' | 'COMMUNITY';
  pollOptions?: Array<{ id: string; text: string; votes?: number }>;
  amaHostName?: string;
  amaHostRole?: string;
  amaStatus?: 'UPCOMING' | 'LIVE' | 'ENDED';
  amaStartTime?: string;
  amaEndTime?: string;
}): any {
  const id = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const linksStr = JSON.stringify(post.links || []);
  const attachmentsStr = JSON.stringify(post.attachments || []);
  const pollOptionsStr = post.pollOptions ? JSON.stringify(post.pollOptions) : null;
  const pollVotesStr = post.pollOptions ? JSON.stringify({}) : null;

  const stmt = db.prepare(`
    INSERT INTO community_posts (
      id, author_id, author_name, author_role, community_id, community_name,
      property_id, property_name, topic, title, content, links, attachments,
      media_type, media_url, thumbnail_url, duration, status, upvotes, comments_count,
      is_pinned, is_flagged, post_type, visibility, poll_options, poll_votes,
      ama_host_name, ama_host_role, ama_status, ama_start_time, ama_end_time,
      created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', 0, 0, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
    post.postType || 'POST',
    post.visibility || 'PUBLIC',
    pollOptionsStr,
    pollVotesStr,
    post.amaHostName || null,
    post.amaHostRole || null,
    post.amaStatus || (post.postType === 'AMA' ? 'UPCOMING' : null),
    post.amaStartTime || null,
    post.amaEndTime || null,
    now,
    now
  );

  sqliteRecordCommunityEvent('POST_CREATED', {
    id,
    title: post.title,
    authorName: post.authorName,
    communityId: post.communityId,
    mediaType: post.mediaType || 'POST',
    status: 'PENDING_APPROVAL'
  }, post.authorId || null);

  return sqliteGetPostById(id);
}

function sqliteUpdatePost(
  postId: string,
  authorId: string,
  updates: Partial<{ title: string; content: string; links: any[]; attachments: any[] }>,
  isElevated = false
): any {
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
    SET title = ?, content = ?, links = ?, attachments = ?, status = 'PENDING_APPROVAL', updated_at = ?
    WHERE id = ?
  `).run(title, content, links, attachments, now, postId);

  sqliteRecordCommunityEvent('POST_UPDATED', {
    id: postId,
    title,
    status: 'PENDING_APPROVAL',
    authorId: post.author_id
  }, post.author_id || null);
  return sqliteGetPostById(postId);
}

function sqliteDeletePost(postId: string, actorId?: string, isElevated = false): boolean {
  const post = db.prepare('SELECT * FROM community_posts WHERE id = ?').get(postId) as DbCommunityPost | undefined;
  if (!post) return false;
  if (actorId && !isElevated && post.author_id !== actorId) return false;

  db.prepare('DELETE FROM community_posts WHERE id = ?').run(postId);
  sqliteRecordCommunityEvent('POST_DELETED', { id: postId });
  return true;
}

function sqlitePinPost(postId: string, isPinned: boolean): boolean {
  db.prepare('UPDATE community_posts SET is_pinned = ?, updated_at = ? WHERE id = ?').run(isPinned ? 1 : 0, new Date().toISOString(), postId);
  return true;
}

function sqliteUpvotePost(postId: string): number {
  db.prepare('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = ?').run(postId);
  const p = db.prepare('SELECT upvotes FROM community_posts WHERE id = ?').get(postId) as { upvotes: number };
  return p?.upvotes || 0;
}

function sqliteTogglePostLike(postId: string, userId: string): { upvotes: number; liked: boolean } {
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

    const post = db.prepare('SELECT author_id, title FROM community_posts WHERE id = ?').get(postId) as { author_id?: string; title: string } | undefined;
    const user = sqliteFindUserById(userId);
    if (post && post.author_id && post.author_id !== userId && user) {
      sqliteCreateNotification({
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

  sqliteRecordCommunityEvent('LIKE_CHANGED', { postId, upvotes });
  return { upvotes, liked };
}

function sqliteIsPostLikedByUser(postId: string, userId: string): boolean {
  const check = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
  return Boolean(check);
}

function sqliteGetUserLikedPostIds(userId: string): Set<string> {
  const rows = db.prepare('SELECT post_id FROM post_likes WHERE user_id = ?').all(userId) as Array<{ post_id: string }>;
  return new Set(rows.map(r => r.post_id));
}

function sqliteGetCommentsForPost(postId: string, currentUserId?: string): any[] {
  const comments = db.prepare(`
    SELECT * FROM community_comments 
    WHERE post_id = ? 
    ORDER BY created_at ASC
  `).all(postId) as unknown as DbCommunityComment[];

  const userLikedCommentIds = currentUserId ? sqliteGetUserLikedCommentIds(currentUserId) : new Set<string>();

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
      isAmaAnswer: Boolean(c.is_ama_answer),
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

function sqliteCreateComment(data: {
  postId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  isAmaAnswer?: boolean;
}): any {
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO community_comments (id, post_id, parent_id, author_id, author_name, author_role, content, likes_count, is_ama_answer, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)
  `).run(
    id,
    data.postId,
    data.parentId || null,
    data.authorId,
    data.authorName,
    data.authorRole,
    data.content.trim(),
    data.isAmaAnswer ? 1 : 0,
    now,
    now
  );

  db.prepare('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = ?').run(data.postId);

  const post = db.prepare('SELECT author_id, title FROM community_posts WHERE id = ?').get(data.postId) as { author_id?: string; title: string } | undefined;
  if (post && post.author_id && post.author_id !== data.authorId) {
    sqliteCreateNotification({
      userId: post.author_id,
      actorId: data.authorId,
      actorName: data.authorName,
      type: data.parentId ? 'REPLY' : 'COMMENT',
      title: data.parentId ? 'New reply in discussion' : 'New comment on your post',
      message: `${data.authorName}: "${data.content.slice(0, 60)}..."`,
      linkUrl: `/community#${data.postId}`
    });
  }

  sqliteRecordCommunityEvent('COMMENT_CREATED', {
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
    isAmaAnswer: Boolean(data.isAmaAnswer),
    replies: [],
    createdAt: now,
    updatedAt: now
  };
}

function sqliteDeleteComment(commentId: string, actorId: string, isElevated = false): boolean {
  const c = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(commentId) as DbCommunityComment | undefined;
  if (!c) return false;
  if (!isElevated && c.author_id !== actorId) return false;

  db.prepare('DELETE FROM community_comments WHERE id = ?').run(commentId);
  db.prepare('UPDATE community_posts SET comments_count = MAX(0, comments_count - 1) WHERE id = ?').run(c.post_id);

  sqliteRecordCommunityEvent('COMMENT_DELETED', { id: commentId, postId: c.post_id });
  return true;
}

function sqliteToggleCommentLike(commentId: string, userId: string): { likesCount: number; liked: boolean } {
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

function sqliteGetUserLikedCommentIds(userId: string): Set<string> {
  const rows = db.prepare('SELECT comment_id FROM comment_likes WHERE user_id = ?').all(userId) as Array<{ comment_id: string }>;
  return new Set(rows.map(r => r.comment_id));
}

function sqliteGetRepliesForPost(postId: string): DbCommunityReply[] {
  const stmt = db.prepare('SELECT * FROM community_replies WHERE post_id = ? ORDER BY created_at ASC');
  return stmt.all(postId) as unknown as DbCommunityReply[];
}

function sqliteAddReply(reply: {
  postId: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  isVerifiedBuilder?: boolean;
  content: string;
}): any {
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

function sqliteDeleteReply(replyId: string): boolean {
  db.prepare('DELETE FROM community_replies WHERE id = ?').run(replyId);
  return true;
}

function sqliteCreateModerationReport(data: {
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

function sqliteGetAllModerationReports(status?: string): DbModerationReport[] {
  if (status) {
    const stmt = db.prepare('SELECT * FROM moderation_reports WHERE status = ? ORDER BY created_at DESC');
    return stmt.all(status) as unknown as DbModerationReport[];
  }
  const stmt = db.prepare('SELECT * FROM moderation_reports ORDER BY created_at DESC');
  return stmt.all() as unknown as DbModerationReport[];
}

function sqliteResolveModerationReport(reportId: string, reviewedBy: string, status: 'RESOLVED' | 'DISMISSED', resolutionNotes?: string): boolean {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE moderation_reports
    SET status = ?, reviewed_by = ?, resolution_notes = ?, updated_at = ?
    WHERE id = ?
  `).run(status, reviewedBy, resolutionNotes || null, now, reportId);
  return true;
}

function sqliteCreateNotification(data: {
  userId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM' | 'FOLLOW';
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

  sqliteRecordCommunityEvent('NOTIFICATION_EVENT', {
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

function sqliteGetUserNotifications(userId: string, limit = 30): DbNotification[] {
  const stmt = db.prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?');
  return stmt.all(userId, limit) as unknown as DbNotification[];
}

function sqliteGetUnreadNotificationCount(userId: string): number {
  const stmt = db.prepare('SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0');
  const res = stmt.get(userId) as { count: number };
  return res?.count || 0;
}

function sqliteMarkNotificationRead(id: string, userId: string): boolean {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?').run(id, userId);
  return true;
}

function sqliteMarkAllNotificationsRead(userId: string): boolean {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(userId);
  return true;
}

function sqliteRecordCommunityEvent(eventType: string, payload: any, targetUserId?: string | null): DbCommunityEvent {
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

function sqliteGetCommunityEventsSince(sinceTimestamp: string, targetUserId?: string): DbCommunityEvent[] {
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

function sqliteEnsureInitialCommunities(): void {
  // Intentionally empty. Local schema initialization must not seed communities.
}

function sqliteGetAllCommunities(status?: string): DbCommunity[] {
  if (status) {
    const stmt = db.prepare('SELECT * FROM communities WHERE status = ? ORDER BY created_at DESC');
    return stmt.all(status) as unknown as DbCommunity[];
  }
  const stmt = db.prepare('SELECT * FROM communities ORDER BY created_at DESC');
  return stmt.all() as unknown as DbCommunity[];
}

function sqliteGetCommunityById(id: string): DbCommunity | null {
  const stmt = db.prepare('SELECT * FROM communities WHERE id = ?');
  return (stmt.get(id) as unknown as DbCommunity) || null;
}

function sqliteCreateCommunity(community: {
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING_APPROVAL', '', 1, 'Users', '', ?, ?, ?)
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

  return sqliteGetCommunityById(id)!;
}

function sqliteUpdateCommunityStatus(id: string, status: 'APPROVED' | 'REJECTED', reason?: string): DbCommunity | null {
  const now = new Date().toISOString();
  const update = db.prepare(`
    UPDATE communities 
    SET status = ?, rejection_reason = ?, updated_at = ?
    WHERE id = ?
  `);
  update.run(status, reason || '', now, id);
  return sqliteGetCommunityById(id);
}

function sqliteDeleteCommunity(id: string): boolean {
  const stmt = db.prepare('DELETE FROM communities WHERE id = ?');
  stmt.run(id);
  return true;
}

function sqliteGetAllMedia(): DbMediaItem[] {
  const stmt = db.prepare('SELECT * FROM media_items ORDER BY created_at DESC');
  return stmt.all() as unknown as DbMediaItem[];
}

function sqliteCreateMedia(item: {
  title: string;
  summary: string;
  video_url: string;
  thumbnail: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'SITE_AUDIT';
  duration?: string;
  author_name?: string;
}): string {
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

function sqliteDeleteMedia(id: string): boolean {
  const stmt = db.prepare('DELETE FROM media_items WHERE id = ?');
  stmt.run(id);
  return true;
}

function sqliteGetAllLeads(): DbBuyerLead[] {
  const stmt = db.prepare('SELECT * FROM buyer_leads ORDER BY created_at DESC');
  return stmt.all() as unknown as DbBuyerLead[];
}

function sqliteCreateLead(lead: {
  name: string;
  phone: string;
  email?: string;
  budget: string;
  property_type?: string;
  propertyType?: string;
  micro_market?: string;
  microMarket?: string;
  tier?: 'STANDARD' | 'PREMIUM' | 'HNI';
  price?: number;
  requirements?: string;
}): string {
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
    lead.property_type || lead.propertyType || 'Residential Plot / Villa',
    lead.micro_market || lead.microMarket || 'Western Corridor, Hyderabad',
    lead.tier || 'PREMIUM',
    Number(lead.price || 0),
    lead.requirements || '',
    now
  );
  return id;
}

function sqliteDeleteLead(id: string): boolean {
  const stmt = db.prepare('DELETE FROM buyer_leads WHERE id = ?');
  stmt.run(id);
  return true;
}

function sqliteGetConferenceDetails(): DbConferenceDetails {
  const stmt = db.prepare('SELECT * FROM conference_details LIMIT 1');
  const found = stmt.get() as unknown as DbConferenceDetails;
  if (found) return found;

  return {
    id: '',
    title: '',
    subtitle: '',
    date: '',
    time: '',
    stream_url: '',
    status: 'UNSCHEDULED',
    agenda: '[]',
    updated_at: new Date().toISOString()
  };
}

function sqliteUpdateConferenceDetails(details: {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  stream_url?: string;
  status: string;
  agenda?: string;
}): DbConferenceDetails | null {
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
  return sqliteGetConferenceDetails();
}
