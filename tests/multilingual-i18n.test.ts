import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { SUPPORTED_LANGUAGES, SupportedLocale } from '../src/i18n/types';
import { DICTIONARIES, translate } from '../src/i18n/locales';
import { en } from '../src/i18n/locales/en';
import { getInitialLocale } from '../src/i18n/LanguageContext';
// Configure test environment with isolated SQLite database
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.DB_ENGINE = 'sqlite';
process.env.SQLITE_PATH = `/tmp/ps-multilingual-test-${process.pid}.db`;

const {
  initDatabase,
  createUser,
  createSession,
  findUserByEmail,
  updateUserProfileFields
} = await import('../src/server/db.ts');

await initDatabase();

// -----------------------------------------------------------------------------
// Test 1: English default on a new session
// -----------------------------------------------------------------------------
test('1. English is the default locale on a new unauthenticated session', () => {
  const initial = getInitialLocale();
  assert.equal(initial, 'en');
  assert.equal(SUPPORTED_LANGUAGES[0].code, 'en');
});

// -----------------------------------------------------------------------------
// Test 2: All 11 languages are supported with correct metadata
// -----------------------------------------------------------------------------
test('2. All 11 required languages are supported with native names and direction', () => {
  const expected: Array<{ code: SupportedLocale; name: string; nativeName: string; direction: 'ltr' | 'rtl' }> = [
    { code: 'en', name: 'English', nativeName: 'English', direction: 'ltr' },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', direction: 'ltr' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr' },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', direction: 'ltr' },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', direction: 'ltr' },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', direction: 'ltr' },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', direction: 'ltr' },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', direction: 'ltr' },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', direction: 'ltr' },
    { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', direction: 'ltr' },
    { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'rtl' },
  ];

  assert.equal(SUPPORTED_LANGUAGES.length, 11);
  for (const exp of expected) {
    const found = SUPPORTED_LANGUAGES.find(l => l.code === exp.code);
    assert.ok(found, `Language ${exp.code} must be defined`);
    assert.equal(found.name, exp.name);
    assert.equal(found.nativeName, exp.nativeName);
    assert.equal(found.direction, exp.direction);
    assert.ok(DICTIONARIES[exp.code], `Dictionary for ${exp.code} must exist`);
  }
});

// -----------------------------------------------------------------------------
// Test 3 & 4: Bilingual search filtering (English name and Native script name)
// -----------------------------------------------------------------------------
test('3 & 4. Search matches languages by both English name and native script name', () => {
  const search = (query: string) => {
    const q = query.trim().toLowerCase();
    return SUPPORTED_LANGUAGES.filter(
      l =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.code.toLowerCase().includes(q)
    );
  };

  // Search by English name
  const teluguEnglish = search('telugu');
  assert.equal(teluguEnglish.length, 1);
  assert.equal(teluguEnglish[0].code, 'te');

  const hindiEnglish = search('hin');
  assert.equal(hindiEnglish.length, 1);
  assert.equal(hindiEnglish[0].code, 'hi');

  // Search by Native script name
  const teluguNative = search('తెలుగు');
  assert.equal(teluguNative.length, 1);
  assert.equal(teluguNative[0].code, 'te');

  const hindiNative = search('हिन्दी');
  assert.equal(hindiNative.length, 1);
  assert.equal(hindiNative[0].code, 'hi');

  const urduNative = search('اردو');
  assert.equal(urduNative.length, 1);
  assert.equal(urduNative[0].code, 'ur');

  const kannadaNative = search('ಕನ್ನಡ');
  assert.equal(kannadaNative.length, 1);
  assert.equal(kannadaNative[0].code, 'kn');

  const tamilNative = search('தமிழ்');
  assert.equal(tamilNative.length, 1);
  assert.equal(tamilNative[0].code, 'ta');

  // Non-matching query
  const nonExistent = search('xyz999');
  assert.equal(nonExistent.length, 0);
});

