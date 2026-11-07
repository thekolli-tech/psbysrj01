import React, { useState } from 'react';
import { UserRole } from '../../types';
import {
  Home,
  Compass,
  Users,
  MessageSquare,
  TrendingUp,
  Radio,
  Bookmark,
  User,
  FileText,
  HelpCircle,
  Building,
  Briefcase,
  UserCheck,
  Building2,
  Video,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Plus
} from 'lucide-react';

export type NavItemKey =
  | 'HOME'
  | 'DISCOVER'
  | 'COMMUNITIES'
  | 'DISCUSSIONS'
  | 'PROPERTY_INSIGHTS'
  | 'LIVE_SESSIONS'
  | 'SAVED_ITEMS'
  | 'MY_PROFILE'
  | 'MY_POSTS'
  | 'MY_QUESTIONS'
  | 'MY_COMMUNITIES'
  | 'MY_ENQUIRIES'
  | 'FIND_PROFESSIONALS'
  | 'DEVELOPERS'
  | 'CHANNEL_PARTNERS'
  | 'RERA_PROFESSIONALS'
  | 'REAL_ESTATE_MEDIA'
  | 'SUPER_ADMIN_CONSOLE'
  | 'DEVELOPER_DASHBOARD';

interface LeftSidebarProps {
  activeItem: NavItemKey;
  onSelectNav: (key: NavItemKey) => void;
  userRole?: UserRole;
  savedCount?: number;
  onStartCommunity?: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  activeItem,
  onSelectNav,
  userRole = 'PROPERTY_SEEKER',
  savedCount = 0,
  onStartCommunity
}) => {
  const [mainOpen, setMainOpen] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(true);
  const [networkOpen, setNetworkOpen] = useState(true);

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const isDeveloper = userRole === 'DEVELOPER';

  return (
    <aside className="w-60 xl:w-64 shrink-0 flex flex-col gap-4 text-xs select-none">
      {/* 1. Main Navigation Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        <button
          type="button"
          onClick={() => setMainOpen(!mainOpen)}
          className="w-full flex items-center justify-between pb-2 mb-1 px-2 font-bold font-display uppercase tracking-wider text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <span>Main Navigation</span>
          {mainOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {mainOpen && (
          <nav className="space-y-0.5">
            {[
              { key: 'HOME' as const, label: 'Home', icon: Home },
              { key: 'DISCOVER' as const, label: 'Discover', icon: Compass },
              { key: 'COMMUNITIES' as const, label: 'Communities', icon: Users },
              { key: 'DISCUSSIONS' as const, label: 'Discussions', icon: MessageSquare },
              { key: 'PROPERTY_INSIGHTS' as const, label: 'Property Insights', icon: TrendingUp },
              { key: 'LIVE_SESSIONS' as const, label: 'Live Sessions', icon: Radio },
              { key: 'SAVED_ITEMS' as const, label: 'Saved Items', icon: Bookmark, badge: savedCount > 0 ? savedCount : undefined }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectNav(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#182A3E] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-[#B49029]' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {typeof item.badge === 'number' && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                        isActive ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* 2. My Workspace Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        <button
          type="button"
          onClick={() => setWorkspaceOpen(!workspaceOpen)}
          className="w-full flex items-center justify-between pb-2 mb-1 px-2 font-bold font-display uppercase tracking-wider text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <span>My Workspace</span>
          {workspaceOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {workspaceOpen && (
          <nav className="space-y-0.5">
            {[
              { key: 'MY_PROFILE' as const, label: 'My Profile', icon: User },
              { key: 'MY_POSTS' as const, label: 'My Posts', icon: FileText },
              { key: 'MY_QUESTIONS' as const, label: 'My Questions', icon: HelpCircle },
              { key: 'MY_COMMUNITIES' as const, label: 'My Communities', icon: Building },
              { key: 'MY_ENQUIRIES' as const, label: 'My Enquiries', icon: Briefcase }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectNav(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#182A3E] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#B49029]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* 3. Professional Network Section */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        <button
          type="button"
          onClick={() => setNetworkOpen(!networkOpen)}
          className="w-full flex items-center justify-between pb-2 mb-1 px-2 font-bold font-display uppercase tracking-wider text-[11px] text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
        >
          <span>Professional Network</span>
          {networkOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </button>

        {networkOpen && (
          <nav className="space-y-0.5">
            {[
              { key: 'FIND_PROFESSIONALS' as const, label: 'Find Professionals', icon: UserCheck },
              { key: 'DEVELOPERS' as const, label: 'Developers', icon: Building2 },
              { key: 'CHANNEL_PARTNERS' as const, label: 'Channel Partners', icon: Briefcase },
              { key: 'RERA_PROFESSIONALS' as const, label: 'RERA Professionals', icon: ShieldCheck },
              { key: 'REAL_ESTATE_MEDIA' as const, label: 'Real Estate Media', icon: Video }
            ].map(item => {
              const Icon = item.icon;
              const isActive = activeItem === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectNav(item.key)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#182A3E] text-white font-bold shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#B49029]' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* 4. Privileged Consoles (Super Admin & Developer ONLY) */}
      {(isSuperAdmin || isDeveloper) && (
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 shadow-xs space-y-1">
          <span className="block px-2 text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
            Privileged Management
          </span>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => onSelectNav('SUPER_ADMIN_CONSOLE')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Super Admin Console</span>
            </button>
          )}
          {isDeveloper && (
            <button
              type="button"
              onClick={() => onSelectNav('DEVELOPER_DASHBOARD')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl font-bold text-blue-900 hover:bg-blue-100 transition-colors cursor-pointer"
            >
              <Building className="w-4 h-4 text-blue-700" />
              <span>Developer Dashboard</span>
            </button>
          )}
        </div>
      )}

      {/* Quick Community Action */}
      {onStartCommunity && (
        <button
          type="button"
          onClick={onStartCommunity}
          className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-[#B49029] bg-amber-50/40 hover:bg-amber-50 text-[#182A3E] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#B49029]" />
          <span>Start a Community</span>
        </button>
      )}
    </aside>
  );
};
