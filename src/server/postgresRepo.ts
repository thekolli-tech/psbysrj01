import crypto from 'node:crypto';
import { queryPostgres } from './postgres.ts';
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
  DbBuyerLead,
  DbConferenceDetails,
  DbModerationReport
} from './db.ts';
import {
  hashPassword,
  verifyPassword,
  hashToken,
  canActorModifyRole,
  canActorDisableOrDeleteUser
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
  const res = await queryPostgres(`
    SELECT u.id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
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
  password?: string;
  isVerified?: boolean;
}): Promise<DbUser> {
  const id = `user_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const publicId = `usr_${crypto.randomBytes(4).toString('hex')}`;
  const normalizedEmail = data.email.trim().toLowerCase();
  const password = data.password || crypto.randomBytes(8).toString('hex');
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO users (
      id, public_id, name, email, phone, role, avatar, organization,
      wallet_balance, is_verified, email_verified, phone_verified,
      account_status, must_change_password, assigned_properties,
      password_hash, salt, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,0,$9,$10,$11,'ACTIVE',0,'[]',$12,$13,$14,$15)
  `, [
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

  await queryPostgres(`
    INSERT INTO sessions (id, user_id, expires_at, is_revoked, user_agent, ip_address, created_at)
    VALUES ($1, $2, $3, 0, $4, $5, $6)
  `, [tokenHash, userId, expiresAt, userAgent || null, ipAddress || null, now]);

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

export async function pgGetSession(rawToken: string): Promise<(DbSession & { user: DbUser }) | null> {
  if (!rawToken) return null;
  const tokenHash = hashToken(rawToken);

  const res = await queryPostgres(`
    SELECT s.*, u.id as u_id, u.public_id, u.name, u.email, u.phone, u.role, u.avatar, u.organization,
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

export async function pgGenerateOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<{ otp: string; expiresAt: number }> {
  const normalizedTarget = target.trim().toLowerCase();

  const recentRes = await queryPostgres(`
    SELECT created_at FROM otps 
    WHERE target = $1 AND type = $2 AND consumed_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
  `, [normalizedTarget, type]);

  if (recentRes.rows.length > 0) {
    const elapsed = Date.now() - new Date(recentRes.rows[0].created_at).getTime();
    if (elapsed < 30 * 1000) {
      const waitSeconds = Math.ceil((30 * 1000 - elapsed) / 1000);
      throw new Error(`Please wait ${waitSeconds} seconds before requesting a new verification code.`);
    }
  }

  const randomBytes = crypto.randomBytes(3);
  const otpNumber = (randomBytes.readUIntBE(0, 3) % 900000) + 100000;
  const otp = otpNumber.toString();
  const expiresAt = Date.now() + 10 * 60 * 1000;
  const id = `otp_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const now = new Date().toISOString();
  const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

  await queryPostgres('DELETE FROM otps WHERE target = $1 AND type = $2 AND consumed_at IS NULL', [normalizedTarget, type]);

  await queryPostgres(`
    INSERT INTO otps (id, target, type, otp_hash, otp_raw, expires_at, attempt_count, is_verified, consumed_at, created_at)
    VALUES ($1, $2, $3, $4, NULL, $5, 0, 0, NULL, $6)
  `, [id, normalizedTarget, type, otpHash, expiresAt, now]);

  return { otp, expiresAt };
}

export async function pgVerifyOtp(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET',
  code: string
): Promise<boolean> {
  const normalizedTarget = target.trim().toLowerCase();
  const normalizedCode = code.trim();
  const codeHash = crypto.createHash('sha256').update(normalizedCode).digest('hex');

  const res = await queryPostgres(`
    SELECT * FROM otps 
    WHERE target = $1 AND type = $2 AND consumed_at IS NULL
    ORDER BY created_at DESC 
    LIMIT 1
  `, [normalizedTarget, type]);

  if (res.rows.length === 0) return false;
  const record = res.rows[0];

  if (record.attempt_count >= 5) {
    await queryPostgres('DELETE FROM otps WHERE id = $1', [record.id]);
    return false;
  }

  if (Date.now() > Number(record.expires_at)) {
    await queryPostgres('DELETE FROM otps WHERE id = $1', [record.id]);
    return false;
  }

  const hashMatches = record.otp_hash ? record.otp_hash === codeHash : record.otp_raw === normalizedCode;

  if (!hashMatches) {
    await queryPostgres('UPDATE otps SET attempt_count = attempt_count + 1 WHERE id = $1', [record.id]);
    return false;
  }

  const now = new Date().toISOString();
  await queryPostgres('UPDATE otps SET is_verified = 1, consumed_at = $1 WHERE id = $2', [now, record.id]);
  return true;
}

export async function pgIsTargetVerified(
  target: string,
  type: 'EMAIL_VERIFICATION' | 'PHONE_VERIFICATION' | 'PASSWORD_RESET'
): Promise<boolean> {
  const res = await queryPostgres(`
    SELECT * FROM otps 
    WHERE target = $1 AND type = $2 AND is_verified = 1
    ORDER BY created_at DESC 
    LIMIT 1
  `, [target.trim().toLowerCase(), type]);

  if (res.rows.length === 0) return false;
  const record = res.rows[0];
  return Date.now() - Number(record.expires_at) < 30 * 60 * 1000;
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

export async function pgGetAllPosts(params?: {
  communityId?: string;
  topic?: string;
  mediaType?: string;
  limit?: number;
  offset?: number;
  currentUserId?: string;
}): Promise<any[]> {
  let query = "SELECT p.* FROM community_posts p WHERE (p.status IN ('APPROVED', 'PUBLISHED') OR (p.author_id = $1 AND p.status IN ('PENDING_APPROVAL', 'REJECTED', 'SUSPENDED')))";
  const args: any[] = [params?.currentUserId || ''];
  let paramIdx = 2;

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

  return Promise.all(posts.map(async (p: any) => ({
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
    replies: await pgGetRepliesForPost(p.id),
    createdAt: toIso(p.created_at),
    updatedAt: toIso(p.updated_at)
  })));
}

export async function pgGetPostById(postId: string, currentUserId?: string): Promise<any> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return null;
  const p = res.rows[0];

  const userLiked = currentUserId ? await pgIsPostLikedByUser(postId, currentUserId) : false;

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
    replies: await pgGetRepliesForPost(p.id),
    comments: await pgGetCommentsForPost(p.id, currentUserId),
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
}): Promise<any> {
  const id = `post_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  const linksStr = JSON.stringify(post.links || []);
  const attachmentsStr = JSON.stringify(post.attachments || []);

  await queryPostgres(`
    INSERT INTO community_posts (
      id, author_id, author_name, author_role, community_id, community_name,
      property_id, property_name, topic, title, content, links, attachments,
      media_type, media_url, thumbnail_url, duration, status, upvotes, comments_count,
      is_pinned, is_flagged, created_at, updated_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'PENDING_APPROVAL', 0, 0, 0, 0, $18, $19)
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
    now,
    now
  ]);

  await pgRecordCommunityEvent('POST_CREATED', {
    id,
    title: post.title,
    authorName: post.authorName,
    communityId: post.communityId,
    mediaType: post.mediaType || 'POST',
    status: 'PENDING_APPROVAL'
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

  await pgRecordCommunityEvent('POST_UPDATED', { id: postId, title });
  return pgGetPostById(postId);
}

export async function pgDeletePost(postId: string, actorId?: string, isElevated = false): Promise<boolean> {
  const res = await queryPostgres('SELECT * FROM community_posts WHERE id = $1', [postId]);
  if (res.rows.length === 0) return false;
  const post = res.rows[0];
  if (actorId && !isElevated && post.author_id !== actorId) return false;

  await queryPostgres('DELETE FROM community_posts WHERE id = $1', [postId]);
  await pgRecordCommunityEvent('POST_DELETED', { id: postId });
  return true;
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

export async function pgGetCommentsForPost(postId: string, currentUserId?: string): Promise<any[]> {
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
    content: c.content,
    likes_count: Number(c.likes_count || 0),
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  }));

  const userLikedCommentIds = currentUserId ? await pgGetUserLikedCommentIds(currentUserId) : new Set<string>();

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

export async function pgCreateComment(data: {
  postId: string;
  parentId?: string | null;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
}): Promise<any> {
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO community_comments (id, post_id, parent_id, author_id, author_name, author_role, content, likes_count, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
  `, [
    id,
    data.postId,
    data.parentId || null,
    data.authorId,
    data.authorName,
    data.authorRole,
    data.content.trim(),
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

export async function pgDeleteComment(commentId: string, actorId: string, isElevated = false): Promise<boolean> {
  const res = await queryPostgres('SELECT * FROM community_comments WHERE id = $1', [commentId]);
  if (res.rows.length === 0) return false;
  const c = res.rows[0];
  if (!isElevated && c.author_id !== actorId) return false;

  await queryPostgres('DELETE FROM community_comments WHERE id = $1', [commentId]);
  await queryPostgres('UPDATE community_posts SET comments_count = GREATEST(0, comments_count - 1) WHERE id = $1', [c.post_id]);

  await pgRecordCommunityEvent('COMMENT_DELETED', { id: commentId, postId: c.post_id });
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
  type: 'COMMENT' | 'REPLY' | 'LIKE' | 'MODERATION' | 'SYSTEM';
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

export async function pgGetAllCommunities(status?: string): Promise<DbCommunity[]> {
  let query = 'SELECT * FROM communities';
  const params: any[] = [];
  if (status) {
    query += ' WHERE status = $1 ORDER BY created_at DESC';
    params.push(status);
  } else {
    query += ' ORDER BY created_at DESC';
  }

  const res = await queryPostgres(query, params);
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
    created_at: toIso(c.created_at),
    updated_at: toIso(c.updated_at)
  }));
}

export async function pgGetCommunityById(id: string): Promise<DbCommunity | null> {
  const res = await queryPostgres('SELECT * FROM communities WHERE id = $1', [id]);
  if (res.rows.length === 0) return null;
  const c = res.rows[0];
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
  rules?: string;
}): Promise<DbCommunity> {
  const id = `comm_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const slug = community.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + `-${Date.now().toString().slice(-4)}`;
  const now = new Date().toISOString();

  await queryPostgres(`
    INSERT INTO communities (id, name, slug, description, category, location, created_by_id, created_by_name, status, rejection_reason, member_count, icon, banner_image, rules, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_APPROVAL', '', 1, 'Users', '', $9, $10, $11)
  `, [
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
  ]);

  const created = await pgGetCommunityById(id);
  return created!;
}

export async function pgUpdateCommunityStatus(
  id: string,
  status: 'APPROVED' | 'REJECTED',
  reason?: string
): Promise<DbCommunity | null> {
  const now = new Date().toISOString();
  await queryPostgres(`
    UPDATE communities 
    SET status = $1, rejection_reason = $2, updated_at = $3
    WHERE id = $4
  `, [status, reason || '', now, id]);
  return pgGetCommunityById(id);
}

export async function pgDeleteCommunity(id: string): Promise<boolean> {
  await queryPostgres('DELETE FROM communities WHERE id = $1', [id]);
  return true;
}

// ==============================================================================
// MEDIA, LEADS, CONFERENCE (POSTGRESQL)
// ==============================================================================

export async function pgGetAllMedia(): Promise<DbMediaItem[]> {
  const res = await queryPostgres('SELECT * FROM media_items ORDER BY created_at DESC');
  return res.rows.map((m: any) => ({
    id: m.id,
    title: m.title,
    summary: m.summary,
    video_url: m.video_url,
    thumbnail: m.thumbnail,
    type: m.type,
    duration: m.duration,
    views: Number(m.views || 0),
    author_name: m.author_name,
    created_at: toIso(m.created_at)
  }));
}

export async function pgCreateMedia(item: {
  title: string;
  summary: string;
  video_url: string;
  thumbnail: string;
  type: 'MASTERCLASS' | 'PODCAST' | 'SITE_AUDIT';
  duration?: string;
  author_name?: string;
}): Promise<string> {
  const id = `media_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  const now = new Date().toISOString();
  await queryPostgres(`
    INSERT INTO media_items (id, title, summary, video_url, thumbnail, type, duration, views, author_name, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9)
  `, [
    id,
    item.title,
    item.summary,
    item.video_url,
    item.thumbnail,
    item.type,
    item.duration || '15:00',
    item.author_name || 'Swamy Reddy Javidi',
    now
  ]);
  return id;
}

export async function pgDeleteMedia(id: string): Promise<boolean> {
  await queryPostgres('DELETE FROM media_items WHERE id = $1', [id]);
  return true;
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
