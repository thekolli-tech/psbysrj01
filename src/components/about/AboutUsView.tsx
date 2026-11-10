import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  FileCheck,
  Cpu,
  Mic,
  Handshake,
  Layers,
  Zap,
  CheckCircle,
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
  Eye,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Share2,
  Lock,
  Clock,
  Briefcase,
  TrendingUp,
  MapPin,
  Check
} from 'lucide-react';
import { BrandLogo } from '../common/BrandLogo';

interface AboutUsViewProps {
  onNavigateHome?: () => void;
  onNavigateCommunity?: () => void;
  onNavigateProperties?: () => void;
  onOpenRegister?: () => void;
  onOpenLogin?: () => void;
}

interface DnaItem {
  id: string;
  number: string;
  title: string;
  headline: string;
  explanation: string;
  details: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  isReserved?: boolean;
}

// The 6 I's of PropTech Architecture
const SIX_IS: DnaItem[] = [
  {
    id: 'interactive',
    number: '01',
    title: 'Interactive',
    headline: 'Visual & Participatory Discovery',
    explanation:
      'Explore property layouts, architectural elevations, and project walkthroughs through interactive smart displays, digital touch screens, and live presentations.',
    details:
      'Replacing static brochures with dynamic touch-enabled visual navigation, virtual site walks, and live Q&A sessions.',
    icon: Sparkles,
    badge: 'Experience'
  },
  {
    id: 'informative',
    number: '02',
    title: 'Informative',
    headline: 'Unfiltered Truth Over Marketing Hype',
    explanation:
      'Real information, validated RERA filings, unedited cost schedules, and deep micro-market ground reports rather than promotional hype.',
    details:
      'Granular data on carpet area ratios, municipal water feasibility, traffic patterns, corpus funds, and actual registry timelines.',
    icon: FileCheck,
    badge: 'Integrity'
  },
  {
    id: 'intelligent',
    number: '03',
    title: 'Intelligent',
    headline: 'Data-Driven Telemetry & Analytics',
    explanation:
      'Deep market analytics, price trends, comparative infrastructure indices, and intelligent property insights powered by local telemetry.',
    details:
      'Tracking micro-market price movements across Kokapet, Neopolis, Financial District, Tellapur, and emerging high-growth corridors.',
    icon: Cpu,
    badge: 'Analytics'
  },
  {
    id: 'interview',
    number: '04',
    title: 'Interview',
    headline: 'Direct Voice of Industry Stakeholders',
    explanation:
      'Studio debriefs, podcasts, video interviews, and town-hall discussions with developers, structural engineers, urban planners, and residents.',
    details:
      'Unscripted conversations addressing regulatory approvals, construction quality standards, and real-world livability challenges.',
    icon: Mic,
    badge: 'Media'
  },
  {
    id: 'intermediary',
    number: '05',
    title: 'Intermediary',
    headline: 'Neutral, Conflict-Free Institutional Bridge',
    explanation:
      'A trusted, neutral bridge connecting property seekers, landowners, developers, and certified professionals with total privacy and zero spam.',
    details:
      'Eliminating cold-call brokers and aggressive spam through cryptographically masked, opt-in lead transactions and verified matchmaking.',
    icon: Handshake,
    badge: 'Trust'
  },
  {
    id: 'integrated',
    number: '06',
    title: 'All Integrated',
    headline: 'Complete PropTech Ecosystem Under One Roof',
    explanation:
      'Bringing the entire real estate journey together: search aggregator, broadcast video, unedited community forums, reviews, and network.',
    details:
      'A unified platform where seekers discover, verify, discuss, and transact with absolute transparency and institutional rigor.',
    icon: Layers,
    badge: 'Ecosystem'
  }
];

