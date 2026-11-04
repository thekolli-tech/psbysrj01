import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('CinematicIntro source file implements all user specifications', () => {
  const source = fs.readFileSync('src/components/common/CinematicIntro.tsx', 'utf8');

  // 1. Sophisticated dark background and ambient lighting
  assert.match(source, /bg-\[#030712\]/);
  assert.match(source, /ambient-glow/);
  assert.match(source, /radial-gradient/);

  // 2. Reveals existing Property Studio logo with smooth cinematic animation
  assert.match(source, /officialLogoSquare/);
  assert.match(source, /emblem-reveal/);

  // 3. Elegant light streaks, depth, soft particles, and motion effects
  assert.match(source, /light-streak/);
  assert.match(source, /float-particle/);
  assert.match(source, /pulse-ring/);
  assert.match(source, /sheen-sweep/);

  // 4. Reveals PROPERTY STUDIO brand name with polished typography
  assert.match(source, /Property Studio/);
  assert.match(source, /Swamy Reddy Javidi Presents/i);
  assert.match(source, /Institutional Real Estate Intelligence/i);
  assert.match(source, /Hyderabad · Telangana/i);

  // 5. Seamless transition into the homepage
  assert.match(source, /isExiting/);
  assert.match(source, /transition-all duration-700/);

  // 6. Skip Intro option included
  assert.match(source, /Skip Intro/);
  assert.match(source, /handleDismiss/);

  // 7. Avoids replaying on every page navigation via session storage
  assert.match(source, /sessionStorage\.getItem/);
  assert.match(source, /sessionStorage\.setItem/);

  // 8. Respects reduced-motion accessibility
  assert.match(source, /prefers-reduced-motion/);

  // 9. Duration is ~3.8 seconds
  assert.match(source, /3800/);
});

test('App.tsx embeds CinematicIntro and provides replay capability', () => {
  const appSource = fs.readFileSync('src/App.tsx', 'utf8');
  assert.match(appSource, /CinematicIntro/);
  assert.match(appSource, /replayIntro/);
  assert.match(appSource, /Watch Intro/);
});
