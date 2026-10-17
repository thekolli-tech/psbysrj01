import crypto from 'node:crypto';
import { getPostgresPool, queryPostgres } from './postgres.ts';
import { getSqliteDb, isPostgresAuthoritative, isSqliteExplicit } from './db.ts';
import { evaluateUnlock, type PaymentGate, type UnlockDecision } from '../shared/ledger.ts';
import {
  initialVerificationStatus,
  isPublicListing,
  listingEligibleForLeads,
  maskEmail,
  maskName,
  maskPhone,
  paymentGrantsAccess,
  paymentProviderStatus
} from '../shared/policy.ts';

export class CommerceError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let sqliteChain: Promise<unknown> = Promise.resolve();

function withSqliteLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = sqliteChain.then(fn, fn);
  sqliteChain = run.then(() => undefined, () => undefined);
  return run;
}

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function paymentsStatus(): 'CONFIGURED' | 'NOT_CONFIGURED' {
  return paymentProviderStatus({
    PAYMENT_PROVIDER: process.env.PAYMENT_PROVIDER,
    PAYMENT_WEBHOOK_SECRET: process.env.PAYMENT_WEBHOOK_SECRET
  });
}

function unlockPaymentGate(): PaymentGate {
  return paymentsStatus() === 'CONFIGURED' ? 'WALLET' : 'NOT_CONFIGURED';
}

function rejectUnlock(decision: UnlockDecision): void {
  if (decision.outcome !== 'DENY') return;
  if (decision.reason === 'Payment provider is NOT_CONFIGURED.') {
    throw new CommerceError(
      503,
      'NOT_CONFIGURED',
      'Payment provider is NOT_CONFIGURED. No charge was created and no contact details were revealed.'
    );
  }
  throw new CommerceError(402, 'UNLOCK_DENIED', decision.reason || 'Unlock denied.');
}

export async function upsertProfessionalProfile(input: {
  userId: string;
  role: string;
  reraNumber?: string;
  organization?: string;
}): Promise<any> {
  const status = initialVerificationStatus(input.reraNumber);
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    const existing = await queryPostgres('SELECT verification_status FROM professional_profiles WHERE user_id = $1', [input.userId]);
    if (existing.rows.length === 0) {
      await queryPostgres(
        `INSERT INTO professional_profiles (user_id, professional_role, rera_number, organization, verification_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $6)`,
        [input.userId, input.role, input.reraNumber || null, input.organization || null, status, now]
      );
    } else {
      await queryPostgres(
        `UPDATE professional_profiles
         SET professional_role = $2, rera_number = $3, organization = $4, verification_status = 'PENDING', rejection_reason = NULL, updated_at = $5
         WHERE user_id = $1`,
        [input.userId, input.role, input.reraNumber || null, input.organization || null, now]
      );
    }
  } else {
    requireSqlite();
    const db = getSqliteDb();
    const existing = db.prepare('SELECT verification_status FROM professional_profiles WHERE user_id = ?').get(input.userId) as { verification_status: string } | undefined;
    if (!existing) {
      db.prepare(
        `INSERT INTO professional_profiles (user_id, professional_role, rera_number, organization, verification_status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(input.userId, input.role, input.reraNumber || null, input.organization || null, status, now, now);
    } else {
      db.prepare(
        `UPDATE professional_profiles
         SET professional_role = ?, rera_number = ?, organization = ?, verification_status = 'PENDING', rejection_reason = NULL, updated_at = ?
         WHERE user_id = ?`
      ).run(input.role, input.reraNumber || null, input.organization || null, now, input.userId);
    }
  }
  return getProfessionalProfile(input.userId);
}

export async function getProfessionalProfile(userId: string): Promise<any | null> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM professional_profiles WHERE user_id = $1', [userId]);
    return res.rows[0] || null;
  }
  requireSqlite();
  return getSqliteDb().prepare('SELECT * FROM professional_profiles WHERE user_id = ?').get(userId) || null;
}

export async function setProfessionalVerification(input: {
  userId: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  actorId: string;
  reason?: string;
}): Promise<any | null> {
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres(
      `UPDATE professional_profiles
       SET verification_status = $2, rejection_reason = $3, reviewed_by = $4, reviewed_at = $5, updated_at = $5
       WHERE user_id = $1 RETURNING *`,
      [input.userId, input.status, input.reason || null, input.actorId, now]
    );
    return res.rows[0] || null;
  }
  requireSqlite();
  const db = getSqliteDb();
  db.prepare(
    `UPDATE professional_profiles
     SET verification_status = ?, rejection_reason = ?, reviewed_by = ?, reviewed_at = ?, updated_at = ?
     WHERE user_id = ?`
  ).run(input.status, input.reason || null, input.actorId, now, now, input.userId);
  return getProfessionalProfile(input.userId);
}

export async function createListing(ownerId: string, payload: Record<string, unknown>): Promise<any> {
  const listingId = id('listing');
  const now = nowIso();
  const title = String(payload.title || '').trim();
  if (!title) throw new CommerceError(400, 'INVALID', 'A listing title is required.');
  const stored = JSON.stringify({ ...payload, title });
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO property_listings (id, owner_id, title, publication_status, payload, created_at, updated_at)
       VALUES ($1, $2, $3, 'PENDING', $4, $5, $5)`,
      [listingId, ownerId, title, stored, now]
    );
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `INSERT INTO property_listings (id, owner_id, title, publication_status, payload, created_at, updated_at)
       VALUES (?, ?, ?, 'PENDING', ?, ?, ?)`
    ).run(listingId, ownerId, title, stored, now, now);
  }
  return getListing(listingId);
}