// The 6 R's of Institutional Trust (3 supplied principles + 3 reserved flexible slots)
const SIX_RS: DnaItem[] = [
  {
    id: 'real-time',
    number: '01',
    title: 'Real-time',
    headline: 'Live Field Telemetry & Ground Updates',
    explanation:
      'Live field reports, verified drone inspections, and the latest property updates directly from the ground across Hyderabad corridors.',
    details:
      'Real-time construction progress tracking, concrete slab milestones, and instantaneous municipal approval alerts.',
    icon: Zap,
    badge: 'Active Tenet',
    isReserved: false
  },
  {
    id: 'realistic',
    number: '02',
    title: 'Realistic',
    headline: 'Balanced, Objective Evaluation',
    explanation:
      'Honest, objective insights highlighting both advantages and disadvantages for every project and locality without bias.',
    details:
      'Transparent disclosure of high-tension lines, access road widths, groundwater depth, traffic bottlenecks, and delivery risks.',
    icon: CheckCircle,
    badge: 'Active Tenet',
    isReserved: false
  },
  {
    id: 'revolutionary',
    number: '03',
    title: 'Revolutionary',
    headline: 'Re-engineering Property Discovery',
    explanation:
      'Re-engineering the way people discover, verify, and evaluate properties through encrypted data masking and spam-free matchmaking.',
    details:
      'Pioneering a privacy-first lead architecture where seeker phone numbers and personal emails are never shared without explicit permission.',
    icon: Rocket,
    badge: 'Active Tenet',
    isReserved: false
  },
  {
    id: 'reserved-04',
    number: '04',
    title: 'Tenet IV',
    headline: 'Institutional Operational Principle',
    explanation:
      'Reserved operational tenet in the 6 R governance charter. Flexible architectural slot reserved for ongoing institutional expansion.',
    details:
      'Configured within Property Studio’s modular governance matrix for upcoming policy and compliance standards.',
    icon: ShieldCheck,
    badge: 'Charter Reserved',
    isReserved: true
  },
  {
    id: 'reserved-05',
    number: '05',
    title: 'Tenet V',
    headline: 'Stakeholder Governance Principle',
    explanation:
      'Reserved operational tenet in the 6 R governance charter. Flexible architectural slot reserved for ongoing institutional expansion.',
    details:
      'Designed to adapt to new regulatory disclosures, green building standards, and verified performance benchmarks.',
    icon: Award,
    badge: 'Charter Reserved',
    isReserved: true
  },
  {
    id: 'reserved-06',
    number: '06',
    title: 'Tenet VI',
    headline: 'Ecosystem Performance Principle',
    explanation:
      'Reserved operational tenet in the 6 R governance charter. Flexible architectural slot reserved for ongoing institutional expansion.',
    details:
      'Reserved slot for future ecosystem indices and community accreditation mechanisms.',
    icon: Users,
    badge: 'Charter Reserved',
    isReserved: true
  }
];

// The Five Pillars
const FIVE_PILLARS = [
  {
    id: 'aggregator',
    number: '01',
    title: 'Aggregator Engine',
    subtitle: 'Property Search & Discovery',
    description:
      'Comprehensive property search and discovery across Residential, Commercial, Farm Land, and Plotting ventures with zero duplicate clutter.',
    icon: Search,
    highlight: 'Zero Duplicate Clutter'
  },
  {
    id: 'broadcast',
    number: '02',
    title: 'Broadcast Network',
    subtitle: 'Studio Media & Video Telemetry',
    description:
      'Studio presentations, stakeholder interviews, video walkthroughs, and ground reports capturing real construction realities.',
    icon: Tv,
    highlight: 'Visual Ground Intelligence'
  },
  {
    id: 'community',
    number: '03',
    title: 'Community Hive',
    subtitle: 'Discussion & Project Q&A',
    description:
      'Authentic community discussions, questions, and project-level ground realities answered by verified local residents and industry peers.',
    icon: MessageSquare,
    highlight: 'Uncensored Peer Insight'
  },
  {
    id: 'performance',
    number: '04',
    title: 'Performance Index',
    subtitle: 'Ratings, Audits & Verification',
    description:
      'Developer and professional verification, compliance audits, and multi-dimensional rating insights assessing delivery integrity.',
    icon: Award,
    highlight: 'Audited Track Records'
  },
  {
    id: 'townhall',
    number: '05',
    title: 'Town Hall Arena',
    subtitle: 'Live Summits & Networking',
    description:
      'Live virtual summits, podcast debriefs, and stakeholder networking connecting seekers, builders, and experts with encrypted privacy.',
    icon: Radio,
    highlight: 'Collaborative Governance'
  }
];

