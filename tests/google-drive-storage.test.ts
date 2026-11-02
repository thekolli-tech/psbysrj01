import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// Configure test environment with isolated SQLite
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-gdrive-media-test-${process.pid}.db`;

const {
  initDatabase,
  createUser,
  createSession,
  createUploadIntentRecord,
  getUploadIntentById,
  updateUploadIntentStatus,
  createMedia,
  getMediaById,
  getAllMedia
} = await import('../src/server/db.ts');

await initDatabase();

const {
  getMediaStorageConfig,
  createUploadIntent,
  verifyObjectInStorage,
  getPublicPlaybackUrl,
  STORAGE_LIMITS,
  ALLOWED_MIME_TYPES
} = await import('../src/server/mediaStorage.ts');

const {
  getGoogleDriveConfig,
  getGoogleOAuthAuthorizeUrl,
  createOAuthState,
  validateOAuthState,
  encryptSecret,
  decryptSecret,
  saveStoredRefreshToken,
  loadStoredRefreshToken,
  clearStoredRefreshToken,
  DRIVE_STORAGE_LIMITS,
  DRIVE_ALLOWED_MIME_TYPES
} = await import('../src/server/googleDriveStorage.ts');

test('Google Drive Storage: Configuration reporting integrity', () => {
  const origClientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const origClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const origRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
  const origRootFolder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const origAccountEmail = process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL;

  try {
    clearStoredRefreshToken();
    // 1. Without credentials, reports configured: false and lists missing variables without secrets
    delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;

    const unconfigured = getGoogleDriveConfig();
    assert.equal(unconfigured.configured, false);
    assert.equal(unconfigured.provider, null);
    assert.ok(unconfigured.missingVariables.includes('GOOGLE_DRIVE_CLIENT_ID'));
    assert.ok(unconfigured.missingVariables.includes('GOOGLE_DRIVE_CLIENT_SECRET'));
    assert.ok(unconfigured.missingVariables.includes('GOOGLE_DRIVE_REFRESH_TOKEN'));
    assert.equal(unconfigured.maxVideoSizeBytes, DRIVE_STORAGE_LIMITS.MAX_VIDEO_SIZE_BYTES);

    const mediaStorageUnconfigured = getMediaStorageConfig();
    assert.equal(mediaStorageUnconfigured.configured, false);
    assert.equal(mediaStorageUnconfigured.provider, null);
    assert.ok(mediaStorageUnconfigured.missingVariables.length > 0);

    // 2. With credentials, reports configured: true with provider: 'google_drive'
    process.env.GOOGLE_DRIVE_CLIENT_ID = 'ps-test-client-id.apps.googleusercontent.com';
    process.env.GOOGLE_DRIVE_CLIENT_SECRET = 'GOCSPX-test-client-secret-12345';
    process.env.GOOGLE_DRIVE_REFRESH_TOKEN = '1//0gtest-refresh-token-abcdef';
    process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL = 'propertystudio.media@gmail.com';

    const configured = getGoogleDriveConfig();
    assert.equal(configured.configured, true);
    assert.equal(configured.provider, 'google_drive');
    assert.equal(configured.accountEmail, 'propertystudio.media@gmail.com');
    assert.equal(configured.missingVariables.length, 0);

    const mediaStorageConfigured = getMediaStorageConfig();
    assert.equal(mediaStorageConfigured.configured, true);
    assert.equal(mediaStorageConfigured.provider, 'google_drive');
    assert.equal(mediaStorageConfigured.missingVariables.length, 0);

    // Verify secrets are NEVER exposed in configuration responses
    const jsonStr = JSON.stringify(mediaStorageConfigured);
    assert.equal(jsonStr.includes('GOCSPX-test-client-secret-12345'), false);
    assert.equal(jsonStr.includes('1//0gtest-refresh-token-abcdef'), false);
  } finally {
    // Restore environment
    clearStoredRefreshToken();
    if (origClientId) process.env.GOOGLE_DRIVE_CLIENT_ID = origClientId; else delete process.env.GOOGLE_DRIVE_CLIENT_ID;
    if (origClientSecret) process.env.GOOGLE_DRIVE_CLIENT_SECRET = origClientSecret; else delete process.env.GOOGLE_DRIVE_CLIENT_SECRET;
    if (origRefreshToken) process.env.GOOGLE_DRIVE_REFRESH_TOKEN = origRefreshToken; else delete process.env.GOOGLE_DRIVE_REFRESH_TOKEN;
    if (origRootFolder) process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID = origRootFolder; else delete process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (origAccountEmail) process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL = origAccountEmail; else delete process.env.GOOGLE_DRIVE_ACCOUNT_EMAIL;
  }
});

test('Google Drive Storage: Validation rejects invalid MIME types and oversized files', async () => {
  // Invalid MIME type for video
  const badMimeVideo = await createUploadIntent({
    filename: 'exploit.exe',
    contentType: 'application/x-msdownload',
    fileSizeBytes: 1024 * 1024,
    mediaCategory: 'VIDEO'
  });
  assert.equal(badMimeVideo.allowed, false);
  assert.match(badMimeVideo.error || '', /Invalid video format/);

  // Invalid MIME type for audio
  const badMimeAudio = await createUploadIntent({
    filename: 'script.sh',
    contentType: 'text/x-shellscript',
    fileSizeBytes: 1024,
    mediaCategory: 'AUDIO'
  });
  assert.equal(badMimeAudio.allowed, false);
  assert.match(badMimeAudio.error || '', /Invalid audio format/);

  // Oversized video (> 500 MB)
  const oversizedVideo = await createUploadIntent({
    filename: 'huge_broadcast.mp4',
    contentType: 'video/mp4',
    fileSizeBytes: 501 * 1024 * 1024,
    mediaCategory: 'VIDEO'
  });
  assert.equal(oversizedVideo.allowed, false);
  assert.match(oversizedVideo.error || '', /exceeds maximum size limit of 500 MB/);

  // Oversized audio (> 100 MB)
  const oversizedAudio = await createUploadIntent({
    filename: 'huge_podcast.mp3',
    contentType: 'audio/mpeg',
    fileSizeBytes: 105 * 1024 * 1024,
    mediaCategory: 'AUDIO'
  });
  assert.equal(oversizedAudio.allowed, false);
  assert.match(oversizedAudio.error || '', /exceeds maximum size limit of 100 MB/);

  // Oversized image (> 10 MB)
  const oversizedImage = await createUploadIntent({
    filename: 'huge_poster.png',
    contentType: 'image/png',
    fileSizeBytes: 15 * 1024 * 1024,
    mediaCategory: 'IMAGE'
  });
  assert.equal(oversizedImage.allowed, false);
  assert.match(oversizedImage.error || '', /exceeds maximum size limit of 10 MB/);
});

test('Google Drive OAuth: Authorization URL generation helper', () => {
  const origClientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  process.env.GOOGLE_DRIVE_CLIENT_ID = 'propertystudio-client-id-1234.apps.googleusercontent.com';

  try {
    const authUrl = getGoogleOAuthAuthorizeUrl('https://propertystudio.vercel.app/api/auth/google-drive/callback', 'test-csrf-state-999');
    assert.ok(authUrl.startsWith('https://accounts.google.com/o/oauth2/v2/auth'));
    assert.ok(authUrl.includes('client_id=propertystudio-client-id-1234.apps.googleusercontent.com'));
    assert.ok(authUrl.includes('access_type=offline'));
    assert.ok(authUrl.includes('prompt=consent'));
    assert.ok(authUrl.includes('state=test-csrf-state-999'));
    assert.ok(authUrl.includes('redirect_uri=https%3A%2F%2Fpropertystudio.vercel.app%2Fapi%2Fauth%2Fgoogle-drive%2Fcallback'));
    assert.ok(authUrl.includes('https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive'));
  } finally {
    if (origClientId) process.env.GOOGLE_DRIVE_CLIENT_ID = origClientId; else delete process.env.GOOGLE_DRIVE_CLIENT_ID;
  }
});

test('OAuth State Management: Cryptographic signing, expiration, and replay prevention', () => {
  const userId = 'usr_superadmin_state_test';

  // 1. Create valid signed state
  const state = createOAuthState(userId);
  assert.ok(state);
  assert.ok(state.includes('.'), 'State must contain payload and cryptographic HMAC');

  // 2. Valid state verification succeeds on first attempt
  const validation = validateOAuthState(state);
  assert.equal(validation.valid, true);
  assert.equal(validation.userId, userId);

  // 3. Replay prevention: second verification must fail (single-use consumption)
  const replayValidation = validateOAuthState(state);
  assert.equal(replayValidation.valid, false);
  assert.match(replayValidation.error || '', /already used|unverified/i);

  // 4. Tampered state signature is rejected
  const tamperedState = `${state.slice(0, -6)}ffffff`;
  const tamperedValidation = validateOAuthState(tamperedState);
  assert.equal(tamperedValidation.valid, false);
  assert.match(tamperedValidation.error || '', /signature|Malformed/i);

  // 5. Missing or invalid state formats are rejected
  assert.equal(validateOAuthState(undefined).valid, false);
  assert.equal(validateOAuthState('').valid, false);
  assert.equal(validateOAuthState('plain-string-no-hmac').valid, false);
});

test('Server-Side Secret Vault: AES-256-GCM encryption and secure credential persistence', async () => {
  const rawSecret = '1//0gTestSecureRefreshTokenValue987654321';

  // 1. Encrypt and decrypt round-trip
  const encrypted = encryptSecret(rawSecret);
  assert.notEqual(encrypted, rawSecret);
  assert.ok(!encrypted.includes('1//0gTest'));

  const decrypted = decryptSecret(encrypted);
  assert.equal(decrypted, rawSecret);

  // 2. Save stored refresh token and load it
  await saveStoredRefreshToken(rawSecret);
  const loaded = loadStoredRefreshToken();
  assert.equal(loaded, rawSecret);
  clearStoredRefreshToken();
});

test('Upload Intent Tracking: Intent persistence, ownership, expiration, and duplicate protection', async () => {
  const uploadId = `upl_gdrive_test_${Date.now()}`;
  const userId = 'usr_superadmin_1';
  const storageKey = `media/video/${uploadId}.mp4`;

  // 1. Create and persist upload intent
  await createUploadIntentRecord({
    id: uploadId,
    user_id: userId,
    storage_key: storageKey,
    storage_provider: 'GOOGLE_DRIVE',
    expected_mime_type: 'video/mp4',
    expected_file_size: 25 * 1024 * 1024,
    media_category: 'VIDEO',
    status: 'PENDING',
    expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });

  // 2. Retrieve intent by ID
  const retrieved = await getUploadIntentById(uploadId);
  assert.ok(retrieved, 'Intent must exist in database');
  assert.equal(retrieved.id, uploadId);
  assert.equal(retrieved.user_id, userId);
  assert.equal(retrieved.storage_key, storageKey);
  assert.equal(retrieved.storage_provider, 'GOOGLE_DRIVE');
  assert.equal(retrieved.status, 'PENDING');
  assert.equal(retrieved.expected_mime_type, 'video/mp4');

  // 3. Mark intent as COMPLETED
  const completedAt = new Date().toISOString();
  await updateUploadIntentStatus(uploadId, 'COMPLETED', completedAt);

  const updated = await getUploadIntentById(uploadId);
  assert.equal(updated?.status, 'COMPLETED');
  assert.ok(updated?.completed_at);

  // 4. Test expired intent handling
  const expiredId = `upl_gdrive_expired_${Date.now()}`;
  await createUploadIntentRecord({
    id: expiredId,
    user_id: userId,
    storage_key: `media/video/${expiredId}.mp4`,
    storage_provider: 'GOOGLE_DRIVE',
    expected_mime_type: 'video/mp4',
    expected_file_size: 10 * 1024 * 1024,
    media_category: 'VIDEO',
    status: 'PENDING',
    expires_at: new Date(Date.now() - 5000).toISOString(), // Past expiration
    created_at: new Date(Date.now() - 10000).toISOString(),
    updated_at: new Date(Date.now() - 10000).toISOString()
  });

  const expiredIntent = await getUploadIntentById(expiredId);
  assert.ok(expiredIntent);
  assert.ok(new Date(expiredIntent.expires_at).getTime() < Date.now(), 'Intent must be expired');
});

test('HTTP API: Full lifecycle testing for Google Drive Media Storage', async () => {
  // Start server instance for HTTP testing
  const { app } = await import('../server.ts');
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const { port } = server.address() as AddressInfo;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Create accounts for testing
    const adminUser = await createUser({
      name: 'Super Admin Test',
      email: `admin_gdrive_${Date.now()}@example.com`,
      phone: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'SUPER_ADMIN',
      password: 'Password123!',
      isVerified: true
    });
    const adminSession = await createSession(adminUser.id);
    const adminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminSession.token}`
    };

    const devUser = await createUser({
      name: 'Developer Test',
      email: `dev_gdrive_${Date.now()}@example.com`,
      phone: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'DEVELOPER',
      password: 'Password123!',
      isVerified: true
    });
    const devSession = await createSession(devUser.id);
    const devHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${devSession.token}`
    };

    const seekerUser = await createUser({
      name: 'Seeker Test',
      email: `seeker_gdrive_${Date.now()}@example.com`,
      phone: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'PROPERTY_SEEKER',
      password: 'Password123!',
      isVerified: true
    });
    const seekerSession = await createSession(seekerUser.id);
    const seekerHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${seekerSession.token}`
    };

    // 1. Storage config endpoint reports Google Drive status
    const configRes = await fetch(`${baseUrl}/api/media/storage/config`);
    assert.equal(configRes.status, 200);
    const configData = await configRes.json();
    assert.ok(typeof configData.configured === 'boolean');
    assert.equal(configData.maxVideoSizeBytes, 500 * 1024 * 1024);

    // 1b. OAuth Authorize Endpoint: RBAC & State validation
    const anonAuthRes = await fetch(`${baseUrl}/api/auth/google-drive/authorize`);
    assert.ok(anonAuthRes.status === 401 || anonAuthRes.status === 403, 'Anonymous must be rejected from OAuth authorize');

    const seekerAuthRes = await fetch(`${baseUrl}/api/auth/google-drive/authorize`, { headers: seekerHeaders });
    assert.equal(seekerAuthRes.status, 403, 'Seeker must be forbidden from initiating Google Drive authorization');

    const adminAuthRes = await fetch(`${baseUrl}/api/auth/google-drive/authorize`, { headers: adminHeaders });
    assert.equal(adminAuthRes.status, 200);
    const adminAuthData = await adminAuthRes.json();
    assert.ok(adminAuthData.authUrl);
    assert.ok(adminAuthData.redirectUri);
    assert.ok(adminAuthData.authUrl.includes('state='));
    assert.ok(adminAuthData.authUrl.includes('access_type=offline'));

    // 1c. OAuth Callback: Validates state and rejects forged or missing state
    const noStateCallback = await fetch(`${baseUrl}/api/auth/google-drive/callback?code=fake_code`);
    assert.equal(noStateCallback.status, 400, 'Callback without state parameter must return 400');
    const noStateBody = await noStateCallback.text();
    assert.ok(!noStateBody.includes('refresh_token'), 'Must never render refresh token');
    assert.ok(!noStateBody.includes('client_secret'), 'Must never render client secret');

    const badStateCallback = await fetch(`${baseUrl}/api/auth/google-drive/callback?code=fake_code&state=tampered.123456`);
    assert.equal(badStateCallback.status, 400, 'Callback with invalid state parameter must return 400');
    const badStateBody = await badStateCallback.text();
    assert.ok(!badStateBody.includes('refresh_token'), 'Must never render refresh token');

    // 2. Unauthorized / Non-SuperAdmin rejected from create upload intent
    const anonIntentRes = await fetch(`${baseUrl}/api/media/upload-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filename: 'test.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 1024 * 1024,
        mediaCategory: 'VIDEO'
      })
    });
    assert.ok(anonIntentRes.status === 401 || anonIntentRes.status === 403, 'Anonymous user must be rejected');

    const devIntentRes = await fetch(`${baseUrl}/api/media/upload-intent`, {
      method: 'POST',
      headers: devHeaders,
      body: JSON.stringify({
        filename: 'test.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 1024 * 1024,
        mediaCategory: 'VIDEO'
      })
    });
    assert.equal(devIntentRes.status, 403, 'Developer role must be rejected from uploading platform media');

    const seekerIntentRes = await fetch(`${baseUrl}/api/media/upload-intent`, {
      method: 'POST',
      headers: seekerHeaders,
      body: JSON.stringify({
        filename: 'test.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 1024 * 1024,
        mediaCategory: 'VIDEO'
      })
    });
    assert.equal(seekerIntentRes.status, 403, 'Seeker role must be rejected from uploading platform media');

    // 3. Super Admin creates valid upload intent
    const adminIntentRes = await fetch(`${baseUrl}/api/media/upload-intent`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        filename: 'neopolis_infrastructure_walkthrough.mp4',
        contentType: 'video/mp4',
        fileSizeBytes: 35 * 1024 * 1024,
        mediaCategory: 'VIDEO',
        title: 'Neopolis Infrastructure Walkthrough'
      })
    });
    assert.equal(adminIntentRes.status, 200);
    const intentData = await adminIntentRes.json();
    assert.equal(intentData.allowed, true);
    assert.ok(intentData.uploadId);
    assert.ok(intentData.uploadUrl);
    assert.ok(intentData.storageKey);

    const createdUploadId = intentData.uploadId;

    // 4. Non-admin is rejected from streaming upload endpoint (/api/media/drive-upload)
    const seekerUploadRes = await fetch(`${baseUrl}/api/media/drive-upload?uploadId=${createdUploadId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
        'Authorization': `Bearer ${seekerSession.token}`
      },
      body: Buffer.from('unauthorized attempt')
    });
    assert.equal(seekerUploadRes.status, 403, 'Non-admin must be rejected from drive upload');

    // 5. Super Admin streams file bytes via /api/media/drive-upload
    const adminUploadRes = await fetch(`${baseUrl}/api/media/drive-upload?uploadId=${createdUploadId}`, {
      method: 'PUT',
      headers: {
        ...adminHeaders,
        'Content-Type': 'video/mp4'
      },
      body: Buffer.from('mp4 simulated binary data chunk 1234567890')
    });
    assert.equal(adminUploadRes.status, 200);
    const uploadResData = await adminUploadRes.json();
    assert.equal(uploadResData.success, true);
    assert.equal(uploadResData.uploadId, createdUploadId);

    // 6. Complete upload & persist media item
    const completeRes = await fetch(`${baseUrl}/api/media/upload-complete`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        uploadId: createdUploadId,
        title: 'Neopolis Infrastructure Walkthrough',
        summary: 'Technical inspection of elevated corridor and commercial district.',
        type: 'MASTERCLASS',
        category: 'Urban Infrastructure',
        duration: '24:10',
        host: 'Swamy Reddy Javidi',
        status: 'PUBLISHED'
      })
    });
    assert.equal(completeRes.status, 201, 'Upload completion must succeed with 201');
    const completeData = await completeRes.json();
    assert.equal(completeData.success, true);
    assert.ok(completeData.mediaId);
    assert.ok(completeData.mediaUrl);

    const newMediaId = completeData.mediaId;

    // 7. Duplicate completion protection: second call must return 409 Conflict
    const dupRes = await fetch(`${baseUrl}/api/media/upload-complete`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        uploadId: createdUploadId,
        title: 'Neopolis Infrastructure Walkthrough'
      })
    });
    assert.equal(dupRes.status, 409, 'Duplicate completion must be rejected with 409 Conflict');

    // 8. Verify media item appears in GET /api/media
    const listRes = await fetch(`${baseUrl}/api/media`);
    assert.equal(listRes.status, 200);
    const listData = await listRes.json();
    const found = listData.items.find((m: any) => m.id === newMediaId);
    assert.ok(found, 'Created media item must appear in media list');
    assert.equal(found.title, 'Neopolis Infrastructure Walkthrough');
    assert.equal(found.status, 'PUBLISHED');

    // 9. Stream delivery URL resolution for published media
    const streamRes = await fetch(`${baseUrl}/api/media/${newMediaId}/stream`, {
      headers: { 'Accept': 'application/json' }
    });
    assert.equal(streamRes.status, 200);
    const streamData = await streamRes.json();
    assert.ok(streamData.streamUrl, 'Must return streamUrl');

    // 10. Binary stream request with HTTP Range header simulation
    const binaryStreamRes = await fetch(`${baseUrl}/api/media/${newMediaId}/stream`, {
      headers: { 'Range': 'bytes=0-15' }
    });
    assert.equal(binaryStreamRes.status, 200);
    assert.equal(binaryStreamRes.headers.get('accept-ranges'), 'bytes');

    // 11. Existing external media compatibility (e.g. YouTube URL)
    const externalMediaId = await createMedia({
      title: 'YouTube Masterclass Broadcast',
      summary: 'Infrastructure tour video hosted on YouTube.',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      media_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00',
      type: 'PROJECT_WALKTHROUGH',
      status: 'PUBLISHED'
    });

    const extStreamRes = await fetch(`${baseUrl}/api/media/${externalMediaId}/stream`, {
      headers: { 'Accept': 'application/json' }
    });
    assert.equal(extStreamRes.status, 200);
    const extStreamData = await extStreamRes.json();
    assert.equal(extStreamData.streamUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    assert.equal(extStreamData.isExternal, true);

    // 12. Expired upload intent is rejected during upload-complete
    const expUploadId = `upl_exp_${Date.now()}`;
    await createUploadIntentRecord({
      id: expUploadId,
      user_id: adminUser.id,
      storage_key: `media/video/${expUploadId}.mp4`,
      storage_provider: 'LOCAL_SIMULATED',
      expected_mime_type: 'video/mp4',
      expected_file_size: 10 * 1024 * 1024,
      media_category: 'VIDEO',
      status: 'PENDING',
      expires_at: new Date(Date.now() - 60000).toISOString(), // Expired 1 min ago
      created_at: new Date(Date.now() - 120000).toISOString(),
      updated_at: new Date(Date.now() - 120000).toISOString()
    });

    const expCompleteRes = await fetch(`${baseUrl}/api/media/upload-complete`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        uploadId: expUploadId,
        title: 'Expired Video Attempt'
      })
    });
    assert.equal(expCompleteRes.status, 400, 'Expired intent must be rejected with 400');
    const expErr = await expCompleteRes.json();
    assert.match(expErr.error, /expired/i);

    // 13. Unknown uploadId returns 404
    const unknownCompleteRes = await fetch(`${baseUrl}/api/media/upload-complete`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        uploadId: 'upl_non_existent_random_id',
        title: 'Non-existent Intent Attempt'
      })
    });
    assert.equal(unknownCompleteRes.status, 404, 'Unknown intent must return 404');

    // 14. Draft media access control (Seeker 403 vs Super Admin 200)
    const draftMediaId = await createMedia({
      title: 'Confidential Internal Masterclass Draft',
      summary: 'Not yet ready for public distribution.',
      media_url: 'https://propertystudio.in/private/draft1.mp4',
      type: 'MASTERCLASS',
      status: 'DRAFT',
      storage_provider: 'GOOGLE_DRIVE',
      storage_key: 'media/video/draft_confidential.mp4'
    });

    // Seeker cannot stream draft media
    const seekerDraftStream = await fetch(`${baseUrl}/api/media/${draftMediaId}/stream`, {
      headers: seekerHeaders
    });
    assert.equal(seekerDraftStream.status, 403, 'Seeker must be forbidden from draft media stream');

    // Super Admin CAN stream draft media
    const adminDraftStream = await fetch(`${baseUrl}/api/media/${draftMediaId}/stream`, {
      headers: {
        ...adminHeaders,
        'Accept': 'application/json'
      }
    });
    assert.equal(adminDraftStream.status, 200, 'Super Admin must be authorized to stream draft media');
    const adminDraftData = await adminDraftStream.json();
    assert.ok(adminDraftData.streamUrl);

    // 15. Verify access from a second authorized Super Admin account
    const secondAdminUser = await createUser({
      name: 'Second Super Admin',
      email: `admin2_gdrive_${Date.now()}@example.com`,
      phone: `+9199999${Math.floor(10000 + Math.random() * 90000)}`,
      role: 'SUPER_ADMIN',
      password: 'Password123!',
      isVerified: true
    });
    const secondAdminSession = await createSession(secondAdminUser.id);
    const secondAdminHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${secondAdminSession.token}`,
      'Accept': 'application/json'
    };

    const secondAdminStream = await fetch(`${baseUrl}/api/media/${draftMediaId}/stream`, {
      headers: secondAdminHeaders
    });
    assert.equal(secondAdminStream.status, 200, 'Second authorized Super Admin must also have access');

  } finally {
    server.close();
  }
});
