import React from 'react';
import { Radio, Calendar, Clock, Video, ArrowRight } from 'lucide-react';

interface UpcomingLiveSessionsProps {
  onJoinSession?: () => void;
}

export const UpcomingLiveSessions: React.FC<UpcomingLiveSessionsProps> = ({
  onJoinSession
}) => {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-rose-500 animate-pulse" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
            Upcoming Live Sessions
          </h3>
        </div>
        <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
          Scheduled
        </span>
      </div>

      <div className="mt-3 space-y-3">
        <div className="p-3 bg-gradient-to-br from-slate-50 to-amber-50/40 rounded-xl border border-slate-200/80 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Calendar className="w-3 h-3 text-[#B49029]" />
              This Thursday, 5:00 PM IST
            </span>
            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded text-[9px]">
              Expert AMA
            </span>
          </div>

          <h4 className="text-xs font-bold text-slate-900 leading-snug">
            Neopolis High-Rise Mastery: Construction Milestones & ROI Analysis
          </h4>

          <p className="text-[11px] text-slate-600 line-clamp-2">
            Interactive live briefing with structural leads and RERA compliance advisors.
          </p>

          <button
            type="button"
            onClick={onJoinSession}
            className="w-full mt-1 py-1.5 px-3 bg-[#182A3E] hover:bg-[#203750] text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Video className="w-3.5 h-3.5 text-amber-400" />
            <span>Join Broadcast Room</span>
          </button>
        </div>
      </div>
    </div>
  );
};
