import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import { linkedEndUserNavigation } from '../../shared/endUserNavigation';
import {
  Home,
  Video,
  TrendingUp,
  MessageSquare,
  Radio,
  Phone,
  Star,
  ClipboardList
} from 'lucide-react';

const ICONS: Record<string, React.ReactNode> = {
  HOME: <Home className="w-5 h-5" />,
  MEDIA: <Video className="w-5 h-5" />,
  MARKET_INSIGHTS: <TrendingUp className="w-5 h-5" />,
  COMMUNITY: <MessageSquare className="w-5 h-5" />,
  REVIEWS: <Star className="w-5 h-5" />,
  CONFERENCE: <Radio className="w-5 h-5" />,
  REQUIREMENT: <ClipboardList className="w-5 h-5" />,
  CHAT: <Phone className="w-5 h-5" />
};

interface MobileBottomNavProps {
  onOpenLoginModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onOpenLoginModal }) => {
  const { activeView, setActiveView, isLoggedIn } = useApp();
  const tabs = linkedEndUserNavigation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-1 pb-safe no-scrollbar">
      <div className="grid grid-cols-4 items-center min-h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = activeView === tab.view;

          return (
            <button
              key={tab.key}
              onClick={() => {
                if (tab.view === 'COMMUNITY' && !isLoggedIn) {
                  onOpenLoginModal?.();
                  return;
                }
                setActiveView(tab.view as ViewType);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label={tab.label}
              className={`flex flex-col items-center justify-center py-1 px-0.5 transition-colors relative cursor-pointer ${
                isActive
                  ? 'text-amber-600 font-bold'
                  : 'text-slate-500 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative">
                {ICONS[tab.view]}
                {isActive && (
                  <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
                )}
              </div>
              <span className="text-[9px] mt-0.5 tracking-tight text-center leading-tight line-clamp-2">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