export async function getListing(listingId: string): Promise<any | null> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM property_listings WHERE id = $1', [listingId]);
    return res.rows[0] ? mapListing(res.rows[0]) : null;
  }
  requireSqlite();
  const row = getSqliteDb().prepare('SELECT * FROM property_listings WHERE id = ?').get(listingId) as any;
  return row ? mapListing(row) : null;
}

function mapListing(row: any): any {
  let payload: any = {};
  try {
    payload = JSON.parse(row.payload || '{}');
  } catch {
    payload = {};
  }
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    publicationStatus: row.publication_status,
    rejectionReason: row.rejection_reason || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...payload,
    heroImage: payload.heroImage || '',
    galleryImages: Array.isArray(payload.galleryImages) ? payload.galleryImages : [],
    reraRegId: payload.reraRegId || '',
    priceRange: payload.priceRange || '',
    pricePerSqft: Number(payload.pricePerSqft || 0),
    microMarket: payload.microMarket || payload.location || '',
    location: payload.location || '',
    propertyType: payload.propertyType || '',
    ratings: payload.ratings || { constructionQuality: 0, deliveryTimelines: 0, legalCompliance: 0, overallScore: 0, totalReviews: 0 },
    assignedAdmins: [],
    amenities: Array.isArray(payload.amenities) ? payload.amenities : [],
    highlights: Array.isArray(payload.highlights) ? payload.highlights : [],
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    floorPlans: Array.isArray(payload.floorPlans) ? payload.floorPlans : [],
    progressPercent: Number(payload.progressPercent || 0),
    totalUnits: Number(payload.totalUnits || 0),
    availableUnits: Number(payload.availableUnits || 0),
    developerName: payload.developerName || '',
    isClaimedByDeveloper: Boolean(payload.isClaimedByDeveloper),
    completionDate: payload.completionDate || ''
  };
}

export async function listPublicListings(): Promise<any[]> {
  const rows = await listListingRows();
  return rows.filter(row => isPublicListing(row.publication_status)).map(mapListing);
}

export async function listOwnerListings(ownerId: string): Promise<any[]> {
  const rows = await listListingRows(ownerId);
  return rows.map(mapListing);
}

async function listListingRows(ownerId?: string): Promise<any[]> {
  if (isPostgresAuthoritative()) {
    if (ownerId) {
      const res = await queryPostgres('SELECT * FROM property_listings WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
      return res.rows;
    }
    const res = await queryPostgres('SELECT * FROM property_listings ORDER BY created_at DESC');
    return res.rows;
  }
  requireSqlite();
  const db = getSqliteDb();
  if (ownerId) return db.prepare('SELECT * FROM property_listings WHERE owner_id = ? ORDER BY created_at DESC').all(ownerId) as any[];
  return db.prepare('SELECT * FROM property_listings ORDER BY created_at DESC').all() as any[];
}

export async function moderateListing(input: {
  listingId: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING' | 'PAUSED' | 'ARCHIVED';
  actorId: string;
  reason?: string;
}): Promise<any | null> {
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres(
      `UPDATE property_listings SET publication_status = $2, rejection_reason = $3, updated_at = $4 WHERE id = $1 RETURNING *`,
      [input.listingId, input.status, input.reason || null, now]
    );
    if (!res.rows[0]) return null;
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `UPDATE property_listings SET publication_status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`
    ).run(input.status, input.reason || null, now, input.listingId);
  }
  await recordModeration(input.actorId, 'LISTING', input.listingId, input.status, input.reason);
  return getListing(input.listingId);
}

