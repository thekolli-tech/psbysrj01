import 'dotenv/config';
import crypto from 'node:crypto';
import { bootstrapPlan } from '../src/shared/policy.ts';
import { checkSchemaReadiness, queryPostgres } from '../src/server/postgres.ts';
import {
  createAuditLog,
  findUserByEmail,
  getSqliteDb,
  hashPassword,
  initDatabase,
  isPostgresAuthoritative,
  isSqliteExplicit
} from '../src/server/db.ts';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name}. Bootstrap refuses to invent credentials.`);
  }
  return value.trim();
}

async function insertUser(row: {
  id: string;
  publicId: string;
  name: string;
  email: string;
  role: string;
  hash: string;
  salt: string;
}): Promise<void> {
  const now = new Date().toISOString();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO users (
        id, public_id, name, email, phone, role, avatar, organization, wallet_balance,
        is_verified, email_verified, phone_verified, account_status, must_change_password,
        assigned_properties, capabilities, password_hash, salt, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, '', $5, '', 'Property Studio', 0,
        1, 1, 0, 'ACTIVE', 0,
        '[]', '[]', $6, $7, $8, $8
      )`,
      [row.id, row.publicId, row.name, row.email, row.role, row.hash, row.salt, now]
    );
    return;
  }
  getSqliteDb().prepare(
    `INSERT INTO users (
      id, public_id, name, email, phone, role, avatar, organization, wallet_balance,
      is_verified, email_verified, phone_verified, account_status, must_change_password,
      assigned_properties, password_hash, salt, created_at, updated_at
    ) VALUES (?, ?, ?, ?, '', ?, '', 'Property Studio', 0, 1, 1, 0, 'ACTIVE', 0, '[]', ?, ?, ?, ?)`
  ).run(row.id, row.publicId, row.name, row.email, row.role, row.hash, row.salt, now, now);
}

async function provision(emailEnv: string, passwordEnv: string, role: 'DEVELOPER' | 'SUPER_ADMIN', name: string): Promise<'created' | 'unchanged'> {
  const email = requiredEnv(emailEnv).toLowerCase();
  const password = requiredEnv(passwordEnv);
  const existing = await findUserByEmail(email);
  const plan = bootstrapPlan(existing ? { email: existing.email } : null);
  if (plan === 'unchanged') {
    console.log(`[bootstrap] ${role} already exists for ${email}. Password and role were left unchanged.`);
    return 'unchanged';
  }
  const { hash, salt } = hashPassword(password);
  const userId = `user_${role.toLowerCase()}_${crypto.randomBytes(4).toString('hex')}`;
  await insertUser({
    id: userId,
    publicId: `${role.toLowerCase()}_${crypto.randomBytes(3).toString('hex')}`,
    name,
    email,
    role,
    hash,
    salt
  });
  await createAuditLog({
    actorId: 'server_bootstrap',
    actorEmail: 'bootstrap@propertystudio.local',
    actorRole: 'SYSTEM',
    action: role === 'DEVELOPER' ? 'BOOTSTRAP_DEVELOPER_CREATED' : 'BOOTSTRAP_SUPER_ADMIN_CREATED',
    targetId: userId,
    targetEmail: email,
    details: { role }
  });
  console.log(`[bootstrap] Created ${role} for ${email}. The password was read from the environment and was not printed.`);
  return 'created';
}

async function main(): Promise<void> {
  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('Production bootstrap requires DATABASE_URL.');
  }
  if (!process.env.DATABASE_URL && !isSqliteExplicit()) {
    throw new Error('Set DATABASE_URL, or DB_ENGINE=sqlite for an explicit local bootstrap. SQLite is not an automatic fallback.');
  }

  if (isPostgresAuthoritative()) {
    const readiness = await checkSchemaReadiness();
    if (!readiness.connected || !readiness.ready) {
      throw new Error(`PostgreSQL schema is not ready (${readiness.error || readiness.missing.join(', ') || 'unavailable'}). Run npm run db:init first. Bootstrap does not migrate or import data.`);
    }
  } else {
    await initDatabase();
  }

  await provision('BOOTSTRAP_DEVELOPER_EMAIL', 'BOOTSTRAP_DEVELOPER_PASSWORD', 'DEVELOPER', 'Platform Developer');
  await provision('BOOTSTRAP_SUPER_ADMIN_EMAIL', 'BOOTSTRAP_SUPER_ADMIN_PASSWORD', 'SUPER_ADMIN', 'Platform Super Admin');
  console.log('[bootstrap] Finished. Existing accounts were not elevated or reset.');
}

main().catch(err => {
  console.error('[bootstrap] Failed:', err?.message || err);
  process.exit(1);
});
