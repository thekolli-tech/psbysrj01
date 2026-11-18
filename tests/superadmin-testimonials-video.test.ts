import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Super Admin exclusive Video Posting with BOTH Direct Upload and Video Link in PS Testimonials', async (t) => {
  const testimonialsCode = fs.readFileSync('src/components/testimonials/PSTestimonialsView.tsx', 'utf-8');
  const serverCode = fs.readFileSync('server.ts', 'utf-8');

  await t.test('1. Hardcoded mock video and Rickroll YouTube embed are completely removed', () => {
    // Assert hardcoded mock video title and Rickroll are gone
    assert.doesNotMatch(testimonialsCode, /How Property Studio helped us avoid a non-RERA pitfall in Neopolis/);
    assert.doesNotMatch(testimonialsCode, /dQw4w9WgXcQ/);
  });

  await t.test('2. PSTestimonialsView strictly gates the Post Video Testimonial button to Super Admin only', () => {
    // Verifies that isSuperAdmin requires role === 'SUPER_ADMIN'
    assert.match(testimonialsCode, /isSuperAdmin\s*=\s*Boolean\(isLoggedIn\s*&&\s*currentUser\?\.role\s*===\s*['"]SUPER_ADMIN['"]\)/);

    // Verifies button is wrapped with {isSuperAdmin && ( ... )}
    assert.match(testimonialsCode, /\{isSuperAdmin\s*&&\s*\(/);
    assert.match(testimonialsCode, /Post Video Testimonial/);

    // Verifies delete action is also restricted to Super Admin
    assert.match(testimonialsCode, /isSuperAdmin\s*&&\s*\(/);
    assert.match(testimonialsCode, /handleDeleteVideoTestimonial/);
  });

  await t.test('3. Dual-mode support: Both Direct Video Upload and Video Link / URL features are available', () => {
    assert.match(testimonialsCode, /Direct Video Upload/);
    assert.match(testimonialsCode, /Video Link \/ URL/);
    assert.match(testimonialsCode, /uploadMode\s*===\s*['"]FILE['"]/);
    assert.match(testimonialsCode, /uploadMode\s*===\s*['"]URL['"]/);
  });

  await t.test('4. Direct video upload from files is implemented with max 700MB size limit', () => {
    // 700MB limit constant defined
    assert.match(testimonialsCode, /MAX_TESTIMONIAL_VIDEO_SIZE_BYTES\s*=\s*700\s*\*\s*1024\s*\*\s*1024/);

    // File input with video accepts
    assert.match(testimonialsCode, /type=['"]file['"]/);
    assert.match(testimonialsCode, /accept=['"]video\/mp4,video\/webm,video\/quicktime/);

    // 700MB size validation check
    assert.match(testimonialsCode, /file\.size\s*>\s*MAX_TESTIMONIAL_VIDEO_SIZE_BYTES/);
    assert.match(testimonialsCode, /exceeds 700 MB limit/);

    // Direct video upload instructions
    assert.match(testimonialsCode, /Direct video upload from files · MP4, WebM, MOV · Max 700 MB allowed/);
  });

  await t.test('5. Video Link / URL input supports YouTube, Vimeo, and direct MP4 with live preview', () => {
    assert.match(testimonialsCode, /parseYouTubeUrl/);
    assert.match(testimonialsCode, /Supports YouTube, Vimeo, and direct MP4 video links/);
    assert.match(testimonialsCode, /Valid YouTube Link Detected/);
    assert.match(testimonialsCode, /vimeo\.com/);
  });

  await t.test('6. Embedded video player in modal handles both iframe (YouTube/Vimeo) and native HTML5 video (uploaded / MP4)', () => {
    assert.match(testimonialsCode, /<video/);
    assert.match(testimonialsCode, /<iframe/);
    assert.match(testimonialsCode, /youtube-nocookie\.com\/embed/);
    assert.match(testimonialsCode, /player\.vimeo\.com\/video/);
    assert.match(testimonialsCode, /controls/);
  });

  await t.test('7. Backend /api/testimonials/video enforces requireSuperAdminOnly, 700MB size limit, and accepts both file or URL', () => {
    // GET /api/testimonials/video is open for public viewing
    assert.match(serverCode, /app\.get\(['"]\/api\/testimonials\/video['"]/);

    // POST /api/testimonials/video requires Super Admin only
    assert.match(serverCode, /app\.post\(['"]\/api\/testimonials\/video['"],\s*requireSuperAdminOnly/);

    // Requires either URL or file
    assert.match(serverCode, /Either a video link URL or a direct video upload file is required/);

    // Server-side 700MB limit check
    assert.match(serverCode, /MAX_TESTIMONIAL_VIDEO_SIZE\s*=\s*700\s*\*\s*1024\s*\*\s*1024/);
    assert.match(serverCode, /Video file exceeds maximum size limit of 700 MB/);

    // DELETE /api/testimonials/video/:id requires Super Admin only
    assert.match(serverCode, /app\.delete\(['"]\/api\/testimonials\/video\/:id['"],\s*requireSuperAdminOnly/);
  });
});
