import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import { POSTGRES_ADDITIVE_SQL, SQLITE_COLUMN_STATEMENTS, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';
import {
  canActorDisableOrDeleteUser,
  canActorRestrictUser,
  canActorModifyRole
} from '../src/server/db.ts';
import {
  validateAvatarUpload,
  getSafeAvatar,
  DEFAULT_AVATAR
} from '../src/shared/avatar.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('Schema & Invariant Safety: Additive, non-destructive user restriction columns', () => {
  // Non-destructive SQL check
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);

  // PostgreSQL additive schema includes is_restricted and restricted_reason
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE users ADD COLUMN IF NOT EXISTS is_restricted SMALLINT DEFAULT 0;/);
  assert.match(POSTGRES_ADDITIVE_SQL, /ALTER TABLE users ADD COLUMN IF NOT EXISTS restricted_reason TEXT;/);

  // SQLite additive statements include is_restricted and restricted_reason
  const hasSqliteRestricted = SQLITE_COLUMN_STATEMENTS.some(s => s.includes('is_restricted'));
  const hasSqliteReason = SQLITE_COLUMN_STATEMENTS.some(s => s.includes('restricted_reason'));
  assert.equal(hasSqliteRestricted, true);
  assert.equal(hasSqliteReason, true);
});

test('Role Hierarchy & Account Protection Matrix: Unit check', () => {
  // 1. canActorDisableOrDeleteUser
  // Developer can disable/delete Super Admin
  const devDeleteAdmin = canActorDisableOrDeleteUser('DEVELOPER', 'SUPER_ADMIN', false, 1);
  assert.equal(devDeleteAdmin.allowed, true);

  // Developer cannot delete own account
  const devDeleteSelf = canActorDisableOrDeleteUser('DEVELOPER', 'DEVELOPER', true, 1);
  assert.equal(devDeleteSelf.allowed, false);
  assert.match(devDeleteSelf.reason || '', /cannot disable or delete your own/i);

  // Developer cannot delete last remaining developer
  const devDeleteLastDev = canActorDisableOrDeleteUser('DEVELOPER', 'DEVELOPER', false, 1);
  assert.equal(devDeleteLastDev.allowed, false);
  assert.match(devDeleteLastDev.reason || '', /last remaining platform Developer/i);

  // Developer can delete another developer if active developer count > 1
  const devDeleteOtherDev = canActorDisableOrDeleteUser('DEVELOPER', 'DEVELOPER', false, 2);
  assert.equal(devDeleteOtherDev.allowed, true);

  // Super Admin CANNOT delete Developer account
  const adminDeleteDev = canActorDisableOrDeleteUser('SUPER_ADMIN', 'DEVELOPER', false, 1);
  assert.equal(adminDeleteDev.allowed, false);
  assert.match(adminDeleteDev.reason || '', /Super Admins cannot disable, suspend, or delete Developer accounts/i);

  // Super Admin CANNOT delete another Super Admin account
  const adminDeleteAdmin = canActorDisableOrDeleteUser('SUPER_ADMIN', 'SUPER_ADMIN', false, 1);
  assert.equal(adminDeleteAdmin.allowed, false);
  assert.match(adminDeleteAdmin.reason || '', /Only platform Developers can disable, suspend, or delete Super Admin accounts/i);

  // Super Admin CAN delete regular user account
  const adminDeleteUser = canActorDisableOrDeleteUser('SUPER_ADMIN', 'PROPERTY_SEEKER', false, 1);
  assert.equal(adminDeleteUser.allowed, true);

  // 2. canActorRestrictUser
  // Super Admin can restrict regular users
  const adminRestrictUser = canActorRestrictUser('SUPER_ADMIN', 'PROPERTY_SEEKER', false);
  assert.equal(adminRestrictUser.allowed, true);

  // Super Admin CANNOT restrict Developer account
  const adminRestrictDev = canActorRestrictUser('SUPER_ADMIN', 'DEVELOPER', false);
  assert.equal(adminRestrictDev.allowed, false);
  assert.match(adminRestrictDev.reason || '', /cannot restrict Developer accounts/i);

  // Super Admin CANNOT restrict another Super Admin
  const adminRestrictAdmin = canActorRestrictUser('SUPER_ADMIN', 'SUPER_ADMIN', false);
  assert.equal(adminRestrictAdmin.allowed, false);
  assert.match(adminRestrictAdmin.reason || '', /Super Admins can only restrict regular user accounts/i);

  // Super Admin cannot restrict self
  const adminRestrictSelf = canActorRestrictUser('SUPER_ADMIN', 'SUPER_ADMIN', true);
  assert.equal(adminRestrictSelf.allowed, false);

  // Regular users cannot restrict anyone
  const userRestrictUser = canActorRestrictUser('PROPERTY_SEEKER', 'AGENT', false);
  assert.equal(userRestrictUser.allowed, false);

  // 3. canActorModifyRole
  // Developer can modify role of Super Admin
  const devModifyAdminRole = canActorModifyRole('DEVELOPER', 'SUPER_ADMIN', 'AGENT', false, 1);
  assert.equal(devModifyAdminRole.allowed, true);

  // Super Admin CANNOT modify Developer role
  const adminModifyDevRole = canActorModifyRole('SUPER_ADMIN', 'DEVELOPER', 'AGENT', false, 1);
  assert.equal(adminModifyDevRole.allowed, false);

  // Super Admin CANNOT grant Developer role
  const adminGrantDevRole = canActorModifyRole('SUPER_ADMIN', 'AGENT', 'DEVELOPER', false, 1);
  assert.equal(adminGrantDevRole.allowed, false);
});

