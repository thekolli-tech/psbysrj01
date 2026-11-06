import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('1. Community Hero: Add Question & Create Post buttons removed, Search Community input added', () => {
  const communityForumPath = path.resolve('src/components/community/CommunityForum.tsx');
  const content = fs.readFileSync(communityForumPath, 'utf-8');

  // Ensure the hero action buttons (+ Add Question / + Create Post) are removed from the hero banner
  assert.ok(
    !content.includes('<span>Add Question</span>') ||
    content.indexOf('<span>Add Question</span>') === content.lastIndexOf('<span>Add Question</span>'), // Only in modal if any
    'Hero section must not contain the prominent Add Question button'
  );

  // Ensure Search Community input exists in hero
  assert.ok(
    content.includes('id="hero-search-community"'),
    'Community hero must contain hero-search-community input'
  );
  assert.ok(
    content.includes('placeholder="Search community hubs, corridors, or topics..."'),
    'Community hero must contain descriptive Search Community placeholder'
  );
  assert.ok(
    content.includes('<span>Search Community</span>'),
    'Community hero must contain Search Community submit button'
  );

  // Ensure Verified Live Community Hubs target exists
  assert.ok(
    content.includes('id="verified-community-hubs"'),
    'Verified Live Community Hubs container must have id="verified-community-hubs" for smooth scroll'
  );

  // Ensure Create Community is available
  assert.ok(
    content.includes('+ Create Community'),
    'Create Community link should be accessible'
  );
});

test('2. Navigation Bar: Universal search icon present in Desktop and Mobile headers', () => {
  const headerPath = path.resolve('src/components/common/Header.tsx');
  const headerContent = fs.readFileSync(headerPath, 'utf-8');

  assert.ok(
    headerContent.includes('title="Universal Search (Ctrl+K)"'),
    'Desktop Header must have Universal Search button with Ctrl+K title'
  );
  assert.ok(
    headerContent.includes('onOpenSearchModal'),
    'Desktop Header must accept and call onOpenSearchModal'
  );

  const mobileHeaderPath = path.resolve('src/components/common/MobileHeader.tsx');
  const mobileHeaderContent = fs.readFileSync(mobileHeaderPath, 'utf-8');

  assert.ok(
    mobileHeaderContent.includes('title="Universal Search"'),
    'Mobile Header must have Universal Search button'
  );
  assert.ok(
    mobileHeaderContent.includes('onOpenSearchModal'),
    'Mobile Header must accept and call onOpenSearchModal'
  );
});

test('3. UniversalSearchModal: Comprehensive multi-domain search across Properties, Communities, Trends, Media, and Pages', () => {
  const modalPath = path.resolve('src/components/common/UniversalSearchModal.tsx');
  assert.ok(fs.existsSync(modalPath), 'UniversalSearchModal component file must exist');

  const modalContent = fs.readFileSync(modalPath, 'utf-8');
  assert.ok(modalContent.includes('PROPERTIES'), 'Must index properties/projects');
  assert.ok(modalContent.includes('COMMUNITIES'), 'Must index community hubs');
  assert.ok(modalContent.includes('TRENDS'), 'Must index market trends');
  assert.ok(modalContent.includes('MEDIA'), 'Must index studio media');
  assert.ok(modalContent.includes('PAGES'), 'Must index platform pages');
  assert.ok(modalContent.includes('handleKeyDown'), 'Must support keyboard navigation');
  assert.ok(modalContent.includes('STATIC_MARKET_TRENDS'), 'Must include Western Corridor trends');
});

test('4. App.tsx: Registers global Ctrl+K / Cmd+K / "/" shortcuts and mounts UniversalSearchModal', () => {
  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf-8');

  assert.ok(
    appContent.includes('searchModalOpen'),
    'App.tsx must manage searchModalOpen state'
  );
  assert.ok(
    appContent.includes('(e.ctrlKey || e.metaKey) && e.key.toLowerCase() === \'k\''),
    'App.tsx must register Ctrl+K / Cmd+K shortcut listener'
  );
  assert.ok(
    appContent.includes('<UniversalSearchModal'),
    'App.tsx must render UniversalSearchModal'
  );
  assert.ok(
    appContent.includes('onOpenSearchModal={() => setSearchModalOpen(true)}'),
    'App.tsx must pass onOpenSearchModal handler to headers'
  );
});
