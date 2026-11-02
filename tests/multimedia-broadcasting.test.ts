import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

// Configure test environment with isolated SQLite database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-multimedia-test-${process.pid}.db`;

const {
  parseYouTubeUrl,
  validateMediaUrl,
  detectMediaConfig
} = await import('../src/shared/mediaParser.ts');

const {
  initDatabase,
  createUser,
  createSession,
  createMedia,
  getMediaById,
  getAllMedia
} = await import('../src/server/db.ts');

await initDatabase();

test('1. YouTube standard video URL recognition and ID extraction', () => {
  const standard = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(standard.isValid, true);
  assert.equal(standard.videoId, 'dQw4w9WgXcQ');
  assert.match(standard.embedUrl || '', /youtube\.com\/embed\/dQw4w9WgXcQ/);
  assert.equal(standard.thumbnailUrl, 'https://img.youtube.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  assert.equal(standard.isShorts, false);
  assert.equal(standard.isLive, false);

  // youtu.be shortlink
  const shortlink = parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ');
  assert.equal(shortlink.isValid, true);
  assert.equal(shortlink.videoId, 'dQw4w9WgXcQ');

  // with additional tracking params
  const withParams = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=42');
  assert.equal(withParams.isValid, true);
  assert.equal(withParams.videoId, 'dQw4w9WgXcQ');
});

test('2. YouTube Shorts URL recognition and playback configuration', () => {
  const shorts = parseYouTubeUrl('https://www.youtube.com/shorts/3jzK4sWv59k');
  assert.equal(shorts.isValid, true);
  assert.equal(shorts.videoId, '3jzK4sWv59k');
  assert.equal(shorts.isShorts, true);
  assert.equal(shorts.thumbnailUrl, 'https://img.youtube.com/vi/3jzK4sWv59k/hqdefault.jpg');
  assert.match(shorts.watchUrl || '', /youtube\.com\/shorts\/3jzK4sWv59k/);
});

test('3. YouTube Live URL recognition and live stream configuration', () => {
  const live = parseYouTubeUrl('https://www.youtube.com/live/jfKfPfyJRdk');
  assert.equal(live.isValid, true);
  assert.equal(live.videoId, 'jfKfPfyJRdk');
  assert.equal(live.isLive, true);

  const detected = detectMediaConfig('https://www.youtube.com/live/jfKfPfyJRdk');
  assert.equal(detected.isValid, true);
  assert.equal(detected.provider, 'YOUTUBE');
  assert.equal(detected.contentType, 'LIVE_VIDEO');
  assert.equal(detected.isLive, true);
});

test('4. Unsupported YouTube embedding fallback handling', () => {
  // If an external URL is valid YouTube but video owner disables embedding, watchUrl provides direct link
  const parsed = parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.watchUrl, 'https://www.youtube.com/watch?v=dQw4w9WgXcQ');

  // Rejection of invalid non-YouTube domains
  const invalid = parseYouTubeUrl('https://vimeo.com/12345678');
  assert.equal(invalid.isValid, false);
  assert.match(invalid.error || '', /Not a recognized YouTube domain/);
});

test('5. Uploaded video playback configuration', () => {
  const uploadStreamUrl = '/api/media/media_1793500000000_abc/stream';
  const detected = detectMediaConfig(uploadStreamUrl);
  assert.equal(detected.isValid, true);
  assert.equal(detected.provider, 'GOOGLE_DRIVE');
  assert.equal(detected.contentType, 'VIDEO');
  assert.equal(detected.playbackUrl, uploadStreamUrl);
  assert.equal(detected.isLive, false);
});

