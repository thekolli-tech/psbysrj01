/**
 * Client property-type catalog.
 * New forms and filters offer these labels in this order.
 * Stored listing payload.propertyType and buyer_leads.property_type values
 * are kept and compared exactly. Legacy labels are not aliases of catalog labels.
 */

export const ALL_PROPERTY_TYPES = 'ALL';
export const SAVED_CATEGORY_GROUP = 'Saved categories';

export const PROPERTY_CATEGORY_GROUPS = [
  {
    label: 'Residential',
    options: [
      'Flats / Apartments',
      'Villa',
      'Independent House',
      'Builder Floor',
      'Residential Land / Plots',
      'Studio Apartments',
      'Farm House',
      'Penthouse'
    ]
  },
  {
    label: 'Commercial',
    options: [
      'Office Space',
      'Commercial Retail Shops',
      'Commercial Land / Plots',
      'Guest House',
      'Hotel & Restaurant',
      'Warehouse / Godown',
      'Retail Showrooms',
      'Business Center'
    ]
  },
  {
    label: 'Farm / Agricultural',
    options: ['Farm / Agricultural Land']
  },
  {
    label: 'Industrial',
    options: ['Industrial Land', 'Factory']
  }
] as const;

export type PropertyCategoryGroupLabel = (typeof PROPERTY_CATEGORY_GROUPS)[number]['label'];

export const PROPERTY_CATEGORY_LABELS: string[] = PROPERTY_CATEGORY_GROUPS.flatMap(group => [...group.options]);

export const DEFAULT_NEW_PROPERTY_TYPE = PROPERTY_CATEGORY_LABELS[0];

const CATALOG_LABELS = new Set(PROPERTY_CATEGORY_LABELS);

export type PropertyTypeChoice = {
  group: string;
  label: string;
  legacy: boolean;
};

export function isCatalogPropertyType(value: string | null | undefined): boolean {
  return CATALOG_LABELS.has(String(value ?? ''));
}

/** Identity. Callers must not replace a stored type with a catalog label. */
export function preservePropertyType(value: string | null | undefined): string {
  return value ?? '';
}

/** Visible label is the stored string. */
export function displayPropertyType(value: string | null | undefined): string {
  return preservePropertyType(value);
}

export function propertyTypeGroup(value: string | null | undefined): PropertyCategoryGroupLabel | null {
  const stored = preservePropertyType(value);
  for (const group of PROPERTY_CATEGORY_GROUPS) {
    if ((group.options as readonly string[]).includes(stored)) return group.label;
  }
  return null;
}

/**
 * Catalog options first, in client order, then stored values that are not in the catalog.
 * Legacy values keep their original spelling and first-seen order.
 */
export function propertyTypeChoices(storedValues: readonly (string | null | undefined)[]): PropertyTypeChoice[] {
  const choices: PropertyTypeChoice[] = PROPERTY_CATEGORY_GROUPS.flatMap(group =>
    group.options.map(label => ({ group: group.label, label, legacy: false }))
  );
  const seen = new Set<string>();
  for (const value of storedValues) {
    const label = preservePropertyType(value);
    if (!label || CATALOG_LABELS.has(label) || seen.has(label)) continue;
    seen.add(label);
    choices.push({ group: SAVED_CATEGORY_GROUP, label, legacy: true });
  }
  return choices;
}

export function matchesPropertyTypeFilter(stored: string | null | undefined, selected: string): boolean {
  if (selected === ALL_PROPERTY_TYPES) return true;
  return preservePropertyType(stored) === selected;
}

export function filterByPropertyType<T extends { propertyType?: string | null }>(
  records: readonly T[],
  selected: string
): T[] {
  return records.filter(record => matchesPropertyTypeFilter(record.propertyType, selected));
}
