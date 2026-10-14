import React from 'react';
import { useApp } from '../../context/AppContext';
import { Building2, ShieldCheck, ArrowRight, Mail } from 'lucide-react';

export const BecomePropertyAdminBanner: React.FC = () => {
  const { setActiveView } = useApp();

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -left-12 -top-12 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            OFFICIAL PMO WORKSPACE ACCREDITATION
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
            Want to become a Property Admin?
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Public self-registration is strictly disabled. Real estate developer PMOs, site directors, and project engineers can apply for official scoped verification. Applications are vetted and processed at <span className="font-mono text-amber-300 font-semibold">info@propertystudio.org</span>.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 relative z-10">
          <button
            onClick={() => {
              setActiveView('CONTACT');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            <Building2 className="w-4 h-4" />
            <span>Apply for Property Admin Scope</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="mailto:info@propertystudio.org?subject=Property%20Admin%20Inquiry"
            className="px-4 py-3.5 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Mail className="w-4 h-4 text-slate-400" />
            <span>Email info@propertystudio.org</span>
          </a>
        </div>
      </div>
    </section>
  );
};
