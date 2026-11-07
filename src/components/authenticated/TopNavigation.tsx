import React, { useState, useRef, useEffect } from 'react';
import { User } from '../../types';
import { BrandLogo } from '../common/BrandLogo';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { NotificationPanel } from './NotificationPanel';
import { UserProfileMenu } from './UserProfileMenu';
import {
  Search,
  Plus,
  Bell,
  MessageSquare,
  X,
  Menu,
  Sparkles,
  Command
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
  onToggleMobileMenu,
  searchQuery = '',
  onSearchChange
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs select-none">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile Menu Toggle + Brand Logo */}
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

          <div onClick={onNavigateHome} className="cursor-pointer">
            <BrandLogo variant="compact" size="sm" />
          </div>
        </div>

        {/* Center: Global Search Pill Bar (Reddit-style) */}
        <div className="flex-1 max-w-2xl px-1 sm:px-4">
          <div
            onClick={onOpenSearch}
            className="group relative flex items-center w-full bg-slate-100/90 hover:bg-slate-100 rounded-full px-3.5 py-1.5 sm:py-2 border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-2xs"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-[#B49029] transition-colors shrink-0" />
            <span className="ml-2.5 text-xs text-slate-400 group-hover:text-slate-600 truncate flex-1">
              Search properties, communities, discussions, topics...
            </span>
            <div className="hidden sm:flex items-center gap-0.5 text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200 shadow-2xs shrink-0">
              <Command className="w-2.5 h-2.5" />
              <span>K</span>
            </div>
          </div>
        </div>

        {/* Right: Actions (Create, Messages, Notifications, Avatar) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* Create Content Button */}
          <button
            type="button"
            onClick={onOpenCreate}
            className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs font-bold text-white transition-all shadow-xs hover:shadow-md cursor-pointer shrink-0"
            style={{
              backgroundColor: '#182A3E',
              borderColor: '#B49029',
              borderWidth: '1px'
            }}
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Create</span>
          </button>

          {/* Messages Action */}
          {onOpenMessages && (
            <button
              type="button"
              onClick={onOpenMessages}
              className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Direct Messages & Enquiries"
              aria-label="Messages"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {/* Notifications Bell Dropdown */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-500 ring-2 ring-white" />
              )}
            </button>

            <NotificationPanel
              isOpen={notificationsOpen}
              onClose={() => setNotificationsOpen(false)}
            />
          </div>

          {/* User Profile Avatar & Menu Dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen(!profileOpen);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-1.5 p-1 rounded-full hover:ring-2 hover:ring-amber-500/40 transition-all cursor-pointer"
              aria-label="User profile menu"
            >
              <img
                src={getSafeAvatar(currentUser.avatar) || DEFAULT_AVATAR}
                alt={currentUser.name}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-slate-200 bg-white"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
            </button>

            <UserProfileMenu
              isOpen={profileOpen}
              currentUser={currentUser}
              onClose={() => setProfileOpen(false)}
              onNavigateWorkspace={onNavigateWorkspace}
              onOpenWallet={onOpenWallet}
              onOpenSupport={onOpenSupport}
              onLogout={onLogout}
              onNavigateAdmin={onNavigateAdmin}
              onNavigateDeveloper={onNavigateDeveloper}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