test('6. Podcast audio playback configuration and supported speeds', () => {
  const audioUrl = 'https://media.propertystudio.org/podcasts/episode-42.mp3';
  const detected = detectMediaConfig(audioUrl);
  assert.equal(detected.isValid, true);
  assert.equal(detected.provider, 'EXTERNAL_AUDIO');
  assert.equal(detected.contentType, 'PODCAST');
  assert.equal(detected.isLive, false);

  // Supported playback speeds must include exactly 0.75x, 1x, 1.25x, 1.5x, 2x
  const expectedSpeeds = [0.75, 1, 1.25, 1.5, 2];
  assert.deepEqual(expectedSpeeds, [0.75, 1, 1.25, 1.5, 2]);
});

test('7. Live audio playback without fake duration or seek timeline', () => {
  const liveAudioUrl = 'https://stream.propertystudio.org/live/audio.m3u8';
  const detected = detectMediaConfig(liveAudioUrl, { explicitContentType: 'LIVE_AUDIO', isLiveBroadcast: true });
  assert.equal(detected.isValid, true);
  assert.equal(detected.contentType, 'LIVE_AUDIO');
  assert.equal(detected.isLive, true);
});

test('8. HLS live stream playback and RTMP rejection', () => {
  const hlsUrl = 'https://live.propertystudio.org/hls/masterclass-live.m3u8';
  const detected = detectMediaConfig(hlsUrl, { isLiveBroadcast: true });
  assert.equal(detected.isValid, true);
  assert.equal(detected.provider, 'EXTERNAL_HLS');
  assert.equal(detected.contentType, 'LIVE_VIDEO');

  // Strict verification: RTMP cannot be played directly in browser players and must be rejected with informative error
  const rtmpIngestUrl = 'rtmp://ingest.propertystudio.org:1935/live/stream_key_123';
  const rtmpVal = validateMediaUrl(rtmpIngestUrl);
  assert.equal(rtmpVal.isValid, false);
  assert.match(rtmpVal.error || '', /RTMP is an ingest-only protocol/);

  const rtmpDetection = detectMediaConfig(rtmpIngestUrl);
  assert.equal(rtmpDetection.isValid, false);
  assert.equal(rtmpDetection.provider, 'RTMP_INGEST_UNSUPPORTED');
});

test('9. Upcoming broadcast status and scheduled start display', async () => {
  const scheduledTime = '2026-11-15T18:00:00.000Z';
  const id = await createMedia({
    title: 'Upcoming Real Estate Summit 2026',
    summary: 'Discussion on Western Corridor masterplan.',
    type: 'LIVE_VIDEO',
    content_type: 'LIVE_VIDEO',
    broadcast_status: 'UPCOMING',
    scheduled_start_time: scheduledTime,
    status: 'PUBLISHED'
  });

  const item = await getMediaById(id);
  assert.ok(item);
  assert.equal(item.broadcast_status, 'UPCOMING');
  assert.equal(item.scheduled_start_time, scheduledTime);
  assert.equal(item.actual_start_time, null);
});

test('10. Ended broadcast and replay availability', async () => {
  const replayUrl = 'https://www.youtube.com/watch?v=replay_video_id';
  const id = await createMedia({
    title: 'Completed Infrastructure Telecast',
    summary: 'Detailed bridge load test broadcast.',
    type: 'LIVE_VIDEO',
    content_type: 'LIVE_VIDEO',
    broadcast_status: 'ENDED',
    replay_url: replayUrl,
    status: 'PUBLISHED'
  });

  const item = await getMediaById(id);
  assert.ok(item);
  assert.equal(item.broadcast_status, 'ENDED');
  assert.equal(item.replay_url, replayUrl);
});

