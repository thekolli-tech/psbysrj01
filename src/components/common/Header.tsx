import React from 'react';
import { useApp } from '../../context/AppContext';
import { isPlatformAdmin } from '../../shared/policy';
import { linkedEndUserNavigation, roleUtilityDestinations } from '../../shared/endUserNavigation';
import { BrandLogo } from './BrandLogo';
import {
  Wallet,
  LogIn,
  KeyRound,
  HelpCircle,
  ShieldCheck
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

  const navLinks = linkedEndUserNavigation();
  const utilityLinks = roleUtilityDestinations(currentUser.role, isLoggedIn);

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
          <div className="text-[11px] font-mono text-slate-400 hidden sm:flex items-center gap-1.5">
            <span className="text-amber-400 font-bold">TG RERA:</span>
            <span className="text-slate-200 font-semibold">A02200004078</span>
          </div>

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

      {/* Main Navigation Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-20 flex items-center justify-between gap-4">
        {/* Zone 1: Brand & Logo */}
        <div className="flex items-center gap-6">
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

        {/* Zone 2: Navigation links */}
        <nav className="hidden lg:flex items-center gap-3 text-[11px] font-semibold text-slate-600 overflow-x-auto">
          {navLinks.map(link => {
            const isActive = activeView === link.view;
            return (
              <button
                key={link.view}
                onClick={() => {
                  setActiveView(link.view);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`py-1 transition-colors whitespace-nowrap relative cursor-pointer ${
                  isActive
                    ? 'text-slate-950 font-bold border-b-2 border-amber-600'
                    : 'hover:text-slate-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {utilityLinks.includes('LEADS_MARKET') && (
            <button
              onClick={() => {
                setActiveView('LEADS_MARKET');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hidden xl:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
              className={`hidden xl:inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
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
              <span className="whitespace-nowrap font-bold">
                {currentUser.role === 'DEVELOPER' ? 'Platform Owner Console' : 'Super Admin Console'}
              </span>
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
            /* Logged in User Profile Control Panel Trigger */
            <button
              onClick={onOpenProfileModal}
              className="flex items-center gap-2.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs transition-colors shadow-sm cursor-pointer"
              title="Open Profile Control Panel & Password Settings"
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
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
        </div>
      </div>
    </header>
  );
};
