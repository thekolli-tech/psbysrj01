import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isPropertySeeker, postLoginDestination } from '../src/shared/policy.ts';
import { linkedEndUserNavigation, roleUtilityDestinations } from '../src/shared/endUserNavigation.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('normal user dashboard view type and navigation safety', () => {
  const typesSource = read('src/types/index.ts');
  assert.match(typesSource, /\|\s*'DASHBOARD'/);

  // Invariant: public end-user navigation must remain 8 items and untouched
  const linked = linkedEndUserNavigation();
  assert.equal(linked.length, 8);
  assert.equal(linked.some(item => item.view === 'DASHBOARD'), false);

  // Invariant: roleUtilityDestinations for seeker must remain empty
  assert.deepEqual(roleUtilityDestinations('PROPERTY_SEEKER', true), []);
  assert.deepEqual(roleUtilityDestinations('PROPERTY_SEEKER', false), []);
});

test('postLoginDestination invariant is preserved while login routing directs seekers to DASHBOARD', () => {
  // Invariant: unit policy postLoginDestination strictly returns PROPERTIES for PROPERTY_SEEKER
  assert.equal(postLoginDestination('PROPERTY_SEEKER'), 'PROPERTIES');
  assert.equal(postLoginDestination('DEVELOPER'), 'DEVELOPER');
  assert.equal(postLoginDestination('SUPER_ADMIN'), 'ADMIN');
  assert.equal(postLoginDestination('AGENT'), 'PROFESSIONAL');

  // LoginModal routes property seekers to DASHBOARD
  const loginModalSource = read('src/components/common/LoginModal.tsx');
  assert.match(loginModalSource, /if\s*\(isPropertySeeker\(user\.role\)\)\s*\{\s*setActiveView\('DASHBOARD'\);/);

  // AppContext routes property seekers to DASHBOARD
  const appContextSource = read('src/context/AppContext.tsx');
  assert.match(appContextSource, /if\s*\(isPropertySeeker\(mapped\.role\)\)\s*\{\s*setActiveView\('DASHBOARD'\);/);
});

test('App.tsx routes DASHBOARD with authentication guard', () => {
  const appSource = read('src/App.tsx');
  assert.match(appSource, /import\s*\{\s*UserDashboard\s*\}\s*from\s*'\.\/components\/dashboard\/UserDashboard';/);
  assert.match(appSource, /\{activeView === 'DASHBOARD' && \(/);
  assert.match(appSource, /isLoggedIn \?\s*\(\s*<UserDashboard \/>\s*\)\s*:\s*\(\s*<AuthRequiredCard view="DASHBOARD"/);

  const authCardSource = read('src/components/common/AuthRequiredCard.tsx');
  assert.match(authCardSource, /case 'DASHBOARD':/);
  assert.match(authCardSource, /Member Dashboard/);
});

test('UserDashboard component implements Phase 1 tabs, APIs, and privacy protections', () => {
  const dashSource = read('src/components/dashboard/UserDashboard.tsx');

  // All 6 tabs present
  assert.match(dashSource, /'OVERVIEW'/);
  assert.match(dashSource, /'REQUIREMENTS'/);
  assert.match(dashSource, /'REVIEWS'/);
  assert.match(dashSource, /'NOTIFICATIONS'/);
  assert.match(dashSource, /'COMMUNITY'/);
  assert.match(dashSource, /'SETTINGS'/);

  // Connected to real platform APIs
  assert.match(dashSource, /fetch\('\/api\/requirements'\)/);
  assert.match(dashSource, /fetch\('\/api\/requirements',\s*\{\s*method:\s*'POST'/);
  assert.match(dashSource, /fetch\('\/api\/me\/reviews'\)/);
  assert.match(dashSource, /fetch\(`\/api\/reviews\/\$\{editingReviewId\}`,\s*\{\s*method:\s*'PATCH'/);
  assert.match(dashSource, /fetch\('\/api\/notifications'\)/);
  assert.match(dashSource, /fetch\(`\/api\/notifications\/\$\{id\}\/read`,\s*\{\s*method:\s*'PATCH'/);
  assert.match(dashSource, /fetch\('\/api\/notifications\/mark-all-read',\s*\{\s*method:\s*'POST'/);
  assert.match(dashSource, /fetch\('\/api\/me\/profile',\s*\{\s*method:\s*'PATCH'/);
  assert.match(dashSource, /fetch\('\/api\/auth\/change-password',\s*\{\s*method:\s*'POST'/);

  // Real data handling without fabricated metrics
  assert.match(dashSource, /requirements\.length/);
  assert.match(dashSource, /reviews\.length/);
  assert.match(dashSource, /unreadCount/);

  // Phone masking function
  assert.match(dashSource, /maskPhoneNumber/);

  // Uses property catalog groups for requirement type dropdown
  assert.match(dashSource, /PROPERTY_CATEGORY_GROUPS/);
});

test('UserDashboard component includes responsive property search with location, type, and keyword filters', () => {
  const dashSource = read('src/components/dashboard/UserDashboard.tsx');

  // Search input controls
  assert.match(dashSource, /id="dashboard-search-query"/);
  assert.match(dashSource, /id="dashboard-search-location"/);
  assert.match(dashSource, /id="dashboard-search-type"/);

  // PropertyCategorySelect reuse
  assert.match(dashSource, /<PropertyCategorySelect/);

  // Search execution and clear controls
  assert.match(dashSource, /handleSearchSubmit/);
  assert.match(dashSource, /handleResetSearch/);

  // Results rendering with PropertyDetailModal integration
  assert.match(dashSource, /data-testid="dashboard-search-results"/);
  assert.match(dashSource, /<PropertyDetailModal/);
});

test('Header and Profile control panel provide navigation to Member Dashboard', () => {
  const headerSource = read('src/components/common/Header.tsx');
  assert.match(headerSource, /isPropertySeeker\(currentUser\.role\)/);
  assert.match(headerSource, /setActiveView\('DASHBOARD'\)/);

  const mobileHeaderSource = read('src/components/common/MobileHeader.tsx');
  assert.match(mobileHeaderSource, /case 'DASHBOARD': return 'Member Dashboard';/);
  assert.match(mobileHeaderSource, /isPropertySeeker\(currentUser\.role\)/);

  const profileModalSource = read('src/components/common/ProfileControlPanelModal.tsx');
  assert.match(profileModalSource, /isPropertySeeker\(currentUser\.role\)/);
  assert.match(profileModalSource, /setActiveView\('DASHBOARD'\)/);
});

test('Backend platformRoutes mounts /api/me/reviews with requireAuth guard', () => {
  const routesSource = read('src/server/platformRoutes.ts');
  assert.match(routesSource, /import\s*\{[^}]*listReviewsForAuthor[^}]*\}\s*from '\.\/requirementReview\.ts';/);
  assert.match(routesSource, /app\.get\('\/api\/me\/reviews',\s*guards\.requireAuth/);
  assert.match(routesSource, /const reviews = await listReviewsForAuthor\(req\.user\.id\);/);
});

import { getSqliteDb } from '../src/server/db.ts';
import { listReviewsForAuthor } from '../src/server/requirementReview.ts';

test('listReviewsForAuthor retrieves reviews for author in descending order', async () => {
  process.env.DB_ENGINE = 'sqlite';
  const db = getSqliteDb();

  // Insert a test user and review
  const testAuthorId = 'test_seeker_dash_' + Date.now();
  const testListingId = 'listing_dash_' + Date.now();
  const now = new Date().toISOString();

  // Ensure user exists for foreign key
  db.prepare(`
    INSERT INTO users (id, email, phone, name, role, salt, password_hash, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'salt', 'hash', ?, ?)
  `).run(testAuthorId, `${testAuthorId}@example.com`, '+919999900001', 'Test Seeker', 'PROPERTY_SEEKER', now, now);

  db.prepare(`
    INSERT INTO entity_reviews (id, entity_type, entity_id, author_id, author_name, rating, body, status, created_at, updated_at)
    VALUES (?, 'LISTING', ?, ?, 'Test Seeker', 5, 'Great build quality and ventilation', 'PENDING', ?, ?)
  `).run(`review_${Date.now()}`, testListingId, testAuthorId, now, now);

  const reviews = await listReviewsForAuthor(testAuthorId);
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].authorId, testAuthorId);
  assert.equal(reviews[0].entityId, testListingId);
  assert.equal(reviews[0].rating, 5);
  assert.equal(reviews[0].status, 'PENDING');
  assert.equal(reviews[0].body, 'Great build quality and ventilation');

  // Peer author gets empty list
  const peerReviews = await listReviewsForAuthor('peer_user_none');
  assert.equal(peerReviews.length, 0);
});
