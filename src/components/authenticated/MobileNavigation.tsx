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
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E8E8E3] lg:hidden px-2 pt-1 flex items-center justify-around shadow-2xl"
      style={{
        paddingBottom: 'calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 0.35rem)'
      }}
    >
      <button
        type="button"
        onClick={() => onSelectNav('HOME')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'HOME' ? 'text-[#B99A24]' : 'text-slate-500 hover:text-[#111111]'
        }`}
      >
        <Home className={`w-5 h-5 ${activeItem === 'HOME' ? 'text-[#B99A24]' : ''}`} />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('DISCOVER')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'DISCOVER' ? 'text-[#B99A24]' : 'text-slate-500 hover:text-[#111111]'
        }`}
      >
        <Compass className={`w-5 h-5 ${activeItem === 'DISCOVER' ? 'text-[#B99A24]' : ''}`} />
        <span>Discover</span>
      </button>

      {/* Floating Plus CTA */}
      <button
        type="button"
        onClick={onOpenCreate}
        className="flex items-center justify-center -mt-4 w-12 h-12 rounded-full bg-[#B99A24] text-[#111111] shadow-xl border-2 border-white hover:scale-105 active:scale-90 transition-all cursor-pointer shrink-0"
        aria-label="Create content"
      >
        <Plus className="w-6 h-6 text-[#111111]" />
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('COMMUNITIES')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'COMMUNITIES' ? 'text-[#B99A24]' : 'text-slate-500 hover:text-[#111111]'
        }`}
      >
        <Users className={`w-5 h-5 ${activeItem === 'COMMUNITIES' ? 'text-[#B99A24]' : ''}`} />
        <span>Hubs</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('MY_PROFILE')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'MY_PROFILE' ? 'text-[#B99A24]' : 'text-slate-500 hover:text-[#111111]'
        }`}
      >
        <User className={`w-5 h-5 ${activeItem === 'MY_PROFILE' ? 'text-[#B99A24]' : ''}`} />
        <span>Workspace</span>
      </button>
    </nav>
  );
};
