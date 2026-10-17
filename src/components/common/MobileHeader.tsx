import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import { BrandLogo } from './BrandLogo';
import { Avatar } from './Avatar';
import { Wallet, LogIn, ChevronLeft, ShieldAlert, Building, KeyRound } from 'lucide-react';

interface MobileHeaderProps {
  onOpenProfileModal: () => void;
  onOpenWalletModal: () => void;
  onOpenLoginModal?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  onOpenProfileModal,
  onOpenWalletModal,
  onOpenLoginModal
}) => {
  const {
    currentUser,
    activeView,
    setActiveView,
    walletBalance,
    isLoggedIn
  } = useApp();

  const getTitle = (view: ViewType): string => {
    switch (view) {
      case 'HOME': return 'Property Studio';
      case 'PROPERTIES': return 'Curated Projects';
      case 'LEADS_MARKET': return 'Buyer Leads';
      case 'MEDIA': return 'Media & Podcasts';
      case 'CONFERENCE': return 'Live Summit';
      case 'MARKET_INSIGHTS': return 'Market Trends';
      case 'COMMUNITY': return 'Community Q&A';
      case 'CHAT': return 'Direct Messages';
      case 'ADMIN': return 'Super Admin Console';
      case 'PROPERTY_ADMIN': return 'Scoped PMO Workspace';
      case 'STUDIO': return '86" IFP Broadcast';
      case 'CONTACT': return 'Official Secretariat & Support';
      default: return 'Property Studio';
    }
  };

  return (
    <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3.5 h-14 flex items-center justify-between">
      <div className="flex items-center gap-2 min-w-0">
        {activeView !== 'HOME' && (
          <button
            onClick={() => setActiveView('HOME')}
            className="p-1 -ml-1 text-slate-700 hover:text-slate-900 rounded-lg active:scale-95 transition-transform cursor-pointer"
            aria-label="Back to home"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={() => setActiveView('HOME')}
          className="shrink-0"
          aria-label="Property Studio home"
        >
          <BrandLogo variant="compact" size="sm" />
        </button>

        {activeView !== 'HOME' && (
          <div className="truncate ml-1">
            <h1 className="text-sm font-bold text-slate-900 truncate tracking-tight">
              {getTitle(activeView)}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* If Super admin or PMO and logged in */}
        {currentUser.role === 'SUPER_ADMIN' && isLoggedIn && activeView !== 'ADMIN' && (
          <button
            onClick={() => setActiveView('ADMIN')}
            className="p-1.5 text-amber-700 bg-amber-50 rounded-lg active:scale-95 transition-transform"
            title="Super Admin"
          >
            <ShieldAlert className="w-4 h-4" />
          </button>
        )}

        {currentUser.role === 'PROPERTY_ADMIN' && isLoggedIn && activeView !== 'PROPERTY_ADMIN' && (
          <button
            onClick={() => setActiveView('PROPERTY_ADMIN')}
            className="p-1.5 text-indigo-700 bg-indigo-50 rounded-lg active:scale-95 transition-transform"
            title="PMO Workspace"
          >
            <Building className="w-4 h-4" />
          </button>
        )}

        {/* Wallet pill if logged in */}
        {isLoggedIn && (
          <button
            onClick={onOpenWalletModal}
            className="flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold active:scale-95 transition-transform"
          >
            <Wallet className="w-3 h-3 text-amber-600" />
            <span className="font-mono-numbers">₹{walletBalance.toLocaleString('en-IN')}</span>
          </button>
        )}

        {/* User Sign In / Profile Control Panel */}
        {!isLoggedIn ? (
          <button
            onClick={onOpenLoginModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-bold shadow-sm active:scale-95 transition-transform cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400" />
            <span>Login / Sign Up</span>
          </button>
        ) : (
          <button
            onClick={onOpenProfileModal}
            className="relative active:scale-95 transition-transform p-0.5 rounded-full border border-slate-300"
            title="Open Profile Control Panel & Password Settings"
          >
            <Avatar id={currentUser.avatar} label={currentUser.name} className="w-7 h-7 rounded-full" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-white" />
          </button>
        )}
      </div>
    </div>
  );
};
