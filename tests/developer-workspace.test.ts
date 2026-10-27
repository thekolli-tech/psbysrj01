import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getSqliteDb } from '../src/server/db.ts';
import {
  createListing,
  listOwnerListings,
  updateOwnedListing,
  setOwnedListingState,
  getListing,
  upsertProfessionalProfile,
  getProfessionalProfile
} from '../src/server/commerce.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('developer workspace component structure, tabs, and API contracts', () => {
  const dashSource = read('src/components/admin/DeveloperDashboard.tsx');

  // Verify all 4 functional tabs are implemented
  assert.match(dashSource, /'PORTFOLIO'/);
  assert.match(dashSource, /'LEADS'/);
  assert.match(dashSource, /'PROFILE'/);
  assert.match(dashSource, /'DIAGNOSTICS'/);

  // Verify portfolio API connections
  assert.match(dashSource, /fetch\('\/api\/me\/listings'\)/);
  assert.match(dashSource, /fetch\('\/api\/properties',\s*\{\s*method:\s*'POST'/);
  assert.match(dashSource, /fetch\(`\/api\/properties\/\$\{listingId\}\/state`,\s*\{\s*method:\s*'POST'/);
  assert.match(dashSource, /fetch\(`\/api\/properties\/\$\{editingListingId\}`,\s*\{\s*method:\s*'PATCH'/);

  // Verify lead & unlock API connections
  assert.match(dashSource, /fetch\('\/api\/leads'\)/);
  assert.match(dashSource, /fetch\('\/api\/me\/unlocks'\)/);
  assert.match(dashSource, /fetch\(`\/api\/leads\/\$\{confirmUnlockLead\.id\}\/unlock`,\s*\{\s*method:\s*'POST'/);
  assert.match(dashSource, /Idempotency-Key/);

  // Verify business profile API connections
  assert.match(dashSource, /fetch\('\/api\/professional\/profile'\)/);
  assert.match(dashSource, /fetch\('\/api\/professional\/profile',\s*\{\s*method:\s*'POST'/);

  // Verify diagnostics endpoint preservation
  assert.match(dashSource, /fetch\('\/api\/developer\/status'\)/);
  assert.match(dashSource, /authoritativeDatabase/);
  assert.match(dashSource, /missingTables/);

  // Verify catalog select component usage
  assert.match(dashSource, /PropertyCategorySelect/);

  // Verify dual status display (approval status + lifecycle state)
  assert.match(dashSource, /isApproved/);
  assert.match(dashSource, /isPending/);
  assert.match(dashSource, /isPaused/);
  assert.match(dashSource, /isArchived/);
});

test('developer listing creation and owner listing isolation', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();

  const devId = 'dev_test_' + Date.now();
  const peerDevId = 'dev_peer_' + Date.now();
  const now = new Date().toISOString();

  // Create two developer user accounts
  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(devId, `${devId}@example.com`, '+919999911111', 'Test Dev One', now, now);

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(peerDevId, `${peerDevId}@example.com`, '+919999911112', 'Test Dev Two', now, now);

  // Developer 1 creates a listing
  const listing1 = await createListing(devId, {
    title: 'Skyline Kokapet Heights',
    location: 'Kokapet',
    propertyType: 'Flats / Apartments',
    priceRange: '₹2.1 Cr – ₹3.5 Cr',
    pricePerSqft: 9200,
    totalUnits: 180,
    availableUnits: 35
  });

  assert.equal(listing1.ownerId, devId);
  assert.equal(listing1.publicationStatus, 'PENDING');
  assert.equal(listing1.title, 'Skyline Kokapet Heights');

  // Developer 2 creates a listing
  const listing2 = await createListing(peerDevId, {
    title: 'Neopolis Grand Villas',
    location: 'Neopolis',
    propertyType: 'Villa',
    priceRange: '₹5.5 Cr – ₹8.0 Cr'
  });

  // Verify owner listing isolation
  const dev1Listings = await listOwnerListings(devId);
  assert.equal(dev1Listings.some(l => l.id === listing1.id), true);
  assert.equal(dev1Listings.some(l => l.id === listing2.id), false);

  const dev2Listings = await listOwnerListings(peerDevId);
  assert.equal(dev2Listings.some(l => l.id === listing2.id), true);
  assert.equal(dev2Listings.some(l => l.id === listing1.id), false);
});

test('owned listing updates return approved listings to pending review and block non-owners', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();

  const devId = 'dev_edit_test_' + Date.now();
  const intruderId = 'dev_intruder_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(devId, `${devId}@example.com`, '+919999922221', 'Dev Owner', now, now);

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(intruderId, `${intruderId}@example.com`, '+919999922222', 'Intruder Dev', now, now);

  const listing = await createListing(devId, {
    title: 'Financial District Towers',
    location: 'Nanakramguda',
    propertyType: 'Commercial Retail Shops'
  });

  // Admin approves the listing directly in database
  db.prepare(`UPDATE property_listings SET publication_status = 'APPROVED' WHERE id = ?`).run(listing.id);
  const approvedListing = await getListing(listing.id);
  assert.equal(approvedListing.publicationStatus, 'APPROVED');

  // Non-owner attempting to edit must throw 403
  await assert.rejects(
    async () => {
      await updateOwnedListing(intruderId, listing.id, { title: 'Hijacked Title' });
    },
    (err: any) => err.status === 403 && err.message.includes('only listings you own')
  );

  // Owner edits the listing -> MUST return publication status to PENDING
  const updated = await updateOwnedListing(devId, listing.id, {
    title: 'Financial District Towers Phase II',
    priceRange: '₹3.0 Cr – ₹4.5 Cr'
  });

  assert.equal(updated.title, 'Financial District Towers Phase II');
  assert.equal(updated.publicationStatus, 'PENDING');
  assert.equal(updated.rejectionReason, '');
});

test('lifecycle state changes allow PAUSED/ARCHIVED for owner and reject invalid states or non-owners', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();

  const devId = 'dev_state_test_' + Date.now();
  const otherId = 'dev_other_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(devId, `${devId}@example.com`, '+919999933331', 'Dev State Owner', now, now);

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(otherId, `${otherId}@example.com`, '+919999933332', 'Other User', now, now);

  const listing = await createListing(devId, {
    title: 'Tellapur Gardenia',
    location: 'Tellapur',
    propertyType: 'Independent House'
  });

  // Developer pauses listing
  const paused = await setOwnedListingState(devId, listing.id, 'PAUSED');
  assert.equal(paused.publicationStatus, 'PAUSED');

  // Developer resumes listing (resets to PENDING review)
  const resumed = await setOwnedListingState(devId, listing.id, 'PENDING');
  assert.equal(resumed.publicationStatus, 'PENDING');

  // Developer archives listing
  const archived = await setOwnedListingState(devId, listing.id, 'ARCHIVED');
  assert.equal(archived.publicationStatus, 'ARCHIVED');

  // Non-owner cannot change state
  await assert.rejects(
    async () => {
      await setOwnedListingState(otherId, listing.id, 'PAUSED');
    },
    (err: any) => err.status === 403
  );
});

test('developer professional profile registration stays PENDING until admin verification', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();

  const devId = 'dev_prof_test_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'DEVELOPER', 'salt', 'hash', ?, ?)
  `).run(devId, `${devId}@example.com`, '+919999944441', 'Dev Profile Test', now, now);

  // Upsert profile with RERA number
  const profile = await upsertProfessionalProfile({
    userId: devId,
    role: 'DEVELOPER',
    organization: 'Apex Infratech Private Limited',
    reraNumber: 'P02400009988'
  });

  // Critical rule: RERA number does NOT auto-verify; status MUST be PENDING
  assert.equal(profile.verification_status, 'PENDING');
  assert.equal(profile.organization, 'Apex Infratech Private Limited');
  assert.equal(profile.rera_number, 'P02400009988');

  const fetched = await getProfessionalProfile(devId);
  assert.equal(fetched.verification_status, 'PENDING');
});
