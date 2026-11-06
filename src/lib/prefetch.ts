/**
 * Ultra-fast Route & Resource Prefetcher
 * Dynamically prefetches non-homepage view chunks on hover, touch, or browser idle
 * so that when the user clicks, the view renders with 0ms delay.
 */

const prefetchedSet = new Set<string>();

export const prefetchView = (view: string) => {
  if (prefetchedSet.has(view)) return;
  prefetchedSet.add(view);

  switch (view) {
    case 'MEDIA':
      import('../components/media/MediaEngine');
      break;
    case 'MARKET_INSIGHTS':
    case 'TRENDS':
      import('../components/trends/MarketTrendsView');
      break;
    case 'REVIEWS':
      import('../components/reviews/ReviewRatingView');
      break;
    case 'COMMUNITY':
      import('../components/community/CommunityForum');
      break;
    case 'CONFERENCE':
      import('../components/conference/CorporateConference');
      break;
    case 'REQUIREMENT':
      import('../components/requirements/PropertyRequirementView');
      break;
    case 'LEADS_MARKET':
      import('../components/leads/LeadMarketplace');
      break;
    case 'DASHBOARD':
      import('../components/dashboard/UserDashboard');
      break;
    case 'ADMIN':
      import('../components/admin/SuperAdminDashboard');
      break;
    case 'CONTACT':
      import('../components/contact/ContactPropertyAdmin');
      break;
    case 'STUDIO':
      import('../components/studio/StudioBroadcastView');
      break;
    case 'PROFESSIONAL':
      import('../components/admin/ProfessionalDashboard');
      break;
    case 'PROPERTY_ADMIN':
      import('../components/admin/PropertyAdminDashboard');
      break;
    case 'DEVELOPER':
      import('../components/admin/DeveloperDashboard');
      break;
    case 'PRIVACY':
      import('../components/legal/PrivacyPolicyView');
      break;
    case 'TERMS':
      import('../components/legal/TermsConditionsView');
      break;
    default:
      break;
  }
};

/** Eagerly prefetches all application views in the background for 0ms transitions */
export const prefetchAllViews = () => {
  const views = [
    'MEDIA',
    'MARKET_INSIGHTS',
    'REVIEWS',
    'COMMUNITY',
    'CONFERENCE',
    'REQUIREMENT',
    'LEADS_MARKET',
    'DASHBOARD',
    'CONTACT',
    'ADMIN',
    'STUDIO',
    'PROFESSIONAL',
    'DEVELOPER',
    'PROPERTY_ADMIN',
    'PRIVACY',
    'TERMS'
  ];
  const runner = () => {
    views.forEach((v, idx) => {
      setTimeout(() => prefetchView(v), idx * 25);
    });
  };
  if (typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runner);
    } else {
      setTimeout(runner, 50);
    }
  }
};
