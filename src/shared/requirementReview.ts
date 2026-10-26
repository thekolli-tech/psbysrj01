import { isCatalogPropertyType } from './propertyCategories.ts';

export const REQUIREMENT_LOCATION_MAX = 80;
export const REQUIREMENT_BUDGET_MAX = 40;
export const REQUIREMENT_DETAILS_MAX = 500;
export const REVIEW_BODY_MAX = 500;
export const REVIEW_ENTITY_LISTING = 'LISTING';

export type RequirementInput = {
  propertyType: string;
  location: string | null;
  budget: string | null;
  details: string | null;
};

export type ReviewInput = {
  entityType: typeof REVIEW_ENTITY_LISTING;
  entityId: string;
  rating: number;
  body: string;
};

function cleanText(input: unknown, label: string, max: number, required: boolean): { value: string | null } | { error: string } {
  if (input == null || input === '') return required ? { error: `${label} is required.` } : { value: null };
  if (typeof input !== 'string') return { error: `${label} must be text.` };
  const normalized = input.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return required ? { error: `${label} is required.` } : { value: null };
  if (/[<>]/.test(normalized)) return { error: `${label} cannot include HTML.` };
  if (normalized.length > max) return { error: `${label} must be ${max} characters or fewer.` };
  return { value: normalized };
}

export function readRequirementInput(body: unknown): RequirementInput | { error: string } {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const propertyType = typeof record.propertyType === 'string' ? record.propertyType.trim() : '';
  if (!isCatalogPropertyType(propertyType)) {
    return { error: 'Choose a property type from the catalog.' };
  }
  const location = cleanText(record.location, 'Location', REQUIREMENT_LOCATION_MAX, false);
  if ('error' in location) return location;
  const budget = cleanText(record.budget, 'Budget', REQUIREMENT_BUDGET_MAX, false);
  if ('error' in budget) return budget;
  const details = cleanText(record.details, 'Details', REQUIREMENT_DETAILS_MAX, false);
  if ('error' in details) return details;
  return {
    propertyType,
    location: location.value,
    budget: budget.value,
    details: details.value
  };
}

export function readReviewInput(body: unknown): ReviewInput | { error: string } {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  if (record.entityType !== REVIEW_ENTITY_LISTING) {
    return { error: 'Only an approved project can be reviewed.' };
  }
  const entityId = typeof record.entityId === 'string' ? record.entityId.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(entityId)) return { error: 'Project id is not valid.' };
  if (typeof record.rating !== 'number' || !Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
    return { error: 'Rating must be a whole number from 1 to 5.' };
  }
  const bodyText = cleanText(record.body, 'Review', REVIEW_BODY_MAX, true);
  if ('error' in bodyText || !bodyText.value) return 'error' in bodyText ? bodyText : { error: 'Review is required.' };
  return {
    entityType: REVIEW_ENTITY_LISTING,
    entityId,
    rating: record.rating,
    body: bodyText.value
  };
}

export function readReviewEdit(body: unknown): { rating: number; body: string } | { error: string } {
  const record = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  if (typeof record.rating !== 'number' || !Number.isInteger(record.rating) || record.rating < 1 || record.rating > 5) {
    return { error: 'Rating must be a whole number from 1 to 5.' };
  }
  const bodyText = cleanText(record.body, 'Review', REVIEW_BODY_MAX, true);
  if ('error' in bodyText || !bodyText.value) return 'error' in bodyText ? bodyText : { error: 'Review is required.' };
  return { rating: record.rating, body: bodyText.value };
}
