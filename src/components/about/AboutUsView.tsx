import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileCheck,
  Cpu,
  Mic,
  Handshake,
  Layers,
  Zap,
  CheckCircle2,
  Rocket,
  Search,
  Tv,
  MessageSquare,
  Award,
  Radio,
  Users,
  Compass,
  Building,
  Landmark,
  ShieldCheck,
  Briefcase,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  User,
  Target,
  Eye,
  Info,
  Star,
  ExternalLink
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

export interface AboutUsViewProps {
  onNavigateHome?: () => void;
  onNavigateCommunity?: () => void;
  onNavigateProperties?: () => void;
  onOpenRegister?: () => void;
  onOpenLogin?: () => void;
}

export type AboutNodeId = 'founder' | 'pillars' | 'stakeholders' | 'vision' | 'mission' | 'core-dna';

interface NodeDefinition {
  id: AboutNodeId;
  number: string;
  title: string;
  subtitle: string;
  angleDeg: number; // 180 to 0 across semicircle
  icon: React.ComponentType<{ className?: string }>;
}

const NODES: NodeDefinition[] = [
  {
    id: 'founder',
    number: '01',
    title: 'Founder Profile',
    subtitle: 'Leadership & Philosophy',
    angleDeg: 180,
    icon: User
  },
  {
    id: 'pillars',
    number: '02',
    title: 'Five Integrated Pillars',
    subtitle: 'PropTech Architecture',
    angleDeg: 144,
    icon: Building
  },
  {
    id: 'stakeholders',
    number: '03',
    title: 'Who We Serve',
    subtitle: '14 Ecosystem Stakeholders',
    angleDeg: 108,
    icon: Users
  },
  {
    id: 'vision',
    number: '04',
    title: 'Vision',
    subtitle: 'Global PropTech Benchmark',
    angleDeg: 72,
    icon: Eye
  },
  {
    id: 'mission',
    number: '05',
    title: 'Mission',
    subtitle: 'Unified Media Architecture',
    angleDeg: 36,
    icon: Target
  },
  {
    id: 'core-dna',
    number: '06',
    title: "6 I's & 6 R's – Core DNA",
    subtitle: 'Institutional Principles',
    angleDeg: 0,
    icon: Sparkles
  }
];

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  onNavigateHome,
  onNavigateCommunity,
  onNavigateProperties,
  onOpenRegister,
  onOpenLogin
}) => {
  const [activeNode, setActiveNode] = useState<AboutNodeId | null>(null);
  const [hoveredNode, setHoveredNode] = useState<AboutNodeId | null>(null);
  const [mounted, setMounted] = useState(false);

  // Keyboard navigation & accessibility
  useEffect(() => {
    setMounted(true);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveNode(null);
      } else if (activeNode !== null) {
        const currentIndex = NODES.findIndex(n => n.id === activeNode);
        if (e.key === 'ArrowRight' && currentIndex < NODES.length - 1) {
          setActiveNode(NODES[currentIndex + 1].id);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          setActiveNode(NODES[currentIndex - 1].id);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNode]);

  // Set document title
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'About Us | Property Studio — Real Estate Media Network & PropTech Platform';
    return () => {
      document.title = originalTitle;
    };
  }, []);

  const activeNodeData = NODES.find(n => n.id === activeNode);
  const activeNodeIndex = activeNodeData ? NODES.indexOf(activeNodeData) : -1;

  // Semicircle calculation (viewBox 0 0 900 560)
  // Center is at (450, 480) with radius 340
  const cx = 450;
  const cy = 480;
  const r = 340;

  const getNodeCoords = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    const x = cx + r * Math.cos(rad);
    const y = cy - r * Math.sin(rad);
    return { x, y };
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] w-full bg-[#F8FAFC] text-slate-800 flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden select-none">
      {/* Subtle brand ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#B49029]/8 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-gradient-to-t from-white via-white/80 to-transparent rounded-t-full border-t border-slate-200/90 pointer-events-none" />

      {/* Main Semicircle Infographic Container */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Top Instruction Pill */}
        <div className="mb-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white border border-[#B49029]/40 text-xs font-mono text-[#B49029] shadow-xs">
          <span className="w-2 h-2 rounded-full bg-[#B49029] animate-pulse" />
          <span className="font-semibold">Click any of the 6 nodes to explore Property Studio identity</span>
        </div>

        {/* The Semicircle Infographic Stage */}
        <div className="relative w-full aspect-[900/540] max-w-[860px]">
          {/* SVG Canvas for Arcs and Connecting Lines */}
          <svg
            viewBox="0 0 900 540"
            className="w-full h-full overflow-visible"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="arcGoldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#B49029" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#B49029" stopOpacity="1" />
                <stop offset="100%" stopColor="#B49029" stopOpacity="0.4" />
              </linearGradient>
            </defs>

            {/* Outer Subtle Guide Arc */}
            <path
              d={`M ${cx - r - 20} ${cy} A ${r + 20} ${r + 20} 0 0 1 ${cx + r + 20} ${cy}`}
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              className="opacity-70"
            />

            {/* Main Primary Semicircular Arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="url(#arcGoldGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                mounted ? 'stroke-dasharray-full' : ''
              }`}
            />

            {/* Inner Concentric Guide Arc */}
            <path
              d={`M ${cx - 200} ${cy} A 200 200 0 0 1 ${cx + 200} ${cy}`}
              fill="none"
              stroke="#B49029"
              strokeWidth="1"
              strokeOpacity="0.3"
            />

            {/* Connecting Radial Lines from Central Emblem to each Node */}
            {NODES.map((node) => {
              const { x, y } = getNodeCoords(node.angleDeg);
              const isSelected = activeNode === node.id;
              const isHovered = hoveredNode === node.id;
              return (
                <line
                  key={`line-${node.id}`}
                  x1={cx}
                  y1={cy}
                  x2={x}
                  y2={y}
                  stroke={isSelected || isHovered ? '#B49029' : '#CBD5E1'}
                  strokeWidth={isSelected ? '2.5' : isHovered ? '2' : '1.2'}
                  strokeDasharray={isSelected ? 'none' : '3 4'}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Central Property Studio Core Identity Emblem */}
          <div
            className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-2 flex flex-col items-center justify-center text-center z-10"
            style={{ width: '240px', height: '170px' }}
          >
            <div className="relative w-36 h-36 rounded-full bg-white border-2 border-[#B49029] shadow-[0_8px_30px_rgba(180,144,41,0.22)] flex flex-col items-center justify-center p-3 text-center transition-all duration-300 hover:scale-105">
              <div className="w-8 h-8 mb-1 rounded-full bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-[#B49029]" />
              </div>
              <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-[#182A3E]">
                PROPERTY STUDIO
              </span>
              <span className="font-mono text-[9px] font-bold text-[#B49029] tracking-widest mt-0.5 uppercase">
                CORE IDENTITY
              </span>
              <span className="text-[8px] text-slate-500 mt-0.5 font-medium">
                Six-Node Architecture
              </span>
            </div>
          </div>

          {/* Six Circular Interactive Nodes along the Semicircular Arc */}
          {NODES.map((node) => {
            const { x, y } = getNodeCoords(node.angleDeg);
            const leftPct = (x / 900) * 100;
            const topPct = (y / 540) * 100;
            const isSelected = activeNode === node.id;
            const isMuted = activeNode !== null && !isSelected;

            return (
              <button
                key={node.id}
                type="button"
                onClick={() => setActiveNode(node.id)}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}
                aria-label={`Node ${node.number}: ${node.title}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group flex flex-col items-center focus:outline-none transition-all duration-300 cursor-pointer ${
                  isMuted ? 'opacity-40 scale-90' : 'opacity-100 scale-100'
                }`}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  zIndex: isSelected ? 30 : 20
                }}
              >
                {/* Node Circular Indicator */}
                <div
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-sm ${
                    isSelected
                      ? 'bg-[#B49029] text-white ring-4 ring-[#B49029]/30 scale-110 shadow-[0_4px_20px_rgba(180,144,41,0.5)]'
                      : 'bg-white text-[#B49029] border-2 border-slate-300 group-hover:border-[#B49029] group-hover:shadow-md group-hover:scale-105'
                  }`}
                >
                  <span className="font-mono font-black text-xs sm:text-sm tracking-wider">
                    {node.number}
                  </span>

                  {/* Pulsing Highlight Dot for Selected State */}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#182A3E] ring-2 ring-[#B49029] animate-ping" />
                  )}
                </div>

                {/* Node Label Card */}
                <div
                  className={`mt-2 px-3 py-1.5 rounded-xl text-center transition-all duration-200 pointer-events-none max-w-[130px] sm:max-w-[155px] ${
                    isSelected
                      ? 'bg-white border-2 border-[#B49029] shadow-md'
                      : 'bg-white/95 border border-slate-200 shadow-xs group-hover:border-[#B49029]/70 group-hover:shadow-sm'
                  }`}
                >
                  <div
                    className={`font-serif font-bold text-[11px] sm:text-xs leading-tight ${
                      isSelected ? 'text-[#B49029]' : 'text-[#182A3E] group-hover:text-[#B49029]'
                    }`}
                  >
                    {node.title}
                  </div>
                  <div className="text-[9px] text-slate-500 truncate font-medium mt-0.5">
                    {node.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 
        ========================================================================
        INTERACTIVE POPUP MODAL (LIGHT THEME WITH LOGO NAVY & GOLD COLORS)
        ========================================================================
      */}
      {activeNode && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveNode(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full bg-white border border-[#B49029]/30 rounded-3xl shadow-[0_25px_70px_rgba(24,42,62,0.18)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 text-slate-800 ${
              activeNode === 'core-dna' || activeNode === 'founder' ? 'max-w-4xl' : 'max-w-2xl'
            }`}
          >
            {/* Modal Header Bar with Node Number & Stepper */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/90">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#B49029] text-white font-mono font-black text-xs shadow-xs">
                  NODE {activeNodeData?.number}
                </span>
                <span className="text-xs font-mono text-slate-500">
                  {activeNodeIndex + 1} of {NODES.length}
                </span>
                <span className="text-xs font-serif font-bold text-[#182A3E] hidden sm:inline">
                  {activeNodeData?.title}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Previous Node */}
                <button
                  type="button"
                  disabled={activeNodeIndex <= 0}
                  onClick={() => {
                    if (activeNodeIndex > 0) {
                      setActiveNode(NODES[activeNodeIndex - 1].id);
                    }
                  }}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-[#182A3E] hover:bg-slate-200/80 border border-transparent hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Previous Node"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Next Node */}
                <button
                  type="button"
                  disabled={activeNodeIndex >= NODES.length - 1}
                  onClick={() => {
                    if (activeNodeIndex < NODES.length - 1) {
                      setActiveNode(NODES[activeNodeIndex + 1].id);
                    }
                  }}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-[#182A3E] hover:bg-slate-200/80 border border-transparent hover:border-slate-300 disabled:opacity-30 disabled:pointer-events-none cursor-pointer transition-colors"
                  title="Next Node"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveNode(null)}
                  className="p-1.5 rounded-xl text-slate-500 hover:text-[#182A3E] hover:bg-slate-200/80 border border-transparent hover:border-slate-300 cursor-pointer ml-2 transition-colors"
                  aria-label="Close popup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6">
              {/* NODE 01: FOUNDER PROFILE */}
              {activeNode === 'founder' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-slate-200">
                    {/* Authentic Founder Picture with Property Studio Logo Poster */}
                    <div className="relative group shrink-0">
                      <img
                        src="/brand/property-studio-founder-poster.png"
                        alt="Swamy Reddy Javidi — Founder of Sadguna Properties and Property Studio"
                        className="w-48 sm:w-56 h-auto rounded-2xl object-contain border-2 border-[#B49029]/60 shadow-md bg-white p-1.5"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '/brand/property-studio-hero.jpg';
                        }}
                      />
                      <div className="mt-2 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-[#B49029] font-mono text-[10px] font-bold border border-[#B49029]/40">
                          <Award className="w-3 h-3 text-[#B49029]" />
                          Verified Founder
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2.5 text-center sm:text-left flex-1">
                      <div className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-[#B49029]/40 text-[#B49029] text-[10px] font-mono font-bold uppercase tracking-wider">
                        Founder & CEO – Property Studio & Sadguna Properties
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#182A3E]">
                        Swamy Reddy Javidi
                      </h2>
                      <p className="text-xs font-semibold text-[#B49029] uppercase tracking-wider">
                        Real Estate Strategist | PropTech Entrepreneur | Consumer Advocate
                      </p>
                      <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                        MBA in Marketing with 24+ years of distinguished corporate and real estate leadership across India.
                      </p>

                      <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs text-slate-700 text-left">
                        <div>
                          <strong className="text-[#182A3E]">Corporate Pedigree:</strong> Over two decades of executive leadership with Fortune 500 and national telecom/FMCG giants including <strong className="text-[#182A3E]">Reliance Jio, Tata Teleservices, Idea Cellular, Hindustan Unilever</strong>, and <strong className="text-[#182A3E]">PepsiCo</strong>.
                        </div>
                        <div>
                          <strong className="text-[#182A3E]">Real Estate Leadership:</strong> Founder of <strong className="text-[#B49029]">Sadguna Properties</strong> and <strong className="text-[#182A3E]">Property Studio</strong>, establishing benchmark standards for verified layout documentation, land acquisition due diligence, and legal clearances across Telangana.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-[#B49029] uppercase tracking-wider">
                      Core Strategic Focus
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      Focus on real estate intelligence, market analytics, compliance, and absolute transparency. Eliminating misleading claims, inflated broker margins, and unverified promises through real-time field telemetry, authentic site inspections, and honest reporting.
                    </p>
                  </div>

                  {/* Founder Philosophy: 6C Step Sequence */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold text-[#B49029] uppercase tracking-wider">
                        Founder Philosophy
                      </h3>
                      <span className="text-[10px] font-mono text-slate-500">The 6C Trust Continuum</span>
                    </div>

                    <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs font-bold text-[#182A3E] tracking-wide flex flex-wrap items-center justify-center gap-2 text-center">
                      <span className="text-[#B49029]">Content</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-[#B49029]">Courage</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-[#B49029]">Confidence</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-[#B49029]">Communication</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-[#B49029]">Contacts</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-[#B49029]">Convincing</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 text-[11px]">
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">01. Content:</span>
                        <span className="text-slate-700">Verified market intelligence</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">02. Courage:</span>
                        <span className="text-slate-700">Disclosing honest realities</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">03. Confidence:</span>
                        <span className="text-slate-700">Empowering seeker decisions</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">04. Communication:</span>
                        <span className="text-slate-700">Clear broadcast media</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">05. Contacts:</span>
                        <span className="text-slate-700">Connecting genuine stakeholders</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <span className="font-mono text-[#B49029] font-bold block">06. Convincing:</span>
                        <span className="text-slate-700">Trust-backed transactions</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE 02: FIVE INTEGRATED PILLARS */}
              {activeNode === 'pillars' && (
                <div className="space-y-4">
                  <div className="space-y-1 pb-2 border-b border-slate-200">
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-[#182A3E]">
                      Five Integrated Pillars
                    </h2>
                    <p className="text-xs text-slate-500">
                      The multi-dimensional architecture powering Property Studio discovery and verification.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Pillar 01 */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#B49029]">01</span>
                          <h3 className="font-serif font-bold text-sm text-[#182A3E]">Aggregator Engine</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Property search and discovery, bringing property opportunities together across residential, commercial, farm lands, and plots.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 02 */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#B49029]">02</span>
                          <h3 className="font-serif font-bold text-sm text-[#182A3E]">Broadcast Network</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Studio presentations, podcasts, interviews and live ground reports capturing authentic construction milestones and infrastructure updates.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 03 */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shrink-0 text-[#B49029]">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#B49029]">03</span>
                          <h3 className="font-serif font-bold text-sm text-[#182A3E]">Community Hive</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Community discussions, questions and project-level feedback answered by verified local residents and industry peers.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 04 */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#B49029]">04</span>
                          <h3 className="font-serif font-bold text-sm text-[#182A3E]">Performance Index</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Developer and professional verification, ratings and performance insights assessing delivery timelines, compliance, and build quality.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 05 */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 border border-[#B49029]/50 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#B49029]">05</span>
                          <h3 className="font-serif font-bold text-sm text-[#182A3E]">Town Hall Arena</h3>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Live summits, podcasts and direct stakeholder discussions connecting seekers, builders, and experts with encrypted privacy.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE 03: WHO WE SERVE */}
              {activeNode === 'stakeholders' && (
                <div className="space-y-4">
                  <div className="space-y-1 pb-2 border-b border-slate-200">
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-[#182A3E]">
                      Who We Serve
                    </h2>
                    <p className="text-xs text-slate-500">
                      Connecting five key stakeholder groups into one verified real estate ecosystem.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#B49029]/40 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#182A3E]">
                          Property Seekers & Investors
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Discover properties, compare opportunities and submit requirements with privacy protection.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#B49029]/40 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#182A3E]">
                          Developers & Builders
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Connect with buyers, manage project communities and share official project updates.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#B49029]/40 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#182A3E]">
                          Landowners
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Connect with developers and verified real estate professionals for joint ventures and structured developments.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#B49029]/40 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#182A3E]">
                          Verified Agents & Channel Partners
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Build credibility, access genuine requirements and expand professional networks.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 border border-[#B49029]/40 flex items-center justify-center shrink-0 text-[#B49029]">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-[#182A3E]">
                          Real Estate Media & Industry Experts
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed">
                          Share market intelligence, participate in interviews and contribute to industry discussions.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE 04: OUR VISION */}
              {activeNode === 'vision' && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-[#B49029] flex items-center justify-center mx-auto text-[#B49029] shadow-md">
                    <Eye className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-[#B49029] tracking-widest uppercase">
                      Our Vision
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#182A3E]">
                      Beyond Property Discovery.{' '}
                      <span className="text-[#B49029]">Towards Absolute Market Intelligence.</span>
                    </h2>
                  </div>

                  <blockquote className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-sm sm:text-base text-slate-700 leading-relaxed italic max-w-xl mx-auto shadow-xs">
                    "To become a global benchmark for trusted, informative and interactive real estate discovery by integrating multiple platforms into one intelligent ecosystem."
                  </blockquote>

                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Property Studio is an integrated Real Estate Media Network and Community PropTech Platform connecting property seekers, developers, landowners and verified real estate professionals through intelligent discovery, market insights, broadcast media and community engagement.
                  </p>
                </div>
              )}

              {/* NODE 05: OUR MISSION */}
              {activeNode === 'mission' && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-amber-50 border-2 border-[#B49029] flex items-center justify-center mx-auto text-[#B49029] shadow-md">
                    <Target className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-[#B49029] tracking-widest uppercase">
                      Our Mission
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-[#182A3E]">
                      Unifying Real Estate Architecture
                    </h2>
                  </div>

                  <blockquote className="p-6 bg-slate-50 rounded-3xl border border-slate-200 text-sm sm:text-base text-slate-700 leading-relaxed italic max-w-xl mx-auto shadow-xs">
                    "To unify property search, broadcast media, community discussions, live updates and stakeholder engagement into one seamless global architecture."
                  </blockquote>

                  <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
                    Uniting verified telemetry, broadcast studio dialogues, unedited peer Q&A, and authenticated regulatory audits into one global standard of transparency.
                  </p>
                </div>
              )}

              {/* NODE 06: THE 6 I'S & 6 R'S – CORE DNA */}
              {activeNode === 'core-dna' && (
                <div className="space-y-6">
                  <div className="space-y-1 pb-3 border-b border-slate-200">
                    <div className="inline-block px-3 py-1 rounded-full bg-amber-50 border border-[#B49029]/40 text-[#B49029] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">
                      PROPERTY STUDIO — POSITIONING
                    </div>
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-[#182A3E]">
                      Interactive Core DNA – The 6 I’s & 6 R’s
                    </h2>
                    <p className="text-xs text-slate-600">
                      The institutional principles and foundational architecture governing Property Studio's operations, broadcast media, and community intelligence.
                    </p>
                  </div>

                  {/* Two Columns: 6 I's and 6 R's with Logo Colors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GROUP 1: THE 6 I'S */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#B49029]/30">
                        <span className="w-3 h-3 rounded-full bg-[#B49029]" />
                        <h3 className="font-serif font-bold text-sm text-[#182A3E] uppercase tracking-wider">
                          The 6 I’s of PropTech Architecture
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {/* 01. Interactive */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">01.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Interactive</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            via the IFP / Digital / Smart Board
                          </p>
                        </div>

                        {/* 02. Informative */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">02.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Informative</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            data over hype Unlike Other platforms
                          </p>
                        </div>

                        {/* 03. Intelligent */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">03.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Intelligent</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            deep market analytics
                          </p>
                        </div>

                        {/* 04. Interview */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">04.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Interview</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Podcast with Presentation and Discussion
                          </p>
                        </div>

                        {/* 05. Intermediary */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">05.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Intermediary</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            the trusted neutral bridge
                          </p>
                        </div>

                        {/* 06. All Integrated */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">06.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">All Integrated</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            All Stakeholders of Real Estate Eco system
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* GROUP 2: THE 6 R'S */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-2 border-b border-[#B49029]/30">
                        <span className="w-3 h-3 rounded-full bg-[#B49029]" />
                        <h3 className="font-serif font-bold text-sm text-[#182A3E] uppercase tracking-wider">
                          The 6 R’s of Institutional Trust
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        {/* 01. Real-time */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">01.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Real-time</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Live field and Latest updates
                          </p>
                        </div>

                        {/* 02. Realistic */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">02.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Realistic</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Honest pros/cons
                          </p>
                        </div>

                        {/* 03. Revolutionary */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">03.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Revolutionary</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Re-engineering the property discovery model
                          </p>
                        </div>

                        {/* 04. Reviews */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">04.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Reviews</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Like Google
                          </p>
                        </div>

                        {/* 05. Rating */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">05.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Rating</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Performance & Feedback
                          </p>
                        </div>

                        {/* 06. Referral */}
                        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#B49029]/70 hover:bg-white transition-all">
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono font-bold text-xs text-[#B49029]">06.</span>
                            <strong className="text-xs sm:text-sm text-[#182A3E]">Referral</strong>
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 mt-1 leading-relaxed">
                            Never Recommended (Neutral, direct, unbiased engagement)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons inside Popup */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 font-mono text-[11px]">
                  Discover Real Estate Beyond Listings.
                </span>

                <div className="flex items-center gap-2">
                  {onNavigateCommunity && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNode(null);
                        onNavigateCommunity();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-[#182A3E] border border-slate-300 font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Explore Communities
                    </button>
                  )}

                  {onNavigateProperties && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNode(null);
                        onNavigateProperties();
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#182A3E] hover:bg-[#233B54] text-white border border-transparent font-semibold transition-colors cursor-pointer shadow-xs"
                    >
                      Discover Properties
                    </button>
                  )}

                  {onOpenRegister && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveNode(null);
                        onOpenRegister();
                      }}
                      className="px-4 py-1.5 rounded-xl bg-[#B49029] hover:bg-[#C5A880] text-white font-bold transition-all shadow-xs cursor-pointer"
                    >
                      Join Property Studio
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
