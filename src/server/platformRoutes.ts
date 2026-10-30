import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';
import {
  canAccessProfessionalSurface,
  canModerate,
  CONSENT_PURPOSE,
  CONSENT_VERSION,
  isProfessionalRole,
  isPropertySeeker,
  isPublicListing,
  isSelfServeRole
} from '../shared/policy.ts';
import { revealAllowedAfterPayment } from './commerce.ts';
import { readRequirementInput, readReviewEdit, readReviewInput } from '../shared/requirementReview.ts';
import {
  createRequirement,
  createReview,
  deleteRequirement,
  listRequirementsForAdmin,
  listRequirementsForSeeker,
  listReviews,
  listReviewsForAuthor,
  moderateReview,
  updateOwnReview
} from './requirementReview.ts';
import {
  CommerceError,
  createEnquiry,
  createListing,
  getListing,
  creditWalletFromVerifiedPayment,
  adjustWallet,
  disputePayment,
  listFinancialRecords,
  listLeadsForViewer,
  listModerationQueue,
  listOwnerListings,
  listPublicListings,
  listUnlockHistory,
  moderateListing,
  recordModeration,
  refundVerifiedPayment,
  setOwnedListingState,
  updateOwnedListing,
  moderatePost,
  paymentsStatus,
  readSystemConfig,
  recordPaymentAttempt,
  setProfessionalVerification,
  suspendOrRestoreCommunity,
  unlockLead,
  upsertProfessionalProfile,
  getProfessionalProfile,
  verifyPaymentWebhook
} from './commerce.ts';
import { createAuditLog, createNotification } from './db.ts';
import { broadcastSseEvent } from './events.ts';

type Guard = (req: any, res: Response, next: () => void) => void;

function sendError(res: Response, err: any): void {
  if (err instanceof CommerceError) {
    res.status(err.status).json({ error: err.message, code: err.code });
    return;
  }
  res.status(500).json({ error: err?.message || 'Request failed' });
}

