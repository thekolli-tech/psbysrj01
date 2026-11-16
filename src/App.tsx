import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { RouterProvider } from './router/RouterContext';
import { Header } from './components/common/Header';
import { MobileHeader } from './components/common/MobileHeader';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { Toast } from './components/common/Toast';
import { LoginModal } from './components/common/LoginModal';
import { UniversalSearchModal } from './components/common/UniversalSearchModal';
import { AuthenticatedAppLayout } from './components/authenticated/AuthenticatedAppLayout';
import { HomeHero } from './components/home/HomeHero';
import { PropertyList } from './components/properties/PropertyList';
import { SupportDeskButton } from './components/support/SupportDeskButton';
import { CinematicIntro } from './components/common/CinematicIntro';
import { canAccessProfessionalSurface, isPropertySeeker } from './shared/policy';
import { COMPANY_CONTACT_DISPLAY, COMPANY_CONTACT_TEL, COMPANY_SUPPORT_WHATSAPP } from './shared/companyContact';
import { linkedEndUserNavigation, roleUtilityDestinations } from './shared/endUserNavigation';
import { isCommunityPostId } from './shared/communityEngagement';
import { prefetchView, prefetchAllViews } from './lib/prefetch';
import type { ViewType } from './types';

// Ultra-fast Code Splitting: Lazy-load non-critical views and modals
const LeadMarketplace = React.lazy(() => import('./components/leads/LeadMarketplace').then(m => ({ default: m.LeadMarketplace })));
const MediaEngine = React.lazy(() => import('./components/media/MediaEngine').then(m => ({ default: m.MediaEngine })));
const CorporateConferenceView = React.lazy(() => import('./components/conference/CorporateConference').then(m => ({ default: m.CorporateConferenceView })));
const MarketTrendsView = React.lazy(() => import('./components/trends/MarketTrendsView').then(m => ({ default: m.MarketTrendsView })));
const CommunityForumView = React.lazy(() => import('./components/community/CommunityForum').then(m => ({ default: m.CommunityForumView })));
const PropertyRequirementView = React.lazy(() => import('./components/requirements/PropertyRequirementView').then(m => ({ default: m.PropertyRequirementView })));
const ReviewRatingView = React.lazy(() => import('./components/reviews/ReviewRatingView').then(m => ({ default: m.ReviewRatingView })));
const SuperAdminDashboard = React.lazy(() => import('./components/admin/SuperAdminDashboard').then(m => ({ default: m.SuperAdminDashboard })));
const DeveloperDashboard = React.lazy(() => import('./components/admin/DeveloperDashboard').then(m => ({ default: m.DeveloperDashboard })));
const ProfessionalDashboard = React.lazy(() => import('./components/admin/ProfessionalDashboard').then(m => ({ default: m.ProfessionalDashboard })));
const PropertyAdminDashboard = React.lazy(() => import('./components/admin/PropertyAdminDashboard').then(m => ({ default: m.PropertyAdminDashboard })));
// import { UserDashboard } from './components/dashboard/UserDashboard';
const UserDashboard = React.lazy(() => import('./components/dashboard/UserDashboard').then(m => ({ default: m.UserDashboard })));
const StudioBroadcastView = React.lazy(() => import('./components/studio/StudioBroadcastView').then(m => ({ default: m.StudioBroadcastView })));
const ContactPropertyAdmin = React.lazy(() => import('./components/contact/ContactPropertyAdmin').then(m => ({ default: m.ContactPropertyAdmin })));
const PropertyStudioSupportDesk = React.lazy(() => import('./components/support/PropertyStudioSupportDesk').then(m => ({ default: m.PropertyStudioSupportDesk })));
const PrivacyPolicyView = React.lazy(() => import('./components/legal/PrivacyPolicyView').then(m => ({ default: m.PrivacyPolicyView })));
const TermsConditionsView = React.lazy(() => import('./components/legal/TermsConditionsView').then(m => ({ default: m.TermsConditionsView })));
const ProfileControlPanelModal = React.lazy(() => import('./components/common/ProfileControlPanelModal').then(m => ({ default: m.ProfileControlPanelModal })));
const WalletModal = React.lazy(() => import('./components/modals/WalletModal').then(m => ({ default: m.WalletModal })));
const AgentOnboardModal = React.lazy(() => import('./components/modals/AgentOnboardModal').then(m => ({ default: m.AgentOnboardModal })));
const ClaimProjectModal = React.lazy(() => import('./components/modals/ClaimProjectModal').then(m => ({ default: m.ClaimProjectModal })));
const ProfessionalDirectoryView = React.lazy(() => import('./components/network/ProfessionalDirectoryView').then(m => ({ default: m.ProfessionalDirectoryView })));
const PublicRedditHome = React.lazy(() => import('./components/home/PublicRedditHome').then(m => ({ default: m.PublicRedditHome })));
const ProgramsView = React.lazy(() => import('./components/programs/ProgramsView').then(m => ({ default: m.ProgramsView })));
const PSTestimonialsView = React.lazy(() => import('./components/testimonials/PSTestimonialsView').then(m => ({ default: m.PSTestimonialsView })));
const AboutUsView = React.lazy(() => import('./components/about/AboutUsView').then(m => ({ default: m.AboutUsView })));
const NotFoundPage = React.lazy(() => import('./components/common/NotFoundPage').then(m => ({ default: m.NotFoundPage })));
import { LeftSidebar } from './components/authenticated/LeftSidebar';