// Target Audiences (Who We Serve)
const STAKEHOLDERS = [
  {
    title: 'Property Seekers & Investors',
    description:
      'Discover verified properties and submit confidential requirements with full phone and email privacy protection against spam.',
    icon: Compass,
    tag: 'Buyers & HNIs'
  },
  {
    title: 'Developers & Builders',
    description:
      'Connect with genuine, high-intent buyers, manage official project community hubs, and publish audited construction updates.',
    icon: Building,
    tag: 'Builders & Promoters'
  },
  {
    title: 'Verified Agents & Channel Partners',
    description:
      'Build verifiable RERA credibility, access qualified buyer requirements, and collaborate with transparent commission protection.',
    icon: Briefcase,
    tag: 'RERA Professionals'
  },
  {
    title: 'Landowners',
    description:
      'Connect directly with verified developers and property professionals for joint ventures, plotting, and structured development.',
    icon: Landmark,
    tag: 'Land & Estates'
  },
  {
    title: 'Real Estate Media & Industry Experts',
    description:
      'Share market insights, host studio debriefs, and participate in authoritative industry debates across Hyderabad corridors.',
    icon: Users,
    tag: 'Media & Analysts'
  }
];

// 6C Philosophy Steps
const PHILOSOPHY_STEPS = [
  { step: '01', word: 'Content', desc: 'Authoritative ground intelligence & verified data' },
  { step: '02', word: 'Courage', desc: 'Disclosing objective truths and regulatory compliance' },
  { step: '03', word: 'Confidence', desc: 'Empowering seekers with transparent analysis' },
  { step: '04', word: 'Communication', desc: 'Clear broadcast media and unscripted dialogues' },
  { step: '05', word: 'Contacts', desc: 'Connecting seekers, builders & verified stakeholders' },
  { step: '06', word: 'Convincing', desc: 'Facilitating informed, trust-backed decisions' }
];