export async function createEnquiry(input: {
  seekerId: string;
  name: string;
  phone: string;
  email?: string;
  budget: string;
  propertyType: string;
  microMarket: string;
  requirements?: string;
  propertyId?: string;
  tier?: string;
  price?: number;
  consentGranted: boolean;
  consentVersion: string;
  consentPurpose: string;
}): Promise<string> {
  if (!input.consentGranted) {
    throw new CommerceError(400, 'CONSENT_REQUIRED', 'Contact details cannot be stored without explicit consent.');
  }
  if (!input.consentVersion || !input.consentPurpose) {
    throw new CommerceError(400, 'CONSENT_REQUIRED', 'Consent version and purpose are required.');
  }
  if (input.propertyId) {
    const listing = await getListing(input.propertyId);
    if (!listing || !listingEligibleForLeads(listing.publicationStatus)) {
      throw new CommerceError(400, 'LISTING_NOT_ELIGIBLE', 'Enquiries can only be attached to an approved listing.');
    }
  }
  const leadId = id('lead');
  const now = nowIso();
  const tier = input.tier || 'STANDARD';
  const price = Number(input.price ?? defaultLeadPrice(tier));
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO buyer_leads (
        id, name, phone, email, budget, property_type, micro_market, tier, price, requirements, status, created_at,
        seeker_id, property_id, consent_granted, consent_version, consent_purpose, consented_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'AVAILABLE',$11,$12,$13,1,$14,$15,$11)`,
      [
        leadId, input.name, input.phone, input.email || '', input.budget, input.propertyType, input.microMarket,
        tier, price, input.requirements || '', now, input.seekerId, input.propertyId || null,
        input.consentVersion, input.consentPurpose
      ]
    );
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `INSERT INTO buyer_leads (
        id, name, phone, email, budget, property_type, micro_market, tier, price, requirements, status, created_at,
        seeker_id, property_id, consent_granted, consent_version, consent_purpose, consented_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'AVAILABLE', ?, ?, ?, 1, ?, ?, ?)`
    ).run(
      leadId, input.name, input.phone, input.email || '', input.budget, input.propertyType, input.microMarket,
      tier, price, input.requirements || '', now, input.seekerId, input.propertyId || null,
      input.consentVersion, input.consentPurpose, now
    );
  }
  return leadId;
}

function defaultLeadPrice(tier: string): number {
  if (tier === 'HNI') return 2000;
  if (tier === 'PREMIUM') return 750;
  return 300;
}

export async function listLeadsForViewer(viewer: { id: string; role: string }): Promise<any[]> {
  const rows = await allLeadRows();
  const unlocks = await unlocksForProfessional(viewer.id);
  const unlockedIds = new Set(unlocks.map(row => row.lead_id));
  const admin = viewer.role === 'SUPER_ADMIN' || viewer.role === 'DEVELOPER';
  return rows.map(row => presentLead(row, {
    revealed: admin || row.seeker_id === viewer.id || unlockedIds.has(row.id)
  }));
}

function presentLead(row: any, opts: { revealed: boolean }): any {
  const revealed = opts.revealed;
  return {
    id: row.id,
    seekerName: revealed ? row.name : maskName(row.name),
    seekerPhone: revealed ? row.phone : maskPhone(row.phone),
    seekerEmail: revealed ? row.email : maskEmail(row.email),
    revealed,
    budget: row.budget,
    budgetMinLakhs: 0,
    microMarket: row.micro_market,
    propertyType: row.property_type,
    propertyId: row.property_id || '',
    timeframe: 'Next 30-45 Days',
    requirements: row.requirements || '',
    tier: row.tier || 'STANDARD',
    priceCredits: Number(row.price || 0),
    isUnlocked: revealed,
    createdAt: row.created_at,
    consentVersion: row.consent_version || '',
    consentGranted: Boolean(row.consent_granted)
  };
}

async function allLeadRows(): Promise<any[]> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM buyer_leads ORDER BY created_at DESC');
    return res.rows;
  }
  requireSqlite();
  return getSqliteDb().prepare('SELECT * FROM buyer_leads ORDER BY created_at DESC').all() as any[];
}

async function unlocksForProfessional(professionalId: string): Promise<any[]> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM lead_unlocks WHERE professional_id = $1', [professionalId]);
    return res.rows;
  }
  requireSqlite();
  return getSqliteDb().prepare('SELECT * FROM lead_unlocks WHERE professional_id = ?').all(professionalId) as any[];
}

export async function unlockLead(input: {
  leadId: string;
  professionalId: string;
  professionalRole: string;
  idempotencyKey: string;
}): Promise<{ revealed: boolean; charged: number; balance: number; lead: any }> {
  const profile = await getProfessionalProfile(input.professionalId);
  const verified = profile?.verification_status === 'VERIFIED' || input.professionalRole === 'SUPER_ADMIN' || input.professionalRole === 'DEVELOPER';
  if (isPostgresAuthoritative()) {
    return unlockLeadPostgres({ ...input, verified: Boolean(verified) });
  }
  return withSqliteLock(() => unlockLeadSqlite({ ...input, verified: Boolean(verified) }));
}

async function unlockLeadPostgres(input: {
  leadId: string;
  professionalId: string;
  idempotencyKey: string;
  verified: boolean;
}): Promise<{ revealed: boolean; charged: number; balance: number; lead: any }> {
  const pool = getPostgresPool();
  if (!pool) throw new CommerceError(503, 'DB_UNAVAILABLE', 'PostgreSQL is not configured.');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const leadRes = await client.query('SELECT * FROM buyer_leads WHERE id = $1 FOR UPDATE', [input.leadId]);
    const lead = leadRes.rows[0];
    if (!lead) throw new CommerceError(404, 'NOT_FOUND', 'Enquiry not found.');
    const userRes = await client.query('SELECT id, wallet_balance FROM users WHERE id = $1 FOR UPDATE', [input.professionalId]);
    const user = userRes.rows[0];
    if (!user) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
    const existing = await client.query(
      'SELECT * FROM lead_unlocks WHERE (lead_id = $1 AND professional_id = $2) OR idempotency_key = $3',
      [input.leadId, input.professionalId, input.idempotencyKey]
    );
    const listingOk = await listingOkForLead(lead.property_id);
    const decision = evaluateUnlock(
      {
        balance: Number(user.wallet_balance || 0),
        alreadyUnlocked: existing.rows.some((row: any) => row.lead_id === input.leadId && row.professional_id === input.professionalId),
        idempotencyReplay: existing.rows.some((row: any) => row.idempotency_key === input.idempotencyKey)
      },
      {
        price: Number(lead.price || 0),
        verifiedProfessional: input.verified,
        consentRecorded: Number(lead.consent_granted) === 1,
        listingEligible: listingOk,
        paymentGate: unlockPaymentGate()
      }
    );
    rejectUnlock(decision);
    if (decision.outcome === 'DEBIT_AND_REVEAL') {
      const updated = await client.query(
        'UPDATE users SET wallet_balance = wallet_balance - $1, updated_at = $2 WHERE id = $3 AND wallet_balance >= $1 RETURNING wallet_balance',
        [decision.charge, nowIso(), input.professionalId]
      );
      if (updated.rowCount !== 1) throw new CommerceError(402, 'UNLOCK_DENIED', 'Insufficient wallet balance.');
      const ledgerId = id('ledger');
      await client.query(
        `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
         VALUES ($1, $2, 'DEBIT', $3, $4, 'LEAD_UNLOCK', $5, $6, 'POSTED', $7)`,
        [ledgerId, input.professionalId, decision.charge, Number(updated.rows[0].wallet_balance), input.leadId, input.idempotencyKey, nowIso()]
      );
      await client.query(
        `INSERT INTO lead_unlocks (id, lead_id, professional_id, idempotency_key, amount, ledger_id, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id('unlock'), input.leadId, input.professionalId, input.idempotencyKey, decision.charge, ledgerId, nowIso()]
      );
    }
    const balanceRes = await client.query('SELECT wallet_balance FROM users WHERE id = $1', [input.professionalId]);
    await client.query('COMMIT');
    return {
      revealed: true,
      charged: decision.charge,
      balance: Number(balanceRes.rows[0].wallet_balance),
      lead: presentLead(lead, { revealed: true })
    };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function unlockLeadSqlite(input: {
  leadId: string;
  professionalId: string;
  idempotencyKey: string;
  verified: boolean;
}): Promise<{ revealed: boolean; charged: number; balance: number; lead: any }> {
  requireSqlite();
  const db = getSqliteDb();
  db.exec('BEGIN IMMEDIATE');
  try {
    const lead = db.prepare('SELECT * FROM buyer_leads WHERE id = ?').get(input.leadId) as any;
    if (!lead) throw new CommerceError(404, 'NOT_FOUND', 'Enquiry not found.');
    const user = db.prepare('SELECT id, wallet_balance FROM users WHERE id = ?').get(input.professionalId) as any;
    if (!user) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
    const existing = db.prepare(
      'SELECT * FROM lead_unlocks WHERE (lead_id = ? AND professional_id = ?) OR idempotency_key = ?'
    ).all(input.leadId, input.professionalId, input.idempotencyKey) as any[];
    const listingOk = await listingOkForLead(lead.property_id);
    const decision = evaluateUnlock(
      {
        balance: Number(user.wallet_balance || 0),
        alreadyUnlocked: existing.some(row => row.lead_id === input.leadId && row.professional_id === input.professionalId),
        idempotencyReplay: existing.some(row => row.idempotency_key === input.idempotencyKey)
      },
      {
        price: Number(lead.price || 0),
        verifiedProfessional: input.verified,
        consentRecorded: Number(lead.consent_granted) === 1,
        listingEligible: listingOk,
        paymentGate: unlockPaymentGate()
      }
    );
    rejectUnlock(decision);
    if (decision.outcome === 'DEBIT_AND_REVEAL') {
      const updated = db.prepare(
        'UPDATE users SET wallet_balance = wallet_balance - ?, updated_at = ? WHERE id = ? AND wallet_balance >= ?'
      ).run(decision.charge, nowIso(), input.professionalId, decision.charge);
      if (Number(updated.changes) !== 1) throw new CommerceError(402, 'UNLOCK_DENIED', 'Insufficient wallet balance.');
      const balanceRow = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(input.professionalId) as any;
      const ledgerId = id('ledger');
      db.prepare(
        `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
         VALUES (?, ?, 'DEBIT', ?, ?, 'LEAD_UNLOCK', ?, ?, 'POSTED', ?)`
      ).run(ledgerId, input.professionalId, decision.charge, Number(balanceRow.wallet_balance), input.leadId, input.idempotencyKey, nowIso());
      db.prepare(
        `INSERT INTO lead_unlocks (id, lead_id, professional_id, idempotency_key, amount, ledger_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      ).run(id('unlock'), input.leadId, input.professionalId, input.idempotencyKey, decision.charge, ledgerId, nowIso());
    }
    const balanceRow = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(input.professionalId) as any;
    db.exec('COMMIT');
    return {
      revealed: true,
      charged: decision.charge,
      balance: Number(balanceRow.wallet_balance),
      lead: presentLead(lead, { revealed: true })
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

async function listingOkForLead(propertyId?: string | null): Promise<boolean> {
  if (!propertyId) return true;
  const listing = await getListing(propertyId);
  return Boolean(listing && listingEligibleForLeads(listing.publicationStatus));
}

export async function recordPaymentAttempt(input: {
  userId: string;
  amount: number;
  purpose: string;
  idempotencyKey: string;
}): Promise<{ status: 'NOT_CONFIGURED' | 'PENDING'; transactionId?: string }> {
  if (paymentsStatus() !== 'CONFIGURED') {
    return { status: 'NOT_CONFIGURED' };
  }
  const transactionId = id('pay');
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO payment_transactions (id, user_id, provider, amount, purpose, status, idempotency_key, created_at)
       VALUES ($1, $2, $3, $4, $5, 'PENDING', $6, $7)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [transactionId, input.userId, String(process.env.PAYMENT_PROVIDER || ''), input.amount, input.purpose, input.idempotencyKey, now]
    );
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `INSERT OR IGNORE INTO payment_transactions (id, user_id, provider, amount, purpose, status, idempotency_key, created_at)
       VALUES (?, ?, ?, ?, ?, 'PENDING', ?, ?)`
    ).run(transactionId, input.userId, String(process.env.PAYMENT_PROVIDER || ''), input.amount, input.purpose, input.idempotencyKey, now);
  }
  return { status: 'PENDING', transactionId };
}

export function verifyPaymentWebhook(payload: string, signature: string | undefined): { accepted: boolean; status: string } {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || paymentsStatus() !== 'CONFIGURED') {
    return { accepted: false, status: 'NOT_CONFIGURED' };
  }
  if (!signature) return { accepted: false, status: 'FAILED' };
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !crypto.timingSafeEqual(left, right)) {
    return { accepted: false, status: 'FAILED' };
  }
  return { accepted: true, status: 'VERIFIED' };
}

export function revealAllowedAfterPayment(status: string): boolean {
  return paymentGrantsAccess(status);
}

export async function creditWalletFromVerifiedPayment(input: {
  userId: string;
  amount: number;
  idempotencyKey: string;
  providerRef?: string;
}): Promise<{ credited: boolean; balance: number }> {
  if (!paymentGrantsAccess('VERIFIED')) {
    return { credited: false, balance: 0 };
  }
  if (isPostgresAuthoritative()) {
    const pool = getPostgresPool();
    if (!pool) throw new CommerceError(503, 'DB_UNAVAILABLE', 'PostgreSQL is not configured.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM wallet_ledger WHERE idempotency_key = $1', [input.idempotencyKey]);
      const user = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [input.userId]);
      if (!user.rows[0]) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
      let balance = Number(user.rows[0].wallet_balance || 0);
      if (existing.rows.length === 0) {
        balance = Math.round((balance + input.amount) * 100) / 100;
        await client.query('UPDATE users SET wallet_balance = $1, updated_at = $2 WHERE id = $3', [balance, nowIso(), input.userId]);
        await client.query(
          `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
           VALUES ($1, $2, 'CREDIT', $3, $4, 'PAYMENT', $5, $6, 'POSTED', $7)`,
          [id('ledger'), input.userId, input.amount, balance, input.providerRef || null, input.idempotencyKey, nowIso()]
        );
        await client.query(
          `UPDATE payment_transactions SET status = 'VERIFIED', provider_ref = $2 WHERE idempotency_key = $1`,
          [input.idempotencyKey, input.providerRef || null]
        );
      }
      await client.query('COMMIT');
      return { credited: existing.rows.length === 0, balance };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return withSqliteLock(async () => {
    requireSqlite();
    const db = getSqliteDb();
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare('SELECT id FROM wallet_ledger WHERE idempotency_key = ?').get(input.idempotencyKey) as any;
      const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(input.userId) as any;
      if (!user) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
      let balance = Number(user.wallet_balance || 0);
      if (!existing) {
        balance = Math.round((balance + input.amount) * 100) / 100;
        db.prepare('UPDATE users SET wallet_balance = ?, updated_at = ? WHERE id = ?').run(balance, nowIso(), input.userId);
        db.prepare(
          `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
           VALUES (?, ?, 'CREDIT', ?, ?, 'PAYMENT', ?, ?, 'POSTED', ?)`
        ).run(id('ledger'), input.userId, input.amount, balance, input.providerRef || null, input.idempotencyKey, nowIso());
        db.prepare(`UPDATE payment_transactions SET status = 'VERIFIED', provider_ref = ? WHERE idempotency_key = ?`).run(input.providerRef || null, input.idempotencyKey);
      }
      db.exec('COMMIT');
      return { credited: !existing, balance };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  });
}

export async function listUnlockHistory(professionalId: string): Promise<any[]> {
  return unlocksForProfessional(professionalId);
}

export async function listModerationQueue(): Promise<{ posts: any[]; communities: any[]; listings: any[]; professionals: any[] }> {
  if (isPostgresAuthoritative()) {
    const [posts, communities, listings, professionals] = await Promise.all([
      queryPostgres(`SELECT * FROM community_posts WHERE status NOT IN ('APPROVED', 'PUBLISHED') ORDER BY created_at DESC`),
      queryPostgres(`SELECT * FROM communities WHERE status <> 'APPROVED' ORDER BY created_at DESC`),
      queryPostgres(`SELECT * FROM property_listings WHERE publication_status <> 'APPROVED' ORDER BY created_at DESC`),
      queryPostgres(`SELECT * FROM professional_profiles WHERE verification_status <> 'VERIFIED' ORDER BY updated_at DESC`)
    ]);
    return { posts: posts.rows, communities: communities.rows, listings: listings.rows, professionals: professionals.rows };
  }
  requireSqlite();
  const db = getSqliteDb();
  return {
    posts: db.prepare(`SELECT * FROM community_posts WHERE status NOT IN ('APPROVED', 'PUBLISHED') ORDER BY created_at DESC`).all() as any[],
    communities: db.prepare(`SELECT * FROM communities WHERE status <> 'APPROVED' ORDER BY created_at DESC`).all() as any[],
    listings: db.prepare(`SELECT * FROM property_listings WHERE publication_status <> 'APPROVED' ORDER BY created_at DESC`).all() as any[],
    professionals: db.prepare(`SELECT * FROM professional_profiles WHERE verification_status <> 'VERIFIED' ORDER BY updated_at DESC`).all() as any[]
  };
}

export async function moderatePost(input: {
  postId: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING_APPROVAL';
  actorId: string;
  reason?: string;
}): Promise<boolean> {
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres(
      `UPDATE community_posts SET status = $2, rejection_reason = $3, moderation_note = $3, updated_at = $4 WHERE id = $1`,
      [input.postId, input.status, input.reason || null, now]
    );
    if (res.rowCount === 0) return false;
  } else {
    requireSqlite();
    const result = getSqliteDb().prepare(
      `UPDATE community_posts SET status = ?, rejection_reason = ?, moderation_note = ?, updated_at = ? WHERE id = ?`
    ).run(input.status, input.reason || null, input.reason || null, now, input.postId);
    if (Number(result.changes) === 0) return false;
  }
  await recordModeration(input.actorId, 'POST', input.postId, input.status, input.reason);
  return true;
}

export async function suspendOrRestoreCommunity(input: {
  communityId: string;
  status: 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'PENDING_APPROVAL';
  actorId: string;
  reason?: string;
}): Promise<boolean> {
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres(
      `UPDATE communities SET status = $2, rejection_reason = $3, suspension_reason = $4, updated_at = $5 WHERE id = $1`,
      [input.communityId, input.status, input.status === 'REJECTED' ? input.reason || '' : '', input.status === 'SUSPENDED' ? input.reason || '' : '', now]
    );
    if (res.rowCount === 0) return false;
  } else {
    requireSqlite();
    const result = getSqliteDb().prepare(
      `UPDATE communities SET status = ?, rejection_reason = ?, suspension_reason = ?, updated_at = ? WHERE id = ?`
    ).run(input.status, input.status === 'REJECTED' ? input.reason || '' : '', input.status === 'SUSPENDED' ? input.reason || '' : '', now, input.communityId);
    if (Number(result.changes) === 0) return false;
  }
  await recordModeration(input.actorId, 'COMMUNITY', input.communityId, input.status, input.reason);
  return true;
}

async function recordModeration(actorId: string, targetType: string, targetId: string, action: string, reason?: string): Promise<void> {
  const now = nowIso();
  const actionId = id('modact');
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO moderation_actions (id, target_type, target_id, action, actor_id, reason, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [actionId, targetType, targetId, action, actorId, reason || null, now]
    );
    return;
  }
  requireSqlite();
  getSqliteDb().prepare(
    `INSERT INTO moderation_actions (id, target_type, target_id, action, actor_id, reason, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(actionId, targetType, targetId, action, actorId, reason || null, now);
}

export async function readSystemConfig(): Promise<Record<string, string>> {
  let rows: Array<{ key: string; value: string }> = [];
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT key, value FROM system_metadata');
    rows = res.rows;
  } else if (isSqliteExplicit()) {
    rows = getSqliteDb().prepare('SELECT key, value FROM system_metadata').all() as any[];
  }
  return Object.fromEntries(rows.map(row => [row.key, row.value]));
}

export async function updateOwnedListing(ownerId: string, listingId: string, patch: Record<string, unknown>): Promise<any | null> {
  const listing = await getListing(listingId);
  if (!listing) return null;
  if (listing.ownerId !== ownerId) {
    throw new CommerceError(403, 'FORBIDDEN', 'You can manage only listings you own.');
  }
  const payload = { ...listing, ...patch };
  for (const key of ['id', 'ownerId', 'publicationStatus', 'rejectionReason', 'createdAt', 'updatedAt', 'assignedAdmins']) {
    delete payload[key];
  }
  const title = String(payload.title || '').trim();
  if (!title) throw new CommerceError(400, 'INVALID', 'A listing title is required.');
  const now = nowIso();
  const stored = JSON.stringify(payload);
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `UPDATE property_listings SET title = $2, payload = $3, publication_status = 'PENDING', rejection_reason = NULL, updated_at = $4 WHERE id = $1 AND owner_id = $5`,
      [listingId, title, stored, now, ownerId]
    );
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `UPDATE property_listings SET title = ?, payload = ?, publication_status = 'PENDING', rejection_reason = NULL, updated_at = ? WHERE id = ? AND owner_id = ?`
    ).run(title, stored, now, listingId, ownerId);
  }
  return getListing(listingId);
}

