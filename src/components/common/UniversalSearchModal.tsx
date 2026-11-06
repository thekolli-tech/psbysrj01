import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ViewType } from '../../types';
import {
  Search,
  X,
  Building2,
  Users,
  TrendingUp,
  Radio,
  FileText,
  Compass,
  ArrowRight,
  Sparkles,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  MapPin
} from 'lucide-react';

interface UniversalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLoginModal?: () => void;
  onOpenSupport?: () => void;
}

type SearchCategory = 'ALL' | 'PROPERTIES' | 'COMMUNITIES' | 'TRENDS' | 'MEDIA' | 'PAGES';

interface SearchResultItem {
  id: string;
  category: 'PROPERTIES' | 'COMMUNITIES' | 'TRENDS' | 'MEDIA' | 'PAGES';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  imageUrl?: string;
  onSelect: () => void;
}

const STATIC_MARKET_TRENDS = [
  {
    id: 'trend-neopolis',
    name: 'Neopolis, Kokapet',
    metric: '₹11,800 /sq.ft',
    growth: '+22.4% (1Y)',
    description: 'Western corridor premium high-rise hub with fast capital appreciation'
  },
  {
    id: 'trend-financial-district',
    name: 'Financial District & Nanakramguda',
    metric: '₹10,400 /sq.ft',
    growth: '+16.8% (1Y)',
    description: 'Commercial IT anchor micro-market with robust rental yield'
  },
  {
    id: 'trend-tellapur',
    name: 'Tellapur & Kollur',
    metric: '₹7,850 /sq.ft',
    growth: '+19.5% (1Y)',
    description: 'Gated villa and luxury high-rise expansion belt along ORR Exit 2'
  },
  {
    id: 'trend-kokapet-core',
    name: 'Kokapet Core',
    metric: '₹9,650 /sq.ft',
    growth: '+18.2% (1Y)',
    description: 'Established luxury residential corridor adjacent to Gandipet lake'
  }
];

