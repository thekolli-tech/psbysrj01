import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building,
  TrendingUp,
  FileCheck,
  ChevronRight,
  X,
  Search,
  Sparkles
} from 'lucide-react';

interface ProgramCard {
  id: string;
  category: 'Legal' | 'Site visit' | 'Pricing' | 'Finance';
  tab: 'TIPS' | 'FACTS' | 'DEEP_DIVE';
  readTime: string;
  title: string;
  summary: string;
  steps: string[];
}

const PROGRAM_ARTICLES: ProgramCard[] = [
  {
    id: 'prog-1',
    category: 'Legal',
    tab: 'TIPS',
    readTime: '4 min read',
    title: 'How to verify a RERA registration',
    summary: 'Check that the project is registered and the details match what you were shown.',
    steps: [
      'Visit the official RERA portal (rera.telangana.gov.in) and locate the Project Registration search tab.',
      'Enter the RERA registration number provided by the promoter or agent (format: P0240000XXXX).',
      'Examine the approved building sanction drawings, commencement certificate, and the scheduled possession date.',
      'Verify the designated 70% Escrow bank account where customer remittances must be deposited.',
      'Check for any litigation, encumbrance certificates, or show-cause notices recorded against the developer.'
    ]
  },
  {
    id: 'prog-2',
    category: 'Site visit',
    tab: 'TIPS',
    readTime: '3 min read',
    title: 'Site visit checklist',
    summary: 'What to look at when you walk the site, and what to record.',
    steps: [
      'Inspect physical access: Measure approach road width (minimum 36m for high-rises in Neopolis/Tellapur).',
      'Verify active construction machinery: Check tower cranes, concrete batching plants, and safety nets.',
      'Examine soil and water table conditions: Note excavation depth and surrounding drainage channels.',
      'Measure tower-to-tower separation: Ensure minimum 12m-18m spacing as per sanctioned master plan.',
      'Record geo-tagged photos and date stamps for every milestone claimed in developer newsletters.'
    ]
  },
  {
    id: 'prog-3',
    category: 'Pricing',
    tab: 'TIPS',
    readTime: '3 min read',
    title: 'Carpet area versus super built-up area',
    summary: 'Compare prices on the same basis before you decide.',
    steps: [
      'Demand the exact RERA Carpet Area (net usable floor area excluding external walls and service shafts).',
      'Calculate loading percentage: Typical Hyderabad high-rise loading ranges between 24% and 29%.',
      'Compare price per sq.ft strictly against Carpet Area to normalize comparisons between developers.',
      'Identify additional charges: Car parking allotment (₹3-5L per bay), club membership, and advance maintenance.',
      'Ensure GST (5% on residential under-construction) and registration stamp duty (7.5%) are factored in total cost.'
    ]
  },
  {
    id: 'prog-4',
    category: 'Legal',
    tab: 'TIPS',
    readTime: '5 min read',
    title: 'Reading a sale agreement',
    summary: 'The clauses worth slowing down for before you sign.',
    steps: [
      'Scrutinize the default and delay compensation clause: Must adhere to SBI MCLR + 2% per RERA rules.',
      'Check specification change clauses: The promoter cannot alter layout or unit plans without 2/3rd buyer consent.',
      'Review force majeure definitions: Ensure broad vague exceptions (e.g. general market delays) are excluded.',
      'Confirm car parking allocation is clearly demarcated by basement level and slot number.',
      'Verify that undivided share of land (UDS) is clearly specified in square yards on the agreement schedule.'
    ]
  },
  {
    id: 'prog-5',
    category: 'Finance',
    tab: 'TIPS',
    readTime: '4 min read',
    title: 'Home loan basics for buyers',
    summary: 'Questions to ask lenders and costs to plan for.',
    steps: [
      'Check Approved Project Financial (APF) code from major nationalized and leading private banks.',
      'Compare Repo Linked Lending Rate (RLLR) margins between public sector and private housing finance firms.',
      'Choose between Pre-EMI (paying interest only on disbursed tranches) vs Full EMI from day one.',
      'Understand statutory pre-closure terms: Floating rate home loans have zero prepayment penalty.',
      'Budget for Franking, legal scrutiny charges, and administrative verification fees (typically ₹15,000–₹35,000).'
    ]
  },
  {
    id: 'prog-6',
    category: 'Pricing',
    tab: 'TIPS',
    readTime: '3 min read',
    title: 'Negotiating with developers',
    summary: 'Know the market, ask what is included and get it in writing.',
    steps: [
      'Benchmark against latest registration values recorded in Kokapet, Neopolis, and Tellapur sub-registrar offices.',
      'Negotiate floor-rise charges (FRC): Often developers waive floor rise between floors 10 and 25 during launches.',
      'Seek complimentary car parking or club membership upgrades instead of direct price cuts if rates are fixed.',
      'Tie installment disbursements to verified physical milestone certificates audited by an independent structural engineer.',
      'Never rely on verbal commitments: Insist that all agreed customizations appear in the annexure to the agreement.'
    ]
  },
  {
    id: 'prog-7',
    category: 'Pricing',
    tab: 'FACTS',
    readTime: '4 min read',
    title: 'Neopolis Land Auction Milestones & Economics',
    summary: 'Historical land prices, FSI regulations, and how they define end-consumer apartment pricing.',
    steps: [
      'HMDA Neopolis Phase 1 auction peaked at ₹100.75 Cr/acre, setting an infrastructure floor for the corridor.',
      'High-rise density permits unlimited FSI with 55m setback requirements for towers exceeding 40 floors.',
      'Base construction cost in Neopolis currently averages ₹3,800 to ₹4,500 per sq.ft for high-speed aluminum formwork.',
      'Land component amortized per saleable square foot equals approximately ₹4,200 to ₹5,500/sq.ft.'
    ]
  },
  {
    id: 'prog-8',
    category: 'Site visit',
    tab: 'DEEP_DIVE',
    readTime: '6 min read',
    title: 'Financial District to Tellapur Corridor Connectivity Deep Dive',
    summary: 'Detailed timeline of the 100-foot Radial Road, flyover expansions, and ORR junction flyovers.',
    steps: [
      'Tellapur-Nallagandla flyover decongestion roadmap: 85% land acquisition complete.',
      'Radial Road 7 widening connecting ORR Exit 1 and Exit 2 to Neopolis Trumpet interchange.',
      'Upcoming Metro Phase 2 connecting Airport Express via Financial District to Gachibowli.'
    ]
  }
];

