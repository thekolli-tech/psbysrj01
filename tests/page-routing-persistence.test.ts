import test from 'node:test';
import assert from 'node:assert/strict';
import { matchRoute, urlForView } from '../src/router/routes.ts';

test('1. Core Route Mapping: Maps every module URL correctly', () => {
  // Homepage
  assert.equal(matchRoute('/').view, 'HOME');
  assert.equal(matchRoute('/home').view, 'HOME');

  // Discover Properties
  assert.equal(matchRoute('/properties').view, 'PROPERTIES');
  const propMatch = matchRoute('/properties/prop-kokapet-101');
  assert.equal(propMatch.view, 'PROPERTIES');
  assert.equal(propMatch.params.propertyId, 'prop-kokapet-101');

  // Communities & Community Details
  assert.equal(matchRoute('/communities').view, 'COMMUNITY');
  const commMatch = matchRoute('/communities/neopolis-investors');
  assert.equal(commMatch.view, 'COMMUNITY');
  assert.equal(commMatch.params.communityId, 'neopolis-investors');

  // Discussions & Discussion Details
  assert.equal(matchRoute('/discussions').view, 'HOME');
  const discMatch = matchRoute('/discussions/disc-tellapur-highrise');
  assert.equal(discMatch.view, 'HOME');
  assert.equal(discMatch.params.discussionId, 'disc-tellapur-highrise');

  // Property Q&A
  assert.equal(matchRoute('/questions').view, 'HOME');
  const qMatch = matchRoute('/questions/q-rera-possession-2026');
  assert.equal(qMatch.view, 'HOME');
  assert.equal(qMatch.params.questionId, 'q-rera-possession-2026');

  // Market Trends & Insights
  assert.equal(matchRoute('/insights').view, 'MARKET_INSIGHTS');
  assert.equal(matchRoute('/property-insights').view, 'MARKET_INSIGHTS');
  assert.equal(matchRoute('/trends').view, 'MARKET_INSIGHTS');

  // Media & Podcast
  assert.equal(matchRoute('/media').view, 'MEDIA');
  assert.equal(matchRoute('/podcast').view, 'MEDIA');

  // Live Sessions
  assert.equal(matchRoute('/live').view, 'CONFERENCE');
  assert.equal(matchRoute('/live-sessions').view, 'CONFERENCE');

  // About Us
  assert.equal(matchRoute('/about').view, 'ABOUT');
  assert.equal(matchRoute('/about-us').view, 'ABOUT');

  // Admin & Workspaces
  assert.equal(matchRoute('/admin').view, 'ADMIN');
  assert.equal(matchRoute('/admin').protectedRole, 'SUPER_ADMIN');
  assert.equal(matchRoute('/developer').view, 'DEVELOPER');
  assert.equal(matchRoute('/property-admin').view, 'PROPERTY_ADMIN');
  assert.equal(matchRoute('/dashboard').view, 'DASHBOARD');
});

test('2. URL Canonical Generation: Builds persistent URLs for views', () => {
  assert.equal(urlForView('HOME'), '/');
  assert.equal(urlForView('HOME', { discussionId: 'post-123' }), '/discussions/post-123');
  assert.equal(urlForView('COMMUNITY'), '/communities');
  assert.equal(urlForView('COMMUNITY', { communityId: 'gachibowli-hub' }), '/communities/gachibowli-hub');
  assert.equal(urlForView('PROPERTIES'), '/properties');
  assert.equal(urlForView('PROPERTIES', { propertyId: 'sky-villas' }), '/properties/sky-villas');
  assert.equal(urlForView('ABOUT'), '/about');
  assert.equal(urlForView('ADMIN'), '/admin');
  assert.equal(urlForView('MEDIA'), '/media');
  assert.equal(urlForView('CONFERENCE'), '/live');
});

test('3. 404 Not Found Routing: Unrecognized paths yield isNotFound flag', () => {
  const badRoute1 = matchRoute('/non-existent-page-xyz');
  assert.equal(badRoute1.isNotFound, true);
  assert.equal(badRoute1.view, 'NOT_FOUND');

  const badRoute2 = matchRoute('/random/sub/path/123');
  assert.equal(badRoute2.isNotFound, true);
  assert.equal(badRoute2.view, 'NOT_FOUND');
});

test('4. Vercel SPA Rewrite Configuration: vercel.json preserves API and rewrites React routes', async () => {
  const fs = await import('fs');
  const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  assert.ok(Array.isArray(vercel.rewrites), 'vercel.json must have rewrites array');

  // Must have /api/* rewrite
  const apiRewrite = vercel.rewrites.find((r: any) => r.source === '/api/:path*');
  assert.ok(apiRewrite, 'vercel.json must preserve /api/:path* rewrite');

  // Must have SPA catch-all rewrite to /index.html
  const spaRewrite = vercel.rewrites.find((r: any) => r.destination === '/index.html');
  assert.ok(spaRewrite, 'vercel.json must have fallback rewrite to /index.html');
});
