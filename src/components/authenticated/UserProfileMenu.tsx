import React from 'react';
import { User as UserType } from '../../types';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  User,
  Settings,
  Wallet,
  ShieldCheck,
  Building,
  LogOut,
  ChevronRight,
  ExternalLink,
  LifeBuoy
} from 'lucide-react';

interface UserProfileMenuProps {
  isOpen: boolean;
  currentUser: UserType;
  onClose: () => void;
  onNavigateWorkspace: (tab?: string) => void;
  onOpenWallet: () => void;
  onOpenSupport: () => void;
  onLogout: () => void;
  onNavigateAdmin?: () => void;
  onNavigateDeveloper?: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({
  isOpen,
  currentUser,
  onClose,
  onNavigateWorkspace,
  onOpenWallet,
  onOpenSupport,
  onLogout,
  onNavigateAdmin,
  onNavigateDeveloper
}) => {
  if (!isOpen) return null;

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const isDeveloper = currentUser.role === 'DEVELOPER';

  return (
    <div
      onClick={e => e.stopPropagation()}
      className="absolute right-0 top-12 z-40 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in fade-in duration-150"
      style={{ boxShadow: '0 20px 40px -10px rgba(24, 42, 62, 0.2)' }}
    >
      {/* User Header Profile Summary */}
      <div className="p-4 bg-gradient-to-br from-[#182A3E] to-[#203750] text-white">
        <div className="flex items-center gap-3">
          <img
            src={getSafeAvatar(currentUser.avatar) || DEFAULT_AVATAR}
            alt={currentUser.name}
            className="w-11 h-11 rounded-full object-cover border-2 border-[#B49029] bg-white shrink-0"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
          />
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-white truncate">{currentUser.name || 'Member'}</h4>
            <p className="text-[11px] text-slate-300 truncate">{currentUser.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {currentUser.role.replace(/_/g, ' ')}
            </span>
          </div>
        </div>
      </div>

      {/* Menu Links */}
      <div className="p-2 space-y-0.5 text-xs">
        <button
          type="button"
          onClick={() => {
            onNavigateWorkspace('OVERVIEW');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">My Workspace</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </button>

        <button
          type="button"
          onClick={() => {
            onOpenWallet();
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Wallet className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">Wallet Balance</span>
          </div>
          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            ₹{(currentUser.walletBalance || 0).toLocaleString('en-IN')}
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            onNavigateWorkspace('SETTINGS');
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Settings className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Account Settings</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </button>

        {isSuperAdmin && onNavigateAdmin && (
          <button
            type="button"
            onClick={() => {
              onNavigateAdmin();
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 flex items-center justify-between font-bold transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Super Admin Console</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-amber-700" />
          </button>
        )}

        {isDeveloper && onNavigateDeveloper && (
          <button
            type="button"
            onClick={() => {
              onNavigateDeveloper();
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-xl bg-blue-50 hover:bg-blue-100/80 text-blue-900 flex items-center justify-between font-bold transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Building className="w-4 h-4 text-blue-700" />
              <span>Developer Dashboard</span>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-blue-700" />
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            onOpenSupport();
            onClose();
          }}
          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <LifeBuoy className="w-4 h-4 text-slate-400" />
            <span className="font-semibold">Secretariat Support Desk</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </button>

        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="w-full text-left px-3 py-2 rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2.5 font-bold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
