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
  Info
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
    <div className="relative min-h-[calc(100vh-4rem)] w-full bg-[#0A0A0B] text-white flex flex-col items-center justify-center px-4 py-8 sm:py-12 overflow-hidden select-none">
      {/* Subtle luxury ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-[#C5A880]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[900px] h-[300px] bg-[#121214] rounded-t-full border-t border-[#333337]/40 pointer-events-none" />

      {/* Main Semicircle Infographic Container */}
      <div className="relative w-full max-w-4xl mx-auto flex flex-col items-center">
        {/* Top Instruction Pill */}
        <div className="mb-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#121214] border border-[#333337] text-xs font-mono text-[#C5A880] shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#C5A880] animate-pulse" />
          <span>Click any of the 6 nodes to explore Property Studio identity</span>
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
                <stop offset="0%" stopColor="#C5A880" stopOpacity="0.4" />
                <stop offset="50%" stopColor="#C5A880" stopOpacity="1" />
                <stop offset="100%" stopColor="#C5A880" stopOpacity="0.4" />
              </linearGradient>
              <linearGradient id="emblemGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#1B1B1E" />
                <stop offset="100%" stopColor="#121214" />
              </linearGradient>
            </defs>

            {/* Outer Subtle Guide Arc */}
            <path
              d={`M ${cx - r - 20} ${cy} A ${r + 20} ${r + 20} 0 0 1 ${cx + r + 20} ${cy}`}
              fill="none"
              stroke="#333337"
              strokeWidth="1"
              strokeDasharray="4 6"
              className="opacity-40"
            />

            {/* Main Primary Semicircular Arc */}
            <path
              d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
              fill="none"
              stroke="url(#arcGoldGrad)"
              strokeWidth="3.5"
              strokeLinecap="round"
              className={`transition-all duration-1000 ${
                mounted ? 'stroke-dasharray-full' : ''
              }`}
            />

            {/* Inner Concentric Glow Arc */}
            <path
              d={`M ${cx - 200} ${cy} A 200 200 0 0 1 ${cx + 200} ${cy}`}
              fill="none"
              stroke="#C5A880"
              strokeWidth="1"
              strokeOpacity="0.25"
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
                  stroke={isSelected || isHovered ? '#C5A880' : '#333337'}
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
            <div className="relative w-36 h-36 rounded-full bg-gradient-to-b from-[#1B1B1E] to-[#121214] border-2 border-[#C5A880] shadow-[0_0_30px_rgba(197,168,128,0.25)] flex flex-col items-center justify-center p-3 text-center transition-all duration-300 hover:border-[#D7B991] hover:scale-105">
              <div className="w-8 h-8 mb-1 rounded-full bg-[#0A0A0B] border border-[#C5A880]/60 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4 h-4 text-[#C5A880]" />
              </div>
              <span className="font-serif font-black text-xs sm:text-sm tracking-wider text-white">
                PROPERTY STUDIO
              </span>
              <span className="font-mono text-[9px] font-bold text-[#C5A880] tracking-widest mt-0.5 uppercase">
                CORE IDENTITY
              </span>
              <span className="text-[8px] text-[#A5A5AA] mt-0.5 font-medium">
                Six-Node Architecture
              </span>
            </div>
          </div>

          {/* Six Circular Interactive Nodes along the Semicircular Arc */}
          {NODES.map((node, index) => {
            const { x, y } = getNodeCoords(node.angleDeg);
            const leftPct = (x / 900) * 100;
            const topPct = (y / 540) * 100;
            const isSelected = activeNode === node.id;
            const isMuted = activeNode !== null && !isSelected;
            const Icon = node.icon;

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
                  className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                    isSelected
                      ? 'bg-[#C5A880] text-[#0A0A0B] ring-4 ring-[#C5A880]/30 scale-110 shadow-[0_0_25px_rgba(197,168,128,0.6)]'
                      : 'bg-[#121214] text-[#C5A880] border-2 border-[#333337] group-hover:border-[#C5A880] group-hover:scale-105'
                  }`}
                >
                  <span className="font-mono font-black text-xs sm:text-sm tracking-wider">
                    {node.number}
                  </span>

                  {/* Pulsing Highlight Dot for Selected State */}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-white ring-2 ring-[#C5A880] animate-ping" />
                  )}
                </div>

                {/* Node Label Card */}
                <div
                  className={`mt-2 px-2.5 py-1 rounded-xl text-center transition-all duration-200 backdrop-blur-sm pointer-events-none max-w-[130px] sm:max-w-[150px] ${
                    isSelected
                      ? 'bg-[#1B1B1E] border border-[#C5A880] shadow-md'
                      : 'bg-[#121214]/90 border border-[#333337]/80 group-hover:border-[#C5A880]/60'
                  }`}
                >
                  <div
                    className={`font-serif font-bold text-[11px] sm:text-xs leading-tight ${
                      isSelected ? 'text-[#C5A880]' : 'text-white group-hover:text-[#D7B991]'
                    }`}
                  >
                    {node.title}
                  </div>
                  <div className="text-[9px] text-[#A5A5AA] truncate font-medium mt-0.5">
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
        INTERACTIVE POPUP MODAL (SEMI-TRANSPARENT BACKDROP RETAINS VISIBLE ARC)
        ========================================================================
      */}
      {activeNode && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActiveNode(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0A0A0B]/75 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`relative w-full bg-[#121214] border border-[#C5A880]/40 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200 ${
              activeNode === 'core-dna' ? 'max-w-4xl' : 'max-w-2xl'
            }`}
          >
            {/* Modal Header Bar with Node Number & Stepper */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#333337] bg-[#1B1B1E]/80">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full bg-[#C5A880] text-[#0A0A0B] font-mono font-black text-xs">
                  NODE {activeNodeData?.number}
                </span>
                <span className="text-xs font-mono text-[#A5A5AA]">
                  {activeNodeIndex + 1} of {NODES.length}
                </span>
                <span className="text-xs font-serif font-bold text-white hidden sm:inline">
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
                  className="p-1.5 rounded-xl text-[#A5A5AA] hover:text-white hover:bg-[#121214] border border-transparent hover:border-[#333337] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
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
                  className="p-1.5 rounded-xl text-[#A5A5AA] hover:text-white hover:bg-[#121214] border border-transparent hover:border-[#333337] disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                  title="Next Node"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setActiveNode(null)}
                  className="p-1.5 rounded-xl text-[#A5A5AA] hover:text-white hover:bg-[#121214] border border-transparent hover:border-[#333337] cursor-pointer ml-2"
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
                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-[#333337]">
                    <img
                      src="/brand/swamy-reddy-portrait.jpg"
                      alt="Swamy Reddy Javidi"
                      className="w-28 h-36 sm:w-32 sm:h-40 rounded-2xl object-cover border-2 border-[#C5A880]/60 shadow-xl shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/brand/property-studio-hero.jpg';
                      }}
                    />
                    <div className="space-y-2 text-center sm:text-left">
                      <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#1B1B1E] border border-[#C5A880]/40 text-[#C5A880] text-[10px] font-mono font-bold uppercase tracking-wider">
                        Founder & CEO – Property Studio
                      </div>
                      <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
                        Swamy Reddy Javidi
                      </h2>
                      <p className="text-xs text-[#A5A5AA] leading-relaxed">
                        MBA in Marketing with 24+ years of distinguished corporate and real estate leadership.
                      </p>
                      <div className="text-xs text-slate-300 space-y-1 pt-1">
                        <div>
                          Corporate experience with <strong className="text-white">Reliance Jio, Tata Teleservices, Idea Cellular, Hindustan Unilever</strong> and <strong className="text-white">PepsiCo</strong>.
                        </div>
                        <div>
                          Founder of <strong className="text-[#C5A880]">Sadguna Properties</strong>.
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                      Core Strategic Focus
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                      Focus on real estate intelligence, market analytics, compliance and absolute transparency. Eliminating misleading claims through verified telemetry and honest reporting.
                    </p>
                  </div>

                  {/* Founder Philosophy: 6C Step Sequence */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-mono font-bold text-[#C5A880] uppercase tracking-wider">
                        Founder Philosophy
                      </h3>
                      <span className="text-[10px] font-mono text-[#A5A5AA]">The 6C Trust Continuum</span>
                    </div>

                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] text-xs font-semibold text-white tracking-wide flex flex-wrap items-center justify-center gap-2 text-center">
                      <span className="text-[#C5A880]">Content</span>
                      <span className="text-[#A5A5AA]">→</span>
                      <span className="text-[#C5A880]">Courage</span>
                      <span className="text-[#A5A5AA]">→</span>
                      <span className="text-[#C5A880]">Confidence</span>
                      <span className="text-[#A5A5AA]">→</span>
                      <span className="text-[#C5A880]">Communication</span>
                      <span className="text-[#A5A5AA]">→</span>
                      <span className="text-[#C5A880]">Contacts</span>
                      <span className="text-[#A5A5AA]">→</span>
                      <span className="text-[#C5A880]">Convincing</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-[11px]">
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">01. Content:</span> Verified market intelligence
                      </div>
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">02. Courage:</span> Disclosing honest realities
                      </div>
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">03. Confidence:</span> Empowering seeker decisions
                      </div>
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">04. Communication:</span> Clear broadcast media
                      </div>
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">05. Contacts:</span> Connecting genuine stakeholders
                      </div>
                      <div className="p-2.5 bg-[#0A0A0B] rounded-xl border border-[#333337]/80">
                        <span className="font-mono text-[#C5A880] font-bold">06. Convincing:</span> Trust-backed transactions
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* NODE 02: FIVE INTEGRATED PILLARS */}
              {activeNode === 'pillars' && (
                <div className="space-y-4">
                  <div className="space-y-1 pb-2">
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                      Five Integrated Pillars
                    </h2>
                    <p className="text-xs text-[#A5A5AA]">
                      The multi-dimensional architecture powering Property Studio discovery and verification.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {/* Pillar 01 */}
                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/50 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Search className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C5A880]">01</span>
                          <h3 className="font-serif font-bold text-sm text-white">Aggregator Engine</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Property search and discovery, bringing property opportunities together across residential, commercial, farm lands, and plots.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 02 */}
                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/50 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Tv className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C5A880]">02</span>
                          <h3 className="font-serif font-bold text-sm text-white">Broadcast Network</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Studio presentations, podcasts, interviews and live ground reports capturing authentic construction milestones and infrastructure updates.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 03 */}
                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/50 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C5A880]">03</span>
                          <h3 className="font-serif font-bold text-sm text-white">Community Hive</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Community discussions, questions and project-level feedback answered by verified local residents and industry peers.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 04 */}
                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/50 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Award className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C5A880]">04</span>
                          <h3 className="font-serif font-bold text-sm text-white">Performance Index</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Developer and professional verification, ratings and performance insights assessing delivery timelines, compliance, and build quality.
                        </p>
                      </div>
                    </div>

                    {/* Pillar 05 */}
                    <div className="p-4 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/50 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Radio className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-[#C5A880]">05</span>
                          <h3 className="font-serif font-bold text-sm text-white">Town Hall Arena</h3>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
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
                  <div className="space-y-1 pb-2">
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                      Who We Serve
                    </h2>
                    <p className="text-xs text-[#A5A5AA]">
                      Connecting five key stakeholder groups into one verified real estate ecosystem.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3.5 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Compass className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white">
                          Property Seekers & Investors
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Discover properties, compare opportunities and submit requirements with privacy protection.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Building className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white">
                          Developers & Builders
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Connect with buyers, manage project communities and share official project updates.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Landmark className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white">
                          Landowners
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Connect with developers and verified real estate professionals for joint ventures and structured developments.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Briefcase className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white">
                          Verified Agents & Channel Partners
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Build credibility, access genuine requirements and expand professional networks.
                        </p>
                      </div>
                    </div>

                    <div className="p-3.5 bg-[#1B1B1E] rounded-2xl border border-[#333337] flex items-start gap-3.5">
                      <div className="w-9 h-9 rounded-xl bg-[#0A0A0B] border border-[#C5A880]/40 flex items-center justify-center shrink-0 text-[#C5A880]">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="font-serif font-bold text-xs sm:text-sm text-white">
                          Real Estate Media & Industry Experts
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
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
                  <div className="w-16 h-16 rounded-full bg-[#1B1B1E] border-2 border-[#C5A880] flex items-center justify-center mx-auto text-[#C5A880] shadow-[0_0_30px_rgba(197,168,128,0.25)]">
                    <Eye className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-[#C5A880] tracking-widest uppercase">
                      Our Vision
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
                      Beyond Property Discovery.{' '}
                      <span className="text-[#C5A880]">Towards Absolute Market Intelligence.</span>
                    </h2>
                  </div>

                  <blockquote className="p-6 bg-[#1B1B1E] rounded-3xl border border-[#333337] text-sm sm:text-base text-slate-200 leading-relaxed italic max-w-xl mx-auto shadow-inner">
                    "To become a global benchmark for trusted, informative and interactive real estate discovery by integrating multiple platforms into one intelligent ecosystem."
                  </blockquote>

                  <p className="text-xs text-[#A5A5AA] max-w-lg mx-auto leading-relaxed">
                    Property Studio is an integrated Real Estate Media Network and Community PropTech Platform connecting property seekers, developers, landowners and verified real estate professionals through intelligent discovery, market insights, broadcast media and community engagement.
                  </p>
                </div>
              )}

              {/* NODE 05: OUR MISSION */}
              {activeNode === 'mission' && (
                <div className="space-y-6 text-center py-4">
                  <div className="w-16 h-16 rounded-full bg-[#1B1B1E] border-2 border-[#C5A880] flex items-center justify-center mx-auto text-[#C5A880] shadow-[0_0_30px_rgba(197,168,128,0.25)]">
                    <Target className="w-8 h-8" />
                  </div>

                  <div className="space-y-2">
                    <span className="font-mono text-xs font-bold text-[#C5A880] tracking-widest uppercase">
                      Our Mission
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-serif font-black text-white">
                      Unifying Real Estate Architecture
                    </h2>
                  </div>

                  <blockquote className="p-6 bg-[#1B1B1E] rounded-3xl border border-[#333337] text-sm sm:text-base text-slate-200 leading-relaxed italic max-w-xl mx-auto shadow-inner">
                    "To unify property search, broadcast media, community discussions, live updates and stakeholder engagement into one seamless global architecture."
                  </blockquote>

                  <p className="text-xs text-[#A5A5AA] max-w-lg mx-auto leading-relaxed">
                    Uniting verified telemetry, broadcast studio dialogues, unedited peer Q&A, and authenticated regulatory audits into one global standard of transparency.
                  </p>
                </div>
              )}

              {/* NODE 06: THE 6 I'S & 6 R'S – CORE DNA */}
              {activeNode === 'core-dna' && (
                <div className="space-y-6">
                  <div className="space-y-1 pb-2 border-b border-[#333337]">
                    <span className="font-mono text-xs font-bold text-[#C5A880] tracking-widest uppercase">
                      Interactive Core DNA
                    </span>
                    <h2 className="text-xl sm:text-2xl font-serif font-black text-white">
                      The 6 I's & The 6 R's
                    </h2>
                    <p className="text-xs text-[#A5A5AA]">
                      The foundational PropTech principles governing Property Studio's operations and compliance.
                    </p>
                  </div>

                  {/* Two Visually Distinct Columns: 6 I's and 6 R's */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* GROUP 1: THE 6 I'S */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-[#333337]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C5A880]" />
                        <h3 className="font-serif font-bold text-sm text-[#C5A880] uppercase tracking-wider">
                          The 6 I's of PropTech Architecture
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">01.</span>
                          <strong className="text-xs text-white">Interactive</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Explore property layouts and presentations through Interactive Flat Panels, digital and smart boards.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">02.</span>
                          <strong className="text-xs text-white">Informative</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Data over hype. Reliable information over promotional claims.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">03.</span>
                          <strong className="text-xs text-white">Intelligent</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Deep market analytics and data-driven property insights.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">04.</span>
                          <strong className="text-xs text-white">Interview</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Podcasts, presentations and discussions with real estate stakeholders.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">05.</span>
                          <strong className="text-xs text-white">Intermediary</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            A trusted, neutral bridge connecting all real estate stakeholders.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">06.</span>
                          <strong className="text-xs text-white">All Integrated</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Bringing all stakeholders of the real estate ecosystem together.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* GROUP 2: THE 6 R'S */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 pb-1 border-b border-[#333337]">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#C5A880]" />
                        <h3 className="font-serif font-bold text-sm text-[#C5A880] uppercase tracking-wider">
                          The 6 R's of Institutional Trust
                        </h3>
                      </div>

                      <div className="space-y-2.5">
                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">01.</span>
                          <strong className="text-xs text-white">Real-time</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Live field reports and the latest property updates.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">02.</span>
                          <strong className="text-xs text-white">Realistic</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Honest insights covering both advantages and disadvantages.
                          </p>
                        </div>

                        <div className="p-3 bg-[#1B1B1E] rounded-xl border border-[#333337]">
                          <span className="font-mono font-bold text-xs text-[#C5A880] mr-2">03.</span>
                          <strong className="text-xs text-white">Revolutionary</strong>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            Re-engineering the property discovery model with privacy-first data masking.
                          </p>
                        </div>

                        {/* Reserved slots flexible for upcoming policy standards */}
                        <div className="p-3 bg-[#0A0A0B]/80 rounded-xl border border-[#333337]/50 opacity-60">
                          <span className="font-mono font-bold text-xs text-[#A5A5AA] mr-2">04.</span>
                          <strong className="text-xs text-[#A5A5AA]">Tenet IV (Reserved)</strong>
                          <p className="text-[11px] text-[#A5A5AA] mt-1 leading-relaxed">
                            Architectural slot reserved for upcoming governance benchmarks.
                          </p>
                        </div>

                        <div className="p-3 bg-[#0A0A0B]/80 rounded-xl border border-[#333337]/50 opacity-60">
                          <span className="font-mono font-bold text-xs text-[#A5A5AA] mr-2">05.</span>
                          <strong className="text-xs text-[#A5A5AA]">Tenet V (Reserved)</strong>
                          <p className="text-[11px] text-[#A5A5AA] mt-1 leading-relaxed">
                            Configured for green building disclosures and sustainability metrics.
                          </p>
                        </div>

                        <div className="p-3 bg-[#0A0A0B]/80 rounded-xl border border-[#333337]/50 opacity-60">
                          <span className="font-mono font-bold text-xs text-[#A5A5AA] mr-2">06.</span>
                          <strong className="text-xs text-[#A5A5AA]">Tenet VI (Reserved)</strong>
                          <p className="text-[11px] text-[#A5A5AA] mt-1 leading-relaxed">
                            Reserved slot for community accreditation and ecosystem indexes.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons inside Popup */}
              <div className="pt-4 border-t border-[#333337] flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-[#A5A5AA] font-mono text-[11px]">
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
                      className="px-3 py-1.5 rounded-xl bg-[#1B1B1E] hover:bg-[#26262b] text-[#C5A880] border border-[#333337] font-semibold transition-colors cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-[#1B1B1E] hover:bg-[#26262b] text-white border border-[#333337] font-semibold transition-colors cursor-pointer"
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
                      className="px-4 py-1.5 rounded-xl bg-[#C5A880] hover:bg-[#D7B991] text-[#0A0A0B] font-bold transition-all shadow-sm cursor-pointer"
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
