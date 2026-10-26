import crypto from 'node:crypto';
import { getSqliteDb, isPostgresAuthoritative } from './db.ts';
import { queryPostgres } from './postgres.ts';
import { getListing } from './commerce.ts';
import { isPublicListing } from '../shared/policy.ts';
import { REVIEW_ENTITY_LISTING, type RequirementInput } from '../shared/requirementReview.ts';

function id(prefix: string): string {
  return `${prefix}_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export type RequirementRecord = {
  id: string;
  seekerId: string;
  propertyType: string;
  location: string;
  budget: string;
  details: string;
  createdAt: string;
  updatedAt: string;
};

function presentRequirement(row: any): RequirementRecord {
  return {
    id: row.id,
    seekerId: row.seeker_id,
    propertyType: row.property_type,
    location: row.location || '',
    budget: row.budget || '',
    details: row.details || '',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createRequirement(seekerId: string, input: RequirementInput): Promise<RequirementRecord> {
  const requirementId = id('req');
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `INSERT INTO property_requirements (id, seeker_id, property_type, location, budget, details, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$7)`,
      [requirementId, seekerId, input.propertyType, input.location, input.budget, input.details, now]
    );
  } else {
    getSqliteDb().prepare(
      `INSERT INTO property_requirements (id, seeker_id, property_type, location, budget, details, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(requirementId, seekerId, input.propertyType, input.location, input.budget, input.details, now, now);
  }
  return (await listRequirementsForSeeker(seekerId)).find(row => row.id === requirementId)!;
}

export async function listRequirementsForSeeker(seekerId: string): Promise<RequirementRecord[]> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres(
      'SELECT * FROM property_requirements WHERE seeker_id = $1 ORDER BY created_at DESC',
      [seekerId]
    );
    return res.rows.map(presentRequirement);
  }
  const rows = getSqliteDb().prepare(
    'SELECT * FROM property_requirements WHERE seeker_id = ? ORDER BY created_at DESC'
  ).all(seekerId) as any[];
  return rows.map(presentRequirement);
}

export async function listRequirementsForAdmin(): Promise<RequirementRecord[]> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM property_requirements ORDER BY created_at DESC');
    return res.rows.map(presentRequirement);
  }
  const rows = getSqliteDb().prepare('SELECT * FROM property_requirements ORDER BY created_at DESC').all() as any[];
  return rows.map(presentRequirement);
}

export type PublicReview = {
  id: string;
  rating: number;
  body: string;
  authorName: string;
  createdAt: string;
};

export type OwnReview = PublicReview & {
  authorId: string;
  status: string;
  rejectionReason: string;
};

function presentPublic(row: any): PublicReview {
  return {
    id: row.id,
    rating: Number(row.rating),
    body: row.body,
    authorName: row.author_name,
    createdAt: row.created_at
  };
}

function presentOwn(row: any): OwnReview {
  return {
    ...presentPublic(row),
    authorId: row.author_id,
    status: row.status,
    rejectionReason: row.rejection_reason || ''
  };
}

async function approvedListing(entityId: string): Promise<boolean> {
  const listing = await getListing(entityId);
  return Boolean(listing && isPublicListing(listing.publicationStatus));
}

export async function listReviews(input: {
  entityId: string;
  viewerId?: string;
  includeModeration: boolean;
}): Promise<{
  reviews: PublicReview[];
  summary: { count: number; average: number | null };
  mine: OwnReview | null;
  moderation: OwnReview[];
}> {
  const visible = input.includeModeration || await approvedListing(input.entityId);
  if (!visible) {
    return { reviews: [], summary: { count: 0, average: null }, mine: null, moderation: [] };
  }
  const rows = isPostgresAuthoritative()
    ? (await queryPostgres(
      `SELECT * FROM entity_reviews WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at ASC`,
      [REVIEW_ENTITY_LISTING, input.entityId]
    )).rows
    : getSqliteDb().prepare(
      'SELECT * FROM entity_reviews WHERE entity_type = ? AND entity_id = ? ORDER BY created_at ASC'
    ).all(REVIEW_ENTITY_LISTING, input.entityId) as any[];
  const approved = rows.filter(row => row.status === 'APPROVED');
  const count = approved.length;
  const average = count === 0
    ? null
    : Math.round((approved.reduce((sum, row) => sum + Number(row.rating), 0) / count) * 10) / 10;
  const mineRow = input.viewerId ? rows.find(row => row.author_id === input.viewerId) : undefined;
  return {
    reviews: approved.map(presentPublic),
    summary: { count, average },
    mine: mineRow ? presentOwn(mineRow) : null,
    moderation: input.includeModeration ? rows.filter(row => row.status !== 'APPROVED').map(presentOwn) : []
  };
}

