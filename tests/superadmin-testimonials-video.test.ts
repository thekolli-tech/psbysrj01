import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Video Testimonials with Public Submission, 700MB Max Limit, and Super Admin Approval Workflow', async (t) => {
  const testimonialsCode = fs.readFileSync('src/components/testimonials/PSTestimonialsView.tsx', 'utf-8');
  const serverCode = fs.readFileSync('server.ts', 'utf-8');

  await t.test('1. Hardcoded mock video and Rickroll YouTube embed are completely removed', () => {
    // Assert hardcoded mock video title and Rickroll are gone
    assert.doesNotMatch(testimonialsCode, /How Property Studio helped us avoid a non-RERA pitfall in Neopolis/);
    assert.doesNotMatch(testimonialsCode, /dQw4w9WgXcQ/);
  });

  await t.test('2. Video testimonial submission button is accessible to everyone', () => {
    // Verify "+ Submit Video Testimonial" button is present and not hidden behind isSuperAdmin check
    assert.match(testimonialsCode, /Submit Video Testimonial/);
    assert.match(testimonialsCode, /setIsVideoModalOpen\(true\)/);
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

  await t.test('6. Super Admin Moderation Queue and Approval Workflow are implemented', () => {
    // Queue section rendered for Super Admin
    assert.match(testimonialsCode, /Super Admin Moderation Queue/);
    assert.match(testimonialsCode, /AWAITING APPROVAL/);

    // Approve & Reject handlers
    assert.match(testimonialsCode, /handleApproveVideoTestimonial/);
    assert.match(testimonialsCode, /handleRejectVideoTestimonial/);
    assert.match(testimonialsCode, /Approve & Make Live/);

    // Only approved videos appear live
    assert.match(testimonialsCode, /videoTestimonials\.filter\(v => v\.status === 'PUBLISHED'\)/);
  });

  await t.test('7. Backend /api/testimonials/video supports public submissions with pending approval, and requireSuperAdminOnly for approvals', () => {
    // GET /api/testimonials/video serves published videos
    assert.match(serverCode, /app\.get\(['"]\/api\/testimonials\/video['"]/);

    // POST /api/testimonials/video accepts submissions and sets non-superadmin to PENDING_APPROVAL
    assert.match(serverCode, /app\.post\(['"]\/api\/testimonials\/video['"]/);
    assert.match(serverCode, /PENDING_APPROVAL/);

    // PATCH /api/testimonials/video/:id/approve requires Super Admin only
    assert.match(serverCode, /app\.patch\(['"]\/api\/testimonials\/video\/:id\/approve['"],\s*requireSuperAdminOnly/);

    // DELETE /api/testimonials/video/:id requires Super Admin only
    assert.match(serverCode, /app\.delete\(['"]\/api\/testimonials\/video\/:id['"],\s*requireSuperAdminOnly/);
  });

  await t.test('8. Comment kind of testimonials also require Super Admin approval', () => {
    // Testimonial interface includes status enum
    assert.match(testimonialsCode, /status\?:\s*['"]PUBLISHED['"]\s*\|\s*['"]PENDING_APPROVAL['"]\s*\|\s*['"]REJECTED['"]/);

    // Non-superadmin submissions default to PENDING_APPROVAL and notify user of pending review
    assert.match(testimonialsCode, /const expectedStatus = isSuperAdmin \? 'PUBLISHED' : 'PENDING_APPROVAL'/);
    assert.match(testimonialsCode, /Testimonial submitted! It will appear on the website once approved by Super Admin/);

    // Only approved/published testimonials are rendered in the public cards grid
    assert.match(testimonialsCode, /const publishedTestimonials = testimonials\.filter\(t => t\.status === 'PUBLISHED' \|\| !t\.status\)/);
    assert.match(testimonialsCode, /const pendingTextTestimonials = testimonials\.filter\(t => t\.status === 'PENDING_APPROVAL'\)/);
  });

  await t.test('9. Super Admin Moderation Queue supports comment/text testimonials approval and rejection', () => {
    // Queue displays pending comment testimonials
    assert.match(testimonialsCode, /Pending Comment \/ Text Testimonials/);
    assert.match(testimonialsCode, /handleApproveTextTestimonial/);
    assert.match(testimonialsCode, /handleRejectTextTestimonial/);

    // Approval sets status to PUBLISHED and updates live feed
    assert.match(testimonialsCode, /status: 'PUBLISHED' as const/);
  });

  await t.test('10. Backend /api/testimonials endpoints enforce Super Admin approval for text/comment testimonials', () => {
    // GET /api/testimonials
    assert.match(serverCode, /app\.get\(['"]\/api\/testimonials['"]/);

    // POST /api/testimonials accepts public submissions with PENDING_APPROVAL
    assert.match(serverCode, /app\.post\(['"]\/api\/testimonials['"]/);

    // PATCH /api/testimonials/:id/approve requires Super Admin
    assert.match(serverCode, /app\.patch\(['"]\/api\/testimonials\/:id\/approve['"],\s*requireSuperAdminOnly/);

    // DELETE /api/testimonials/:id requires Super Admin
    assert.match(serverCode, /app\.delete\(['"]\/api\/testimonials\/:id['"],\s*requireSuperAdminOnly/);
  });
});
