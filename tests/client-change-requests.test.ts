import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (relPath: string) => readFileSync(join(root, relPath), 'utf8');

const PUBLIC_SOURCE_FILES = [
  'src/App.tsx',
  'src/index.css',
  'src/components/common/Header.tsx',
  'src/components/common/MobileHeader.tsx',
  'src/components/common/MobileBottomNav.tsx',
  'src/components/common/LoginModal.tsx',
  'src/components/common/AuthRequiredCard.tsx',
  'src/components/home/HomeHero.tsx',
  'src/components/home/OverviewFoundation.tsx',
  'src/components/support/PropertyStudioSupportDesk.tsx',
  'src/components/legal/PrivacyPolicyView.tsx',
  'src/components/legal/TermsConditionsView.tsx',
  'index.html'
];

test('Task 1: TG RERA and Udyam identifiers are completely removed from all public files', () => {
  const forbiddenPatterns = [
    /A02200004078/,
    /TS-02-283677/,
    /283677/
  ];

  for (const file of PUBLIC_SOURCE_FILES) {
    if (!existsSync(join(root, file))) continue;
    const content = read(file);
    for (const pattern of forbiddenPatterns) {
      assert.doesNotMatch(
        content,
        pattern,
        `File ${file} must not contain forbidden identifier matching ${pattern}`
      );
    }
  }
});

test('Task 2: Desktop header navigation fits viewport without horizontal overflow', () => {
  const header = read('src/components/common/Header.tsx');
  // Responsive flex-wrap and gap spacing preventing horizontal scrollbars
  assert.match(header, /flex-wrap/);
  assert.match(header, /gap-x-2\.5/);
  assert.doesNotMatch(header, /overflow-x-auto/);

  // App wrapper prevents horizontal page overflow
  const app = read('src/App.tsx');
  assert.match(app, /overflow-x-hidden/);
});

test('Task 3 & 4: Overview Foundation contains 5 client sections and accessible accordion controls', () => {
  const overview = read('src/components/home/OverviewFoundation.tsx');

  // 5 client sections
  assert.match(overview, /About Property Studio/);
  assert.match(overview, /Founder & CEO/);
  assert.match(overview, /Vision/);
  assert.match(overview, /Mission/);
  assert.match(overview, /Core DNA/);

  // 5 pillars: latest client framework + engines
  assert.match(overview, /MEDIA-CENTRIC/);
  assert.match(overview, /SEARCH ENGINE/);
  assert.match(overview, /SOCIAL FORUM/);
  assert.match(overview, /REVIEW \/ RATING/);
  assert.match(overview, /B2B\/B2C NETWORK/);
  assert.match(overview, /Aggregator Engine/);
  assert.match(overview, /Broadcast Network/);
  assert.match(overview, /Community Hive/);
  assert.match(overview, /Performance Index/);
  assert.match(overview, /Town Hall Arena/);
  assert.match(overview, /YouTube/);
  assert.match(overview, /99acres/);
  assert.match(overview, /Reddit/);
  assert.match(overview, /Google Reviews/);

  // Founder details
  assert.match(overview, /Swamy Reddy Javidi/);
  assert.match(overview, /Sadguna Properties/);
  assert.match(overview, /MBA in Marketing/);

  // Accessible accordion attributes
  assert.match(overview, /aria-expanded=/);
  assert.match(overview, /aria-controls=/);
  assert.match(overview, /role="region"/);
  assert.match(overview, /type="button"/);
});

test('Task 5: Social media cards use recognizable platform brand icons and valid handles', () => {
  const app = read('src/App.tsx');

  // Brand icons present (SVGs / Lucide)
  assert.match(app, /WhatsApp Channel/);
  assert.match(app, /YouTube Studio/);
  assert.match(app, /Instagram/);
  assert.match(app, /LinkedIn Network/);
  assert.match(app, /Facebook Profile/);
  assert.match(app, /Facebook Business/);
  assert.match(app, /Facebook Group/);
  assert.match(app, /Twitter \/ X/);

  // Raw text badges WA, YT, IG, IN, FB, GP must not be rendered as social media badges
  assert.doesNotMatch(app, /<span[^>]*class="[^"]*font-bold[^"]*">WA<\/span>/);
  assert.doesNotMatch(app, /<span[^>]*class="[^"]*font-bold[^"]*">YT<\/span>/);
  assert.doesNotMatch(app, /<span[^>]*class="[^"]*font-bold[^"]*">IG<\/span>/);

  // Safe external link behavior
  assert.match(app, /target="_blank"/);
  assert.match(app, /rel="noopener noreferrer"/);

  // Official X handle preserves trailing underscore
  assert.match(app, /https:\/\/x\.com\/propertystudio_/);
});

