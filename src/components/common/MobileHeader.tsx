import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import { BrandLogo } from './BrandLogo';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { linkedEndUserNavigation, roleUtilityDestinations } from '../../shared/endUserNavigation';
import { isPlatformAdmin, isPropertySeeker } from '../../shared/policy';
import {
  Wallet,
  LogIn,
  LayoutDashboard,
  ChevronLeft,
  ShieldAlert,
  Building,
  Users,
  Briefcase,
  Menu,
  X,
  HelpCircle,
  ShieldCheck,
  KeyRound,
  Terminal
} from 'lucide-react';

interface MobileHeaderProps {
  onOpenProfileModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLoginModal?: () => void;
  onOpenSupport?: () => void;
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return <span title="Super Admin"><ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" /></span>;
    case 'DEVELOPER':
      return <span title="Platform Developer"><Terminal className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>;
    case 'PROPERTY_SEEKER':
      return <span title="Property Seeker"><LayoutDashboard className="w-3.5 h-3.5 text-blue-600 shrink-0" /></span>;
    case 'PROPERTY_ADMIN':
      return <span title="Property Admin"><Building className="w-3.5 h-3.5 text-indigo-600 shrink-0" /></span>;
    case 'AGENT':
      return <span title="Verified Agent"><Briefcase className="w-3.5 h-3.5 text-violet-600 shrink-0" /></span>;
    default:
      return <span title={role}><Users className="w-3.5 h-3.5 text-slate-600 shrink-0" /></span>;
  }
};

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenProfileModal,
  onOpenWalletModal,
  onOpenLoginModal,
  onOpenSupport
}) => {
  const {
    currentUser,
    activeView,
    setActiveView,
    walletBalance,
    isLoggedIn
  } = useApp();

  const [menuOpen, setMenuOpen] = useState(false);
  const navLinks = linkedEndUserNavigation();
  const utilityLinks = roleUtilityDestinations(currentUser.role, isLoggedIn);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getTitle = (view: ViewType): string => {
    switch (view) {
      case 'HOME': return 'Property Studio';
      case 'DASHBOARD': return 'Member Dashboard';
      case 'PROPERTIES': return 'Curated Projects';
      case 'LEADS_MARKET': return 'Buyer Leads';
      case 'MEDIA': return 'Media & Podcast';
      case 'CONFERENCE': return 'Live & Latest';
      case 'MARKET_INSIGHTS': return 'Market Trends & Insights';
      case 'COMMUNITY': return 'Community Q&A';
      case 'REVIEWS': return 'Review & Rating';
      case 'REQUIREMENT': return 'Property Requirement';
      case 'CHAT': return 'Contact & Connect Property Studio';
      case 'ADMIN': return 'Super Admin Console';
      case 'PROPERTY_ADMIN': return 'Scoped PMO Workspace';
      case 'STUDIO': return 'Studio Broadcast';
      case 'CONTACT': return 'Property Admin Application';
      default: return 'Property Studio';
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="px-3 h-14 flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {activeView !== 'HOME' && (
            <button
              onClick={() => {
                setMenuOpen(false);
                setActiveView('HOME');
              }}
              className="p-1 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg active:scale-95 transition-transform cursor-pointer shrink-0"
              aria-label="Back to home"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => {
              setMenuOpen(false);
              setActiveView('HOME');
            }}
            className="shrink-0"
            aria-label="Property Studio home"
          >
            <BrandLogo variant="compact" size="sm" />
          </button>

          {activeView !== 'HOME' && (
            <div className="truncate ml-1 hidden min-[400px]:block max-w-[110px] sm:max-w-[180px]">
              <h1 className="text-xs font-bold text-slate-900 truncate tracking-tight">
                {getTitle(activeView)}
              </h1>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Admin console button (Super Admin or Platform Owner / Developer) */}
          {isPlatformAdmin(currentUser.role) && isLoggedIn && activeView !== 'ADMIN' && (
            <button
              onClick={() => setActiveView('ADMIN')}
              className="p-1.5 text-amber-700 bg-amber-50 rounded-lg active:scale-95 transition-transform shrink-0"
              title="Admin Console"
              aria-label="Admin Console"
            >
              <ShieldCheck className="w-4 h-4 text-amber-700" />
            </button>
          )}

          {isLoggedIn && isPropertySeeker(currentUser.role) && activeView !== 'DASHBOARD' && (
            <button
              onClick={() => setActiveView('DASHBOARD')}
              className="p-1.5 text-amber-800 bg-amber-50 rounded-lg active:scale-95 transition-transform shrink-0"
              title="Member Dashboard"
              aria-label="Member Dashboard"
            >
              <LayoutDashboard className="w-4 h-4 text-amber-600" />
            </button>
          )}

          {roleUtilityDestinations(currentUser.role, isLoggedIn).includes('LEADS_MARKET') && activeView !== 'LEADS_MARKET' && (
            <button
              onClick={() => setActiveView('LEADS_MARKET')}
              className="hidden sm:inline-flex p-1.5 text-slate-700 bg-slate-50 rounded-lg active:scale-95 transition-transform shrink-0"
              title="Buyer Leads"
              aria-label="Buyer Leads"
            >
              <Users className="w-4 h-4" />
            </button>
          )}

          {roleUtilityDestinations(currentUser.role, isLoggedIn).includes('PROFESSIONAL') && activeView !== 'PROFESSIONAL' && (
            <button
              onClick={() => setActiveView('PROFESSIONAL')}
              className="hidden sm:inline-flex p-1.5 text-slate-700 bg-slate-50 rounded-lg active:scale-95 transition-transform shrink-0"
              title="Workspace"
              aria-label="Workspace"
            >
              <Briefcase className="w-4 h-4" />
            </button>
          )}

          {currentUser.role === 'PROPERTY_ADMIN' && isLoggedIn && activeView !== 'PROPERTY_ADMIN' && (
            <button
              onClick={() => setActiveView('PROPERTY_ADMIN')}
              className="hidden sm:inline-flex p-1.5 text-indigo-700 bg-indigo-50 rounded-lg active:scale-95 transition-transform shrink-0"
              title="PMO Workspace"
            >
              <Building className="w-4 h-4" />
            </button>
          )}

          {/* Wallet pill if logged in */}
          {isLoggedIn && (
            <button
              onClick={onOpenWalletModal}
              className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <Wallet className="w-3 h-3 text-amber-600 shrink-0" />
              <span className="font-mono-numbers">₹{walletBalance.toLocaleString('en-IN')}</span>
            </button>
          )}

          {/* User Sign In / Profile Control Panel */}
          {!isLoggedIn ? (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Login</span>
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-1 p-0.5 pr-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-full transition-colors shadow-xs active:scale-95 shrink-0 cursor-pointer"
              title="Open Profile Control Panel & Password Settings"
            >
              <img
                src={getSafeAvatar(currentUser.avatar)}
                alt={currentUser.name}
                className="w-7 h-7 rounded-full object-cover shrink-0"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              {getRoleIcon(currentUser.role)}
              <KeyRound className="w-3 h-3 text-amber-600 shrink-0" />
            </button>
          )}

          {/* Mobile Collapsible Navigation Menu Toggle */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-controls="mobile-header-drawer"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-1.5 rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-colors cursor-pointer shrink-0"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {menuOpen && (
        <div
          id="mobile-header-drawer"
          className="border-t border-slate-200 bg-white shadow-xl px-4 py-4 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-80px)] overflow-y-auto"
        >
          <div className="space-y-4">
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
                        setMenuOpen(false);
                        if (link.view === 'COMMUNITY' && !isLoggedIn) {
                          if (onOpenLoginModal) onOpenLoginModal();
                          return;
                        }
                        setActiveView(link.view);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-amber-50 text-amber-900 font-bold border-l-4 border-amber-600'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span>{link.label}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Workspaces & Consoles */}
            {(utilityLinks.length > 0 || (isLoggedIn && isPropertySeeker(currentUser.role)) || (isLoggedIn && isPlatformAdmin(currentUser.role))) && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block mb-2">
                  Workspaces & Consoles
                </span>
                <div className="flex flex-wrap gap-2">
                  {isLoggedIn && isPropertySeeker(currentUser.role) && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveView('DASHBOARD');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer"
                    >
                      Member Dashboard
                    </button>
                  )}
                  {utilityLinks.includes('LEADS_MARKET') && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveView('LEADS_MARKET');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                    >
                      Buyer Leads
                    </button>
                  )}
                  {utilityLinks.includes('PROFESSIONAL') && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveView('PROFESSIONAL');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                    >
                      Workspace
                    </button>
                  )}
                  {isLoggedIn && isPlatformAdmin(currentUser.role) && (
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setActiveView('ADMIN');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Admin Console</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Support Desk trigger inside mobile drawer */}
            {onOpenSupport && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  onClick={() => {
                    setMenuOpen(false);
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
    </div>
  );
};
