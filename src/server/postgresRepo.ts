import crypto from 'node:crypto';
import type { PoolClient } from 'pg';
import { getPostgresPool, queryPostgres, ensurePostgresAdditiveSchema } from './postgres.ts';
import { OTP_RESEND_COOLDOWN_MS, OTP_TTL_MS, OtpCooldownError, generateOtpCode, sealOtp } from './otpCrypto.ts';
import { claimOtpProof, type OtpClaimRunner } from './otpClaim.ts';
import { canonicalOtpTarget } from './otpTarget.ts';
import { isUniqueEmailError, RegistrationRejected } from './registrationError.ts';
import { indianNationalDigits, normalizeIndianMobile } from '../shared/indianMobile.ts';
import { communitySearchLikePattern } from '../shared/communityEngagement.ts';
import type {
  UserRole,
  DbUser,
  DbSession,
  DbOtp,
  DbAuditLog,
  DbCommunity,
  DbCommunityPost,
  DbCommunityComment,
  DbNotification,
  DbCommunityEvent,
  DbCommunityReply,
  DbMediaItem,
  DbMediaComment,
  DbMediaEngagement,
  DbUserRepostItem,
  DbCommunityMember,
  DbCommunityPostRepost,
  DbUserDiscussionRepostItem,
  DbBuyerLead,
  DbConferenceDetails,
  DbModerationReport
} from './db.ts';
import {
  DEFAULT_MEDIA_ITEMS,
  hashPassword,
  verifyPassword,
  hashToken,
  canActorModifyRole,
  canActorDisableOrDeleteUser,
  canActorRestrictUser
} from './db.ts';

function toIso(val: any): string {
  if (!val) return '';
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function toNullableIso(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

function mapUserRow(row: any): DbUser {
  return {
    id: row.id,
    public_id: row.public_id || '',
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role as UserRole,
    avatar: row.avatar || '',
    organization: row.organization || '',
    town_city: row.town_city || null,
    profession: row.profession || null,
    company: row.company || null,
    interests: typeof row.interests === 'string' ? row.interests : (Array.isArray(row.interests) ? JSON.stringify(row.interests) : null),
    wallet_balance: Number(row.wallet_balance || 0),
    is_verified: Number(row.is_verified || 0),
    email_verified: Number(row.email_verified || 0),
    phone_verified: Number(row.phone_verified || 0),
    account_status: row.account_status,
    must_change_password: Number(row.must_change_password || 0),
    assigned_properties: typeof row.assigned_properties === 'string' ? row.assigned_properties : JSON.stringify(row.assigned_properties || []),
    password_hash: row.password_hash,
    salt: row.salt,
    last_login_at: toNullableIso(row.last_login_at),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at)
  };
}

// ==============================================================================
// POSTGRESQL USER REPOSITORY
// ==============================================================================

export async function pgFindUserByEmail(email: string): Promise<DbUser | null> {
  await ensurePostgresAdditiveSchema();
  if (!email) return null;
  const res = await queryPostgres(
    'SELECT * FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
    [email.trim().toLowerCase()]
  );
  if (res.rows.length === 0) return null;
  return mapUserRow(res.rows[0]);
}

export async function pgFindUserById(id: string): Promise<DbUser | null> {
  if (!id) return null;
  const res = await queryPostgres(
    'SELECT * FROM users WHERE id = $1 OR public_id = $2 LIMIT 1',
    [id, id]
  );
  if (res.rows.length === 0) return null;
  return mapUserRow(res.rows[0]);
}

export async function pgGetActiveDeveloperCount(): Promise<number> {
  const res = await queryPostgres(
    "SELECT COUNT(*) as count FROM users WHERE role = 'DEVELOPER' AND account_status = 'ACTIVE'"
  );
  return parseInt(res.rows[0]?.count || '0', 10);
}

export async function pgGetAllUsers(): Promise<Array<Omit<DbUser, 'password_hash' | 'salt'> & { postCount: number }>> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres(`
    SELECT u.id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.town_city, u.profession, u.company, u.interests, u.is_restricted, u.restricted_reason,
           u.wallet_balance, u.is_verified, u.email_verified, u.phone_verified, u.account_status,
           u.must_change_password, u.assigned_properties, u.last_login_at, u.created_at, u.updated_at,
           COUNT(p.id) as post_count
    FROM users u
    LEFT JOIN community_posts p ON u.id = p.author_id
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `);

  return res.rows.map((row: any) => ({
    id: row.id,
    public_id: row.public_id || '',
    name: row.name,
    email: row.email,
    phone: row.phone || '',
    role: row.role as UserRole,
    avatar: row.avatar || '',
    organization: row.organization || '',
    town_city: row.town_city || null,
    profession: row.profession || null,
    company: row.company || null,
    interests: typeof row.interests === 'string' ? row.interests : (Array.isArray(row.interests) ? JSON.stringify(row.interests) : null),
    is_restricted: Number(row.is_restricted || 0),
    restricted_reason: row.restricted_reason || null,
    wallet_balance: Number(row.wallet_balance || 0),
    is_verified: Number(row.is_verified || 0),
    email_verified: Number(row.email_verified || 0),
    phone_verified: Number(row.phone_verified || 0),
    account_status: row.account_status,
    must_change_password: Number(row.must_change_password || 0),
    assigned_properties: typeof row.assigned_properties === 'string' ? row.assigned_properties : JSON.stringify(row.assigned_properties || []),
    last_login_at: toNullableIso(row.last_login_at),
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    postCount: parseInt(row.post_count || '0', 10)
  }));
}

