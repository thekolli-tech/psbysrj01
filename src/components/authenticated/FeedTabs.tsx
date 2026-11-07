import React from 'react';
import { Sparkles, Users, Clock, Flame } from 'lucide-react';

export type FeedTabType = 'FOR_YOU' | 'FOLLOWING' | 'LATEST' | 'TRENDING';

interface FeedTabsProps {
  activeTab: FeedTabType;
  onTabChange: (tab: FeedTabType) => void;
  followingCount?: number;
}

export const FeedTabs: React.FC<FeedTabsProps> = ({
  activeTab,
  onTabChange,
  followingCount = 0
}) => {
  const tabs = [
    { id: 'FOR_YOU' as const, label: 'For You', icon: Sparkles },
    { id: 'FOLLOWING' as const, label: 'Following', icon: Users, badge: followingCount > 0 ? followingCount : undefined },
    { id: 'LATEST' as const, label: 'Latest', icon: Clock },
    { id: 'TRENDING' as const, label: 'Trending', icon: Flame }
  ];

  return (
    <div className="flex items-center gap-1 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs px-2 sm:px-4 pt-1 rounded-t-2xl">
      {tabs.map(tab => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`group relative flex items-center gap-2 px-3 sm:px-4 py-3 text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
              isActive
                ? 'text-[#182A3E] font-bold'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-xl'
            }`}
          >
            <Icon
              className={`w-4 h-4 transition-colors ${
                isActive ? 'text-[#B49029]' : 'text-slate-400 group-hover:text-slate-600'
              }`}
            />
            <span>{tab.label}</span>

            {typeof tab.badge === 'number' && (
              <span className="text-[10px] px-1.5 py-0.2 bg-amber-500/10 text-amber-700 font-bold rounded-full border border-amber-500/20">
                {tab.badge}
              </span>
            )}

            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#182A3E]"
                style={{ backgroundColor: '#182A3E' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
};
