import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle, Info } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast } = useApp();

  if (!toast) return null;

  return (
    <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-200 max-w-md">
      <CheckCircle className="w-5 h-5 text-amber-400 shrink-0" />
      <span className="text-sm font-medium leading-snug">{toast}</span>
    </div>
  );
};