export async function setOwnedListingState(ownerId: string, listingId: string, status: 'PAUSED' | 'ARCHIVED' | 'PENDING'): Promise<any | null> {
  const listing = await getListing(listingId);
  if (!listing) return null;
  if (listing.ownerId !== ownerId) {
    throw new CommerceError(403, 'FORBIDDEN', 'You can manage only listings you own.');
  }
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `UPDATE property_listings SET publication_status = $2, updated_at = $3 WHERE id = $1 AND owner_id = $4`,
      [listingId, status, now, ownerId]
    );
  } else {
    requireSqlite();
    getSqliteDb().prepare(
      `UPDATE property_listings SET publication_status = ?, updated_at = ? WHERE id = ? AND owner_id = ?`
    ).run(status, now, listingId, ownerId);
  }
  return getListing(listingId);
}

export async function listFinancialRecords(): Promise<{ payments: string; transactions: any[]; ledger: any[] }> {
  if (isPostgresAuthoritative()) {
    const [transactions, ledger] = await Promise.all([
      queryPostgres('SELECT id, user_id, provider, amount, purpose, status, idempotency_key, created_at FROM payment_transactions ORDER BY created_at DESC LIMIT 200'),
      queryPostgres('SELECT id, user_id, entry_type, amount, balance_after, reference_type, reference_id, status, created_at FROM wallet_ledger ORDER BY created_at DESC LIMIT 200')
    ]);
    return { payments: paymentsStatus(), transactions: transactions.rows, ledger: ledger.rows };
  }
  requireSqlite();
  const db = getSqliteDb();
  return {
    payments: paymentsStatus(),
    transactions: db.prepare('SELECT id, user_id, provider, amount, purpose, status, idempotency_key, created_at FROM payment_transactions ORDER BY created_at DESC LIMIT 200').all() as any[],
    ledger: db.prepare('SELECT id, user_id, entry_type, amount, balance_after, reference_type, reference_id, status, created_at FROM wallet_ledger ORDER BY created_at DESC LIMIT 200').all() as any[]
  };
}

