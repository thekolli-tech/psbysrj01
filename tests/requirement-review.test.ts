import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { join } from 'node:path';
import test from 'node:test';
import { REQUESTED_END_USER_NAV, linkedEndUserNavigation, roleUtilityDestinations } from '../src/shared/endUserNavigation.ts';
import { readRequirementInput, readReviewInput } from '../src/shared/requirementReview.ts';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const appSource = readFileSync(join(import.meta.dirname, '../src/App.tsx'), 'utf8');

test('official X URL keeps the trailing underscore', () => {
  assert.match(appSource, /href="https:\/\/x\.com\/propertystudio_"/);
  assert.match(appSource, /@propertystudio_\s*<\/span>/);
  assert.match(appSource, /instagram\.com\/propertystudio_srj/);
  assert.doesNotMatch(appSource, /https:\/\/x\.com\/propertystudio(?!_)/);
  assert.doesNotMatch(appSource, /@propertystudio\s*<\/span>/);
});

test('end-user navigation includes requirement and review routes', () => {
  assert.deepEqual(
    REQUESTED_END_USER_NAV.map(item => [item.label, item.view]),
    [
      ['Overview', 'HOME'],
      ['Media & Podcast', 'MEDIA'],
      ['Market Trends & Insights', 'MARKET_INSIGHTS'],
      ['Review & Rating — All Stakeholders and Projects', 'REVIEWS'],
      ['Community Q&A', 'COMMUNITY'],
      ['Live & Latest', 'CONFERENCE'],
      ['Property Requirement', 'REQUIREMENT'],
      ['Contact & Connect Property Studio', 'CHAT']
    ]
  );
  assert.equal(linkedEndUserNavigation().some(item => item.view === 'LEADS_MARKET'), false);
  assert.deepEqual(roleUtilityDestinations('CHANNEL_PARTNER', true), ['LEADS_MARKET', 'PROFESSIONAL']);
  assert.deepEqual(roleUtilityDestinations('PROPERTY_SEEKER', true), []);
});

test('requirement and review input is validated without trusting client totals', () => {
  assert.equal('error' in readRequirementInput({ propertyType: 'House' }), true);
  const requirement = readRequirementInput({
    propertyType: 'Villa',
    location: 'Kokapet',
    budget: '1 Cr',
    details: 'East facing',
    phone: '+919000000000',
    seekerId: 'user_other'
  });
  assert.deepEqual(requirement, {
    propertyType: 'Villa',
    location: 'Kokapet',
    budget: '1 Cr',
    details: 'East facing'
  });
  const stakeholder = readReviewInput({ entityType: 'USER', entityId: 'user_1', rating: 5, body: 'Hello' });
  const highRating = readReviewInput({ entityType: 'LISTING', entityId: 'listing_1', rating: 6, body: 'Hello' });
  const fractional = readReviewInput({ entityType: 'LISTING', entityId: 'listing_1', rating: 1.5, body: 'Hello' });
  const html = readReviewInput({ entityType: 'LISTING', entityId: 'listing_1', rating: 5, body: '<b>Hi</b>' });
  assert.equal('error' in stakeholder && stakeholder.error, 'Only an approved project can be reviewed.');
  assert.equal('error' in highRating && highRating.error, 'Rating must be a whole number from 1 to 5.');
  assert.equal('error' in fractional && fractional.error, 'Rating must be a whole number from 1 to 5.');
  assert.equal('error' in html && html.error, 'Review cannot include HTML.');
  const review = readReviewInput({
    entityType: 'LISTING',
    entityId: 'listing_1',
    rating: 4,
    body: 'Clear approach road',
    status: 'APPROVED',
    authorId: 'user_other',
    summary: { count: 99, average: 5 }
  });
  assert.deepEqual(review, {
    entityType: 'LISTING',
    entityId: 'listing_1',
    rating: 4,
    body: 'Clear approach road'
  });
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS property_requirements/);
  assert.match(POSTGRES_ADDITIVE_SQL, /CREATE TABLE IF NOT EXISTS entity_reviews/);
  assert.doesNotMatch(POSTGRES_ADDITIVE_SQL, /DROP\s+TABLE|DELETE\s+FROM/i);
});

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-phase5-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;