test('Avatar Security & Validation: 2MB limit, XSS prevention, and format checks', () => {
  // 1. Valid PNG base64
  const tinyPngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const pngCheck = validateAvatarUpload(tinyPngBase64);
  assert.equal(pngCheck.valid, true);
  assert.equal(pngCheck.avatar, tinyPngBase64);

  // 2. Valid HTTPS URL
  const httpsUrl = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200';
  const httpsCheck = validateAvatarUpload(httpsUrl);
  assert.equal(httpsCheck.valid, true);

  // 3. SVG is rejected for XSS prevention
  const svgDataUri = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const svgCheck = validateAvatarUpload(svgDataUri);
  assert.equal(svgCheck.valid, false);
  assert.match(svgCheck.error || '', /SVG.*not permitted/i);

  // 4. HTML / Script injection is rejected
  const scriptPayload = '<script>window.location="http://attacker.com"</script>';
  const scriptCheck = validateAvatarUpload(scriptPayload);
  assert.equal(scriptCheck.valid, false);

  // 5. javascript: URL is rejected
  const jsUri = 'javascript:alert(1)';
  const jsCheck = validateAvatarUpload(jsUri);
  assert.equal(jsCheck.valid, false);

  // 6. Oversized image (> 2MB) is rejected
  const oversizedBase64 = 'data:image/jpeg;base64,' + 'A'.repeat(3 * 1024 * 1024);
  const sizeCheck = validateAvatarUpload(oversizedBase64);
  assert.equal(sizeCheck.valid, false);
  assert.match(sizeCheck.error || '', /2MB/i);

  // 7. DEFAULT_AVATAR is an SVG data URI
  assert.match(DEFAULT_AVATAR, /^data:image\/svg\+xml[,;]/);

  // 8. getSafeAvatar fallback behavior
  assert.equal(getSafeAvatar(null), DEFAULT_AVATAR);
  assert.equal(getSafeAvatar(''), DEFAULT_AVATAR);
  assert.equal(getSafeAvatar('   '), DEFAULT_AVATAR);
  assert.equal(getSafeAvatar(httpsUrl), httpsUrl);
  assert.equal(getSafeAvatar(tinyPngBase64), tinyPngBase64);
  assert.equal(getSafeAvatar('invalid-broken-url'), DEFAULT_AVATAR);
});

// Setup isolated local SQLite database for HTTP testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-account-permissions-${process.pid}.db`;

const {
  initDatabase,
  createUser,
  createSession,
  findUserById
} = await import('../src/server/db.ts');

await initDatabase();
const { app } = await import('../server.ts');

const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const baseUrl = `http://127.0.0.1:${port}`;

test.after(() => {
  server.close();
});