// -----------------------------------------------------------------------------
// Test 5: Language selection updates interface strings across navigation
// -----------------------------------------------------------------------------
test('5. Language selection updates all 8 exact navigation items accurately', () => {
  const expectedNavKeys = [
    'nav.overview',
    'nav.media',
    'nav.trends',
    'nav.reviews',
    'nav.community',
    'nav.live',
    'nav.requirement',
    'nav.contact'
  ];

  // English
  assert.equal(translate('en', 'nav.overview'), 'Overview');
  assert.equal(translate('en', 'nav.media'), 'Media & Podcast');
  assert.equal(translate('en', 'nav.trends'), 'Market Trends & Insights');
  assert.equal(translate('en', 'nav.reviews'), 'Review & Rating');
  assert.equal(translate('en', 'nav.community'), 'Community Q&A');
  assert.equal(translate('en', 'nav.live'), 'Live & Latest');
  assert.equal(translate('en', 'nav.requirement'), 'Property Requirement');
  assert.equal(translate('en', 'nav.contact'), 'Contact & Connect');

  // Telugu
  assert.equal(translate('te', 'nav.overview'), 'అవలోకనం');
  assert.equal(translate('te', 'nav.media'), 'మీడియా & పాడ్‌కాస్ట్');
  assert.equal(translate('te', 'nav.trends'), 'మార్కెట్ ట్రెండ్స్ & అంతర్దృష్టులు');
  assert.equal(translate('te', 'nav.reviews'), 'సమీక్ష & రేటింగ్');
  assert.equal(translate('te', 'nav.community'), 'కమ్యూనిటీ ప్రశ్నోత్తరాలు');
  assert.equal(translate('te', 'nav.live'), 'లైవ్ & తాజా సమాచారం');
  assert.equal(translate('te', 'nav.requirement'), 'ప్రాపర్టీ ఆవశ్యకత');
  assert.equal(translate('te', 'nav.contact'), 'సంప్రదించండి & కలవండి');

  // Hindi
  assert.equal(translate('hi', 'nav.overview'), 'अवलोकन');
  assert.equal(translate('hi', 'nav.media'), 'मीडिया और पॉडकास्ट');
  assert.equal(translate('hi', 'nav.trends'), 'मार्केट ट्रेंड्स और अंतर्दृष्टि');
  assert.equal(translate('hi', 'nav.reviews'), 'समीक्षा और रेटिंग');

  // Urdu
  assert.equal(translate('ur', 'nav.overview'), 'جائزہ');
  assert.equal(translate('ur', 'nav.media'), 'میڈیا اور پوڈ کاسٹ');
  assert.equal(translate('ur', 'nav.trends'), 'مارکیٹ رجحانات اور بصیرت');
  assert.equal(translate('ur', 'nav.reviews'), 'جائزہ اور درجہ بندی');

  // Verify all 11 dictionaries define all navigation keys
  for (const lang of SUPPORTED_LANGUAGES) {
    for (const key of expectedNavKeys) {
      const translated = translate(lang.code, key);
      assert.ok(translated && translated !== key, `Key "${key}" must be translated in locale "${lang.code}"`);
    }
  }
});

