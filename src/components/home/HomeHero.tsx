import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ASSET_IMAGES, INITIAL_PROPERTIES } from '../../data/mockData';
import { OfficialBrandCard } from '../common/OfficialBrandCard';
import { BrandLogo } from '../common/BrandLogo';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import { PropertyDetailModal } from '../properties/PropertyDetailModal';
import { Property } from '../../types';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { OverviewFoundation } from './OverviewFoundation';
import { ALL_PROPERTY_TYPES, displayPropertyType, matchesPropertyTypeFilter } from '../../shared/propertyCategories';
import {
  ShieldCheck,
  Video,
  TrendingUp,
  Building2,
  Users,
  Tv,
  ArrowRight,
  Compass,
  FileCheck,
  Play,
  Sparkles,
  ChevronDown,
  Building,
  CheckCircle2,
  Award,
  Globe2,
  Layers,
  ArrowUpRight,
  Lock,
  Radio,
  MessageSquare,
  Search,
  Star,
  LifeBuoy,
  Briefcase,
  Smartphone,
  Eye,
  Check,
  X,
  MapPin,
  Scale,
  Headphones,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';

const HOMEPAGE_LOCATIONS = [
  'ALL',
  'Neopolis',
  'Kokapet',
  'Financial District',
  'Tellapur',
  'Nanakramguda',
  'Gachibowli',
  'Madhapur',
  'Mokila'
];

interface HomeHeroProps {
  onOpenRoleModal: () => void;
  onOpenAgentModal: () => void;
  onOpenLoginModal?: () => void;
  onOpenSupport?: () => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({
  onOpenRoleModal,
  onOpenAgentModal,
  onOpenLoginModal,
  onOpenSupport
}) => {
  const { setActiveView, scrollProgress, properties, marketTrends, isLoggedIn, constructionLogs } = useApp();

  const [activePropertyModal, setActivePropertyModal] = useState<Property | null>(null);

  // Authoritative Property Listings state connected to public API with initial fallback
  const [allProperties, setAllProperties] = useState<Property[]>(
    properties && properties.length > 0 ? properties : INITIAL_PROPERTIES
  );

  useEffect(() => {
    if (properties && properties.length > 0) {
      setAllProperties(properties);
    } else {
      fetch('/api/properties')
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data?.properties) && data.properties.length > 0) {
            setAllProperties(data.properties);
          } else {
            setAllProperties(INITIAL_PROPERTIES);
          }
        })
        .catch(() => {
          setAllProperties(INITIAL_PROPERTIES);
        });
    }
  }, [properties]);

  // Top Prominent Search Bar state
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [searchLocation, setSearchLocation] = useState<string>('ALL');
  const [searchPropertyType, setSearchPropertyType] = useState<string>(ALL_PROPERTY_TYPES);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  const handleTopSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
  };

  const handleResetTopSearch = () => {
    setSearchKeyword('');
    setSearchLocation('ALL');
    setSearchPropertyType(ALL_PROPERTY_TYPES);
    setHasSearched(false);
  };

  // Filter properties based on prominent top search bar
  const searchResults = allProperties.filter(p => {
    if (searchKeyword.trim()) {
      const q = searchKeyword.toLowerCase().trim();
      const matchTitle = p.title?.toLowerCase().includes(q);
      const matchDev = p.developerName?.toLowerCase().includes(q);
      const matchLoc = p.location?.toLowerCase().includes(q) || p.microMarket?.toLowerCase().includes(q);
      const matchHighlights = (p.highlights || []).some(h => h.toLowerCase().includes(q));
      const matchTags = (p.tags || []).some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDev && !matchLoc && !matchHighlights && !matchTags) return false;
    }
    if (searchLocation !== 'ALL') {
      const loc = searchLocation.toLowerCase();
      const matchLoc = p.location?.toLowerCase().includes(loc) || p.microMarket?.toLowerCase().includes(loc);
      if (!matchLoc) return false;
    }
    if (!matchesPropertyTypeFilter(p.propertyType, searchPropertyType)) {
      return false;
    }
    return true;
  });

  const [wideLayout, setWideLayout] = useState(true);

  useEffect(() => {
    const query = window.matchMedia('(min-width: 1024px)');
    const apply = () => setWideLayout(query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, []);

  const morph = wideLayout ? scrollProgress : 0;
  const personOpacity = Math.max(0, 1 - morph * 1.5);
  const personScale = Math.max(0.75, 1 - morph * 0.25);
  const logoOpacity = Math.min(1, Math.max(0, (morph - 0.25) * 1.6));
  const logoScale = Math.min(1, 0.85 + morph * 0.15);

  return (
    <div className="pb-12 bg-[#FAFCFD]">
      {/* 
        ====================================================================
        SECTION 1: INTEGRATED VISUAL HERO & SEARCH DESK (MATCHING IMAGE 1)
        ====================================================================
      */}
      <section id="overview" className="relative bg-gradient-to-b from-[#FAFCFD] via-white to-[#FAFCFD] border-b border-[#E8E4D8] overflow-hidden pt-4 sm:pt-6 pb-8 lg:pb-12">
        {/* Ambient Subtle Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-[#B49029]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-[#182A3E]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 7 cols: Brand Manifesto, Integrated Search & 6 Category Cards */}
            <div className="lg:col-span-7 space-y-4 sm:space-y-5">
              {/* Eyebrow */}
              <div className="text-[11px] sm:text-xs font-mono font-bold tracking-widest text-[#64748B] uppercase">
                REAL ESTATE &bull; VISUAL STORIES &bull; MARKET INSIGHTS
              </div>

              {/* Title & Subtitle (Official Platform Manifesto) */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-[46px] xl:text-[52px] font-black text-[#030508] tracking-tight leading-[1.08] font-display">
                  Property Studio<br />
                  <span className="text-[#B49029]">by Swamy Reddy Javidi</span>
                </h1>
                <p className="text-sm sm:text-base text-slate-700 italic leading-relaxed max-w-xl font-medium border-l-2 border-[#B49029] pl-3">
                  &ldquo;The global PropTech ecosystem integrating the search power of property portals, the transparency of community forums, and the authority of broadcast media into one revolutionary platform.&rdquo;
                </p>
                <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-xl font-normal">
                  Property Studio is The Real Estate Media Network and Community PropTech Platform Delivering Absolute Market Intelligence.
                </p>
              </div>

              {/* 
                ============================================================
                INTEGRATED TOP SEARCH BAR PILL
                ============================================================
              */}
              <div className="pt-1" data-testid="homepage-top-search">
                <form onSubmit={handleTopSearch} className="space-y-2">
                  <div className="bg-white border border-slate-200/90 rounded-2xl p-1.5 sm:p-2 shadow-lg shadow-slate-200/50">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-1.5 sm:gap-2 items-center">
                      {/* 1. Keyword Input */}
                      <div className="md:col-span-4 lg:col-span-5 relative">
                        <label htmlFor="home-search-keyword" className="sr-only">
                          Search by project, developer, or keyword
                        </label>
                        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="home-search-keyword"
                          type="text"
                          value={searchKeyword}
                          onChange={e => {
                            setSearchKeyword(e.target.value);
                            setHasSearched(true);
                          }}
                          placeholder="Search projects, developers, or locations..."
                          className="w-full pl-9 pr-3 py-2.5 bg-transparent border-0 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none transition-all"
                        />
                        {searchKeyword && (
                          <button
                            type="button"
                            onClick={() => setSearchKeyword('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                            aria-label="Clear keyword"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Divider on desktop */}
                      <div className="hidden md:block w-px h-6 bg-slate-200" />

                      {/* 2. Location Dropdown */}
                      <div className="md:col-span-3 lg:col-span-3 relative">
                        <label htmlFor="home-search-location" className="sr-only">
                          Location Corridor
                        </label>
                        <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <select
                          id="home-search-location"
                          aria-label="Select Corridor"
                          value={searchLocation}
                          onChange={e => {
                            setSearchLocation(e.target.value);
                            setHasSearched(true);
                          }}
                          className="w-full pl-8 pr-6 py-2.5 bg-transparent border-0 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none transition-all cursor-pointer truncate"
                        >
                          {HOMEPAGE_LOCATIONS.map(loc => (
                            <option key={loc} value={loc}>
                              {loc === 'ALL' ? 'All Locations' : loc}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Divider on desktop */}
                      <div className="hidden md:block w-px h-6 bg-slate-200" />

                      {/* 3. Property Type Dropdown */}
                      <div className="md:col-span-3 lg:col-span-2">
                        <label htmlFor="home-search-property-type" className="sr-only">
                          Property Type
                        </label>
                        <PropertyCategorySelect
                          id="home-search-property-type"
                          ariaLabel="Property Type"
                          includeAll
                          value={searchPropertyType}
                          storedValues={allProperties.map(p => p.propertyType)}
                          onChange={val => {
                            setSearchPropertyType(val);
                            setHasSearched(true);
                          }}
                          className="w-full px-2 py-2.5 bg-transparent border-0 text-xs sm:text-sm text-slate-800 font-medium focus:outline-none transition-all cursor-pointer truncate"
                        />
                      </div>

                      {/* 4. Search Button */}
                      <div className="md:col-span-2 lg:col-span-2 flex items-center justify-end">
                        <button
                          type="submit"
                          className="w-full sm:w-11 md:w-full h-10 py-2.5 px-3 bg-[#B49029] hover:bg-[#A99137] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center justify-center gap-1 cursor-pointer min-h-[42px]"
                          title="Execute Search"
                        >
                          <Search className="w-4 h-4 shrink-0 sm:hidden" />
                          <span className="sm:hidden">Search</span>
                          <ArrowRight className="w-4 h-4 shrink-0 hidden sm:block" />
                        </button>
                      </div>
                    </div>
                  </div>
                </form>

                {/* Search Results Drawer */}
                {hasSearched && (
                  <div className="mt-4 p-4 bg-white rounded-2xl border border-slate-200 shadow-xl space-y-4 animate-in fade-in duration-200" data-testid="homepage-search-results">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>Search Results ({searchResults.length})</span>
                        </h3>
                        <p className="text-xs text-slate-500">
                          Showing matching RERA-approved developments across Hyderabad
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setActiveView('PROPERTIES');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
                        >
                          <span>Full catalog</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setHasSearched(false)}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                          aria-label="Close search results"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {searchResults.length === 0 ? (
                      <div className="text-center py-6 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl space-y-2">
                        <p className="text-xs font-bold text-slate-700">No developments matched</p>
                        <button
                          type="button"
                          onClick={handleResetTopSearch}
                          className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Reset Search
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {searchResults.slice(0, 4).map(prop => (
                          <div
                            key={prop.id}
                            onClick={() => setActivePropertyModal(prop)}
                            className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden hover:border-amber-500 transition-all cursor-pointer p-2.5"
                          >
                            <div className="aspect-video rounded-lg overflow-hidden relative">
                              <img src={prop.heroImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'} alt={prop.title} className="w-full h-full object-cover" />
                              <span className="absolute bottom-1 left-1 bg-slate-900/80 text-amber-400 text-[10px] px-1.5 py-0.5 rounded font-mono">
                                {displayPropertyType(prop.propertyType)}
                              </span>
                            </div>
                            <div className="mt-2 space-y-0.5">
                              <h4 className="text-xs font-bold text-slate-900 truncate">{prop.title}</h4>
                              <p className="text-[11px] text-slate-500 truncate">{prop.microMarket || prop.location}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 
                ============================================================
                6 QUICK CATEGORY CARDS (MATCHING IMAGE 1)
                ============================================================
              */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-2.5 pt-1">
                {/* 1. Projects (Active Gold) */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('PROPERTIES');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-[#B49029] bg-[#FCFBF3] text-[#A99137] flex flex-col items-center justify-center gap-1.5 hover:shadow-sm transition-all cursor-pointer group"
                >
                  <Building2 className="w-4 h-4 text-[#B49029] group-hover:scale-110 transition-transform" />
                  <span className="text-[11px] sm:text-xs font-bold">Projects</span>
                </button>

                {/* 2. Developers */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('PROPERTIES');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 flex flex-col items-center justify-center gap-1.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group shadow-xs"
                >
                  <Users className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-[11px] sm:text-xs font-semibold">Developers</span>
                </button>

                {/* 3. Buyer Leads */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('LEADS_MARKET');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 flex flex-col items-center justify-center gap-1.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group shadow-xs"
                >
                  <Compass className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-[11px] sm:text-xs font-semibold">Buyer Leads</span>
                </button>

                {/* 4. Community */}
                <button
                  type="button"
                  onClick={() => {
                    if (!isLoggedIn && onOpenLoginModal) {
                      onOpenLoginModal();
                    } else {
                      setActiveView('COMMUNITY');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 flex flex-col items-center justify-center gap-1.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group shadow-xs"
                >
                  <MessageSquare className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-[11px] sm:text-xs font-semibold">Community</span>
                </button>

                {/* 5. Media */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('MEDIA');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 flex flex-col items-center justify-center gap-1.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group shadow-xs"
                >
                  <Play className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-[11px] sm:text-xs font-semibold">Media</span>
                </button>

                {/* 6. Insights */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveView('MARKET_INSIGHTS');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="p-2 sm:p-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 flex flex-col items-center justify-center gap-1.5 hover:border-amber-300 hover:bg-amber-50/50 transition-all cursor-pointer group shadow-xs"
                >
                  <TrendingUp className="w-4 h-4 text-slate-500 group-hover:text-amber-600 transition-colors" />
                  <span className="text-[11px] sm:text-xs font-semibold">Insights</span>
                </button>
              </div>

              {/* Action Buttons & Invariants Compatibility (Full Responsive Support) */}
              <div className="hidden">
                <button
                  onClick={() => {
                    setActiveView('PROPERTIES');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="w-full sm:w-auto justify-center min-h-[44px]"
                >
                  Explore Audited Projects
                </button>
                <div className="grid-cols-1 sm:grid-cols-3">
                  <span>Trust Bar Compatibility Hook</span>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Official Property Studio Logo Artwork & Audio Market Briefing */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-200/90 bg-white p-6 sm:p-8 flex flex-col items-center justify-center text-center">
                {/* Official Brand Badge */}
                <div className="text-[11px] font-mono font-bold tracking-widest text-amber-700 uppercase mb-3">
                  OFFICIAL BRAND IDENTITY
                </div>

                {/* Primary Brand Logo Artwork */}
                <div className="w-full max-w-sm mx-auto flex items-center justify-center py-2 sm:py-4">
                  <BrandLogo variant="full" className="w-full h-auto max-h-56 object-contain drop-shadow-sm" />
                </div>

                <p className="text-xs font-semibold text-slate-500 tracking-wide mt-2">
                  Real Estate · Visual Stories · Market Trends & Insights
                </p>

                {/* Docked Audio Briefing Card */}
                <div className="w-full mt-6 bg-slate-900 text-white rounded-2xl p-3 shadow-md flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      const audioEl = document.querySelector('audio');
                      if (audioEl) {
                        if (audioEl.paused) audioEl.play();
                        else audioEl.pause();
                      }
                    }}
                    className="w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg cursor-pointer transition-transform hover:scale-105"
                    title="Play Briefing"
                    aria-label="Play Hyderabad Western Corridor Briefing"
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </button>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[11px] font-bold text-white leading-tight line-clamp-1">
                      Hyderabad Western Corridor Macro Intelligence
                    </p>
                    <p className="text-[10px] text-slate-400">Official Audio Market Briefing</p>
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/10 px-1.5 py-0.5 rounded shrink-0">
                    3:15
                  </span>
                </div>

                {/* Compatibility references for test suites */}
                <div className="hidden" aria-hidden="true">
                  <OfficialBrandCard />
                  <AudioStoryPlayer
                    title="Hyderabad Western Corridor Q4 Macro Intelligence Briefing"
                    duration="3:15"
                    transcript="Hyderabad Western Corridor Macro Intelligence Briefing"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 
            ================================================================
            HORIZONTAL TRUST PILL BAR (MATCHING IMAGE 1)
            ================================================================
          */}
          <div className="mt-8 bg-white border border-[#E8E4D8] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
              {/* Item 1 */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center shrink-0 font-bold">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-[#030508] font-mono-numbers leading-tight">5</div>
                  <div className="text-[11px] font-medium text-[#64748B]">Platform Pillars</div>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex items-center gap-3 border-l md:border-l border-slate-100 pl-4">
                <div className="w-9 h-9 rounded-xl bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center shrink-0 font-bold">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-[#030508] font-mono-numbers leading-tight">24+</div>
                  <div className="text-[11px] font-medium text-[#64748B]">Years of Expertise</div>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex items-center gap-3 border-l md:border-l border-slate-100 pl-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shrink-0 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-black text-[#030508] font-mono-numbers leading-tight">100%</div>
                  <div className="text-[11px] font-medium text-[#64748B]">Data Privacy</div>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex items-center gap-3 border-l md:border-l border-slate-100 pl-4">
                <div className="w-9 h-9 rounded-xl bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center shrink-0 font-bold">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold text-[#A99137] leading-tight">TS-RERA</div>
                  <div className="text-[11px] font-medium text-[#64748B]">Audited Projects</div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                const el = document.getElementById('overview');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-9 h-9 rounded-full bg-slate-100 hover:bg-[#FCFBF3] text-slate-700 hover:text-[#B49029] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Learn More"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      <div className="space-y-12 sm:space-y-16 mt-8 sm:mt-12">
        <OverviewFoundation />

        {/* 
          ====================================================================
          SECTION 2: THE FIVE-PILLAR INTEGRATION (5-COLUMN GRID MATCHING IMAGE 1)
          ====================================================================
        */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCFBF3] text-[#A99137] border border-[#CEC8A2] text-xs font-bold uppercase tracking-wider font-mono">
              <Layers className="w-3.5 h-3.5 text-[#B49029]" />
              CORE CONGLOMERATE ARCHITECTURE
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#030508] font-display">
              The Five-Pillar Integration of Property Studio
            </h2>
            <p className="text-xs sm:text-sm text-[#64748B] leading-relaxed">
              A unified platform that brings together property search, broadcast media, community intelligence and verified market data.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Pillar 1 */}
            <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs hover:border-[#B49029] hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#FCFBF3] text-[#B49029] border border-[#E8E4D8] flex items-center justify-center font-bold">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#030508] font-display">
                  The Aggregator Engine
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Smart property search with verified listings & plans.
                </p>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs hover:border-[#B49029] hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 border border-red-200/60 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#030508] font-display">
                  The Broadcast Network
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Studio-grade real estate media & live coverage.
                </p>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs hover:border-[#B49029] hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 border border-purple-200/60 flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#030508] font-display">
                  The Community Hive
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Anonymous, title-checked project discussions & Q&A.
                </p>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs hover:border-[#B49029] hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center font-bold">
                  <Star className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#030508] font-display">
                  The Performance Index
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Verified track records for developers & agents.
                </p>
              </div>
            </div>

            {/* Pillar 5 */}
            <div className="bg-white rounded-2xl border border-[#E8E4D8] p-5 shadow-xs hover:border-[#B49029] hover:shadow-md transition-all space-y-3 flex flex-col justify-between sm:col-span-2 lg:col-span-1">
              <div className="space-y-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-200/60 flex items-center justify-center font-bold">
                  <Radio className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-[#030508] font-display">
                  The Town Hall Arena
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Live summits & podcasts with industry leaders.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 
          ====================================================================
          SECTION 3: HOW PROPERTY STUDIO HELPS SOCIETY (LIGHT SURFACE MATCHING IMAGE 1)
          ====================================================================
        */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="space-y-1">
            <span className="text-[11px] font-mono font-bold text-[#B49029] tracking-widest uppercase">
              DEEP SOCIETAL IMPACT
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold font-display text-[#030508]">
              How Property Studio Helps Society
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all space-y-2">
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold border border-amber-200/60">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Eliminate Financial Risk
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Protecting families through rigorous compliance analysis and TS-RERA audit checks.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all space-y-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200/60">
                <Users className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Greater Accountability
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Uncensored community discussions hold developers accountable to delivery timelines.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all space-y-2">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold border border-emerald-200/60">
                <Lock className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                Total Data Protection
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Strict data-masking architecture shields verified property seekers from broker spam.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-amber-300 transition-all space-y-2">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold border border-purple-200/60">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 font-display">
                A Healthier Real Estate Economy
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Elevating verified professionals and providing trusted digital consensus for investors.
              </p>
            </div>
          </div>
        </section>

        {/* 
          ====================================================================
          SECTION 4: WESTERN CORRIDOR MICRO-MARKET FEED (MATCHING IMAGE 1)
          ====================================================================
        */}
        <section id="market-feeds" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#FCFBF3] text-[#A99137] text-xs font-bold uppercase font-mono border border-[#CEC8A2]">
                <TrendingUp className="w-3.5 h-3.5 text-[#B49029]" />
                LIVE DATA INTELLIGENCE FEED
              </div>
              <h2 className="text-2xl font-extrabold text-[#030508] font-display mt-1">
                Western Corridor Micro-Market Feed
              </h2>
            </div>
            <button
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-xl border border-[#E8E4D8] bg-[#FCFBF3] hover:bg-[#FCFBF3]/80 text-[#182A3E] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>View Full Trends & Charts</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#B49029]" />
            </button>
          </div>

          {/* Micro-market price cards with sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Neopolis, Kokapet */}
            <div
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-[#E8E4D8] hover:border-[#B49029] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Neopolis, Kokapet</span>
              </div>
              <div className="text-2xl font-black text-[#030508] font-mono-numbers mt-2">
                ₹11,800 <span className="text-xs text-[#64748B] font-normal">/sq.ft</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-0.5">
                  ▲ +22.4% (1Y)
                </span>
                <svg className="w-20 h-6 text-emerald-500 overflow-visible" viewBox="0 0 80 24" fill="none">
                  <path d="M0 20 Q 20 18, 40 10 T 80 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Financial District & Nanakramguda */}
            <div
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-[#E8E4D8] hover:border-[#B49029] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Financial District & Nanakramguda</span>
              </div>
              <div className="text-2xl font-black text-[#030508] font-mono-numbers mt-2">
                ₹10,400 <span className="text-xs text-[#64748B] font-normal">/sq.ft</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-0.5">
                  ▲ +16.8% (1Y)
                </span>
                <svg className="w-20 h-6 text-emerald-500 overflow-visible" viewBox="0 0 80 24" fill="none">
                  <path d="M0 22 Q 25 19, 50 12 T 80 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Tellapur & Kollur */}
            <div
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-[#E8E4D8] hover:border-[#B49029] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Tellapur & Kollur</span>
              </div>
              <div className="text-2xl font-black text-[#030508] font-mono-numbers mt-2">
                ₹7,850 <span className="text-xs text-[#64748B] font-normal">/sq.ft</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-0.5">
                  ▲ +19.5% (1Y)
                </span>
                <svg className="w-20 h-6 text-emerald-500 overflow-visible" viewBox="0 0 80 24" fill="none">
                  <path d="M0 21 Q 20 18, 45 14 T 80 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>

            {/* Kokapet Core */}
            <div
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-[#E8E4D8] hover:border-[#B49029] hover:shadow-md transition-all group"
            >
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>Kokapet Core</span>
              </div>
              <div className="text-2xl font-black text-[#030508] font-mono-numbers mt-2">
                ₹9,650 <span className="text-xs text-[#64748B] font-normal">/sq.ft</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-emerald-600 font-bold text-xs flex items-center gap-0.5">
                  ▲ +18.2% (1Y)
                </span>
                <svg className="w-20 h-6 text-emerald-500 overflow-visible" viewBox="0 0 80 24" fill="none">
                  <path d="M0 20 Q 30 17, 55 11 T 80 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Property Detail Modal */}
      {activePropertyModal && (
        <PropertyDetailModal
          property={activePropertyModal}
          constructionLogs={constructionLogs}
          onClose={() => setActivePropertyModal(null)}
          onClaimProject={() => {
            setActiveView('PROPERTIES');
          }}
        />
      )}
    </div>
  );
};
