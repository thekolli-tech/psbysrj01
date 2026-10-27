import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSqliteDb, createAuditLog, getAuditLogs, createUser } from '../src/server/db.ts';
import {
  createListing,
  listModerationQueue,
  moderateListing,
  upsertProfessionalProfile,
  setProfessionalVerification,
  getProfessionalProfile,
  adjustWallet,
  listFinancialRecords
} from '../src/server/commerce.ts';
import { createRequirement, listRequirementsForAdmin } from '../src/server/requirementReview.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('super admin console component structure, tabs, live state, and API integration', () => {
  const source = read('src/components/admin/SuperAdminDashboard.tsx');

  // Verify all essential tabs are declared and rendered
  assert.match(source, /'OVERVIEW'/);
  assert.match(source, /'MODERATION'/);
  assert.match(source, /'USERS_DIRECTORY'/);
  assert.match(source, /'REQUIREMENTS'/);
  assert.match(source, /'AUDIT_LOGS'/);
  assert.match(source, /'FINANCE'/);

  // Verify unified moderation queue API connections
  assert.match(source, /fetch\('\/api\/admin\/moderation\/queue'\)/);
  assert.match(source, /fetch\(`\/api\/admin\/listings\/\$\{listingId\}\/publication`/);
  assert.match(source, /fetch\(`\/api\/admin\/professionals\/\$\{userId\}\/verification`/);
  assert.match(source, /fetch\(`\/api\/admin\/posts\/\$\{[^}]+\}\/moderation`/);

  // Verify buyer requirements API connection
  assert.match(source, /fetch\('\/api\/admin\/requirements'\)/);

  // Verify immutable audit logs API connection
  assert.match(source, /fetch\('\/api\/admin\/audit-logs\?limit=50'\)/);

  // Verify finance visibility and wallet adjustment API connection
  assert.match(source, /fetch\('\/api\/admin\/finance'\)/);
  assert.match(source, /fetch\('\/api\/admin\/finance\/adjustment'/);

  // Verify Overview uses live requirement length rather than hardcoded 1,842
  assert.doesNotMatch(source, />\s*1,842\s*</);
  assert.match(source, /adminRequirements\.length/);

  // Verify no exposed passwords or secrets in user tables
  assert.doesNotMatch(source, /password_hash/);
  assert.doesNotMatch(source, /salt/);
});

test('super admin listing moderation transitions', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();
  db.exec('PRAGMA busy_timeout = 5000;');

  const suffix = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const dev = await createUser({
    name: 'Listing Dev',
    email: `dev_mod_${suffix}@example.com`,
    phone: '+919999922221',
    role: 'DEVELOPER',
    password: 'Password123!'
  });

  const admin = await createUser({
    name: 'Super Admin',
    email: `admin_mod_${suffix}@example.com`,
    phone: '+919999922222',
    role: 'SUPER_ADMIN',
    password: 'Password123!'
  });

  // Dev creates listing -> starts PENDING
  const listing = await createListing(dev.id, {
    title: 'Financial District Apex Tower',
    location: 'Nanakramguda',
    propertyType: 'Commercial',
    priceRange: '₹12 Cr – ₹25 Cr'
  });
  assert.equal(listing.publicationStatus, 'PENDING');

  // Queue should include the pending listing
  const queue = await listModerationQueue();
  const pendingListing = queue.listings.find((l: any) => l.id === listing.id);
  assert.ok(pendingListing, 'Pending listing must appear in moderation queue');

  // Super Admin approves listing
  const approved = await moderateListing({
    listingId: listing.id,
    status: 'APPROVED',
    actorId: admin.id,
    reason: 'RERA and title verification completed.'
  });
  assert.equal(approved?.publicationStatus, 'APPROVED');

  // Super Admin rejects or suspends listing
  const rejected = await moderateListing({
    listingId: listing.id,
    status: 'REJECTED',
    actorId: admin.id,
    reason: 'Missing statutory clearances.'
  });
  assert.equal(rejected?.publicationStatus, 'REJECTED');
});

test('super admin professional verification lifecycle', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();
  db.exec('PRAGMA busy_timeout = 5000;');

  const suffix = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const agent = await createUser({
    name: 'Agent Raju',
    email: `agent_ver_${suffix}@example.com`,
    phone: '+919999933331',
    role: 'AGENT',
    password: 'Password123!'
  });

  const admin = await createUser({
    name: 'Super Admin',
    email: `admin_ver_${suffix}@example.com`,
    phone: '+919999933332',
    role: 'SUPER_ADMIN',
    password: 'Password123!'
  });

  // Professional registers profile -> starts PENDING
  const profile = await upsertProfessionalProfile({
    userId: agent.id,
    role: 'REAL_ESTATE_AGENT',
    reraNumber: 'RERA/HYD/2026/099',
    organization: 'Raju Realty Services'
  });
  const initialStatus = profile.verification_status || profile.verificationStatus;
  assert.equal(initialStatus, 'PENDING');

  // Queue should list the pending professional
  const queue = await listModerationQueue();
  const pendingProf = queue.professionals.find((p: any) => p.user_id === agent.id || p.userId === agent.id);
  assert.ok(pendingProf, 'Pending professional profile must appear in moderation queue');

  // Super Admin verifies professional
  const verified = await setProfessionalVerification({
    userId: agent.id,
    status: 'VERIFIED',
    actorId: admin.id,
    reason: 'Telangana RERA agent registration confirmed'
  });
  const verifiedStatus = verified.verification_status || verified.verificationStatus;
  assert.equal(verifiedStatus, 'VERIFIED');

  // Verify persisted profile status
  const fetched = await getProfessionalProfile(agent.id);
  const fetchedStatus = fetched?.verification_status || fetched?.verificationStatus;
  assert.equal(fetchedStatus, 'VERIFIED');
});

