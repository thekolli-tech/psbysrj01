import React from 'react';
import { LifeBuoy, ShieldCheck } from 'lucide-react';

interface SupportDeskButtonProps {
  onClick: () => void;
  isOpen: boolean;
}

export const SupportDeskButton: React.FC<SupportDeskButtonProps> = ({ onClick, isOpen }) => {
  if (isOpen) return null;

  return (
    <button
      onClick={onClick}
      className="fixed bottom-20 md:bottom-5 right-3.5 sm:right-5 z-40 flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-slate-900/95 hover:bg-slate-900 text-white rounded-full shadow-lg border border-amber-400/80 active:scale-95 transition-all group cursor-pointer backdrop-blur-xs"
      title="Property Studio Official Support Desk & Secretariat"
      aria-label="Official Support Desk"
    >
      <div className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold relative shrink-0">
        <LifeBuoy className="w-3 h-3" />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-400 rounded-full ring-1 ring-slate-900" />
      </div>

      <div className="text-left hidden sm:block">
        <span className="text-[11px] font-bold tracking-tight block leading-tight text-white group-hover:text-amber-300 transition-colors">
          Support Desk
        </span>
        <span className="text-[9px] text-amber-400/90 font-medium block leading-none">
          Audit · RERA · Desk
        </span>
      </div>

      <ShieldCheck className="w-3 h-3 text-amber-400 hidden sm:block shrink-0" />
    </button>
  );
};
