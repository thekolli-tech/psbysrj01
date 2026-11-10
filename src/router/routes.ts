import type { ViewType, NavItemKey } from '../types';

export interface RouteMatch {
  view: ViewType;
  path: string;
  navKey: NavItemKey;
  params: Record<string, string>;
  isNotFound?: boolean;
  protectedRole?: 'SUPER_ADMIN' | 'DEVELOPER' | 'PROPERTY_ADMIN' | 'AUTH_REQUIRED';
}

/**
 * Route definition table mapping URL paths to application views and metadata
 */
export const ROUTE_DEFINITIONS = [
  // Core routes
  { path: '/', view: 'HOME' as ViewType, navKey: 'HOME' as NavItemKey },
  { path: '/home', view: 'HOME' as ViewType, navKey: 'HOME' as NavItemKey },
  { path: '/properties', view: 'PROPERTIES' as ViewType, navKey: 'DISCOVER' as NavItemKey },
  { path: '/properties/:propertyId', view: 'PROPERTIES' as ViewType, navKey: 'DISCOVER' as NavItemKey },
  { path: '/communities', view: 'COMMUNITY' as ViewType, navKey: 'COMMUNITIES' as NavItemKey },
  { path: '/communities/:communityId', view: 'COMMUNITY' as ViewType, navKey: 'COMMUNITIES' as NavItemKey },
  { path: '/discussions', view: 'HOME' as ViewType, navKey: 'DISCUSSIONS' as NavItemKey },
  { path: '/discussions/:discussionId', view: 'HOME' as ViewType, navKey: 'DISCUSSIONS' as NavItemKey },
  { path: '/questions', view: 'HOME' as ViewType, navKey: 'COMMUNITY' as NavItemKey },
  { path: '/questions/:questionId', view: 'HOME' as ViewType, navKey: 'COMMUNITY' as NavItemKey },
  { path: '/insights', view: 'MARKET_INSIGHTS' as ViewType, navKey: 'MARKET_INSIGHTS' as NavItemKey },
  { path: '/property-insights', view: 'MARKET_INSIGHTS' as ViewType, navKey: 'MARKET_INSIGHTS' as NavItemKey },
  { path: '/trends', view: 'MARKET_INSIGHTS' as ViewType, navKey: 'MARKET_INSIGHTS' as NavItemKey },
  { path: '/market-trends', view: 'MARKET_INSIGHTS' as ViewType, navKey: 'MARKET_INSIGHTS' as NavItemKey },
  { path: '/media', view: 'MEDIA' as ViewType, navKey: 'MEDIA' as NavItemKey },
  { path: '/podcast', view: 'MEDIA' as ViewType, navKey: 'MEDIA' as NavItemKey },
  { path: '/live', view: 'CONFERENCE' as ViewType, navKey: 'CONFERENCE' as NavItemKey },
  { path: '/live-sessions', view: 'CONFERENCE' as ViewType, navKey: 'CONFERENCE' as NavItemKey },
  { path: '/live-latest', view: 'CONFERENCE' as ViewType, navKey: 'CONFERENCE' as NavItemKey },
  { path: '/requirements', view: 'REQUIREMENT' as ViewType, navKey: 'REQUIREMENT' as NavItemKey },
  { path: '/verified-developments', view: 'PROPERTIES' as ViewType, navKey: 'DISCOVER' as NavItemKey },
  { path: '/developers', view: 'PROFESSIONALS' as ViewType, navKey: 'DEVELOPERS' as NavItemKey },
  { path: '/network', view: 'PROFESSIONALS' as ViewType, navKey: 'FIND_PROFESSIONALS' as NavItemKey },
  { path: '/professionals', view: 'PROFESSIONALS' as ViewType, navKey: 'FIND_PROFESSIONALS' as NavItemKey },
  { path: '/saved', view: 'DASHBOARD' as ViewType, navKey: 'SAVED_ITEMS' as NavItemKey },
  { path: '/profile', view: 'DASHBOARD' as ViewType, navKey: 'MY_PROFILE' as NavItemKey },
  { path: '/about', view: 'ABOUT' as ViewType, navKey: 'ABOUT' as NavItemKey },
  { path: '/about-us', view: 'ABOUT' as ViewType, navKey: 'ABOUT' as NavItemKey },
  { path: '/reviews', view: 'REVIEWS' as ViewType, navKey: 'REVIEWS' as NavItemKey },
  { path: '/ratings', view: 'REVIEWS' as ViewType, navKey: 'REVIEWS' as NavItemKey },
  { path: '/programs', view: 'PROGRAMS' as ViewType, navKey: 'PROGRAMS' as NavItemKey },
  { path: '/testimonials', view: 'TESTIMONIALS' as ViewType, navKey: 'TESTIMONIALS' as NavItemKey },
  { path: '/contact', view: 'CONTACT' as ViewType, navKey: 'CONTACT' as NavItemKey },
  { path: '/privacy', view: 'PRIVACY' as ViewType, navKey: 'HOME' as NavItemKey },
  { path: '/terms', view: 'TERMS' as ViewType, navKey: 'HOME' as NavItemKey },
  { path: '/leads', view: 'LEADS_MARKET' as ViewType, navKey: 'LEADS_MARKET' as NavItemKey },
  { path: '/leads-marketplace', view: 'LEADS_MARKET' as ViewType, navKey: 'LEADS_MARKET' as NavItemKey },

  // Role-protected routes
  { path: '/admin', view: 'ADMIN' as ViewType, navKey: 'ADMIN' as NavItemKey, protectedRole: 'SUPER_ADMIN' as const },
  { path: '/admin-console', view: 'ADMIN' as ViewType, navKey: 'ADMIN' as NavItemKey, protectedRole: 'SUPER_ADMIN' as const },
  { path: '/developer', view: 'DEVELOPER' as ViewType, navKey: 'DEVELOPER' as NavItemKey, protectedRole: 'DEVELOPER' as const },
  { path: '/property-admin', view: 'PROPERTY_ADMIN' as ViewType, navKey: 'PROPERTY_ADMIN' as NavItemKey, protectedRole: 'PROPERTY_ADMIN' as const },
  { path: '/dashboard', view: 'DASHBOARD' as ViewType, navKey: 'DASHBOARD' as NavItemKey, protectedRole: 'AUTH_REQUIRED' as const }
];

