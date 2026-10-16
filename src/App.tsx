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
import { SuperAdminDashboard } from './components/admin/SuperAdminDashboard';
import { DeveloperDashboard } from './components/admin/DeveloperDashboard';
import { ProfessionalDashboard } from './components/admin/ProfessionalDashboard';
import { PropertyAdminDashboard } from './components/admin/PropertyAdminDashboard';
import { canAccessProfessionalSurface, isPropertySeeker } from './shared/policy';
import { StudioBroadcastView } from './components/studio/StudioBroadcastView';
import { ContactPropertyAdmin } from './components/contact/ContactPropertyAdmin';
import { PropertyStudioSupportDesk } from './components/support/PropertyStudioSupportDesk';
import { SupportDeskButton } from './components/support/SupportDeskButton';
import { AuthRequiredCard } from './components/common/AuthRequiredCard';
import { BrandLogo } from './components/common/BrandLogo';
import { Property } from './types';
import { ShieldAlert, Building, LifeBuoy, ArrowRight, Lock, Phone, Mail, ShieldCheck, ExternalLink } from 'lucide-react';

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

  // If STUDIO_IFP mode or activeView is STUDIO, render Studio Broadcast View
  if (deviceMode === 'STUDIO_IFP' || activeView === 'STUDIO') {
    return (
      <div className="studio-ifp-mode min-h-screen">
        <StudioBroadcastView />
        <Toast />
      </div>
    );
  }

  const isForcedMobile = deviceMode === 'MOBILE_APK';
  const isForcedDesktop = deviceMode === 'DESKTOP';

  return (
    <div
      className={`min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans ${
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
          <CommunityForumView onOpenLoginModal={() => setLoginModalOpen(true)} />
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
                Connect directly with the Property Studio secretariat under the leadership of CEO Swamy Reddy Javidi (TG RERA: A02200004078). Inquire regarding project regulatory compliance, anonymous buyer submissions, or developer community spaces.
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
                href="tel:+919849012890"
                className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-2xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-colors"
              >
                <Phone className="w-4 h-4 text-emerald-600" />
                <span>Call +91 98490 12890</span>
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
        <MobileBottomNav onOpenSupport={() => setSupportOpen(true)} />
      </div>

      {/* Production Footer (Overview View) */}
      <footer className="bg-white border-t border-slate-200 py-10 px-4 sm:px-6 lg:px-8 mt-auto">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-3">
              <BrandLogo variant="compact" size="xl" />
              <p className="text-[11px] text-slate-500 mt-1">
                Official Secretariat: <a href="mailto:info@propertystudio.org" className="text-amber-700 font-mono font-bold hover:underline">info@propertystudio.org</a> · Western Corridor Financial District, Hyderabad
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-5 text-xs text-slate-600 font-medium">
              <button onClick={() => { setActiveView('PROPERTIES'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                Projects
              </button>
              {isLoggedIn && (
                <>
                  <button onClick={() => { setActiveView('LEADS_MARKET'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                    Buyer Leads
                  </button>
                  <button onClick={() => { setActiveView('MEDIA'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                    Media & Podcasts
                  </button>
                  <button onClick={() => { setActiveView('CONFERENCE'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                    Live Summit
                  </button>
                </>
              )}
              <button onClick={() => { setActiveView('MARKET_INSIGHTS'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                Market Trends
              </button>
              {isLoggedIn && (
                <button onClick={() => { setActiveView('COMMUNITY'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="hover:text-slate-900 cursor-pointer">
                  Community Q&A
                </button>
              )}
              <button
                onClick={() => setSupportOpen(true)}
                className="text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Support Desk</span>
              </button>
              <button
                onClick={() => {
                  setActiveView('STUDIO');
                }}
                className="text-slate-900 font-bold hover:underline cursor-pointer"
              >
                86" Studio IFP
              </button>
            </div>
          </div>

          {/* PROPERTY STUDIO SOCIAL MEDIA LINKS */}
          <div className="mt-8 pt-6 border-t border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block">
                  VERIFIED CHANNELS & BROADCAST PLATFORMS
                </span>
                <h4 className="text-xs sm:text-sm font-black text-slate-900 font-display">
                  PROPERTY STUDIO SOCIAL MEDIA LINKS
                </h4>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Follow CEO Swamy Reddy Javidi for real-time market telemetry & video audits
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp Channel */}
              <a
                href="https://whatsapp.com/channel/0029VbDqFrPATRSnJ2S9x10t"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 font-bold flex items-center justify-center shrink-0">
                    WA
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-emerald-700 leading-tight">
                      WhatsApp Channel
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Broadcast Alerts
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 shrink-0" />
              </a>

              {/* YouTube Link */}
              <a
                href="https://www.youtube.com/@PropertyStudio-SwamyReddyJavid"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-red-500 hover:bg-red-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-red-500/10 text-red-600 font-bold flex items-center justify-center shrink-0">
                    YT
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-red-700 leading-tight">
                      YouTube Studio
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      @PropertyStudio-SRJ
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-red-600 shrink-0" />
              </a>

              {/* Instagram Link */}
              <a
                href="https://www.instagram.com/propertystudio_srj/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-pink-500 hover:bg-pink-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-pink-500/10 text-pink-600 font-bold flex items-center justify-center shrink-0">
                    IG
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-pink-700 leading-tight">
                      Instagram
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      @propertystudio_srj
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-pink-600 shrink-0" />
              </a>

              {/* LinkedIn Link */}
              <a
                href="https://www.linkedin.com/in/property-studio-73065743b/"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-blue-600 hover:bg-blue-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-700 font-bold flex items-center justify-center shrink-0">
                    IN
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-blue-700 leading-tight">
                      LinkedIn Network
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Corporate Dossier
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
              </a>

              {/* Facebook Profile Page */}
              <a
                href="https://www.facebook.com/profile.php?id=61594972378425"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    FB
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight">
                      Facebook Profile
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Founder Profile
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </a>

              {/* Facebook Business Page */}
              <a
                href="https://www.facebook.com/profile.php?id=61595090693424"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    FB
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight">
                      Facebook Business
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Official Page
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </a>

              {/* Facebook Group Page */}
              <a
                href="https://www.facebook.com/groups/1531521175686327"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-indigo-600 hover:bg-indigo-50/40 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-indigo-600/10 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                    GP
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-indigo-700 leading-tight">
                      Facebook Group
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      Community Group
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </a>

              {/* Twitter / X */}
              <a
                href="https://x.com/propertystudio"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 rounded-2xl border border-slate-200 hover:border-slate-900 hover:bg-slate-100 bg-white transition-all group flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-lg bg-slate-900/10 text-slate-900 font-bold flex items-center justify-center shrink-0 font-mono">
                    𝕏
                  </span>
                  <div>
                    <span className="font-bold text-slate-900 block group-hover:text-slate-950 leading-tight">
                      Twitter / 𝕏
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      @propertystudio
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 shrink-0" />
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 gap-4">
            <div>
              © 2026 Property Studio Media & Intelligence. All rights reserved.
            </div>
            <div className="flex items-center gap-3">
              <span>TG RERA: <strong className="text-slate-700 font-mono">A02200004078</strong></span>
              <span>·</span>
              <span>Udyam: <strong className="text-slate-700 font-mono">TS-02-283677</strong></span>
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
