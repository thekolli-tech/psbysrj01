import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Header } from './components/common/Header';
import { MobileHeader } from './components/common/MobileHeader';
import { MobileBottomNav } from './components/common/MobileBottomNav';
import { Toast } from './components/common/Toast';
import { ProfileControlPanelModal } from './components/common/ProfileControlPanelModal';
import { LoginModal } from './components/common/LoginModal';
import { WalletModal } from './components/modals/WalletModal';
import { AgentOnboardModal } from './components/modals/AgentOnboardModal';
import { ClaimProjectModal } from './components/modals/ClaimProjectModal';
import { HomeHero } from './components/home/HomeHero';
import { PropertyList } from './components/properties/PropertyList';
import { LeadMarketplace } from './components/leads/LeadMarketplace';
import { MediaEngine } from './components/media/MediaEngine';
import { CorporateConferenceView } from './components/conference/CorporateConference';
import { MarketTrendsView } from './components/trends/MarketTrendsView';
import { CommunityForumView } from './components/community/CommunityForum';
import { PropertyRequirementView } from './components/requirements/PropertyRequirementView';
import { ReviewRatingView } from './components/reviews/ReviewRatingView';
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { DeveloperDashboard } from './components/admin/DeveloperDashboard';
import { ProfessionalDashboard } from './components/admin/ProfessionalDashboard';
import { PropertyAdminDashboard } from './components/admin/PropertyAdminDashboard';
import { UserDashboard } from './components/dashboard/UserDashboard';
import { canAccessProfessionalSurface, isPropertySeeker } from './shared/policy';
import { COMPANY_CONTACT_DISPLAY, COMPANY_CONTACT_TEL, COMPANY_SUPPORT_WHATSAPP } from './shared/companyContact';
import { linkedEndUserNavigation, roleUtilityDestinations } from './shared/endUserNavigation';
import { isCommunityPostId } from './shared/communityEngagement';
import { StudioBroadcastView } from './components/studio/StudioBroadcastView';
import { ContactPropertyAdmin } from './components/contact/ContactPropertyAdmin';
import { PropertyStudioSupportDesk } from './components/support/PropertyStudioSupportDesk';
import { SupportDeskButton } from './components/support/SupportDeskButton';
import { PrivacyPolicyView } from './components/legal/PrivacyPolicyView';
import { TermsConditionsView } from './components/legal/TermsConditionsView';
import { Youtube, Instagram, Linkedin, Facebook, Users } from 'lucide-react';
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
    isLoggedIn
  } = useApp();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);
  const [claimTarget, setClaimTarget] = useState<Property | null>(null);

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
    const viewParam = params.get('view')?.toLowerCase();
    const postId = params.get('post') || '';
    if (viewParam === 'privacy') {
      setActiveView('PRIVACY');
    } else if (viewParam === 'terms') {
      setActiveView('TERMS');
    } else if (viewParam === 'community' || isCommunityPostId(postId)) {
      setActiveView('COMMUNITY');
    }
  }, [setActiveView]);

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
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans overflow-x-hidden w-full ${
        isForcedMobile
          ? 'max-w-md mx-auto shadow-2xl border-x border-slate-300 min-h-dvh apk-mode no-scrollbar overflow-x-hidden'
          : ''
      }`}
    >
      {/* Dynamic Header: Mobile shell vs Desktop SaaS portal */}
      {isForcedMobile ? (
        <MobileHeader
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onOpenLoginModal={() => setLoginModalOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
        />
      ) : isForcedDesktop ? (
        <Header
          onOpenProfileModal={() => setProfileModalOpen(true)}
          onOpenWalletModal={() => setWalletModalOpen(true)}
          onOpenLoginModal={() => setLoginModalOpen(true)}
          onOpenSupport={() => setSupportOpen(true)}
        />
      ) : (
        <>
          <div className="block md:hidden">
            <MobileHeader
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenLoginModal={() => setLoginModalOpen(true)}
              onOpenSupport={() => setSupportOpen(true)}
            />
          </div>
          <div className="hidden md:block">
            <Header
              onOpenProfileModal={() => setProfileModalOpen(true)}
              onOpenWalletModal={() => setWalletModalOpen(true)}
              onOpenLoginModal={() => setLoginModalOpen(true)}
              onOpenSupport={() => setSupportOpen(true)}
            />
          </div>
        </>
      )}

      {/* Main View Router */}
      <main className={`flex-1 ${isForcedMobile ? 'pb-20' : 'pb-16 md:pb-8'}`}>
        {activeView === 'HOME' && (
          <HomeHero
            onOpenRoleModal={() => setProfileModalOpen(true)}
            onOpenAgentModal={() => setAgentModalOpen(true)}
            onOpenLoginModal={() => setLoginModalOpen(true)}
            onOpenSupport={() => setSupportOpen(true)}
          />
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
          isLoggedIn ? (
            <MediaEngine
              onOpenLoginModal={() => setLoginModalOpen(true)}
              onTriggerSupportWithContext={(ctx) => {
                setSupportContext(ctx);
                setSupportOpen(true);
              }}
            />
          ) : (
            <AuthRequiredCard view="MEDIA" onOpenLoginModal={() => setLoginModalOpen(true)} />
          )
        )}

        {activeView === 'CONFERENCE' && (
          isLoggedIn ? (
            <CorporateConferenceView />
          ) : (
            <AuthRequiredCard view="CONFERENCE" onOpenLoginModal={() => setLoginModalOpen(true)} />
          )
        )}

        {activeView === 'MARKET_INSIGHTS' && (
          <MarketTrendsView />
        )}

        {activeView === 'COMMUNITY' && (
          isLoggedIn ? (
            <CommunityForumView onOpenLoginModal={() => setLoginModalOpen(true)} />
          ) : (
            <AuthRequiredCard view="COMMUNITY" onOpenLoginModal={() => setLoginModalOpen(true)} />
          )
        )}

        {activeView === 'REVIEWS' && (
          <ReviewRatingView onOpenLoginModal={() => setLoginModalOpen(true)} />
        )}

        {activeView === 'REQUIREMENT' && (
          <PropertyRequirementView onOpenLoginModal={() => setLoginModalOpen(true)} />
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
                Connect directly with the Property Studio secretariat under the leadership of CEO Swamy Reddy Javidi. Inquire regarding project regulatory compliance, anonymous buyer submissions, or developer community spaces.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => setSupportOpen(true)}
                className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xl shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4 text-amber-400" />
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
          <ContactPropertyAdmin />
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
          isLoggedIn && canAccessProfessionalSurface(currentUser.role) && !isPropertySeeker(currentUser.role) ? (
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
          currentUser.role === 'PROPERTY_ADMIN' && isLoggedIn ? (
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
      </main>

      {/* Mobile Bottom Navigation Dock */}
      <div className="block md:hidden">
        <MobileBottomNav onOpenLoginModal={() => setLoginModalOpen(true)} />
      </div>

      {/* Production Footer */}
      <footer className="bg-white border-t border-slate-200 py-12 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto">
          {/* Main 4-Column Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-10">
            {/* Column A: Logo, Mission Summary & Official Contact Details */}
            <div className="lg:col-span-4 space-y-4">
              <button
                onClick={() => {
                  setActiveView('HOME');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left cursor-pointer focus:outline-none"
                aria-label="Property Studio home"
              >
                <BrandLogo variant="compact" size="xl" />
              </button>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm">
                Next-generation PropTech intelligence, high-fidelity media productions, regulatory telemetry, and verified community ecosystem across Hyderabad&apos;s Western Corridor and beyond.
              </p>
              <div className="space-y-2 pt-1 text-xs text-slate-600">
                <a
                  href={COMPANY_CONTACT_TEL}
                  className="flex items-center gap-2 hover:text-amber-700 font-semibold transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>{COMPANY_CONTACT_DISPLAY}</span>
                </a>
                <a
                  href="mailto:info@propertystudio.org"
                  className="flex items-center gap-2 hover:text-amber-700 font-mono transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>info@propertystudio.org</span>
                </a>
                <div className="flex items-start gap-2 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>Secretariat · Western Corridor Financial District, Hyderabad</span>
                </div>
              </div>
            </div>

            {/* Column B: Main Platform Navigation */}
            <div className="lg:col-span-2 space-y-3">
              <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block">
                Platform
              </span>
              <nav className="flex flex-col space-y-2 text-xs text-slate-600 font-medium">
                {linkedEndUserNavigation().map(link => (
                  <button
                    key={link.key}
                    onClick={() => {
                      if (link.view === 'COMMUNITY' && !isLoggedIn) {
                        setLoginModalOpen(true);
                        return;
                      }
                      setActiveView(link.view);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ))}
                {roleUtilityDestinations(currentUser.role, isLoggedIn).includes('LEADS_MARKET') && (
                  <button
                    onClick={() => {
                      setActiveView('LEADS_MARKET');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Buyer Leads
                  </button>
                )}
                {roleUtilityDestinations(currentUser.role, isLoggedIn).includes('PROFESSIONAL') && (
                  <button
                    onClick={() => {
                      setActiveView('PROFESSIONAL');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Workspace
                  </button>
                )}
              </nav>
            </div>

            {/* Column C: Governance, Contact & Support */}
            <div className="lg:col-span-2 space-y-3">
              <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block">
                Governance & Support
              </span>
              <div className="flex flex-col space-y-2 text-xs text-slate-600 font-medium">
                <button
                  onClick={() => setSupportOpen(true)}
                  className="text-left text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1.5"
                >
                  <LifeBuoy className="w-3.5 h-3.5 text-amber-600" />
                  <span>Support Desk</span>
                </button>
                <a
                  href={COMPANY_SUPPORT_WHATSAPP}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-700 transition-colors"
                >
                  Direct WhatsApp Support
                </a>
                <button
                  onClick={() => {
                    setActiveView('CHAT');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Contact Secretariat
                </button>
                <button
                  onClick={() => {
                    setActiveView('CONTACT');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                >
                  PMO Application
                </button>
                <button
                  onClick={() => {
                    setActiveView('PRIVACY');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
                <button
                  onClick={() => {
                    setActiveView('TERMS');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="text-left hover:text-slate-900 transition-colors cursor-pointer"
                >
                  Terms & Conditions
                </button>
              </div>
            </div>

            {/* Column D: Verified Channels & Broadcast Platforms */}
            <div className="lg:col-span-4 space-y-3">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block">
                  VERIFIED CHANNELS & BROADCAST PLATFORMS
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 font-display">
                  PROPERTY STUDIO SOCIAL MEDIA LINKS
                </h4>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Follow CEO Swamy Reddy Javidi for real-time market telemetry & video audits
                </p>
              </div>

              {/* 8 Verified Social Media Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* WhatsApp Channel */}
                <a
                  href="https://whatsapp.com/channel/0029VbDqFrPATRSnJ2S9x10t"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.085-1.808-.4-.984-.407-1.616-1.396-1.666-1.46-.048-.067-.406-.54-.406-1.032 0-.493.258-.733.35-.833.093-.101.203-.127.271-.127.068 0 .135.001.194.004.062.003.146-.024.227.172.085.203.288.704.313.755.025.05.042.11.008.177-.034.067-.051.109-.101.168-.051.06-.107.133-.153.179-.051.05-.104.105-.045.206.06.101.265.438.568.708.391.349.72.457.822.508.102.051.161.042.22-.025.06-.068.254-.296.322-.397.068-.102.136-.085.229-.051.093.034.593.28.695.331.102.051.17.076.195.119.025.042.025.245-.119.65zM12 2C6.477 2 2 6.477 2 12c0 1.891.524 3.662 1.435 5.176L2 22l4.981-1.307A9.957 9.957 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
                      </svg>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-emerald-700 leading-tight truncate">
                        WhatsApp Channel
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        Broadcast Alerts
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 shrink-0 ml-1" />
                </a>

                {/* YouTube Link */}
                <a
                  href="https://www.youtube.com/@PropertyStudio-SwamyReddyJavid"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-red-500 hover:bg-red-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-red-50 text-red-600 border border-red-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Youtube className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-red-700 leading-tight truncate">
                        YouTube Studio
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        @PropertyStudio-SRJ
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-red-600 shrink-0 ml-1" />
                </a>

                {/* Instagram Link */}
                <a
                  href="https://www.instagram.com/propertystudio_srj/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-pink-500 hover:bg-pink-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-pink-50 text-pink-600 border border-pink-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Instagram className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-pink-700 leading-tight truncate">
                        Instagram
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        @propertystudio_srj
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-pink-600 shrink-0 ml-1" />
                </a>

                {/* LinkedIn Link */}
                <a
                  href="https://www.linkedin.com/in/property-studio-73065743b/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-blue-50 text-blue-700 border border-blue-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Linkedin className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-blue-700 leading-tight truncate">
                        LinkedIn Network
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        Corporate Dossier
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-blue-600 shrink-0 ml-1" />
                </a>

                {/* Facebook Profile Page */}
                <a
                  href="https://www.facebook.com/profile.php?id=61594972378425"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Facebook className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight truncate">
                        Facebook Profile
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        Founder Profile
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                </a>

                {/* Facebook Business Page */}
                <a
                  href="https://www.facebook.com/profile.php?id=61595090693424"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Facebook className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight truncate">
                        Facebook Business
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        Official Page
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                </a>

                {/* Facebook Group Page */}
                <a
                  href="https://www.facebook.com/groups/1531521175686327"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Users className="w-3.5 h-3.5" />
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight truncate">
                        Facebook Group
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        Community Group
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0 ml-1" />
                </a>

                {/* Twitter / X */}
                <a
                  href="https://x.com/propertystudio_"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-900 hover:bg-slate-100 bg-white transition-all group flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-900 border border-slate-300 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <svg className="w-3 h-3 fill-current" viewBox="0 0 24 24">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    </div>
                    <div className="truncate">
                      <span className="font-bold text-slate-900 block group-hover:text-slate-950 leading-tight truncate">
                        Twitter / 𝕏
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono truncate">
                        @propertystudio_
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-slate-900 shrink-0 ml-1" />
                </a>
              </div>
            </div>
          </div>

          {/* Sub-Footer Copyright & Inquiries */}
          <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
            <div>
              © 2026 Property Studio Media & Intelligence. All rights reserved.
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveView('PRIVACY');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-slate-900 underline cursor-pointer"
              >
                Privacy Policy
              </button>
              <span>·</span>
              <button
                onClick={() => {
                  setActiveView('TERMS');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="hover:text-slate-900 underline cursor-pointer"
              >
                Terms & Conditions
              </button>
              <span>·</span>
              <span>Inquiries: <span className="font-mono text-slate-700">info@propertystudio.org</span></span>
            </div>
          </div>
        </div>
      </footer>

      {/* Official Property Studio Support Desk Drawer & Floating Button */}
      <SupportDeskButton
        onClick={() => setSupportOpen(true)}
        isOpen={supportOpen}
      />

      <PropertyStudioSupportDesk
        isOpen={supportOpen}
        onClose={() => {
          setSupportOpen(false);
          setSupportContext(undefined);
        }}
        initialContext={supportContext}
      />

      {/* Global Modals & Notifications */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
      />

      <ProfileControlPanelModal
        isOpen={profileModalOpen}
        onClose={() => setProfileModalOpen(false)}
      />

      <WalletModal
        isOpen={walletModalOpen}
        onClose={() => setWalletModalOpen(false)}
      />

      <AgentOnboardModal
        isOpen={agentModalOpen}
        onClose={() => setAgentModalOpen(false)}
      />

      <ClaimProjectModal
        property={claimTarget}
        isOpen={!!claimTarget}
        onClose={() => setClaimTarget(null)}
      />

      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
