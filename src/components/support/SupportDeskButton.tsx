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
      className="fixed bottom-20 md:bottom-6 right-4 sm:right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-2xl border-2 border-amber-400/80 active:scale-95 transition-all group animate-in fade-in slide-in-from-bottom-6 duration-200 cursor-pointer"
      title="Property Studio Official Support Desk & Secretariat"
      aria-label="Official Support Desk"
    >
      <div className="w-7 h-7 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold relative shrink-0">
        <LifeBuoy className="w-4 h-4" />
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-slate-900" />
      </div>

      <div className="text-left hidden sm:block">
        <span className="text-xs font-black tracking-tight block leading-tight text-white group-hover:text-amber-300 transition-colors">
          Support Desk
        </span>
        <span className="text-[10px] text-amber-400/90 font-medium block leading-none">
          Audit · RERA · Desk
        </span>
      </div>

      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 hidden sm:block shrink-0" />
    </button>
  );
};