export async function adjustWallet(input: {
  userId: string;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  reason: string;
  idempotencyKey: string;
}): Promise<{ balance: number; applied: boolean }> {
  if (!input.reason.trim()) throw new CommerceError(400, 'REASON_REQUIRED', 'A reason is required for a financial adjustment.');
  if (!(input.amount > 0) || !Number.isFinite(input.amount)) {
    throw new CommerceError(400, 'INVALID_AMOUNT', 'Adjustment amount must be greater than zero.');
  }
  const delta = input.direction === 'DEBIT' ? -input.amount : input.amount;
  return applyBalanceChange({
    userId: input.userId,
    delta,
    entryType: input.direction === 'DEBIT' ? 'ADJUSTMENT_DEBIT' : 'ADJUSTMENT_CREDIT',
    idempotencyKey: input.idempotencyKey,
    referenceType: 'ADJUSTMENT',
    referenceId: input.reason.slice(0, 120)
  });
}

export async function refundVerifiedPayment(input: {
  transactionId: string;
  idempotencyKey: string;
}): Promise<{ status: string; balance: number }> {
  const txn = await paymentById(input.transactionId);
  if (!txn) throw new CommerceError(404, 'NOT_FOUND', 'Payment transaction not found.');
  if (txn.status === 'REFUNDED') {
    const user = await userBalance(txn.user_id);
    return { status: 'REFUNDED', balance: user };
  }
  if (txn.status !== 'VERIFIED') {
    throw new CommerceError(409, 'NOT_REFUNDABLE', 'Only a verified payment can be refunded. Failed or unconfigured payments are not treated as successful.');
  }
  const result = await applyBalanceChange({
    userId: txn.user_id,
    delta: -Number(txn.amount),
    entryType: 'REFUND',
    idempotencyKey: input.idempotencyKey,
    referenceType: 'PAYMENT',
    referenceId: txn.id
  });
  await setPaymentStatus(txn.id, 'REFUNDED');
  return { status: 'REFUNDED', balance: result.balance };
}

