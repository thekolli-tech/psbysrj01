import React from 'react';
import { Home, Compass, Plus, Users, User } from 'lucide-react';
import { NavItemKey } from './LeftSidebar';

interface MobileNavigationProps {
  activeItem: NavItemKey;
  onSelectNav: (key: NavItemKey) => void;
  onOpenCreate: () => void;
}

export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  activeItem,
  onSelectNav,
  onOpenCreate
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 lg:hidden px-2 pt-1 flex items-center justify-around shadow-lg"
      style={{
        paddingBottom: 'calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 0.35rem)'
      }}
    >
      <button
        type="button"
        onClick={() => onSelectNav('HOME')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'HOME' ? 'text-[#182A3E]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Home className={`w-5 h-5 ${activeItem === 'HOME' ? 'text-[#B49029]' : ''}`} />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('DISCOVER')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'DISCOVER' ? 'text-[#182A3E]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Compass className={`w-5 h-5 ${activeItem === 'DISCOVER' ? 'text-[#B49029]' : ''}`} />
        <span>Discover</span>
      </button>

      {/* Floating Plus CTA */}
      <button
        type="button"
        onClick={onOpenCreate}
        className="flex items-center justify-center -mt-4 w-12 h-12 rounded-full bg-[#182A3E] text-white shadow-xl border-2 border-white hover:scale-105 active:scale-90 transition-all cursor-pointer shrink-0"
        style={{ borderColor: '#B49029' }}
        aria-label="Create content"
      >
        <Plus className="w-6 h-6 text-amber-400" />
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('COMMUNITIES')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'COMMUNITIES' ? 'text-[#182A3E]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Users className={`w-5 h-5 ${activeItem === 'COMMUNITIES' ? 'text-[#B49029]' : ''}`} />
        <span>Hubs</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('MY_PROFILE')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'MY_PROFILE' ? 'text-[#182A3E]' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <User className={`w-5 h-5 ${activeItem === 'MY_PROFILE' ? 'text-[#B49029]' : ''}`} />
        <span>Workspace</span>
      </button>
    </nav>
  );
};
