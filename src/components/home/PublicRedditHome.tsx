import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { DiscussionCard } from '../authenticated/DiscussionCard';
import { QuestionCard } from '../authenticated/QuestionCard';
import { DiscussionDetailView } from '../community/DiscussionDetailView';
import { BrandLogo } from '../common/BrandLogo';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { CommunityPost } from '../../types';
import {
  Flame,
  Clock,
  Sparkles,
  Building,
  Users,
  MessageSquare,
  ShieldCheck,
  TrendingUp,
  Search,
  ArrowRight,
  LifeBuoy,
  Phone,
  Mail,
  ChevronRight,
  Radio,
  ExternalLink,
  MapPin,
  Lock,
  Compass
} from 'lucide-react';

interface PublicRedditHomeProps {
  onOpenLoginModal: () => void;
  onOpenSupport?: () => void;
}

type FeedFilterTab = 'BEST' | 'LATEST' | 'TRENDING';

const CATEGORY_CHIPS = [
  'ALL',
  'Property Discussions',
  'Property Q&A',
  'Market Trends',
  'Construction Updates',
  'Legal & RERA',
  'Project Announcements',
  'Media'
];

export const PublicRedditHome: React.FC<PublicRedditHomeProps> = ({
  onOpenLoginModal,
  onOpenSupport
}) => {
  const {
    communityPosts = [],
    communities = [],
    properties = [],
    marketTrends = [],
    currentUser,
    isLoggedIn,
    showToast,
    refreshPosts,
    repostDiscussion,
    setActiveView
  } = useApp();

  const [activeSort, setActiveSort] = useState<FeedFilterTab>('BEST');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Search autocomplete suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const suggestions: Array<{ type: 'post' | 'community' | 'project'; id: string; title: string; subtitle?: string }> = [];

    // Match communities
    communities.forEach(c => {
      if (c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q)) {
        suggestions.push({ type: 'community', id: c.id, title: c.name, subtitle: `${c.memberCount || 0} members · Community` });
      }
    });

    // Match discussions / posts
    communityPosts.forEach(p => {
      if (p.title.toLowerCase().includes(q) || p.content.toLowerCase().includes(q)) {
        suggestions.push({ type: 'post', id: p.id, title: p.title, subtitle: `By ${p.authorName} · Discussion` });
      }
    });

    // Match properties
    properties.forEach(prop => {
      if (prop.title.toLowerCase().includes(q) || prop.location.toLowerCase().includes(q)) {
        suggestions.push({ type: 'project', id: prop.id, title: prop.title, subtitle: `${prop.location} · Verified Development` });
      }
    });

    return suggestions.slice(0, 6);
  }, [searchQuery, communities, communityPosts, properties]);

  // Filtered & Sorted Feed
  const filteredPosts = useMemo(() => {
    let list = [...communityPosts];

    // Filter by category chip
    if (selectedCategory !== 'ALL') {
      if (selectedCategory === 'Property Discussions') {
        list = list.filter(p => !p.postType || p.postType === 'POST' || (p.postType as string) === 'DISCUSSION');
      } else if (selectedCategory === 'Property Q&A') {
        list = list.filter(p => p.postType === 'QUESTION');
      } else if (selectedCategory === 'Market Trends') {
        list = list.filter(p => p.topic?.toLowerCase().includes('trend') || p.topic?.toLowerCase().includes('yield') || p.title?.toLowerCase().includes('trend'));
      } else if (selectedCategory === 'Construction Updates') {
        list = list.filter(p => p.topic?.toLowerCase().includes('construction') || p.title?.toLowerCase().includes('construction'));
      } else if (selectedCategory === 'Legal & RERA') {
        list = list.filter(p => p.topic?.toLowerCase().includes('rera') || p.topic?.toLowerCase().includes('legal') || p.title?.toLowerCase().includes('rera'));
      } else if (selectedCategory === 'Project Announcements') {
        list = list.filter(p => p.topic?.toLowerCase().includes('project') || p.topic?.toLowerCase().includes('announcement') || Boolean(p.propertyId));
      } else if (selectedCategory === 'Media') {
        list = list.filter(p => p.mediaType === 'VIDEO' || p.mediaType === 'PODCAST' || Boolean(p.mediaUrl));
      }
    }

    // Sort
    if (activeSort === 'BEST') {
      list.sort((a, b) => ((b.upvotes || 0) + (b.commentsCount || 0) * 2) - ((a.upvotes || 0) + (a.commentsCount || 0) * 2));
    } else if (activeSort === 'LATEST') {
      list.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } else if (activeSort === 'TRENDING') {
      list.sort((a, b) => ((b.commentsCount || 0) * 3 + (b.upvotes || 0)) - ((a.commentsCount || 0) * 3 + (a.upvotes || 0)));
    }

    return list;
  }, [communityPosts, selectedCategory, activeSort]);

  // Trending discussions for right sidebar
  const trendingDiscussions = useMemo(() => {
    return [...communityPosts]
      .sort((a, b) => ((b.commentsCount || 0) * 2 + (b.upvotes || 0)) - ((a.commentsCount || 0) * 2 + (a.upvotes || 0)))
      .slice(0, 4);
  }, [communityPosts]);

  // Real communities from DB for discovery sidebar
  const activeCommunities = useMemo(() => {
    return communities.filter(c => c.status === 'APPROVED' || !c.status).slice(0, 5);
  }, [communities]);

  const handleActionRequiringAuth = (actionName: string) => {
    showToast(`Please sign in or join to ${actionName}.`);
    onOpenLoginModal();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans w-full">
      {/* 
        ====================================================================
        MAIN 3-COLUMN REDDIT-INSPIRED PUBLIC LAYOUT
        ====================================================================
      */}
      <main className="flex-1 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 w-full">
        <div className="flex items-start justify-center gap-6">
          {/* 
            ----------------------------------------------------------------
            COLUMN 1: LEFT JOIN PROPERTY STUDIO PANEL (~270px)
            ----------------------------------------------------------------
          */}
          <aside className="hidden lg:block w-[270px] shrink-0 sticky top-20 space-y-4">
            {/* Registration Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs text-slate-800 space-y-4">
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60 text-[10px] font-bold font-mono">
                  <Sparkles className="w-3 h-3 text-[#B49029]" />
                  <span>COMMUNITY ACCESS</span>
                </div>
                <h3 className="text-base font-black text-[#182A3E] font-display leading-snug">
                  Your real estate network starts here.
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Discover verified developments, exchange property insights, connect with professionals and participate in real estate communities.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-1">
                {/* Continue with Phone / WhatsApp OTP */}
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="w-full py-2.5 px-3 bg-[#182A3E] hover:bg-[#223953] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#B49029]" />
                  <span>Continue with Phone / OTP</span>
                </button>

                {/* Continue with Google */}
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Continue with Email */}
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="w-full py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>Continue with Email</span>
                </button>
              </div>

              {/* Terms & Privacy */}
              <p className="text-[10px] text-slate-400 text-center leading-normal pt-1">
                By continuing, you agree to our{' '}
                <button
                  type="button"
                  onClick={() => setActiveView('TERMS')}
                  className="text-slate-600 hover:underline cursor-pointer"
                >
                  Terms
                </button>{' '}
                and acknowledge our{' '}
                <button
                  type="button"
                  onClick={() => setActiveView('PRIVACY')}
                  className="text-slate-600 hover:underline cursor-pointer"
                >
                  Privacy Policy
                </button>
                .
              </p>
            </div>

            {/* Promotional Brand Card */}
            <div className="bg-gradient-to-br from-[#182A3E] to-[#0A1624] text-white rounded-2xl p-4.5 border border-[#B49029]/20 shadow-md space-y-3 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-15 bg-cover bg-center pointer-events-none"
                style={{
                  backgroundImage: "url('https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=80')"
                }}
              />
              <div className="relative z-10 space-y-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#B49029]" />
                  <span className="text-xs font-black tracking-wide uppercase font-mono text-[#CEC8A2]">
                    Verified TS-RERA Ecosystem
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Real-time builder updates, regulatory due diligence and anonymous buyer enquiries across Hyderabad.
                </p>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#B49029]">
                  <span>CEO Swamy Reddy Javidi</span>
                  <span className="text-emerald-400">● 100% Verified</span>
                </div>
              </div>
            </div>
          </aside>

          {/* 
            ----------------------------------------------------------------
            COLUMN 2: CENTER PUBLIC DISCUSSION FEED (650–700px)
            ----------------------------------------------------------------
          */}
          <section className="flex-1 min-w-0 max-w-2xl xl:max-w-3xl space-y-4">
            {/* If a discussion is selected, render DiscussionDetailView directly */}
            {selectedPostId ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-6 shadow-xs">
                <DiscussionDetailView
                  postId={selectedPostId}
                  onBack={() => setSelectedPostId(null)}
                  currentUser={currentUser}
                  isLoggedIn={isLoggedIn}
                  onOpenLoginModal={onOpenLoginModal}
                  allPosts={communityPosts}
                  showToast={showToast}
                  refreshPosts={refreshPosts}
                  repostDiscussion={repostDiscussion}
                />
              </div>
            ) : (
              <>
                {/* Reddit-style Filter Bar: Best / Latest / Trending */}
                <div className="bg-white rounded-2xl border border-slate-200/90 p-2 sm:p-3 shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  {/* Sort Tabs */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveSort('BEST')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeSort === 'BEST'
                          ? 'bg-white text-[#182A3E] shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Sparkles className={`w-3.5 h-3.5 ${activeSort === 'BEST' ? 'text-[#B49029]' : 'text-slate-400'}`} />
                      <span>Best</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSort('LATEST')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeSort === 'LATEST'
                          ? 'bg-white text-[#182A3E] shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Clock className={`w-3.5 h-3.5 ${activeSort === 'LATEST' ? 'text-[#B49029]' : 'text-slate-400'}`} />
                      <span>Latest</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveSort('TRENDING')}
                      className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                        activeSort === 'TRENDING'
                          ? 'bg-white text-[#182A3E] shadow-xs font-black'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Flame className={`w-3.5 h-3.5 ${activeSort === 'TRENDING' ? 'text-amber-500' : 'text-slate-400'}`} />
                      <span>Trending</span>
                    </button>
                  </div>

                  {/* Public Feed Counter */}
                  <div className="text-xs text-slate-500 font-mono hidden sm:flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{filteredPosts.length} Public Discussions</span>
                  </div>
                </div>

                {/* Horizontal Category Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                  {CATEGORY_CHIPS.map(cat => {
                    const isSelected = selectedCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[#182A3E] text-white shadow-xs font-bold'
                            : 'bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200/80'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Feed Items */}
                {filteredPosts.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3">
                    <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
                    <h4 className="text-sm font-bold text-slate-800">No discussions match this category</h4>
                    <p className="text-xs text-slate-500">
                      Be the first to start a conversation in this topic.
                    </p>
                    <button
                      type="button"
                      onClick={onOpenLoginModal}
                      className="px-4 py-2 bg-[#182A3E] text-white rounded-xl text-xs font-bold hover:bg-[#203750] transition-colors cursor-pointer"
                    >
                      Sign In to Post
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {filteredPosts.map(post => {
                      if (post.postType === 'QUESTION') {
                        return (
                          <QuestionCard
                            key={post.id}
                            post={post}
                            onOpenDetail={postId => setSelectedPostId(postId)}
                            onUpvote={() => handleActionRequiringAuth('upvote this question')}
                            onBookmark={() => handleActionRequiringAuth('bookmark this question')}
                          />
                        );
                      }

                      return (
                        <DiscussionCard
                          key={post.id}
                          post={post}
                          onOpenDetail={postId => setSelectedPostId(postId)}
                          onUpvote={() => handleActionRequiringAuth('upvote this discussion')}
                          onBookmark={() => handleActionRequiringAuth('save this discussion')}
                          onShare={p => {
                            if (navigator.share) {
                              navigator.share({ title: p.title, text: p.content, url: window.location.href });
                            } else {
                              navigator.clipboard?.writeText(window.location.href);
                              showToast(`Discussion link copied: ${p.title}`);
                            }
                          }}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </section>

          {/* 
            ----------------------------------------------------------------
            COLUMN 3: RIGHT CONTEXTUAL DISCOVERY SIDEBAR (~290px)
            ----------------------------------------------------------------
          */}
          <aside className="hidden xl:flex flex-col gap-4 w-[290px] shrink-0 sticky top-20">
            {/* Discover Property Communities */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#B49029]" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono">
                    Discover Communities
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  className="text-[11px] font-bold text-[#B49029] hover:underline cursor-pointer"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2.5 pt-1">
                {activeCommunities.length === 0 ? (
                  <p className="text-xs text-slate-400">Loading communities...</p>
                ) : (
                  activeCommunities.map(c => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between gap-2 p-2 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#182A3E] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          {c.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs text-slate-900 truncate">
                            {c.name}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            {c.memberCount || 1} members
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={onOpenLoginModal}
                        className="px-3 py-1 bg-[#182A3E] hover:bg-[#203750] text-white rounded-full text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
                      >
                        Join
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trending Discussions */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-500" />
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono">
                  Trending Discussions
                </h4>
              </div>

              <div className="space-y-2.5">
                {trendingDiscussions.map((t, idx) => (
                  <div
                    key={t.id}
                    onClick={() => setSelectedPostId(t.id)}
                    className="group p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer space-y-1"
                  >
                    <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                      <span>#{idx + 1}</span>
                      <span>•</span>
                      <span className="truncate">{t.topic || 'General'}</span>
                    </div>
                    <h5 className="font-semibold text-xs text-slate-900 group-hover:text-[#B49029] transition-colors line-clamp-2 leading-snug">
                      {t.title}
                    </h5>
                    <div className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                      <span>{t.commentsCount || 0} comments</span>
                      <span>•</span>
                      <span>{t.upvotes || 0} upvotes</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Market Insights Box */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider font-mono">
                    Market Insights
                  </h4>
                </div>
                <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Hyderabad
                </span>
              </div>

              <div className="space-y-2 text-xs">
                {[
                  { locality: 'Kokapet & Neopolis', trend: '+14.2% YoY', avgPrice: '₹12,500/sq.ft' },
                  { locality: 'Financial District', trend: '+11.8% YoY', avgPrice: '₹13,200/sq.ft' },
                  { locality: 'Tellapur & Kollur', trend: '+9.4% YoY', avgPrice: '₹7,800/sq.ft' },
                  { locality: 'Gachibowli Tech Belt', trend: '+8.1% YoY', avgPrice: '₹10,900/sq.ft' }
                ].map(loc => (
                  <div key={loc.locality} className="flex items-center justify-between py-1.5 border-b border-slate-100 last:border-none">
                    <div>
                      <div className="font-semibold text-slate-800">{loc.locality}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{loc.avgPrice}</div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-600 font-mono">{loc.trend}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Live & Latest Briefing Card */}
            <div className="bg-[#182A3E] text-white rounded-2xl p-4 border border-[#B49029]/30 shadow-md space-y-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#B49029] animate-pulse" />
                <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                  Live & Latest
                </span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Watch studio video walkthroughs, RERA legal briefings and direct developer podcasts.
              </p>
              <button
                type="button"
                onClick={onOpenLoginModal}
                className="w-full py-2 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>Access Broadcast Network</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};
