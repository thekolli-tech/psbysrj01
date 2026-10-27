import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

/**
 * Local SQLite only. Passwords here are fixtures, not the production credentials.
 * DATABASE_URL is pinned to an empty string so scripts/bootstrap.ts cannot load the workspace .env and write to Neon.
 */

const dbPath = `/tmp/ps-bootstrap-accounts-${process.pid}.db`;
const developerEmail = 'developer.bootstrap@example.com';
const developerPassword = 'fixture-developer-password';
const adminEmail = 'admin.bootstrap@example.com';
const adminPassword = 'fixture-admin-password';
const occupiedEmail = 'occupied.bootstrap@example.com';
const occupiedPassword = 'fixture-seeker-password';

function runTsx(args: string[], env: NodeJS.ProcessEnv): { status: number | null; stdout: string; stderr: string } {
  const result = spawnSync(process.platform === 'win32' ? process.execPath : 'npx', process.platform === 'win32' ? ['--import=tsx', ...args] : ['tsx', ...args], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8'
  });
  return { status: result.status, stdout: result.stdout || '', stderr: result.stderr || '' };
}

function baseEnv(extra: Record<string, string>): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, ...extra, NODE_ENV: 'test', DB_ENGINE: 'sqlite', SQLITE_PATH: dbPath };
  env.DATABASE_URL = '';
  return env;
}

