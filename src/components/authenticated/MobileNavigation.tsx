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
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0B]/95 backdrop-blur-md border-t border-[#333337] lg:hidden px-2 pt-1 flex items-center justify-around shadow-2xl"
      style={{
        paddingBottom: 'calc(var(--sab, env(safe-area-inset-bottom, 0px)) + 0.35rem)'
      }}
    >
      <button
        type="button"
        onClick={() => onSelectNav('HOME')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'HOME' ? 'text-[#C5A880]' : 'text-[#A5A5AA] hover:text-white'
        }`}
      >
        <Home className={`w-5 h-5 ${activeItem === 'HOME' ? 'text-[#C5A880]' : ''}`} />
        <span>Home</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('DISCOVER')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'DISCOVER' ? 'text-[#C5A880]' : 'text-[#A5A5AA] hover:text-white'
        }`}
      >
        <Compass className={`w-5 h-5 ${activeItem === 'DISCOVER' ? 'text-[#C5A880]' : ''}`} />
        <span>Discover</span>
      </button>

      {/* Floating Plus CTA */}
      <button
        type="button"
        onClick={onOpenCreate}
        className="flex items-center justify-center -mt-4 w-12 h-12 rounded-full bg-[#121214] text-white shadow-xl border-2 hover:scale-105 active:scale-90 transition-all cursor-pointer shrink-0"
        style={{ borderColor: '#C5A880' }}
        aria-label="Create content"
      >
        <Plus className="w-6 h-6 text-[#C5A880]" />
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('COMMUNITIES')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'COMMUNITIES' ? 'text-[#C5A880]' : 'text-[#A5A5AA] hover:text-white'
        }`}
      >
        <Users className={`w-5 h-5 ${activeItem === 'COMMUNITIES' ? 'text-[#C5A880]' : ''}`} />
        <span>Hubs</span>
      </button>

      <button
        type="button"
        onClick={() => onSelectNav('MY_PROFILE')}
        className={`flex flex-col items-center justify-center min-w-[48px] min-h-[44px] gap-0.5 py-1 px-2 text-[10px] font-bold transition-all active:scale-95 cursor-pointer ${
          activeItem === 'MY_PROFILE' ? 'text-[#C5A880]' : 'text-[#A5A5AA] hover:text-white'
        }`}
      >
        <User className={`w-5 h-5 ${activeItem === 'MY_PROFILE' ? 'text-[#C5A880]' : ''}`} />
        <span>Workspace</span>
      </button>
    </nav>
  );
};