export async function pgCreateUser(data: {
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
  await ensurePostgresAdditiveSchema();
  const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const publicId = `usr_${crypto.randomBytes(4).toString('hex')}`;
  const normalizedEmail = data.email.trim().toLowerCase();
  const password = data.password || crypto.randomBytes(8).toString('hex');
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO users (
      id, public_id, name, email, phone, role, avatar, organization, town_city,
      wallet_balance, is_verified, email_verified, phone_verified,
      account_status, must_change_password, assigned_properties,
      password_hash, salt, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,$11,$12,'ACTIVE',0,'[]',$13,$14,$15,$16)
  `, [
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
  ]);

  const user = await pgFindUserById(id);
  if (!user) throw new Error('Failed to create user in PostgreSQL');
  return user;
}

export async function pgUpdateUser(id: string, updates: Partial<{
  name: string;
  phone: string;
  organization: string;
  avatar: string;
  wallet_balance: number;
  assigned_properties: string;
  email_verified: number;
  phone_verified: number;
}>): Promise<DbUser | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIdx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined) {
      fields.push(`${key} = $${paramIdx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0) return pgFindUserById(id);

  fields.push(`updated_at = $${paramIdx++}`);
  values.push(new Date().toISOString());
  values.push(id);

  const query = `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIdx}`;
  await queryPostgres(query, values);
  return pgFindUserById(id);
}

export async function pgUpdateProfileFields(
  id: string,
  fields: { townCity?: string | null; profession?: string | null; company?: string | null; avatar?: string | null; interests?: string[] | null }
): Promise<DbUser | null> {
  await ensurePostgresAdditiveSchema();
  const sets: string[] = [];
  const values: Array<any> = [];
  let paramIdx = 1;
  if (fields.townCity !== undefined) {
    sets.push(`town_city = $${paramIdx++}`);
    values.push(fields.townCity);
  }
  if (fields.profession !== undefined) {
    sets.push(`profession = $${paramIdx++}`);
    values.push(fields.profession);
  }
  if (fields.company !== undefined) {
    sets.push(`company = $${paramIdx++}`);
    values.push(fields.company);
  }
  if (fields.avatar !== undefined) {
    sets.push(`avatar = $${paramIdx++}`);
    values.push(fields.avatar);
  }
  if (fields.interests !== undefined) {
    sets.push(`interests = $${paramIdx++}`);
    values.push(fields.interests ? JSON.stringify(fields.interests) : null);
  }
  if (sets.length === 0) return pgFindUserById(id);
  sets.push(`updated_at = $${paramIdx++}`);
  values.push(new Date().toISOString());
  values.push(id);
  await queryPostgres(`UPDATE users SET ${sets.join(', ')} WHERE id = $${paramIdx}`, values);
  return pgFindUserById(id);
}

export async function pgProfessionsByUserId(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map();
  const res = await queryPostgres('SELECT id, profession FROM users WHERE id = ANY($1::varchar[])', [unique]);
  return new Map(res.rows.map((row: any) => [row.id, row.profession || '']));
}

export async function pgUpdateUserRole(
  actor: DbUser,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; user?: DbUser; error?: string }> {
  const targetUser = await pgFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'Target user not found' };

  const devCount = await pgGetActiveDeveloperCount();
  const authCheck = canActorModifyRole(actor.role, targetUser.role, newRole, actor.id === targetUser.id, devCount);

  if (!authCheck.allowed) {
    await pgCreateAuditLog({
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
  await queryPostgres('UPDATE users SET role = $1, updated_at = $2 WHERE id = $3', [newRole, now, targetUser.id]);

  await pgCreateAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: newRole === 'SUPER_ADMIN' ? 'GRANT_SUPER_ADMIN' : targetUser.role === 'SUPER_ADMIN' ? 'REVOKE_SUPER_ADMIN' : 'UPDATE_ROLE',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { previousRole: targetUser.role, newRole }
  });

  const updated = await pgFindUserById(targetUserId);
  return { success: true, user: updated! };
}

export async function pgDeleteUser(
  actor: DbUser | { role: UserRole; id: string; email: string },
  targetUserId: string
): Promise<{ success: boolean; error?: string }> {
  const targetUser = await pgFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = await pgGetActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) {
    await pgCreateAuditLog({
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

  await queryPostgres('DELETE FROM users WHERE id = $1', [targetUserId]);

  await pgCreateAuditLog({
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

export async function pgSuspendUser(actor: DbUser, targetUserId: string, suspend: boolean): Promise<{ success: boolean; error?: string }> {
  const targetUser = await pgFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const devCount = await pgGetActiveDeveloperCount();
  const check = canActorDisableOrDeleteUser(actor.role, targetUser.role, actor.id === targetUser.id, devCount);
  if (!check.allowed) return { success: false, error: check.reason };

  const newStatus = suspend ? 'SUSPENDED' : 'ACTIVE';
  await queryPostgres('UPDATE users SET account_status = $1, updated_at = $2 WHERE id = $3', [newStatus, new Date().toISOString(), targetUserId]);
  if (suspend) {
    await pgRevokeAllUserSessions(targetUserId);
  }

  await pgCreateAuditLog({
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

export async function pgRestrictUser(
  actor: DbUser | { role: UserRole; id: string; email: string },
  targetUserId: string,
  restrict: boolean,
  reason?: string
): Promise<{ success: boolean; error?: string; user?: DbUser }> {
  const targetUser = await pgFindUserById(targetUserId);
  if (!targetUser) return { success: false, error: 'User not found' };

  const check = canActorRestrictUser(actor.role, targetUser.role, actor.id === targetUser.id);
  if (!check.allowed) {
    await pgCreateAuditLog({
      actorId: actor.id,
      actorEmail: actor.email,
      actorRole: actor.role,
      action: 'USER_RESTRICTION_DENIED',
      targetId: targetUser.id,
      targetEmail: targetUser.email,
      details: { reason: check.reason },
      status: 'FAILED'
    });
    return { success: false, error: check.reason };
  }

  const isRestrictedVal = restrict ? 1 : 0;
  const restrictedReasonVal = restrict ? (reason?.trim() || 'Account restricted by administrator') : null;
  const newAccountStatus = restrict ? 'RESTRICTED' : 'ACTIVE';
  const now = new Date().toISOString();

  await queryPostgres(
    'UPDATE users SET is_restricted = $1, restricted_reason = $2, account_status = $3, updated_at = $4 WHERE id = $5',
    [isRestrictedVal, restrictedReasonVal, newAccountStatus, now, targetUserId]
  );

  await pgCreateAuditLog({
    actorId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action: restrict ? 'RESTRICT_USER' : 'UNRESTRICT_USER',
    targetId: targetUser.id,
    targetEmail: targetUser.email,
    details: { reason: restrictedReasonVal, isRestricted: isRestrictedVal }
  });

  const updatedUser = await pgFindUserById(targetUserId);
  return { success: true, user: updatedUser! };
}

export async function pgChangePassword(userId: string, currentPass: string, newPass: string): Promise<boolean> {
  const user = await pgFindUserById(userId);
  if (!user) return false;
  const isValid = verifyPassword(currentPass, user.password_hash, user.salt);
  if (!isValid) return false;

  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  await queryPostgres(
    'UPDATE users SET password_hash = $1, salt = $2, must_change_password = 0, updated_at = $3 WHERE id = $4',
    [hash, salt, now, userId]
  );
  await pgRevokeAllUserSessions(userId);

  await pgCreateAuditLog({
    actorId: user.id,
    actorEmail: user.email,
    actorRole: user.role,
    action: 'PASSWORD_CHANGED',
    targetId: user.id
  });

  return true;
}

export async function pgResetPassword(userId: string, newPass: string): Promise<boolean> {
  const { hash, salt } = hashPassword(newPass);
  const now = new Date().toISOString();
  await queryPostgres(
    'UPDATE users SET password_hash = $1, salt = $2, must_change_password = 0, updated_at = $3 WHERE id = $4',
    [hash, salt, now, userId]
  );
  await pgRevokeAllUserSessions(userId);
  return true;
}

export async function pgUpdateLastLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();
  await queryPostgres('UPDATE users SET last_login_at = $1 WHERE id = $2', [now, userId]);
}

// In-memory rate limiter for developer recovery attempts
const pgRecoveryAttempts: { count: number; lockedUntil: number } = { count: 0, lockedUntil: 0 };

export async function pgRecoverDeveloperAccount(recoverySecret: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  const now = Date.now();
  if (pgRecoveryAttempts.lockedUntil > now) {
    const remainingSeconds = Math.ceil((pgRecoveryAttempts.lockedUntil - now) / 1000);
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
    pgRecoveryAttempts.count += 1;
    if (pgRecoveryAttempts.count >= 3) {
      pgRecoveryAttempts.lockedUntil = now + 15 * 60 * 1000;
      pgRecoveryAttempts.count = 0;
    }
    await pgCreateAuditLog({
      actorId: 'anonymous_recovery_attempt',
      actorEmail: 'unknown',
      actorRole: 'SYSTEM',
      action: 'DEVELOPER_RECOVERY_FAILED_INVALID_KEY',
      status: 'FAILED',
      details: { attemptCount: pgRecoveryAttempts.count }
    });
    return { success: false, error: 'Invalid recovery authorization key.' };
  }

  pgRecoveryAttempts.count = 0;
  pgRecoveryAttempts.lockedUntil = 0;

  const devEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL?.trim().toLowerCase();
  if (!devEmail) {
    return { success: false, error: 'BOOTSTRAP_DEVELOPER_EMAIL is not configured. Recovery will not guess an account.' };
  }
  const devUser = await pgFindUserByEmail(devEmail);

  if (!devUser) {
    return { success: false, error: 'Developer account is not provisioned. Run npm run bootstrap. Recovery does not create accounts.' };
  }

  await pgResetPassword(devUser.id, newPassword);
  await queryPostgres("UPDATE users SET account_status = 'ACTIVE', updated_at = $1 WHERE id = $2", [new Date().toISOString(), devUser.id]);

  await pgCreateAuditLog({
    actorId: 'system_recovery',
    actorEmail: 'recovery@propertystudio.org',
    actorRole: 'SYSTEM',
    action: 'DEVELOPER_ACCOUNT_RECOVERED',
    targetId: devUser.id,
    targetEmail: devUser.email
  });

  return { success: true };
}

export async function pgBootstrapProductionAccounts(): Promise<void> {
  const now = new Date().toISOString();
  const devEmail = process.env.BOOTSTRAP_DEVELOPER_EMAIL?.trim().toLowerCase();
  const devPassword = process.env.BOOTSTRAP_DEVELOPER_PASSWORD;
  const adminEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
  if (!devEmail || !devPassword || !adminEmail || !adminPassword) {
    throw new Error('Bootstrap requires BOOTSTRAP_DEVELOPER_EMAIL, BOOTSTRAP_DEVELOPER_PASSWORD, BOOTSTRAP_SUPER_ADMIN_EMAIL, and BOOTSTRAP_SUPER_ADMIN_PASSWORD. Refusing to invent credentials.');
  }

  const existingDev = await pgFindUserByEmail(devEmail);

  if (!existingDev) {
    const { hash, salt } = hashPassword(devPassword);
    const devId = 'user_dev_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'dev_' + crypto.randomBytes(3).toString('hex');

    await queryPostgres(`
      INSERT INTO users (
        id, public_id, name, email, phone, role, avatar, organization,
        wallet_balance, is_verified, email_verified, phone_verified,
        account_status, must_change_password, assigned_properties,
        password_hash, salt, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,'DEVELOPER',$6,$7,0,1,1,1,'ACTIVE',0,'[]',$8,$9,$10,$11)
      ON CONFLICT (email) DO NOTHING
    `, [
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
    ]);

    await pgCreateAuditLog({
      actorId: 'system',
      actorEmail: 'system@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_DEVELOPER_CREATED',
      targetId: devId,
      targetEmail: devEmail,
      details: { role: 'DEVELOPER' }
    });
  }

  const existingAdmin = await pgFindUserByEmail(adminEmail);

  if (!existingAdmin) {
    const { hash, salt } = hashPassword(adminPassword);
    const adminId = 'user_admin_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'admin_' + crypto.randomBytes(3).toString('hex');

    await queryPostgres(`
      INSERT INTO users (
        id, public_id, name, email, phone, role, avatar, organization,
        wallet_balance, is_verified, email_verified, phone_verified,
        account_status, must_change_password, assigned_properties,
        password_hash, salt, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,'SUPER_ADMIN',$6,$7,0,1,1,1,'ACTIVE',0,'[]',$8,$9,$10,$11)
      ON CONFLICT (email) DO NOTHING
    `, [
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
    ]);

    await pgCreateAuditLog({
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

// ==============================================================================
// SESSIONS MANAGEMENT (POSTGRESQL)
// ==============================================================================

export async function pgCreateSession(
  userId: string,
  userAgent?: string,
  ipAddress?: string
): Promise<{ token: string; session: DbSession }> {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const now = new Date().toISOString();
  const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000;
  const safeAgent = typeof userAgent === 'string' ? userAgent.slice(0, 500) : null;
  const safeIp = typeof ipAddress === 'string' ? ipAddress.slice(0, 128) : null;

  await queryPostgres(`
    INSERT INTO sessions (id, user_id, expires_at, is_revoked, user_agent, ip_address, created_at)
    VALUES ($1, $2, $3, 0, $4, $5, $6)
  `, [tokenHash, userId, expiresAt, safeAgent, safeIp, now]);

  const session: DbSession = {
    id: tokenHash,
    user_id: userId,
    expires_at: expiresAt,
    is_revoked: 0,
    user_agent: safeAgent || undefined,
    ip_address: safeIp || undefined,
    created_at: now
  };

  return { token: rawToken, session };
}

export async function pgGetSession(rawToken: string): Promise<(DbSession & { user: DbUser }) | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  const res = await queryPostgres(`
    SELECT s.*, u.id as u_id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
           u.town_city, u.profession, u.company, u.interests, u.is_restricted, u.restricted_reason,
           u.wallet_balance, u.is_verified, u.email_verified, u.phone_verified, u.account_status,
           u.must_change_password, u.assigned_properties, u.created_at as u_created_at, u.updated_at as u_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = $1 AND s.is_revoked = 0
  `, [tokenHash]);

  if (res.rows.length === 0) return null;
  const row = res.rows[0];

  const expiresAtNum = Number(row.expires_at);
  if (Date.now() > expiresAtNum) {
    await pgRevokeSession(rawToken);
    return null;
  }

  if (row.account_status === 'DISABLED' || row.account_status === 'SUSPENDED') {
    return null;
  }

  return {
    id: row.id,
    user_id: row.user_id,
    expires_at: expiresAtNum,
    is_revoked: Number(row.is_revoked || 0),
    user_agent: row.user_agent,
    ip_address: row.ip_address,
    created_at: toIso(row.created_at),
    user: {
      id: row.u_id,
      public_id: row.public_id || '',
      name: row.name,
      email: row.email,
      phone: row.phone || '',
      role: row.role,
      avatar: row.avatar || '',
      organization: row.organization || '',
      town_city: row.town_city || null,
      profession: row.profession || null,
      company: row.company || null,
      interests: typeof row.interests === 'string' ? row.interests : (Array.isArray(row.interests) ? JSON.stringify(row.interests) : null),
      is_restricted: Number(row.is_restricted || 0),
      restricted_reason: row.restricted_reason || null,
      wallet_balance: Number(row.wallet_balance || 0),
      is_verified: Number(row.is_verified || 0),
      email_verified: Number(row.email_verified || 0),
      phone_verified: Number(row.phone_verified || 0),
      account_status: row.account_status,
      must_change_password: Number(row.must_change_password || 0),
      assigned_properties: typeof row.assigned_properties === 'string' ? row.assigned_properties : JSON.stringify(row.assigned_properties || []),
      password_hash: '',
      salt: '',
      last_login_at: null,
      created_at: toIso(row.u_created_at),
      updated_at: toIso(row.u_updated_at)
    }
  };
}

export async function pgRevokeSession(rawToken: string): Promise<boolean> {
  const tokenHash = hashToken(rawToken);
  await queryPostgres('UPDATE sessions SET is_revoked = 1 WHERE id = $1', [tokenHash]);
  return true;
}

export async function pgRevokeAllUserSessions(userId: string): Promise<boolean> {
  await queryPostgres('UPDATE sessions SET is_revoked = 1 WHERE user_id = $1', [userId]);
  return true;
}

// ==============================================================================
// OTP VERIFICATION (POSTGRESQL)
// ==============================================================================

export async function pgDiscardUnconsumedOtp(target: string, type: string): Promise<void> {
  await queryPostgres('DELETE FROM otps WHERE target = $1 AND type = $2 AND consumed_at IS NULL', [canonicalOtpTarget(type, target), type]);
}

function pgRunner(client: PoolClient): OtpClaimRunner {
  return {
    async query(sql: string, params: unknown[]) {
      const result = await client.query(sql, params as never[]);
      return { rows: result.rows, changes: result.rowCount ?? 0 };
    }
  };
}

async function withPgTransaction<T>(lockKeys: string[], fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = getPostgresPool();
  if (!pool) throw new Error('PostgreSQL connection unavailable: DATABASE_URL is not configured.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const lockKey of [...lockKeys].sort()) {
      await client.query(`SELECT pg_advisory_xact_lock(('x' || substr(md5($1), 1, 16))::bit(64)::bigint)`, [lockKey]);
    }
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // The connection is already unusable. The thrown error is the original failure.
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function pgGenerateOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE' | string
): Promise<{ otp: string; expiresAt: number }> {
  const normalizedTarget = canonicalOtpTarget(type, target);
  return withPgTransaction([`otp:${type}:${normalizedTarget}`], async (client) => {
    const recentRes = await client.query(`
      SELECT created_at FROM otps
      WHERE target = $1 AND type = $2 AND consumed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
      FOR UPDATE
    `, [normalizedTarget, type]);

    if (recentRes.rows.length > 0) {
      const elapsed = Date.now() - new Date(recentRes.rows[0].created_at).getTime();
      if (elapsed < OTP_RESEND_COOLDOWN_MS) {
        const waitSeconds = Math.ceil((OTP_RESEND_COOLDOWN_MS - elapsed) / 1000);
        throw new OtpCooldownError(waitSeconds);
      }
    }

    const otp = generateOtpCode();
    const expiresAt = Date.now() + OTP_TTL_MS;
    const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date().toISOString();
    await client.query('DELETE FROM otps WHERE target = $1 AND type = $2 AND consumed_at IS NULL', [normalizedTarget, type]);
    await client.query(`
      INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at)
      VALUES ($1, $2, $3, $4, NULL, $5, 0, 0, NULL, $6)
    `, [id, normalizedTarget, type, sealOtp(otp), expiresAt, now]);
    return { otp, expiresAt };
  });
}

export async function pgVerifyOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET' | 'PASSWORD_CHANGE' | string,
  code: string
): Promise<boolean> {
  const normalizedTarget = canonicalOtpTarget(type, target);
  return withPgTransaction([`otp:${type}:${normalizedTarget}`], (client) => (
    claimOtpProof(pgRunner(client), 'pg', normalizedTarget, type, code)
  ));
}

/** Consumed OTP rows are not registration authorization. Claims are single-use. */
export async function pgIsTargetVerified(
  _target: string,
  _type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<boolean> {
  return false;
}

export async function pgRegisterVerifiedUser(data: {
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
  await ensurePostgresAdditiveSchema();
  const email = data.email.trim().toLowerCase();
  const phone = data.requirePhone
    ? canonicalOtpTarget('PHONE_VERIFICATION', data.phone || '')
    : (data.phone?.trim() ? (normalizeIndianMobile(data.phone) || data.phone.trim()) : '');
  const locks = [`otp:EMAIL_VERIFICATION:${email}`, `otp:REGISTRATION_GRANT:${email}`];
  if (data.requirePhone) {
    locks.push(`otp:PHONE_VERIFICATION:${phone}`, `otp:PHONE_REGISTRATION_GRANT:${phone}`, `phone:${phone}`);
  }
  return withPgTransaction(locks, async (client) => {
    const runner = pgRunner(client);
    const emailOk = await claimOtpProof(runner, 'pg', email, 'EMAIL_VERIFICATION', data.otp, { issueGrant: false, allowGrantFallback: true });
    if (!emailOk) throw new RegistrationRejected(400, 'Invalid or expired email verification code');
    if (data.requirePhone) {
      const phoneOk = Boolean(data.phoneOtp) && await claimOtpProof(runner, 'pg', phone, 'PHONE_VERIFICATION', String(data.phoneOtp), { issueGrant: false, allowGrantFallback: true });
      if (!phoneOk) {
        throw new RegistrationRejected(400, 'Mobile number OTP verification is required for Property Seeker registration. Please verify your mobile phone.');
      }
      const national = indianNationalDigits(phone);
      const taken = await client.query(
        `SELECT id FROM users WHERE regexp_replace(COALESCE(phone, ''), '[^0-9]', '', 'g') IN ($1, $2, $3) LIMIT 1`,
        [national, `0${national}`, `91${national}`]
      );
      if (taken.rows.length > 0) {
        throw new RegistrationRejected(400, 'An account with this mobile number already exists');
      }
    }
    try {
      return await insertPgUser(client, {
        name: data.name,
        email,
        password: data.password,
        role: data.role,
        phone,
        organization: data.organization,
        townCity: data.townCity?.trim() || 'Hyderabad, Telangana, India',
        phoneVerified: data.requirePhone
      });
    } catch (error) {
      if (isUniqueEmailError(error)) throw new RegistrationRejected(400, 'An account with this email address already exists');
      throw error;
    }
  });
}

async function insertPgUser(client: PoolClient, data: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone: string;
  organization?: string;
  townCity?: string;
  phoneVerified: boolean;
}): Promise<DbUser> {
  const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const publicId = `usr_${crypto.randomBytes(4).toString('hex')}`;
  const { hash, salt } = hashPassword(data.password);
  const now = new Date().toISOString();
  const inserted = await client.query(`
    INSERT INTO users (
      id, public_id, name, email, phone, role, avatar, organization, town_city,
      wallet_balance, is_verified, email_verified, phone_verified,
      account_status, must_change_password, assigned_properties,
      password_hash, salt, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,1,1,$10,'ACTIVE',0,'[]',$11,$12,$13,$14)
    RETURNING *
  `, [
    id,
    publicId,
    data.name.trim(),
    data.email,
    data.phone,
    data.role,
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
    data.organization?.trim() || '',
    data.townCity?.trim() || 'Hyderabad, Telangana, India',
    data.phoneVerified ? 1 : 0,
    hash,
    salt,
    now,
    now
  ]);
  return mapUserRow(inserted.rows[0]);
}

// ==============================================================================
// IMMUTABLE AUDIT LOGGING (POSTGRESQL)
// ==============================================================================

export async function pgCreateAuditLog(entry: {
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
  const id = `audit_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const detailsStr = typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details || {});

  await queryPostgres(`
    INSERT INTO audit_logs (id, actor_id, actor_email, actor_role, action, target_id, target_email, details, ip_address, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
  `, [
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
  ]);

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

export async function pgGetAuditLogs(limit = 50, offset = 0, filterAction?: string): Promise<DbAuditLog[]> {
  let query = 'SELECT * FROM audit_logs';
  const params: any[] = [];

  if (filterAction) {
    query += ' WHERE action = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3';
    params.push(filterAction, limit, offset);
  } else {
    query += ' ORDER BY created_at DESC LIMIT $1 OFFSET $2';
    params.push(limit, offset);
  }

  const res = await queryPostgres(query, params);
  return res.rows.map((r: any) => ({
    id: r.id,
    actor_id: r.actor_id,
    actor_email: r.actor_email,
    actor_role: r.actor_role,
    action: r.action,
    target_id: r.target_id,
    target_email: r.target_email,
    details: r.details,
    ip_address: r.ip_address,
    status: r.status,
    created_at: toIso(r.created_at)
  }));
}

// ==============================================================================
// COMMUNITY POSTS, LIKES & MEDIA (POSTGRESQL)
// ==============================================================================

export async function pgCommunityEngagement(ids: string[], userId?: string): Promise<Map<string, {
  agreeCount: number;
  disagreeCount: number;
  userVote: 1 | -1 | 0;
  followerCount: number;
  following: boolean;
  bookmarked: boolean;
  bookmarkCount: number;
  repostsCount?: number;
  hasReposted?: boolean;
}>> {
  const result = new Map<string, {
    agreeCount: number;
    disagreeCount: number;
    userVote: 1 | -1 | 0;
    followerCount: number;
    following: boolean;
    bookmarked: boolean;
    bookmarkCount: number;
    repostsCount?: number;
    hasReposted?: boolean;
  }>();
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return result;
  const blank = () => ({ agreeCount: 0, disagreeCount: 0, userVote: 0 as const, followerCount: 0, following: false, bookmarked: false, bookmarkCount: 0, repostsCount: 0, hasReposted: false });
  const votes = await queryPostgres(
    `SELECT post_id,
        SUM(CASE WHEN vote = 1 THEN 1 ELSE 0 END) AS agree_count,
        SUM(CASE WHEN vote = -1 THEN 1 ELSE 0 END) AS disagree_count
     FROM community_post_votes
     WHERE post_id = ANY($1::varchar[])
     GROUP BY post_id`,
    [unique]
  );
  const follows = await queryPostgres(
    `SELECT post_id, COUNT(*) AS follower_count
     FROM community_post_follows
     WHERE post_id = ANY($1::varchar[])
     GROUP BY post_id`,
    [unique]
  );
  const bookmarks = await queryPostgres(
    `SELECT post_id, COUNT(*) AS bookmark_count
     FROM community_bookmarks
     WHERE post_id = ANY($1::varchar[])
     GROUP BY post_id`,
    [unique]
  );
  const reposts = await queryPostgres(
    `SELECT post_id, COUNT(*) AS repost_count
     FROM community_post_reposts
     WHERE post_id = ANY($1::varchar[])
     GROUP BY post_id`,
    [unique]
  );
  for (const row of votes.rows) {
    const current = result.get(row.post_id) || blank();
    current.agreeCount = Number(row.agree_count || 0);
    current.disagreeCount = Number(row.disagree_count || 0);
    result.set(row.post_id, current);
  }
  for (const row of follows.rows) {
    const current = result.get(row.post_id) || blank();
    current.followerCount = Number(row.follower_count || 0);
    result.set(row.post_id, current);
  }
  for (const row of bookmarks.rows) {
    const current = result.get(row.post_id) || blank();
    current.bookmarkCount = Number(row.bookmark_count || 0);
    result.set(row.post_id, current);
  }
  for (const row of reposts.rows) {
    const current = result.get(row.post_id) || blank();
    current.repostsCount = Number(row.repost_count || 0);
    result.set(row.post_id, current);
  }
  if (userId) {
    const mine = await queryPostgres(
      'SELECT post_id, vote FROM community_post_votes WHERE user_id = $1 AND post_id = ANY($2::varchar[])',
      [userId, unique]
    );
    const followed = await queryPostgres(
      'SELECT post_id FROM community_post_follows WHERE user_id = $1 AND post_id = ANY($2::varchar[])',
      [userId, unique]
    );
    const bookmarked = await queryPostgres(
      'SELECT post_id FROM community_bookmarks WHERE user_id = $1 AND post_id = ANY($2::varchar[])',
      [userId, unique]
    );
    const reposted = await queryPostgres(
      'SELECT post_id FROM community_post_reposts WHERE user_id = $1 AND post_id = ANY($2::varchar[])',
      [userId, unique]
    );
    for (const row of mine.rows) {
      const current = result.get(row.post_id) || blank();
      current.userVote = Number(row.vote) === -1 ? -1 : 1;
      result.set(row.post_id, current);
    }
    for (const row of followed.rows) {
      const current = result.get(row.post_id) || blank();
      current.following = true;
      result.set(row.post_id, current);
    }
    for (const row of bookmarked.rows) {
      const current = result.get(row.post_id) || blank();
      current.bookmarked = true;
      result.set(row.post_id, current);
    }
    for (const row of reposted.rows) {
      const current = result.get(row.post_id) || blank();
      current.hasReposted = true;
      result.set(row.post_id, current);
    }
  }
  return result;
}

export async function pgCastCommunityVote(
  postId: string,
  userId: string,
  vote: 1 | -1 | 0
): Promise<{ agreeCount: number; disagreeCount: number; userVote: 1 | -1 | 0 } | null> {
  const post = await queryPostgres('SELECT id FROM community_posts WHERE id = $1', [postId]);
  if (post.rows.length === 0) return null;
  const existing = await queryPostgres(
    'SELECT vote FROM community_post_votes WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );
  const now = new Date().toISOString();
  if (vote === 0 || (existing.rows[0] && Number(existing.rows[0].vote) === vote)) {
    await queryPostgres('DELETE FROM community_post_votes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  } else if (existing.rows[0]) {
    await queryPostgres(
      'UPDATE community_post_votes SET vote = $3, updated_at = $4 WHERE post_id = $1 AND user_id = $2',
      [postId, userId, vote, now]
    );
  } else {
    const id = `vote_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(
      `INSERT INTO community_post_votes (id, post_id, user_id, vote, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (post_id, user_id) DO UPDATE SET vote = EXCLUDED.vote, updated_at = EXCLUDED.updated_at`,
      [id, postId, userId, vote, now, now]
    );
  }
  const row = (await pgCommunityEngagement([postId], userId)).get(postId);
  return {
    agreeCount: row?.agreeCount || 0,
    disagreeCount: row?.disagreeCount || 0,
    userVote: row?.userVote || 0
  };
}

export async function pgToggleCommunityFollow(
  postId: string,
  userId: string
): Promise<{ following: boolean; followerCount: number } | null> {
  const post = await queryPostgres('SELECT id FROM community_posts WHERE id = $1', [postId]);
  if (post.rows.length === 0) return null;
  const existing = await queryPostgres(
    'SELECT id FROM community_post_follows WHERE post_id = $1 AND user_id = $2',
    [postId, userId]
  );
  if (existing.rows[0]) {
    await queryPostgres('DELETE FROM community_post_follows WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  } else {
    const id = `follow_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(
      `INSERT INTO community_post_follows (id, post_id, user_id, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (post_id, user_id) DO NOTHING`,
      [id, postId, userId, new Date().toISOString()]
    );
  }
  const row = (await pgCommunityEngagement([postId], userId)).get(postId);
  return { following: Boolean(row?.following), followerCount: row?.followerCount || 0 };
}

export async function pgGetAllPosts(params?: {
  communityId?: string;
  topic?: string;
  mediaType?: string;
  q?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
  currentUserRole?: string;
  status?: string;
}): Promise<any[]> {
  let query = "SELECT p.* FROM community_posts p WHERE 1=1 AND p.status != 'DELETED'";
  const args: any[] = [];
  let paramIdx = 1;

  if (params?.status) {
    query += ` AND p.status = $${paramIdx++}`;
    args.push(params.status);
  } else if (params?.currentUserRole === 'SUPER_ADMIN' || params?.currentUserRole === 'DEVELOPER') {
    // Platform administrators see active & pending posts in general feed, excluding DELETED unless requested
    query += " AND p.status != 'DELETED'";
  } else if (params?.currentUserId) {
    query += ` AND ((p.status IN ('APPROVED', 'PUBLISHED', 'PENDING_DELETION')) OR (p.author_id = $${paramIdx++} AND p.status IN ('PENDING_APPROVAL', 'REJECTED', 'SUSPENDED', 'PENDING_DELETION')))`;
    args.push(params.currentUserId);
  } else {
    query += " AND p.status IN ('APPROVED', 'PUBLISHED', 'PENDING_DELETION')";
  }

  if (params?.communityId) {
    query += ` AND p.community_id = $${paramIdx++}`;
    args.push(params.communityId);
  }

  if (params?.topic && params.topic !== 'ALL') {
    query += ` AND p.topic = $${paramIdx++}`;
    args.push(params.topic);
  }

  if (params?.mediaType && params.mediaType !== 'ALL') {
    query += ` AND p.media_type = $${paramIdx++}`;
    args.push(params.mediaType);
  }

  if (params?.q) {
    const pattern = communitySearchLikePattern(params.q);
    query += ` AND (LOWER(p.title) LIKE $${paramIdx++} ESCAPE '\\' OR LOWER(p.content) LIKE $${paramIdx++} ESCAPE '\\')`;
    args.push(pattern, pattern);
  }

  query += ' ORDER BY p.is_pinned DESC, p.created_at DESC';

  if (params?.limit) {
    query += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    args.push(params.limit, params.offset || 0);
  }

  const res = await queryPostgres(query, args);
  const posts = res.rows;
  const userLikedPostIds = params?.currentUserId
    ? await pgGetUserLikedPostIds(params.currentUserId)
    : new Set<string>();

  return Promise.all(posts.map(async (p: any) => {
    let pollOptions = [];
    try { pollOptions = typeof p.poll_options === 'string' ? JSON.parse(p.poll_options || '[]') : (p.poll_options || []); } catch {}
    let pollVotes: Record<string, string> = {};
    try { pollVotes = typeof p.poll_votes === 'string' ? JSON.parse(p.poll_votes || '{}') : (p.poll_votes || {}); } catch {}
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
      links: typeof p.links === 'string' ? JSON.parse(p.links || '[]') : (p.links || []),
      attachments: typeof p.attachments === 'string' ? JSON.parse(p.attachments || '[]') : (p.attachments || []),
      mediaType: p.media_type || 'POST',
      mediaUrl: p.media_url,
      thumbnailUrl: p.thumbnail_url,
      duration: p.duration,
      status: p.status,
      upvotes: Number(p.upvotes || 0),
      userLiked: userLikedPostIds.has(p.id),
      commentsCount: Number(p.comments_count || 0),
      isPinned: Boolean(p.is_pinned),
      isFlagged: Boolean(p.is_flagged),
      postType: p.post_type || 'POST',
      visibility: p.visibility || 'PUBLIC',
      pollOptions,
      userVotedOptionId,
      amaHostName: p.ama_host_name || null,
      amaHostRole: p.ama_host_role || null,
      amaStatus: p.ama_status || null,
      amaStartTime: p.ama_start_time || null,
      amaEndTime: p.ama_end_time || null,
      replies: await pgGetRepliesForPost(p.id),
      rejectionReason: p.rejection_reason || null,
      deletionStatus: p.deletion_status || 'NONE',
      deletionReason: p.deletion_reason || null,
      deletionRequestedAt: toIso(p.deletion_requested_at),
      deletionRequestedBy: p.deletion_requested_by || null,
      deletionReviewedAt: toIso(p.deletion_reviewed_at),
      deletionReviewedBy: p.deletion_reviewed_by || null,
      deletionRejectionReason: p.deletion_rejection_reason || null,
      previousStatus: p.previous_status || null,
      createdAt: toIso(p.created_at),
      updatedAt: toIso(p.updated_at)
    };
  }));
}

export async function pgGetPostById(postId: string, currentUserId?: string): Promise<any> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return null;
  const p = res.rows[0];

  const userLiked = currentUserId ? await pgIsPostLikedByUser(postId, currentUserId) : false;

  let pollOptions = [];
  try { pollOptions = typeof p.poll_options === 'string' ? JSON.parse(p.poll_options || '[]') : (p.poll_options || []); } catch {}
  let pollVotes: Record<string, string> = {};
  try { pollVotes = typeof p.poll_votes === 'string' ? JSON.parse(p.poll_votes || '{}') : (p.poll_votes || {}); } catch {}
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
    links: typeof p.links === 'string' ? JSON.parse(p.links || '[]') : (p.links || []),
    attachments: typeof p.attachments === 'string' ? JSON.parse(p.attachments || '[]') : (p.attachments || []),
    mediaType: p.media_type || 'POST',
    mediaUrl: p.media_url,
    thumbnailUrl: p.thumbnail_url,
    duration: p.duration,
    status: p.status,
    upvotes: Number(p.upvotes || 0),
    userLiked,
    commentsCount: Number(p.comments_count || 0),
    isPinned: Boolean(p.is_pinned),
    isFlagged: Boolean(p.is_flagged),
    postType: p.post_type || 'POST',
    visibility: p.visibility || 'PUBLIC',
    pollOptions,
    userVotedOptionId,
    amaHostName: p.ama_host_name || null,
    amaHostRole: p.ama_host_role || null,
    amaStatus: p.ama_status || null,
    amaStartTime: p.ama_start_time || null,
    amaEndTime: p.ama_end_time || null,
    replies: await pgGetRepliesForPost(p.id),
    comments: await pgGetCommentsForPost(p.id, currentUserId),
    rejectionReason: p.rejection_reason || null,
    deletionStatus: p.deletion_status || 'NONE',
    deletionReason: p.deletion_reason || null,
    deletionRequestedAt: toIso(p.deletion_requested_at),
    deletionRequestedBy: p.deletion_requested_by || null,
    deletionReviewedAt: toIso(p.deletion_reviewed_at),
    deletionReviewedBy: p.deletion_reviewed_by || null,
    deletionRejectionReason: p.deletion_rejection_reason || null,
    previousStatus: p.previous_status || null,
    createdAt: toIso(p.created_at),
    updatedAt: toIso(p.updated_at)
  };
}

export async function pgCreatePost(post: {
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
  const id = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const linksStr = JSON.stringify(post.links || []);
  const attachmentsStr = JSON.stringify(post.attachments || []);
  const pollOptionsStr = post.pollOptions ? JSON.stringify(post.pollOptions) : null;
  const pollVotesStr = post.pollOptions ? JSON.stringify({}) : null;

  const initialStatus = (post.authorRole === 'SUPER_ADMIN' || post.authorRole === 'DEVELOPER')
    ? 'APPROVED'
    : 'PENDING_APPROVAL';

  await queryPostgres(`
    INSERT INTO community_posts (
      id, author_id, author_name, author_role, community_id, community_name,
      property_id, property_name, topic, title, content, links, attachments,
      media_type, media_url, thumbnail_url, duration, status, upvotes, comments_count,
      is_pinned, is_flagged, post_type, visibility, poll_options, poll_votes,
      ama_host_name, ama_host_role, ama_status, ama_start_time, ama_end_time,
      created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
      $14, $15, $16, $17, $18, 0, 0, 0, 0,
      $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29
    )
  `, [
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
    initialStatus,
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
  ]);

  await pgRecordCommunityEvent('POST_CREATED', {
    id,
    title: post.title,
    authorName: post.authorName,
    communityId: post.communityId,
    mediaType: post.mediaType || 'POST',
    status: initialStatus
  }, post.authorId || null);

  return pgGetPostById(id);
}

export async function pgUpdatePost(
  postId: string,
  authorId: string,
  updates: Partial<{ title: string; content: string; links: any[]; attachments: any[] }>,
  isElevated = false
): Promise<any> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return null;
  const post = res.rows[0];
  if (!isElevated && post.author_id !== authorId) return null;

  const now = new Date().toISOString();
  const title = updates.title || post.title;
  const content = updates.content || post.content;
  const links = updates.links ? JSON.stringify(updates.links) : post.links;
  const attachments = updates.attachments ? JSON.stringify(updates.attachments) : post.attachments;

  await queryPostgres(`
    UPDATE community_posts
    SET title = $1, content = $2, links = $3, attachments = $4, status = 'PENDING_APPROVAL', updated_at = $5
    WHERE id = $6
  `, [title, content, links, attachments, now, postId]);

  await pgRecordCommunityEvent('POST_UPDATED', {
    id: postId,
    title,
    status: 'PENDING_APPROVAL',
    authorId: post.author_id
  }, post.author_id || null);
  return pgGetPostById(postId);
}

export async function pgDeletePost(postId: string, actorId?: string, isElevated = false): Promise<boolean> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return false;
  const post = res.rows[0];
  if (actorId && !isElevated && post.author_id !== actorId) return false;

  const now = new Date().toISOString();
  await queryPostgres(
    `UPDATE community_posts 
     SET status = 'DELETED', 
         deletion_status = 'APPROVED', 
         deletion_reviewed_at = $1, 
         deletion_reviewed_by = $2, 
         updated_at = $1 
     WHERE id = $3`,
    [now, actorId || null, postId]
  );
  await pgRecordCommunityEvent('POST_DELETED', { id: postId, actorId });
  return true;
}

export async function pgRequestPostDeletion(
  postId: string,
  actorId: string,
  reason: string
): Promise<{ success: boolean; error?: string; post?: any }> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) {
    return { success: false, error: 'Post not found' };
  }
  const post = res.rows[0];
  if (post.author_id !== actorId) {
    return { success: false, error: 'Forbidden: Only the post author can request deletion.' };
  }
  if (post.status === 'DELETED') {
    return { success: false, error: 'Post is already deleted.' };
  }
  if (post.status === 'PENDING_DELETION' || post.deletion_status === 'PENDING') {
    return { success: false, error: 'A deletion request is already pending review for this post.' };
  }

  const now = new Date().toISOString();
  const prevStatus = post.status;
  await queryPostgres(
    `UPDATE community_posts 
     SET status = 'PENDING_DELETION',
         deletion_status = 'PENDING',
         deletion_reason = $1,
         deletion_requested_at = $2,
         deletion_requested_by = $3,
         previous_status = $4,
         updated_at = $2
     WHERE id = $5`,
    [reason.trim(), now, actorId, prevStatus, postId]
  );

  await pgRecordCommunityEvent('POST_DELETION_REQUESTED', {
    id: postId,
    authorId: post.author_id,
    reason: reason.trim()
  });

  const updated = await pgGetPostById(postId, actorId);
  return { success: true, post: updated };
}

export async function pgApprovePostDeletion(
  postId: string,
  reviewerId: string
): Promise<{ success: boolean; error?: string; post?: any }> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) {
    return { success: false, error: 'Post not found' };
  }
  const post = res.rows[0];
  const now = new Date().toISOString();

  await queryPostgres(
    `UPDATE community_posts 
     SET status = 'DELETED',
         deletion_status = 'APPROVED',
         deletion_reviewed_at = $1,
         deletion_reviewed_by = $2,
         updated_at = $1
     WHERE id = $3`,
    [now, reviewerId, postId]
  );

  await pgRecordCommunityEvent('POST_DELETION_APPROVED', {
    id: postId,
    authorId: post.author_id,
    reviewerId
  });
  await pgRecordCommunityEvent('POST_DELETED', { id: postId, reviewerId });

  const updated = await pgGetPostById(postId, reviewerId);
  return { success: true, post: updated };
}

export async function pgRejectPostDeletion(
  postId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<{ success: boolean; error?: string; post?: any }> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) {
    return { success: false, error: 'Post not found' };
  }
  const post = res.rows[0];
  const restoredStatus = post.previous_status || 'APPROVED';
  const now = new Date().toISOString();

  await queryPostgres(
    `UPDATE community_posts 
     SET status = $1,
         deletion_status = 'REJECTED',
         deletion_rejection_reason = $2,
         deletion_reviewed_at = $3,
         deletion_reviewed_by = $4,
         updated_at = $3
     WHERE id = $5`,
    [restoredStatus, rejectionReason.trim(), now, reviewerId, postId]
  );

  await pgRecordCommunityEvent('POST_DELETION_REJECTED', {
    id: postId,
    authorId: post.author_id,
    reviewerId,
    rejectionReason: rejectionReason.trim()
  });

  const updated = await pgGetPostById(postId, reviewerId);
  return { success: true, post: updated };
}

export async function pgGetPostDeletionRequests(): Promise<any[]> {
  const res = await queryPostgres(
    `SELECT * FROM community_posts 
     WHERE deletion_status = 'PENDING' OR status = 'PENDING_DELETION'
     ORDER BY deletion_requested_at DESC NULLS LAST, created_at DESC`
  );
  return Promise.all(res.rows.map(async (p: any) => ({
    id: p.id,
    authorId: p.author_id,
    authorName: p.author_name,
    authorRole: p.author_role,
    communityId: p.community_id,
    communityName: p.community_name,
    topic: p.topic,
    title: p.title,
    content: p.content,
    status: p.status,
    deletionStatus: p.deletion_status || 'NONE',
    deletionReason: p.deletion_reason || null,
    deletionRequestedAt: toIso(p.deletion_requested_at),
    deletionRequestedBy: p.deletion_requested_by || null,
    deletionReviewedAt: toIso(p.deletion_reviewed_at),
    deletionReviewedBy: p.deletion_reviewed_by || null,
    deletionRejectionReason: p.deletion_rejection_reason || null,
    previousStatus: p.previous_status || null,
    createdAt: toIso(p.created_at),
    updatedAt: toIso(p.updated_at)
  })));
}

export async function pgPinPost(postId: string, isPinned: boolean): Promise<boolean> {
  await queryPostgres('UPDATE community_posts SET is_pinned = $1, updated_at = $2 WHERE id = $3', [
    isPinned ? 1 : 0,
    new Date().toISOString(),
    postId
  ]);
  return true;
}

export async function pgUpvotePost(postId: string): Promise<number> {
  const res = await queryPostgres(
    'UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = $1 RETURNING upvotes',
    [postId]
  );
  return Number(res.rows[0]?.upvotes || 0);
}

export async function pgTogglePostLike(postId: string, userId: string): Promise<{ upvotes: number; liked: boolean }> {
  const check = await queryPostgres('SELECT id FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  let liked = false;

  if (check.rows.length > 0) {
    await queryPostgres('DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2', [postId, userId]);
    await queryPostgres('UPDATE community_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = $1', [postId]);
    liked = false;
  } else {
    const likeId = `plike_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(
      'INSERT INTO post_likes (id, post_id, user_id, created_at) VALUES ($1, $2, $3, $4)',
      [likeId, postId, userId, new Date().toISOString()]
    );
    await queryPostgres('UPDATE community_posts SET upvotes = upvotes + 1 WHERE id = $1', [postId]);
    liked = true;

    // Send notification
    const postRes = await queryPostgres('SELECT author_id, title FROM community_posts WHERE id = $1', [postId]);
    const user = await pgFindUserById(userId);
    if (postRes.rows.length > 0 && postRes.rows[0].author_id && postRes.rows[0].author_id !== userId && user) {
      await pgCreateNotification({
        userId: postRes.rows[0].author_id,
        actorId: userId,
        actorName: user.name,
        type: 'LIKE',
        title: 'New reaction on your post',
        message: `${user.name} liked your post "${postRes.rows[0].title.slice(0, 40)}..."`,
        linkUrl: `/community#${postId}`
      });
    }
  }

  const pRes = await queryPostgres('SELECT upvotes FROM community_posts WHERE id = $1', [postId]);
  const upvotes = Number(pRes.rows[0]?.upvotes || 0);

  await pgRecordCommunityEvent('LIKE_CHANGED', { postId, upvotes });
  return { upvotes, liked };
}

export async function pgIsPostLikedByUser(postId: string, userId: string): Promise<boolean> {
  const check = await queryPostgres('SELECT 1 FROM post_likes WHERE post_id = $1 AND user_id = $2 LIMIT 1', [postId, userId]);
  return check.rows.length > 0;
}

export async function pgGetUserLikedPostIds(userId: string): Promise<Set<string>> {
  const res = await queryPostgres('SELECT post_id FROM post_likes WHERE user_id = $1', [userId]);
  return new Set(res.rows.map((r: any) => r.post_id));
}

// ==============================================================================
// COMMENTS & NESTED REPLIES (POSTGRESQL)
// ==============================================================================

export async function pgGetCommentById(commentId: string): Promise<DbCommunityComment | null> {
  const res = await queryPostgres('SELECT * FROM community_comments WHERE id = $1', [commentId]);
  if (!res.rows[0]) return null;
  const c = res.rows[0];
  return {
    id: c.id,
    post_id: c.post_id,
    parent_id: c.parent_id,
    author_id: c.author_id,
    author_name: c.author_name,
    author_role: c.author_role,
    author_avatar: c.author_avatar || null,
    content: c.content,
    likes_count: Number(c.likes_count || 0),
    is_ama_answer: Number(c.is_ama_answer || 0),
    is_deleted: Number(c.is_deleted || 0),
    deleted_at: toIso(c.deleted_at),
    deleted_by: c.deleted_by || null,
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  };
}

export async function pgGetCommentsForPost(
  postId: string,
  currentUserId?: string,
  sortMode: 'best' | 'newest' | 'oldest' = 'best',
  page = 1,
  limit = 50
): Promise<any> {
  const res = await queryPostgres(
    'SELECT * FROM community_comments WHERE post_id = $1 ORDER BY created_at ASC',
    [postId]
  );
  const comments: DbCommunityComment[] = res.rows.map((c: any) => ({
    id: c.id,
    post_id: c.post_id,
    parent_id: c.parent_id,
    author_id: c.author_id,
    author_name: c.author_name,
    author_role: c.author_role,
    author_avatar: c.author_avatar || null,
    content: c.content,
    likes_count: Number(c.likes_count || 0),
    is_ama_answer: Number(c.is_ama_answer || 0),
    is_deleted: Number(c.is_deleted || 0),
    deleted_at: toIso(c.deleted_at),
    deleted_by: c.deleted_by || null,
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  }));

  const userLikedCommentIds = currentUserId ? await pgGetUserLikedCommentIds(currentUserId) : new Set<string>();

  const commentMap = new Map<string, any>();
  const rootComments: any[] = [];

  for (const c of comments) {
    const isDeleted = Boolean(c.is_deleted);
    const item = {
      id: c.id,
      postId: c.post_id,
      parentId: c.parent_id || null,
      authorId: c.author_id,
      authorName: isDeleted ? '[deleted]' : c.author_name,
      authorRole: c.author_role,
      authorAvatar: isDeleted ? null : (c.author_avatar || null),
      content: isDeleted ? '[This comment was deleted by the author]' : c.content,
      likesCount: isDeleted ? 0 : c.likes_count,
      userLiked: isDeleted ? false : userLikedCommentIds.has(c.id),
      isAmaAnswer: Boolean(c.is_ama_answer),
      isDeleted,
      deletedAt: c.deleted_at || null,
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

  // Sort child replies in each node chronologically
  for (const item of commentMap.values()) {
    item.replies.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  // Sort root comments
  if (sortMode === 'best') {
    rootComments.sort((a, b) => (b.likesCount - a.likesCount) || (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
  } else if (sortMode === 'newest') {
    rootComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sortMode === 'oldest') {
    rootComments.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }

  const totalRoots = rootComments.length;
  const totalComments = comments.length;
  const startIndex = Math.max(0, (page - 1) * limit);
  const paginatedRoots = limit > 0 ? rootComments.slice(startIndex, startIndex + limit) : rootComments;
  const hasMore = limit > 0 ? (startIndex + limit < totalRoots) : false;

  const result: any = paginatedRoots;
  result.comments = paginatedRoots;
  result.totalRoots = totalRoots;
  result.totalComments = totalComments;
  result.page = page;
  result.limit = limit;
  result.hasMore = hasMore;
  return result;
}

export async function pgCreateComment(data: {
  postId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  authorAvatar?: string | null;
  content: string;
  isAmaAnswer?: boolean;
}): Promise<any> {
  if (data.parentId) {
    const parent = await pgGetCommentById(data.parentId);
    if (!parent) {
      throw new Error('Parent comment not found');
    }
    if (parent.post_id !== data.postId) {
      throw new Error('Parent comment does not belong to this discussion');
    }
  }

  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO community_comments (id, post_id, parent_id, author_id, author_name, author_role, author_avatar, content, likes_count, is_ama_answer, is_deleted, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9, 0, $10, $11)
  `, [
    id,
    data.postId,
    data.parentId || null,
    data.authorId,
    data.authorName,
    data.authorRole,
    data.authorAvatar || null,
    data.content.trim(),
    data.isAmaAnswer ? 1 : 0,
    now,
    now
  ]);

  await queryPostgres('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1', [data.postId]);

  const postRes = await queryPostgres('SELECT author_id, title FROM community_posts WHERE id = $1', [data.postId]);
  if (postRes.rows.length > 0 && postRes.rows[0].author_id && postRes.rows[0].author_id !== data.authorId) {
    await pgCreateNotification({
      userId: postRes.rows[0].author_id,
      actorId: data.authorId,
      actorName: data.authorName,
      type: data.parentId ? 'REPLY' : 'COMMENT',
      title: data.parentId ? 'New reply in discussion' : 'New comment on your post',
      message: `${data.authorName}: "${data.content.slice(0, 60)}..."`,
      linkUrl: `/community#${data.postId}`
    });
  }

  await pgRecordCommunityEvent('COMMENT_CREATED', {
    id,
    postId: data.postId,
    parentId: data.parentId || null,
    authorName: data.authorName
  });

  return {
    id,
    postId: data.postId,
    parentId: data.parentId || null,
    authorId: data.authorId,
    authorName: data.authorName,
    authorRole: data.authorRole,
    authorAvatar: data.authorAvatar || null,
    content: data.content.trim(),
    likesCount: 0,
    isAmaAnswer: Boolean(data.isAmaAnswer),
    isDeleted: false,
    replies: [],
    createdAt: now,
    updatedAt: now
  };
}

export async function pgUpdateComment(commentId: string, actorId: string, content: string): Promise<any> {
  const c = await pgGetCommentById(commentId);
  if (!c) throw new Error('Comment not found');
  if (c.author_id !== actorId) throw new Error('Unauthorized to edit this comment');
  if (c.is_deleted) throw new Error('Cannot edit a deleted comment');
  const trimmed = content.trim();
  if (!trimmed) throw new Error('Comment content cannot be empty');

  const now = new Date().toISOString();
  await queryPostgres('UPDATE community_comments SET content = $1, updated_at = $2 WHERE id = $3', [trimmed, now, commentId]);

  await pgRecordCommunityEvent('COMMENT_UPDATED', {
    id: commentId,
    postId: c.post_id,
    content: trimmed
  });

  return {
    id: c.id,
    postId: c.post_id,
    parentId: c.parent_id || null,
    authorId: c.author_id,
    authorName: c.author_name,
    authorRole: c.author_role,
    authorAvatar: c.author_avatar || null,
    content: trimmed,
    likesCount: c.likes_count,
    isAmaAnswer: Boolean(c.is_ama_answer),
    isDeleted: false,
    createdAt: c.created_at,
    updatedAt: now
  };
}

export async function pgDeleteComment(commentId: string, actorId: string, isElevated = false): Promise<boolean> {
  const c = await pgGetCommentById(commentId);
  if (!c) return false;
  if (!isElevated && c.author_id !== actorId) return false;
  if (c.is_deleted) return true;

  const now = new Date().toISOString();
  const placeholder = (!isElevated || c.author_id === actorId)
    ? '[This comment was deleted by the author]'
    : '[This comment was removed by moderators]';

  // NEVER permanently delete from database - all deletions are soft-deletions preserving tree relationships & audit history
  await queryPostgres(`
    UPDATE community_comments 
    SET is_deleted = 1,
        original_content = COALESCE(original_content, content),
        content = $1,
        author_name = '[deleted]',
        author_avatar = NULL,
        deleted_at = $2,
        deleted_by = $3,
        updated_at = $2
    WHERE id = $4
  `, [placeholder, now, actorId, commentId]);

  await queryPostgres('UPDATE community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [c.post_id]);

  await pgRecordCommunityEvent('COMMENT_DELETED', { id: commentId, postId: c.post_id, isPlaceholder: true });
  return true;
}

export async function pgRestoreComment(commentId: string, actorId: string, isElevated = false): Promise<boolean> {
  const c = await pgGetCommentById(commentId);
  if (!c) return false;
  if (!isElevated && c.author_id !== actorId) return false;
  if (!c.is_deleted) return true;

  const now = new Date().toISOString();
  const authorRes = await queryPostgres('SELECT name FROM users WHERE id = $1', [c.author_id]);
  const authorName = authorRes.rows[0]?.name || 'Community Member';

  await queryPostgres(`
    UPDATE community_comments 
    SET is_deleted = 0,
        content = COALESCE(original_content, content),
        author_name = $1,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_at = $2
    WHERE id = $3
  `, [authorName, now, commentId]);

  await queryPostgres('UPDATE community_posts SET comments_count = comments_count + 1 WHERE id = $1', [c.post_id]);
  await pgRecordCommunityEvent('COMMENT_UPDATED', {
    id: commentId,
    postId: c.post_id,
    content: c.original_content || c.content
  });
  return true;
}

export async function pgToggleCommentLike(commentId: string, userId: string): Promise<{ likesCount: number; liked: boolean }> {
  const check = await queryPostgres('SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
  let liked = false;

  if (check.rows.length > 0) {
    await queryPostgres('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, userId]);
    await queryPostgres('UPDATE community_comments SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [commentId]);
    liked = false;
  } else {
    const likeId = `clike_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(
      'INSERT INTO comment_likes (id, comment_id, user_id, created_at) VALUES ($1, $2, $3, $4)',
      [likeId, commentId, userId, new Date().toISOString()]
    );
    await queryPostgres('UPDATE community_comments SET likes_count = likes_count + 1 WHERE id = $1', [commentId]);
    liked = true;
  }

  const cRes = await queryPostgres('SELECT likes_count FROM community_comments WHERE id = $1', [commentId]);
  return { likesCount: Number(cRes.rows[0]?.likes_count || 0), liked };
}

export async function pgGetUserLikedCommentIds(userId: string): Promise<Set<string>> {
  const res = await queryPostgres('SELECT comment_id FROM comment_likes WHERE user_id = $1', [userId]);
  return new Set(res.rows.map((r: any) => r.comment_id));
}

// Backward compatibility for community_replies table
export async function pgGetRepliesForPost(postId: string): Promise<DbCommunityReply[]> {
  const res = await queryPostgres('SELECT * FROM community_replies WHERE post_id = $1 ORDER BY created_at ASC', [postId]);
  return res.rows.map((r: any) => ({
    id: r.id,
    post_id: r.post_id,
    author_id: r.author_id,
    author_name: r.author_name,
    author_role: r.author_role,
    is_verified_builder: Number(r.is_verified_builder || 0),
    content: r.content,
    created_at: toIso(r.created_at)
  }));
}

export async function pgAddReply(reply: {
  postId: string;
  authorId?: string;
  authorName: string;
  authorRole: string;
  isVerifiedBuilder?: boolean;
  content: string;
}): Promise<any> {
  const id = `reply_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  await queryPostgres(`
    INSERT INTO community_replies (id, post_id, author_id, author_name, author_role, is_verified_builder, content, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    reply.postId,
    reply.authorId || null,
    reply.authorName,
    reply.authorRole,
    reply.isVerifiedBuilder ? 1 : 0,
    reply.content,
    now
  ]);
  return { id, ...reply, isVerifiedBuilderReply: Boolean(reply.isVerifiedBuilder), createdAt: now };
}

export async function pgDeleteReply(replyId: string): Promise<boolean> {
  await queryPostgres('DELETE FROM community_replies WHERE id = $1', [replyId]);
  return true;
}

// ==============================================================================
// MODERATION REPORTS (POSTGRESQL)
// ==============================================================================

export async function pgCreateModerationReport(data: {
  reporterId: string;
  reporterName: string;
  targetType: 'POST' | 'COMMENT';
  targetId: string;
  reason: string;
}): Promise<DbModerationReport> {
  const id = `mod_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO moderation_reports (id, reporter_id, reporter_name, target_type, target_id, reason, status, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', $7, $8)
  `, [id, data.reporterId, data.reporterName, data.targetType, data.targetId, data.reason.trim(), now, now]);

  if (data.targetType === 'POST') {
    await queryPostgres('UPDATE community_posts SET is_flagged = 1 WHERE id = $1', [data.targetId]);
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

export async function pgGetAllModerationReports(status?: string): Promise<DbModerationReport[]> {
  let query = 'SELECT * FROM moderation_reports';
  const params: any[] = [];
  if (status) {
    query += ' WHERE status = $1 ORDER BY created_at DESC';
    params.push(status);
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const res = await queryPostgres(query, params);
  return res.rows.map((r: any) => ({
    id: r.id,
    reporter_id: r.reporter_id,
    reporter_name: r.reporter_name,
    target_type: r.target_type,
    target_id: r.target_id,
    reason: r.reason,
    status: r.status,
    reviewed_by: r.reviewed_by,
    resolution_notes: r.resolution_notes,
    created_at: toIso(r.created_at),
    updated_at: toIso(r.updated_at)
  }));
}

export async function pgResolveModerationReport(
  reportId: string,
  reviewedBy: string,
  status: 'RESOLVED' | 'DISMISSED',
  resolutionNotes?: string
): Promise<boolean> {
  const now = new Date().toISOString();
  await queryPostgres(`
    UPDATE moderation_reports
    SET status = $1, reviewed_by = $2, resolution_notes = $3, updated_at = $4
    WHERE id = $5
  `, [status, reviewedBy, resolutionNotes || null, now, reportId]);
  return true;
}

// ==============================================================================
// NOTIFICATIONS (POSTGRESQL)
// ==============================================================================

export async function pgCreateNotification(data: {
  userId: string;
  actorId: string;
  actorName: string;
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM' | 'FOLLOW';
  title: string;
  message: string;
  linkUrl?: string;
}): Promise<DbNotification> {
  const id = `notif_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO notifications (id, user_id, actor_id, actor_name, type, title, message, link_url, is_read, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0, $9)
  `, [
    id,
    data.userId,
    data.actorId,
    data.actorName,
    data.type,
    data.title,
    data.message,
    data.linkUrl || null,
    now
  ]);

  await pgRecordCommunityEvent('NOTIFICATION_EVENT', {
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

export async function pgGetUserNotifications(userId: string, limit = 30): Promise<DbNotification[]> {
  const res = await queryPostgres(
    'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2',
    [userId, limit]
  );
  return res.rows.map((r: any) => ({
    id: r.id,
    user_id: r.user_id,
    actor_id: r.actor_id,
    actor_name: r.actor_name,
    type: r.type,
    title: r.title,
    message: r.message,
    link_url: r.link_url,
    is_read: Number(r.is_read || 0),
    created_at: toIso(r.created_at)
  }));
}

export async function pgGetUnreadNotificationCount(userId: string): Promise<number> {
  const res = await queryPostgres('SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = 0', [userId]);
  return parseInt(res.rows[0]?.count || '0', 10);
}

export async function pgMarkNotificationRead(id: string, userId: string): Promise<boolean> {
  await queryPostgres('UPDATE notifications SET is_read = 1 WHERE id = $1 AND user_id = $2', [id, userId]);
  return true;
}

export async function pgMarkAllNotificationsRead(userId: string): Promise<boolean> {
  await queryPostgres('UPDATE notifications SET is_read = 1 WHERE user_id = $1', [userId]);
  return true;
}

export async function pgGetSuperAdminUserIds(): Promise<string[]> {
  try {
    const res = await queryPostgres("SELECT id FROM users WHERE role = 'SUPER_ADMIN'");
    const ids = res.rows.map((r: any) => r.id);
    if (ids.length > 0) return ids;
  } catch (err) {
    console.warn('[Property Studio] Failed to query super admins from postgres:', err);
  }
  return [];
}

// ==============================================================================
// REAL-TIME COMMUNITY EVENT LOG (POSTGRESQL SSE PERSISTENCE)
// ==============================================================================

export async function pgRecordCommunityEvent(
  eventType: string,
  payload: any,
  targetUserId?: string | null
): Promise<DbCommunityEvent> {
  const id = `evt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const payloadStr = JSON.stringify(payload);

  await queryPostgres(`
    INSERT INTO community_events (id, event_type, payload, target_user_id, created_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [id, eventType, payloadStr, targetUserId || null, now]);

  return {
    id,
    event_type: eventType,
    payload: payloadStr,
    target_user_id: targetUserId || null,
    created_at: now
  };
}

export async function pgGetCommunityEventsSince(sinceTimestamp: string, targetUserId?: string): Promise<DbCommunityEvent[]> {
  if (targetUserId) {
    const res = await queryPostgres(`
      SELECT * FROM community_events 
      WHERE created_at > $1 AND (target_user_id IS NULL OR target_user_id = $2)
      ORDER BY created_at ASC
    `, [sinceTimestamp, targetUserId]);
    return res.rows.map((r: any) => ({
      id: r.id,
      event_type: r.event_type,
      payload: r.payload,
      target_user_id: r.target_user_id,
      created_at: toIso(r.created_at)
    }));
  }

  const res = await queryPostgres(`
    SELECT * FROM community_events 
    WHERE created_at > $1 AND target_user_id IS NULL
    ORDER BY created_at ASC
  `, [sinceTimestamp]);
  return res.rows.map((r: any) => ({
    id: r.id,
    event_type: r.event_type,
    payload: r.payload,
    target_user_id: r.target_user_id,
    created_at: toIso(r.created_at)
  }));
}

// ==============================================================================
// COMMUNITIES MANAGEMENT (POSTGRESQL)
// ==============================================================================

export async function pgEnsureInitialCommunities(): Promise<void> {
  // Intentionally empty. Schema initialization must not seed communities or statistics.
}

export async function pgGetAllCommunities(status?: string, currentUserId?: string): Promise<DbCommunity[]> {
  await ensurePostgresAdditiveSchema();
  let query = 'SELECT * FROM communities';
  const params: any[] = [];
  if (status) {
    query += ' WHERE status = $1 ORDER BY created_at DESC';
    params.push(status);
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const res = await queryPostgres(query, params);
  const rows = res.rows;
  if (!currentUserId || rows.length === 0) {
    return rows.map((c: any) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.category,
      location: c.location,
      created_by_id: c.created_by_id,
      created_by_name: c.created_by_name,
      status: c.status,
      rejection_reason: c.rejection_reason,
      member_count: Number(c.member_count || 1),
      icon: c.icon,
      banner_image: c.banner_image,
      rules: c.rules,
      visibility: c.visibility || 'PUBLIC',
      membership_status: c.created_by_id === currentUserId ? 'ACTIVE' : 'NONE',
      membership_role: c.created_by_id === currentUserId ? 'CREATOR' : undefined,
      created_at: toIso(c.created_at),
      updated_at: toIso(c.updated_at)
    }));
  }

  const ids = rows.map((r: any) => r.id);
  const memRes = await queryPostgres(
    'SELECT community_id, role, status FROM community_members WHERE user_id = $1 AND community_id = ANY($2::varchar[])',
    [currentUserId, ids]
  );
  const memMap = new Map(memRes.rows.map((m: any) => [m.community_id, m]));

  return rows.map((c: any) => {
    const mem = memMap.get(c.id);
    const isCreator = c.created_by_id === currentUserId;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description,
      category: c.category,
      location: c.location,
      created_by_id: c.created_by_id,
      created_by_name: c.created_by_name,
      status: c.status,
      rejection_reason: c.rejection_reason,
      member_count: Number(c.member_count || 1),
      icon: c.icon,
      banner_image: c.banner_image,
      rules: c.rules,
      visibility: c.visibility || 'PUBLIC',
      membership_status: mem?.status || (isCreator ? 'ACTIVE' : 'NONE'),
      membership_role: mem?.role || (isCreator ? 'CREATOR' : undefined),
      created_at: toIso(c.created_at),
      updated_at: toIso(c.updated_at)
    };
  });
}

export async function pgGetCommunityById(id: string, currentUserId?: string): Promise<DbCommunity | null> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres('SELECT * FROM communities WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const c = res.rows[0];

  let membership_status: 'NONE' | 'PENDING' | 'ACTIVE' | 'REJECTED' = 'NONE';
  let membership_role: 'CREATOR' | 'MODERATOR' | 'MEMBER' | undefined = undefined;

  if (currentUserId) {
    const memRes = await queryPostgres('SELECT role, status FROM community_members WHERE community_id = $1 AND user_id = $2', [id, currentUserId]);
    if (memRes.rows.length > 0) {
      membership_status = memRes.rows[0].status;
      membership_role = memRes.rows[0].role;
    } else if (c.created_by_id === currentUserId) {
      membership_status = 'ACTIVE';
      membership_role = 'CREATOR';
    }
  }

  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    category: c.category,
    location: c.location,
    created_by_id: c.created_by_id,
    created_by_name: c.created_by_name,
    status: c.status,
    rejection_reason: c.rejection_reason,
    member_count: Number(c.member_count || 1),
    icon: c.icon,
    banner_image: c.banner_image,
    rules: c.rules,
    visibility: c.visibility || 'PUBLIC',
    membership_status,
    membership_role,
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  };
}

export async function pgCreateCommunity(community: {
  name: string;
  description: string;
  category: string;
  location?: string;
  createdById?: string;
  createdByName?: string;
  icon?: string;
  bannerImage?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  rules?: string;
  status?: string;
}): Promise<DbCommunity> {
  await ensurePostgresAdditiveSchema();
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const slug = community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();
  const visibility = community.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC';
  const icon = community.icon?.trim() || 'Users';
  const bannerImage = community.bannerImage?.trim() || '';
  const initialStatus = community.status || 'PENDING_APPROVAL';

  await queryPostgres(`
    INSERT INTO communities (id, name, slug, description, category, location, created_by_id, created_by_name, status, rejection_reason, member_count, icon, banner_image, rules, visibility, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, '', 1, $10, $11, $12, $13, $14, $15)
  `, [
    id,
    community.name.trim(),
    slug,
    community.description.trim(),
    community.category.trim(),
    community.location?.trim() || 'Western Corridor, Hyderabad',
    community.createdById || 'user_guest',
    community.createdByName || 'Property Seeker',
    initialStatus,
    icon,
    bannerImage,
    community.rules?.trim() || 'Constructive civil discourse and RERA compliance verification.',
    visibility,
    now,
    now
  ]);

  if (community.createdById) {
    const memberId = `cm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    try {
      await queryPostgres(`
        INSERT INTO community_members (id, community_id, user_id, role, status, created_at, updated_at)
        VALUES ($1, $2, $3, 'CREATOR', 'ACTIVE', $4, $5)
        ON CONFLICT (community_id, user_id) DO NOTHING
      `, [memberId, id, community.createdById, now, now]);
    } catch {}
  }

  const created = await pgGetCommunityById(id, community.createdById);
  return created!;
}

export async function pgUpdateCommunity(id: string, updates: {
  name?: string;
  description?: string;
  category?: string;
  location?: string;
  icon?: string;
  bannerImage?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  rules?: string;
}): Promise<DbCommunity | null> {
  await ensurePostgresAdditiveSchema();
  const existing = await pgGetCommunityById(id);
  if (!existing) return null;
  const now = new Date().toISOString();

  const sets: string[] = ['updated_at = $1'];
  const values: any[] = [now];
  let paramIdx = 2;

  if (updates.name !== undefined) {
    sets.push(`name = $${paramIdx++}`);
    values.push(updates.name.trim());
  }
  if (updates.description !== undefined) {
    sets.push(`description = $${paramIdx++}`);
    values.push(updates.description.trim());
  }
  if (updates.category !== undefined) {
    sets.push(`category = $${paramIdx++}`);
    values.push(updates.category.trim());
  }
  if (updates.location !== undefined) {
    sets.push(`location = $${paramIdx++}`);
    values.push(updates.location.trim());
  }
  if (updates.icon !== undefined) {
    sets.push(`icon = $${paramIdx++}`);
    values.push(updates.icon.trim());
  }
  if (updates.bannerImage !== undefined) {
    sets.push(`banner_image = $${paramIdx++}`);
    values.push(updates.bannerImage.trim());
  }
  if (updates.visibility !== undefined) {
    sets.push(`visibility = $${paramIdx++}`);
    values.push(updates.visibility === 'PRIVATE' ? 'PRIVATE' : 'PUBLIC');
  }
  if (updates.rules !== undefined) {
    sets.push(`rules = $${paramIdx++}`);
    values.push(updates.rules.trim());
  }

  values.push(id);
  await queryPostgres(`UPDATE communities SET ${sets.join(', ')} WHERE id = $${paramIdx}`, values);
  return pgGetCommunityById(id);
}

export async function pgRecountCommunityMembers(communityId: string): Promise<void> {
  const countRes = await queryPostgres(
    "SELECT COUNT(*) as count FROM community_members WHERE community_id = $1 AND status = 'ACTIVE'",
    [communityId]
  );
  const count = Math.max(1, Number(countRes.rows[0]?.count || 1));
  await queryPostgres('UPDATE communities SET member_count = $1, updated_at = $2 WHERE id = $3', [count, new Date().toISOString(), communityId]);
}

export async function pgJoinCommunity(communityId: string, userId: string): Promise<{ status: 'ACTIVE' | 'PENDING'; message: string }> {
  await ensurePostgresAdditiveSchema();
  const comm = await pgGetCommunityById(communityId);
  if (!comm) throw new Error('Community not found');
  const now = new Date().toISOString();

  const existingRes = await queryPostgres('SELECT id, status, role FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
  const existing = existingRes.rows[0];
  if (existing) {
    if (existing.status === 'ACTIVE') {
      return { status: 'ACTIVE', message: 'You are already a member of this community.' };
    }
    if (existing.status === 'PENDING') {
      return { status: 'PENDING', message: 'Your membership request is pending approval.' };
    }
  }

  const isPrivate = comm.visibility === 'PRIVATE';
  const newStatus = isPrivate ? 'PENDING' : 'ACTIVE';
  const role = comm.created_by_id === userId ? 'CREATOR' : 'MEMBER';
  const memberId = existing?.id || `cm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  if (existing) {
    await queryPostgres('UPDATE community_members SET status = $1, role = $2, updated_at = $3 WHERE id = $4', [newStatus, role, now, memberId]);
  } else {
    await queryPostgres(`
      INSERT INTO community_members (id, community_id, user_id, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (community_id, user_id) DO UPDATE SET status = EXCLUDED.status, role = EXCLUDED.role, updated_at = EXCLUDED.updated_at
    `, [memberId, communityId, userId, role, newStatus, now, now]);
  }

  if (newStatus === 'ACTIVE' && (!existing || existing.status !== 'ACTIVE')) {
    await pgRecountCommunityMembers(communityId);
  }

  return {
    status: newStatus,
    message: isPrivate
      ? 'Membership request submitted! Community moderators will review your request.'
      : 'Joined community successfully!'
  };
}

export async function pgLeaveCommunity(communityId: string, userId: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const comm = await pgGetCommunityById(communityId);
  if (!comm) return false;
  if (comm.created_by_id === userId) {
    throw new Error('Community creator cannot leave their own community.');
  }
  await queryPostgres('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
  await pgRecountCommunityMembers(communityId);
  return true;
}

export async function pgGetCommunityMembership(communityId: string, userId: string): Promise<{ isMember: boolean; status?: 'ACTIVE' | 'PENDING' | 'REJECTED'; role?: 'CREATOR' | 'MODERATOR' | 'MEMBER' }> {
  await ensurePostgresAdditiveSchema();
  const comm = await pgGetCommunityById(communityId);
  if (comm?.created_by_id === userId) {
    return { isMember: true, status: 'ACTIVE', role: 'CREATOR' };
  }
  const res = await queryPostgres('SELECT role, status FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
  if (res.rows.length === 0) return { isMember: false };
  const row = res.rows[0];
  return {
    isMember: row.status === 'ACTIVE',
    status: row.status,
    role: row.role
  };
}

export async function pgListCommunityMembers(communityId: string, statusFilter?: string): Promise<DbCommunityMember[]> {
  await ensurePostgresAdditiveSchema();
  let query = `
    SELECT cm.id, cm.community_id, cm.user_id, cm.role, cm.status, cm.created_at, cm.updated_at,
           u.name as user_name, u.email as user_email, u.avatar as user_avatar, u.profession as user_profession, u.role as user_role
    FROM community_members cm
    JOIN users u ON cm.user_id = u.id
    WHERE cm.community_id = $1
  `;
  const params: any[] = [communityId];
  if (statusFilter) {
    query += ' AND cm.status = $2';
    params.push(statusFilter);
  }
  query += ' ORDER BY cm.created_at ASC';
  const res = await queryPostgres(query, params);
  return res.rows.map((r: any) => ({
    id: r.id,
    community_id: r.community_id,
    user_id: r.user_id,
    role: r.role,
    status: r.status,
    created_at: toIso(r.created_at),
    updated_at: toIso(r.updated_at),
    user_name: r.user_name,
    user_email: r.user_email,
    user_avatar: r.user_avatar,
    user_profession: r.user_profession,
    user_role: r.user_role
  }));
}

export async function pgUpdateCommunityMemberStatus(communityId: string, userId: string, newStatus: 'ACTIVE' | 'REJECTED'): Promise<DbCommunityMember | null> {
  await ensurePostgresAdditiveSchema();
  const now = new Date().toISOString();
  await queryPostgres('UPDATE community_members SET status = $1, updated_at = $2 WHERE community_id = $3 AND user_id = $4', [newStatus, now, communityId, userId]);
  await pgRecountCommunityMembers(communityId);
  const members = await pgListCommunityMembers(communityId);
  return members.find(m => m.user_id === userId) || null;
}

export async function pgUpdateCommunityMemberRole(communityId: string, userId: string, newRole: 'MODERATOR' | 'MEMBER'): Promise<DbCommunityMember | null> {
  await ensurePostgresAdditiveSchema();
  const now = new Date().toISOString();
  await queryPostgres('UPDATE community_members SET role = $1, updated_at = $2 WHERE community_id = $3 AND user_id = $4', [newRole, now, communityId, userId]);
  const members = await pgListCommunityMembers(communityId);
  return members.find(m => m.user_id === userId) || null;
}

export async function pgRemoveCommunityMember(communityId: string, userId: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres('DELETE FROM community_members WHERE community_id = $1 AND user_id = $2', [communityId, userId]);
  await pgRecountCommunityMembers(communityId);
  return true;
}

export async function pgGetUserJoinedCommunities(userId: string): Promise<DbCommunity[]> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres(`
    SELECT c.*, cm.role as membership_role, cm.status as membership_status
    FROM communities c
    JOIN community_members cm ON c.id = cm.community_id
    WHERE cm.user_id = $1 AND cm.status = 'ACTIVE'
    ORDER BY cm.created_at DESC
  `, [userId]);
  return res.rows.map((c: any) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    category: c.category,
    location: c.location,
    created_by_id: c.created_by_id,
    created_by_name: c.created_by_name,
    status: c.status,
    rejection_reason: c.rejection_reason,
    member_count: Number(c.member_count || 1),
    icon: c.icon,
    banner_image: c.banner_image,
    rules: c.rules,
    visibility: c.visibility || 'PUBLIC',
    membership_status: c.membership_status,
    membership_role: c.membership_role,
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  }));
}

export async function pgCanUserViewCommunityPosts(communityId: string, userId?: string, userRole?: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const comm = await pgGetCommunityById(communityId);
  if (!comm) return false;
  if (comm.visibility !== 'PRIVATE') return true;
  if (!userId) return false;
  if (userRole === 'SUPER_ADMIN' || userRole === 'DEVELOPER') return true;
  if (comm.created_by_id === userId) return true;
  const res = await queryPostgres("SELECT status FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = 'ACTIVE'", [communityId, userId]);
  return res.rows.length > 0;
}

export async function pgCanUserPostInCommunity(communityId: string, userId: string, userRole?: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const comm = await pgGetCommunityById(communityId);
  if (!comm) return false;
  if (userRole === 'SUPER_ADMIN' || userRole === 'DEVELOPER') return true;
  if (comm.created_by_id === userId) return true;
  if (comm.visibility !== 'PRIVATE') return true;
  const res = await queryPostgres("SELECT status FROM community_members WHERE community_id = $1 AND user_id = $2 AND status = 'ACTIVE'", [communityId, userId]);
  return res.rows.length > 0;
}

export async function pgToggleDiscussionRepost(postId: string, userId: string, userName?: string, note?: string): Promise<{ reposted: boolean; count: number }> {
  await ensurePostgresAdditiveSchema();
  const postRes = await queryPostgres('SELECT id FROM community_posts WHERE id = $1', [postId]);
  if (postRes.rows.length === 0) throw new Error('Post not found');

  const existingRes = await queryPostgres('SELECT id FROM community_post_reposts WHERE post_id = $1 AND user_id = $2', [postId, userId]);
  let reposted = false;
  if (existingRes.rows.length > 0) {
    await queryPostgres('DELETE FROM community_post_reposts WHERE id = $1', [existingRes.rows[0].id]);
    reposted = false;
  } else {
    const id = `cprepost_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(`
      INSERT INTO community_post_reposts (id, post_id, user_id, user_name, note, created_at)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (post_id, user_id) DO NOTHING
    `, [id, postId, userId, userName || 'Community Member', note?.trim() || '', new Date().toISOString()]);
    reposted = true;
  }

  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM community_post_reposts WHERE post_id = $1', [postId]);
  return { reposted, count: Number(countRes.rows[0]?.count || 0) };
}

export async function pgGetUserDiscussionReposts(userId: string): Promise<DbUserDiscussionRepostItem[]> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres(`
    SELECT r.id as repost_id, r.post_id, r.note, r.created_at as reposted_at,
           p.title, p.content, p.topic, p.author_id, p.author_name, p.author_role,
           p.community_id, p.community_name, p.upvotes, p.comments_count
    FROM community_post_reposts r
    JOIN community_posts p ON r.post_id = p.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `, [userId]);

  return res.rows.map((r: any) => ({
    repostId: r.repost_id,
    postId: r.post_id,
    repostedAt: toIso(r.reposted_at),
    note: r.note || '',
    title: r.title,
    content: r.content,
    topic: r.topic,
    authorId: r.author_id,
    authorName: r.author_name,
    originalAuthorName: r.author_name,
    authorRole: r.author_role,
    originalAuthorRole: r.author_role,
    communityId: r.community_id,
    communityName: r.community_name,
    upvotes: Number(r.upvotes || 0),
    commentsCount: Number(r.comments_count || 0),
    shareUrl: `/?view=community&post=${encodeURIComponent(r.post_id)}`,
    shareLink: `/?view=community&post=${encodeURIComponent(r.post_id)}`
  }));
}

export async function pgUpdateCommunityStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string
): Promise<DbCommunity | null> {
  await ensurePostgresAdditiveSchema();
  const now = new Date().toISOString();
  await queryPostgres(`
    UPDATE communities 
    SET status = $1, rejection_reason = $2, updated_at = $3
    WHERE id = $4
  `, [status, reason || '', now, id]);
  return pgGetCommunityById(id);
}

export async function pgDeleteCommunity(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres('DELETE FROM communities WHERE id = $1', [id]);
  return true;
}

// ==============================================================================
// MEDIA, LEADS, CONFERENCE (POSTGRESQL)
// ==============================================================================

export interface DbStudioBroadcast {
  id: string;
  title: string;
  description: string;
  poster_url: string;
  scheduled_at: string;
  started_at?: string;
  ended_at?: string;
  status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'REPLAY_AVAILABLE' | 'ARCHIVED';
  stream_url?: string;
  replay_url?: string;
  ingest_url?: string;
  stream_key?: string;
  provider: string;
  viewer_count: number;
  recording_enabled: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

function mapPgMediaItem(m: any): DbMediaItem {
  return {
    id: m.id,
    title: m.title,
    summary: m.summary || '',
    video_url: m.video_url || '',
    thumbnail: m.thumbnail || '',
    type: m.type,
    duration: m.duration || '15:00',
    views: Number(m.views || 0),
    author_name: m.author_name || 'Swamy Reddy Javidi',
    created_at: toIso(m.created_at),
    status: m.status || 'PUBLISHED',
    category: m.category || 'Real Estate Intelligence',
    tags: m.tags || '[]',
    episode_title: m.episode_title || '',
    episode_number: m.episode_number || '',
    host: m.host || 'Swamy Reddy Javidi',
    guest: m.guest || '',
    guest_title: m.guest_title || '',
    published_date: m.published_date || '',
    audio_url: m.audio_url || '',
    media_url: m.media_url || '',
    file_size: Number(m.file_size || 0),
    mime_type: m.mime_type || '',
    storage_provider: m.storage_provider || 'PERSISTENT_STORAGE',
    storage_key: m.storage_key || '',
    author_id: m.author_id || '',
    updated_at: toIso(m.updated_at)
  };
}

function mapPgStudioBroadcast(b: any): DbStudioBroadcast {
  return {
    id: b.id,
    title: b.title,
    description: b.description || '',
    poster_url: b.poster_url || '',
    scheduled_at: toIso(b.scheduled_at),
    started_at: b.started_at ? toIso(b.started_at) : undefined,
    ended_at: b.ended_at ? toIso(b.ended_at) : undefined,
    status: b.status || 'SCHEDULED',
    stream_url: b.stream_url || '',
    replay_url: b.replay_url || '',
    ingest_url: b.ingest_url || '',
    stream_key: b.stream_key || '',
    provider: b.provider || 'CLOUDFLARE_STREAM',
    viewer_count: Number(b.viewer_count || 0),
    recording_enabled: Number(b.recording_enabled ?? 1),
    created_by: b.created_by || '',
    created_at: toIso(b.created_at),
    updated_at: toIso(b.updated_at)
  };
}

export async function pgGetAllMedia(params?: {
  type?: string;
  status?: string;
  category?: string;
  includeDrafts?: boolean;
}): Promise<DbMediaItem[]> {
  await ensurePostgresAdditiveSchema();
  let query = "SELECT * FROM media_items WHERE 1=1 AND id NOT IN ('media_01', 'media_02') AND status != 'DELETED'";
  const args: any[] = [];
  let idx = 1;

  if (!params?.includeDrafts) {
    query += " AND (status = 'PUBLISHED' OR status IS NULL OR status = '')";
  } else if (params?.status) {
    query += " AND status = $" + (idx++);
    args.push(params.status);
  }

  if (params?.type && params.type !== 'ALL') {
    query += " AND type = $" + (idx++);
    args.push(params.type);
  }

  if (params?.category) {
    query += " AND category = $" + (idx++);
    args.push(params.category);
  }

  query += ' ORDER BY created_at DESC';
  const res = await queryPostgres(query, args);

  if (res.rows.length === 0 && (!params || Object.keys(params).length === 0 || params.includeDrafts)) {
    for (const item of DEFAULT_MEDIA_ITEMS) {
      try {
        await queryPostgres(
          "INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PUBLISHED') ON CONFLICT (id) DO NOTHING",
          [item.id, item.title, item.summary, item.video_url, item.thumbnail, item.type, item.duration, item.views, item.author_name, item.created_at]
        );
      } catch {}
    }
    const fresh = await queryPostgres("SELECT * FROM media_items WHERE id NOT IN ('media_01', 'media_02') AND status != 'DELETED' ORDER BY created_at DESC");
    return fresh.rows.map(mapPgMediaItem);
  }

  return res.rows.map(mapPgMediaItem);
}

export async function pgGetMediaById(id: string): Promise<DbMediaItem | null> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres('SELECT * FROM media_items WHERE id = $1', [id]);
  if (res.rows.length === 0) {
    const fallback = DEFAULT_MEDIA_ITEMS.find(m => m.id === id);
    return fallback ? mapPgMediaItem(fallback) : null;
  }
  return mapPgMediaItem(res.rows[0]);
}

export async function pgCreateMedia(item: {
  title: string;
  summary: string;
  video_url?: string;
  thumbnail?: string;
  type: string;
  duration?: string;
  author_name?: string;
  status?: string;
  category?: string;
  tags?: string;
  episode_title?: string;
  episode_number?: string;
  host?: string;
  guest?: string;
  guest_title?: string;
  published_date?: string;
  audio_url?: string;
  media_url?: string;
  file_size?: number;
  mime_type?: string;
  storage_provider?: string;
  storage_key?: string;
  author_id?: string;
}): Promise<string> {
  await ensurePostgresAdditiveSchema();
  const id = "media_" + Date.now() + "_" + crypto.randomBytes(3).toString('hex');
  const now = new Date().toISOString();
  await queryPostgres(
    "INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at, status, category, tags, episode_title, episode_number, host, guest, guest_title, published_date, audio_url, media_url, file_size, mime_type, storage_provider, storage_key, author_id, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26)",
    [
      id,
      item.title,
      item.summary || '',
      item.video_url || item.media_url || '',
      item.thumbnail || '',
      item.type,
      item.duration || '15:00',
      item.author_name || 'Swamy Reddy Javidi',
      now,
      item.status || 'PUBLISHED',
      item.category || 'Real Estate Intelligence',
      item.tags || '[]',
      item.episode_title || '',
      item.episode_number || '',
      item.host || 'Swamy Reddy Javidi',
      item.guest || '',
      item.guest_title || '',
      item.published_date || '',
      item.audio_url || '',
      item.media_url || '',
      item.file_size || 0,
      item.mime_type || '',
      item.storage_provider || 'PERSISTENT_STORAGE',
      item.storage_key || '',
      item.author_id || '',
      now
    ]
  );
  return id;
}

export async function pgUpdateMedia(
  id: string,
  updates: Record<string, any>
): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const fields = [];
  const args = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined && key !== 'id') {
      fields.push(key + " = $" + (idx++));
      args.push(val);
    }
  }
  if (fields.length === 0) return true;
  fields.push("updated_at = NOW()");
  args.push(id);
  await queryPostgres("UPDATE media_items SET " + fields.join(', ') + " WHERE id = $" + idx, args);
  return true;
}

export async function pgDeleteMedia(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres('DELETE FROM media_items WHERE id = $1', [id]);
  return true;
}

export async function pgPublishMedia(id: string, published: boolean): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const status = published ? 'PUBLISHED' : 'DRAFT';
  await queryPostgres("UPDATE media_items SET status = $1, updated_at = NOW() WHERE id = $2", [status, id]);
  return true;
}

export async function pgArchiveMedia(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres("UPDATE media_items SET status = 'ARCHIVED', updated_at = NOW() WHERE id = $1", [id]);
  return true;
}

export async function pgCreateStudioBroadcast(item: {
  id?: string;
  title: string;
  description?: string;
  poster_url?: string;
  scheduled_at?: string;
  stream_url?: string;
  replay_url?: string;
  ingest_url?: string;
  stream_key?: string;
  provider?: string;
  created_by?: string;
}): Promise<string> {
  await ensurePostgresAdditiveSchema();
  const id = item.id || ("sb_" + Date.now() + "_" + crypto.randomBytes(3).toString('hex'));
  const scheduledAt = item.scheduled_at ? new Date(item.scheduled_at).toISOString() : new Date().toISOString();
  await queryPostgres(
    "INSERT INTO studio_broadcasts (id, title, description, poster_url, scheduled_at, status, stream_url, replay_url, ingest_url, stream_key, provider, viewer_count, recording_enabled, created_by, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, 'SCHEDULED', $6, $7, $8, $9, $10, 0, 1, $11, NOW(), NOW())",
    [
      id,
      item.title,
      item.description || '',
      item.poster_url || '',
      scheduledAt,
      item.stream_url || '',
      item.replay_url || '',
      item.ingest_url || '',
      item.stream_key || '',
      item.provider || 'CLOUDFLARE_STREAM',
      item.created_by || 'admin'
    ]
  );
  return id;
}

export async function pgGetStudioBroadcastById(id: string): Promise<DbStudioBroadcast | null> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres('SELECT * FROM studio_broadcasts WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  return mapPgStudioBroadcast(res.rows[0]);
}

export async function pgGetAllStudioBroadcasts(includeArchived = false): Promise<DbStudioBroadcast[]> {
  await ensurePostgresAdditiveSchema();
  const sql = includeArchived
    ? 'SELECT * FROM studio_broadcasts ORDER BY scheduled_at DESC'
    : "SELECT * FROM studio_broadcasts WHERE status != 'ARCHIVED' ORDER BY scheduled_at DESC";
  const res = await queryPostgres(sql);
  return res.rows.map(mapPgStudioBroadcast);
}

export async function pgUpdateStudioBroadcast(id: string, updates: Record<string, any>): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  const fields = [];
  const args = [];
  let idx = 1;

  for (const [key, val] of Object.entries(updates)) {
    if (val !== undefined && key !== 'id') {
      fields.push(key + " = $" + (idx++));
      args.push(key === 'scheduled_at' && val ? new Date(val).toISOString() : val);
    }
  }
  if (fields.length === 0) return true;
  fields.push("updated_at = NOW()");
  args.push(id);
  await queryPostgres("UPDATE studio_broadcasts SET " + fields.join(', ') + " WHERE id = $" + idx, args);
  return true;
}

export async function pgStartStudioBroadcast(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres("UPDATE studio_broadcasts SET status = 'LIVE', started_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
  return true;
}

export async function pgEndStudioBroadcast(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres("UPDATE studio_broadcasts SET status = 'ENDED', ended_at = NOW(), updated_at = NOW() WHERE id = $1", [id]);
  return true;
}

export async function pgPublishBroadcastReplay(id: string, replayUrl: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres("UPDATE studio_broadcasts SET status = 'REPLAY_AVAILABLE', replay_url = $1, updated_at = NOW() WHERE id = $2", [replayUrl, id]);
  return true;
}

export async function pgDeleteStudioBroadcast(id: string): Promise<boolean> {
  await ensurePostgresAdditiveSchema();
  await queryPostgres('DELETE FROM studio_broadcasts WHERE id = $1', [id]);
  return true;
}

export async function pgToggleMediaLike(mediaId: string, userId: string): Promise<{ liked: boolean; count: number }> {
  await ensurePostgresAdditiveSchema();
  const existingItem = await pgGetMediaById(mediaId);
  if (existingItem) {
    try {
      await queryPostgres(`
        INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [existingItem.id, existingItem.title, existingItem.summary, existingItem.video_url, existingItem.thumbnail, existingItem.type, existingItem.duration, existingItem.views, existingItem.author_name, existingItem.created_at]);
    } catch {}
  }

  const existing = await queryPostgres('SELECT id FROM media_likes WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
  let liked = false;
  if (existing.rows.length > 0) {
    await queryPostgres('DELETE FROM media_likes WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
    liked = false;
  } else {
    const id = `mlike_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(`
      INSERT INTO media_likes (id, media_id, user_id, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (media_id, user_id) DO NOTHING
    `, [id, mediaId, userId]);
    liked = true;
  }
  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM media_likes WHERE media_id = $1', [mediaId]);
  return { liked, count: Number(countRes.rows[0]?.count || 0) };
}

export async function pgSetMediaReaction(mediaId: string, userId: string, reactionType = 'THUMBS_UP'): Promise<{ reaction: string | null; count: number }> {
  await ensurePostgresAdditiveSchema();
  const existing = await queryPostgres('SELECT id, reaction_type FROM media_reactions WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
  let reaction: string | null = null;
  if (existing.rows.length > 0) {
    if (existing.rows[0].reaction_type === reactionType) {
      await queryPostgres('DELETE FROM media_reactions WHERE id = $1', [existing.rows[0].id]);
      reaction = null;
    } else {
      await queryPostgres('UPDATE media_reactions SET reaction_type = $1 WHERE id = $2', [reactionType, existing.rows[0].id]);
      reaction = reactionType;
    }
  } else {
    const id = `mreact_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(`
      INSERT INTO media_reactions (id, media_id, user_id, reaction_type, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (media_id, user_id) DO UPDATE SET reaction_type = EXCLUDED.reaction_type
    `, [id, mediaId, userId, reactionType]);
    reaction = reactionType;
  }
  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM media_reactions WHERE media_id = $1', [mediaId]);
  return { reaction, count: Number(countRes.rows[0]?.count || 0) };
}

export async function pgAddMediaComment(comment: {
  mediaId: string;
  userId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  text: string;
}): Promise<DbMediaComment> {
  await ensurePostgresAdditiveSchema();
  const id = `mcomm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  await queryPostgres(`
    INSERT INTO media_comments (id, media_id, user_id, author_name, author_role, author_avatar, text, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
  `, [
    id,
    comment.mediaId,
    comment.userId,
    comment.authorName,
    comment.authorRole || 'PROPERTY_SEEKER',
    comment.authorAvatar || '',
    comment.text,
    now
  ]);
  return {
    id,
    media_id: comment.mediaId,
    user_id: comment.userId,
    author_name: comment.authorName,
    author_role: comment.authorRole,
    author_avatar: comment.authorAvatar,
    text: comment.text,
    created_at: now
  };
}

export async function pgGetMediaComments(mediaId: string): Promise<DbMediaComment[]> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres('SELECT * FROM media_comments WHERE media_id = $1 ORDER BY created_at DESC', [mediaId]);
  return res.rows.map((c: any) => ({
    id: c.id,
    media_id: c.media_id,
    user_id: c.user_id,
    author_name: c.author_name,
    author_role: c.author_role,
    author_avatar: c.author_avatar,
    text: c.text,
    created_at: toIso(c.created_at)
  }));
}

export async function pgRecordMediaShare(mediaId: string, userId?: string, platform = 'DIRECT_LINK'): Promise<{ count: number }> {
  await ensurePostgresAdditiveSchema();
  const id = `mshare_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  await queryPostgres(`
    INSERT INTO media_shares (id, media_id, user_id, platform, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [id, mediaId, userId || null, platform]);
  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM media_shares WHERE media_id = $1', [mediaId]);
  return { count: Number(countRes.rows[0]?.count || 0) };
}

export async function pgToggleMediaRepost(
  mediaId: string,
  userId: string,
  userName?: string,
  note?: string
): Promise<{ reposted: boolean; count: number }> {
  await ensurePostgresAdditiveSchema();
  const existingItem = await pgGetMediaById(mediaId);
  if (existingItem) {
    try {
      await queryPostgres(`
        INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING
      `, [existingItem.id, existingItem.title, existingItem.summary, existingItem.video_url, existingItem.thumbnail, existingItem.type, existingItem.duration, existingItem.views, existingItem.author_name, existingItem.created_at]);
    } catch {}
  }

  const existing = await queryPostgres('SELECT id FROM media_reposts WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
  let reposted = false;
  if (existing.rows.length > 0) {
    await queryPostgres('DELETE FROM media_reposts WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
    reposted = false;
  } else {
    const id = `mrepost_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres(`
      INSERT INTO media_reposts (id, media_id, user_id, user_name, note, created_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (media_id, user_id) DO NOTHING
    `, [id, mediaId, userId, userName || '', note || '']);
    reposted = true;
  }
  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM media_reposts WHERE media_id = $1', [mediaId]);
  return { reposted, count: Number(countRes.rows[0]?.count || 0) };
}

export async function pgGetMediaEngagement(mediaId: string, userId?: string): Promise<DbMediaEngagement> {
  await ensurePostgresAdditiveSchema();
  const likesRes = await queryPostgres('SELECT COUNT(*) as count FROM media_likes WHERE media_id = $1', [mediaId]);
  const reactsRes = await queryPostgres('SELECT COUNT(*) as count FROM media_reactions WHERE media_id = $1', [mediaId]);
  const commsRes = await queryPostgres('SELECT COUNT(*) as count FROM media_comments WHERE media_id = $1', [mediaId]);
  const sharesRes = await queryPostgres('SELECT COUNT(*) as count FROM media_shares WHERE media_id = $1', [mediaId]);
  const repostsRes = await queryPostgres('SELECT COUNT(*) as count FROM media_reposts WHERE media_id = $1', [mediaId]);

  let hasLiked = false;
  let userReaction: string | null = null;
  let hasReposted = false;

  if (userId) {
    const likeCheck = await queryPostgres('SELECT id FROM media_likes WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
    hasLiked = likeCheck.rows.length > 0;
    const reactCheck = await queryPostgres('SELECT reaction_type FROM media_reactions WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
    userReaction = reactCheck.rows[0]?.reaction_type || null;
    const repostCheck = await queryPostgres('SELECT id FROM media_reposts WHERE media_id = $1 AND user_id = $2', [mediaId, userId]);
    hasReposted = repostCheck.rows.length > 0;
  }

  return {
    mediaId,
    likesCount: Number(likesRes.rows[0]?.count || 0),
    hasLiked,
    reactionsCount: Number(reactsRes.rows[0]?.count || 0),
    userReaction,
    commentsCount: Number(commsRes.rows[0]?.count || 0),
    sharesCount: Number(sharesRes.rows[0]?.count || 0),
    repostsCount: Number(repostsRes.rows[0]?.count || 0),
    hasReposted
  };
}

export async function pgGetUserReposts(userId: string): Promise<DbUserRepostItem[]> {
  await ensurePostgresAdditiveSchema();
  const res = await queryPostgres(`
    SELECT r.id as repost_id, r.media_id, r.note, r.created_at as reposted_at,
           m.title, m.summary, m.video_url, m.thumbnail, m.type, m.duration, m.views, m.author_name as original_creator
    FROM media_reposts r
    LEFT JOIN media_items m ON r.media_id = m.id
    WHERE r.user_id = $1
    ORDER BY r.created_at DESC
  `, [userId]);

  return res.rows.map((r: any) => {
    const fallback = DEFAULT_MEDIA_ITEMS.find(m => m.id === r.media_id);
    return {
      repostId: r.repost_id,
      mediaId: r.media_id,
      repostedAt: toIso(r.reposted_at),
      note: r.note || '',
      title: r.title || fallback?.title || 'Video Broadcast',
      summary: r.summary || fallback?.summary || '',
      videoUrl: r.video_url || fallback?.video_url || '',
      thumbnail: r.thumbnail || fallback?.thumbnail || '',
      type: r.type || fallback?.type || 'MASTERCLASS',
      duration: r.duration || fallback?.duration || '15:00',
      views: Number(r.views || fallback?.views || 0),
      originalCreator: r.original_creator || fallback?.author_name || 'Swamy Reddy Javidi'
    };
  });
}

export async function pgGetAllLeads(): Promise<DbBuyerLead[]> {
  const res = await queryPostgres('SELECT * FROM buyer_leads ORDER BY created_at DESC');
  return res.rows.map((l: any) => ({
    id: l.id,
    name: l.name,
    phone: l.phone,
    email: l.email,
    budget: l.budget,
    property_type: l.property_type,
    micro_market: l.micro_market,
    tier: l.tier,
    price: Number(l.price || 0),
    requirements: l.requirements,
    status: l.status,
    created_at: toIso(l.created_at)
  }));
}

export async function pgCreateLead(lead: {
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
}): Promise<string> {
  const id = `lead_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  await queryPostgres(`
    INSERT INTO buyer_leads (id, name, phone, email, budget, property_type, micro_market, tier, price, requirements, status, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'AVAILABLE', $11)
  `, [
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
  ]);
  return id;
}

export async function pgDeleteLead(id: string): Promise<boolean> {
  await queryPostgres('DELETE FROM buyer_leads WHERE id = $1', [id]);
  return true;
}

export async function pgGetConferenceDetails(): Promise<DbConferenceDetails> {
  const res = await queryPostgres('SELECT * FROM conference_details LIMIT 1');
  if (res.rows.length > 0) {
    const c = res.rows[0];
    return {
      id: c.id,
      title: c.title,
      subtitle: c.subtitle,
      date: c.date,
      time: c.time,
      stream_url: c.stream_url,
      status: c.status,
      agenda: typeof c.agenda === 'string' ? c.agenda : JSON.stringify(c.agenda || []),
      updated_at: toIso(c.updated_at)
    };
  }

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

export async function pgUpdateConferenceDetails(details: {
  title: string;
  subtitle: string;
  date: string;
  time: string;
  stream_url?: string;
  status: string;
  agenda?: string;
}): Promise<DbConferenceDetails | null> {
  const now = new Date().toISOString();
  const updateRes = await queryPostgres(`
    INSERT INTO conference_details (id, title, subtitle, date, time, stream_url, status, agenda, updated_at)
    VALUES ('conf_main', $1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      subtitle = EXCLUDED.subtitle,
      date = EXCLUDED.date,
      time = EXCLUDED.time,
      stream_url = EXCLUDED.stream_url,
      status = EXCLUDED.status,
      agenda = EXCLUDED.agenda,
      updated_at = EXCLUDED.updated_at
    RETURNING *
  `, [
    details.title,
    details.subtitle,
    details.date,
    details.time,
    details.stream_url || '',
    details.status,
    details.agenda || '[]',
    now
  ]);
  const c = updateRes.rows[0];
  return {
    id: c.id,
    title: c.title,
    subtitle: c.subtitle,
    date: c.date,
    time: c.time,
    stream_url: c.stream_url,
    status: c.status,
    agenda: typeof c.agenda === 'string' ? c.agenda : JSON.stringify(c.agenda || []),
    updated_at: toIso(c.updated_at)
  };
}

// ==============================================================================
// COMMUNITY EXTENSIONS: BOOKMARKS, USER FOLLOWS, POLLS, DUPLICATE CHECK, PROFILES
// ==============================================================================

export async function pgToggleBookmarkPost(userId: string, postId: string): Promise<{ bookmarked: boolean; bookmarkCount: number }> {
  const existing = await queryPostgres('SELECT id FROM community_bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
  if (existing.rows.length > 0) {
    await queryPostgres('DELETE FROM community_bookmarks WHERE user_id = $1 AND post_id = $2', [userId, postId]);
  } else {
    const id = `bkmk_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres('INSERT INTO community_bookmarks (id, user_id, post_id, created_at) VALUES ($1, $2, $3, $4)', [
      id, userId, postId, new Date().toISOString()
    ]);
  }
  const countRes = await queryPostgres('SELECT COUNT(*) as count FROM community_bookmarks WHERE post_id = $1', [postId]);
  return {
    bookmarked: existing.rows.length === 0,
    bookmarkCount: parseInt(countRes.rows[0]?.count || '0', 10)
  };
}

export async function pgGetUserBookmarkedPostIds(userId: string): Promise<string[]> {
  const res = await queryPostgres('SELECT post_id FROM community_bookmarks WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
  return res.rows.map((r: any) => r.post_id);
}

export async function pgToggleFollowUser(followerId: string, followingId: string): Promise<{ following: boolean; followerCount: number; followingCount: number }> {
  if (followerId === followingId) throw new Error('Cannot follow yourself');
  const existing = await queryPostgres('SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
  if (existing.rows.length > 0) {
    await queryPostgres('DELETE FROM user_follows WHERE follower_id = $1 AND following_id = $2', [followerId, followingId]);
  } else {
    const id = `ufol_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    await queryPostgres('INSERT INTO user_follows (id, follower_id, following_id, created_at) VALUES ($1, $2, $3, $4)', [
      id, followerId, followingId, new Date().toISOString()
    ]);
    const followerUser = await pgFindUserById(followerId);
    if (followerUser) {
      await pgCreateNotification({
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
  const followerRes = await queryPostgres('SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1', [followingId]);
  const followingRes = await queryPostgres('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1', [followerId]);
  return {
    following: existing.rows.length === 0,
    followerCount: parseInt(followerRes.rows[0]?.count || '0', 10),
    followingCount: parseInt(followingRes.rows[0]?.count || '0', 10)
  };
}

export async function pgGetUserFollowStats(userId: string, currentUserId?: string): Promise<{ followerCount: number; followingCount: number; isFollowing: boolean }> {
  const followerRes = await queryPostgres('SELECT COUNT(*) as count FROM user_follows WHERE following_id = $1', [userId]);
  const followingRes = await queryPostgres('SELECT COUNT(*) as count FROM user_follows WHERE follower_id = $1', [userId]);
  let isFollowing = false;
  if (currentUserId) {
    const check = await queryPostgres('SELECT id FROM user_follows WHERE follower_id = $1 AND following_id = $2', [currentUserId, userId]);
    isFollowing = check.rows.length > 0;
  }
  return {
    followerCount: parseInt(followerRes.rows[0]?.count || '0', 10),
    followingCount: parseInt(followingRes.rows[0]?.count || '0', 10),
    isFollowing
  };
}

export async function pgGetUserFollowedUserIds(followerId: string): Promise<string[]> {
  const res = await queryPostgres('SELECT following_id FROM user_follows WHERE follower_id = $1', [followerId]);
  return res.rows.map((r: any) => r.following_id);
}

export async function pgVoteCommunityPoll(
  postId: string,
  userId: string,
  optionId: string
): Promise<{ pollOptions: Array<{ id: string; text: string; votes: number }>; userVotedOptionId: string } | null> {
  const res = await queryPostgres('SELECT id, post_type, poll_options, poll_votes FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return null;
  const p = res.rows[0];
  let options: Array<{ id: string; text: string; votes?: number }> = [];
  try { options = typeof p.poll_options === 'string' ? JSON.parse(p.poll_options || '[]') : (p.poll_options || []); } catch {}
  let votes: Record<string, string> = {};
  try { votes = typeof p.poll_votes === 'string' ? JSON.parse(p.poll_votes || '{}') : (p.poll_votes || {}); } catch {}
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

  await queryPostgres('UPDATE community_posts SET poll_options = $1, poll_votes = $2, updated_at = $3 WHERE id = $4', [
    JSON.stringify(updatedOptions),
    JSON.stringify(votes),
    new Date().toISOString(),
    postId
  ]);

  return {
    pollOptions: updatedOptions as Array<{ id: string; text: string; votes: number }>,
    userVotedOptionId: optionId
  };
}

export async function pgCheckDuplicateQuestion(title: string): Promise<{ exists: boolean; matches: Array<{ id: string; title: string; upvotes: number }> }> {
  const clean = title.trim().toLowerCase().replace(/[^\w\s]/g, '');
  if (!clean || clean.length < 5) return { exists: false, matches: [] };
  const queryWords = clean.split(/\s+/).filter(w => w.length > 2);
  if (queryWords.length === 0) return { exists: false, matches: [] };

  const res = await queryPostgres(`
    SELECT id, title, upvotes FROM community_posts
    WHERE status IN ('APPROVED', 'PUBLISHED', 'PENDING_APPROVAL')
    ORDER BY id DESC LIMIT 100
  `);

  const candidates = res.rows.map((r: any) => ({
    id: r.id,
    title: r.title,
    upvotes: Number(r.upvotes || 0)
  }));

  const matchesWithScore: Array<{ id: string; title: string; upvotes: number; score: number }> = [];

  for (const c of candidates) {
    const cWords = new Set(c.title.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter((w: string) => w.length > 2));
    let matchCount = 0;
    for (const qw of queryWords) {
      if (cWords.has(qw) || Array.from(cWords).some(cw => (cw as string).includes(qw) || qw.includes(cw as string))) {
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

export async function pgGetUserPublicProfile(userId: string, currentUserId?: string): Promise<any | null> {
  const user = await pgFindUserById(userId);
  if (!user) return null;
  const followStats = await pgGetUserFollowStats(user.id, currentUserId);
  const posts = (await pgGetAllPosts({ currentUserId, limit: 10 })).filter(p => p.authorId === user.id);
  const postRes = await queryPostgres("SELECT COUNT(*) as count FROM community_posts WHERE author_id = $1 AND status IN ('APPROVED', 'PUBLISHED')", [user.id]);
  const commentRes = await queryPostgres("SELECT COUNT(*) as count FROM community_comments WHERE author_id = $1", [user.id]);

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
      totalPosts: parseInt(postRes.rows[0]?.count || '0', 10),
      totalAnswers: parseInt(commentRes.rows[0]?.count || '0', 10)
    },
    recentPosts: posts
  };
}

export async function pgGetActiveCommunityMemberIds(communityId: string): Promise<string[]> {
  const res = await queryPostgres("SELECT user_id FROM community_members WHERE community_id = $1 AND status = 'ACTIVE'", [communityId]);
  return res.rows.map(r => r.user_id);
}