test('bootstrap creates distinct privileged roles without resetting or elevating accounts', async () => {
  const seed = runTsx(['-e', `
    import { initDatabase, createUser } from './src/server/db.ts';
    const main = async () => {
      await initDatabase();
      await createUser({ name: 'Existing Seeker', email: ${JSON.stringify(occupiedEmail)}, role: 'PROPERTY_SEEKER', password: ${JSON.stringify(occupiedPassword)} });
    };
    main();
  `], baseEnv({}));
  assert.equal(seed.status, 0, seed.stderr);

  const first = runTsx(['scripts/bootstrap.ts'], baseEnv({
    BOOTSTRAP_DEVELOPER_EMAIL: developerEmail,
    BOOTSTRAP_DEVELOPER_PASSWORD: developerPassword,
    BOOTSTRAP_SUPER_ADMIN_EMAIL: adminEmail,
    BOOTSTRAP_SUPER_ADMIN_PASSWORD: adminPassword
  }));
  assert.equal(first.status, 0, first.stderr);
  assert.match(first.stdout, /Created DEVELOPER/);
  assert.match(first.stdout, /Created SUPER_ADMIN/);
  assert.equal(first.stdout.includes(developerPassword), false);
  assert.equal(first.stdout.includes(adminPassword), false);
  assert.equal(first.stderr.includes(developerPassword), false);
  assert.equal(first.stderr.includes(adminPassword), false);

  const inspect = runTsx(['-e', `
    import { findUserByEmail, verifyPassword } from './src/server/db.ts';
    const main = async () => {
      const developer = await findUserByEmail(${JSON.stringify(developerEmail)});
      const admin = await findUserByEmail(${JSON.stringify(adminEmail)});
      const occupied = await findUserByEmail(${JSON.stringify(occupiedEmail)});
      if (!developer || !admin || !occupied) throw new Error('expected three accounts');
      const report = {
        developerRole: developer.role,
        adminRole: admin.role,
        occupiedRole: occupied.role,
        developerPasswordOk: verifyPassword(${JSON.stringify(developerPassword)}, developer.password_hash, developer.salt),
        adminPasswordOk: verifyPassword(${JSON.stringify(adminPassword)}, admin.password_hash, admin.salt),
        occupiedPasswordOk: verifyPassword(${JSON.stringify(occupiedPassword)}, occupied.password_hash, occupied.salt),
        developerHash: developer.password_hash,
        adminHash: admin.password_hash,
        responseLeak: JSON.stringify({ developer, admin }).includes(${JSON.stringify(developerPassword)})
      };
      console.log(JSON.stringify(report));
    };
    main();
  `], baseEnv({}));
  assert.equal(inspect.status, 0, inspect.stderr);
  const firstReport = JSON.parse(inspect.stdout.trim().split('\n').filter(line => line.startsWith('{')).pop() || '{}');
  assert.equal(firstReport.developerRole, 'DEVELOPER');
  assert.equal(firstReport.adminRole, 'SUPER_ADMIN');
  assert.equal(firstReport.occupiedRole, 'PROPERTY_SEEKER');
  assert.equal(firstReport.developerPasswordOk, true);
  assert.equal(firstReport.adminPasswordOk, true);
  assert.equal(firstReport.occupiedPasswordOk, true);
  assert.equal(firstReport.responseLeak, false);

  const second = runTsx(['scripts/bootstrap.ts'], baseEnv({
    BOOTSTRAP_DEVELOPER_EMAIL: developerEmail,
    BOOTSTRAP_DEVELOPER_PASSWORD: 'different-password-should-not-apply',
    BOOTSTRAP_SUPER_ADMIN_EMAIL: adminEmail,
    BOOTSTRAP_SUPER_ADMIN_PASSWORD: 'different-admin-password-should-not-apply'
  }));
  assert.equal(second.status, 0, second.stderr);
  assert.match(second.stdout, /Password and role were left unchanged/);
  assert.equal(second.stdout.includes('different-password-should-not-apply'), false);

  const after = runTsx(['-e', `
    import { findUserByEmail, verifyPassword } from './src/server/db.ts';
    const main = async () => {
      const developer = await findUserByEmail(${JSON.stringify(developerEmail)});
      const admin = await findUserByEmail(${JSON.stringify(adminEmail)});
      console.log(JSON.stringify({
        developerHash: developer?.password_hash,
        adminHash: admin?.password_hash,
        developerStillOriginal: verifyPassword(${JSON.stringify(developerPassword)}, developer.password_hash, developer.salt),
        adminStillOriginal: verifyPassword(${JSON.stringify(adminPassword)}, admin.password_hash, admin.salt),
        developerRejectedReplacement: verifyPassword('different-password-should-not-apply', developer.password_hash, developer.salt) === false,
        adminRejectedReplacement: verifyPassword('different-admin-password-should-not-apply', admin.password_hash, admin.salt) === false
      }));
    };
    main();
  `], baseEnv({}));
  assert.equal(after.status, 0, after.stderr);
  const secondReport = JSON.parse(after.stdout.trim().split('\n').filter(line => line.startsWith('{')).pop() || '{}');
  assert.equal(secondReport.developerHash, firstReport.developerHash);
  assert.equal(secondReport.adminHash, firstReport.adminHash);
  assert.equal(secondReport.developerStillOriginal, true);
  assert.equal(secondReport.adminStillOriginal, true);
  assert.equal(secondReport.developerRejectedReplacement, true);
  assert.equal(secondReport.adminRejectedReplacement, true);

  const occupiedDb = `${dbPath}-occupied`;
  const occupiedEnv = baseEnv({});
  occupiedEnv.SQLITE_PATH = occupiedDb;
  const occupiedSeed = runTsx(['-e', `
    import { initDatabase, createUser } from './src/server/db.ts';
    const main = async () => {
      await initDatabase();
      await createUser({ name: 'Existing Seeker', email: ${JSON.stringify(occupiedEmail)}, role: 'PROPERTY_SEEKER', password: ${JSON.stringify(occupiedPassword)} });
    };
    main();
  `], occupiedEnv);
  assert.equal(occupiedSeed.status, 0, occupiedSeed.stderr);
  const occupiedBootstrap = runTsx(['scripts/bootstrap.ts'], {
    ...occupiedEnv,
    BOOTSTRAP_DEVELOPER_EMAIL: 'other.developer@example.com',
    BOOTSTRAP_DEVELOPER_PASSWORD: developerPassword,
    BOOTSTRAP_SUPER_ADMIN_EMAIL: occupiedEmail,
    BOOTSTRAP_SUPER_ADMIN_PASSWORD: adminPassword
  });
  assert.equal(occupiedBootstrap.status, 0, occupiedBootstrap.stderr);
  assert.match(occupiedBootstrap.stdout, /SUPER_ADMIN already exists/);
  const occupiedInspect = runTsx(['-e', `
    import { findUserByEmail, verifyPassword } from './src/server/db.ts';
    const main = async () => {
      const occupied = await findUserByEmail(${JSON.stringify(occupiedEmail)});
      console.log(JSON.stringify({
        role: occupied?.role,
        originalPassword: verifyPassword(${JSON.stringify(occupiedPassword)}, occupied.password_hash, occupied.salt),
        bootstrapPasswordApplied: verifyPassword(${JSON.stringify(adminPassword)}, occupied.password_hash, occupied.salt)
      }));
    };
    main();
  `], occupiedEnv);
  assert.equal(occupiedInspect.status, 0, occupiedInspect.stderr);
  const occupiedReport = JSON.parse(occupiedInspect.stdout.trim().split('\n').filter(line => line.startsWith('{')).pop() || '{}');
  assert.equal(occupiedReport.role, 'PROPERTY_SEEKER');
  assert.equal(occupiedReport.originalPassword, true);
  assert.equal(occupiedReport.bootstrapPasswordApplied, false);
});