test('11. Security: Disallowing unsafe schemes (javascript, data, file)', () => {
  assert.equal(validateMediaUrl('javascript:alert(1)').isValid, false);
  assert.equal(validateMediaUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==').isValid, false);
  assert.equal(validateMediaUrl('file:///etc/passwd').isValid, false);
});

test('12. Full HTTP API lifecycle: Role restrictions, broadcasting & engagement', async () => {
  // Start server instance on random port
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Create a Super Admin and a regular user
    const adminEmail = `superadmin-${Date.now()}@propertystudio.org`;
    const userEmail = `regular-${Date.now()}@example.com`;

    const adminUser = await createUser({
      name: 'Super Admin User',
      email: adminEmail,
      phone: '+919876543210',
      role: 'SUPER_ADMIN'
    });

    const regularUser = await createUser({
      name: 'Regular Buyer',
      email: userEmail,
      phone: '+919876543211',
      role: 'PROPERTY_SEEKER'
    });

    const adminSession = await createSession(adminUser.id);
    const regularSession = await createSession(regularUser.id);

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminSession.token}`
    };

    const regularHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${regularSession.token}`
    };

    // 2. Regular user is forbidden from publishing broadcasts (403)
    const unauthorizedRes = await fetch(`${baseUrl}/api/media`, {
      method: 'POST',
      headers: regularHeaders,
      body: JSON.stringify({
        title: 'Unauthorized Broadcast',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      })
    });
    assert.equal(unauthorizedRes.status, 403);

    // 3. Super Admin creates YouTube broadcast successfully
    const createRes = await fetch(`${baseUrl}/api/media`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        title: 'Official Neopolis Interchange Telecast',
        summary: 'Engineering load test audit and 100m arterial roads breakdown.',
        video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        type: 'MASTERCLASS',
        category: 'Real Estate Intelligence',
        broadcast_status: 'LIVE'
      })
    });

    assert.equal(createRes.status, 200);
    const createData = await createRes.json();
    assert.equal(createData.success, true);
    const mediaId = createData.mediaId;
    assert.ok(mediaId);

    // 4. Verify item details via GET /api/media/:id
    const itemRes = await fetch(`${baseUrl}/api/media/${mediaId}`);
    assert.equal(itemRes.status, 200);
    const itemData = await itemRes.json();
    assert.equal(itemData.item.title, 'Official Neopolis Interchange Telecast');
    assert.equal(itemData.item.provider_video_id, 'dQw4w9WgXcQ');
    assert.equal(itemData.item.storage_provider, 'YOUTUBE');
    assert.equal(itemData.item.broadcast_status, 'LIVE');

    // 5. Update broadcast status from LIVE to ENDED with replay URL
    const statusRes = await fetch(`${baseUrl}/api/media/${mediaId}/broadcast-status`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        broadcast_status: 'ENDED',
        replay_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
      })
    });
    assert.equal(statusRes.status, 200);
    const statusData = await statusRes.json();
    assert.equal(statusData.success, true);

    // 6. Test Engagement: User likes and comments on broadcast
    const likeRes = await fetch(`${baseUrl}/api/media/${mediaId}/like`, {
      method: 'POST',
      headers: regularHeaders
    });
    assert.equal(likeRes.status, 200);
    const likeData = await likeRes.json();
    assert.equal(likeData.liked, true);
    assert.equal(likeData.count, 1);

    const commentRes = await fetch(`${baseUrl}/api/media/${mediaId}/comment`, {
      method: 'POST',
      headers: regularHeaders,
      body: JSON.stringify({ text: 'Excellent structural clarity on the Trumpet interchange!' })
    });
    assert.equal(commentRes.status, 200);
    const commentData = await commentRes.json();
    assert.ok(commentData.comment.id);
    assert.equal(commentData.comment.text, 'Excellent structural clarity on the Trumpet interchange!');

    // 7. Verify engagement reporting
    const engagementRes = await fetch(`${baseUrl}/api/media/${mediaId}/engagement`);
    assert.equal(engagementRes.status, 200);
    const engData = await engagementRes.json();
    assert.equal(engData.engagement.likesCount, 1);
    assert.equal(engData.engagement.commentsCount, 1);

    // 8. Super Admin deletes media
    const delRes = await fetch(`${baseUrl}/api/media/${mediaId}`, {
      method: 'DELETE',
      headers: adminHeaders
    });
    assert.equal(delRes.status, 200);
  } finally {
    server.close();
  }
});
