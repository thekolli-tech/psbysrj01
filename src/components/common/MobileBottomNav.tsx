import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import { isPropertySeeker } from '../../shared/policy';
import {
  Home,
  Building2,
  Users,
  Video,
  LifeBuoy,
  MessageSquare,
  TrendingUp
} from 'lucide-react';

interface MobileBottomNavProps {
  onOpenSupport?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenSupport }) => {
  const { activeView, setActiveView, isLoggedIn, currentUser } = useApp();
  const seeker = isPropertySeeker(currentUser.role);

  const tabs: { view: ViewType | 'SUPPORT'; label: string; icon: React.ReactNode; isSupportAction?: boolean }[] = isLoggedIn && !seeker
    ? [
        {
          view: 'HOME',
          label: 'Home',
          icon: <Home className="w-5 h-5" />
        },
        {
          view: 'PROPERTIES',
          label: 'Projects',
          icon: <Building2 className="w-5 h-5" />
        },
        {
          view: 'LEADS_MARKET',
          label: 'Leads',
          icon: <Users className="w-5 h-5" />
        },
        {
          view: 'MEDIA',
          label: 'Videos',
          icon: <Video className="w-5 h-5" />
        },
        {
          view: 'COMMUNITY',
          label: 'Q&A',
          icon: <MessageSquare className="w-5 h-5" />
        },
        {
          view: 'SUPPORT',
          label: 'Support',
          icon: <LifeBuoy className="w-5 h-5 text-amber-500" />,
          isSupportAction: true
        }
      ]
    : [
        {
          view: 'HOME',
          label: 'Home',
          icon: <Home className="w-5 h-5" />
        },
        {
          view: 'PROPERTIES',
          label: 'Projects',
          icon: <Building2 className="w-5 h-5" />
        },
        {
          view: 'COMMUNITY',
          label: 'Feed',
          icon: <MessageSquare className="w-5 h-5" />
        },
        {
          view: 'MARKET_INSIGHTS',
          label: 'Trends',
          icon: <TrendingUp className="w-5 h-5" />
        },
        {
          view: 'SUPPORT',
          label: 'Support',
          icon: <LifeBuoy className="w-5 h-5 text-amber-500" />,
          isSupportAction: true
        }
      ];

  const gridColsClass = tabs.length === 6 ? 'grid-cols-6' : tabs.length === 5 ? 'grid-cols-5' : 'grid-cols-4';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg px-2 pb-safe no-scrollbar">
      <div className={`grid ${gridColsClass} items-center h-16 max-w-md mx-auto`}>
        {tabs.map(tab => {
          const isActive = tab.view !== 'SUPPORT' && activeView === tab.view;

          const handleClick = () => {
            if (tab.isSupportAction) {
              onOpenSupport?.();
            } else {
              setActiveView(tab.view as ViewType);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          };

          return (
            <button
              key={tab.label}
              onClick={handleClick}
              className={`flex flex-col items-center justify-center py-1 transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