export const ProgramsView: React.FC = () => {
  const { showToast } = useApp();
  const [activeTab, setActiveTab] = useState<'TIPS' | 'FACTS' | 'DEEP_DIVE'>('TIPS');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
  const [activeModalArticle, setActiveModalArticle] = useState<ProgramCard | null>(null);

  const toggleSave = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedArticles(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        showToast('Removed from saved programs.');
      } else {
        next.add(id);
        showToast('Saved to your workspace!');
      }
      return next;
    });
  };

  const filteredArticles = PROGRAM_ARTICLES.filter(item => {
    const matchesTab = item.tab === activeTab;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesTab && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Matching PDF Page 24 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#B49029] text-[11px] font-bold uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-[#B49029]" />
            <span>Programs · PS ACADEMY</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
            Programs <span className="text-[#B49029]">PS ACADEMY</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Practical guidance, corridor facts and project breakdowns from Property Studio.
          </p>
        </div>
      </div>

      {/* Primary Subtabs: Tips and Techniques | Facts and Figures | Project Deep Dive */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-3">
        {[
          { key: 'TIPS' as const, label: 'Tips and Techniques' },
          { key: 'FACTS' as const, label: 'Facts and Figures' },
          { key: 'DEEP_DIVE' as const, label: 'Project Deep Dive' }
        ].map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.key
                ? 'bg-[#182A3E] text-white shadow-xs'
                : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Category Filter Pills: All | Legal | Site visit | Pricing | Finance */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Legal', 'Site visit', 'Pricing', 'Finance'].map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#B49029] text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 2-Column Responsive Card Grid Matching PDF Page 24 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArticles.map(article => {
          const isSaved = savedArticles.has(article.id);
          return (
            <div
              key={article.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Category tag, read time, save button */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {article.category}
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {article.readTime}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => toggleSave(article.id, e)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSaved
                        ? 'bg-amber-50 text-[#B49029] border-amber-300'
                        : 'bg-white text-slate-400 hover:text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                    title={isSaved ? 'Saved' : 'Save guide'}
                    aria-label="Save guide"
                  >
                    <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-current text-[#B49029]' : ''}`} />
                  </button>
                </div>

                {/* Article Title */}
                <h3 className="text-base font-bold text-slate-900 group-hover:text-[#B49029] transition-colors leading-snug">
                  {article.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              {/* Bottom Action: Read steps button */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveModalArticle(article)}
                  className="px-4 py-2 bg-[#182A3E] hover:bg-[#223954] text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95"
                >
                  <span>Read steps</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  {article.steps.length} verified steps
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredArticles.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs space-y-3">
          <BookOpen className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No academy guides found</h3>
          <p className="text-xs text-slate-500">
            Try choosing a different category or exploring our Tips and Techniques.
          </p>
        </div>
      )}

      {/* Read Steps Detailed Modal */}
      {activeModalArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveModalArticle(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B49029] text-[10px] font-bold uppercase tracking-wider">
                  {activeModalArticle.category} · {activeModalArticle.readTime}
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-2">
                  {activeModalArticle.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalArticle(null)}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {activeModalArticle.summary}
            </p>

            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-display">
                Actionable Execution Steps
              </h4>
              <div className="space-y-2.5">
                {activeModalArticle.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700">
                    <span className="w-5 h-5 rounded-full bg-[#182A3E] text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="leading-relaxed">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Audited by Property Studio Secretariat
              </span>
              <button
                type="button"
                onClick={() => setActiveModalArticle(null)}
                className="px-5 py-2 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