const ViewSkeleton: React.FC = () => (
  <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse space-y-6">
    <div className="h-8 bg-slate-200/80 rounded-xl w-48 sm:w-64" />
    <div className="h-4 bg-slate-200/60 rounded-lg w-full max-w-md" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <div className="h-56 bg-slate-100 rounded-3xl border border-slate-200/60" />
      <div className="h-56 bg-slate-100 rounded-3xl border border-slate-200/60" />
      <div className="h-56 bg-slate-100 rounded-3xl border border-slate-200/60" />
    </div>
  </div>
);
import { Youtube, Instagram, Linkedin, Facebook } from 'lucide-react';
import { AuthRequiredCard } from './components/common/AuthRequiredCard';
import { BrandLogo } from './components/common/BrandLogo';
import { Property } from './types';
import { ShieldAlert, Building, LifeBuoy, ArrowRight, Lock, Phone, Mail, ShieldCheck, ExternalLink, MapPin } from 'lucide-react';

const AppContent: React.FC = () => {
  const {
    currentUser,
    activeView,
    setActiveView,
    deviceMode,
    isLoggedIn,
    activeNav,
    navigateToNav,
    currentPath,
    routeParams,
    isNotFound,
    navigate
  } = useApp();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [claimTarget, setClaimTarget] = useState<Property | null>(null);
  const [replayIntro, setReplayIntro] = useState(false);

  // Universal Search keyboard shortcut (Ctrl+K, Cmd+K, or '/')
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchModalOpen(prev => !prev);
      } else if (e.key === '/' && !isInput && !searchModalOpen) {
        e.preventDefault();
        setSearchModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchModalOpen]);

  // Ultra-fast microsecond prefetch: warm all application views in the background for 0ms transitions
  React.useEffect(() => {
    prefetchAllViews();
  }, []);


  // Official Support Desk state
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportContext, setSupportContext] = useState<string | undefined>(undefined);

  // Remove scroller in APK version & standalone mobile modes
  React.useEffect(() => {
    const isMobileApk =
      deviceMode === 'MOBILE_APK' ||
      window.matchMedia('(display-mode: standalone)').matches ||
      window.location.search.includes('mode=apk') ||
      window.innerWidth <= 768;

    if (isMobileApk) {
      document.documentElement.classList.add('apk-mode', 'no-scrollbar');
      document.body.classList.add('apk-mode', 'no-scrollbar');
    } else {
      document.documentElement.classList.remove('apk-mode');
      document.body.classList.remove('apk-mode');
    }
  }, [deviceMode]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === '1' || params.get('auth') === 'register' || params.get('login') === '1') {
      setLoginModalOpen(true);
    }
  }, []);

  // If STUDIO_IFP mode or activeView is STUDIO, render Studio Broadcast View
  if (deviceMode === 'STUDIO_IFP' || activeView === 'STUDIO') {
    return (
      <div className="studio-broadcast-mode min-h-screen">
        <StudioBroadcastView />
        <Toast />
      </div>
    );
  }

  const isForcedMobile = deviceMode === 'MOBILE_APK';
  const isForcedDesktop = deviceMode === 'DESKTOP';

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans w-full ${
        isForcedMobile
          ? 'max-w-md mx-auto shadow-2xl border-x border-slate-300 min-h-dvh apk-mode no-scrollbar overflow-x-hidden'
          : 'overflow-x-hidden md:overflow-x-auto'
      }`}
    >
      {/* Dynamic Header: Mobile shell vs Desktop SaaS portal */}
      {isLoggedIn ? null : isForcedMobile ? (
        <MobileHeader
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onOpenLoginModal={() => setLoginModalOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
          onOpenSearchModal={() => setSearchModalOpen(true)}
        />
      ) : isForcedDesktop ? (
        <Header
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onOpenLoginModal={() => setLoginModalOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
          onOpenSearchModal={() => setSearchModalOpen(true)}
        />
      ) : (
        <>
          <div className="block md:hidden">
            <MobileHeader
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenLoginModal={() => setLoginModalOpen(true)}
              onOpenSupport={() => setSupportOpen(true)}
              onOpenSearchModal={() => setSearchModalOpen(true)}
            />
          </div>
          <div className="hidden md:block">
            <Header
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenLoginModal={() => setLoginModalOpen(true)}
              onOpenSupport={() => setSupportOpen(true)}
              onOpenSearchModal={() => setSearchModalOpen(true)}
            />
          </div>
        </>
      )}

      {/* Main View Router */}
      {isLoggedIn ? (
        <AuthenticatedAppLayout
          onOpenSupport={() => setSupportOpen(true)}
          onOpenWallet={() => setWalletModalOpen(true)}
        >
          <React.Suspense fallback={<ViewSkeleton />}>
            {activeView === 'HOME' && <UserDashboard initialMode="FEED" />}
            {activeView === 'DASHBOARD' && <UserDashboard initialMode="WORKSPACE" />}
            {activeView === 'COMMUNITY' && (
              <CommunityForumView
                onOpenLoginModal={() => setLoginModalOpen(true)}
                initialCommunityId={routeParams.communityId || null}
              />
            )}
            {activeView === 'PROFESSIONALS' && (
              <ProfessionalDirectoryView onOpenSupport={() => setSupportOpen(true)} />
            )}
            {activeView === 'PROPERTIES' && (
              <PropertyList onClaimProject={(prop) => setClaimTarget(prop)} />
            )}
            {activeView === 'LEADS_MARKET' && (
              (!isPropertySeeker(currentUser.role) || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER') ? (
                <LeadMarketplace onOpenWalletModal={() => setWalletModalOpen(true)} />
              ) : (
                <AuthRequiredCard view="LEADS_MARKET" onOpenLoginModal={() => setLoginModalOpen(true)} />
              )
            )}
            {activeView === 'MEDIA' && (
              <MediaEngine
                onOpenLoginModal={() => setLoginModalOpen(true)}
                onTriggerSupportWithContext={(ctx) => {
                  setSupportContext(ctx);
                  setSupportOpen(true);
                }}
              />
            )}
            {activeView === 'CONFERENCE' && (
              <CorporateConferenceView />
            )}
            {activeView === 'MARKET_INSIGHTS' && (
              <MarketTrendsView />
            )}
            {activeView === 'REVIEWS' && (
              <ReviewRatingView onOpenLoginModal={() => setLoginModalOpen(true)} />
            )}
            {activeView === 'REQUIREMENT' && (
              <PropertyRequirementView onOpenLoginModal={() => setLoginModalOpen(true)} />
            )}
            {activeView === 'PROGRAMS' && (
              <ProgramsView />
            )}
            {activeView === 'TESTIMONIALS' && (
              <PSTestimonialsView />
            )}
            {/* About Us view routing */}
            {activeView === 'ABOUT' && (
              <AboutUsView
                onNavigateHome={() => setActiveView('HOME')}
                onNavigateCommunity={() => setActiveView('COMMUNITY')}
                onNavigateProperties={() => setActiveView('PROPERTIES')}
                onOpenRegister={() => setLoginModalOpen(true)}
                onOpenLogin={() => setLoginModalOpen(true)}
              />
            )}
            {activeView === 'CHAT' && (
              <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-6">
                <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center mx-auto">
                  <LifeBuoy className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-black text-slate-900 font-display">
                    Official Secretariat & Support Desk
                  </h2>
                  <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Connect directly with the Property Studio secretariat under the leadership of CEO Swamy Reddy Javidi. Enquire regarding project regulatory compliance, anonymous buyer submissions, or developer community spaces.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <button
                    onClick={() => setSupportOpen(true)}
                    className="px-6 py-3.5 bg-[#B99A24] hover:bg-[#C8A932] text-[#111111] rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#111111]" />
                    <span>Launch Support Desk Drawer</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </button>
                  <a
                    href={COMPANY_CONTACT_TEL}
                    className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Phone className="w-4 h-4 text-emerald-600" />
                    <span>Call {COMPANY_CONTACT_DISPLAY}</span>
                  </a>
                  <a
                    href="mailto:info@propertystudio.org"
                    className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
                  >
                    <Mail className="w-4 h-4 text-blue-600" />
                    <span>info@propertystudio.org</span>
                  </a>
                </div>
              </div>
            )}
            {activeView === 'CONTACT' && (
              <ContactPropertyAdmin onOpenSupport={() => setSupportOpen(true)} />
            )}
            {activeView === 'PRIVACY' && (
              <PrivacyPolicyView />
            )}
            {activeView === 'TERMS' && (
              <TermsConditionsView />
            )}
            {activeView === 'DEVELOPER' && (
              currentUser.role === 'DEVELOPER' ? (
                <DeveloperDashboard />
              ) : (
                <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
                  <h2 className="text-xl font-bold text-slate-900">Developer access required</h2>
                </div>
              )
            )}
            {activeView === 'PROFESSIONAL' && (
              canAccessProfessionalSurface(currentUser.role) && !isPropertySeeker(currentUser.role) ? (
                <ProfessionalDashboard />
              ) : (
                <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">Professional access required</h2>
                  <p className="text-xs text-slate-600">Property seekers use project discovery. This workspace is not available for that role.</p>
                </div>
              )
            )}
            {activeView === 'ADMIN' && (
              (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER') ? (
                <SuperAdminDashboard />
              ) : (
                <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
                  <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-900 font-display">Administrator Access Required</h2>
                </div>
              )
            )}
            {activeView === 'PROPERTY_ADMIN' && (
              (currentUser.role === 'PROPERTY_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER') ? (
                <PropertyAdminDashboard />
              ) : (
                <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
                  <Building className="w-12 h-12 text-indigo-600 mx-auto" />
                  <h2 className="text-xl font-bold text-slate-900 font-display">Property Admin Scope Required</h2>
                </div>
              )
            )}
            {activeView === 'NOT_FOUND' && (
              <NotFoundPage />
            )}
          </React.Suspense>
        </AuthenticatedAppLayout>
      ) : (
        <main className="flex-1 pb-8">
          <React.Suspense fallback={<ViewSkeleton />}>
          {activeView === 'HOME' && (
            isLoggedIn ? (
              <UserDashboard initialMode="FEED" />
            ) : (
              <PublicRedditHome
                onOpenLoginModal={() => setLoginModalOpen(true)}
                onOpenSupport={() => setSupportOpen(true)}
                initialPostId={routeParams.discussionId || routeParams.questionId || null}
                initialCategory={currentPath === '/questions' ? 'Property Q&A' : currentPath === '/discussions' ? 'Property Discussions' : undefined}
              />
            )
          )}

        {activeView === 'DASHBOARD' && (
          isLoggedIn ? (
            <UserDashboard />
          ) : (
            <AuthRequiredCard view="DASHBOARD" onOpenLoginModal={() => setLoginModalOpen(true)} />
          )
        )}

        {activeView === 'PROPERTIES' && (
          <PropertyList onClaimProject={(prop) => setClaimTarget(prop)} />
        )}

        {/* Member-Gated Modules: only visible after login */}
        {activeView === 'LEADS_MARKET' && (
          isLoggedIn && !isPropertySeeker(currentUser.role) ? (
            <LeadMarketplace onOpenWalletModal={() => setWalletModalOpen(true)} />
          ) : (
            <AuthRequiredCard view="LEADS_MARKET" onOpenLoginModal={() => setLoginModalOpen(true)} />
          )
        )}

        {activeView === 'MEDIA' && (
          <MediaEngine
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onTriggerSupportWithContext={(ctx) => {
              setSupportContext(ctx);
              setSupportOpen(true);
            }}
          />
        )}

        {activeView === 'CONFERENCE' && (
          <CorporateConferenceView onOpenLoginModal={() => setLoginModalOpen(true)} />
        )}

        {activeView === 'MARKET_INSIGHTS' && (
          <MarketTrendsView />
        )}

        {activeView === 'COMMUNITY' && (
          <CommunityForumView
            onOpenLoginModal={() => setLoginModalOpen(true)}
            initialCommunityId={routeParams.communityId || null}
          />
        )}

        {activeView === 'REVIEWS' && (
          <ReviewRatingView onOpenLoginModal={() => setLoginModalOpen(true)} />
        )}

        {activeView === 'PROFESSIONALS' && (
          <ProfessionalDirectoryView onOpenSupport={() => setSupportOpen(true)} />
        )}

        {activeView === 'REQUIREMENT' && (
          <PropertyRequirementView onOpenLoginModal={() => setLoginModalOpen(true)} />
        )}

        {activeView === 'PROGRAMS' && (
          <ProgramsView />
        )}

        {activeView === 'TESTIMONIALS' && (
          <PSTestimonialsView />
        )}

        {activeView === 'ABOUT' && (
          <AboutUsView
            onNavigateHome={() => setActiveView('HOME')}
            onNavigateCommunity={() => setActiveView('COMMUNITY')}
            onNavigateProperties={() => setActiveView('PROPERTIES')}
            onOpenRegister={() => setLoginModalOpen(true)}
            onOpenLogin={() => setLoginModalOpen(true)}
          />
        )}

        {/* Official Secretariat & Support Desk View */}
        {activeView === 'CHAT' && (
          <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 text-amber-600 border border-amber-500/30 flex items-center justify-center mx-auto">
              <LifeBuoy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900 font-display">
                Official Secretariat & Support Desk
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                Connect directly with the Property Studio secretariat under the leadership of CEO Swamy Reddy Javidi. Enquire regarding project regulatory compliance, anonymous buyer submissions, or developer community spaces.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setSupportOpen(true)}
                className="px-6 py-3.5 bg-[#B99A24] hover:bg-[#C8A932] text-[#111111] rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs active:scale-95 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-[#111111]" />
                <span>Launch Support Desk Drawer</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>
              <a
                href={COMPANY_CONTACT_TEL}
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Call {COMPANY_CONTACT_DISPLAY}</span>
              </a>
              <a
                href="mailto:info@propertystudio.org"
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <Mail className="w-4 h-4 text-blue-600" />
                <span>info@propertystudio.org</span>
              </a>
            </div>
          </div>
        )}

        {activeView === 'CONTACT' && (
          <ContactPropertyAdmin onOpenSupport={() => setSupportOpen(true)} />
        )}

        {activeView === 'PRIVACY' && (
          <PrivacyPolicyView />
        )}

        {activeView === 'TERMS' && (
          <TermsConditionsView />
        )}

        {/* Super Admin & Developer Dashboard with Role Guard */}
        {activeView === 'DEVELOPER' && (
          currentUser.role === 'DEVELOPER' && isLoggedIn ? (
            <DeveloperDashboard />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center">
              <h2 className="text-xl font-bold text-slate-900">Developer access required</h2>
            </div>
          )
        )}

        {activeView === 'PROFESSIONAL' && (
          isLoggedIn && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER' || (canAccessProfessionalSurface(currentUser.role) && !isPropertySeeker(currentUser.role))) ? (
            <ProfessionalDashboard />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 text-center space-y-2">
              <h2 className="text-xl font-bold text-slate-900">Professional access required</h2>
              <p className="text-xs text-slate-600">Property seekers use project discovery. This workspace is not available for that role.</p>
            </div>
          )
        )}

        {activeView === 'ADMIN' && (
          (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER') && isLoggedIn ? (
            <SuperAdminDashboard />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
              <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900 font-display">Administrator Access Required</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                The Platform Management Console is strictly reserved for platform administrators and developers. Please sign in with privileged credentials to proceed.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sign In with Privileged Credentials</span>
                </button>
                <button
                  onClick={() => {
                    setActiveView('HOME');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Return to Overview
                </button>
              </div>
            </div>
          )
        )}

        {/* Property Admin Dashboard with Scoped Guard */}
        {activeView === 'PROPERTY_ADMIN' && (
          (currentUser.role === 'PROPERTY_ADMIN' || currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER') && isLoggedIn ? (
            <PropertyAdminDashboard />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-8 bg-white rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
              <Building className="w-12 h-12 text-indigo-600 mx-auto" />
              <h2 className="text-xl font-bold text-slate-900 font-display">Property Admin Scope Required</h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scoped PMO workspaces are strictly reserved for provisioned Property Admins assigned to individual developments. Self-registration is disabled.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setLoginModalOpen(true)}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Sign In with PMO Credentials</span>
                </button>
                <button
                  onClick={() => setSupportOpen(true)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Apply via Secretariat
                </button>
                <button
                  onClick={() => {
                    setActiveView('HOME');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
                >
                  Return to Overview
                </button>
              </div>
            </div>
          )
        )}
        {activeView === 'NOT_FOUND' && (
          <NotFoundPage />
        )}
      </React.Suspense>
      </main>
      )}

      {/* Mobile navigation is integrated directly into the sticky top MobileHeader drawer */}

      {/* Official Property Studio Support Desk Drawer & Floating Button */}
      <SupportDeskButton
        onClick={() => setSupportOpen(true)}
        isOpen={supportOpen}
      />

      {supportOpen && (
        <React.Suspense fallback={null}>
          <PropertyStudioSupportDesk
            isOpen={supportOpen}
            onClose={() => {
              setSupportOpen(false);
              setSupportContext(undefined);
            }}
            initialContext={supportContext}
          />
        </React.Suspense>
      )}

      {/* Global Modals & Notifications */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      <UniversalSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onOpenLoginModal={() => setLoginModalOpen(true)}
        onOpenSupport={() => setSupportOpen(true)}
      />

      {profileModalOpen && (
        <React.Suspense fallback={null}>
          <ProfileControlPanelModal
            isOpen={profileModalOpen}
            onClose={() => setProfileModalOpen(false)}
          />
        </React.Suspense>
      )}

      {walletModalOpen && (
        <React.Suspense fallback={null}>
          <WalletModal
            isOpen={walletModalOpen}
            onClose={() => setWalletModalOpen(false)}
          />
        </React.Suspense>
      )}

      {agentModalOpen && (
        <React.Suspense fallback={null}>
          <AgentOnboardModal
            isOpen={agentModalOpen}
            onClose={() => setAgentModalOpen(false)}
          />
        </React.Suspense>
      )}

      {claimTarget && (
        <React.Suspense fallback={null}>
          <ClaimProjectModal
            property={claimTarget}
            isOpen={!!claimTarget}
            onClose={() => setClaimTarget(null)}
          />
        </React.Suspense>
      )}

      {/* Cinematic Intro Animation */}
      <CinematicIntro
        forcePlay={replayIntro}
        onComplete={() => setReplayIntro(false)}
      />

      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <RouterProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </RouterProvider>
  );
}
