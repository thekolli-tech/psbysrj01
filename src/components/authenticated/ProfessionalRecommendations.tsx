import React from 'react';
import { UserCheck, ShieldCheck, Building2, Briefcase, ArrowRight } from 'lucide-react';
import { DEFAULT_AVATAR } from '../../shared/avatar';

interface ProfessionalRecommendationsProps {
  onExploreDirectory?: () => void;
  onConnect?: (professionalName: string) => void;
}

const FEATURED_PROFESSIONALS = [
  {
    id: 'prof-secretariat',
    name: 'Swamy Reddy Javidi',
    role: 'CEO & Real Estate Advisor',
    company: 'Property Studio Secretariat',
    location: 'Secretariat, Hyderabad',
    verified: true,
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'
  }
];

export const ProfessionalRecommendations: React.FC<ProfessionalRecommendationsProps> = ({
  onExploreDirectory,
  onConnect
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#B49029]" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
            Verified Professionals
          </h3>
        </div>
        {onExploreDirectory && (
          <button
            type="button"
            onClick={onExploreDirectory}
            className="text-[11px] font-bold text-[#182A3E] hover:text-[#B49029] transition-colors cursor-pointer"
          >
            Directory
          </button>
        )}
      </div>

      <div className="mt-3 space-y-3">
        {FEATURED_PROFESSIONALS.map(prof => (
          <div key={prof.id} className="flex items-center justify-between gap-3 group">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={prof.avatar}
                alt={prof.name}
                className="w-9 h-9 rounded-full object-cover border border-slate-200/80 shrink-0"
                onError={e => {
                  (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-slate-800 truncate">
                    {prof.name}
                  </span>
                  {prof.verified && (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  )}
                </div>
                <span className="block text-[11px] text-slate-500 truncate">
                  {prof.role}
                </span>
                <span className="block text-[10px] text-slate-400 truncate">
                  {prof.company}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onConnect?.(prof.name)}
              className="px-2.5 py-1 text-[11px] font-bold text-[#182A3E] hover:text-white bg-slate-100 hover:bg-[#182A3E] rounded-lg transition-colors cursor-pointer shrink-0"
            >
              Connect
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