/**
 * Matches a URL pathname against defined routes and extracts route parameters
 */
export function matchRoute(pathname: string): RouteMatch {
  // Normalize pathname: ensure leading slash and remove trailing slash (except root)
  let clean = pathname.trim();
  if (!clean.startsWith('/')) clean = '/' + clean;
  if (clean.length > 1 && clean.endsWith('/')) clean = clean.slice(0, -1);

  for (const def of ROUTE_DEFINITIONS) {
    const defParts = def.path.split('/');
    const cleanParts = clean.split('/');

    if (defParts.length !== cleanParts.length) continue;

    let matched = true;
    const params: Record<string, string> = {};

    for (let i = 0; i < defParts.length; i++) {
      const defPart = defParts[i];
      const cleanPart = cleanParts[i];

      if (defPart.startsWith(':')) {
        const paramName = defPart.slice(1);
        params[paramName] = decodeURIComponent(cleanPart);
      } else if (defPart.toLowerCase() !== cleanPart.toLowerCase()) {
        matched = false;
        break;
      }
    }

    if (matched) {
      return {
        view: def.view,
        path: clean,
        navKey: def.navKey,
        params,
        protectedRole: def.protectedRole
      };
    }
  }

  // Not found fallback
  return {
    view: 'NOT_FOUND' as any,
    path: clean,
    navKey: 'HOME',
    params: {},
    isNotFound: true
  };
}

/**
 * Resolves standard canonical URL for a given ViewType
 */
export function urlForView(view: ViewType, params?: Record<string, string>): string {
  switch (view) {
    case 'HOME':
      if (params?.discussionId) return `/discussions/${params.discussionId}`;
      if (params?.questionId) return `/questions/${params.questionId}`;
      return '/';
    case 'PROPERTIES':
      if (params?.propertyId) return `/properties/${params.propertyId}`;
      return '/properties';
    case 'COMMUNITY':
      if (params?.communityId && params.communityId !== 'ALL') return `/communities/${params.communityId}`;
      return '/communities';
    case 'MARKET_INSIGHTS':
      return '/insights';
    case 'MEDIA':
      return '/media';
    case 'CONFERENCE':
      return '/live';
    case 'REQUIREMENT':
      return '/requirements';
    case 'PROFESSIONALS':
      return '/network';
    case 'ABOUT':
      return '/about';
    case 'REVIEWS':
      return '/reviews';
    case 'PROGRAMS':
      return '/programs';
    case 'TESTIMONIALS':
      return '/testimonials';
    case 'CONTACT':
      return '/contact';
    case 'PRIVACY':
      return '/privacy';
    case 'TERMS':
      return '/terms';
    case 'LEADS_MARKET':
      return '/leads';
    case 'ADMIN':
      return '/admin';
    case 'DEVELOPER':
      return '/developer';
    case 'PROPERTY_ADMIN':
      return '/property-admin';
    case 'DASHBOARD':
      return '/dashboard';
    default:
      return '/';
  }
}