export async function disputePayment(transactionId: string): Promise<{ status: string }> {
  const txn = await paymentById(transactionId);
  if (!txn) throw new CommerceError(404, 'NOT_FOUND', 'Payment transaction not found.');
  if (txn.status === 'REFUNDED') return { status: 'REFUNDED' };
  await setPaymentStatus(txn.id, 'DISPUTED');
  return { status: 'DISPUTED' };
}

async function paymentById(transactionId: string): Promise<any | null> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM payment_transactions WHERE id = $1', [transactionId]);
    return res.rows[0] || null;
  }
  requireSqlite();
  return getSqliteDb().prepare('SELECT * FROM payment_transactions WHERE id = ?').get(transactionId) || null;
}

async function userBalance(userId: string): Promise<number> {
  if (!userId) return 0;
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT wallet_balance FROM users WHERE id = $1', [userId]);
    return Number(res.rows[0]?.wallet_balance || 0);
  }
  requireSqlite();
  const row = getSqliteDb().prepare('SELECT wallet_balance FROM users WHERE id = ?').get(userId) as any;
  return Number(row?.wallet_balance || 0);
}

async function setPaymentStatus(transactionId: string, status: string): Promise<void> {
  if (isPostgresAuthoritative()) {
    await queryPostgres('UPDATE payment_transactions SET status = $2 WHERE id = $1', [transactionId, status]);
    return;
  }
  requireSqlite();
  getSqliteDb().prepare('UPDATE payment_transactions SET status = ? WHERE id = ?').run(status, transactionId);
}

