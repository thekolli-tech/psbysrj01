import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('SQLite lead unlock charges once', async () => {
  const dbPath = '/tmp/propertystudio-unlock-test.db';
  fs.rmSync(dbPath, { force: true });
  delete process.env.DATABASE_URL;
  delete process.env.NODE_ENV;
  process.env.DB_ENGINE = 'sqlite';
  process.env.SQLITE_PATH = dbPath;

  const { initDatabase, createUser, getSqliteDb } = await import('../src/server/db.ts');
  const { createEnquiry, unlockLead, upsertProfessionalProfile, setProfessionalVerification } = await import('../src/server/commerce.ts');
  await initDatabase();

  const seeker = await createUser({ name: 'Seeker', email: 'seeker.unlock@example.com', role: 'PROPERTY_SEEKER', password: 'SeekerPass123!' });
  const professional = await createUser({ name: 'Partner', email: 'partner.unlock@example.com', role: 'CHANNEL_PARTNER', password: 'PartnerPass123!' });
  getSqliteDb().prepare('UPDATE users SET wallet_balance = ? WHERE id = ?').run(1000, professional.id);
  await upsertProfessionalProfile({ userId: professional.id, role: 'CHANNEL_PARTNER', reraNumber: 'A00000000000' });
  const profile = await setProfessionalVerification({ userId: professional.id, status: 'VERIFIED', actorId: 'test' });
  assert.equal(profile.verification_status, 'VERIFIED');

  const leadId = await createEnquiry({
    seekerId: seeker.id,
    name: 'Seeker Example',
    phone: '+91 90000 11111',
    email: 'seeker.unlock@example.com',
    budget: '1 Cr',
    propertyType: 'Plot',
    microMarket: 'Tellapur',
    consentGranted: true,
    consentVersion: '2026-10-15',
    consentPurpose: 'enquiry response'
  });

  const [first, second] = await Promise.all([
    unlockLead({ leadId, professionalId: professional.id, professionalRole: 'CHANNEL_PARTNER', idempotencyKey: 'k1' }),
    unlockLead({ leadId, professionalId: professional.id, professionalRole: 'CHANNEL_PARTNER', idempotencyKey: 'k2' })
  ]);
  const charges = [first.charged, second.charged].sort((a, b) => a - b);
  assert.deepEqual(charges, [0, 300]);
  const balance = getSqliteDb().prepare('SELECT wallet_balance FROM users WHERE id = ?').get(professional.id) as { wallet_balance: number };
  assert.equal(Number(balance.wallet_balance), 700);
  const ledger = getSqliteDb().prepare('SELECT COUNT(*) as count FROM wallet_ledger WHERE user_id = ?').get(professional.id) as { count: number };
  assert.equal(Number(ledger.count), 1);
  assert.equal(first.lead.seekerPhone.includes('1111') || second.lead.seekerPhone.includes('1111'), true);
});
