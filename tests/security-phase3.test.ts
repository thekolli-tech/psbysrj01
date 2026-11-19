import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-security-phase3-test-${process.pid}.db`;
process.env.GUPSHUP_WEBHOOK_SECRETS = 'rotation-secret-1,rotation-secret-2';
process.env.GUPSHUP_WEBHOOK_SECRET = 'primary-secret-3';
process.env.GUPSHUP_ACCOUNT_SECRET = 'legacy-fallback-4';

const {
  initDatabase,
  createUser,
  createSession,
  createUploadIntentRecord,
  getUploadIntentById,
  claimUploadIntent,
  finalizeUploadIntent,
  failUploadIntent
} = await import('../src/server/db.ts');

const {
  verifyWebhookSecret,
  isWebhookEventDuplicate,
  isValidWebhookTimestamp,
  resetWebhookDedupForTesting
} = await import('../src/server/webhookSecurity.ts');

await initDatabase();

test('Security Phase 3 — Adversarial Infrastructure & Lifecycle Suite', async (t) => {
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  // Seed test users
  const adminUser = await createUser({
    name: 'Super Admin Phase 3',
    email: `admin-p3-${Date.now()}@propertystudio.org`,
    phone: '+919014555566',
    role: 'SUPER_ADMIN',
    isVerified: true,
    phoneVerified: true
  });
  const adminSession = await createSession(adminUser.id, 'test-agent', '127.0.0.1');
  const adminHeaders = {
    Authorization: `Bearer ${adminSession.token}`,
    'Content-Type': 'application/json'
  };

  const normalUser = await createUser({
    name: 'Regular User Phase 3',
    email: `user-p3-${Date.now()}@example.com`,
    phone: '+919014555567',
    role: 'PROPERTY_SEEKER',
    isVerified: true,
    phoneVerified: true
  });
  const userSession = await createSession(normalUser.id, 'test-agent', '127.0.0.1');
  const userHeaders = {
    Authorization: `Bearer ${userSession.token}`,
    'Content-Type': 'application/json'
  };

  const otherUser = await createUser({
    name: 'Attacker User Phase 3',
    email: `attacker-p3-${Date.now()}@example.com`,
    phone: '+919014555568',
    role: 'PROPERTY_SEEKER',
    isVerified: true,
    phoneVerified: true
  });
  const otherSession = await createSession(otherUser.id, 'test-agent', '127.0.0.1');
  const otherHeaders = {
    Authorization: `Bearer ${otherSession.token}`,
    'Content-Type': 'application/json'
  };

  // ============================================================================
  // 1. UPLOAD INTENT LIFECYCLE & CONCURRENCY TESTS (FINDING-3B)
  // ============================================================================

  await t.test('Upload Lifecycle: Atomic claim transitions PENDING to UPLOADING and succeeds', async () => {
    const uploadId = `intent_claim_test_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 5 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    const res = await fetch(`${baseUrl}/api/media/upload-direct/${uploadId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userSession.token}`,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('test-video-payload-data')
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.uploadId, uploadId);

    // Intent must now be COMPLETED
    const after = await getUploadIntentById(uploadId);
    assert.equal(after?.status, 'COMPLETED');
    assert.ok(after?.completed_at, 'completed_at timestamp must be set');
  });

  await t.test('Upload Lifecycle: Replay attempt on COMPLETED intent is rejected with HTTP 409', async () => {
    const uploadId = `intent_replay_test_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 5 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    // 1st upload: succeeds and completes
    const res1 = await fetch(`${baseUrl}/api/media/upload-direct/${uploadId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userSession.token}`,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('initial-video-data')
    });
    assert.equal(res1.status, 200);

    // 2nd upload replay attempt: must be strictly rejected with 409 Conflict
    const res2 = await fetch(`${baseUrl}/api/media/upload-direct/${uploadId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userSession.token}`,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('replay-video-data')
    });
    assert.equal(res2.status, 409);
    const errData = await res2.json();
    assert.equal(errData.code, 'INTENT_STATE_CONFLICT');
  });

  await t.test('Upload Lifecycle: Concurrent claims allow only ONE winner, second receives HTTP 409', async () => {
    const uploadId = `intent_concurrent_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 10 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    // Fire 2 concurrent claims simultaneously
    const [claim1, claim2] = await Promise.all([
      claimUploadIntent(uploadId, normalUser.id, false),
      claimUploadIntent(uploadId, normalUser.id, false)
    ]);

    const winnerCount = (claim1.success ? 1 : 0) + (claim2.success ? 1 : 0);
    assert.equal(winnerCount, 1, 'Exactly one concurrent request must win the claim');

    const loser = !claim1.success ? claim1 : claim2;
    assert.equal(loser.status, 409, 'Loser must receive HTTP 409 Conflict');
    assert.equal(loser.error, 'An upload transfer is already in progress for this session.');
  });

  await t.test('Upload Lifecycle: FAILED intents cannot be reused or reclaimed', async () => {
    const uploadId = `intent_failed_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 5 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    // Claim and then fail
    const claim = await claimUploadIntent(uploadId, normalUser.id, false);
    assert.equal(claim.success, true);
    await failUploadIntent(uploadId, 'TEST_STREAM_ERROR');

    // Attempt to claim again: must be rejected with 409
    const retryClaim = await claimUploadIntent(uploadId, normalUser.id, false);
    assert.equal(retryClaim.success, false);
    assert.equal(retryClaim.status, 409);
    assert.equal(retryClaim.error, 'This upload intent has failed and cannot be reused.');
  });

  await t.test('Upload Lifecycle: Unauthorized user cannot claim someone elses intent', async () => {
    const uploadId = `intent_unauth_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 5 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    const res = await fetch(`${baseUrl}/api/media/upload-direct/${uploadId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${otherSession.token}`,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('attacker-data')
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.error, 'Access denied: You do not own this upload session.');
  });

  await t.test('Upload Lifecycle: Super Admin can claim and manage any upload intent', async () => {
    const uploadId = `intent_admin_override_${Date.now()}`;
    await createUploadIntentRecord({
      id: uploadId,
      user_id: normalUser.id,
      storage_key: `raw_uploads/${uploadId}.mp4`,
      storage_provider: 'LOCAL_STREAM',
      expected_mime_type: 'video/mp4',
      expected_file_size: 5 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });

    // Super Admin performs the upload
    const res = await fetch(`${baseUrl}/api/media/upload-direct/${uploadId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminSession.token}`,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('admin-verified-data')
    });

    assert.equal(res.status, 200);
    const updated = await getUploadIntentById(uploadId);
    assert.equal(updated?.status, 'COMPLETED');
  });

  // ============================================================================
  // 2. GUPSHUP WEBHOOK HARDENING TESTS (FINDING-3D)
  // ============================================================================

  await t.test('Webhook Security: Multi-secret rotation accepts primary, rotation-list, and legacy secrets', async () => {
    // 1. Accepted via GUPSHUP_WEBHOOK_SECRETS primary item
    const resRot1 = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=rotation-secret-1`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { gsId: 'msg_rot_1', type: 'delivered' } })
    });
    assert.equal(resRot1.status, 200);

    // 2. Accepted via GUPSHUP_WEBHOOK_SECRETS secondary item
    const resRot2 = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=rotation-secret-2`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { gsId: 'msg_rot_2', type: 'delivered' } })
    });
    assert.equal(resRot2.status, 200);

    // 3. Accepted via GUPSHUP_WEBHOOK_SECRET
    const resPri = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { gsId: 'msg_rot_3', type: 'delivered' } })
    });
    assert.equal(resPri.status, 200);

    // 4. Accepted via GUPSHUP_ACCOUNT_SECRET fallback
    const resLeg = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=legacy-fallback-4`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { gsId: 'msg_rot_4', type: 'delivered' } })
    });
    assert.equal(resLeg.status, 200);

    // 5. Rejected for invalid token
    const resBad = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=invalid-attacker-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'message-event', payload: { gsId: 'msg_rot_5', type: 'delivered' } })
    });
    assert.equal(resBad.status, 401);
  });

  await t.test('Webhook Security: Duplicate event is safely deduplicated and acknowledged with duplicate: true', async () => {
    resetWebhookDedupForTesting();
    const gsId = `gs_dedup_${Date.now()}`;

    // 1st event: novel
    const res1 = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        type: 'message-event',
        payload: { gsId, type: 'delivered' }
      })
    });
    assert.equal(res1.status, 200);
    const data1 = await res1.json();
    assert.equal(data1.success, true);
    assert.equal(data1.duplicate, undefined);

    // 2nd event: duplicate
    const res2 = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: Date.now(),
        type: 'message-event',
        payload: { gsId, type: 'delivered' }
      })
    });
    assert.equal(res2.status, 200);
    const data2 = await res2.json();
    assert.equal(data2.success, true);
    assert.equal(data2.duplicate, true, 'Duplicate webhook event must be acknowledged with duplicate: true');
  });

  await t.test('Webhook Security: Timestamp freshness validation rejects clock-skew anomalies and stale events', async () => {
    // Stale timestamp (3 days in the past)
    const staleTs = Date.now() - 3 * 24 * 60 * 60 * 1000;
    const resStale = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: staleTs,
        type: 'message-event',
        payload: { gsId: 'msg_stale_1', type: 'delivered' }
      })
    });
    assert.equal(resStale.status, 400);

    // Future timestamp (1 hour in the future)
    const futureTs = Date.now() + 60 * 60 * 1000;
    const resFuture = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: futureTs,
        type: 'message-event',
        payload: { gsId: 'msg_future_1', type: 'delivered' }
      })
    });
    assert.equal(resFuture.status, 400);

    // Malformed string timestamp
    const resMalformed = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: 'invalid-malformed-timestamp',
        type: 'message-event',
        payload: { gsId: 'msg_malformed_1', type: 'delivered' }
      })
    });
    assert.equal(resMalformed.status, 400);

    // Negative timestamp
    const resNegative = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: -500,
        type: 'message-event',
        payload: { gsId: 'msg_neg_1', type: 'delivered' }
      })
    });
    assert.equal(resNegative.status, 400);

    // Omitted timestamp (should be accepted - do not reject events that legitimately omit timestamp)
    const resOmitted = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'message-event',
        payload: { gsId: `msg_notime_${Date.now()}`, type: 'delivered' }
      })
    });
    assert.equal(resOmitted.status, 200);

    // Valid current timestamp (within tolerance)
    const validTs = Date.now() - 30 * 1000;
    const resValid = await fetch(`${baseUrl}/api/webhooks/gupshup?secret=primary-secret-3`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: validTs,
        type: 'message-event',
        payload: { gsId: `msg_valid_${Date.now()}`, type: 'delivered' }
      })
    });
    assert.equal(resValid.status, 200);
  });

  // ============================================================================
  // 3. AUTHENTICATION & IDOR REGRESSION TESTS
  // ============================================================================

  await t.test('Auth & IDOR: Session is successfully revoked in database upon logout', async () => {
    const tempUser = await createUser({
      name: 'Temp Logout User',
      email: `logout-${Date.now()}@example.com`,
      phone: '+919014555569',
      role: 'PROPERTY_SEEKER',
      isVerified: true,
      phoneVerified: true
    });
    const tempSession = await createSession(tempUser.id, 'logout-agent', '127.0.0.1');

    // Verify session works
    const check1 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tempSession.token}` }
    });
    assert.equal(check1.status, 200);

    // Logout
    const logoutRes = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${tempSession.token}` }
    });
    assert.equal(logoutRes.status, 200);

    // Verify session is now revoked: /api/auth/me returns user: null and protected routes return 401
    const check2 = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${tempSession.token}` }
    });
    assert.equal(check2.status, 200);
    const meData = await check2.json();
    assert.equal(meData.user, null, 'Revoked session must yield user: null');

    const protectedCheck = await fetch(`${baseUrl}/api/me/bookmarks`, {
      headers: { Authorization: `Bearer ${tempSession.token}` }
    });
    assert.equal(protectedCheck.status, 401, 'Revoked session must be rejected with 401 on protected routes');
  });

  await t.test('Auth & IDOR: Regular user cannot perform privilege escalation to SUPER_ADMIN', async () => {
    const res = await fetch(`${baseUrl}/api/admin/users/${normalUser.id}/role`, {
      method: 'PATCH',
      headers: userHeaders,
      body: JSON.stringify({ role: 'SUPER_ADMIN' })
    });
    assert.equal(res.status, 403, 'Regular user must be forbidden from updating roles');
  });

  server.close();
});