test('Task 6: Privacy Policy and Terms & Conditions are dedicated, accessible, and linked', () => {
  assert.ok(existsSync(join(root, 'src/components/legal/PrivacyPolicyView.tsx')));
  assert.ok(existsSync(join(root, 'src/components/legal/TermsConditionsView.tsx')));

  const privacy = read('src/components/legal/PrivacyPolicyView.tsx');
  const terms = read('src/components/legal/TermsConditionsView.tsx');
  const app = read('src/App.tsx');
  const loginModal = read('src/components/common/LoginModal.tsx');

  // Disclaimers and content
  assert.match(privacy, /Privacy Policy/);
  assert.match(privacy, /Data Collection & User Profiles/);
  assert.match(privacy, /Data Masking & Property Requirements/);
  assert.match(privacy, /User Rights & Secretariat Contact/);

  assert.match(terms, /Terms & Conditions/);
  assert.match(terms, /Acceptance of Terms & Eligibility/);
  assert.match(terms, /Property Information & Due Diligence Disclaimer/);
  assert.match(terms, /exclusive jurisdiction of the competent courts in Hyderabad/);

  // Routing support in App.tsx
  assert.match(app, /viewParam === 'privacy'/);
  assert.match(app, /viewParam === 'terms'/);
  assert.match(app, /activeView === 'PRIVACY'/);
  assert.match(app, /activeView === 'TERMS'/);
  assert.match(app, /PrivacyPolicyView/);
  assert.match(app, /TermsConditionsView/);

  // Footer links
  assert.match(app, /Privacy Policy/);
  assert.match(app, /Terms & Conditions/);

  // Registration links in LoginModal
  assert.match(loginModal, /Terms & Conditions/);
  assert.match(loginModal, /Privacy Policy/);
});

test('Task 7: Community Q&A is guarded on frontend and backend', () => {
  const header = read('src/components/common/Header.tsx');
  const bottomNav = read('src/components/common/MobileBottomNav.tsx');
  const app = read('src/App.tsx');
  const server = read('server.ts');

  // Frontend navigation intercept (header, mobile bottom nav, footer)
  assert.match(header, /link\.view === 'COMMUNITY' && !isLoggedIn/);
  assert.match(bottomNav, /tab\.view === 'COMMUNITY' && !isLoggedIn/);
  assert.match(app, /link\.view === 'COMMUNITY' && !isLoggedIn/);

  // Guest direct view gate
  assert.match(app, /activeView === 'COMMUNITY'/);
  assert.match(app, /<AuthRequiredCard view="COMMUNITY"/);

  // Backend route guards: reads, mutations, votes, follows, replies
  assert.match(server, /app\.get\('\/api\/community\/posts', requireAuth/);
  assert.match(server, /app\.get\('\/api\/community\/posts\/:id', requireAuth/);
  assert.match(server, /app\.get\('\/api\/community\/posts\/:id\/comments', requireAuth/);
  assert.match(server, /app\.post\('\/api\/community\/posts', requireAuth/);
  assert.match(server, /app\.put\('\/api\/community\/posts\/:id', requireAuth/);
  assert.match(server, /app\.delete\('\/api\/community\/posts\/:id', requireAuth/);
  assert.match(server, /app\.post\('\/api\/community\/posts\/:id\/vote', requireAuth/);
  assert.match(server, /app\.post\('\/api\/community\/posts\/:id\/follow', requireAuth/);
  assert.match(server, /app\.post\('\/api\/community\/posts\/:id\/comments', requireAuth/);
});
