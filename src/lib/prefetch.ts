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
    default:
      break;
  }
};
