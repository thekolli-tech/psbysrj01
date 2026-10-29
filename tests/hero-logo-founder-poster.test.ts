import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('Homepage hero restores official logo artwork and removes morph host card prompt', () => {
  const heroSource = read('src/components/home/HomeHero.tsx');

  // Prominently renders official BrandLogo variant="full"
  assert.match(heroSource, /<BrandLogo\s+variant="full"/);
  assert.match(heroSource, /OFFICIAL BRAND IDENTITY/);
  assert.match(heroSource, /Real Estate · Visual Stories · Market Trends & Insights/);

  // Removes prompt text
  assert.doesNotMatch(heroSource, /↓ Scroll down to watch the host card smoothly morph into the official logo/);

  // Preserves compatibility reference for test suite
  assert.match(heroSource, /OfficialBrandCard/);
});

test('Overview Foundation Section 2 features the official Swamy Reddy Javidi founder poster', () => {
  const overviewSource = read('src/components/home/OverviewFoundation.tsx');

  // Renders founder poster image
  assert.match(overviewSource, /property-studio-founder-poster\.png/);
  assert.match(overviewSource, /Property Studio Founder & CEO - Swamy Reddy Javidi/);

  // Responsive two-column layout
  assert.match(overviewSource, /lg:grid-cols-12/);
  assert.match(overviewSource, /lg:col-span-5/);
  assert.match(overviewSource, /lg:col-span-7/);

  // Preserves biographical and track record essentials
  assert.match(overviewSource, /Swamy Reddy Javidi/);
  assert.match(overviewSource, /MBA in Marketing/);
  assert.match(overviewSource, /Sadguna Properties/);
  assert.match(overviewSource, /Reliance Jio/);

  // Accessible accordion attributes preserved
  assert.match(overviewSource, /aria-expanded=/);
  assert.match(overviewSource, /aria-controls=/);
  assert.match(overviewSource, /role="region"/);
});

test('Brand assets exist on disk in public/brand with valid sizes', () => {
  const posterPath = join(root, 'public/brand/property-studio-founder-poster.png');
  assert.ok(existsSync(posterPath), 'Founder poster must exist in public/brand/');
  assert.ok(statSync(posterPath).size > 100000, 'Founder poster must have valid size');

  const buf = readFileSync(posterPath);
  assert.equal(buf.readUInt32BE(16), 1254, 'Founder poster width must be 1254px');
  assert.equal(buf.readUInt32BE(20), 1254, 'Founder poster height must be 1254px');

  const logoSquarePath = join(root, 'public/brand/property-studio-logo-square.jpg');
  assert.ok(existsSync(logoSquarePath), 'Square logo must exist in public/brand/');
  assert.ok(statSync(logoSquarePath).size > 50000, 'Square logo must have valid size');
});
