import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (file: string) => readFileSync(join(root, file), 'utf8');

test('1. App root container enforces mobile stability and desktop horizontal scrollbar', () => {
  const app = read('src/App.tsx');
  // Mobile browsers get overflow-x-hidden to prevent horizontal wobbling
  assert.match(app, /overflow-x-hidden/);
  // Desktop viewports preserve overflow-x-auto for horizontally wide tables/content
  assert.match(app, /md:overflow-x-auto/);
});

test('2. Homepage Top Search Bar grid avoids button clipping across breakpoints', () => {
  const hero = read('src/components/home/HomeHero.tsx');
  // Keyword input allocation
  assert.match(hero, /md:col-span-4\s+lg:col-span-5/);
  // Search button allocation has at least 2 columns on tablet and desktop
  assert.match(hero, /md:col-span-2\s+lg:col-span-2/);
  // Search button minimum touch height
  assert.match(hero, /min-h-\[42px\]/);
});

test('3. Hero action buttons and key metrics stack gracefully on mobile viewports', () => {
  const hero = read('src/components/home/HomeHero.tsx');
  // Action buttons stack full-width on mobile
  assert.match(hero, /w-full\s+sm:w-auto\s+justify-center/);
  // Comfortable touch target height
  assert.match(hero, /min-h-\[44px\]/);
  // Trust metrics stack on mobile (320px-375px) and expand to 3 columns on sm/md/lg
  assert.match(hero, /grid-cols-1\s+sm:grid-cols-3/);
});

test('4. Property Compare Modal supports small mobile viewports and touch targets', () => {
  const compare = read('src/components/properties/PropertyCompareModal.tsx');
  // Responsive modal outer padding
  assert.match(compare, /p-2\s+sm:p-4/);
  // Fluid typography for title
  assert.match(compare, /text-lg\s+sm:text-2xl/);
  // Inner content scrollability
  assert.match(compare, /overflow-y-auto/);
});

test('5. Super Admin Console moderation action buttons wrap cleanly without clipping', () => {
  const admin = read('src/components/admin/SuperAdminDashboard.tsx');
  // Moderation action button clusters wrap on mobile
  assert.match(admin, /flex\s+flex-wrap\s+items-center\s+gap-2/);
  // Minimum touch target sizing for moderation buttons
  assert.match(admin, /min-h-\[36px\]/);
});

test('6. Media & Podcast toolbar wraps smoothly on mobile devices', () => {
  const media = read('src/components/media/MediaEngine.tsx');
  // Toolbar flex wrap
  assert.match(media, /flex\s+flex-wrap\s+items-center\s+justify-between/);
});

test('7. Desktop Header occupies full available width on the left without missing buttons', () => {
  const header = read('src/components/common/Header.tsx');
  // Full width navigation occupying space to the left
  assert.match(header, /w-full\s+px-4\s+sm:px-6\s+lg:px-8/);
  assert.doesNotMatch(header, /max-w-7xl mx-auto px-4/);
  // All navigation links rendered directly without a "More" dropdown
  assert.doesNotMatch(header, />More</);
  assert.doesNotMatch(header, /moreDropdown/);
  // Concise label derivation removing trailing Property Studio suffix
  assert.match(header, /replace\(\/\\s\+Property\\s\+Studio\$\/,\s*''\)/);
});
