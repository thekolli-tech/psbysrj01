import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('HomeHero component includes prominent top property search bar with location, type, and keyword filters', () => {
  const heroSource = read('src/components/home/HomeHero.tsx');

  // Prominent top search container spanning available content width
  assert.match(heroSource, /data-testid="homepage-top-search"/);

  // Keyword, location, and property type inputs
  assert.match(heroSource, /id="home-search-keyword"/);
  assert.match(heroSource, /id="home-search-location"/);
  assert.match(heroSource, /id="home-search-property-type"/);

  // Reuses PropertyCategorySelect
  assert.match(heroSource, /<PropertyCategorySelect/);

  // Search execution and clear handlers
  assert.match(heroSource, /handleTopSearch/);
  assert.match(heroSource, /handleResetTopSearch/);

  // Connects to public property listings API
  assert.match(heroSource, /fetch\('\/api\/properties'\)/);

  // Search results rendering with PropertyDetailModal integration
  assert.match(heroSource, /data-testid="homepage-search-results"/);
  assert.match(heroSource, /searchResults\.length/);
  assert.match(heroSource, /<PropertyDetailModal/);

  // Left column uses space more effectively (lg:col-span-7 vs lg:col-span-5)
  assert.match(heroSource, /lg:col-span-7/);
  assert.match(heroSource, /lg:col-span-5/);

  // Preserves existing animations, audio briefing, and branding
  assert.match(heroSource, /OfficialBrandCard/);
  assert.match(heroSource, /BrandLogo/);
  assert.match(heroSource, /AudioStoryPlayer/);
  assert.match(heroSource, /OverviewFoundation/);

  // Section 1.5 ("Explore Verified Inventory" and "Featured Developments with 4K Drone Walkthroughs") is removed from homepage
  assert.doesNotMatch(heroSource, /Explore Verified Inventory by Corridor & Asset Type/);
  assert.doesNotMatch(heroSource, /Featured Developments with 4K Drone Walkthroughs/);

  // "Latest Video Audits & Builder Podcasts" section is removed from homepage
  assert.doesNotMatch(heroSource, /Latest Video Audits & Builder Podcasts/);
  assert.doesNotMatch(heroSource, /Explore All Broadcasts/);

  // Shared property components remain available on dedicated property pages
  const propertyList = read('src/components/properties/PropertyList.tsx');
  assert.ok(propertyList.length > 0);
  const propertyCategorySelect = read('src/components/properties/PropertyCategorySelect.tsx');
  assert.ok(propertyCategorySelect.length > 0);
  const propertyDetailModal = read('src/components/properties/PropertyDetailModal.tsx');
  assert.ok(propertyDetailModal.length > 0);
});
