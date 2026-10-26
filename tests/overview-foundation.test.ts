import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OVERVIEW_COPY_PLACEHOLDER, OVERVIEW_FOUNDATION_SECTIONS } from '../src/components/home/OverviewFoundation.tsx';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('overview foundation keeps the five requested sections as labeled placeholders', () => {
  const titles = OVERVIEW_FOUNDATION_SECTIONS.map(section => section.title);
  assert.deepEqual(titles, [
    'About Property Studio',
    'About the Founder & CEO',
    'Vision',
    'Mission',
    'Core DNA'
  ]);
  for (const section of OVERVIEW_FOUNDATION_SECTIONS) {
    assert.match(section.body, /Awaiting approved client copy/);
  }
  assert.match(OVERVIEW_COPY_PLACEHOLDER, /not a company claim/);
  const founder = OVERVIEW_FOUNDATION_SECTIONS.find(section => section.id === 'about-founder');
  assert.match(founder?.body || '', /biography has not been approved/);
  assert.doesNotMatch(founder?.body || '', /award|years of|appreciation|billion/i);

  const hero = read('src/components/home/HomeHero.tsx');
  assert.match(hero, /<OverviewFoundation \/>/);
  assert.match(hero, /Explore Audited Projects/);
  assert.match(hero, /PropertyCategorySelect/);
});
