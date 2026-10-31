import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isPlatformAdmin, isPropertySeeker, isProfessionalRole } from '../../shared/policy';
import { linkedEndUserNavigation, roleUtilityDestinations } from '../../shared/endUserNavigation';
import { BrandLogo } from './BrandLogo';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  Wallet,
  LogIn,
  LayoutDashboard,
  KeyRound,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  Menu,
  X,
  Users,
  Briefcase,
  Terminal,
  Building,
  Compass,
  Landmark,
  Handshake,
  TrendingUp,
  Award,
  Video
} from 'lucide-react';

interface HeaderProps {
  onOpenProfileModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSupport?: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <span title="Super Admin"><ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" /></span>;
    case 'DEVELOPER':
      return <span title="Platform Developer"><Terminal className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>;
    case 'PROPERTY_SEEKER':
      return <span title="Property Seeker"><Compass className="w-3.5 h-3.5 text-blue-600 shrink-0" /></span>;
    case 'PROPERTY_ADMIN':
      return <span title="Property Admin"><Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" /></span>;
    case 'LANDOWNER':
    case 'LAND_OWNER':
      return <span title="Verified Landowner"><Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>;
    case 'CHANNEL_PARTNER':
      return <span title="Channel Partner"><Handshake className="w-3.5 h-3.5 text-teal-600 shrink-0" /></span>;
    case 'RESELLER':
      return <span title="Strategic Reseller"><TrendingUp className="w-3.5 h-3.5 text-cyan-600 shrink-0" /></span>;
    case 'RERA_AGENT':
      return <span title="RERA Agent"><Award className="w-3.5 h-3.5 text-amber-600 shrink-0" /></span>;
    case 'REAL_ESTATE_MEDIA':
    case 'CONTENT_CREATOR':
      return <span title="Real Estate Media"><Video className="w-3.5 h-3.5 text-rose-600 shrink-0" /></span>;
    case 'AGENT':
      return <span title="Verified Agent"><Briefcase className="w-3.5 h-3.5 text-violet-600 shrink-0" /></span>;
    default:
      return <span title={role}><Users className="w-3.5 h-3.5 text-slate-600 shrink-0" /></span>;
  }
};