export async function createReview(input: {
  entityId: string;
  authorId: string;
  authorName: string;
  rating: number;
  body: string;
}): Promise<OwnReview | { status: number; error: string }> {
  if (!await approvedListing(input.entityId)) return { status: 404, error: 'Project not found.' };
  const existing = await findOwnReview(input.entityId, input.authorId);
  if (existing) return { status: 409, error: 'You already reviewed this project. Edit that review instead.' };
  const reviewId = id('review');
  const now = nowIso();
  try {
    if (isPostgresAuthoritative()) {
      await queryPostgres(
        `INSERT INTO entity_reviews (
          id, entity_type, entity_id, author_id, author_name, rating, body, status, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',$8,$8)`,
        [reviewId, REVIEW_ENTITY_LISTING, input.entityId, input.authorId, input.authorName, input.rating, input.body, now]
      );
    } else {
      getSqliteDb().prepare(
        `INSERT INTO entity_reviews (
          id, entity_type, entity_id, author_id, author_name, rating, body, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING', ?, ?)`
      ).run(reviewId, REVIEW_ENTITY_LISTING, input.entityId, input.authorId, input.authorName, input.rating, input.body, now, now);
    }
  } catch (err: any) {
    if (/unique|duplicate/i.test(String(err?.message || err))) {
      return { status: 409, error: 'You already reviewed this project. Edit that review instead.' };
    }
    throw err;
  }
  return (await findOwnReview(input.entityId, input.authorId))!;
}

async function findOwnReview(entityId: string, authorId: string): Promise<OwnReview | null> {
  const row = isPostgresAuthoritative()
    ? (await queryPostgres(
      'SELECT * FROM entity_reviews WHERE entity_type = $1 AND entity_id = $2 AND author_id = $3',
      [REVIEW_ENTITY_LISTING, entityId, authorId]
    )).rows[0]
    : getSqliteDb().prepare(
      'SELECT * FROM entity_reviews WHERE entity_type = ? AND entity_id = ? AND author_id = ?'
    ).get(REVIEW_ENTITY_LISTING, entityId, authorId);
  return row ? presentOwn(row) : null;
}

export async function updateOwnReview(input: {
  reviewId: string;
  authorId: string;
  rating: number;
  body: string;
}): Promise<OwnReview | { status: number; error: string }> {
  const row = await reviewById(input.reviewId);
  if (!row || row.author_id !== input.authorId) return { status: 404, error: 'Review not found.' };
  if (row.status === 'REMOVED') return { status: 403, error: 'This review was removed.' };
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `UPDATE entity_reviews
       SET rating = $2, body = $3, status = 'PENDING', rejection_reason = NULL, updated_at = $4
       WHERE id = $1`,
      [input.reviewId, input.rating, input.body, now]
    );
  } else {
    getSqliteDb().prepare(
      `UPDATE entity_reviews
       SET rating = ?, body = ?, status = 'PENDING', rejection_reason = NULL, updated_at = ?
       WHERE id = ?`
    ).run(input.rating, input.body, now, input.reviewId);
  }
  const updated = await reviewById(input.reviewId);
  if (!updated) return { status: 404, error: 'Review not found.' };
  return presentOwn(updated);
}

async function reviewById(reviewId: string): Promise<any | null> {
  if (isPostgresAuthoritative()) {
    const res = await queryPostgres('SELECT * FROM entity_reviews WHERE id = $1', [reviewId]);
    return res.rows[0] || null;
  }
  return getSqliteDb().prepare('SELECT * FROM entity_reviews WHERE id = ?').get(reviewId) || null;
}

export async function moderateReview(input: {
  reviewId: string;
  status: 'APPROVED' | 'REJECTED' | 'REMOVED';
  reason?: string;
}): Promise<OwnReview | null> {
  const row = await reviewById(input.reviewId);
  if (!row) return null;
  const now = nowIso();
  if (isPostgresAuthoritative()) {
    await queryPostgres(
      `UPDATE entity_reviews SET status = $2, rejection_reason = $3, updated_at = $4 WHERE id = $1`,
      [input.reviewId, input.status, input.reason || null, now]
    );
  } else {
    getSqliteDb().prepare(
      `UPDATE entity_reviews SET status = ?, rejection_reason = ?, updated_at = ? WHERE id = ?`
    ).run(input.status, input.reason || null, now, input.reviewId);
  }
  const updated = await reviewById(input.reviewId);
  return updated ? presentOwn(updated) : null;
}
