import 'dotenv/config';
import crypto from 'node:crypto';
import {
  initDatabase,
  findUserByEmail,
  hashPassword,
  createAuditLog,
  getAllUsers
} from '../src/server/db.js';

// Ensure database tables exist
initDatabase();

async function runBootstrap() {
  console.log('================================================================');
  console.log(' PROPERTY STUDIO - SECURE PRODUCTION ACCOUNT BOOTSTRAPPER');
  console.log('================================================================');

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

  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync('./data/propertystudio.db');
  const now = new Date().toISOString();

  // Mode A: Individual User Password Reset via CLI
  if (resetTargetEmail && newPasswordArg) {
    const user = findUserByEmail(resetTargetEmail);
    if (!user) {
      console.error(`[ERROR] User not found matching email: ${resetTargetEmail}`);
      process.exit(1);
    }
    const { hash, salt } = hashPassword(newPasswordArg);
    db.prepare('UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?').run(hash, salt, now, user.id);
    createAuditLog({
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

  // 1. BOOTSTRAP DEVELOPER (Platform Owner)
  let devUser = findUserByEmail(devEmail);
  const actualDevPassword = devPasswordInput || (devUser ? null : generateSecurePassword('Dev'));
  
  if (!devUser) {
    const { hash, salt } = hashPassword(actualDevPassword!);
    const devId = 'user_dev_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'dev_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'DEVELOPER', ?, ?, 0, 1, 1, 1, 'ACTIVE', ?, '[]', ?, ?, ?, ?)
    `).run(
      devId,
      publicId,
      'Swamy Reddy Javidi (Platform Owner)',
      devEmail,
      '+91 98490 12890',
      '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      'Property Studio Secretariat',
      devPasswordInput ? 0 : 1, // Require password change if temporary
      hash,
      salt,
      now,
      now
    );

    createAuditLog({
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
      db.prepare("UPDATE users SET password_hash = ?, salt = ?, role = 'DEVELOPER', updated_at = ? WHERE id = ?").run(hash, salt, now, devUser.id);
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
  let adminUser = findUserByEmail(adminEmail);
  const actualAdminPassword = adminPasswordInput || (adminUser ? null : generateSecurePassword('Admin'));

  if (!adminUser) {
    const { hash, salt } = hashPassword(actualAdminPassword!);
    const adminId = 'user_admin_' + crypto.randomBytes(4).toString('hex');
    const publicId = 'admin_' + crypto.randomBytes(3).toString('hex');

    db.prepare(`
      INSERT INTO users (id, public_id, name, email, phone, role, avatar, organization, wallet_balance, is_verified, email_verified, phone_verified, account_status, must_change_password, assigned_properties, password_hash, salt, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'SUPER_ADMIN', ?, ?, 0, 1, 1, 1, 'ACTIVE', ?, '[]', ?, ?, ?, ?)
    `).run(
      adminId,
      publicId,
      'Property Studio Super Administrator',
      adminEmail,
      '+91 98490 12890',
      '/src/assets/images/swamy_reddy_standing_vertical_1791363659975.jpg',
      'Property Studio Administration',
      adminPasswordInput ? 0 : 1, // Require password change if temporary
      hash,
      salt,
      now,
      now
    );

    createAuditLog({
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
      db.prepare("UPDATE users SET password_hash = ?, salt = ?, role = 'SUPER_ADMIN', updated_at = ? WHERE id = ?").run(hash, salt, now, adminUser.id);
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
  const ownerUser = findUserByEmail(ownerEmail);
  if (ownerUser) {
    db.prepare("UPDATE users SET role = 'DEVELOPER', is_verified = 1, email_verified = 1, phone_verified = 1 WHERE email = ?").run(ownerEmail);
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