export const AboutUsView: React.FC<AboutUsViewProps> = ({
  onNavigateHome,
  onNavigateCommunity,
  onNavigateProperties,
  onOpenRegister,
  onOpenLogin
}) => {
  // Semicircle framework selection: '6I' or '6R'
  const [activeDnaFramework, setActiveDnaFramework] = useState<'6I' | '6R'>('6I');
  const [selectedSegmentIndex, setSelectedSegmentIndex] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Set page title for SEO & accessibility
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'About Us | Property Studio — Real Estate Media Network & PropTech Platform';

    // Meta description update
    let metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute(
      'content',
      'Learn about Property Studio, the integrated Real Estate Media Network & Community PropTech Platform founded by Swamy Reddy Javidi. Explore our Core DNA (6 I’s & 6 R’s), five pillars, and vision.'
    );

    return () => {
      document.title = originalTitle;
      if (metaDesc && originalDesc) {
        metaDesc.setAttribute('content', originalDesc);
      }
    };
  }, []);

  const currentDataset = activeDnaFramework === '6I' ? SIX_IS : SIX_RS;
  const activeSegment = currentDataset[selectedSegmentIndex] || currentDataset[0];

  // Semicircle parameters
  // Angles span from 180° (left) to 0° (right) across 6 items
  // Segment i angle: 180 - i * (180 / 5) -> i=0: 180°, i=1: 144°, i=2: 108°, i=3: 72°, i=4: 36°, i=5: 0°
  const centerX = 320;
  const centerY = 300;
  const arcRadius = 220;

  const getCoordinates = (index: number) => {
    const total = 6;
    // Angle in degrees: 180 to 0
    const angleDeg = 180 - (index * 180) / (total - 1);
    const angleRad = (angleDeg * Math.PI) / 180;
    const x = centerX + arcRadius * Math.cos(angleRad);
    const y = centerY - arcRadius * Math.sin(angleRad);
    return { x, y, angleDeg };
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 antialiased pb-20 select-none">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#182A3E] via-[#1E344D] to-[#182A3E] text-white pt-16 pb-20 md:pt-24 md:pb-28">
        {/* Subtle decorative glow & grid */}
        <div className="absolute inset-0 bg-[radial-gradient(#B49029_1px,transparent_1px)] [background-size:32px_32px] opacity-10 pointer-events-none" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[#B49029]/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Institutional Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-[#B49029]/40 text-[#ECC968] text-xs font-mono font-bold tracking-wider uppercase mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#B49029] animate-pulse" />
            <span>PropTech Ecosystem · Broadcast Network · Market Intelligence</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black font-display tracking-tight text-white leading-tight max-w-4xl mx-auto">
            Beyond Property Discovery.{' '}
            <span className="bg-gradient-to-r from-[#ECC968] via-[#B49029] to-[#ECC968] bg-clip-text text-transparent">
              Towards Absolute Market Intelligence.
            </span>
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-sm sm:text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl mx-auto font-normal">
            Property Studio is an integrated Real Estate Media Network and Community PropTech Platform connecting
            property seekers, developers, landowners, and verified real estate professionals through intelligent discovery,
            broadcast media, ground telemetry, and verified community engagement.
          </p>

          {/* CTA Row */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="#core-dna"
              className="px-6 py-3 rounded-xl bg-[#B49029] hover:bg-[#A38122] text-[#182A3E] font-bold text-xs sm:text-sm transition-all duration-200 shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Explore Core DNA (6 I’s & 6 R’s)</span>
              <ArrowRight className="w-4 h-4" />
            </a>

            <button
              type="button"
              onClick={onNavigateProperties || onNavigateHome}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white border border-white/20 font-bold text-xs sm:text-sm backdrop-blur-sm transition-all duration-200 cursor-pointer active:scale-95"
            >
              Discover Properties
            </button>

            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="px-6 py-3 rounded-xl bg-white text-[#182A3E] hover:bg-slate-100 font-bold text-xs sm:text-sm transition-all duration-200 shadow-md cursor-pointer active:scale-95"
              >
                Join Property Studio
              </button>
            )}
          </div>

          {/* Metrics Bar */}
          <div className="mt-14 pt-8 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-xl sm:text-2xl font-black font-mono text-[#ECC968]">24+ Yrs</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Corporate & Advisory Pedigree</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-xl sm:text-2xl font-black font-mono text-white">5 Pillars</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Integrated Architecture</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-xl sm:text-2xl font-black font-mono text-white">14 Roles</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Ecosystem Stakeholders</div>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
              <div className="text-xl sm:text-2xl font-black font-mono text-emerald-400">100% Privacy</div>
              <div className="text-[11px] text-slate-300 font-medium mt-0.5">Encrypted Data Masking</div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. INTERACTIVE CORE DNA – 6 I’s & 6 R’s (MAIN VISUAL HIGHLIGHT) */}
      <section id="core-dna" className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B49029]/10 border border-[#B49029]/30 text-[#B49029] text-[11px] font-mono font-bold tracking-widest uppercase mb-3">
            <span>Visual Highlight · Foundational Framework</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#182A3E] font-display">
            Interactive Core DNA
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Property Studio is anchored on two foundational strategic frameworks: the{' '}
            <strong className="text-slate-900">6 I’s of PropTech Architecture</strong> and the{' '}
            <strong className="text-slate-900">6 R’s of Institutional Trust</strong>.
            Select any node on the interactive arc to inspect its principles.
          </p>

          {/* Framework Toggle Switch */}
          <div className="mt-6 inline-flex p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300 shadow-inner">
            <button
              type="button"
              onClick={() => {
                setActiveDnaFramework('6I');
                setSelectedSegmentIndex(0);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeDnaFramework === '6I'
                  ? 'bg-[#182A3E] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#B49029]" />
              <span>The 6 I’s (Architecture)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveDnaFramework('6R');
                setSelectedSegmentIndex(0);
              }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                activeDnaFramework === '6R'
                  ? 'bg-[#182A3E] text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>The 6 R’s (Institutional Trust)</span>
            </button>
          </div>
        </div>

        {/* Large Semicircular Interactive Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden p-6 sm:p-8 lg:p-10 relative">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left/Top: Semicircular Graphic Arc */}
            <div className="lg:col-span-7 flex flex-col items-center justify-center relative select-none">
              <div className="w-full max-w-[580px] aspect-[640/360] relative flex items-center justify-center">
                <svg
                  viewBox="0 0 640 360"
                  className="w-full h-full overflow-visible"
                  aria-label="Core DNA Semicircle Visualization"
                >
                  <defs>
                    {/* Glowing gold arc gradient */}
                    <linearGradient id="arcGlow" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#182A3E" />
                      <stop offset="50%" stopColor="#B49029" />
                      <stop offset="100%" stopColor="#182A3E" />
                    </linearGradient>
                    <filter id="shadowFilter" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#182A3E" floodOpacity="0.15" />
                    </filter>
                  </defs>

                  {/* Outer subtle guide arc */}
                  <path
                    d="M 100 300 A 220 220 0 0 1 540 300"
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth="8"
                    strokeLinecap="round"
                  />

                  {/* Active glowing arc */}
                  <path
                    d="M 100 300 A 220 220 0 0 1 540 300"
                    fill="none"
                    stroke="url(#arcGlow)"
                    strokeWidth="4"
                    strokeDasharray="4 8"
                    className="opacity-70"
                  />

                  {/* Inner baseline chord */}
                  <line
                    x1="100"
                    y1="300"
                    x2="540"
                    y2="300"
                    stroke="#CBD5E1"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />

                  {/* Radial rays connecting center to each node */}
                  {currentDataset.map((_, index) => {
                    const { x, y } = getCoordinates(index);
                    const isSelected = selectedSegmentIndex === index;
                    return (
                      <line
                        key={`ray-${index}`}
                        x1={centerX}
                        y1={centerY}
                        x2={x}
                        y2={y}
                        stroke={isSelected ? '#B49029' : '#E2E8F0'}
                        strokeWidth={isSelected ? '2.5' : '1'}
                        strokeDasharray={isSelected ? 'none' : '2 4'}
                        className="transition-all duration-300"
                      />
                    );
                  })}

                  {/* Central Property Studio Emblem */}
                  <g transform={`translate(${centerX}, ${centerY})`}>
                    {/* Pulsing halo */}
                    <circle r="46" fill="#FEF8EC" stroke="#B49029" strokeWidth="2" opacity="0.8" />
                    <circle r="38" fill="#182A3E" filter="url(#shadowFilter)" />
                    {/* Emblem text / crest */}
                    <text
                      textAnchor="middle"
                      dy="-4"
                      fill="#ECC968"
                      fontSize="14"
                      fontWeight="900"
                      fontFamily="monospace"
                      letterSpacing="2"
                    >
                      PS
                    </text>
                    <text
                      textAnchor="middle"
                      dy="12"
                      fill="#FFFFFF"
                      fontSize="7"
                      fontWeight="700"
                      fontFamily="sans-serif"
                      letterSpacing="1"
                    >
                      CORE DNA
                    </text>
                  </g>

                  {/* 6 Interactive Semicircular Nodes */}
                  {currentDataset.map((item, index) => {
                    const { x, y } = getCoordinates(index);
                    const isSelected = selectedSegmentIndex === index;

                    return (
                      <g
                        key={item.id}
                        transform={`translate(${x}, ${y})`}
                        onClick={() => setSelectedSegmentIndex(index)}
                        className="cursor-pointer group"
                      >
                        {/* Outer selection ring */}
                        {isSelected && (
                          <circle
                            r="28"
                            fill="none"
                            stroke="#B49029"
                            strokeWidth="3"
                            className="animate-pulse"
                          />
                        )}

                        {/* Node circle */}
                        <circle
                          r="22"
                          fill={isSelected ? '#182A3E' : '#FFFFFF'}
                          stroke={isSelected ? '#B49029' : '#CBD5E1'}
                          strokeWidth={isSelected ? '3' : '2'}
                          filter="url(#shadowFilter)"
                          className="transition-all duration-200 group-hover:scale-110"
                        />

                        {/* Number text */}
                        <text
                          textAnchor="middle"
                          dy="4"
                          fill={isSelected ? '#ECC968' : '#182A3E'}
                          fontSize="11"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {item.number}
                        </text>

                        {/* Label underneath node */}
                        <text
                          textAnchor="middle"
                          dy={y > 280 ? '38' : '-28'}
                          fill={isSelected ? '#B49029' : '#475569'}
                          fontSize="11"
                          fontWeight={isSelected ? '800' : '600'}
                          className="transition-colors duration-200"
                        >
                          {item.title}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Mobile / Quick Pill Selector */}
              <div className="mt-4 flex flex-wrap justify-center gap-1.5 sm:gap-2">
                {currentDataset.map((item, index) => {
                  const isSelected = selectedSegmentIndex === index;
                  return (
                    <button
                      key={`btn-${item.id}`}
                      type="button"
                      onClick={() => setSelectedSegmentIndex(index)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#182A3E] text-[#ECC968] shadow-sm ring-2 ring-[#B49029]'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="font-mono text-[10px] opacity-75">{item.number}</span>
                      <span>{item.title}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right/Bottom: Selected Principle Information Panel */}
            <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 to-amber-50/30 rounded-2xl p-6 sm:p-7 border border-slate-200 shadow-sm relative">
              <div className="flex items-center justify-between gap-3 mb-4">
                <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-[#182A3E] text-white">
                  {activeDnaFramework === '6I' ? '6 I’s Architecture' : '6 R’s Tenet'} · Pillar {activeSegment.number}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                    activeSegment.isReserved
                      ? 'bg-slate-200 text-slate-600'
                      : 'bg-[#B49029]/15 text-[#8F711C] border border-[#B49029]/30'
                  }`}
                >
                  {activeSegment.badge}
                </span>
              </div>

              {/* Icon & Title */}
              <div className="flex items-center gap-3.5 mb-3">
                <div className="w-12 h-12 rounded-2xl bg-[#182A3E] text-[#ECC968] flex items-center justify-center shrink-0 shadow-sm">
                  {React.createElement(activeSegment.icon, { className: 'w-6 h-6' })}
                </div>
                <div>
                  <h3 className="text-xl sm:text-2xl font-black text-[#182A3E] font-display">
                    {activeSegment.title}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">{activeSegment.headline}</p>
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-4 pt-4 border-t border-slate-200/80 space-y-3">
                <p className="text-sm font-semibold text-slate-800 leading-relaxed">
                  {activeSegment.explanation}
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeSegment.details}
                </p>
              </div>

              {/* Navigation within DNA */}
              <div className="mt-6 pt-4 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSegmentIndex(prev => (prev > 0 ? prev - 1 : currentDataset.length - 1))
                  }
                  className="font-bold text-[#182A3E] hover:text-[#B49029] transition-colors cursor-pointer"
                >
                  ← Previous Node
                </button>
                <span className="font-mono text-[11px] font-bold">
                  {selectedSegmentIndex + 1} of {currentDataset.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setSelectedSegmentIndex(prev => (prev < currentDataset.length - 1 ? prev + 1 : 0))
                  }
                  className="font-bold text-[#182A3E] hover:text-[#B49029] transition-colors cursor-pointer"
                >
                  Next Node →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. THE FIVE PILLARS OF PROPERTY STUDIO */}
      <section className="py-16 bg-white border-y border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[11px] font-mono font-bold tracking-widest uppercase mb-3">
              <span>Platform Core Pillars</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#182A3E] font-display">
              The Five Integrated Pillars
            </h2>
            <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
              Property Studio converges media production, search aggregation, community discourse, performance ratings,
              and live networking into a seamless PropTech platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {FIVE_PILLARS.map(pillar => {
              const Icon = pillar.icon;
              return (
                <div
                  key={pillar.id}
                  className="group relative bg-[#F8FAFC] hover:bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#B49029]/60 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="w-10 h-10 rounded-xl bg-[#182A3E] group-hover:bg-[#B49029] text-[#ECC968] group-hover:text-white flex items-center justify-center transition-colors duration-200 shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-mono font-bold text-slate-400 group-hover:text-[#B49029]">
                        {pillar.number}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-[#182A3E] font-display">
                      {pillar.title}
                    </h3>
                    <p className="text-[11px] font-bold text-[#B49029] mt-0.5 mb-2">
                      {pillar.subtitle}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {pillar.highlight}
                    </span>
                    <span className="text-slate-300 group-hover:text-[#B49029] transition-colors">→</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. WHO WE SERVE (TARGET AUDIENCES) */}
      <section className="py-16 md:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B49029]/10 border border-[#B49029]/30 text-[#B49029] text-[11px] font-mono font-bold tracking-widest uppercase mb-3">
            <span>Ecosystem Matrix</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[#182A3E] font-display">
            Who We Serve
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600 leading-relaxed">
            Uniting property seekers, developers, channel partners, landowners, and media into one spam-free ecosystem.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {STAKEHOLDERS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-2xl p-6 border border-slate-200/90 hover:border-slate-300 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 font-display">
                  {item.title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.description}
                </p>
              </div>
            );
          })}

          {/* 6th Card: All 14 Roles Standardized */}
          <div className="bg-gradient-to-br from-[#182A3E] to-[#203750] text-white rounded-2xl p-6 border border-[#B49029]/40 shadow-sm space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#ECC968]">
                  Standardized Taxonomy
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
              </div>
              <h3 className="text-base font-bold text-white font-display">
                14 Certified Platform Roles
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed mt-1">
                From RERA-certified individual realtors to developers, architects, and working sales professionals, each role has dedicated workspace tools and permission isolation.
              </p>
            </div>
            {onOpenRegister && (
              <button
                type="button"
                onClick={onOpenRegister}
                className="w-full py-2.5 rounded-xl bg-[#B49029] hover:bg-[#A38122] text-[#182A3E] text-xs font-bold transition-all text-center cursor-pointer"
              >
                Register with Your Stakeholder Role →
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 5. VISION & MISSION */}
      <section className="py-16 bg-slate-100 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vision Panel */}
            <div className="bg-[#182A3E] text-white rounded-3xl p-8 border-2 border-[#B49029]/40 shadow-xl relative overflow-hidden flex flex-col justify-between">
              <div className="absolute top-0 right-0 w-48 h-48 bg-[#B49029]/10 rounded-full blur-2xl pointer-events-none" />
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#B49029] text-[#182A3E] flex items-center justify-center font-black">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-white">Our Vision</h3>
                </div>
                <blockquote className="text-base sm:text-lg font-medium text-slate-200 leading-relaxed italic border-l-4 border-[#B49029] pl-4 my-4">
                  &ldquo;To become a global benchmark for trusted, informative and interactive real estate discovery by integrating multiple platforms into one intelligent ecosystem.&rdquo;
                </blockquote>
              </div>
              <p className="text-xs text-slate-400 mt-4 leading-normal">
                Anchored on absolute transparency, zero promotional misrepresentation, and cryptographic data protection.
              </p>
            </div>

            {/* Mission Panel */}
            <div className="bg-white text-slate-900 rounded-3xl p-8 border border-slate-200 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#182A3E] text-white flex items-center justify-center font-black">
                    <Compass className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-bold font-display text-[#182A3E]">Our Mission</h3>
                </div>
                <blockquote className="text-base sm:text-lg font-medium text-slate-800 leading-relaxed italic border-l-4 border-[#182A3E] pl-4 my-4">
                  &ldquo;To unify property search, broadcast media, community discussions, live updates and stakeholder engagement into one seamless platform.&rdquo;
                </blockquote>
              </div>
              <p className="text-xs text-slate-500 mt-4 leading-normal">
                Eliminating asymmetrical information and replacing cold broker spam with verified, opt-in lead transactions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. ABOUT THE FOUNDER & CEO */}
      <section className="py-16 md:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden p-6 sm:p-8 lg:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Left Column: Authentic Founder Image & Credentials */}
            <div className="lg:col-span-5 flex flex-col items-center">
              <div className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-amber-50 via-white to-slate-50 p-3.5 border border-amber-300/60 shadow-md">
                <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden bg-slate-900 border border-slate-200 shadow-inner flex items-center justify-center">
                  <img
                    src="/brand/swamy-reddy-portrait.jpg"
                    alt="Property Studio Founder & CEO - Swamy Reddy Javidi"
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={(e) => {
                      // Fallback to founder poster if portrait is unavailable
                      (e.currentTarget as HTMLImageElement).src = '/brand/property-studio-founder-poster.png';
                    }}
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-white">
                    <span className="inline-block px-2 py-0.5 bg-[#B49029] text-[#182A3E] font-mono text-[9px] font-black uppercase rounded tracking-wider">
                      FOUNDER & CEO
                    </span>
                    <h4 className="text-base font-bold mt-1">Swamy Reddy Javidi</h4>
                    <p className="text-[11px] text-slate-300">Property Studio · Sadguna Properties</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Leadership Profile & Corporate Pedigree */}
            <div className="lg:col-span-7 space-y-5">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#B49029]/10 border border-[#B49029]/30 text-[#B49029] text-[11px] font-mono font-bold tracking-widest uppercase mb-2">
                  <span>Executive Leadership</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-[#182A3E] font-display">
                  Swamy Reddy Javidi
                </h3>
                <p className="text-sm font-bold text-[#B49029]">
                  Founder & CEO — Property Studio · Real Estate Strategist | PropTech Entrepreneur
                </p>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                Swamy Reddy Javidi holds a postgraduate <strong>MBA in Marketing</strong> and brings over{' '}
                <strong>24+ years of corporate experience</strong> across corporate governance, sales distribution, and telecom operations leadership to
                Property Studio.
              </p>

              {/* Corporate Track Record */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h4 className="text-xs font-bold text-[#182A3E] font-display uppercase tracking-wider">
                  Corporate Track Record & Scale Operations:
                </h4>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc pl-5">
                  <li>
                    <strong>Reliance Jio / Jio Fiber (2014–2023):</strong> Served nearly a decade as JCM / Area Home Lead, steering high-intensity market rollouts across Hyderabad and Warangal.
                  </li>
                  <li>
                    <strong>Tata Teleservices / Tata Docomo (2010–2014):</strong> Zonal Manager directing corporate sales, channel frameworks, and telecommunications expansion.
                  </li>
                  <li>
                    <strong>Idea Cellular Ltd. (2008–2010):</strong> Territory Manager directing micro-market distribution networks and subscriber acquisition.
                  </li>
                  <li>
                    <strong>Hindustan Unilever Ltd. (2004–2008):</strong> Cluster Sales Officer for FMCG distribution, managing high-stakes consumer trade channels.
                  </li>
                  <li>
                    <strong>PepsiCo (2002–2004):</strong> Customer Executive establishing corporate sales distribution in Hyderabad.
                  </li>
                </ul>
              </div>

              <p className="text-sm text-slate-700 leading-relaxed">
                As founder of <strong>Sadguna Properties</strong>, he directed high-value advisory operations across Hyderabad’s premium residential and commercial sectors. Establishing <strong>Property Studio</strong> represents his forward-looking PropTech vision: moving beyond traditional broker models to build a transparent, multi-stakeholder ecosystem with encrypted data masking, broadcast visual intelligence, and rigorous project compliance audits.
              </p>

              {/* Founder Philosophy: 6C */}
              <div className="mt-6 pt-5 border-t border-slate-200">
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#B49029] mb-3">
                  Foundational Leadership Philosophy (The 6 C’s)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {PHILOSOPHY_STEPS.map(p => (
                    <div
                      key={p.step}
                      className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-left space-y-1 hover:border-[#B49029]/50 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#B49029]">{p.step}.</span>
                        <span className="text-xs font-bold text-slate-900">{p.word}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{p.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FINAL CALL TO ACTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="rounded-3xl bg-gradient-to-r from-[#182A3E] via-[#203750] to-[#182A3E] text-white p-8 sm:p-12 text-center border-2 border-[#B49029]/40 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#B49029_1px,transparent_1px)] [background-size:24px_24px] opacity-15 pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-[#B49029]/40 text-[#ECC968] text-xs font-mono font-bold uppercase tracking-wider">
              <span>Next Generation PropTech</span>
            </div>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display text-white">
              Discover Real Estate Beyond Listings.
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore a smarter property ecosystem built around information, transparency, interaction, and trust.
            </p>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onNavigateCommunity}
                className="px-5 py-2.5 rounded-xl bg-white text-[#182A3E] font-bold text-xs sm:text-sm hover:bg-slate-100 transition-all shadow-md cursor-pointer active:scale-95"
              >
                Explore Communities
              </button>

              <button
                type="button"
                onClick={onNavigateProperties}
                className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/30 font-bold text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
              >
                Discover Properties
              </button>

              {onOpenRegister && (
                <button
                  type="button"
                  onClick={onOpenRegister}
                  className="px-5 py-2.5 rounded-xl bg-[#B49029] hover:bg-[#A38122] text-[#182A3E] font-bold text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-95"
                >
                  Join Property Studio
                </button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
