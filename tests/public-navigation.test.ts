import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  COMPANY_CONTACT_DISPLAY,
  COMPANY_CONTACT_TEL,
  COMPANY_SUPPORT_WHATSAPP
} from '../src/shared/companyContact.ts';
import {
  REQUESTED_END_USER_NAV,
  linkedEndUserNavigation,
  roleUtilityDestinations,
  unavailableEndUserNavigation
} from '../src/shared/endUserNavigation.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

const PUBLIC_COPY_FILES = [
  'src/App.tsx',
  'src/index.css',
  'src/components/common/Header.tsx',
  'src/components/common/MobileHeader.tsx',
  'src/components/common/MobileBottomNav.tsx',
  'src/components/common/AuthRequiredCard.tsx',
  'src/components/home/HomeHero.tsx',
  'src/components/support/PropertyStudioSupportDesk.tsx',
  'src/components/studio/StudioBroadcastView.tsx'
];

test('public company contact', () => {
  assert.equal(COMPANY_CONTACT_DISPLAY, '9014 55 55 66');
  assert.equal(COMPANY_CONTACT_TEL, 'tel:+919014555566');
  assert.equal(
    COMPANY_SUPPORT_WHATSAPP,
    'https://wa.me/919014555566?text=Hello%20Property%20Studio%2C%20I%20would%20like%20to%20inquire%20about%20a%20project%20audit.'
  );

  const app = read('src/App.tsx');
  const support = read('src/components/support/PropertyStudioSupportDesk.tsx');
  assert.match(app, /COMPANY_CONTACT_DISPLAY/);
  assert.match(app, /href=\{COMPANY_CONTACT_TEL\}/);
  assert.match(support, /href=\{COMPANY_CONTACT_TEL\}/);
  assert.match(support, /COMPANY_CONTACT_DISPLAY/);
  assert.match(support, /href=\{COMPANY_SUPPORT_WHATSAPP\}/);
  assert.doesNotMatch(app, /9849012890|98490 12890/);
  assert.doesNotMatch(support, /9849012890|98490 12890/);
});

test('end-user navigation order links only existing destinations', () => {
  assert.deepEqual(
    REQUESTED_END_USER_NAV.map(item => item.label),
    [
      'Overview',
      'Media & Podcast',
      'Market Trends & Insights',
      'Review & Rating — All Stakeholders and Projects',
      'Community Q&A',
      'Live & Latest',
      'Property Requirement',
      'Contact & Connect Property Studio'
    ]
  );

  const linked = linkedEndUserNavigation();
  assert.deepEqual(
    linked.map(item => item.label),
    [
      'Overview',
      'Media & Podcast',
      'Market Trends & Insights',
      'Review & Rating — All Stakeholders and Projects',
      'Community Q&A',
      'Live & Latest',
      'Property Requirement',
      'Contact & Connect Property Studio'
    ]
  );
  assert.deepEqual(
    linked.map(item => item.view),
    ['HOME', 'MEDIA', 'MARKET_INSIGHTS', 'REVIEWS', 'COMMUNITY', 'CONFERENCE', 'REQUIREMENT', 'CHAT']
  );

  assert.deepEqual(unavailableEndUserNavigation(), []);
  assert.equal(linked.some(item => item.view === 'LEADS_MARKET' || item.view === 'CONTACT'), false);

  for (const file of [
    'src/components/common/Header.tsx',
    'src/components/common/MobileBottomNav.tsx',
    'src/App.tsx'
  ]) {
    const source = read(file);
    assert.match(source, /linkedEndUserNavigation/);
    assert.doesNotMatch(source, /Review & Rating|Property Requirement/);
  }

  const mobile = read('src/components/common/MobileBottomNav.tsx');
  assert.match(mobile, /grid-cols-4/);
  assert.match(mobile, /aria-label=\{tab\.label\}/);
});

