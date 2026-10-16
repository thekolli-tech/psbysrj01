import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';

process.env.NODE_ENV = 'test';
// Empty, not deleted. Importing server.ts loads dotenv, which would fill a missing DATABASE_URL from .env and attach these tests to Neon.
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-http-workflows-${process.pid}.db`;
delete process.env.PAYMENT_PROVIDER;
delete process.env.PAYMENT_WEBHOOK_SECRET;
delete process.env.PAYMENT_API_KEY;

const { initDatabase, createUser } = await import('../src/server/db.ts');
await initDatabase();

const password = 'WorkflowPass123!';
await createUser({ name: 'Dev', email: 'dev.workflow@example.com', role: 'DEVELOPER', password, isVerified: true });
await createUser({ name: 'Admin', email: 'admin.workflow@example.com', role: 'SUPER_ADMIN', password, isVerified: true });
await createUser({ name: 'Partner', email: 'partner.workflow@example.com', role: 'CHANNEL_PARTNER', password, isVerified: true });
await createUser({ name: 'Seeker', email: 'seeker.workflow@example.com', role: 'PROPERTY_SEEKER', password, isVerified: true });

if (process.env.DATABASE_URL) {
  throw new Error('Refusing to import the server while DATABASE_URL is set. Workflow tests stay on local SQLite.');
}
process.env.DATABASE_URL = '';
const { app } = await import('../server.ts');
const server = app.listen(0);
await once(server, 'listening');
const port = (server.address() as AddressInfo).port;
const base = `http://127.0.0.1:${port}`;

async function api(method: string, path: string, body?: unknown, cookie?: string, headers: Record<string, string> = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie } : {}),
      ...headers
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
  assert.equal(result.json.token, undefined);
  assert.ok(result.cookie.includes('ps_session='));
  return result.cookie;
}

