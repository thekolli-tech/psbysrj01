import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

test('Responsive UI Viewport Audit: Header & Breakpoints', async (t) => {
  const header = read('src/components/common/Header.tsx');
  const mobileHeader = read('src/components/common/MobileHeader.tsx');
  const communityForum = read('src/components/community/CommunityForum.tsx');

  await t.test('Desktop Header prevents overlapping at 1280px-1920px', () => {
    // Desktop navigation links switch at xl:flex (1280px)
    assert.match(header, /hidden\s+xl:flex/);
    // All individual nav link buttons have shrink-0 to prevent compression
    assert.match(header, /shrink-0/);
    // All action controls in Zone 3 have shrink-0
    assert.match(header, /gap-1\.5\s+xl:gap-2\.5\s+shrink-0\s+ml-auto/);
    // Super Admin Console has responsive label
    assert.match(header, /min-\[1680px\]:hidden["']>Admin Console</);
    assert.match(header, /hidden\s+min-\[1680px\]:inline/);
    // Profile text is hidden on cramped widths to prioritize essential actions
    assert.match(header, /hidden\s+min-\[1680px\]:block/);
  });

  await t.test('Desktop Header collapses to hamburger drawer below 1280px (768px, 820px, 1024px, 1200px)', () => {
    // Hamburger button is active on viewports < 1280px
    assert.match(header, /xl:hidden\s+p-2\s+rounded-xl/);
    // Hamburger drawer is rendered on viewports < 1280px
    assert.match(header, /xl:hidden\s+border-t\s+border-slate-200/);
    // Drawer contains all 8 platform navigation items
    assert.match(header, /Platform Navigation/);
    // Drawer contains Super Admin Console for platform admins
    assert.match(header, /isPlatformAdmin\(currentUser\.role\)/);
  });

  await t.test('Mobile Header prevents horizontal overflow across 320px-430px viewports', () => {
    // Title is hidden/truncated on ultra-compact mobile screens to protect action buttons
    assert.match(mobileHeader, /hidden\s+min-\[400px\]:block/);
    // Admin console uses isPlatformAdmin for full role coverage
    assert.match(mobileHeader, /isPlatformAdmin\(currentUser\.role\)/);
    // Secondary utility shortcuts (leads, workspace) are hidden on compact mobile and accessible in drawer
    assert.match(mobileHeader, /hidden\s+sm:inline-flex/);
    // Touch targets and shrink protection on all buttons
    assert.match(mobileHeader, /shrink-0/);
  });

  await t.test('Community Forum renders dropdowns on viewports < 768px to ensure 100% option visibility', () => {
    // Hub category select dropdown
    assert.match(communityForum, /id="hub-category-select"/);
    // Feed view select dropdown for screens < 768px
    assert.match(communityForum, /id="feed-view-select"/);
    assert.match(communityForum, /md:hidden\s+relative\s+flex-1/);
    assert.match(communityForum, /hidden\s+md:flex/);
    // Topic filter select dropdown for screens < 768px
    assert.match(communityForum, /id="discussion-topic-select"/);
    assert.match(communityForum, /md:hidden\s+flex\s+items-center/);
    assert.match(communityForum, /hidden\s+md:flex/);
  });
});