export const UniversalSearchModal: React.FC<UniversalSearchModalProps> = ({
  isOpen,
  onClose,
  onOpenLoginModal,
  onOpenSupport
}) => {
  const {
    properties,
    communities,
    mediaItems,
    setActiveView,
    isLoggedIn
  } = useApp();

  const [query, setQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('ALL');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Static Platform Pages
  const platformPages = useMemo(() => [
    {
      id: 'page-overview',
      title: 'Overview & Institutional Foundation',
      subtitle: 'The five-pillar PropTech ecosystem & brand architecture',
      view: 'HOME' as ViewType,
      badge: 'Foundation'
    },
    {
      id: 'page-media',
      title: 'Media & Broadcast Network',
      subtitle: 'Studio-grade property video podcasts & audio briefings',
      view: 'MEDIA' as ViewType,
      badge: 'Broadcast'
    },
    {
      id: 'page-trends',
      title: 'Market Trends & Price Index',
      subtitle: 'Verified micro-market capital appreciation rates & yields',
      view: 'MARKET_INSIGHTS' as ViewType,
      badge: 'Intelligence'
    },
    {
      id: 'page-reviews',
      title: 'Review & Rating Intelligence',
      subtitle: 'Verified buyer audits, title checks & developer scoring',
      view: 'REVIEW_RATING' as ViewType,
      badge: 'Audits'
    },
    {
      id: 'page-community',
      title: 'Community Q&A & Corridor Hubs',
      subtitle: 'Peer discussions, expert AMAs, Vaastu, and slab casting',
      view: 'COMMUNITY' as ViewType,
      badge: 'Discussions'
    },
    {
      id: 'page-requirements',
      title: 'Property Requirement Matching',
      subtitle: 'Submit institutional, residential, or land parcel mandates',
      view: 'REQUIREMENT' as ViewType,
      badge: 'Mandates'
    },
    {
      id: 'page-leads',
      title: 'Buyer Leads Marketplace',
      subtitle: 'Verified high-intent home seeker enquiries for developers & agents',
      view: 'LEADS_MARKET' as ViewType,
      badge: 'Network'
    },
    {
      id: 'page-contact',
      title: 'Contact & Connect Secretariat',
      subtitle: 'Direct secretariat line, enquiry submission, PMO application',
      view: 'CONTACT' as ViewType,
      badge: 'Support'
    }
  ], []);

  // Compute live search results across all domains
  const results = useMemo<SearchResultItem[]>(() => {
    const q = query.trim().toLowerCase();
    const items: SearchResultItem[] = [];

    // 1. Properties
    if (activeCategory === 'ALL' || activeCategory === 'PROPERTIES') {
      const matchedProps = properties.filter(p => {
        if (!q) return true;
        return (
          p.title?.toLowerCase().includes(q) ||
          p.location?.toLowerCase().includes(q) ||
          p.developerName?.toLowerCase().includes(q) ||
          p.microMarket?.toLowerCase().includes(q) ||
          p.propertyType?.toLowerCase().includes(q) ||
          p.tags?.some(t => t.toLowerCase().includes(q))
        );
      });

      matchedProps.slice(0, activeCategory === 'ALL' ? 3 : 10).forEach(p => {
        items.push({
          id: `prop-${p.id}`,
          category: 'PROPERTIES',
          title: p.title,
          subtitle: `${p.location || p.microMarket} · ${p.developerName || 'Verified Developer'} · ₹${p.pricePerSqft?.toLocaleString('en-IN') || '10,000'}/sq.ft`,
          badge: p.propertyType || 'Residential',
          badgeColor: 'bg-amber-50 text-amber-900 border-amber-200',
          imageUrl: p.heroImage,
          icon: <Building2 className="w-4 h-4 text-[#B49029]" />,
          onSelect: () => {
            setActiveView('HOME');
            onClose();
            // Scroll to property
            setTimeout(() => {
              const el = document.getElementById(`property-${p.id}`) || document.getElementById('search-results-section');
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 100);
          }
        });
      });
    }

    // 2. Communities
    if (activeCategory === 'ALL' || activeCategory === 'COMMUNITIES') {
      const matchedComms = communities.filter(c => {
        if (!q) return true;
        return (
          c.name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q) ||
          c.location?.toLowerCase().includes(q)
        );
      });

      matchedComms.slice(0, activeCategory === 'ALL' ? 3 : 10).forEach(c => {
        items.push({
          id: `comm-${c.id}`,
          category: 'COMMUNITIES',
          title: c.name,
          subtitle: `${c.location || c.category} · ${c.memberCount} members · ${c.visibility === 'PRIVATE' ? 'Private Circle' : 'Public Hub'}`,
          badge: 'Community Hub',
          badgeColor: 'bg-emerald-50 text-emerald-900 border-emerald-200',
          imageUrl: c.bannerImage,
          icon: <Users className="w-4 h-4 text-emerald-600" />,
          onSelect: () => {
            if (!isLoggedIn) {
              onClose();
              onOpenLoginModal?.();
              return;
            }
            setActiveView('COMMUNITY');
            onClose();
            // Store target community ID in session so CommunityForum opens it
            try {
              sessionStorage.setItem('ps_target_community_id', c.id);
            } catch {}
          }
        });
      });
    }

    // 3. Market Trends
    if (activeCategory === 'ALL' || activeCategory === 'TRENDS') {
      const matchedTrends = STATIC_MARKET_TRENDS.filter(t => {
        if (!q) return true;
        return (
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.metric.toLowerCase().includes(q)
        );
      });

      matchedTrends.slice(0, activeCategory === 'ALL' ? 2 : 6).forEach(t => {
        items.push({
          id: t.id,
          category: 'TRENDS',
          title: t.name,
          subtitle: `${t.metric} (${t.growth}) — ${t.description}`,
          badge: t.growth,
          badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 font-mono',
          icon: <TrendingUp className="w-4 h-4 text-emerald-600" />,
          onSelect: () => {
            setActiveView('MARKET_INSIGHTS');
            onClose();
          }
        });
      });
    }

    // 4. Media & Broadcast
    if (activeCategory === 'ALL' || activeCategory === 'MEDIA') {
      const matchedMedia = mediaItems.filter(m => {
        if (!q) return true;
        return (
          m.title?.toLowerCase().includes(q) ||
          m.summary?.toLowerCase().includes(q) ||
          m.host?.toLowerCase().includes(q) ||
          m.category?.toLowerCase().includes(q)
        );
      });

      matchedMedia.slice(0, activeCategory === 'ALL' ? 2 : 6).forEach(m => {
        items.push({
          id: `media-${m.id}`,
          category: 'MEDIA',
          title: m.title,
          subtitle: `${m.duration || 'Studio Briefing'} · Host: ${m.host || 'Swamy Reddy Javidi'} · ${m.views?.toLocaleString('en-IN') || '1,200'} views`,
          badge: m.type === 'PODCAST' ? 'Podcast' : 'Studio Media',
          badgeColor: 'bg-rose-50 text-rose-800 border-rose-200',
          imageUrl: m.thumbnail,
          icon: <Radio className="w-4 h-4 text-rose-600" />,
          onSelect: () => {
            setActiveView('MEDIA');
            onClose();
          }
        });
      });
    }

    // 5. Pages & Navigation
    if (activeCategory === 'ALL' || activeCategory === 'PAGES') {
      const matchedPages = platformPages.filter(p => {
        if (!q) return true;
        return (
          p.title.toLowerCase().includes(q) ||
          p.subtitle.toLowerCase().includes(q) ||
          p.badge.toLowerCase().includes(q)
        );
      });

      matchedPages.slice(0, activeCategory === 'ALL' ? 2 : 8).forEach(p => {
        items.push({
          id: p.id,
          category: 'PAGES',
          title: p.title,
          subtitle: p.subtitle,
          badge: p.badge,
          badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
          icon: <Compass className="w-4 h-4 text-[#182A3E]" />,
          onSelect: () => {
            setActiveView(p.view);
            onClose();
          }
        });
      });
    }

    return items;
  }, [query, activeCategory, properties, communities, mediaItems, platformPages, setActiveView, onClose, isLoggedIn, onOpenLoginModal]);

  // Keyboard navigation within results
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, activeCategory]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (e.key === 'Enter') {
        if (results[selectedIndex]) {
          e.preventDefault();
          results[selectedIndex].onSelect();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  // Keep selected item scrolled into view
  useEffect(() => {
    if (listRef.current) {
      const selectedEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 px-3 sm:px-4 bg-[#030508]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl sm:rounded-3xl border border-[#E8E4D8] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Universal Search Header & Input */}
        <div className="p-3.5 sm:p-4 border-b border-[#E8E4D8] bg-[#FCFBF3]/70">
          <div className="relative flex items-center">
            <Search className="w-5 h-5 text-[#B49029] absolute left-3.5 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search properties, communities, market trends, media, pages..."
              className="w-full pl-11 pr-20 py-3 text-sm sm:text-base bg-white border border-[#E8E4D8] focus:border-[#B49029] focus:ring-2 focus:ring-[#B49029]/20 rounded-xl text-[#030508] placeholder-slate-400 font-medium shadow-2xs outline-none transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                  aria-label="Clear query"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md transition-colors cursor-pointer"
              >
                ESC
              </button>
            </div>
          </div>

          {/* Quick Domain Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pt-3 pb-0.5 scrollbar-none text-xs font-semibold">
            {[
              { id: 'ALL', label: 'All Results' },
              { id: 'PROPERTIES', label: 'Projects' },
              { id: 'COMMUNITIES', label: 'Communities' },
              { id: 'TRENDS', label: 'Trends' },
              { id: 'MEDIA', label: 'Media' },
              { id: 'PAGES', label: 'Pages' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveCategory(tab.id as SearchCategory)}
                className={`px-3 py-1 rounded-lg transition-all shrink-0 cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-[#182A3E] text-white shadow-xs font-bold'
                    : 'bg-white text-slate-600 hover:text-[#030508] border border-[#E8E4D8]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div ref={listRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
          {results.length > 0 ? (
            results.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  data-index={index}
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between gap-3 p-2.5 sm:p-3 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-[#FCFBF3] border-[#CEC8A2] shadow-xs'
                      : 'border-transparent hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        item.icon
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-[#030508] truncate">
                          {item.title}
                        </span>
                        {item.badge && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border shrink-0 ${item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-bold text-[#B49029] hidden sm:inline opacity-0 group-hover:opacity-100 transition-opacity">
                      Jump →
                    </span>
                    <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[#B49029] translate-x-0.5' : 'text-slate-300'}`} />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center space-y-2">
              <Search className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-sm font-bold text-slate-700">No results found for "{query}"</div>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Try searching for corridor keywords like "Kokapet", "Neopolis", "Aparna", "Media", or "Trends".
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer with Shortcuts & Live Telemetry */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-[#E8E4D8] flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↑↓</kbd>
              <span>navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">↵</kbd>
              <span>select</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-mono">esc</kbd>
              <span>close</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[#B49029] font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Universal PropTech Search</span>
          </div>
        </div>
      </div>
    </div>
  );
};
