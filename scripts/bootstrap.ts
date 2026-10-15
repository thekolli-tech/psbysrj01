import 'dotenv/config';
import crypto from 'node:crypto';
import {
  initDatabase,
  findUserByEmail,
  hashPassword,
  createAuditLog,
  isPostgresAuthoritative,
  DbUser
} from '../src/server/db.js';
import { queryPostgres } from '../src/server/postgres.js';

async function runBootstrap() {
  console.log('================================================================');
  console.log(' PROPERTY STUDIO - SECURE PRODUCTION ACCOUNT BOOTSTRAPPER');
  console.log('================================================================');

  // Ensure database tables exist in the authoritative database
  await initDatabase();
  const isPg = isPostgresAuthoritative();
  console.log(`[BOOTSTRAP] Target authoritative database: ${isPg ? 'Neon PostgreSQL' : 'Local SQLite'}`);

  let sqliteDb: any = null;
  if (!isPg) {
    const { DatabaseSync } = await import('node:sqlite');
    sqliteDb = new DatabaseSync('./data/propertystudio.db');
  }

  // Parse CLI arguments if provided: e.g. tsx scripts/bootstrap.ts --dev-password ...
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) {
      return args[idx + 1];
    }
    return undefined;
  };

  const devEmail = (getArg('--dev-email') || process.env.BOOTSTRAP_DEVELOPER_EMAIL || 'developer@propertystudio.org').trim().toLowerCase();
  const devPasswordInput = getArg('--dev-password') || process.env.BOOTSTRAP_DEVELOPER_PASSWORD;

  const adminEmail = (getArg('--admin-email') || process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL || 'admin@propertystudio.org').trim().toLowerCase();
  const adminPasswordInput = getArg('--admin-password') || process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;

  const resetTargetEmail = getArg('--reset-user')?.trim().toLowerCase();
  const newPasswordArg = getArg('--new-password');

  const now = new Date().toISOString();

  // Mode A: Individual User Password Reset via CLI
  if (resetTargetEmail && newPasswordArg) {
    const user = await findUserByEmail(resetTargetEmail);
    if (!user) {
      console.error(`[ERROR] User not found matching email: ${resetTargetEmail}`);
      process.exit(1);
    }
    const { hash, salt } = hashPassword(newPasswordArg);
    if (isPg) {
      await queryPostgres(
        'UPDATE users SET password_hash = $1, salt = $2, updated_at = $3 WHERE id = $4',
        [hash, salt, now, user.id]
      );
    } else {
      sqliteDb.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, now, user.id);
    }

    await createAuditLog({
      actorId: 'server_cli',
      actorEmail: 'cli@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'CLI_PASSWORD_RESET',
      targetId: user.id,
      targetEmail: user.email,
      details: { role: user.role }
    });
    console.log(`[SUCCESS] Password successfully reset for ${user.email} (${user.role}).`);
    return;
  }

  // Helper to generate secure random password if none provided
  const generateSecurePassword = (prefix: string) => {
    const random = crypto.randomBytes(9).toString('base64').replace(/[^a-zA-Z0-9]/g, 'x');
    return `${prefix}@${random}!2026`;
  };

  // Helper to upsert user securely
  async function upsertBootstrapUser(userData: {
    id: string;
    publicId: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    avatar: string;
    organization: string;
    mustChangePassword: number;
    hash: string;
    salt: string;
  }) {
    if (isPg) {
      await queryPostgres(`
        INSERT INTO users (
          id, public_id, name, email, phone, role, avatar, organization, wallet_balance,
          is_verified, email_verified, phone_verified, account_status, must_change_password,
          assigned_properties, password_hash, salt, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 0,
          1, 1, 1, 'ACTIVE', $9,
          '[]', $10, $11, $12, $13
        )
      `, [
        userData.id,
        userData.publicId,
        userData.name,
        userData.email,
        userData.phone,
        userData.role,
        userData.avatar,
        userData.organization,
        userData.mustChangePassword,
        userData.hash,
        userData.salt,
        now,
        now
      ]);
    } else {
      sqliteDb.prepare(`
        INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, 1, 1, 'ACTIVE', ?, '[]', ?, ?, ?, ?)
      `).run(
        userData.id,
        userData.publicId,
        userData.name,
        userData.email,
        userData.phone,
        userData.role,
        userData.avatar,
        userData.organization,
        userData.mustChangePassword,
        userData.hash,
        userData.salt,
        now,
        now
      );
    }
  }

  async function updatePassword(userId: string, role: string, hash: string, salt: string) {
    if (isPg) {
      await queryPostgres(
        'UPDATE users SET password_hash = $1, salt = $2, role = $3, updated_at = $4 WHERE id = $5',
        [hash, salt, role, now, userId]
      );
    } else {
      sqliteDb.prepare("UPDATE users SET password_hash = ?, salt = ?, role = ?, updated_at = ? WHERE id = ?").run(hash, salt, role, now, userId);
    }
  }

  // 1. BOOTSTRAP DEVELOPER (Platform Owner)
  let devUser = await findUserByEmail(devEmail);
  const actualDevPassword = devPasswordInput || (devUser ? null : generateSecurePassword('Dev'));
  
  if (!devUser) {
    const { hash, salt } = hashPassword(actualDevPassword!);
    const devId = 'user_dev_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'dev_' + crypto.randomBytes(3).toString('hex');

    await upsertBootstrapUser({
      id: devId,
      publicId,
      name: 'Swamy Reddy Javidi (Platform Owner)',
      email: devEmail,
      phone: '+91 98490 12890',
      role: 'DEVELOPER',
      avatar: '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      organization: 'Property Studio Secretariat',
      mustChangePassword: devPasswordInput ? 0 : 1,
      hash,
      salt
    });

    await createAuditLog({
      actorId: 'server_bootstrap',
      actorEmail: 'bootstrap@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_DEVELOPER_CREATED',
      targetId: devId,
      targetEmail: devEmail,
      details: { role: 'DEVELOPER' }
    });

    console.log(`\n[+] DEVELOPER Account Created:`);
    console.log(`    Role:     DEVELOPER (Platform Owner)`);
    console.log(`    Email:    ${devEmail}`);
    if (!devPasswordInput) {
      console.log(`    Password: ${actualDevPassword} [ONE-TIME TEMPORARY CREDENTIAL]`);
      console.log(`    Notice:   Must be changed on first login.`);
    } else {
      console.log(`    Password: [PROTECTED - Configured via environment/argument]`);
    }
  } else {
    // If password provided, update it
    if (devPasswordInput) {
      const { hash, salt } = hashPassword(devPasswordInput);
      await updatePassword(devUser.id, 'DEVELOPER', hash, salt);
      console.log(`\n[*] DEVELOPER Account Updated:`);
      console.log(`    Role:     DEVELOPER (Platform Owner)`);
      console.log(`    Email:    ${devEmail}`);
      console.log(`    Password: [PROTECTED - Updated with provided secret]`);
    } else {
      console.log(`\n[*] DEVELOPER Account Exists:`);
      console.log(`    Role:     DEVELOPER (Platform Owner)`);
      console.log(`    Email:    ${devEmail}`);
      console.log(`    Status:   Active in database.`);
    }
  }

  // 2. BOOTSTRAP SUPER_ADMIN
  let adminUser = await findUserByEmail(adminEmail);
  const actualAdminPassword = adminPasswordInput || (adminUser ? null : generateSecurePassword('Admin'));

  if (!adminUser) {
    const { hash, salt } = hashPassword(actualAdminPassword!);
    const adminId = 'user_admin_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'admin_' + crypto.randomBytes(3).toString('hex');

    await upsertBootstrapUser({
      id: adminId,
      publicId,
      name: 'Property Studio Super Administrator',
      email: adminEmail,
      phone: '+91 98490 12890',
      role: 'SUPER_ADMIN',
      avatar: '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      organization: 'Property Studio Administration',
      mustChangePassword: adminPasswordInput ? 0 : 1,
      hash,
      salt
    });

    await createAuditLog({
      actorId: 'server_bootstrap',
      actorEmail: 'bootstrap@propertystudio.org',
      actorRole: 'SYSTEM',
      action: 'BOOTSTRAP_SUPER_ADMIN_CREATED',
      targetId: adminId,
      targetEmail: adminEmail,
      details: { role: 'SUPER_ADMIN' }
    });

    console.log(`\n[+] SUPER_ADMIN Account Created:`);
    console.log(`    Role:     SUPER_ADMIN (Platform Administrator)`);
    console.log(`    Email:    ${adminEmail}`);
    if (!adminPasswordInput) {
      console.log(`    Password: ${actualAdminPassword} [ONE-TIME TEMPORARY CREDENTIAL]`);
      console.log(`    Notice:   Must be changed on first login.`);
    } else {
      console.log(`    Password: [PROTECTED - Configured via environment/argument]`);
    }
  } else {
    if (adminPasswordInput) {
      const { hash, salt } = hashPassword(adminPasswordInput);
      await updatePassword(adminUser.id, 'SUPER_ADMIN', hash, salt);
      console.log(`\n[*] SUPER_ADMIN Account Updated:`);
      console.log(`    Role:     SUPER_ADMIN (Platform Administrator)`);
      console.log(`    Email:    ${adminEmail}`);
      console.log(`    Password: [PROTECTED - Updated with provided secret]`);
    } else {
      console.log(`\n[*] SUPER_ADMIN Account Exists:`);
      console.log(`    Role:     SUPER_ADMIN (Platform Administrator)`);
      console.log(`    Email:    ${adminEmail}`);
      console.log(`    Status:   Active in database.`);
    }
  }

  // 3. User Personal Account Check (charankolli.athmick@gmail.com)
  const ownerEmail = 'charankolli.athmick@gmail.com';
  const ownerUser = await findUserByEmail(ownerEmail);
  if (ownerUser) {
    if (isPg) {
      await queryPostgres(
        "UPDATE users SET role = 'DEVELOPER', is_verified = 1, email_verified = 1, phone_verified = 1 WHERE email = $1",
        [ownerEmail]
      );
    } else {
      sqliteDb.prepare("UPDATE users SET role = 'DEVELOPER', is_verified = 1, email_verified = 1, phone_verified = 1 WHERE email = ?").run(ownerEmail);
    }
    console.log(`\n[*] Owner Personal Account Configured:`);
    console.log(`    Email:    ${ownerEmail}`);
    console.log(`    Role:     DEVELOPER (Platform Owner)`);
  }

  console.log('\n================================================================');
  console.log(' BOOTSTRAP COMPLETE: Persistent database initialized securely.');
  console.log('================================================================\n');
}

runBootstrap().catch(err => {
  console.error('[BOOTSTRAP FATAL ERROR]:', err);
  process.exit(1);
});
