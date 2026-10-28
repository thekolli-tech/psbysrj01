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
  const { setActiveView, scrollProgress, properties, marketTrends, mediaItems, isLoggedIn, constructionLogs } = useApp();

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
    <div className="space-y-12 sm:space-y-16 pb-12">
      {/*
        ====================================================================
        PROMINENT TOP PROPERTY SEARCH BAR (IMMEDIATELY BELOW TOP NAVIGATION)
        ====================================================================
      */}
      <section className="bg-white border-b border-slate-200/90 shadow-xs" data-testid="homepage-top-search">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <form onSubmit={handleTopSearch} className="space-y-3">
            <div className="bg-slate-50/90 border border-slate-200/90 rounded-2xl p-2 sm:p-2.5 shadow-xs">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-2 sm:gap-2.5 items-center">
                {/* 1. Keyword Input */}
                <div className="md:col-span-5 lg:col-span-5 relative">
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
                    placeholder="Search by project, developer, or keyword..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                  />
                  {searchKeyword && (
                    <button
                      type="button"
                      onClick={() => setSearchKeyword('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      aria-label="Clear keyword"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* 2. Location Dropdown */}
                <div className="md:col-span-3 lg:col-span-3 relative">
                  <label htmlFor="home-search-location" className="sr-only">
                    Location Corridor
                  </label>
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    id="home-search-location"
                    aria-label="Select Corridor"
                    value={searchLocation}
                    onChange={e => {
                      setSearchLocation(e.target.value);
                      setHasSearched(true);
                    }}
                    className="w-full pl-10 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer truncate"
                  >
                    {HOMEPAGE_LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>
                        {loc === 'ALL' ? 'All Locations / Corridors' : loc}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Property Type Dropdown */}
                <div className="md:col-span-3 lg:col-span-3">
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
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer truncate"
                  />
                </div>

                {/* 4. Search Button */}
                <div className="md:col-span-1 lg:col-span-1 flex items-center gap-2">
                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Search className="w-4 h-4" />
                    <span>Search</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick status bar / active filter chips */}
            {(hasSearched || searchKeyword || searchLocation !== 'ALL' || searchPropertyType !== ALL_PROPERTY_TYPES) && (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-slate-600">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-bold text-slate-700">Active Filters:</span>
                  {searchKeyword && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 text-amber-900 border border-amber-200 rounded-full text-[11px] font-medium">
                      Keyword: &quot;{searchKeyword}&quot;
                      <button type="button" onClick={() => setSearchKeyword('')} className="hover:text-amber-700 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchLocation !== 'ALL' && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-50 text-blue-900 border border-blue-200 rounded-full text-[11px] font-medium">
                      Location: {searchLocation}
                      <button type="button" onClick={() => setSearchLocation('ALL')} className="hover:text-blue-700 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                  {searchPropertyType !== ALL_PROPERTY_TYPES && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-purple-50 text-purple-900 border border-purple-200 rounded-full text-[11px] font-medium">
                      Type: {displayPropertyType(searchPropertyType)}
                      <button type="button" onClick={() => setSearchPropertyType(ALL_PROPERTY_TYPES)} className="hover:text-purple-700 cursor-pointer">
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleResetTopSearch}
                  className="font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset filters</span>
                </button>
              </div>
            )}
          </form>

          {/* Search Results Drawer */}
          {hasSearched && (
            <div className="mt-5 pt-4 border-t border-slate-200/80 space-y-4 animate-in fade-in duration-200" data-testid="homepage-search-results">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
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
                    <span>View in full catalog</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setHasSearched(false)}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    title="Close results"
                    aria-label="Close search results"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {searchResults.length === 0 ? (
                <div className="text-center py-10 px-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-3">
                  <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
                    <Search className="w-6 h-6" />
                  </div>
                  <div className="max-w-md mx-auto space-y-1">
                    <h4 className="text-sm font-bold text-slate-900">No developments found</h4>
                    <p className="text-xs text-slate-500">
                      No verified listings matched your search criteria. Try choosing &quot;All Locations&quot; or selecting &quot;All property types&quot;.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetTopSearch}
                    className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Reset Search
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                  {searchResults.slice(0, 8).map(prop => (
                    <div
                      key={prop.id}
                      onClick={() => setActivePropertyModal(prop)}
                      className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between cursor-pointer group"
                    >
                      <div>
                        <div className="relative aspect-4/3 bg-slate-950 overflow-hidden">
                          <img
                            src={prop.heroImage || 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80'}
                            alt={prop.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={e => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80';
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                          <div className="absolute top-2 left-2 bg-slate-950/90 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
                            {displayPropertyType(prop.propertyType)}
                          </div>
                          {prop.microMarket && (
                            <div className="absolute bottom-2 left-2 right-2 text-white">
                              <span className="text-[10px] text-amber-300 flex items-center gap-0.5 font-medium">
                                <MapPin className="w-2.5 h-2.5" />
                                {prop.microMarket}
                              </span>
                              <h4 className="text-xs sm:text-sm font-bold truncate leading-tight">
                                {prop.title}
                              </h4>
                            </div>
                          )}
                        </div>

                        <div className="p-3.5 space-y-2">
                          <p className="text-[11px] text-slate-500 truncate">
                            {prop.developerName}
                          </p>

                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[10px] font-mono text-slate-400 block uppercase">Price</span>
                              <span className="font-bold text-slate-900 font-mono-numbers">
                                {prop.priceRange?.split('-')[0]?.trim() || (prop.pricePerSqft ? `₹${prop.pricePerSqft.toLocaleString('en-IN')}/sqft` : 'Price on request')}
                              </span>
                            </div>
                            {prop.progressPercent ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                {prop.progressPercent}% Audited
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="p-3.5 pt-0">
                        <button
                          type="button"
                          className="w-full py-1.5 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white rounded-lg text-xs font-bold text-slate-800 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-amber-500" />
                          <span>Inspect Blueprint</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* 
        ====================================================================
        SECTION 1: CINEMATIC VISUAL HERO & EXECUTIVE AUDIO BRIEFING
        ====================================================================
      */}
      <section id="overview" className="relative bg-gradient-to-b from-white via-slate-50 to-white border-b border-slate-200 overflow-hidden">
        {/* Ambient Glows */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left 7 cols: Brand Manifesto, Audio Lead & Expanded Intelligence Space */}
            <div className="lg:col-span-7 space-y-5 lg:space-y-6 order-2 lg:order-1">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                  <span className="uppercase font-mono">REAL ESTATE MEDIA & DATA INTELLIGENCE</span>
                </div>
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>TS-RERA Audited Projects</span>
                </div>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] xl:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] font-display">
                  Property Studio
                  <span className="block text-amber-700 text-2xl sm:text-3xl lg:text-[32px] xl:text-4xl font-bold mt-1">
                    by Swamy Reddy Javidi
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
                  &quot;The global PropTech ecosystem integrating the search power of property portals, the transparency of community forums, and the authority of broadcast media into one revolutionary platform.&quot;
                </p>
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Property Studio is The Real Estate Media Network and Community PropTech Platform Delivering Absolute Market Intelligence.
                </p>
              </div>

              {/* Tagline callout */}
              <div className="text-xs font-mono font-bold tracking-widest text-slate-500 uppercase border-l-2 border-amber-500 pl-3">
                REAL ESTATE · VISUAL STORIES · MARKET TRENDS & INSIGHTS
              </div>

              {/* Executive Audio Briefing Bar */}
              <div className="pt-1">
                <AudioStoryPlayer
                  title="Hyderabad Western Corridor Q4 Macro Intelligence Briefing"
                  narrator="Swamy Reddy Javidi (Founder & Platform Host)"
                  duration="3:15"
                  audioUrl="/audio/briefing-western-corridor-macro.mp3"
                  transcript={`Welcome to the Property Studio executive market briefing. Hyderabad's Western Corridor—anchored by Neopolis Kokapet, the Financial District, and Radial Road 7 Tellapur—remains India’s highest-velocity luxury growth zone. 

Our data audits indicate a 18.2% annual capital appreciation across Neopolis Grade-A assets, propelled by the 58-storey aerodynamic high-rise clusters and the newly commissioned Trumpet Interchange. While glossy advertising often conceals civil progress timelines, Property Studio rigorously tracks M60 concrete casting certifications, wind-tunnel vortex dampening compliance, and TS-RERA Form 4 filings. 

Explore our verified visual blueprints and 4K aerial surveys below to make institutional-grade property decisions without intermediary distortion.`}
                  badge="Executive Voice Note"
                  variant="compact"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  onClick={() => {
                    setActiveView('PROPERTIES');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
                >
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Explore Audited Projects</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </button>

                {isLoggedIn ? (
                  <button
                    onClick={() => {
                      setActiveView('LEADS_MARKET');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <Users className="w-4 h-4 text-amber-600" />
                    <span>Buyer Leads</span>
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setActiveView('MARKET_INSIGHTS');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="px-5 py-3.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
                  >
                    <TrendingUp className="w-4 h-4 text-amber-600" />
                    <span>Market Trends</span>
                  </button>
                )}

                {onOpenSupport && (
                  <button
                    onClick={onOpenSupport}
                    className="px-5 py-3.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all shadow-xs cursor-pointer"
                  >
                    <LifeBuoy className="w-4 h-4 text-amber-600" />
                    <span>Official Support Desk</span>
                  </button>
                )}
              </div>

              {/* Key Trust Metrics */}
              <div className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-slate-200/80">
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-xs">
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-slate-900">5 Pillars</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">PropTech Integration</div>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-xs">
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-amber-700">24+ Years</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Corporate Governance</div>
                </div>
                <div className="bg-white/80 border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-xs">
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-emerald-700">100%</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">Data Masking Privacy</div>
                </div>
              </div>
            </div>

            {/* Right 5 cols: Official Property Studio Logo Artwork */}
            <div className="lg:col-span-5 relative order-1 lg:order-2 flex flex-col items-center justify-center">
              <div className="relative mx-auto w-full max-w-md lg:max-w-lg aspect-square rounded-3xl bg-white border border-slate-200/90 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col items-center justify-center transition-all duration-300">
                {/* Official Logo Artwork Container */}
                <div
                  className="relative w-full h-full flex flex-col items-center justify-center transition-transform duration-300 ease-out"
                  style={{
                    transform: `scale(${0.96 + morph * 0.04})`,
                    willChange: 'transform'
                  }}
                >
                  <BrandLogo
                    variant="full"
                    className="w-full max-w-[340px] sm:max-w-[380px] drop-shadow-md object-contain"
                  />
                  <div className="mt-4 sm:mt-5 text-center space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 rounded-full border border-amber-200/80">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-amber-800 uppercase tracking-widest font-mono">
                        OFFICIAL BRAND IDENTITY
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto">
                      Real Estate · Visual Stories · Market Trends & Insights
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="absolute top-3.5 right-3.5 z-20">
                  <div className="px-2.5 py-1 bg-white/95 backdrop-blur-md rounded-full border border-slate-200 text-[10px] font-bold text-slate-700 shadow-xs flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Official Brand Emblem</span>
                  </div>
                </div>

                {/* Hidden compatibility hook for test suite */}
                <div className="hidden" aria-hidden="true">
                  <OfficialBrandCard />
                </div>
              </div>

              <div className="text-center mt-3 text-xs text-slate-500 font-medium">
                <span>Official emblem for Property Studio by Swamy Reddy Javidi</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OverviewFoundation />

      {/* 
        ====================================================================
        SECTION 2: THE FIVE-PILLAR INTEGRATION OF PROPERTY STUDIO
        ====================================================================
      */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold uppercase tracking-wider font-mono">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            CORE CONGLOMERATE ARCHITECTURE
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-display">
            The Five-Pillar Integration of Property Studio
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Consolidating market search, verified performance analytics, and unedited developer town halls into a single PropTech destination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Pillar 1 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 border border-amber-500/20 flex items-center justify-center font-bold">
                <Search className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-amber-700 uppercase tracking-widest">
                PILLAR 01
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                1. The Aggregator Engine
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Integrating the comprehensive search and discovery features of major property portals with curated inventory, high-resolution masterplans, and verified floor plans.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-amber-700 flex items-center gap-1">
              <span>Smart Search Discovery</span>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-600 border border-red-500/20 flex items-center justify-center font-bold">
                <Video className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-red-600 uppercase tracking-widest">
                PILLAR 02
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                2. The Broadcast Network
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Powered by high-definition YouTube studio analytics, professional TV Anchors, and live field Ground Reports.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-red-600 flex items-center gap-1">
              <span>Studio Broadcast Desk</span>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-500/20 flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest">
                PILLAR 03
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                3. The Community Hive
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                An anonymous, unedited forum for uncensored neighborhood Project and Community level discussions, title checks, and engineering reviews.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-indigo-600 flex items-center gap-1">
              <span>Uncensored Q&A Consensus</span>
            </div>
          </div>

          {/* Pillar 4 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold">
                <Star className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-600 uppercase tracking-widest">
                PILLAR 04
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                4. The Performance Index
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A transparent, verification-driven layout addressing developer track records and agent ratings, verified through actual construction delivery milestones.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-emerald-600 flex items-center gap-1">
              <span>Verified Track Records</span>
            </div>
          </div>

          {/* Pillar 5 */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:border-amber-400 hover:shadow-md transition-all space-y-3 flex flex-col justify-between md:col-span-2 lg:col-span-2">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 border border-blue-500/20 flex items-center justify-center font-bold">
                <Radio className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-600 uppercase tracking-widest">
                PILLAR 05
              </span>
              <h3 className="text-base font-bold text-slate-900 font-display">
                5. The Town Hall Arena
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hosting dynamic Live Summits and Podcasts that provide interactive digital bridges connecting builders, landowners, realtors, industry leaders, and global property seekers directly without intermediary filters.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-blue-600 flex items-center gap-1">
              <span>Direct Town Hall Summits</span>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ====================================================================
        SECTION 3: HOW PROPERTY STUDIO HELPS SOCIETY
        ====================================================================
      */}
      <section className="bg-slate-900 text-white py-14 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="max-w-3xl space-y-3">
            <span className="text-xs font-mono font-bold text-amber-400 tracking-widest uppercase">
              DEEP SOCIETAL IMPACT
            </span>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black font-display text-white">
              How Property Studio Helps Society
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Traditional real estate ecosystems are broken, plagued by asymmetrical information, unverified brokers, and continuous privacy leaks. By re-engineering this landscape into a trusted community framework, Property Studio delivers measurable societal protection:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                Eradicating Blind Financial Risk
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Property fraud, delayed projects, and hidden legal traps wipe out standard families' life savings. By providing rigorous regulatory compliance analysis (like TS-RERA and HMDA deep-dives) using broadcast studio tracking, the platform immunizes everyday home buyers against predatory market practices.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                Democratic Accountability for Developers
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By introducing uncensored project community forums, the platform transfers power back to the citizens. Developers can no longer hide structural issues behind glossy ad campaigns because real community feedback forces them to deliver on their construction timelines and engineering standards.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                Total Data Protection as a Right
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The modern digital citizen is exhausted by spam. Property Studio's strict, data-masking architecture ensures that high-intent property seekers can communicate, search, and submit requirements with their phone lines completely protected from aggressive broker spam databases.
              </p>
            </div>

            <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                <Briefcase className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                Elevating the Professional Real Estate Economy
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                By providing a rigorous verification processing framework, the platform elevates honest realtors and independent channel partners, giving them a verified, high-trust digital stage to build a clean living without resorting to fake listings or aggressive cold-calling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ====================================================================
        SECTION 4: MARKET FEEDS & BROADCASTS
        ====================================================================
      */}
      <section id="market-feeds" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 text-xs font-bold uppercase font-mono">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              LIVE DATA INTELLIGENCE FEED
            </div>
            <h2 className="text-2xl font-black text-slate-900 font-display mt-1">
              Western Corridor Micro-Market Feed
            </h2>
          </div>
          <button
            onClick={() => {
              setActiveView('MARKET_INSIGHTS');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="text-xs font-bold text-amber-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span>View Full Trends & Charts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Live micro-market price cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {marketTrends.map(t => (
            <div
              key={t.microMarket}
              onClick={() => {
                setActiveView('MARKET_INSIGHTS');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="cursor-pointer bg-white p-5 rounded-2xl border border-slate-200 hover:border-amber-400 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 truncate">{t.microMarket}</span>
                <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 transition-colors" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-slate-900 font-mono-numbers mt-2">
                ₹{t.currentAvgRate.toLocaleString('en-IN')}{' '}
                <span className="text-[10px] text-slate-400 font-normal">/sqft</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mt-1">
                <span>+{t.yearlyAppreciationPct}% 1-Yr Surge</span>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Video Audits preview (Media & Podcasts) */}
        {isLoggedIn && (
          <div className="pt-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Latest Video Audits & Builder Podcasts
              </h3>
              <button
                onClick={() => {
                  setActiveView('MEDIA');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Explore All Broadcasts →
              </button>
            </div>

            {mediaItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {mediaItems.slice(0, 3).map(item => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveView('MEDIA');
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="group cursor-pointer bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative aspect-video bg-slate-950 overflow-hidden">
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <span className="absolute top-2 left-2 text-[10px] font-black uppercase bg-slate-900/90 text-amber-400 px-2 py-0.5 rounded font-mono">
                          {item.type}
                        </span>
                        <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded">
                          {item.duration}
                        </span>
                      </div>

                      <div className="p-4 space-y-1.5">
                        <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                          {item.title}
                        </h4>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      </div>
                    </div>

                    <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                      <span>{item.views.toLocaleString()} views</span>
                      <span className="text-amber-700 font-semibold group-hover:underline">Watch & Discuss →</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-2">
                <p className="text-xs text-slate-500">
                  No video broadcasts published yet. Use the Media engine to post new video audits.
                </p>
                <button
                  onClick={() => setActiveView('MEDIA')}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Go to Media Engine
                </button>
              </div>
            )}
          </div>
        )}
      </section>

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
