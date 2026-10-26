import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ALL_PROPERTY_TYPES,
  DEFAULT_NEW_PROPERTY_TYPE,
  PROPERTY_CATEGORY_GROUPS,
  PROPERTY_CATEGORY_LABELS,
  SAVED_CATEGORY_GROUP,
  displayPropertyType,
  filterByPropertyType,
  isCatalogPropertyType,
  matchesPropertyTypeFilter,
  preservePropertyType,
  propertyTypeChoices,
  propertyTypeGroup
} from '../src/shared/propertyCategories.ts';
import { POSTGRES_ADDITIVE_SQL, schemaSqlIsNonDestructive } from '../src/server/platformSchema.ts';

const root = join(import.meta.dirname, '..');
const read = (relativePath: string) => readFileSync(join(root, relativePath), 'utf8');

const LEGACY_LISTINGS = [
  { id: 'sky', title: 'Sky listing', propertyType: 'Sky Villa' },
  { id: 'high', title: 'High-rise listing', propertyType: 'Luxury High-Rise' },
  { id: 'gated', title: 'Gated listing', propertyType: 'Gated Villa Community' },
  { id: 'commercial', title: 'Commercial listing', propertyType: 'Grade-A Commercial' },
  { id: 'mixed', title: 'Mixed listing', propertyType: 'Sky Villa / Penthouse' },
  { id: 'catalog', title: 'Catalog listing', propertyType: 'Flats / Apartments' },
  { id: 'blank', title: 'Unlabeled listing', propertyType: '' }
];

const LEGACY_LEADS = [
  { id: 'lead-sky', propertyType: 'Sky Villa / Penthouse' },
  { id: 'lead-bhk', propertyType: 'Luxury High-Rise (4 BHK)' },
  { id: 'lead-doctor', propertyType: '3.5 BHK High-Rise' },
  { id: 'lead-plot', propertyType: 'Plot' },
  { id: 'lead-villa', propertyType: 'Luxury Villa' },
  { id: 'lead-catalog', propertyType: 'Penthouse' }
];

test('property catalog keeps the client names, groups, and order', () => {
  assert.deepEqual(
    PROPERTY_CATEGORY_GROUPS.map(group => group.label),
    ['Residential', 'Commercial', 'Farm / Agricultural', 'Industrial']
  );
  assert.deepEqual(PROPERTY_CATEGORY_GROUPS[0].options, [
    'Flats / Apartments',
    'Villa',
    'Independent House',
    'Builder Floor',
    'Residential Land / Plots',
    'Studio Apartments',
    'Farm House',
    'Penthouse'
  ]);
  assert.deepEqual(PROPERTY_CATEGORY_GROUPS[1].options, [
    'Office Space',
    'Commercial Retail Shops',
    'Commercial Land / Plots',
    'Guest House',
    'Hotel & Restaurant',
    'Warehouse / Godown',
    'Retail Showrooms',
    'Business Center'
  ]);
  assert.deepEqual(PROPERTY_CATEGORY_GROUPS[2].options, ['Farm / Agricultural Land']);
  assert.deepEqual(PROPERTY_CATEGORY_GROUPS[3].options, ['Industrial Land', 'Factory']);
  assert.equal(PROPERTY_CATEGORY_LABELS.length, 19);
  assert.equal(new Set(PROPERTY_CATEGORY_LABELS).size, 19);
  assert.equal(DEFAULT_NEW_PROPERTY_TYPE, 'Flats / Apartments');
  assert.equal(propertyTypeGroup('Factory'), 'Industrial');
  assert.equal(propertyTypeGroup('Farm / Agricultural Land'), 'Farm / Agricultural');
  assert.equal(isCatalogPropertyType('Penthouse'), true);
});

test('listing forms and search filters share the catalog', () => {
  const catalog = read('src/shared/propertyCategories.ts');
  const select = read('src/components/properties/PropertyCategorySelect.tsx');
  const consumers = [
    'src/components/home/HomeHero.tsx',
    'src/components/properties/PropertyList.tsx',
    'src/components/leads/LeadMarketplace.tsx',
    'src/components/admin/ProfessionalDashboard.tsx'
  ];
  assert.match(select, /propertyTypeChoices/);
  assert.match(select, /optgroup/);
  for (const file of consumers) {
    const source = read(file);
    assert.match(source, /PropertyCategorySelect/, file);
    assert.doesNotMatch(source, /'Sky Villa', 'Luxury High-Rise', 'Grade-A Commercial', 'Gated Villa Community'/, file);
  }
  assert.match(catalog, /Flats \/ Apartments/);
  assert.equal(PROPERTY_CATEGORY_LABELS.includes('Sky Villa'), false);
});