async function applyBalanceChange(input: {
  userId: string;
  delta: number;
  entryType: string;
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
}): Promise<{ balance: number; applied: boolean }> {
  if (isPostgresAuthoritative()) {
    const pool = getPostgresPool();
    if (!pool) throw new CommerceError(503, 'DB_UNAVAILABLE', 'PostgreSQL is not configured.');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT balance_after FROM wallet_ledger WHERE idempotency_key = $1', [input.idempotencyKey]);
      if (existing.rows[0]) {
        await client.query('COMMIT');
        return { balance: Number(existing.rows[0].balance_after), applied: false };
      }
      const user = await client.query('SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE', [input.userId]);
      if (!user.rows[0]) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
      const next = Math.round((Number(user.rows[0].wallet_balance || 0) + input.delta) * 100) / 100;
      if (next < 0) throw new CommerceError(409, 'INSUFFICIENT_BALANCE', 'The adjustment would make the wallet negative.');
      await client.query('UPDATE users SET wallet_balance = $1, updated_at = $2 WHERE id = $3', [next, nowIso(), input.userId]);
      await client.query(
        `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'POSTED',$9)`,
        [id('ledger'), input.userId, input.entryType, input.delta, next, input.referenceType, input.referenceId, input.idempotencyKey, nowIso()]
      );
      await client.query('COMMIT');
      return { balance: next, applied: true };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  return withSqliteLock(async () => {
    requireSqlite();
    const db = getSqliteDb();
    db.exec('BEGIN IMMEDIATE');
    try {
      const existing = db.prepare('SELECT balance_after FROM wallet_ledger WHERE idempotency_key = ?').get(input.idempotencyKey) as any;
      if (existing) {
        db.exec('COMMIT');
        return { balance: Number(existing.balance_after), applied: false };
      }
      const user = db.prepare('SELECT wallet_balance FROM users WHERE id = ?').get(input.userId) as any;
      if (!user) throw new CommerceError(404, 'NOT_FOUND', 'Account not found.');
      const next = Math.round((Number(user.wallet_balance || 0) + input.delta) * 100) / 100;
      if (next < 0) throw new CommerceError(409, 'INSUFFICIENT_BALANCE', 'The adjustment would make the wallet negative.');
      db.prepare('UPDATE users SET wallet_balance = ?, updated_at = ? WHERE id = ?').run(next, nowIso(), input.userId);
      db.prepare(
        `INSERT INTO wallet_ledger (id, user_id, entry_type, amount, balance_after, reference_type, reference_id, idempotency_key, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'POSTED', ?)`
      ).run(id('ledger'), input.userId, input.entryType, input.delta, next, input.referenceType, input.referenceId, input.idempotencyKey, nowIso());
      db.exec('COMMIT');
      return { balance: next, applied: true };
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  });
}

function requireSqlite(): void {
  if (!isSqliteExplicit()) {
    throw new CommerceError(503, 'DB_UNAVAILABLE', 'No authoritative database is configured.');
  }
}

export type { PaymentGate };