test('HTTP role, moderation, listing, enquiry, and payment workflows', async (t) => {
  t.after(() => new Promise<void>(resolve => (server as Server).close(() => resolve())));

  const emptyProperties = await api('GET', '/api/properties');
  const emptyCommunities = await api('GET', '/api/communities');
  const emptyPosts = await api('GET', '/api/community/posts');
  assert.deepEqual(emptyProperties.json.properties, []);
  assert.deepEqual(emptyCommunities.json.communities, []);
  assert.deepEqual(emptyPosts.json.posts, []);

  const seeker = await login('seeker.workflow@example.com');
  const developer = await login('dev.workflow@example.com');
  const admin = await login('admin.workflow@example.com');
  const partner = await login('partner.workflow@example.com');

  const seekerMe = await api('GET', '/api/auth/me', undefined, seeker);
  assert.equal(seekerMe.json.user.role, 'PROPERTY_SEEKER');
  assert.equal((await api('GET', '/api/admin/users', undefined, seeker)).status, 403);
  assert.equal((await api('POST', '/api/properties', { title: 'Seeker listing' }, seeker)).status, 403);
  assert.equal((await api('GET', '/api/developer/status', undefined, seeker)).status, 403);

  const health = await api('GET', '/api/developer/status', undefined, developer);
  assert.equal(health.status, 200);
  assert.equal(health.json.database.connected, true);
  assert.equal(health.json.database.schemaReady, true);
  assert.equal(health.json.payments, 'NOT_CONFIGURED');
  assert.equal((await api('GET', '/api/admin/users', undefined, developer)).status, 200);

  const escalation = await api('POST', '/api/auth/register', {
    name: 'Escalation',
    email: 'escalation.workflow@example.com',
    password,
    role: 'SUPER_ADMIN'
  });
  assert.notEqual(escalation.status, 201);
  assert.equal((await api('POST', '/api/auth/login', { email: 'missing.workflow@example.com', password: 'wrong' })).json.error, 'Invalid email or password.');

  const listing = await api('POST', '/api/properties', { title: 'Kokapet plot', location: 'Kokapet', microMarket: 'Kokapet' }, partner);
  assert.equal(listing.status, 201);
  assert.equal(listing.json.listing.publicationStatus, 'PENDING');
  assert.equal((await api('GET', '/api/properties')).json.properties.some((item: any) => item.id === listing.json.listing.id), false);

  const profile = await api('POST', '/api/professional/profile', { reraNumber: 'A00000000000', organization: 'Studio Partners' }, partner);
  assert.equal(profile.json.profile.verification_status, 'PENDING');
  const verified = await api('PATCH', `/api/admin/professionals/${profile.json.profile.user_id}/verification`, { status: 'VERIFIED' }, admin);
  assert.equal(verified.status, 200);

  const approvedListing = await api('PATCH', `/api/admin/listings/${listing.json.listing.id}/publication`, { status: 'APPROVED' }, admin);
  assert.equal(approvedListing.json.listing.publicationStatus, 'APPROVED');
  assert.equal((await api('GET', '/api/properties')).json.properties.some((item: any) => item.id === listing.json.listing.id), true);

  const second = await api('POST', '/api/properties', { title: 'Second plot', location: 'Tellapur' }, partner);
  const community = await api('POST', '/api/communities', {
    name: 'Kokapet owners',
    description: 'A private owner forum',
    category: 'LOCALITY'
  }, partner);
  assert.equal(community.status, 200);
  assert.equal((await api('GET', '/api/communities')).json.communities.some((item: any) => item.id === community.json.community.id), false);
  assert.equal((await api('PATCH', `/api/admin/communities/${community.json.community.id}/status`, { status: 'APPROVED' }, developer)).status, 403);
  assert.equal((await api('PATCH', `/api/admin/communities/${community.json.community.id}/status`, { status: 'APPROVED' }, admin)).status, 200);
  assert.equal((await api('GET', '/api/communities')).json.communities.some((item: any) => item.id === community.json.community.id), true);
  assert.equal((await api('GET', `/api/me/listings`, undefined, partner)).json.listings.find((item: any) => item.id === second.json.listing.id).publicationStatus, 'PENDING');

  const post = await api('POST', '/api/community/posts', {
    title: 'Is the approach road public?',
    content: 'Looking for the approved layout.',
    topic: 'LEGAL'
  }, partner);
  assert.equal(post.json.post.status, 'PENDING_APPROVAL');
  assert.equal((await api('GET', '/api/community/posts')).json.posts.some((item: any) => item.id === post.json.post.id), false);
  assert.equal((await api('GET', '/api/community/posts', undefined, partner)).json.posts.some((item: any) => item.id === post.json.post.id), true);
  assert.equal((await api('PATCH', `/api/admin/posts/${post.json.post.id}/moderation`, { status: 'REJECTED', reason: 'Needs a source document' }, developer)).status, 403);
  assert.equal((await api('PATCH', `/api/admin/posts/${post.json.post.id}/moderation`, { status: 'REJECTED', reason: 'Needs a source document' }, admin)).status, 200);
  assert.equal((await api('GET', `/api/community/posts/${post.json.post.id}`)).status, 404);

  const edited = await api('PATCH', `/api/properties/${listing.json.listing.id}`, { title: 'Kokapet plot revised' }, partner);
  assert.equal(edited.json.listing.publicationStatus, 'PENDING');
  assert.equal((await api('GET', '/api/properties')).json.properties.some((item: any) => item.id === listing.json.listing.id), false);

  const missingConsent = await api('POST', '/api/leads', { name: 'Anita Rao', phone: '+919800011122', budget: '80 lakhs' }, seeker);
  assert.equal(missingConsent.status, 400);
  const enquiry = await api('POST', '/api/leads', {
    name: 'Anita Rao',
    phone: '+919800011122',
    email: 'anita@example.com',
    budget: '80 lakhs',
    property_type: 'Plot',
    micro_market: 'Kokapet',
    consentGranted: true,
    consentVersion: '2026-10-15',
    consentPurpose: 'Share my contact details with eligible verified professionals solely to respond to this property enquiry.'
  }, seeker);
  assert.equal(enquiry.status, 201, JSON.stringify(enquiry.json));
  const masked = await api('GET', '/api/leads', undefined, partner);
  const maskedLead = masked.json.leads.find((item: any) => item.id === enquiry.json.leadId);
  assert.equal(maskedLead.revealed, false);
  assert.equal(maskedLead.seekerPhone.includes('8000'), false);

  const credit = await api('POST', '/api/admin/finance/adjustment', {
    userId: (await api('GET', '/api/auth/me', undefined, partner)).json.user.id,
    amount: 1000,
    direction: 'CREDIT',
    reason: 'Test credit for an authorized unlock',
    idempotencyKey: 'credit-workflow-1'
  }, admin);
  assert.equal(credit.status, 200, JSON.stringify(credit.json));

  const [first, secondUnlock] = await Promise.all([
    api('POST', `/api/leads/${enquiry.json.leadId}/unlock`, {}, partner, { 'Idempotency-Key': 'unlock-a' }),
    api('POST', `/api/leads/${enquiry.json.leadId}/unlock`, {}, partner, { 'Idempotency-Key': 'unlock-b' })
  ]);
  const charges = [first.json.charged, secondUnlock.json.charged].sort((a, b) => a - b);
  assert.deepEqual(charges, [0, 300]);
  assert.equal(first.json.lead.seekerPhone, '+919800011122');
  const replay = await api('POST', `/api/leads/${enquiry.json.leadId}/unlock`, {}, partner, { 'Idempotency-Key': 'unlock-a' });
  assert.equal(replay.json.charged, 0);

  const checkout = await api('POST', '/api/billing/checkout', { amount: 500, purpose: 'WALLET_TOPUP' }, partner);
  assert.equal(checkout.status, 503);
  assert.equal(checkout.json.code, 'NOT_CONFIGURED');
  const refundMissing = await api('POST', '/api/admin/payments/pay_missing/refund', { reason: 'No such payment' }, admin);
  assert.equal(refundMissing.status, 404);
  const overdraft = await api('POST', '/api/admin/finance/adjustment', {
    userId: (await api('GET', '/api/auth/me', undefined, partner)).json.user.id,
    amount: 100000,
    direction: 'DEBIT',
    reason: 'Attempted overdraft',
    idempotencyKey: 'debit-workflow-1'
  }, admin);
  assert.equal(overdraft.status, 409);
});