export function registerPlatformRoutes(app: Express, guards: { requireAuth: Guard; requireAdmin: Guard; requireUnrestricted?: Guard }): void {
  const requireUnrestricted = guards.requireUnrestricted || ((_req: any, _res: any, next: any) => next());

  app.get('/api/properties', async (_req: Request, res: Response): Promise<void> => {
    try {
      const properties = await listPublicListings();
      res.json({ properties });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/me/listings', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      const listings = await listOwnerListings(req.user.id);
      res.json({ listings });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/properties', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      if (isPropertySeeker(req.user.role) && !isProfessionalRole(req.user.role)) {
        res.status(403).json({ error: 'Property seekers cannot publish listings.' });
        return;
      }
      const listing = await createListing(req.user.id, req.body || {});
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'LISTING_SUBMITTED',
        targetId: listing.id,
        details: { publicationStatus: listing.publicationStatus }
      });
      res.status(201).json({ success: true, listing });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/properties/:id', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const listing = await updateOwnedListing(req.user.id, req.params.id, req.body || {});
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      res.json({ success: true, listing, notice: 'The edit returned the listing to pending review.' });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/properties/:id/state', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const status = req.body?.status;
      if (!['PAUSED', 'ARCHIVED', 'PENDING'].includes(status)) {
        res.status(400).json({ error: 'Owners may pause, archive, or resubmit a listing. They cannot approve it.' });
        return;
      }
      const listing = await setOwnedListingState(req.user.id, req.params.id, status);
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      res.json({ success: true, listing });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/admin/listings/:id/publication', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      const status = req.body?.status;
      if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING', 'PAUSED', 'ARCHIVED'].includes(status)) {
        res.status(400).json({ error: 'Status must be APPROVED, REJECTED, SUSPENDED, PENDING, PAUSED, or ARCHIVED.' });
        return;
      }
      const listing = await moderateListing({
        listingId: req.params.id,
        status,
        actorId: req.user.id,
        reason: req.body?.reason
      });
      if (!listing) {
        res.status(404).json({ error: 'Listing not found' });
        return;
      }
      res.json({ success: true, listing });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/professional/profile', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      if (!canAccessProfessionalSurface(req.user.role)) {
        res.status(403).json({ error: 'Professional access is required.' });
        return;
      }
      const profile = await getProfessionalProfile(req.user.id);
      res.json({ profile, role: req.user.role });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/professional/profile', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      if (!isProfessionalRole(req.user.role) && !canModerate(req.user.role)) {
        res.status(403).json({ error: 'This account cannot submit professional verification.' });
        return;
      }
      const profile = await upsertProfessionalProfile({
        userId: req.user.id,
        role: req.user.role,
        reraNumber: req.body?.reraNumber,
        organization: req.body?.organization
      });
      res.json({
        success: true,
        profile,
        notice: 'A RERA number does not verify this account. Status remains pending until a Super Admin or Developer reviews it.'
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/admin/professionals/:id/verification', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      const status = req.body?.status;
      if (!['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'].includes(status)) {
        res.status(400).json({ error: 'Status must be PENDING, VERIFIED, REJECTED, or SUSPENDED.' });
        return;
      }
      const profile = await setProfessionalVerification({
        userId: req.params.id,
        status,
        actorId: req.user.id,
        reason: req.body?.reason
      });
      if (!profile) {
        res.status(404).json({ error: 'Professional profile not found' });
        return;
      }
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'PROFESSIONAL_VERIFICATION',
        targetId: req.params.id,
        details: { status, reason: req.body?.reason || '' }
      });
      res.json({ success: true, profile });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/admin/moderation/queue', guards.requireAdmin, async (_req: any, res: Response): Promise<void> => {
    try {
      res.json(await listModerationQueue());
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/admin/posts/:id/moderation', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only a Super Admin can approve or reject community posts.' });
        return;
      }
      const status = req.body?.status;
      if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL'].includes(status)) {
        res.status(400).json({ error: 'Status must be APPROVED, REJECTED, SUSPENDED, or PENDING_APPROVAL.' });
        return;
      }
      const ok = await moderatePost({
        postId: req.params.id,
        status,
        actorId: req.user.id,
        reason: req.body?.reason
      });
      if (!ok) {
        res.status(404).json({ error: 'Post not found' });
        return;
      }
      res.json({ success: true, status });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/admin/communities/:id/moderation', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only a Super Admin can approve or reject communities.' });
        return;
      }
      const status = req.body?.status;
      if (!['APPROVED', 'REJECTED', 'SUSPENDED', 'PENDING_APPROVAL'].includes(status)) {
        res.status(400).json({ error: 'Status must be APPROVED, REJECTED, SUSPENDED, or PENDING_APPROVAL.' });
        return;
      }
      const ok = await suspendOrRestoreCommunity({
        communityId: req.params.id,
        status,
        actorId: req.user.id,
        reason: req.body?.reason
      });
      if (!ok) {
        res.status(404).json({ error: 'Community not found' });
        return;
      }
      res.json({ success: true, status });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/leads', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      if (!canAccessProfessionalSurface(req.user.role) && !isPropertySeeker(req.user.role)) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
      const leads = await listLeadsForViewer({ id: req.user.id, role: req.user.role });
      const visible = isPropertySeeker(req.user.role)
        ? leads.filter(lead => lead.revealed)
        : leads;
      res.json({ leads: visible });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/leads', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const body = req.body || {};
      if (!body.name || !body.phone || !body.budget) {
        res.status(400).json({ error: 'Name, phone, and budget are required.' });
        return;
      }
      const leadId = await createEnquiry({
        seekerId: req.user.id,
        name: body.name,
        phone: body.phone,
        email: body.email,
        budget: body.budget,
        propertyType: body.property_type || body.propertyType || '',
        microMarket: body.micro_market || body.microMarket || '',
        requirements: body.requirements,
        propertyId: body.propertyId || body.property_id,
        tier: body.tier,
        price: body.price,
        consentGranted: body.consentGranted === true,
        consentVersion: body.consentVersion || '',
        consentPurpose: body.consentPurpose || ''
      });
      res.status(201).json({
        success: true,
        leadId,
        consentVersion: CONSENT_VERSION,
        consentPurpose: CONSENT_PURPOSE
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/leads/:id/unlock', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      if (!canAccessProfessionalSurface(req.user.role)) {
        res.status(403).json({ error: 'Only eligible professionals can unlock lead contact details.' });
        return;
      }
      const idempotencyKey = String(req.get('Idempotency-Key') || req.body?.idempotencyKey || '').trim();
      if (!idempotencyKey) {
        res.status(400).json({ error: 'Idempotency-Key is required.' });
        return;
      }
      const result = await unlockLead({
        leadId: req.params.id,
        professionalId: req.user.id,
        professionalRole: req.user.role,
        idempotencyKey
      });
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'LEAD_UNLOCK',
        targetId: req.params.id,
        details: { charged: result.charged }
      });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/me/unlocks', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      if (!canAccessProfessionalSurface(req.user.role)) {
        res.status(403).json({ error: 'Professional access is required.' });
        return;
      }
      res.json({ unlocks: await listUnlockHistory(req.user.id) });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/billing/config', guards.requireAuth, async (_req: any, res: Response): Promise<void> => {
    try {
      const config = await readSystemConfig();
      res.json({
        payments: paymentsStatus(),
        consentVersion: config.consent_version || CONSENT_VERSION,
        consentPurpose: config.consent_purpose || CONSENT_PURPOSE,
        prices: {
          STANDARD: Number(config.lead_price_STANDARD || 300),
          PREMIUM: Number(config.lead_price_PREMIUM || 750),
          HNI: Number(config.lead_price_HNI || 2000)
        },
        creditPackages: JSON.parse(config.credit_packages || '[]')
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/billing/checkout', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      const amount = Number(req.body?.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        res.status(400).json({ error: 'A positive amount is required.' });
        return;
      }
      const result = await recordPaymentAttempt({
        userId: req.user.id,
        amount,
        purpose: String(req.body?.purpose || 'WALLET_TOPUP'),
        idempotencyKey: String(req.get('Idempotency-Key') || req.body?.idempotencyKey || crypto.randomUUID())
      });
      if (result.status === 'NOT_CONFIGURED') {
        res.status(503).json({
          error: 'Payment provider is NOT_CONFIGURED. No charge was created and no contact details were revealed.',
          code: 'NOT_CONFIGURED',
          payments: 'NOT_CONFIGURED'
        });
        return;
      }
      res.status(202).json({
        success: true,
        status: 'PENDING',
        transactionId: result.transactionId,
        notice: 'Wallet credit is applied only after a verified provider webhook.'
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/billing/webhook', async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = JSON.stringify(req.body || {});
      const verdict = verifyPaymentWebhook(payload, req.get('x-payment-signature') || undefined);
      if (!verdict.accepted) {
        res.status(verdict.status === 'NOT_CONFIGURED' ? 503 : 401).json({
          error: verdict.status === 'NOT_CONFIGURED' ? 'Payment provider is NOT_CONFIGURED.' : 'Webhook signature was not verified.',
          code: verdict.status,
          granted: revealAllowedAfterPayment(verdict.status)
        });
        return;
      }
      const body = req.body || {};
      if (body.purpose === 'WALLET_TOPUP' && body.userId && body.amount && body.idempotencyKey) {
        const credit = await creditWalletFromVerifiedPayment({
          userId: String(body.userId),
          amount: Number(body.amount),
          idempotencyKey: String(body.idempotencyKey),
          providerRef: body.providerRef
        });
        res.json({ success: true, status: 'VERIFIED', ...credit, granted: false });
        return;
      }
      res.json({ success: true, status: 'VERIFIED', granted: revealAllowedAfterPayment('VERIFIED') });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/admin/finance', guards.requireAdmin, async (_req: any, res: Response): Promise<void> => {
    try {
      res.json(await listFinancialRecords());
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/admin/finance/adjustment', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      const body = req.body || {};
      if ((body.direction !== 'CREDIT' && body.direction !== 'DEBIT') || !body.userId || !body.idempotencyKey) {
        res.status(400).json({ error: 'userId, direction, and idempotencyKey are required.' });
        return;
      }
      const result = await adjustWallet({
        userId: String(body.userId || ''),
        amount: Number(body.amount),
        direction: body.direction === 'DEBIT' ? 'DEBIT' : 'CREDIT',
        reason: String(body.reason || ''),
        idempotencyKey: String(body.idempotencyKey || '')
      });
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'WALLET_ADJUSTMENT',
        targetId: body.userId,
        details: { direction: body.direction, amount: body.amount, reason: body.reason, applied: result.applied }
      });
      res.json({ success: true, ...result });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/admin/payments/:id/refund', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      const result = await refundVerifiedPayment({
        transactionId: req.params.id,
        idempotencyKey: String(req.body?.idempotencyKey || `refund:${req.params.id}`)
      });
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'PAYMENT_REFUND',
        targetId: req.params.id,
        details: { status: result.status, reason: req.body?.reason || '' }
      });
      res.json({ success: true, ...result, granted: false });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/admin/payments/:id/dispute', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      const result = await disputePayment(req.params.id);
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'PAYMENT_DISPUTE',
        targetId: req.params.id,
        details: { status: result.status, reason: req.body?.reason || '' }
      });
      res.json({ success: true, ...result, granted: false });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/developer/status', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'DEVELOPER' && req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Developer or Super Admin access is required.' });
        return;
      }
      const { buildHealthReport } = await import('./health.ts');
      const health = await buildHealthReport();
      res.status(health.httpStatus).json({
        ...health.body,
        integrations: {
          email: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.SENDGRID_API_KEY),
          payments: paymentsStatus(),
          mongodb: 'NOT_USED'
        },
        selfServeRoles: Array.from(isSelfServeRole('PROPERTY_SEEKER') ? ['configured'] : [])
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/requirements', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      const requirements = await listRequirementsForSeeker(req.user.id);
      res.json({ requirements });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/requirements', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const input = readRequirementInput(req.body);
      if ('error' in input) {
        res.status(400).json({ error: input.error });
        return;
      }
      const requirement = await createRequirement(req.user.id, input);
      res.status(201).json({ success: true, requirement });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.delete('/api/requirements/:id', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const reqId = req.params.id;
      if (!reqId) {
        res.status(400).json({ error: 'Requirement ID is required.' });
        return;
      }
      const deleted = await deleteRequirement(req.user.id, reqId);
      if (!deleted) {
        res.status(404).json({ error: 'Property requirement not found.' });
        return;
      }

      await createNotification({
        userId: req.user.id,
        actorId: req.user.id,
        actorName: req.user.name || 'Property Seeker',
        type: 'SYSTEM',
        title: 'Requirement Removed',
        message: `Your property requirement for ${deleted.propertyType} in ${deleted.location || 'Hyderabad'} has been successfully removed.`,
        linkUrl: '/dashboard'
      }).catch(err => console.warn('[Property Studio] Notification error on requirement deletion:', err));

      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email || '',
        actorRole: req.user.role || 'PROPERTY_SEEKER',
        action: 'REQUIREMENT_DELETED',
        targetId: reqId,
        details: { propertyType: deleted.propertyType, location: deleted.location }
      }).catch(err => console.warn('[Property Studio] Audit log error on requirement deletion:', err));

      broadcastSseEvent('REQUIREMENT_DELETED', { id: reqId, seekerId: req.user.id });

      res.json({ success: true, message: 'Property requirement deleted successfully.', requirement: deleted });
    } catch (err: any) {
      if (err.message === 'FORBIDDEN' || err.status === 403) {
        res.status(403).json({ error: 'Unauthorized: You can only delete your own property requirements.' });
        return;
      }
      sendError(res, err);
    }
  });

  app.get('/api/admin/requirements', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only a Super Admin can read submitted requirements.' });
        return;
      }
      res.json({ requirements: await listRequirementsForAdmin() });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/reviews', async (req: any, res: Response): Promise<void> => {
    try {
      const entityId = String(req.query.entityId || '');
      if (req.query.entityType !== 'LISTING' || !/^[A-Za-z0-9_-]{1,80}$/.test(entityId)) {
        res.status(400).json({ error: req.query.entityType === 'LISTING' ? 'Project id is not valid.' : 'Only an approved project can be reviewed.' });
        return;
      }
      const listing = await getListing(entityId);
      const admin = req.user?.role === 'SUPER_ADMIN';
      if (!listing || (!isPublicListing(listing.publicationStatus) && !admin)) {
        res.status(404).json({ error: 'Project not found.' });
        return;
      }
      const result = await listReviews({
        entityId,
        viewerId: req.user?.id,
        includeModeration: admin
      });
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  app.post('/api/reviews', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const input = readReviewInput(req.body);
      if ('error' in input) {
        res.status(400).json({ error: input.error });
        return;
      }
      const created = await createReview({
        entityId: input.entityId,
        authorId: req.user.id,
        authorName: String(req.user.name || 'Member').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || 'Member',
        rating: input.rating,
        body: input.body
      });
      if ('error' in created) {
        res.status(created.status).json({ error: created.error });
        return;
      }
      res.status(201).json({ success: true, review: created });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/reviews/:id', guards.requireAuth, requireUnrestricted, async (req: any, res: Response): Promise<void> => {
    try {
      const input = readReviewEdit(req.body);
      if ('error' in input) {
        res.status(400).json({ error: input.error });
        return;
      }
      const updated = await updateOwnReview({
        reviewId: req.params.id,
        authorId: req.user.id,
        rating: input.rating,
        body: input.body
      });
      if ('error' in updated) {
        res.status(updated.status).json({ error: updated.error });
        return;
      }
      res.json({ success: true, review: updated });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.get('/api/me/reviews', guards.requireAuth, async (req: any, res: Response): Promise<void> => {
    try {
      const reviews = await listReviewsForAuthor(req.user.id);
      res.json({ reviews });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.patch('/api/admin/reviews/:id/moderation', guards.requireAdmin, async (req: any, res: Response): Promise<void> => {
    try {
      if (req.user.role !== 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Only a Super Admin can moderate reviews.' });
        return;
      }
      const status = req.body?.status;
      if (!['APPROVED', 'REJECTED', 'REMOVED'].includes(status)) {
        res.status(400).json({ error: 'Status must be APPROVED, REJECTED, or REMOVED.' });
        return;
      }
      const reason = typeof req.body?.reason === 'string' ? req.body.reason.slice(0, 200) : undefined;
      const review = await moderateReview({
        reviewId: req.params.id,
        status,
        reason
      });
      if (!review) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }
      await recordModeration(req.user.id, 'REVIEW', review.id, status, reason);
      await createAuditLog({
        actorId: req.user.id,
        actorEmail: req.user.email,
        actorRole: req.user.role,
        action: 'REVIEW_MODERATION',
        targetId: review.id,
        details: { status, reason: reason || '' }
      });
      res.json({ success: true, review });
    } catch (err) {
      sendError(res, err);
    }
  });
}