const { initDatabase, createUser, findUserById, getSqliteDb } = await import('../src/server/db.ts');
await initDatabase();

const password = 'Phase5Pass123!';
const seekerPhone = '+919111222333';
const seeker = await createUser({
  name: 'Requirement Seeker',
  email: 'phase5.seeker@example.com',
  phone: seekerPhone,
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
const peer = await createUser({
  name: 'Requirement Peer',
  email: 'phase5.peer@example.com',
  phone: '+919111222444',
  role: 'PROPERTY_SEEKER',
  password,
  isVerified: true
});
await createUser({
  name: 'Phase5 Partner',
  email: 'phase5.partner@example.com',
  phone: '+919111222555',
  role: 'CHANNEL_PARTNER',
  password,
  isVerified: true
});
await createUser({
  name: 'Phase5 Admin',
  email: 'phase5.admin@example.com',
  role: 'SUPER_ADMIN',
  password,
  isVerified: true
});
const developer = await createUser({
  name: 'Platform Owner',
  email: 'phase5.owner@example.com',
  role: 'DEVELOPER',
  password,
  isVerified: true
});

const { app } = await import('../server.ts');
const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

async function api(method: string, path: string, body?: unknown, cookie?: string) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {})
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  const session = response.headers.getSetCookie?.().map(value => value.split(';')[0]).find(value => value.startsWith('ps_session='));
  return { status: response.status, json, cookie: session || cookie || '' };
}

async function login(email: string): Promise<string> {
  const result = await api('POST', '/api/auth/login', { email, password });
  assert.equal(result.status, 200, JSON.stringify(result.json));
  return result.cookie;
}