export const Header: React.FC<HeaderProps> = ({
  onOpenProfileModal,
  onOpenWalletModal,
  onOpenLoginModal,
  onOpenSupport
}) => {
  const {
    activeView,
    setActiveView,
    currentUser,
    walletBalance,
    isLoggedIn
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = linkedEndUserNavigation();
  const utilityLinks = roleUtilityDestinations(currentUser.role, isLoggedIn);

  // Derive concise display label (cleans podcast references, trims long stakeholder phrases and brand suffixes)
  const getDisplayLabel = (label: string, view?: string) => {
    if (view === 'MEDIA') return 'Media Studio';
    return label.split(' — ')[0].replace(/\s+Property\s+Studio$/, '');
  };

  // Compact label for constrained desktop viewports (< 1920px), full label for wide 1080p+ viewports
  const getCompactLabel = (view: string, fullLabel: string) => {
    switch (view) {
      case 'MEDIA': return 'Media';
      case 'MARKET_INSIGHTS': return 'Trends';
      case 'REVIEWS': return 'Reviews';
      case 'COMMUNITY': return 'Community';
      case 'CONFERENCE': return 'Live';
      case 'REQUIREMENT': return 'Requirements';
      case 'CHAT': return 'Contact';
      default: return fullLabel;
    }
  };

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Close mobile drawer on view change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
      {/* Executive Tagline & Production Secretariat Bar */}
      <div className="bg-slate-900 text-white px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] font-medium tracking-wide flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-amber-400 font-bold tracking-wider">PROPERTY STUDIO</span>
          <span className="text-slate-400" aria-hidden="true">|</span>
          <span className="text-slate-300 tracking-widest text-[10px] uppercase font-semibold">
            REAL ESTATE · VISUAL STORIES · MARKET TRENDS & INSIGHTS
          </span>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          <div className="text-[11px] font-mono text-slate-400 hidden md:block">
            Secretariat: <span className="text-slate-200 font-semibold">info@propertystudio.org</span>
          </div>

          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="text-amber-400 hover:text-amber-300 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support Desk</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar: Desktop 3-Zone & Responsive Shell */}
      <div className="w-full px-4 sm:px-6 lg:px-8 min-h-20 flex items-center justify-between gap-3 xl:gap-4">
        {/* Zone 1: Brand & Logo (Left) */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              setActiveView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-left group flex items-center focus:outline-none cursor-pointer"
            aria-label="Property Studio home"
          >
            <BrandLogo variant="compact" size="sm" className="min-[1680px]:hidden" />
            <BrandLogo variant="compact" size="md" className="hidden min-[1680px]:block" />
          </button>
        </div>

        {/* Zone 2: Navigation Links (Desktop - Left-aligned, directly following Logo) */}
        <nav
          aria-label="Primary navigation"
          className="hidden xl:flex items-center justify-start gap-1 min-[1680px]:gap-1.5 text-xs font-semibold text-slate-600 whitespace-nowrap ml-2 xl:ml-3 min-[1680px]:ml-5 shrink-0"
        >
          {navLinks.map(link => {
            const isActive = activeView === link.view;
            const displayLabel = getDisplayLabel(link.label, link.view);
            return (
              <button
                key={link.view}
                onClick={() => {
                  if (link.view === 'COMMUNITY' && !isLoggedIn) {
                    onOpenLoginModal();
                    return;
                  }
                  setActiveView(link.view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`px-1.5 min-[1680px]:px-2.5 py-1.5 rounded-lg transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'text-amber-900 bg-amber-500/10 font-bold border-b-2 border-amber-600'
                    : 'hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                <span className="min-[1920px]:hidden">{getCompactLabel(link.view, displayLabel)}</span>
                <span className="hidden min-[1920px]:inline">{displayLabel}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Actions & Controls (Right) */}
        <div className="flex items-center gap-1.5 xl:gap-2.5 shrink-0 ml-auto">
          {utilityLinks.includes('LEADS_MARKET') && (
            <button
              onClick={() => {
                setActiveView('LEADS_MARKET');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                activeView === 'LEADS_MARKET'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
              title="Buyer Leads"
            >
              <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap font-bold">
                <span className="hidden min-[1680px]:inline">Buyer Leads</span>
                <span className="min-[1680px]:hidden">Leads</span>
              </span>
            </button>
          )}

          {utilityLinks.includes('PROFESSIONAL') && (
            <button
              onClick={() => {
                setActiveView('PROFESSIONAL');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                activeView === 'PROFESSIONAL'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
              title="Workspace"
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap font-bold">Workspace</span>
            </button>
          )}

          {/* Admin / Developer Console direct button */}
          {isLoggedIn && currentUser.role === 'DEVELOPER' && (
            <button
              onClick={() => {
                setActiveView('DEVELOPER');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                activeView === 'DEVELOPER'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
              title="Developer Diagnostics"
            >
              <Terminal className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span className="whitespace-nowrap font-bold">Diagnostics</span>
            </button>
          )}

          {isLoggedIn && isPlatformAdmin(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('ADMIN');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                activeView === 'ADMIN'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
              title={currentUser.role === 'DEVELOPER' ? 'Platform Owner Console' : 'Super Admin Console'}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="whitespace-nowrap font-bold">
                <span className="min-[1680px]:hidden">Admin Console</span>
                <span className="hidden min-[1680px]:inline">
                  {currentUser.role === 'DEVELOPER' ? 'Platform Owner Console' : 'Super Admin Console'}
                </span>
              </span>
            </button>
          )}

          {/* PMO Workspace direct button for property admins */}
          {isLoggedIn && currentUser.role === 'PROPERTY_ADMIN' && (
            <button
              onClick={() => {
                setActiveView('PROPERTY_ADMIN');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 shadow-xs ${
                activeView === 'PROPERTY_ADMIN'
                  ? 'bg-indigo-900 text-white border-indigo-900 shadow-sm'
                  : 'bg-indigo-50 text-indigo-900 border-indigo-300 hover:bg-indigo-100'
              }`}
              title="PMO Workspace"
            >
              <Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="whitespace-nowrap font-bold">PMO Workspace</span>
            </button>
          )}

          {/* Member Dashboard direct button for property seekers */}
          {isLoggedIn && isPropertySeeker(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('DASHBOARD');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 ${
                activeView === 'DASHBOARD'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="whitespace-nowrap font-bold">Dashboard</span>
            </button>
          )}

          {/* Professional direct button for partner roles */}
          {isLoggedIn && isProfessionalRole(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('PROFESSIONAL');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer shrink-0 shadow-xs ${
                activeView === 'PROFESSIONAL'
                  ? 'bg-violet-900 text-white border-violet-900 shadow-sm'
                  : 'bg-violet-50 text-violet-900 border-violet-300 hover:bg-violet-100'
              }`}
              title="Professional Workspace"
            >
              <Briefcase className="w-3.5 h-3.5 text-violet-600 shrink-0" />
              <span className="whitespace-nowrap font-bold">Pro Workspace</span>
            </button>
          )}

          {/* Wallet credit balance button (only if logged in) */}
          {isLoggedIn ? (
            <button
              onClick={onOpenWalletModal}
              className="flex items-center gap-1.5 px-2.5 xl:px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-mono-numbers">₹{walletBalance.toLocaleString('en-IN')}</span>
            </button>
          ) : null}

          {/* User Sign In / Profile Control Panel */}
          {!isLoggedIn ? (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 px-3 xl:px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Login / Sign Up</span>
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2 px-2.5 xl:px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs transition-colors shadow-sm cursor-pointer shrink-0"
              title="Open Profile Control Panel & Password Settings"
            >
              <img
                src={getSafeAvatar(currentUser.avatar)}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              {getRoleIcon(currentUser.role)}
              <div className="text-left hidden min-[1680px]:block">
                <span className="text-[11px] font-bold text-slate-900 block leading-tight truncate max-w-[90px]">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-semibold block leading-none">
                  {currentUser.role.replace(/_/g, ' ')}
                </span>
              </div>
              <KeyRound className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            </button>
          )}

          {/* Mobile & Tablet Collapsible Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="xl:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-all cursor-pointer shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tablet & Mobile Collapsible Menu Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="xl:hidden border-t border-slate-200 bg-white shadow-2xl px-4 py-5 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-120px)] overflow-y-auto"
        >
          <div className="space-y-5">
            {isLoggedIn && currentUser && (
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={getSafeAvatar(currentUser.avatar)}
                    alt={currentUser.name}
                    className="w-9 h-9 rounded-full object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">{currentUser.name}</span>
                      {getRoleIcon(currentUser.role)}
                    </div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold font-mono">
                      {currentUser.role.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenProfileModal();
                  }}
                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3 h-3 text-amber-700" />
                  <span>Security</span>
                </button>
              </div>
            )}
            <div>
              <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest block mb-2">
                Platform Navigation
              </span>
              <div className="flex flex-col gap-1">
                {navLinks.map(link => {
                  const isActive = activeView === link.view;
                  return (
                    <button
                      key={link.view}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        if (link.view === 'COMMUNITY' && !isLoggedIn) {
                          onOpenLoginModal();
                          return;
                        }
                        setActiveView(link.view);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-amber-50 text-amber-900 font-bold border-l-4 border-amber-600'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{getDisplayLabel(link.label, link.view)}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Workspaces & Consoles */}
            {(utilityLinks.length > 0 || (isLoggedIn && isPropertySeeker(currentUser.role)) || (isLoggedIn && currentUser.role === 'DEVELOPER') || (isLoggedIn && isPlatformAdmin(currentUser.role))) && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Workspaces & Consoles
                </span>
                <div className="flex flex-wrap gap-x-2.5 gap-y-2">
                  {isLoggedIn && isPropertySeeker(currentUser.role) && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveView('DASHBOARD');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-blue-400" />
                      <span>Member Dashboard</span>
                    </button>
                  )}
                  {utilityLinks.includes('LEADS_MARKET') && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveView('LEADS_MARKET');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Building className="w-3.5 h-3.5 text-slate-600" />
                      <span>Buyer Leads</span>
                    </button>
                  )}
                  {utilityLinks.includes('PROFESSIONAL') && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveView('PROFESSIONAL');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-violet-600" />
                      <span>Workspace</span>
                    </button>
                  )}
                  {isLoggedIn && isPlatformAdmin(currentUser.role) && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setActiveView('ADMIN');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>{currentUser.role === 'DEVELOPER' ? 'Platform Owner Console' : 'Super Admin Console'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Support Desk trigger inside drawer */}
            {onOpenSupport && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenSupport();
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  <span>Support Desk</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