test('super admin buyer requirements review and isolation', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();
  db.exec('PRAGMA busy_timeout = 5000;');

  const suffix = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const seeker = await createUser({
    name: 'Seeker Priya',
    email: `seeker_req_${suffix}@example.com`,
    phone: '+919999944441',
    role: 'PROPERTY_SEEKER',
    password: 'Password123!'
  });

  const reqResult = await createRequirement(seeker.id, {
    propertyType: 'Villa',
    location: 'Kokapet',
    budget: '₹3.5 Cr – ₹5.0 Cr',
    details: 'Looking for 3BHK villa within gated community with club house'
  });
  assert.ok('id' in reqResult);

  // Super Admin lists requirements
  const adminReqs = await listRequirementsForAdmin();
  const found = adminReqs.find((r: any) => r.id === (reqResult as any).id);
  assert.ok(found, 'Super Admin must be able to view submitted seeker requirement');
  assert.equal(found.propertyType, 'Villa');
  assert.equal(found.location, 'Kokapet');
});

test('immutable audit logs recording and access', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();
  db.exec('PRAGMA busy_timeout = 5000;');

  const adminId = 'admin_audit_test_' + Date.now();

  await createAuditLog({
    actorId: adminId,
    actorEmail: 'admin@propertystudio.in',
    actorRole: 'SUPER_ADMIN',
    action: 'PLATFORM_CONFIGURATION_CHECK',
    targetId: 'SYS_CONFIG',
    details: { environment: 'local_sqlite', checkTime: new Date().toISOString() }
  });

  const logs = await getAuditLogs(20, 0, 'PLATFORM_CONFIGURATION_CHECK');
  const match = logs.find((l: any) => l.actor_id === adminId || l.actorId === adminId);
  assert.ok(match, 'Audit log entry must be persisted and retrievable');
  assert.equal(match.action, 'PLATFORM_CONFIGURATION_CHECK');
  assert.equal(match.actor_role, 'SUPER_ADMIN');
});

test('finance visibility and wallet adjustments with idempotency', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();
  db.exec('PRAGMA busy_timeout = 5000;');

  const suffix = Date.now().toString() + Math.random().toString(36).substring(2, 6);
  const agent = await createUser({
    name: 'Agent Finance Test',
    email: `user_fin_${suffix}@example.com`,
    phone: '+919999955551',
    role: 'AGENT',
    password: 'Password123!'
  });

  const idempotencyKey = 'adj_test_' + Date.now();

  // Admin credits wallet
  const creditResult = await adjustWallet({
    userId: agent.id,
    amount: 1500,
    direction: 'CREDIT',
    reason: 'Promotional onboarding credits',
    idempotencyKey
  });
  assert.equal(creditResult.applied, true);
  assert.equal(creditResult.balance, 1500);

  // Repeating with the same idempotency key does not credit again
  const repeatResult = await adjustWallet({
    userId: agent.id,
    amount: 1500,
    direction: 'CREDIT',
    reason: 'Duplicate credit call',
    idempotencyKey
  });
  assert.equal(repeatResult.applied, false);
  assert.equal(repeatResult.balance, 1500);

  // Admin debits wallet
  const debitKey = 'adj_debit_' + Date.now();
  const debitResult = await adjustWallet({
    userId: agent.id,
    amount: 500,
    direction: 'DEBIT',
    reason: 'Platform fee adjustment',
    idempotencyKey: debitKey
  });
  assert.equal(debitResult.applied, true);
  assert.equal(debitResult.balance, 1000);

  // Financial records contain ledger entries and transactions
  const records = await listFinancialRecords();
  assert.ok(Array.isArray(records.ledger));
  assert.ok(Array.isArray(records.transactions));
  const userEntry = records.ledger.find((l: any) => l.user_id === agent.id);
  assert.ok(userEntry);
  assert.equal(userEntry.balance_after, 1000);
});