test('role utility destinations stay outside the end-user list', () => {
  assert.deepEqual(roleUtilityDestinations('PROPERTY_SEEKER', true), []);
  assert.deepEqual(roleUtilityDestinations('PROPERTY_SEEKER', false), []);
  assert.deepEqual(roleUtilityDestinations(null, false), []);
  assert.deepEqual(roleUtilityDestinations('CHANNEL_PARTNER', true), ['LEADS_MARKET', 'PROFESSIONAL']);
  assert.deepEqual(roleUtilityDestinations('RERA_AGENT', true), ['LEADS_MARKET', 'PROFESSIONAL']);
  assert.deepEqual(roleUtilityDestinations('SUPER_ADMIN', true), ['LEADS_MARKET']);
  assert.deepEqual(roleUtilityDestinations('DEVELOPER', true), ['LEADS_MARKET']);
  assert.deepEqual(roleUtilityDestinations('PROPERTY_ADMIN', true), ['LEADS_MARKET', 'PROFESSIONAL']);

  const header = read('src/components/common/Header.tsx');
  const mobileHeader = read('src/components/common/MobileHeader.tsx');
  assert.match(header, /roleUtilityDestinations/);
  assert.match(header, /Buyer Leads/);
  assert.match(header, /Workspace/);
  assert.match(header, /isPlatformAdmin/);
  assert.match(mobileHeader, /roleUtilityDestinations/);
  assert.doesNotMatch(header, /86"|IFP/);
});

test('public copy no longer names the 86-inch IFP studio', () => {
  for (const file of PUBLIC_COPY_FILES) {
    const source = read(file).replaceAll('STUDIO_IFP', '');
    assert.doesNotMatch(source, /86-inch|86"|Interactive Flat Panel|\bIFP\b/, file);
  }

  const app = read('src/App.tsx');
  assert.match(app, /StudioBroadcastView/);
  assert.match(app, /deviceMode === 'STUDIO_IFP'/);
  assert.match(app, /activeView === 'STUDIO'/);
  assert.match(app, /studio-broadcast-mode/);
  assert.doesNotMatch(app, /setActiveView\('STUDIO'\)/);

  const studio = read('src/components/studio/StudioBroadcastView.tsx');
  assert.match(studio, /export const StudioBroadcastView/);
  assert.match(studio, /startDrawing/);
  assert.match(studio, /Exit Studio Mode/);
  assert.match(studio, /CAMERA 1 \(WIDE SHOT\)/);
  assert.match(studio, /ON AIR · STUDIO CAPTURE/);
  assert.equal(read('src/types/index.ts').includes("STUDIO_IFP"), true);
});

test('account phones, the official X handle, and payment gates stay in their lanes', () => {
  const mock = read('src/data/mockData.ts');
  assert.match(mock, /phone: '\+91 98490 12890'/);

  assert.match(read('src/components/common/LoginModal.tsx'), /placeholder="e\.g\. \+91 98490 12345"/);
  assert.match(read('src/components/contact/ContactPropertyAdmin.tsx'), /placeholder="\+91 98490 00000"/);
  assert.match(read('src/components/support/PropertyStudioSupportDesk.tsx'), /placeholder="\+91 98490\.\.\."/);
  assert.match(read('tests/production-policy.test.ts'), /maskPhone\('\+91 98490 12890'\)/);

  const app = read('src/App.tsx');
  assert.match(app, /href="https:\/\/x\.com\/propertystudio_"/);
  assert.match(app, /@propertystudio_\s*<\/span>/);
  assert.match(app, /@propertystudio_srj/);
  assert.doesNotMatch(app, /https:\/\/x\.com\/propertystudio(?!_)/);
  assert.doesNotMatch(app, /@propertystudio\s*<\/span>/);

  const policy = read('src/shared/policy.ts');
  assert.match(policy, /PAYMENT_PROVIDER/);
  assert.match(policy, /PAYMENT_WEBHOOK_SECRET/);
  assert.doesNotMatch(read('src/server/commerce.ts'), /9014555566|COMPANY_CONTACT/);
});
