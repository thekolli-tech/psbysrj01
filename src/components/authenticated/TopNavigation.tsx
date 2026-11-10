import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { NotificationPanel } from './NotificationPanel';
import { UserProfileMenu } from './UserProfileMenu';
import {
  Search,
  Bell,
  X,
  Menu,
  Command,
  Wallet,
  MapPin,
  ChevronDown
} from 'lucide-react';

interface TopNavigationProps {
  currentUser: User;
  onOpenSearch: () => void;
  onOpenCreate: () => void;
  onOpenMessages?: () => void;
  onOpenSupport: () => void;
  onOpenWallet: () => void;
  onLogout: () => void;
  onNavigateHome: () => void;
  onNavigateWorkspace: (tab?: string) => void;
  onNavigateAdmin?: () => void;
  onNavigateDeveloper?: () => void;
  unreadCount?: number;
  onToggleMobileMenu?: () => void;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

export const TopNavigation: React.FC<TopNavigationProps> = ({
  currentUser,
  onOpenSearch,
  onOpenCreate,
  onOpenMessages,
  onOpenSupport,
  onOpenWallet,
  onLogout,
  onNavigateHome,
  onNavigateWorkspace,
  onNavigateAdmin,
  onNavigateDeveloper,
  unreadCount = 0,
  onToggleMobileMenu
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ps_selected_city') || 'Hyderabad';
    }
    return 'Hyderabad';
  });

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs select-none">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        {/* Left: Mobile Menu Toggle + Amber PS Badge & Property Studio Brand */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {onToggleMobileMenu && (
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="p-1.5 text-slate-500 hover:text-slate-800 lg:hidden rounded-xl hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div
            onClick={onNavigateHome}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <span className="px-2 py-0.5 rounded-lg bg-[#B49029] text-white font-black text-xs font-mono tracking-wider shadow-2xs group-hover:bg-[#A99137] transition-colors">
              PS
            </span>
            <span className="font-black font-display text-base sm:text-lg tracking-tight text-[#182A3E]">
              Property Studio
            </span>
          </div>
        </div>

        {/* Center: Global Search Pill Bar Matching PDF Pages 7-25 */}
        <div className="flex-1 max-w-2xl px-2 sm:px-4">
          <div
            onClick={onOpenSearch}
            className="group relative flex items-center w-full bg-slate-100/90 hover:bg-slate-100 rounded-full px-4 py-2 border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-inner"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-[#B49029] transition-colors shrink-0" />
            <span className="ml-2.5 text-xs text-slate-400 group-hover:text-slate-600 truncate flex-1">
              Search projects, communities, questions...
            </span>
            <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-mono font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs shrink-0">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right: City Selector | Wallet ₹ [BAL] + | Notifications | User Avatar */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* City Selector */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-700">
            <MapPin className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
            <select
              value={selectedCity}
              onChange={(e) => {
                const newCity = e.target.value;
                setSelectedCity(newCity);
                try {
                  localStorage.setItem('ps_selected_city', newCity);
                } catch {}
              }}
              className="bg-transparent text-slate-800 font-bold text-xs focus:outline-none cursor-pointer"
              aria-label="Select City"
            >
              <option value="Hyderabad">Hyderabad</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Chennai">Chennai</option>
              <option value="Delhi-NCR">Delhi-NCR</option>
              <option value="Pune">Pune</option>
            </select>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </div>

          {/* Wallet Balance Pill Matching PDF: ₹ [BAL] + */}
          <button
            type="button"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-[#B49029] text-xs font-bold transition-colors cursor-pointer shadow-2xs"
            title="Wallet Balance & Top Up"
          >
            <Wallet className="w-3.5 h-3.5 text-[#B49029] shrink-0" />
            <span className="font-mono">
              ₹ {currentUser.walletBalance?.toLocaleString('en-IN') ?? '0'}
            </span>
            <span className="text-[11px] font-black text-amber-700">+</span>
          </button>

          {/* Notifications Bell */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#B49029] rounded-full ring-2 ring-white" />
              )}
            </button>

            {notificationsOpen && (
              <NotificationPanel
                isOpen={notificationsOpen}
                onClose={() => setNotificationsOpen(false)}
              />
            )}
          </div>

          {/* User Profile Avatar Circle (Initial or image) */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="w-9 h-9 rounded-full bg-[#182A3E] text-white flex items-center justify-center font-bold text-xs hover:ring-2 hover:ring-[#B49029] transition-all cursor-pointer shadow-xs overflow-hidden"
              title={`${currentUser.name} (${currentUser.role})`}
            >
              {currentUser.avatar ? (
                <img
                  src={getSafeAvatar(currentUser.avatar)}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = DEFAULT_AVATAR;
                  }}
                />
              ) : (
                <span>{currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </button>

            {profileOpen && (
              <UserProfileMenu
                isOpen={profileOpen}
                currentUser={currentUser}
                onClose={() => setProfileOpen(false)}
                onNavigateWorkspace={onNavigateWorkspace}
                onOpenWallet={onOpenWallet}
                onOpenSupport={onOpenSupport}
                onNavigateAdmin={onNavigateAdmin}
                onNavigateDeveloper={onNavigateDeveloper}
                onLogout={onLogout}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
