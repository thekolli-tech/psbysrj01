import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

test('AboutUsView component implements the complete brief with Core DNA and Founder pedigree', () => {
  const filePath = join(root, 'src/components/about/AboutUsView.tsx');
  assert.ok(existsSync(filePath), 'AboutUsView.tsx must exist');

  const source = read('src/components/about/AboutUsView.tsx');

  // 1. Hero headline & description
  assert.match(source, /Beyond Property Discovery\./);
  assert.match(source, /Towards Absolute Market Intelligence\./);
  assert.match(source, /integrated Real Estate Media Network and Community PropTech Platform/);

  // 2. Interactive Core DNA (6 I's & 6 R's)
  assert.match(source, /Interactive Core DNA/);
  // 6 I's
  assert.match(source, /Interactive/);
  assert.match(source, /Informative/);
  assert.match(source, /Intelligent/);
  assert.match(source, /Interview/);
  assert.match(source, /Intermediary/);
  assert.match(source, /All Integrated/);

  // 6 R's (3 supplied principles + reserved slots)
  assert.match(source, /Real-time/);
  assert.match(source, /Realistic/);
  assert.match(source, /Revolutionary/);

  // Semicircle SVG graphic elements
  assert.match(source, /<svg/);
  assert.match(source, /CORE DNA/);

  // 3. Five Pillars
  assert.match(source, /Aggregator Engine/);
  assert.match(source, /Broadcast Network/);
  assert.match(source, /Community Hive/);
  assert.match(source, /Performance Index/);
  assert.match(source, /Town Hall Arena/);

  // 4. Target Stakeholders (Who We Serve)
  assert.match(source, /Property Seekers & Investors/);
  assert.match(source, /Developers & Builders/);
  assert.match(source, /Verified Agents & Channel Partners/);
  assert.match(source, /Landowners/);
  assert.match(source, /Real Estate Media & Industry Experts/);

  // 5. Vision & Mission
  assert.match(source, /Our Vision/);
  assert.match(source, /global benchmark for trusted, informative and interactive real estate discovery/);
  assert.match(source, /Our Mission/);
  assert.match(source, /unify property search, broadcast media, community discussions/);

  // 6. Founder Profile & 6C Philosophy
  assert.match(source, /Swamy Reddy Javidi/);
  assert.match(source, /MBA in Marketing/);
  assert.match(source, /24\+ years/);
  assert.match(source, /Reliance Jio/);
  assert.match(source, /Sadguna Properties/);
  assert.match(source, /Content/);
  assert.match(source, /Courage/);
  assert.match(source, /Confidence/);
  assert.match(source, /Communication/);
  assert.match(source, /Contacts/);
  assert.match(source, /Convincing/);

  // 7. Final Call to Action
  assert.match(source, /Discover Real Estate Beyond Listings\./);
  assert.match(source, /Explore Communities/);
  assert.match(source, /Discover Properties/);
  assert.match(source, /Join Property Studio/);
});

test('Navigation integrates About Us across desktop, mobile, authenticated, and footer layouts', () => {
  // App.tsx mounts AboutUsView for both logged-in and logged-out views
  const app = read('src/App.tsx');
  assert.match(app, /AboutUsView/);
  assert.match(app, /activeView === 'ABOUT'/);
  assert.match(app, /About Us/);

  // Header.tsx includes About Us button
  const header = read('src/components/common/Header.tsx');
  assert.match(header, /About Us/);
  assert.match(header, /setActiveView\('ABOUT'\)/);

  // TopNavigation.tsx includes onNavigateAbout prop and About Us button
  const topNav = read('src/components/authenticated/TopNavigation.tsx');
  assert.match(topNav, /onNavigateAbout/);
  assert.match(topNav, /About Us/);

  // LeftSidebar.tsx includes About Us in feeds
  const leftSidebar = read('src/components/authenticated/LeftSidebar.tsx');
  assert.match(leftSidebar, /'ABOUT'/);
  assert.match(leftSidebar, /About Us/);

  // MobileHeader.tsx includes About Us drawer button
  const mobileHeader = read('src/components/common/MobileHeader.tsx');
  assert.match(mobileHeader, /About Us/);
  assert.match(mobileHeader, /setActiveView\('ABOUT'\)/);

  // AppContext handles ABOUT routing
  const appContext = read('src/context/AppContext.tsx');
  assert.match(appContext, /case 'ABOUT':/);
});
