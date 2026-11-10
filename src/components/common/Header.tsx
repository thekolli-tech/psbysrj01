import { prefetchView } from '../../lib/prefetch';
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
  Video,
  MapPin,
  Search,
  Command,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  onOpenProfileModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLoginModal: () => void;
  onOpenSupport?: () => void;
  onOpenSearchModal?: () => void;
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
      return <span title="RERA Certified Individual Realter/CP/Agent"><Award className="w-3.5 h-3.5 text-amber-600 shrink-0" /></span>;
    case 'RERA_CONSULTANCY':
      return <span title="RERA Certified Property Consultancy/Firm"><Building className="w-3.5 h-3.5 text-blue-700 shrink-0" /></span>;
    case 'NON_RERA_BROKER':
      return <span title="Non-RERA Realter/Broker/CP"><Handshake className="w-3.5 h-3.5 text-orange-600 shrink-0" /></span>;
    case 'SALES_PROFESSIONAL':
      return <span title="Working Sales Professional"><Briefcase className="w-3.5 h-3.5 text-indigo-600 shrink-0" /></span>;
    case 'TRADER_INVESTOR':
      return <span title="Trader / Investor"><TrendingUp className="w-3.5 h-3.5 text-emerald-600 shrink-0" /></span>;
    case 'VENDOR':
      return <span title="Vendor – Contractors and Suppliers"><Briefcase className="w-3.5 h-3.5 text-amber-700 shrink-0" /></span>;
    case 'ARCHITECT_ENGINEER':
      return <span title="Architect & Engineer"><Compass className="w-3.5 h-3.5 text-cyan-700 shrink-0" /></span>;
    case 'INTERIOR_DESIGNER':
      return <span title="Interior Designer & Decorater"><Landmark className="w-3.5 h-3.5 text-purple-600 shrink-0" /></span>;
    case 'INFLUENCER':
      return <span title="Influencer"><Video className="w-3.5 h-3.5 text-pink-600 shrink-0" /></span>;
    case 'DIGITAL_MARKETER':
      return <span title="Digital Marketer"><TrendingUp className="w-3.5 h-3.5 text-violet-600 shrink-0" /></span>;
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
  onOpenSupport,
  onOpenSearchModal
}) => {
  const {
    activeView,
    setActiveView,
    currentUser,
    walletBalance,
    isLoggedIn,
    logout
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ps_selected_city') || 'Hyderabad';
    }
    return 'Hyderabad';
  });

  const profileRef = useRef<HTMLDivElement>(null);
  const navLinks = linkedEndUserNavigation();
  const utilityLinks = roleUtilityDestinations(currentUser.role, isLoggedIn);

  // Derive exact display label (cleans long stakeholder phrases and brand suffixes)
  const getDisplayLabel = (link: any) => {
    return typeof link === 'object' && link?.label
      ? link.label.split(' — ')[0].replace(/\s+Property\s+Studio$/, '')
      : String(link || '');
  };

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key or view change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [activeView]);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs transition-all duration-300">
      {/* Executive Tagline & Production Secretariat Bar Matching PDF */}
      <div className="bg-[#182A3E] text-white px-4 sm:px-6 lg:px-8 py-1.5 text-[11px] font-medium tracking-wide flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
          <span className="text-[#B49029] font-bold tracking-wider">PROPERTY STUDIO</span>
          <span className="text-slate-400" aria-hidden="true">|</span>
          <span className="text-slate-300 tracking-widest text-[10px] uppercase font-semibold">
            REAL ESTATE · VISUAL STORIES · MARKET TRENDS & INSIGHTS
          </span>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* City Option beside Secretariat */}
          <div className="flex items-center gap-1 sm:gap-1.5 px-2 py-0.5 rounded-md bg-[#030508]/60 border border-[#CEC8A2]/30 text-[11px]">
            <MapPin className="w-3 h-3 text-[#B49029] shrink-0" />
            <span className="text-slate-400 font-medium hidden xs:inline">City:</span>
            <select
              value={selectedCity}
              onChange={(e) => {
                const newCity = e.target.value;
                setSelectedCity(newCity);
                try {
                  localStorage.setItem('ps_selected_city', newCity);
                } catch {}
              }}
              className="bg-transparent text-[#B49029] font-bold text-[11px] focus:outline-none cursor-pointer"
              aria-label="Select City"
            >
              <option value="Hyderabad" className="bg-[#182A3E] text-white">Hyderabad</option>
              <option value="Bengaluru" className="bg-[#182A3E] text-white">Bengaluru</option>
              <option value="Mumbai" className="bg-[#182A3E] text-white">Mumbai</option>
              <option value="Chennai" className="bg-[#182A3E] text-white">Chennai</option>
              <option value="Delhi-NCR" className="bg-[#182A3E] text-white">Delhi-NCR</option>
              <option value="Pune" className="bg-[#182A3E] text-white">Pune</option>
            </select>
          </div>

          <div className="text-[11px] font-mono text-slate-400 hidden md:block">
            Secretariat: <span className="text-slate-200 font-semibold">info@propertystudio.org</span>
          </div>

          {onOpenSupport && (
            <button
              onClick={onOpenSupport}
              className="text-[#B49029] hover:text-[#A99137] font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Support Desk</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Navigation Bar: Desktop 3-Zone Matching PDF Pages 4, 7-25 */}
      <div className="w-full px-4 sm:px-6 lg:px-8 min-h-16 flex flex-wrap items-center justify-between gap-x-2.5 gap-y-2 py-2">
        {/* Zone 1: Brand & Logo with Official Logo Image (Left) */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => {
              setActiveView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center text-left focus:outline-none cursor-pointer group"
            aria-label="Property Studio Home"
          >
            <BrandLogo variant="compact" size="sm" className="h-10 w-auto object-contain" />
          </button>
        </div>

        {/* Zone 2: Universal Wide Search Bar Matching PDF Pages 7-25 */}
        <div className="flex-1 max-w-2xl px-2 sm:px-6 min-w-[240px]">
          {onOpenSearchModal ? (
            <button
              type="button"
              onClick={onOpenSearchModal}
              className="w-full flex items-center justify-between pl-4 pr-3 py-2 bg-slate-100 hover:bg-slate-50 border border-slate-200 hover:border-[#B49029] rounded-full text-xs text-slate-400 text-left transition-all cursor-pointer shadow-inner group"
              title="Universal Search (Ctrl+K)"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Search className="w-4 h-4 text-slate-400 group-hover:text-[#B49029] transition-colors shrink-0" />
                <span className="truncate">Search projects, communities, questions...</span>
              </div>
              <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs shrink-0">
                <Command className="w-2.5 h-2.5" />
                <span>K</span>
              </div>
            </button>
          ) : null}
        </div>

        {/* Zone 3: Actions & Controls Matching PDF: City ▾ | ₹ [BAL] + | Avatar U / Sign In */}
        <div className="flex items-center gap-1.5 xl:gap-2.5 shrink-0 ml-auto">
          {/* Screen reader navigation for accessibility and audit compatibility */}
          <nav aria-label="Platform Directory" className="hidden xl:flex sr-only">
            {navLinks.map(link => (
              <button key={link.view} onClick={() => setActiveView(link.view)} className="shrink-0">
                {getDisplayLabel(link)}
              </button>
            ))}
          </nav>

          {/* City Selector Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
            <span className="font-bold">{selectedCity}</span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          {/* Quick Buyer Leads Shortcut (for Agents & Partners) */}
          {utilityLinks.includes('LEADS_MARKET') && (
            <button
              onClick={() => {
                setActiveView('LEADS_MARKET');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                activeView === 'LEADS_MARKET'
                  ? 'bg-[#182A3E] text-white border-[#182A3E] shadow-sm'
                  : 'bg-white text-[#030508] border-slate-200 hover:bg-slate-50'
              }`}
              title="Buyer Leads"
              aria-label="Buyer Leads"
            >
              <Users className="w-4 h-4 text-[#B49029] shrink-0" />
              <span className="sr-only">Buyer Leads</span>
            </button>
          )}

          {/* Quick Workspace Shortcut */}
          {utilityLinks.includes('PROFESSIONAL') && (
            <button
              onClick={() => {
                setActiveView('PROFESSIONAL');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 flex items-center justify-center ${
                activeView === 'PROFESSIONAL'
                  ? 'bg-[#182A3E] text-white border-[#182A3E] shadow-sm'
                  : 'bg-white text-[#030508] border-slate-200 hover:bg-slate-50'
              }`}
              title="Workspace"
              aria-label="Workspace"
            >
              <Briefcase className="w-4 h-4 text-[#B49029] shrink-0" />
              <span className="sr-only">Workspace</span>
            </button>
          )}

          {/* Direct Admin Console button if authorized */}
          {isLoggedIn && isPlatformAdmin(currentUser.role) && (
            <button
              onClick={() => {
                setActiveView('ADMIN');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="p-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Super Admin Console"
            >
              <ShieldCheck className="w-4 h-4 text-[#B49029] shrink-0" />
              <span className="sr-only">
                <span className="min-[1680px]:hidden">Admin Console</span>
                <span className="hidden min-[1680px]:inline">Super Admin Console</span>
              </span>
            </button>
          )}

          {/* About Us Navigation Button */}
          <button
            type="button"
            onClick={() => {
              setActiveView('ABOUT');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer shrink-0 ${
              activeView === 'ABOUT'
                ? 'bg-[#182A3E] text-white border-[#182A3E] shadow-sm'
                : 'bg-white text-slate-700 border-slate-200/90 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title="About Property Studio"
            aria-label="About Property Studio"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#B49029]" />
            <span>About Us</span>
          </button>

          {/* Wallet Balance Pill Matching PDF: ₹ [BAL] + */}
          <button
            type="button"
            onClick={onOpenWalletModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#B49029] text-xs font-bold transition-colors cursor-pointer shadow-2xs shrink-0"
            title="Wallet Balance & Top Up"
            aria-label="Wallet Credit Balance"
          >
            <Wallet className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
            <span className="font-mono">
              ₹ {isLoggedIn ? walletBalance.toLocaleString('en-IN') : '0'}
            </span>
            <span className="text-[11px] font-black text-amber-700">+</span>
          </button>

          {/* User Sign In / Profile Avatar */}
          {!isLoggedIn ? (
            <button
              onClick={onOpenLoginModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Login / Sign Up</span>
            </button>
          ) : (
            <div ref={profileRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-full bg-[#182A3E] text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-[#B49029] transition-all cursor-pointer shadow-xs overflow-hidden shrink-0"
                title={`${currentUser.name} (${currentUser.role})`}
                aria-label="Open Profile Control Panel"
              >
                {currentUser.avatar ? (
                  <img
                    src={getSafeAvatar(currentUser.avatar)}
                    alt={currentUser.name}
                    className="w-full h-full object-cover shrink-0"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                    }}
                  />
                ) : (
                  <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</span>
                )}
                <div className="hidden min-[1680px]:block sr-only">
                  {currentUser.name}
                </div>
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 py-2 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="font-bold text-slate-900 truncate">{currentUser.name}</p>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                      {currentUser.role.replace(/_/g, ' ')}
                    </p>
                  </div>

                  <div className="py-1">
                    {isPropertySeeker(currentUser.role) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setActiveView('DASHBOARD');
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <LayoutDashboard className="w-3.5 h-3.5 text-[#B49029]" />
                        <span>Member Dashboard</span>
                      </button>
                    )}

                    {isPlatformAdmin(currentUser.role) && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setActiveView('ADMIN');
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-[#B49029]" />
                        <span>Admin Console</span>
                      </button>
                    )}

                    {currentUser.role === 'DEVELOPER' && (
                      <button
                        type="button"
                        onClick={() => {
                          setProfileDropdownOpen(false);
                          setActiveView('DEVELOPER');
                        }}
                        className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                      >
                        <Terminal className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Developer Diagnostics</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        onOpenProfileModal();
                      }}
                      className="w-full text-left px-4 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Account Settings</span>
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 flex items-center gap-2 font-bold cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-red-500" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mobile & Tablet Collapsible Menu Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="xl:hidden p-2 rounded-xl text-slate-700 hover:text-[#030508] hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-[#B49029] focus:ring-offset-1 transition-all cursor-pointer shrink-0"
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
          <div className="space-y-4">
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
                  className="px-2.5 py-1 text-[11px] font-semibold text-[#182A3E] bg-[#FCFBF3] hover:bg-[#FCFBF3]/80 border border-[#E8E4D8] rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3 h-3 text-[#B49029]" />
                  <span>Security</span>
                </button>
              </div>
            )}

            <div>
              <span className="text-[10px] font-mono font-bold text-[#A99137] uppercase tracking-widest block mb-2">
                Platform Navigation
              </span>
              <div className="flex flex-col gap-1">
                {navLinks.map(link => {
                  const isActive = activeView === link.view;
                  return (
                    <button
                      key={link.view}
                      onMouseEnter={() => prefetchView(link.view)}
                      onTouchStart={() => prefetchView(link.view)}
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
                          ? 'bg-[#FCFBF3] text-[#182A3E] font-bold border-l-4 border-[#B49029]'
                          : 'text-slate-700 hover:bg-slate-50 hover:text-[#030508]'
                      }`}
                    >
                      <span>{getDisplayLabel(link)}</span>
                      {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#B49029]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Role Workspaces & Consoles */}
            {(utilityLinks.length > 0 || (isLoggedIn && isPropertySeeker(currentUser.role)) || (isLoggedIn && currentUser.role === 'DEVELOPER') || (isLoggedIn && isPlatformAdmin(currentUser.role))) && (
              <div className="pt-3 border-t border-slate-100">
                <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-widest block mb-2">
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#182A3E] text-white transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-[#B49029]" />
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#030508] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Building className="w-3.5 h-3.5 text-[#B49029]" />
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-[#030508] transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Briefcase className="w-3.5 h-3.5 text-[#B49029]" />
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
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#FCFBF3] hover:bg-[#FCFBF3]/80 text-[#182A3E] border border-[#CEC8A2] transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-[#B49029]" />
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
                  className="w-full py-2.5 px-3 rounded-xl bg-[#FCFBF3] hover:bg-[#FCFBF3]/80 text-[#182A3E] border border-[#E8E4D8] font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
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
