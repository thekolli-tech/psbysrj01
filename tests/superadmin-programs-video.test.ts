import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Super Admin exclusive Video Posting Feature in Programs PS Academy', async (t) => {
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

  await t.test('2. ProgramsView contains the Post Video modal with YouTube auto-preview and checklist steps', () => {
    assert.match(programsViewCode, /Post Academy Video Guide/);
    assert.match(programsViewCode, /parseYouTubeUrl/);
    assert.match(programsViewCode, /videoThumbnailUrl/);
    assert.match(programsViewCode, /handleCreateVideoProgram/);
  });

  await t.test('3. ProgramsView renders embedded video player in detailed modal for video guides', () => {
    assert.match(programsViewCode, /activeModalArticle\.videoUrl/);
    assert.match(programsViewCode, /iframe/);
    assert.match(programsViewCode, /youtube-nocookie\.com\/embed/);
    assert.match(programsViewCode, /VIDEO GUIDE/);
    assert.match(programsViewCode, /Watch Video/);
  });

  await t.test('4. Backend /api/programs enforces requireSuperAdminOnly server-side', () => {
    // GET /api/programs is open for public viewing
    assert.match(serverCode, /app\.get\(['"]\/api\/programs['"]/);

    // POST /api/programs requires Super Admin only
    assert.match(serverCode, /app\.post\(['"]\/api\/programs['"],\s*requireSuperAdminOnly/);

    // DELETE /api/programs/:id requires Super Admin only
    assert.match(serverCode, /app\.delete\(['"]\/api\/programs\/:id['"],\s*requireSuperAdminOnly/);
  });
});