test('HTTP API: Role hierarchy, account protection, restriction, and avatar endpoints', async (t) => {
  // Provision Test Users
  const devUser = await createUser({
    name: 'Platform Developer',
    email: `dev_perm_${Date.now()}@example.com`,
    phone: '+919888800001',
    role: 'DEVELOPER',
    password: 'Password123!',
    isVerified: true
  });
  const devSession = await createSession(devUser.id);

  const admin1User = await createUser({
    name: 'Super Admin Alpha',
    email: `admin1_perm_${Date.now()}@example.com`,
    phone: '+919888800002',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const admin1Session = await createSession(admin1User.id);

  const admin2User = await createUser({
    name: 'Super Admin Beta',
    email: `admin2_perm_${Date.now()}@example.com`,
    phone: '+919888800003',
    role: 'SUPER_ADMIN',
    password: 'Password123!',
    isVerified: true
  });
  const admin2Session = await createSession(admin2User.id);

  const seekerUser = await createUser({
    name: 'Regular Seeker User',
    email: `seeker_perm_${Date.now()}@example.com`,
    phone: '+919888800004',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!',
    isVerified: true
  });
  const seekerSession = await createSession(seekerUser.id);

  await t.test('1. Super Admin cannot delete, suspend, restrict, reset password of, or modify role of Developer', async () => {
    // Attempt delete Developer
    const delRes = await fetch(`${baseUrl}/api/admin/users/${devUser.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin1Session.token}` }
    });
    assert.equal(delRes.status, 403);
    const delData = await delRes.json();
    assert.match(delData.error, /Super Admins cannot disable, suspend, or delete Developer accounts/i);

    // Attempt suspend Developer
    const suspRes = await fetch(`${baseUrl}/api/admin/users/${devUser.id}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ suspend: true })
    });
    assert.equal(suspRes.status, 403);

    // Attempt restrict Developer
    const restrRes = await fetch(`${baseUrl}/api/admin/users/${devUser.id}/restrict`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ restrict: true, reason: 'Test' })
    });
    assert.equal(restrRes.status, 403);
    const restrData = await restrRes.json();
    assert.match(restrData.error, /cannot restrict Developer accounts/i);

    // Attempt reset password of Developer
    const pwdRes = await fetch(`${baseUrl}/api/admin/users/${devUser.id}/reset-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword: 'HackedPassword123!' })
    });
    assert.equal(pwdRes.status, 403);
    const pwdData = await pwdRes.json();
    assert.match(pwdData.error, /Super Admins cannot reset passwords for Developer accounts/i);

    // Attempt modify role of Developer
    const roleRes = await fetch(`${baseUrl}/api/admin/users/${devUser.id}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'PROPERTY_SEEKER' })
    });
    assert.equal(roleRes.status, 403);
    const roleData = await roleRes.json();
    assert.match(roleData.error, /Super Admins cannot modify, demote, or revoke Developer accounts/i);
  });

  await t.test('2. Super Admin cannot delete or restrict another Super Admin', async () => {
    // Attempt delete Super Admin 2
    const delRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${admin1Session.token}` }
    });
    assert.equal(delRes.status, 403);
    const delData = await delRes.json();
    assert.match(delData.error, /Only platform Developers can disable, suspend, or delete Super Admin accounts/i);

    // Attempt restrict Super Admin 2
    const restrRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}/restrict`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ restrict: true, reason: 'Admin conflict' })
    });
    assert.equal(restrRes.status, 403);
    const restrData = await restrRes.json();
    assert.match(restrData.error, /Super Admins can only restrict regular user accounts/i);
  });

  await t.test('3. Developer can reset password, modify role, suspend, and delete Super Admin', async () => {
    // Developer resets Super Admin 2 password
    const pwdRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}/reset-password`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${devSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ newPassword: 'DeveloperReset999!' })
    });
    assert.equal(pwdRes.status, 200);
    const pwdData = await pwdRes.json();
    assert.equal(pwdData.success, true);

    // Developer modifies Super Admin 2 role
    const roleRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}/role`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${devSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ role: 'PROPERTY_ADMIN' })
    });
    assert.equal(roleRes.status, 200);
    const roleData = await roleRes.json();
    assert.equal(roleData.success, true);
    assert.equal(roleData.user.role, 'PROPERTY_ADMIN');

    // Developer suspends and reactivates user
    const suspRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${devSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ suspend: true })
    });
    assert.equal(suspRes.status, 200);

    // Developer deletes user account
    const delRes = await fetch(`${baseUrl}/api/admin/users/${admin2User.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${devSession.token}` }
    });
    assert.equal(delRes.status, 200);
    const delData = await delRes.json();
    assert.equal(delData.success, true);
  });

  await t.test('4. Super Admin can restrict and unrestrict regular user; restricted user is blocked from protected actions', async () => {
    // Super Admin restricts regular user
    const restrRes = await fetch(`${baseUrl}/api/admin/users/${seekerUser.id}/restrict`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ restrict: true, reason: 'Violation of community standards' })
    });
    assert.equal(restrRes.status, 200);
    const restrData = await restrRes.json();
    assert.equal(restrData.success, true);
    assert.equal(restrData.user.is_restricted, 1);
    assert.equal(restrData.user.account_status, 'RESTRICTED');

    // Verify restricted user is blocked from creating community posts with a clear message
    const postRes = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Spam Question',
        content: 'Trying to post while restricted',
        topic: 'General'
      })
    });
    assert.equal(postRes.status, 403);
    const postData = await postRes.json();
    assert.match(postData.error, /Account Restricted: Your account has been restricted by an administrator/i);

    // Verify restricted user is blocked from media engagement
    const mediaRes = await fetch(`${baseUrl}/api/media/any_id/like`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${seekerSession.token}` }
    });
    assert.equal(mediaRes.status, 403);
    const mediaData = await mediaRes.json();
    assert.match(mediaData.error, /Account Restricted: Your account has been restricted by an administrator/i);

    // Verify restricted user CAN still fetch public listings (read access remains available)
    const getRes = await fetch(`${baseUrl}/api/properties`);
    assert.equal(getRes.status, 200);

    // Super Admin lifts restriction
    const unrestrRes = await fetch(`${baseUrl}/api/admin/users/${seekerUser.id}/restrict`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ restrict: false })
    });
    assert.equal(unrestrRes.status, 200);
    const unrestrData = await unrestrRes.json();
    assert.equal(unrestrData.success, true);
    assert.equal(unrestrData.user.is_restricted, 0);
    assert.equal(unrestrData.user.account_status, 'ACTIVE');

    // User can now post
    const postAllowedRes = await fetch(`${baseUrl}/api/community/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title: 'Valid Question on RERA Approvals',
        content: 'How do I verify HMDA approval numbers in Hyderabad?',
        topic: 'Legal'
      })
    });
    assert.equal(postAllowedRes.status, 200);
  });

  await t.test('5. Profile photo upload for all roles, file validation, and photo removal', async () => {
    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Seeker uploads photo
    const uploadRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: validPng })
    });
    assert.equal(uploadRes.status, 200);
    const uploadData = await uploadRes.json();
    assert.equal(uploadData.success, true);
    assert.equal(uploadData.avatar, validPng);

    // Verify persisted in database
    const dbSeeker = await findUserById(seekerUser.id);
    assert.equal(dbSeeker?.avatar, validPng);

    // Attempt SVG upload is rejected (400)
    const svgRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: 'data:image/svg+xml;utf8,<svg></svg>' })
    });
    assert.equal(svgRes.status, 400);

    // User removes photo
    const removeRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${seekerSession.token}` }
    });
    assert.equal(removeRes.status, 200);
    const removeData = await removeRes.json();
    assert.equal(removeData.avatar, '');

    // Verify removed in database
    const dbSeekerAfter = await findUserById(seekerUser.id);
    assert.equal(dbSeekerAfter?.avatar, '');
  });

  await t.test('6. Super Admin profile photo upload applies only to own account', async () => {
    const validPng = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    // Super Admin uploads photo
    const adminUploadRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${admin1Session.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: validPng })
    });
    assert.equal(adminUploadRes.status, 200);

    // Verify Admin avatar changed, but seeker avatar is not affected
    const adminUserDb = await findUserById(admin1User.id);
    assert.equal(adminUserDb?.avatar, validPng);
    const seekerUserDb = await findUserById(seekerUser.id);
    assert.equal(seekerUserDb?.avatar, '');
  });

  await t.test('7. Large profile photo upload up to 2MB succeeds without 413 request entity too large', async () => {
    // Generate a valid 500KB PNG payload (far exceeding Express's default 100kb limit)
    const validPngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const filler = Buffer.alloc(500 * 1024, 0x20); // 500KB
    const largePngBuffer = Buffer.concat([validPngHeader, filler]);
    const largePngBase64 = `data:image/png;base64,${largePngBuffer.toString('base64')}`;

    const uploadRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: largePngBase64 })
    });

    assert.equal(uploadRes.status, 200);
    const data = await uploadRes.json();
    assert.equal(data.success, true);
    assert.equal(data.avatar, largePngBase64);

    const seekerDb = await findUserById(seekerUser.id);
    assert.equal(seekerDb?.avatar, largePngBase64);
  });

  await t.test('8. Oversized avatar payload (> 2MB) returns clean error with friendly message', async () => {
    // 2.5MB payload
    const validPngHeader = Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex');
    const filler = Buffer.alloc(2500 * 1024, 0x20);
    const oversizedPngBuffer = Buffer.concat([validPngHeader, filler]);
    const oversizedPngBase64 = `data:image/png;base64,${oversizedPngBuffer.toString('base64')}`;

    const uploadRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ avatar: oversizedPngBase64 })
    });

    assert.equal(uploadRes.status, 400);
    const data = await uploadRes.json();
    assert.match(data.error || '', /2MB/i);
  });

  await t.test('9. HTTP 413 payload too large returns JSON with friendly error rather than raw text or HTML', async () => {
    // Send a payload exceeding the 10MB body parser limit
    const hugeBody = JSON.stringify({ avatar: 'x'.repeat(11 * 1024 * 1024) });

    const uploadRes = await fetch(`${baseUrl}/api/me/avatar`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${seekerSession.token}`,
        'Content-Type': 'application/json'
      },
      body: hugeBody
    });

    assert.equal(uploadRes.status, 413);
    const data = await uploadRes.json();
    assert.equal(data.error, 'Image file must be 2MB or smaller.');
    assert.equal(data.code, 'ENTITY_TOO_LARGE');
  });
});

test('UI Components: Safe avatar fallbacks, RESTRICTED badge, and permission-gated buttons', () => {
  // 1. SuperAdminDashboard.tsx
  const superAdminDash = read('src/components/admin/SuperAdminDashboard.tsx');
  assert.match(superAdminDash, /getSafeAvatar/);
  assert.match(superAdminDash, /DEFAULT_AVATAR/);
  assert.match(superAdminDash, /RESTRICTED/);
  assert.match(superAdminDash, /handleToggleRestrictUser/);
  assert.match(superAdminDash, /canRestrict/);
  assert.match(superAdminDash, /canDelete/);
  // Super Admin cannot delete developer
  assert.match(superAdminDash, /u\.role !== 'DEVELOPER'/);

  // 2. ProfileControlPanelModal.tsx
  const profileModal = read('src/components/common/ProfileControlPanelModal.tsx');
  assert.match(profileModal, /getSafeAvatar/);
  assert.match(profileModal, /DEFAULT_AVATAR/);
  assert.match(profileModal, /handleAvatarFileSelect/);
  assert.match(profileModal, /handleRemoveAvatar/);
  assert.match(profileModal, /accept="image\/jpeg,image\/png,image\/webp,image\/gif"/);
  assert.match(profileModal, /Upload Photo|Change Photo/);
  assert.match(profileModal, /Remove/);

  // 3. Header.tsx and MobileHeader.tsx
  const header = read('src/components/common/Header.tsx');
  assert.match(header, /getSafeAvatar\(currentUser\.avatar\)/);
  assert.match(header, /DEFAULT_AVATAR/);

  const mobileHeader = read('src/components/common/MobileHeader.tsx');
  assert.match(mobileHeader, /getSafeAvatar\(currentUser\.avatar\)/);
  assert.match(mobileHeader, /DEFAULT_AVATAR/);

  // 4. UserDashboard.tsx
  const userDash = read('src/components/dashboard/UserDashboard.tsx');
  assert.match(userDash, /getSafeAvatar\(currentUser\.avatar\)/);
  assert.match(userDash, /DEFAULT_AVATAR/);
});
