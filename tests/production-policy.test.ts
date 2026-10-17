import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bootstrapPlan,
  canAccessProfessionalSurface,
  canViewModeratedContent,
  communityReplayVisible,
  initialVerificationStatus,
  isPropertySeeker,
  isPublicListing,
  maskEmail,
  maskPhone,
  paymentGrantsAccess,
  paymentProviderStatus,
  postLoginDestination
} from '../src/shared/policy.ts';
import { evaluateUnlock, SerializedWallet } from '../src/shared/ledger.ts';
import { ESSENTIAL_CONFIG_SQL, PHONE_UNIQUENESS_INDEX, POSTGRES_ADDITIVE_SQL, phoneDuplicateCountSql, phoneUniquenessPlan, phoneUniquenessSql, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

test('Production policy', async (t) => {
  await t.test('schema SQL does not drop tables or import business records', () => {
    assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
    assert.equal(schemaSqlIsNonDestructive(ESSENTIAL_CONFIG_SQL), true);
    assert.equal(schemaSqlIsNonDestructive(phoneUniquenessSql('pg')), true);
    assert.equal(schemaSqlIsNonDestructive(phoneUniquenessSql('sqlite')), true);
    assert.equal(schemaSqlIsNonDestructive(phoneDuplicateCountSql('pg')), true);
    assert.equal(POSTGRES_ADDITIVE_SQL.includes(PHONE_UNIQUENESS_INDEX), false);
    assert.equal(phoneUniquenessPlan(0).enforce, true);
    assert.equal(phoneUniquenessPlan(1).enforce, false);
    assert.match(ESSENTIAL_CONFIG_SQL, /INSERT INTO system_metadata/i);
    assert.doesNotMatch(POSTGRES_ADDITIVE_SQL, /DROP TABLE/i);
    assert.doesNotMatch(phoneUniquenessSql('pg'), /DELETE|UPDATE|INSERT/i);
  });

  await t.test('bootstrap leaves existing accounts unchanged', () => {
    assert.equal(bootstrapPlan(null), 'create');
    assert.equal(bootstrapPlan({ email: 'dev@example.com' }), 'unchanged');
  });

  await t.test('property seekers do not receive professional or admin destinations', () => {
    assert.equal(postLoginDestination('PROPERTY_SEEKER'), 'PROPERTIES');
    assert.equal(isPropertySeeker('PROPERTY_SEEKER'), true);
    assert.equal(canAccessProfessionalSurface('PROPERTY_SEEKER'), false);
    assert.equal(postLoginDestination('DEVELOPER'), 'DEVELOPER');
    assert.equal(postLoginDestination('SUPER_ADMIN'), 'ADMIN');
    assert.equal(postLoginDestination('LANDOWNER'), 'PROFESSIONAL');
    assert.equal(postLoginDestination('LAND_OWNER'), 'PROFESSIONAL');
    assert.equal(canAccessProfessionalSurface('CHANNEL_PARTNER'), true);
  });

  await t.test('pending community content is not public', () => {
    assert.equal(canViewModeratedContent('PENDING_APPROVAL', 'author', null), false);
    assert.equal(canViewModeratedContent('REJECTED', 'author', { id: 'other', role: 'PROPERTY_SEEKER' }), false);
    assert.equal(canViewModeratedContent('SUSPENDED', 'author', { id: 'other', role: 'CHANNEL_PARTNER' }), false);
    assert.equal(canViewModeratedContent('PENDING_APPROVAL', 'author', { id: 'author', role: 'LANDOWNER' }), true);
    assert.equal(canViewModeratedContent('PENDING_APPROVAL', 'author', { id: 'admin', role: 'SUPER_ADMIN' }), true);
    assert.equal(canViewModeratedContent('APPROVED', 'author', null), true);
    assert.equal(communityReplayVisible({ title: 'Revised before approval' }, null), false);
    assert.equal(communityReplayVisible({ title: 'Revised before approval', status: 'PENDING_APPROVAL', authorId: 'author' }, null), false);
    assert.equal(communityReplayVisible({ title: 'Revised before approval', status: 'PENDING_APPROVAL', authorId: 'author' }, { id: 'author', role: 'LANDOWNER' }), true);
    assert.equal(communityReplayVisible({ title: 'Public note', status: 'APPROVED', authorId: 'author' }, null), true);
    assert.equal(communityReplayVisible({ postId: 'post_1', upvotes: 2 }, null), true);
  });

  await t.test('listings are public only when approved', () => {
    assert.equal(isPublicListing('PENDING'), false);
    assert.equal(isPublicListing('REJECTED'), false);
    assert.equal(isPublicListing('APPROVED'), true);
  });

  await t.test('RERA number does not verify a professional', () => {
    assert.equal(initialVerificationStatus('A02200004078'), 'PENDING');
    assert.equal(initialVerificationStatus(''), 'PENDING');
  });

  await t.test('lead contacts stay masked until a successful decision', () => {
    assert.equal(maskPhone('+91 98490 12890').endsWith('2890'), true);
    assert.equal(maskPhone('+91 98490 12890').includes('98490'), false);
    assert.match(maskEmail('seeker@example.com'), /@example\.com$/);
    assert.equal(maskEmail('seeker@example.com').includes('seeker@'), false);
  });

  await t.test('failed and unconfigured payments never grant access', () => {
    assert.equal(paymentGrantsAccess('FAILED'), false);
    assert.equal(paymentGrantsAccess('NOT_CONFIGURED'), false);
    assert.equal(paymentGrantsAccess('PENDING'), false);
    assert.equal(paymentGrantsAccess('VERIFIED'), true);
    assert.equal(paymentProviderStatus({}), 'NOT_CONFIGURED');
    assert.equal(paymentProviderStatus({ PAYMENT_PROVIDER: 'configured' }), 'NOT_CONFIGURED');
    assert.equal(paymentProviderStatus({ PAYMENT_WEBHOOK_SECRET: 'configured' }), 'NOT_CONFIGURED');
    assert.equal(paymentProviderStatus({ PAYMENT_PROVIDER: 'configured', PAYMENT_WEBHOOK_SECRET: 'configured' }), 'CONFIGURED');
    const denied = evaluateUnlock(
      { balance: 5000, alreadyUnlocked: false, idempotencyReplay: false },
      { price: 300, verifiedProfessional: true, consentRecorded: true, listingEligible: true, paymentGate: 'FAILED' }
    );
    assert.equal(denied.outcome, 'DENY');
    assert.equal(denied.charge, 0);
    assert.equal(denied.nextBalance, 5000);
    const unconfigured = evaluateUnlock(
      { balance: 5000, alreadyUnlocked: false, idempotencyReplay: false },
      { price: 300, verifiedProfessional: true, consentRecorded: true, listingEligible: true, paymentGate: 'NOT_CONFIGURED' }
    );
    assert.equal(unconfigured.outcome, 'DENY');
    assert.equal(unconfigured.charge, 0);
    assert.equal(unconfigured.nextBalance, 5000);
    const retained = evaluateUnlock(
      { balance: 5000, alreadyUnlocked: true, idempotencyReplay: false },
      { price: 300, verifiedProfessional: true, consentRecorded: true, listingEligible: true, paymentGate: 'NOT_CONFIGURED' }
    );
    assert.equal(retained.outcome, 'REVEAL_NO_CHARGE');
    assert.equal(retained.charge, 0);
    assert.equal(retained.nextBalance, 5000);
  });

  await t.test('an unconfigured payment provider does not spend a wallet credit', async () => {
    const wallet = new SerializedWallet(5000);
    const decision = await wallet.unlock('lead-unconfigured', 'idem-unconfigured', {
      price: 300,
      verifiedProfessional: true,
      consentRecorded: true,
      listingEligible: true,
      paymentGate: 'NOT_CONFIGURED'
    });
    assert.equal(decision.outcome, 'DENY');
    assert.equal(decision.charge, 0);
    assert.equal(wallet.balance, 5000);
    assert.equal(wallet.ledger.length, 0);
    assert.equal(wallet.unlocks.has('lead-unconfigured'), false);
  });

  await t.test('concurrent unlocks debit the wallet once', async () => {
    const wallet = new SerializedWallet(1000);
    const rules = { price: 400, verifiedProfessional: true, consentRecorded: true, listingEligible: true };
    const [first, second] = await Promise.all([
      wallet.unlock('lead-1', 'idem-1', rules),
      wallet.unlock('lead-1', 'idem-2', rules)
    ]);
    const charges = [first, second].map(item => item.charge).sort((a, b) => a - b);
    assert.deepEqual(charges, [0, 400]);
    assert.equal(wallet.balance, 600);
    assert.equal(wallet.ledger.length, 1);
    assert.equal(wallet.ledger[0].balanceAfter, 600);
  });

  await t.test('a repeated idempotency key does not debit again', async () => {
    const wallet = new SerializedWallet(800);
    const rules = { price: 250, verifiedProfessional: true, consentRecorded: true, listingEligible: true };
    await wallet.unlock('lead-9', 'same-key', rules);
    const replay = await wallet.unlock('lead-9', 'same-key', rules);
    assert.equal(replay.outcome, 'REVEAL_NO_CHARGE');
    assert.equal(wallet.balance, 550);
    assert.equal(wallet.ledger.length, 1);
  });

  await t.test('insufficient balance does not go negative', () => {
    const decision = evaluateUnlock(
      { balance: 100, alreadyUnlocked: false, idempotencyReplay: false },
      { price: 300, verifiedProfessional: true, consentRecorded: true, listingEligible: true, paymentGate: 'WALLET' }
    );
    assert.equal(decision.outcome, 'DENY');
    assert.equal(decision.nextBalance, 100);
  });
});
