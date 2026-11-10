import React from 'react';
import { UserRole, NavItemKey } from '../../types';
import {
  Home,
  Video,
  TrendingUp,
  Star,
  MessageSquare,
  Radio,
  FileText,
  Mail,
  BookOpen,
  Award,
  Users,
  LayoutDashboard,
  Briefcase,
  Building,
  ShieldCheck,
  Terminal,
  Plus,
  Info
} from 'lucide-react';
export type { NavItemKey };

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
  onStartCommunity
}) => {
  // Mapping active item to feed or workspace keys
  const isFeedActive = (key: string) => {
    if (activeItem === key) return true;
    if (key === 'HOME' && (activeItem === 'DISCUSSIONS' || activeItem === 'SAVED_ITEMS')) return true;
    if (key === 'MEDIA' && activeItem === 'REAL_ESTATE_MEDIA') return true;
    if (key === 'MARKET_INSIGHTS' && activeItem === 'PROPERTY_INSIGHTS') return true;
    if (key === 'COMMUNITY' && activeItem === 'COMMUNITIES') return true;
    if (key === 'CONFERENCE' && activeItem === 'LIVE_SESSIONS') return true;
    if (key === 'ABOUT' && activeItem === 'ABOUT') return true;
    return false;
  };

  const isWorkspaceActive = (key: string) => {
    if (activeItem === key) return true;
    if (key === 'ADMIN' && activeItem === 'SUPER_ADMIN_CONSOLE') return true;
    if (key === 'DEVELOPER' && activeItem === 'DEVELOPER_DASHBOARD') return true;
    if (key === 'DASHBOARD' && ['MY_PROFILE', 'MY_POSTS', 'MY_QUESTIONS', 'MY_COMMUNITIES', 'MY_ENQUIRIES'].includes(activeItem)) return true;
    if (key === 'PROFESSIONAL' && ['FIND_PROFESSIONALS', 'DEVELOPERS', 'CHANNEL_PARTNERS', 'RERA_PROFESSIONALS'].includes(activeItem)) return true;
    return false;
  };

  const feedsList = [
    { key: 'HOME' as const, label: 'Overview', icon: Home },
    { key: 'MEDIA' as const, label: 'Media & Podcast', icon: Video },
    { key: 'MARKET_INSIGHTS' as const, label: 'Market Trends & Insights', icon: TrendingUp },
    { key: 'REVIEWS' as const, label: 'Review & Rating', icon: Star },
    { key: 'COMMUNITY' as const, label: 'Community Q&A', icon: MessageSquare },
    { key: 'CONFERENCE' as const, label: 'Live & Latest', icon: Radio },
    { key: 'REQUIREMENT' as const, label: 'Property Requirement', icon: FileText },
    { key: 'CONTACT' as const, label: 'Contact & Connect', icon: Mail },
    { key: 'PROGRAMS' as const, label: 'Programs', icon: BookOpen },
    { key: 'TESTIMONIALS' as const, label: 'PS Testimonials', icon: Award },
    { key: 'ABOUT' as const, label: 'About Us', icon: Info }
  ];

  const workspacesList = [
    { key: 'LEADS_MARKET' as const, label: 'Buyer Leads', icon: Users },
    { key: 'DASHBOARD' as const, label: 'Member Dashboard', icon: LayoutDashboard },
    { key: 'PROFESSIONAL' as const, label: 'Professional Workspace', icon: Briefcase },
    { key: 'PROPERTY_ADMIN' as const, label: 'PMO Workspace', icon: Building },
    { key: 'ADMIN' as const, label: 'Admin Console', icon: ShieldCheck },
    { key: 'DEVELOPER' as const, label: 'Developer Diagnostics', icon: Terminal }
  ];

  return (
    <aside className="w-60 xl:w-64 shrink-0 flex flex-col gap-3 text-xs select-none">
      {/* Universal 2-Section Nav Card Matching PDF Pages 7-25 */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-3 shadow-xs">
        {/* SECTION 1: FEEDS */}
        <div className="mb-3">
          <div className="px-3 py-1 text-[11px] font-bold font-display uppercase tracking-wider text-slate-400">
            FEEDS
          </div>
          <nav className="space-y-0.5 mt-1">
            {feedsList.map(item => {
              const Icon = item.icon;
              const active = isFeedActive(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectNav(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#FEF8EC] text-[#B49029] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#B49029]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* SECTION 2: WORKSPACES */}
        <div className="pt-2 border-t border-slate-100">
          <div className="px-3 py-1 text-[11px] font-bold font-display uppercase tracking-wider text-slate-400">
            WORKSPACES
          </div>
          <nav className="space-y-0.5 mt-1">
            {workspacesList.map(item => {
              const Icon = item.icon;
              const active = isWorkspaceActive(item.key);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onSelectNav(item.key)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all duration-150 cursor-pointer ${
                    active
                      ? 'bg-[#FEF8EC] text-[#B49029] font-bold shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-[#B49029]' : 'text-slate-400'}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Quick Community Action */}
      {onStartCommunity && (
        <button
          type="button"
          onClick={onStartCommunity}
          className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-[#B49029] bg-amber-50/40 hover:bg-amber-50 text-[#182A3E] font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer text-xs"
        >
          <Plus className="w-4 h-4 text-[#B49029]" />
          <span>Ask Question / Create Post</span>
        </button>
      )}
    </aside>
  );
};