test('legacy free-text types stay visible, searchable, and unmapped', () => {
  assert.deepEqual(
    filterByPropertyType(LEGACY_LISTINGS, ALL_PROPERTY_TYPES).map(item => item.id),
    LEGACY_LISTINGS.map(item => item.id)
  );
  assert.deepEqual(filterByPropertyType(LEGACY_LISTINGS, 'Sky Villa').map(item => item.id), ['sky']);
  assert.deepEqual(filterByPropertyType(LEGACY_LISTINGS, 'Villa'), []);
  assert.deepEqual(filterByPropertyType(LEGACY_LISTINGS, 'Flats / Apartments').map(item => item.id), ['catalog']);
  assert.equal(matchesPropertyTypeFilter('Grade-A Commercial', 'Office Space'), false);
  assert.equal(matchesPropertyTypeFilter('Gated Villa Community', 'Villa'), false);
  assert.equal(matchesPropertyTypeFilter('Sky Villa / Penthouse', 'Penthouse'), false);
  assert.equal(displayPropertyType('Sky Villa / Penthouse'), 'Sky Villa / Penthouse');
  assert.equal(preservePropertyType('Luxury High-Rise (4 BHK)'), 'Luxury High-Rise (4 BHK)');
  assert.equal(propertyTypeGroup('Sky Villa'), null);
  assert.equal(propertyTypeGroup('3.5 BHK High-Rise'), null);
  assert.equal(isCatalogPropertyType('Plot'), false);
  assert.equal(isCatalogPropertyType('Luxury Villa'), false);
  assert.equal(isCatalogPropertyType('Residential Plot / Villa'), false);

  const choices = propertyTypeChoices(LEGACY_LISTINGS.map(item => item.propertyType));
  assert.deepEqual(
    choices.filter(choice => !choice.legacy).map(choice => choice.label),
    PROPERTY_CATEGORY_LABELS
  );
  assert.deepEqual(
    choices.filter(choice => choice.legacy).map(choice => choice.label),
    ['Sky Villa', 'Luxury High-Rise', 'Gated Villa Community', 'Grade-A Commercial', 'Sky Villa / Penthouse']
  );
  assert.equal(choices.at(-1)?.group, SAVED_CATEGORY_GROUP);

  const leadChoices = propertyTypeChoices(LEGACY_LEADS.map(lead => lead.propertyType));
  assert.deepEqual(
    leadChoices.filter(choice => choice.legacy).map(choice => choice.label),
    ['Sky Villa / Penthouse', 'Luxury High-Rise (4 BHK)', '3.5 BHK High-Rise', 'Plot', 'Luxury Villa']
  );
  assert.equal(filterByPropertyType(LEGACY_LEADS, 'Plot').length, 1);
  assert.equal(filterByPropertyType(LEGACY_LEADS, 'Penthouse')[0].id, 'lead-catalog');
  assert.equal(filterByPropertyType(LEGACY_LEADS, ALL_PROPERTY_TYPES).length, LEGACY_LEADS.length);
});

test('stored property types are not rewritten by listing or lead persistence', () => {
  const commerce = read('src/server/commerce.ts');
  const routes = read('src/server/platformRoutes.ts');
  const sqlite = read('src/server/db.ts');
  const postgres = read('src/server/postgresRepo.ts');
  assert.match(commerce, /propertyType: payload\.propertyType \|\| ''/);
  assert.match(commerce, /const payload = \{ \.\.\.listing, \.\.\.patch \}/);
  assert.match(commerce, /input\.propertyType/);
  assert.doesNotMatch(commerce, /propertyType:\s*['"]Flats \/ Apartments['"]/);
  assert.match(routes, /body\.property_type \|\| body\.propertyType \|\| ''/);
  assert.match(sqlite, /lead\.property_type \|\| lead\.propertyType \|\| 'Residential Plot \/ Villa'/);
  assert.match(postgres, /lead\.property_type \|\| lead\.propertyType \|\| 'Residential Plot \/ Villa'/);
  assert.doesNotMatch(read('src/shared/propertyCategories.ts'), /UPDATE\s+|DROP\s+TABLE|DELETE\s+FROM/i);
  assert.equal(schemaSqlIsNonDestructive(POSTGRES_ADDITIVE_SQL), true);
  assert.doesNotMatch(POSTGRES_ADDITIVE_SQL, /UPDATE\s+(property_listings|buyer_leads)|DROP\s+TABLE/i);

  const mock = read('src/data/mockData.ts');
  assert.match(mock, /propertyType: 'Sky Villa'/);
  assert.match(mock, /propertyType: 'Sky Villa \/ Penthouse'/);
  assert.match(mock, /propertyType: 'Luxury High-Rise \(4 BHK\)'/);
  assert.match(mock, /propertyType: '3\.5 BHK High-Rise'/);

  const detail = read('src/components/properties/PropertyDetailModal.tsx');
  assert.match(detail, /displayPropertyType\(property\.propertyType\)/);
  assert.doesNotMatch(detail, /Sky Villa/);
});
