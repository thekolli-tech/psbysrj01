import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { isPlatformAdmin, isPropertySeeker } from '../../shared/policy';
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
  X
} from 'lucide-react';

interface HeaderProps {
  onOpenProfileModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSupport?: () => void;
}

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
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);
  const moreDropdownRef = useRef<HTMLDivElement>(null);

  const navLinks = linkedEndUserNavigation();
  // Primary links: first 7 destinations
  const primaryNavLinks = navLinks.slice(0, 7);
  // Secondary links: remainder (e.g. Contact & Connect)
  const secondaryNavLinks = navLinks.slice(7);

  const utilityLinks = roleUtilityDestinations(currentUser.role, isLoggedIn);

  // Derive concise display label (e.g. trims ' — All Stakeholders and Projects' without hardcoding forbidden strings)
  const getDisplayLabel = (label: string) => label.split(' — ')[0];

  // Close dropdowns on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMoreDropdownOpen(false);
        setMobileMenuOpen(false);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(e.target as Node)) {
        setMoreDropdownOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const isSecondaryActive = secondaryNavLinks.some(l => l.view === activeView);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300">
      {/* Executive Tagline & Production Secretariat Bar */}
      <div className="bg-slate-900 text-white px-4 py-1.5 text-[11px] font-medium tracking-wide flex items-center justify-between">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Logo (Left) */}
        <div className="flex items-center gap-4 shrink-0">
          <button
            onClick={() => {
              setActiveView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-left group flex items-center focus:outline-none cursor-pointer"
            aria-label="Property Studio home"
          >
            <BrandLogo variant="compact" size="md" />
          </button>
        </div>

        {/* Zone 2: Primary Navigation Links (Center, Desktop) */}
        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center justify-center gap-1 xl:gap-2 text-xs font-semibold text-slate-600 whitespace-nowrap"
        >
          {primaryNavLinks.map(link => {
            const isActive = activeView === link.view;
            const displayLabel = getDisplayLabel(link.label);
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
                className={`px-2.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                  isActive
                    ? 'text-amber-900 bg-amber-500/10 font-bold border-b-2 border-amber-600'
                    : 'hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {displayLabel}
              </button>
            );
          })}

          {/* Secondary "More" Dropdown Menu */}
          <div className="relative" ref={moreDropdownRef}>
            <button
              type="button"
              onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
              aria-expanded={moreDropdownOpen}
              aria-haspopup="true"
              aria-label="More navigation options"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-all cursor-pointer ${
                isSecondaryActive
                  ? 'text-amber-900 bg-amber-500/10 font-bold border-b-2 border-amber-600'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {moreDropdownOpen && (
              <div
                role="menu"
                className="absolute top-full right-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1"
              >
                {secondaryNavLinks.map(link => (
                  <button
                    key={link.view}
                    role="menuitem"
                    onClick={() => {
                      setMoreDropdownOpen(false);
                      setActiveView(link.view);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full text-left px-4 py-2.5 text-xs font-semibold transition-colors flex items-center justify-between cursor-pointer ${
                      activeView === link.view
                        ? 'text-amber-900 bg-amber-50 font-bold'
                        : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <span>{link.label}</span>
                  </button>
                ))}

                {onOpenSupport && (
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMoreDropdownOpen(false);
                      onOpenSupport();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs font-semibold text-amber-700 hover:bg-amber-50 transition-colors flex items-center gap-2 border-t border-slate-100 mt-1 pt-2.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Support Desk</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Zone 3: Actions & Controls (Right) */}
        <div className="flex items-center gap-2 xl:gap-2.5 shrink-0">
          {utilityLinks.includes('LEADS_MARKET') && (
            <button
              onClick={() => {
                setActiveView('LEADS_MARKET');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hidden 2xl:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeView === 'LEADS_MARKET'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              Buyer Leads
            </button>
          )}

          {utilityLinks.includes('PROFESSIONAL') && (
            <button
              onClick={() => {
                setActiveView('PROFESSIONAL');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hidden 2xl:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeView === 'PROFESSIONAL'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              Workspace
            </button>
          )}

          {/* Admin / Developer Console direct button */}
          {isLoggedIn && currentUser.role === 'DEVELOPER' && (
            <button
              onClick={() => {
                setActiveView('DEVELOPER');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hidden xl:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeView === 'DEVELOPER'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-800 border-slate-300'
              }`}
            >
              Diagnostics
            </button>
          )}

          {isLoggedIn && isPlatformAdmin(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('ADMIN');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeView === 'ADMIN'
                  ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-sm'
                  : 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
              <span className="whitespace-nowrap font-bold hidden sm:inline">
                {currentUser.role === 'DEVELOPER' ? 'Platform Owner Console' : 'Super Admin Console'}
              </span>
            </button>
          )}

          {/* Member Dashboard direct button for property seekers */}
          {isLoggedIn && isPropertySeeker(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('DASHBOARD');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                activeView === 'DASHBOARD'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-amber-500" />
              <span className="whitespace-nowrap font-bold hidden sm:inline">Dashboard</span>
            </button>
          )}

          {/* Wallet credit balance button (only if logged in) */}
          {isLoggedIn ? (
            <button
              onClick={onOpenWalletModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Wallet className="w-3.5 h-3.5 text-amber-600" />
              <span className="font-mono-numbers">₹{walletBalance.toLocaleString('en-IN')}</span>
            </button>
          ) : null}

          {/* User Sign In / Profile Control Panel */}
          {!isLoggedIn ? (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-amber-400" />
              <span>Login / Sign Up</span>
            </button>
          ) : (
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              title="Open Profile Control Panel & Password Settings"
            >
              <img
                src={getSafeAvatar(currentUser.avatar)}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <div className="text-left hidden sm:block">
                <span className="text-[11px] font-bold text-slate-900 block leading-tight truncate max-w-[100px]">
                  {currentUser.name}
                </span>
                <span className="text-[9px] text-slate-500 uppercase font-semibold block leading-none">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
            </button>
          )}

          {/* Mobile & Tablet Collapsible Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-1 transition-all cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Tablet & Mobile Collapsible Menu Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-navigation-drawer"
          className="lg:hidden border-t border-slate-200 bg-white shadow-2xl px-4 py-5 animate-in slide-in-from-top-2 duration-200 max-h-[calc(100vh-120px)] overflow-y-auto"
        >
          <div className="space-y-5">
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
                      <span>{link.label}</span>
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white transition-colors cursor-pointer"
                    >
                      Member Dashboard
                    </button>
                  )}
                  {utilityLinks.includes('LEADS_MARKET') && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
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
                        setMobileMenuOpen(false);
                        setActiveView('PROFESSIONAL');
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors cursor-pointer"
                    >
                      Workspace
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
