import React from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import { BrandLogo } from './BrandLogo';
import { Lock, Sparkles, LogIn, ArrowRight, ArrowLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface AuthRequiredCardProps {
  view: ViewType;
  onOpenLoginModal: () => void;
}

export const AuthRequiredCard: React.FC<AuthRequiredCardProps> = ({
  view,
  onOpenLoginModal
}) => {
  const { setActiveView } = useApp();

  const getDetails = (v: ViewType) => {
    switch (v) {
      case 'COMMUNITY':
        return {
          title: 'Community Q&A & Unbiased Forums',
          subtitle: 'Member-Only Interactive Discussions',
          description:
            'Threaded discussions, uncensored project Q&A, and builder quality ratings are reserved for verified members to prevent spam and preserve due diligence integrity.',
          perks: ['Upvote & downvote peer reviews', 'Ask uncensored construction queries', 'Builder delivery timeline ratings']
        };
      case 'MEDIA':
        return {
          title: 'Media Engine & Masterclasses',
          subtitle: 'Executive Video Network',
          description:
            'Full structural audit masterclasses, managing director video interviews, and high-resolution video streams are accessible exclusively after logging in.',
          perks: ['Stream 4K structural audits', 'Download engineering whitepapers', 'Timestamped masterclass keynotes']
        };
      case 'LEADS_MARKET':
        return {
          title: 'Sanitized Buyer Lead Marketplace',
          subtitle: 'Accredited Lead Intelligence',
          description:
            'Access to high-intent buyer leads across Kokapet, Neopolis, and the Financial District requires a verified agent or developer login.',
          perks: ['Tiered lead intelligence (Standard, Premium, HNI)', 'Instant wallet credit unlocking', 'Direct RERA-compliant contact details']
        };
      case 'CONFERENCE':
        return {
          title: 'Live Corporate Summit & IFP Pitch Deck',
          subtitle: 'Interactive Investor Stream',
          description:
            'Interactive participation in live project launches, executive slide decks, live Q&A, and live polling is restricted to registered accounts.',
          perks: ['Live attendee chat & Q&A polling', 'Dynamic slide deck broadcast', 'Direct developer investor inquiries']
        };
      default:
        return {
          title: 'Member Access Required',
          subtitle: 'Portal Authentication',
          description: 'This section is exclusively available to authenticated members.',
          perks: ['Interactive community mechanics', 'Real-time project intelligence', 'Direct expert advice']
        };
    }
  };

  const details = getDetails(view);

  return (
    <div className="max-w-2xl mx-auto my-12 px-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-8 sm:p-10 text-center space-y-6">
        <BrandLogo variant="compact" size="xl" className="mx-auto" />
        {/* Lock Emblem */}
        <div className="relative w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-600">
          <Lock className="w-8 h-8 text-amber-600" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5" />
          </div>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-amber-400 text-[11px] font-bold uppercase tracking-wider font-mono">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{details.subtitle}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            {details.title}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            {details.description}
          </p>
        </div>

        {/* Member Perks Checklist */}
        <div className="bg-slate-50 rounded-2xl p-4 sm:p-5 border border-slate-200/80 text-left space-y-2.5 max-w-md mx-auto">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
            Included with Member Login:
          </div>
          {details.perks.map((perk, idx) => (
            <div key={idx} className="flex items-center gap-2.5 text-xs font-semibold text-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{perk}</span>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={onOpenLoginModal}
            className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-slate-900/15 active:scale-95 transition-all cursor-pointer"
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Login / Sign Up to Unlock</span>
            <ArrowRight className="w-4 h-4 ml-1 text-slate-400" />
          </button>

          <button
            onClick={() => {
              setActiveView('HOME');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="w-full sm:w-auto px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Overview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