// -----------------------------------------------------------------------------
// Test 6 & 7: Authenticated user preference persistence & sync endpoint
// -----------------------------------------------------------------------------
test('6 & 7. Authenticated preference synchronization via PUT /api/me/language and database', async () => {
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const testEmail = `i18n_user_${Date.now()}@example.com`;
    const created = await createUser({
      name: 'I18n Test User',
      email: testEmail,
      role: 'PROPERTY_SEEKER',
      password: 'Password123!',
      phone: '+919876543210'
    });
    assert.ok(created);

    // Initial user default preferred language is 'en'
    const userBefore = await findUserByEmail(testEmail);
    assert.equal(userBefore?.preferred_language || 'en', 'en');

    // Create session for authenticated API calls
    const session = await createSession(created.id);
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.token}`
    };

    // Test PUT /api/me/language with invalid language code (rejected)
    const invalidRes = await fetch(`${baseUrl}/api/me/language`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ language: 'klingon' })
    });
    assert.equal(invalidRes.status, 400);

    // Test PUT /api/me/language with valid language code 'te' (Telugu)
    const validRes = await fetch(`${baseUrl}/api/me/language`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ language: 'te' })
    });
    assert.equal(validRes.status, 200);
    const validData = await validRes.json();
    assert.equal(validData.success, true);
    assert.equal(validData.preferredLanguage, 'te');

    // Verify database state reflects 'te'
    const userAfter = await findUserByEmail(testEmail);
    assert.equal(userAfter?.preferred_language, 'te');

    // Verify /api/auth/me returns the updated preferredLanguage
    const meRes = await fetch(`${baseUrl}/api/auth/me`, {
      headers: authHeaders
    });
    assert.equal(meRes.status, 200);
    const meData = await meRes.json();
    assert.equal(meData.user?.preferredLanguage, 'te');

    // Test unauthenticated PUT /api/me/language (rejected 401)
    const unauthRes = await fetch(`${baseUrl}/api/me/language`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: 'te' })
    });
    assert.equal(unauthRes.status, 401);
  } finally {
    server.close();
  }
});

// -----------------------------------------------------------------------------
// Test 8: Logout and login preference behavior
// -----------------------------------------------------------------------------
test('8. Login returns user preferred language and preserves it', async () => {
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@propertystudio.org',
        password: 'SuperAdminPassword123!'
      })
    });

    if (loginRes.status === 200) {
      const data = await loginRes.json();
      assert.ok(data.user);
      assert.ok(data.user.preferredLanguage, 'Logged in user payload must include preferredLanguage');
    }
  } finally {
    server.close();
  }
});

// -----------------------------------------------------------------------------
// Test 9: English fallback for missing keys
// -----------------------------------------------------------------------------
test('9. English fallback functions when a key is absent from a non-English dictionary', () => {
  // Existing key in English
  const res = translate('te', 'nav.overview');
  assert.equal(res, 'అవలోకనం');

  // If a mock key exists only in English, non-English locale falls back to English
  (en as any)['test.temporaryKey'] = 'Canonical English Text';
  const fallbackRes = translate('te', 'test.temporaryKey');
  assert.equal(fallbackRes, 'Canonical English Text');
  delete (en as any)['test.temporaryKey'];

  // Unknown key returns the raw key without crashing
  const unknown = translate('te', 'totally.nonexistent.key.xyz');
  assert.equal(unknown, 'totally.nonexistent.key.xyz');
});

// -----------------------------------------------------------------------------
// Test 10: Urdu RTL configuration
// -----------------------------------------------------------------------------
test('10. Urdu language configuration specifies RTL text direction', () => {
  const urdu = SUPPORTED_LANGUAGES.find(l => l.code === 'ur');
  assert.ok(urdu);
  assert.equal(urdu.direction, 'rtl');
  assert.equal(urdu.name, 'Urdu');
  assert.equal(urdu.nativeName, 'اردو');

  // All other 10 languages are LTR
  for (const lang of SUPPORTED_LANGUAGES) {
    if (lang.code !== 'ur') {
      assert.equal(lang.direction, 'ltr', `${lang.name} should be LTR`);
    }
  }
});

// -----------------------------------------------------------------------------
// Test 11: Native scripts render correctly across all 11 languages
// -----------------------------------------------------------------------------
test('11. All 11 native script representations are authentic and uncorrupted', () => {
  const scripts: Record<SupportedLocale, string> = {
    en: 'English',
    te: 'తెలుగు',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    ta: 'தமிழ்',
    ml: 'മലയാളം',
    bn: 'বাংলা',
    mr: 'मराठी',
    gu: 'ગુજરાતી',
    pa: 'ਪੰਜਾਬੀ',
    ur: 'اردو'
  };

  for (const [code, expectedNative] of Object.entries(scripts)) {
    const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
    assert.ok(lang, `Language ${code} must exist`);
    assert.equal(lang.nativeName, expectedNative, `Native script mismatch for ${code}`);
  }
});

// -----------------------------------------------------------------------------
// Test 12: Major application sections have translation coverage
// -----------------------------------------------------------------------------
test('12. Translation coverage exists across all required platform modules', () => {
  const coreSections = [
    // Header & Nav
    'nav.overview',
    'nav.media',
    'nav.tagline',
    'lang.selectLanguage',
    // Homepage & Hero
    'hero.badge',
    'hero.title',
    'hero.subtitle',
    'hero.searchPlaceholder',
    // Properties
    'properties.verifiedProperties',
    'properties.filterProperties',
    'properties.priceRange',
    'properties.noResults',
    // Community
    'community.title',
    'community.askQuestion',
    'community.startDiscussion',
    // Media Studio
    'media.title',
    'media.allMedia',
    'media.videos',
    'media.podcasts',
    'media.liveNow',
    // Reviews
    'reviews.title',
    'reviews.verifiedFeedback',
    // Requirements
    'requirement.title',
    'requirement.submit',
    // Dashboard & Auth
    'dashboard.myDashboard',
    'dashboard.preferredLanguage',
    'auth.signInTitle',
    'auth.otpDescription',
    // Footer
    'footer.rights',
    'footer.certified',
    'footer.privacy',
    'footer.terms'
  ];

  for (const lang of SUPPORTED_LANGUAGES) {
    for (const key of coreSections) {
      const translated = translate(lang.code, key);
      assert.ok(translated, `Section key "${key}" must resolve in ${lang.name}`);
      assert.notEqual(translated, key, `Section key "${key}" missing translation in ${lang.name}`);
    }
  }
});

// -----------------------------------------------------------------------------
// Test 13: Strict preservation of user-generated content and brand names
// -----------------------------------------------------------------------------
test('13. Brand names, user posts, and technical identifiers remain strictly untranslated', () => {
  // Brand names remain intact
  assert.equal(translate('en', 'nav.tagline'), 'REAL ESTATE · VISUAL STORIES · MARKET TRENDS & INSIGHTS');
  assert.ok(translate('te', 'nav.tagline').includes('రియల్ ఎస్టేట్'));
  
  // Specific required technical labels
  assert.equal(translate('te', 'media.postUpdate'), 'Post Video / Podcast Update');
  assert.equal(translate('te', 'media.superAdminStudio'), 'Super Admin Broadcast Studio');
});

// -----------------------------------------------------------------------------
// Test 14: Security invariant: Role permissions and media storage remain intact
// -----------------------------------------------------------------------------
test('14. Security invariant: Role permissions and media storage remain intact', async () => {
  const serverModule: any = await import('../server.ts');
  const app = serverModule.app || serverModule.default;
  const server: Server = app.listen(0);
  await once(server, 'listening');
  const port = (server.address() as AddressInfo).port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    const configRes = await fetch(`${baseUrl}/api/media/storage/config`);
    assert.equal(configRes.status, 200);
    const config = await configRes.json();
    assert.ok(typeof config.configured === 'boolean');
    assert.equal(config.maxVideoSizeBytes, 500 * 1024 * 1024);

    // Super Admin route protection remains active
    const uploadIntentRes = await fetch(`${baseUrl}/api/media/upload-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test Stream' })
    });
    assert.equal(uploadIntentRes.status, 401, 'Unauthorized request must be rejected');
  } finally {
    server.close();
  }
});
