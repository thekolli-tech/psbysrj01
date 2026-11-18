import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { parseYouTubeUrl } from '../../shared/mediaParser';
import {
  BookOpen,
  Bookmark,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  Sparkles,
  Video,
  Plus,
  Play,
  Trash2,
  ExternalLink,
  Film
} from 'lucide-react';

export interface ProgramCard {
  id: string;
  category: 'Legal' | 'Site visit' | 'Pricing' | 'Finance';
  tab: 'TIPS' | 'FACTS' | 'DEEP_DIVE';
  readTime: string;
  title: string;
  summary: string;
  steps: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
  isVideo?: boolean;
  authorName?: string;
  createdAt?: string;
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
  const { currentUser, isLoggedIn, showToast } = useApp();

  // ONLY Super Admin has access to video posting feature
  const isSuperAdmin = Boolean(isLoggedIn && currentUser?.role === 'SUPER_ADMIN');

  const [activeTab, setActiveTab] = useState<'TIPS' | 'FACTS' | 'DEEP_DIVE'>('TIPS');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [savedArticles, setSavedArticles] = useState<Set<string>>(new Set());
  const [activeModalArticle, setActiveModalArticle] = useState<ProgramCard | null>(null);

  // Dynamic programs fetched from API & stored
  const [dynamicArticles, setDynamicArticles] = useState<ProgramCard[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('ps_academy_programs_cache');
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    return [];
  });

  // Post Video Modal State (Super Admin Only)
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoCategory, setVideoCategory] = useState<'Legal' | 'Site visit' | 'Pricing' | 'Finance'>('Legal');
  const [videoTab, setVideoTab] = useState<'TIPS' | 'FACTS' | 'DEEP_DIVE'>('TIPS');
  const [videoDuration, setVideoDuration] = useState('5 min watch');
  const [videoSummary, setVideoSummary] = useState('');
  const [videoSteps, setVideoSteps] = useState<string[]>(['']);
  const [videoThumbnailUrl, setVideoThumbnailUrl] = useState('');

  // Fetch dynamic programs from backend on load
  const loadPrograms = async () => {
    try {
      const res = await fetch('/api/programs');
      if (res.ok) {
        const data = await res.json();
        if (data?.programs && Array.isArray(data.programs)) {
          setDynamicArticles(data.programs);
          try {
            localStorage.setItem('ps_academy_programs_cache', JSON.stringify(data.programs));
          } catch {}
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadPrograms();
  }, []);

  // Auto-detect YouTube thumbnail when URL changes
  useEffect(() => {
    if (videoUrl.trim()) {
      const yt = parseYouTubeUrl(videoUrl.trim());
      if (yt.isValid && yt.thumbnailUrl) {
        setVideoThumbnailUrl(yt.maxResThumbnailUrl || yt.thumbnailUrl);
      }
    }
  }, [videoUrl]);

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

  const handleAddStep = () => {
    setVideoSteps(prev => [...prev, '']);
  };

  const handleUpdateStep = (index: number, val: string) => {
    setVideoSteps(prev => {
      const copy = [...prev];
      copy[index] = val;
      return copy;
    });
  };

  const handleRemoveStep = (index: number) => {
    setVideoSteps(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setVideoTitle('');
    setVideoUrl('');
    setVideoCategory('Legal');
    setVideoTab('TIPS');
    setVideoDuration('5 min watch');
    setVideoSummary('');
    setVideoSteps(['']);
    setVideoThumbnailUrl('');
    setIsPostModalOpen(false);
  };

  const handleCreateVideoProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Unauthorized: Only Super Admin can post academy videos.');
      return;
    }
    if (!videoTitle.trim()) {
      showToast('Please enter a video title.');
      return;
    }
    if (!videoUrl.trim()) {
      showToast('Please enter a valid video link.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanSteps = videoSteps.map(s => s.trim()).filter(Boolean);
      const res = await fetch('/api/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: videoTitle.trim(),
          summary: videoSummary.trim(),
          videoUrl: videoUrl.trim(),
          category: videoCategory,
          tab: videoTab,
          readTime: videoDuration.trim() || '5 min watch',
          steps: cleanSteps,
          thumbnailUrl: videoThumbnailUrl.trim()
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to publish video');
      }

      const data = await res.json();
      const newProgram: ProgramCard = data.program || {
        id: `prog_${Date.now()}`,
        title: videoTitle.trim(),
        summary: videoSummary.trim(),
        category: videoCategory,
        tab: videoTab,
        readTime: videoDuration.trim() || '5 min watch',
        steps: cleanSteps,
        videoUrl: videoUrl.trim(),
        thumbnailUrl: videoThumbnailUrl.trim(),
        isVideo: true,
        authorName: currentUser?.name || 'Super Admin',
        createdAt: new Date().toISOString()
      };

      setDynamicArticles(prev => {
        const updated = [newProgram, ...prev];
        try {
          localStorage.setItem('ps_academy_programs_cache', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      showToast('Academy video guide published successfully!');
      resetForm();
    } catch (err: any) {
      showToast(err.message || 'Error publishing video guide');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProgram = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSuperAdmin) return;
    if (!window.confirm('Are you sure you want to delete this academy video?')) return;

    try {
      const res = await fetch(`/api/programs/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDynamicArticles(prev => {
          const updated = prev.filter(p => p.id !== id);
          try {
            localStorage.setItem('ps_academy_programs_cache', JSON.stringify(updated));
          } catch {}
          return updated;
        });
        showToast('Video program deleted.');
      } else {
        showToast('Failed to delete program.');
      }
    } catch {
      showToast('Error deleting program.');
    }
  };

  // Merge dynamic video programs with static articles
  const allArticles = [...dynamicArticles, ...PROGRAM_ARTICLES];

  const filteredArticles = allArticles.filter(item => {
    const matchesTab = item.tab === activeTab;
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesTab && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Matching PDF Page 24 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative z-10 max-w-2xl space-y-2">
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

        {/* Video Posting Button - VISIBLE ONLY ON SUPER ADMIN LOGIN */}
        {isSuperAdmin && (
          <div className="relative z-10 shrink-0">
            <button
              type="button"
              onClick={() => setIsPostModalOpen(true)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#182A3E] hover:bg-[#223954] text-white text-xs font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-lg border border-[#B49029]/40 active:scale-95 group"
              aria-label="Post Academy Video"
            >
              <Video className="w-4 h-4 text-[#B49029] group-hover:scale-110 transition-transform" />
              <span>Post Academy Video</span>
            </button>
          </div>
        )}
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
          const hasVideo = Boolean(article.isVideo || article.videoUrl);

          return (
            <div
              key={article.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Category tag, read/watch time, video badge, save & admin delete */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider">
                      {article.category}
                    </span>
                    {hasVideo && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-[#B49029] border border-amber-200/70 text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-2xs">
                        <Video className="w-3 h-3 text-[#B49029]" />
                        <span>VIDEO GUIDE</span>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                      {hasVideo ? <Play className="w-3 h-3 text-slate-400 fill-slate-400" /> : <Clock className="w-3 h-3 text-slate-400" />}
                      {article.readTime}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Super Admin Delete Button for dynamic programs */}
                    {isSuperAdmin && article.id.startsWith('prog_') && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteProgram(article.id, e)}
                        className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Delete video guide"
                        aria-label="Delete video guide"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}

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
                </div>

                {/* Video Thumbnail Preview (if present) */}
                {hasVideo && article.thumbnailUrl && (
                  <div
                    onClick={() => setActiveModalArticle(article)}
                    className="relative aspect-video w-full rounded-xl overflow-hidden mb-3 bg-slate-900 border border-slate-200 group-hover:border-amber-400/50 transition-colors cursor-pointer"
                  >
                    <img
                      src={article.thumbnailUrl}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/35 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                      <div className="w-11 h-11 rounded-full bg-white/95 text-[#182A3E] flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5 fill-[#182A3E]" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono font-semibold">
                      {article.readTime}
                    </div>
                  </div>
                )}

                {/* Article Title */}
                <h3
                  onClick={() => setActiveModalArticle(article)}
                  className="text-base font-bold text-slate-900 group-hover:text-[#B49029] transition-colors leading-snug cursor-pointer"
                >
                  {article.title}
                </h3>

                {/* Summary */}
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                  {article.summary}
                </p>
              </div>

              {/* Bottom Action: Read / Watch steps button */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setActiveModalArticle(article)}
                  className={`px-4 py-2 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-95 ${
                    hasVideo ? 'bg-[#B49029] hover:bg-[#A99137]' : 'bg-[#182A3E] hover:bg-[#223954]'
                  }`}
                >
                  {hasVideo ? (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Video</span>
                    </>
                  ) : (
                    <>
                      <span>Read steps</span>
                      <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
                    </>
                  )}
                </button>
                <span className="text-[11px] text-slate-400 font-medium">
                  {article.steps.length > 0 ? `${article.steps.length} verified steps` : 'Interactive Guide'}
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

      {/* =========================================================================
          POST ACADEMY VIDEO MODAL (SUPER ADMIN ONLY)
          ========================================================================= */}
      {isPostModalOpen && isSuperAdmin && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => !isSubmitting && resetForm()}
        >
          <div
            className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B49029] text-[10px] font-bold uppercase tracking-wider inline-flex items-center gap-1">
                  <Video className="w-3 h-3 text-[#B49029]" />
                  <span>Super Admin Studio</span>
                </span>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                  Post Academy Video Guide
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish a masterclass, legal walkthrough, or corridor breakdown to PS Academy.
                </p>
              </div>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={resetForm}
                className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-100 cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateVideoProgram} className="space-y-4">
              {/* Video Title */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video Guide Title *
                </label>
                <input
                  type="text"
                  required
                  value={videoTitle}
                  onChange={e => setVideoTitle(e.target.value)}
                  placeholder="e.g. How to scrutinize Encumbrance Certificate (EC) online"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] focus:bg-white"
                />
              </div>

              {/* Video Link */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Video URL (YouTube, Vimeo, MP4 direct) *
                </label>
                <input
                  type="url"
                  required
                  value={videoUrl}
                  onChange={e => setVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] focus:bg-white"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Supports standard YouTube links, Shorts, and MP4 direct videos. Thumbnails auto-detect.
                </p>
              </div>

              {/* Live Preview If Video Thumbnail Detected */}
              {videoThumbnailUrl && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
                  <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-slate-900 shrink-0">
                    <img src={videoThumbnailUrl} alt="Thumbnail preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play className="w-4 h-4 text-white fill-white" />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[11px] font-bold text-slate-800 truncate">Video Preview Ready</div>
                    <div className="text-[10px] text-slate-500 truncate">Thumbnail automatically linked</div>
                  </div>
                </div>
              )}

              {/* Section (Tab) & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Academy Section
                  </label>
                  <select
                    value={videoTab}
                    onChange={e => setVideoTab(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                  >
                    <option value="TIPS">Tips and Techniques</option>
                    <option value="FACTS">Facts and Figures</option>
                    <option value="DEEP_DIVE">Project Deep Dive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Category Pillar
                  </label>
                  <select
                    value={videoCategory}
                    onChange={e => setVideoCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                  >
                    <option value="Legal">Legal</option>
                    <option value="Site visit">Site visit</option>
                    <option value="Pricing">Pricing</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
              </div>

              {/* Duration / Watch Time */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Watch Time Duration
                </label>
                <input
                  type="text"
                  value={videoDuration}
                  onChange={e => setVideoDuration(e.target.value)}
                  placeholder="e.g. 5 min watch or 8:30"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                />
              </div>

              {/* Summary */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Guide Summary & Takeaway *
                </label>
                <textarea
                  required
                  rows={2}
                  value={videoSummary}
                  onChange={e => setVideoSummary(e.target.value)}
                  placeholder="Describe the key guidance and lessons covered in this video masterclass..."
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#B49029] resize-none"
                />
              </div>

              {/* Actionable Steps / Checklist */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Actionable Key Steps (Optional Checklist)
                  </label>
                  <button
                    type="button"
                    onClick={handleAddStep}
                    className="text-[11px] font-bold text-[#B49029] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Step</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {videoSteps.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <input
                        type="text"
                        value={step}
                        onChange={e => handleUpdateStep(idx, e.target.value)}
                        placeholder={`Step ${idx + 1} guidance...`}
                        className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#B49029]"
                      />
                      {videoSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStep(idx)}
                          className="p-1 text-slate-400 hover:text-red-500 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={resetForm}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95 flex items-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Publishing...</span>
                  ) : (
                    <>
                      <Video className="w-4 h-4" />
                      <span>Publish Video Guide</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          READ STEPS & WATCH VIDEO DETAILED MODAL
          ========================================================================= */}
      {activeModalArticle && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setActiveModalArticle(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-5 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B49029] text-[10px] font-bold uppercase tracking-wider">
                    {activeModalArticle.category} · {activeModalArticle.readTime}
                  </span>
                  {activeModalArticle.isVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Film className="w-3 h-3 text-[#B49029]" />
                      <span>VIDEO MASTERCLASS</span>
                    </span>
                  )}
                </div>
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

            {/* Embedded Video Player if this is a video program */}
            {activeModalArticle.videoUrl && (
              <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-md border border-slate-200">
                {(() => {
                  const yt = parseYouTubeUrl(activeModalArticle.videoUrl || '');
                  if (yt.isValid && (yt.videoId || yt.embedUrl)) {
                    const embedSrc = yt.videoId
                      ? `https://www.youtube-nocookie.com/embed/${yt.videoId}?autoplay=1&rel=0`
                      : yt.embedUrl;
                    return (
                      <iframe
                        src={embedSrc}
                        title={activeModalArticle.title}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    );
                  }
                  return (
                    <video
                      src={activeModalArticle.videoUrl}
                      controls
                      autoPlay
                      className="w-full h-full object-contain"
                    />
                  );
                })()}
              </div>
            )}

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              {activeModalArticle.summary}
            </p>

            {/* Steps / Key Takeaways */}
            {activeModalArticle.steps && activeModalArticle.steps.length > 0 && (
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
            )}

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
