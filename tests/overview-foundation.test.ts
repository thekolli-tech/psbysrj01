import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERVIEW_FOUNDATION_SECTIONS } from '../src/components/home/OverviewFoundation.tsx';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('overview foundation includes the five approved client sections with accessible controls', () => {
  const titles = OVERVIEW_FOUNDATION_SECTIONS.map(section => section.title);
  assert.deepEqual(titles, [
    'About Property Studio',
    'About the Founder & CEO',
    'Vision',
    'Mission',
    'Core DNA'
  ]);

  const source = read('src/components/home/OverviewFoundation.tsx');

  // Verify the five pillars in About Property Studio (latest framework + engines)
  assert.match(source, /MEDIA-CENTRIC/);
  assert.match(source, /SEARCH ENGINE/);
  assert.match(source, /SOCIAL FORUM/);
  assert.match(source, /REVIEW \/ RATING/);
  assert.match(source, /B2B\/B2C NETWORK/);
  assert.match(source, /Aggregator Engine/);
  assert.match(source, /Broadcast Network/);
  assert.match(source, /Community Hive/);
  assert.match(source, /Performance Index/);
  assert.match(source, /Town Hall Arena/);

  // Verify reference models and disclaimer
  assert.match(source, /YouTube/);
  assert.match(source, /99acres/);
  assert.match(source, /Reddit/);
  assert.match(source, /Google Reviews/);
  assert.match(source, /Notice on Reference Models/);

  // Verify Founder biography details
  assert.match(source, /Swamy Reddy Javidi/);
  assert.match(source, /MBA in Marketing/);
  assert.match(source, /Sadguna Properties/);
  assert.match(source, /Reliance Jio/);

  // Strict check: Removed TG RERA and Udyam identifiers must NOT appear
  assert.doesNotMatch(source, /A02200004078/);
  assert.doesNotMatch(source, /TS-02-283677/);
  assert.doesNotMatch(source, /283677/);

  // Accessible accordion attributes
  assert.match(source, /aria-expanded=/);
  assert.match(source, /aria-controls=/);
  assert.match(source, /role="region"/);

  const hero = read('src/components/home/HomeHero.tsx');
  assert.match(hero, /<OverviewFoundation \/>/);
  assert.match(hero, /Explore Audited Projects/);
  assert.match(hero, /PropertyCategorySelect/);
});
