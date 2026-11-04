import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('CinematicIntro uses the official image without any text', () => {
  const source = fs.readFileSync('src/components/common/CinematicIntro.tsx', 'utf8');

  // Uses the official image uploaded by user
  assert.match(source, /property-studio-intro-official\.jpg/);

  // Confirms NO text overlays are present
  assert.doesNotMatch(source, /Swamy Reddy Javidi Presents/i);
  assert.doesNotMatch(source, /Institutional Real Estate Intelligence/i);
  assert.doesNotMatch(source, /Hyderabad · Telangana/i);
  assert.doesNotMatch(source, />\s*Skip Intro\s*</i);

  // Confirms cinematic animation, ambient lighting, particles, and sheen
  assert.match(source, /cinematic-zoom/);
  assert.match(source, /ambient-glow/);
  assert.match(source, /light-streak/);
  assert.match(source, /sheen-sweep/);
  assert.match(source, /float-particle/);

  // Seamless transition & unmount
  assert.match(source, /isExiting/);
  assert.match(source, /transition-all duration-700/);

  // Skip options (click anywhere, keyboard, icon button)
  assert.match(source, /handleDismiss/);

  // Avoids replaying on every navigation via session storage
  assert.match(source, /sessionStorage\.getItem/);
  assert.match(source, /sessionStorage\.setItem/);

  // Respects reduced motion accessibility
  assert.match(source, /prefers-reduced-motion/);

  // Image file exists in public/brand
  assert.ok(fs.existsSync('public/brand/property-studio-intro-official.jpg'));
});

test('App.tsx embeds CinematicIntro cleanly', () => {
  const appSource = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(appSource, /CinematicIntro/);
  assert.match(appSource, /replayIntro/);
});
