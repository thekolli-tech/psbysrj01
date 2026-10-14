import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ASSET_IMAGES } from '../../data/mockData';
import { OfficialBrandCard } from '../common/OfficialBrandCard';
import { BrandLogo } from '../common/BrandLogo';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import { PropertyDetailModal } from '../properties/PropertyDetailModal';
import { Property } from '../../types';
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
  Volume2,
  Headphones,
  SlidersHorizontal
} from 'lucide-react';

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

  // Visual Quick Search state
  const [searchCorridor, setSearchCorridor] = useState<string>('ALL');
  const [searchAssetType, setSearchAssetType] = useState<string>('ALL');

  // Filter properties based on quick search
  const featuredProperties = properties.filter(p => {
    if (searchCorridor !== 'ALL' && !p.microMarket.toLowerCase().includes(searchCorridor.toLowerCase())) return false;
    if (searchAssetType !== 'ALL' && p.propertyType !== searchAssetType) return false;
    return true;
  });

  // Scroll interpolation values (progress is 0 at top, 1 at ~280px scroll)
  const personOpacity = Math.max(0, 1 - scrollProgress * 1.5);
  const personScale = Math.max(0.75, 1 - scrollProgress * 0.25);
  const logoOpacity = Math.min(1, Math.max(0, (scrollProgress - 0.25) * 1.6));
  const logoScale = Math.min(1, 0.85 + scrollProgress * 0.15);

  return (
    <div className="space-y-16 pb-12">
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
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* Left 6 cols: Brand Manifesto & Audio Lead */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                <span className="uppercase font-mono">REAL ESTATE MEDIA & DATA INTELLIGENCE</span>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.12] font-display">
                  Property Studio
                  <span className="block text-amber-700 text-2xl sm:text-3xl lg:text-4xl font-bold mt-1">
                    by Swamy Reddy Javidi
                  </span>
                </h1>
                <p className="text-base sm:text-lg text-slate-700 leading-relaxed font-normal">
                  "The global PropTech ecosystem integrating the search power of property portals, the transparency of community forums, and the authority of broadcast media into one revolutionary platform."
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
              <div className="flex flex-wrap items-center gap-3 pt-2">
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
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200/80 text-slate-900">
                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-slate-900">TG RERA</div>
                  <div className="text-[11px] text-slate-500 mt-0.5 font-mono">A02200004078</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-amber-700">24+ Years</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Corporate Governance</div>
                </div>
                <div>
                  <div className="text-xl sm:text-2xl font-black font-mono-numbers text-emerald-700">100%</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Data Masking Privacy</div>
                </div>
              </div>
            </div>

            {/* Right 6 cols: Dynamic Host Card Morphing Container */}
            <div className="lg:col-span-6 relative">
              <div className="relative mx-auto max-w-md lg:max-w-lg aspect-square rounded-3xl bg-white border border-slate-200 shadow-2xl overflow-hidden p-2.5 transition-all duration-300">
                <div className="relative w-full h-full rounded-2xl overflow-hidden bg-white flex items-center justify-center">
                  {/* LAYER 1: Official Brand Card with Person */}
                  <div
                    className="absolute inset-0 transition-all duration-300 ease-out flex items-center justify-center pointer-events-none"
                    style={{
                      opacity: personOpacity,
                      transform: `scale(${personScale})`,
                      willChange: 'transform, opacity'
                    }}
                  >
                    <OfficialBrandCard className="w-full h-full rounded-2xl shadow-none border-0" />
                  </div>

                  {/* LAYER 2: Official Standalone Logo */}
                  <div
                    className="absolute inset-0 transition-all duration-300 ease-out flex flex-col items-center justify-center p-6 bg-white"
                    style={{
                      opacity: logoOpacity,
                      transform: `scale(${logoScale})`,
                      willChange: 'transform, opacity'
                    }}
                  >
                    <BrandLogo variant="full" className="w-full max-w-[320px] drop-shadow-xs" />
                    <div className="mt-4 text-center space-y-1">
                      <div className="text-[11px] font-bold text-amber-700 uppercase tracking-widest font-mono">
                        OFFICIAL BRAND IDENTITY
                      </div>
                      <p className="text-xs text-slate-500 max-w-xs">
                        Delivering Absolute Market Intelligence across the Western Corridor.
                      </p>
                    </div>
                  </div>

                  {/* Scroll Cue Pill */}
                  <div className="absolute top-3 right-3 z-20">
                    <div className="px-2.5 py-1 bg-white/90 backdrop-blur-md rounded-full border border-slate-200 text-[10px] font-bold text-slate-600 shadow-xs flex items-center gap-1.5">
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-amber-600 transition-transform duration-300 ${
                          scrollProgress > 0.5 ? 'rotate-180' : 'animate-bounce'
                        }`}
                      />
                      <span>
                        {scrollProgress > 0.5 ? 'Logo Docked' : 'Scroll to Morph Logo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center mt-3 text-xs text-slate-400 font-medium">
                {scrollProgress > 0.5 ? (
                  <span className="text-amber-700 font-bold">✓ Official Property Studio emblem anchored to navigation</span>
                ) : (
                  <span>↓ Scroll down to watch the host card smoothly morph into the official logo</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 
        ====================================================================
        SECTION 1.5: VISUAL SEARCH & CURATED DEVELOPMENTS SHOWCASE
        ====================================================================
      */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Visual Search Box */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-800 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider font-mono mb-1">
                <Search className="w-4 h-4" />
                <span>Visual Discovery & Spatial Search</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black font-display text-white">
                Explore Verified Inventory by Corridor & Asset Type
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              <strong className="text-amber-400 font-mono-numbers">{featuredProperties.length}</strong> audited developments ready for inspection
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
            {/* Corridor Selector */}
            <div className="lg:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide font-mono block">
                Micro-Market Corridor
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'Neopolis', 'Kokapet', 'Financial District', 'Tellapur'].map(c => (
                  <button
                    key={c}
                    onClick={() => setSearchCorridor(c)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      searchCorridor === c
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Asset Type Selector */}
            <div className="lg:col-span-5 space-y-1.5">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wide font-mono block">
                Property Architecture
              </label>
              <div className="flex flex-wrap gap-1.5">
                {['ALL', 'Sky Villa', 'Luxury High-Rise', 'Grade-A Commercial', 'Gated Villa Community'].map(a => (
                  <button
                    key={a}
                    onClick={() => setSearchAssetType(a)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      searchAssetType === a
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            {/* Direct Browse Action */}
            <div className="lg:col-span-2 pt-2 lg:pt-5">
              <button
                onClick={() => {
                  setActiveView('PROPERTIES');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
              >
                <span>View All ({properties.length})</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Featured Visual Cards Showcase */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider font-mono">
                FLAGSHIP PORTFOLIO
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-display">
                Featured Developments with 4K Drone Walkthroughs
              </h3>
            </div>
            <button
              onClick={() => {
                setActiveView('PROPERTIES');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-xs font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
            >
              <span>Explore All Projects</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredProperties.slice(0, 4).map(prop => (
              <div
                key={prop.id}
                onClick={() => setActivePropertyModal(prop)}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Photo with Overlay */}
                  <div className="relative aspect-4/3 bg-slate-950 overflow-hidden">
                    <img
                      src={prop.heroImage}
                      alt={prop.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-black/20" />
                    
                    <div className="absolute top-2.5 left-2.5 bg-slate-950/90 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-lg border border-amber-500/30 font-mono">
                      {prop.propertyType}
                    </div>

                    <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                      <span className="text-[11px] text-amber-300 block font-medium">
                        {prop.microMarket}
                      </span>
                      <h4 className="text-base font-bold truncate leading-snug">
                        {prop.title}
                      </h4>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Starting</span>
                      <strong className="text-amber-900 font-mono-numbers text-sm">
                        {prop.priceRange.split('-')[0].trim()}
                      </strong>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>Rate: ₹{prop.pricePerSqft.toLocaleString('en-IN')}/sqft</span>
                      <span className="text-emerald-700 font-bold">{prop.progressPercent}% Audited</span>
                    </div>

                    {/* Media tags */}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3 text-amber-600" /> 4K Tour
                      </span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="flex items-center gap-1">
                        <Volume2 className="w-3 h-3 text-amber-600" /> Audio Story
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <div className="w-full py-2 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white rounded-xl text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-colors">
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    <span>Inspect Blueprint</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

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
                Powered by high-definition YouTube studio analytics, professional TV Anchors, and live field Ground Reports using our 86-inch Interactive Flat Panel (IFP) to dissect vector layout blueprints.
              </p>
            </div>
            <div className="pt-2 text-[11px] font-bold text-red-600 flex items-center gap-1">
              <span>86" IFP Broadcast Desk</span>
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