test('requirements stay private and reviews are moderated before they affect the public average', async (t) => {
  t.after(() => new Promise<void>(resolve => (server as Server).close(() => resolve())));

  const seekerCookie = await login('phase5.seeker@example.com');
  const peerCookie = await login('phase5.peer@example.com');
  const partnerCookie = await login('phase5.partner@example.com');
  const adminCookie = await login('phase5.admin@example.com');
  const developerCookie = await login('phase5.owner@example.com');
  const leadCount = () => Number((getSqliteDb().prepare('SELECT COUNT(*) AS n FROM buyer_leads').get() as { n: number }).n);
  const leadsBefore = leadCount();

  assert.equal((await api('POST', '/api/requirements', { propertyType: 'Villa' })).status, 401);
  assert.equal((await api('GET', '/api/requirements')).status, 401);
  assert.equal((await api('POST', '/api/requirements', {
    propertyType: 'Not a catalog type',
    phone: seekerPhone
  }, seekerCookie)).status, 400);

  const created = await api('POST', '/api/requirements', {
    propertyType: 'Villa',
    location: 'Kokapet',
    budget: '1 Cr',
    details: 'East facing plot',
    phone: seekerPhone,
    email: 'phase5.seeker@example.com',
    seekerId: peer.id,
    role: 'DEVELOPER',
    profession: 'Builder'
  }, seekerCookie);
  assert.equal(created.status, 201, JSON.stringify(created.json));
  assert.equal(created.json.requirement.seekerId, seeker.id);
  assert.equal(created.json.requirement.propertyType, 'Villa');
  assert.equal(JSON.stringify(created.json).includes(seekerPhone), false);
  assert.equal(JSON.stringify(created.json).includes('phase5.seeker@example.com'), false);
  assert.equal(leadCount(), leadsBefore);

  const ownList = await api('GET', '/api/requirements', undefined, seekerCookie);
  assert.equal(ownList.json.requirements.length, 1);
  const peerList = await api('GET', '/api/requirements?seekerId=' + seeker.id, undefined, peerCookie);
  assert.deepEqual(peerList.json.requirements, []);
  const requirementId = created.json.requirement.id;
  assert.equal((await api('GET', `/api/requirements/${requirementId}`, undefined, peerCookie)).status, 404);
  assert.equal((await api('PATCH', `/api/requirements/${requirementId}`, { details: 'stolen' }, peerCookie)).status, 404);
  assert.equal((await api('DELETE', `/api/requirements/${requirementId}`, undefined, peerCookie)).status, 404);
  assert.equal((await api('GET', '/api/admin/requirements', undefined, peerCookie)).status, 403);
  assert.equal((await api('GET', '/api/admin/requirements', undefined, developerCookie)).status, 403);
  const adminList = await api('GET', '/api/admin/requirements', undefined, adminCookie);
  assert.equal(adminList.status, 200);
  assert.equal(adminList.json.requirements.some((item: any) => item.id === requirementId), true);
  assert.equal(JSON.stringify(adminList.json).includes(seekerPhone), false);

  const stored = await findUserById(seeker.id);
  assert.equal(stored?.role, 'PROPERTY_SEEKER');
  assert.equal(developer.role, 'DEVELOPER');

  const listing = await api('POST', '/api/properties', { title: 'Phase 5 Project' }, partnerCookie);
  assert.equal(listing.status, 201, JSON.stringify(listing.json));
  const listingId = listing.json.listing.id;
  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 5,
    body: 'Too early'
  }, seekerCookie)).status, 404);

  const approvedListing = await api('PATCH', `/api/admin/listings/${listingId}/publication`, { status: 'APPROVED' }, adminCookie);
  assert.equal(approvedListing.status, 200, JSON.stringify(approvedListing.json));

  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 5,
    body: 'Useful'
  })).status, 401);
  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 9,
    body: 'Useful'
  }, seekerCookie)).status, 400);
  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'USER',
    entityId: peer.id,
    rating: 5,
    body: 'Stakeholder'
  }, seekerCookie)).status, 400);

  const review = await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 5,
    body: 'Good access road',
    status: 'APPROVED',
    authorId: peer.id,
    authorName: 'Impersonated Buyer',
    summary: { count: 99, average: 5 }
  }, seekerCookie);
  assert.equal(review.status, 201, JSON.stringify(review.json));
  assert.equal(review.json.review.status, 'PENDING');
  assert.equal(review.json.review.authorName, 'Requirement Seeker');
  assert.equal(review.json.review.authorId, seeker.id);
  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 4,
    body: 'Second attempt'
  }, seekerCookie)).status, 409);

  const pendingPublic = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(pendingPublic.status, 200);
  assert.deepEqual(pendingPublic.json.reviews, []);
  assert.deepEqual(pendingPublic.json.summary, { count: 0, average: null });
  assert.equal(pendingPublic.json.mine, null);
  assert.deepEqual(pendingPublic.json.moderation, []);
  assert.equal(JSON.stringify(pendingPublic.json).includes('Good access road'), false);
  const authorView = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`, undefined, seekerCookie);
  assert.equal(authorView.json.reviews.length, 0);
  assert.equal(authorView.json.mine.status, 'PENDING');
  assert.equal(authorView.json.summary.count, 0);
  const peerView = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`, undefined, peerCookie);
  assert.equal(peerView.json.mine, null);
  assert.equal(JSON.stringify(peerView.json).includes('Good access road'), false);

  const reviewId = review.json.review.id;
  assert.equal((await api('PATCH', `/api/reviews/${reviewId}`, { rating: 1, body: 'Changed by peer', status: 'APPROVED' }, peerCookie)).status, 404);
  assert.equal((await api('PATCH', `/api/admin/reviews/${reviewId}/moderation`, { status: 'APPROVED' }, seekerCookie)).status, 403);
  assert.equal((await api('PATCH', `/api/admin/reviews/${reviewId}/moderation`, { status: 'APPROVED' }, developerCookie)).status, 403);

  const moderated = await api('PATCH', `/api/admin/reviews/${reviewId}/moderation`, { status: 'APPROVED', reason: 'Checked' }, adminCookie);
  assert.equal(moderated.status, 200, JSON.stringify(moderated.json));
  const publicAfter = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(publicAfter.json.summary.count, 1);
  assert.equal(publicAfter.json.summary.average, 5);
  assert.equal(publicAfter.json.reviews[0].authorName, 'Requirement Seeker');
  assert.equal(publicAfter.json.reviews[0].authorId, undefined);
  assert.equal(JSON.stringify(publicAfter.json).includes(seekerPhone), false);
  const history = getSqliteDb().prepare(`SELECT action FROM moderation_actions WHERE target_type = 'REVIEW' AND target_id = ?`).all(reviewId) as Array<{ action: string }>;
  assert.deepEqual(history.map(row => row.action), ['APPROVED']);
  const audit = getSqliteDb().prepare(`SELECT action FROM audit_logs WHERE action = 'REVIEW_MODERATION' AND target_id = ?`).get(reviewId) as { action: string } | undefined;
  assert.equal(audit?.action, 'REVIEW_MODERATION');

  const peerReview = await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 3,
    body: 'Average finish'
  }, peerCookie);
  assert.equal(peerReview.status, 201);
  const duringPeerPending = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(duringPeerPending.json.summary.count, 1);
  assert.equal(duringPeerPending.json.summary.average, 5);
  assert.equal(JSON.stringify(duringPeerPending.json.reviews).includes('Average finish'), false);
  assert.equal((await api('PATCH', `/api/admin/reviews/${peerReview.json.review.id}/moderation`, { status: 'APPROVED' }, adminCookie)).status, 200);
  const both = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(both.json.summary.count, 2);
  assert.equal(both.json.summary.average, 4);

  const edited = await api('PATCH', `/api/reviews/${reviewId}`, {
    rating: 1,
    body: 'Revised after visiting',
    status: 'APPROVED',
    authorId: peer.id,
    summary: { count: 10, average: 5 }
  }, seekerCookie);
  assert.equal(edited.status, 200, JSON.stringify(edited.json));
  assert.equal(edited.json.review.status, 'PENDING');
  assert.equal(edited.json.review.rating, 1);
  assert.equal(edited.json.review.authorId, seeker.id);
  const afterEdit = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(afterEdit.json.summary.count, 1);
  assert.equal(afterEdit.json.summary.average, 3);
  assert.equal(JSON.stringify(afterEdit.json.reviews).includes('Revised after visiting'), false);

  assert.equal((await api('PATCH', `/api/admin/reviews/${reviewId}/moderation`, { status: 'REJECTED', reason: 'Not specific' }, adminCookie)).status, 200);
  const afterReject = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.equal(afterReject.json.summary.count, 1);
  assert.equal(afterReject.json.summary.average, 3);
  assert.equal((await api('PATCH', `/api/admin/reviews/${peerReview.json.review.id}/moderation`, { status: 'REMOVED' }, adminCookie)).status, 200);
  const afterRemoval = await api('GET', `/api/reviews?entityType=LISTING&entityId=${listingId}`);
  assert.deepEqual(afterRemoval.json.summary, { count: 0, average: null });
  assert.deepEqual(afterRemoval.json.reviews, []);
  assert.equal((await api('PATCH', `/api/reviews/${peerReview.json.review.id}`, { rating: 5, body: 'Trying again' }, peerCookie)).status, 403);
  assert.equal((await api('POST', '/api/reviews', {
    entityType: 'LISTING',
    entityId: listingId,
    rating: 5,
    body: 'Replacement'
  }, peerCookie)).status, 409);

  const checkout = await api('POST', '/api/billing/checkout', { amount: 300, purpose: 'WALLET_TOPUP' }, seekerCookie);
  assert.equal(checkout.status, 503);
  assert.equal(checkout.json.code, 'NOT_CONFIGURED');
  assert.equal((await api('POST', '/api/community/posts/post_missing/vote', { vote: 1 })).status, 401);
  assert.equal((await findUserById(seeker.id))?.role, 'PROPERTY_SEEKER');
});
