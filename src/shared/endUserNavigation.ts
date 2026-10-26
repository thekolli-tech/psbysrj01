import type { ViewType } from '../types';
import { isProfessionalRole, isPropertySeeker } from './policy';

export type EndUserNavItem = {
  key: string;
  label: string;
  view: ViewType | null;
  unavailableReason: string | null;
};

/**
 * Client navigation order. A null view is reported and is not rendered as a link.
 * Review & Rating opens project reviews. Property Requirement is a seeker submission,
 * separate from the professional Buyer Leads marketplace.
 * Live & Latest opens the existing conference view.
 * Contact & Connect opens the existing secretariat page, not the property-admin application.
 */
export const REQUESTED_END_USER_NAV: EndUserNavItem[] = [
  { key: 'overview', label: 'Overview', view: 'HOME', unavailableReason: null },
  { key: 'media', label: 'Media & Podcast', view: 'MEDIA', unavailableReason: null },
  { key: 'trends', label: 'Market Trends & Insights', view: 'MARKET_INSIGHTS', unavailableReason: null },
  {
    key: 'reviews',
    label: 'Review & Rating — All Stakeholders and Projects',
    view: 'REVIEWS',
    unavailableReason: null
  },
  { key: 'community', label: 'Community Q&A', view: 'COMMUNITY', unavailableReason: null },
  { key: 'live', label: 'Live & Latest', view: 'CONFERENCE', unavailableReason: null },
  {
    key: 'requirement',
    label: 'Property Requirement',
    view: 'REQUIREMENT',
    unavailableReason: null
  },
  { key: 'contact', label: 'Contact & Connect Property Studio', view: 'CHAT', unavailableReason: null }
];

export function linkedEndUserNavigation(): Array<EndUserNavItem & { view: ViewType }> {
  return REQUESTED_END_USER_NAV.filter((item): item is EndUserNavItem & { view: ViewType } => item.view !== null);
}

export function unavailableEndUserNavigation(): EndUserNavItem[] {
  return REQUESTED_END_USER_NAV.filter(item => item.view === null);
}

/** Existing role entry points. These sit outside the eight-item end-user list. */
export function roleUtilityDestinations(
  role: string | null | undefined,
  isLoggedIn: boolean
): Array<'LEADS_MARKET' | 'PROFESSIONAL'> {
  if (!isLoggedIn || isPropertySeeker(role)) return [];
  const links: Array<'LEADS_MARKET' | 'PROFESSIONAL'> = ['LEADS_MARKET'];
  if (isProfessionalRole(role)) links.push('PROFESSIONAL');
  return links;
}
