import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Super Admin exclusive Direct Video Upload Feature in Programs PS Academy', async (t) => {
  const programsViewCode = fs.readFileSync('src/components/programs/ProgramsView.tsx', 'utf-8');
  const serverCode = fs.readFileSync('server.ts', 'utf-8');

  await t.test('1. ProgramsView strictly gates the Post Academy Video button to Super Admin only', () => {
    // Verifies that isSuperAdmin requires role === 'SUPER_ADMIN'
    assert.match(programsViewCode, /isSuperAdmin\s*=\s*Boolean\(isLoggedIn\s*&&\s*currentUser\?\.role\s*===\s*['"]SUPER_ADMIN['"]\)/);

    // Verifies button is wrapped with {isSuperAdmin && ( ... )}
    assert.match(programsViewCode, /\{isSuperAdmin\s*&&\s*\(/);
    assert.match(programsViewCode, /Post Academy Video/);

    // Verifies delete action is also restricted to Super Admin
    assert.match(programsViewCode, /isSuperAdmin\s*&&\s*article\.id\.startsWith/);
  });

  await t.test('2. "YouTube, Vimeo, MP4 direct" URL inputs are completely removed', () => {
    // Verifies no URL input or text for YouTube/Vimeo/MP4 direct
    assert.doesNotMatch(programsViewCode, /YouTube,\s*Vimeo,\s*MP4 direct/i);
    assert.doesNotMatch(programsViewCode, /Supports standard YouTube links,\s*Shorts/i);
    assert.doesNotMatch(programsViewCode, /https:\/\/www\.youtube\.com\/watch/i);
  });

  await t.test('3. Direct video upload from files is implemented with max 700MB size limit', () => {
    // 700MB limit constant defined
    assert.match(programsViewCode, /MAX_PROGRAM_VIDEO_SIZE_BYTES\s*=\s*700\s*\*\s*1024\s*\*\s*1024/);

    // File input with video accepts
    assert.match(programsViewCode, /type=['"]file['"]/);
    assert.match(programsViewCode, /accept=['"]video\/mp4,video\/webm,video\/quicktime/);

    // 700MB size validation check
    assert.match(programsViewCode, /file\.size\s*>\s*MAX_PROGRAM_VIDEO_SIZE_BYTES/);
    assert.match(programsViewCode, /exceeds the 700 MB maximum limit/);

    // Direct video upload instructions
    assert.match(programsViewCode, /Direct video upload from files · MP4, WebM, MOV · Max 700 MB allowed/);
  });

  await t.test('4. Embedded HTML5 video player handles direct uploaded videos with controls', () => {
    assert.match(programsViewCode, /<video/);
    assert.match(programsViewCode, /controls/);
    assert.match(programsViewCode, /autoPlay/);
    assert.match(programsViewCode, /DIRECT VIDEO GUIDE/);
  });

  await t.test('5. Backend /api/programs enforces requireSuperAdminOnly and 700MB size limit server-side', () => {
    // GET /api/programs is open for public viewing
    assert.match(serverCode, /app\.get\(['"]\/api\/programs['"]/);

    // POST /api/programs requires Super Admin only
    assert.match(serverCode, /app\.post\(['"]\/api\/programs['"],\s*requireSuperAdminOnly/);

    // Server-side 700MB limit check
    assert.match(serverCode, /MAX_PROGRAM_VIDEO_SIZE\s*=\s*700\s*\*\s*1024\s*\*\s*1024/);
    assert.match(serverCode, /Video file exceeds maximum size limit of 700 MB/);

    // DELETE /api/programs/:id requires Super Admin only
    assert.match(serverCode, /app\.delete\(['"]\/api\/programs\/:id['"],\s*requireSuperAdminOnly/);
  });
});
