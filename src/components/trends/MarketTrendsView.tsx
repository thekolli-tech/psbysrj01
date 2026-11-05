import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  MapPin,
  Building,
  Building2,
  Layers,
  ArrowUpRight,
  Compass,
  CheckCircle2,
  Award,
  Info,
  Calendar,
  Layers3,
  ExternalLink
} from 'lucide-react';

export const MarketTrendsView: React.FC = () => {
  const { marketTrends, setActiveView } = useApp();
  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);

  const activeMarket = marketTrends[selectedMarketIndex] || marketTrends[0];

  const marketIcons = [
    MapPin,
    Layers,
    Building,
    Building2
  ];

  const catalysts = [
    {
      title: '8-Lane ORR Interchange',
      image: 'https://images.unsplash.com/photo-1467348733814-f93fc480bec6?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Metro Connectivity',
      image: 'https://images.unsplash.com/photo-1756888417840-4622961be66c?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'IT / Business Expansion',
      image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80'
    },
    {
      title: 'Civic & Social Infrastructure',
      image: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=600&q=80'
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 sm:space-y-8 bg-[#FAFCFD]">
      {/* 
        ====================================================================
        TOP BANNER: EXECUTIVE DATA INTELLIGENCE DESK (MATCHING IMAGE 4)
        ====================================================================
      */}
      <div className="relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 border border-[#E8E4D8] shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Subtle decorative background skyline */}
        <div
          className="absolute inset-y-0 right-1/4 w-96 opacity-10 bg-no-repeat bg-contain bg-right pointer-events-none"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80')"
          }}
        />

        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FCFBF3] text-[#A99137] border border-[#B49029]/30 text-xs font-bold uppercase tracking-wider font-mono">
            <TrendingUp className="w-3.5 h-3.5 text-[#B49029]" />
            EXECUTIVE DATA INTELLIGENCE DESK
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#030508] font-display tracking-tight">
            Western Corridor Market Trends & Capital Appreciation
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] max-w-2xl leading-relaxed">
            Live real-time micro-market intelligence across Hyderabad's Western Corridor. Verified TS-RERA analytics, land auction telemetry, and capital appreciation under Swamy Reddy Javidi.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <div className="bg-[#FCFBF3] p-4 rounded-2xl border border-[#E8E4D8] shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B49029]/10 text-[#B49029] flex items-center justify-center shrink-0">
              <Award className="w-6 h-6 text-[#B49029]" />
            </div>
            <div>
              <span className="text-[10px] text-[#A99137] uppercase font-bold tracking-wider block">
                TOP PERFORMER (1-YR)
              </span>
              <span className="text-xl font-black text-emerald-600 font-mono-numbers">
                +22.4% Neopolis
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================================================================
        MICRO-MARKET SELECTOR CARDS (4-COLUMNS WITH SPARKLINE MATCHING IMAGE 4)
        ====================================================================
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {marketTrends.map((market, idx) => {
          const isSelected = selectedMarketIndex === idx;
          const IconComponent = marketIcons[idx % marketIcons.length];

          return (
            <button
              key={market.microMarket}
              onClick={() => setSelectedMarketIndex(idx)}
              className={`p-5 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden group ${
                isSelected
                  ? 'border-[#B49029] bg-white ring-2 ring-[#B49029]/30 shadow-md'
                  : 'border-[#E8E4D8] bg-white hover:border-[#B49029] hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-[#030508] truncate">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-[#FCFBF3] text-[#A99137]' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="truncate">{market.microMarket}</span>
                </div>
                <ArrowUpRight className={`w-4 h-4 shrink-0 transition-transform ${isSelected ? 'text-[#B49029] scale-110' : 'text-slate-400 group-hover:text-[#B49029]'}`} />
              </div>

              <div className="text-2xl font-black text-[#030508] font-mono-numbers mt-3">
                ₹{market.currentAvgRate.toLocaleString('en-IN')}{' '}
                <span className="text-xs text-[#64748B] font-normal">/sqft</span>
              </div>

              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                <span className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
                  ▲ +{market.yearlyAppreciationPct}% 1-Yr CAGR
                </span>
                <svg className="w-20 h-6 text-emerald-500 overflow-visible" viewBox="0 0 80 24" fill="none">
                  <path d="M0 20 Q 25 18, 50 11 T 80 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </button>
          );
        })}
      </div>

      {/* 
        ====================================================================
        MIDDLE SECTION: CONTINUOUS AREA CHART & HEALTH CARD (MATCHING IMAGE 4)
        ====================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column: Continuous Area Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-[#E8E4D8] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-mono">
                QUARTERLY PRICE INDEX (2025 – 2026)
              </span>
              <h2 className="text-xl sm:text-2xl font-extrabold text-[#030508] font-display mt-0.5">
                {activeMarket.microMarket} Historical Trajectory
              </h2>
            </div>
            <div className="self-start sm:self-auto">
              <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                <TrendingUp className="w-3.5 h-3.5" />
                +{activeMarket.quarterlyChangePct}% QoQ
              </span>
            </div>
          </div>

          {/* SVG Smooth Continuous Area Chart matching Image 4 */}
          <div className="relative pt-6 pb-2">
            <div className="flex items-stretch gap-4 h-64 sm:h-72">
              {/* Y-Axis Labels */}
              <div className="flex flex-col justify-between text-[11px] font-mono text-slate-400 text-right pr-2 select-none">
                <span>12,000</span>
                <span>11,000</span>
                <span>10,000</span>
                <span>9,000</span>
                <span>8,000</span>
              </div>

              {/* Chart Canvas Area */}
              <div className="flex-1 relative border-b border-l border-slate-200">
                {/* Horizontal grid guide lines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
                  <div className="border-b border-slate-100 w-full" />
                  <div className="border-b border-slate-100 w-full" />
                  <div className="border-b border-slate-100 w-full" />
                  <div className="border-b border-slate-100 w-full" />
                  <div className="w-full" />
                </div>

                {/* SVG Curve with Amber Gradient Area */}
                <svg
                  className="absolute inset-0 w-full h-full overflow-visible"
                  viewBox="0 0 700 240"
                  preserveAspectRatio="none"
                >
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#B49029" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="#B49029" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Shaded Area */}
                  <path
                    d="M 50 180 L 150 150 L 250 115 L 350 80 L 450 55 L 550 42 L 650 25 L 650 240 L 50 240 Z"
                    fill="url(#chartGradient)"
                  />

                  {/* Stroke Line */}
                  <path
                    d="M 50 180 L 150 150 L 250 115 L 350 80 L 450 55 L 550 42 L 650 25"
                    fill="none"
                    stroke="#B49029"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points */}
                  {[
                    { cx: 50, cy: 180, val: '₹8,900' },
                    { cx: 150, cy: 150, val: '₹9,400' },
                    { cx: 250, cy: 115, val: '₹10,100' },
                    { cx: 350, cy: 80, val: '₹10,750' },
                    { cx: 450, cy: 55, val: '₹11,250' },
                    { cx: 550, cy: 42, val: '₹11,500' },
                    { cx: 650, cy: 25, val: '₹11,800', active: true }
                  ].map((pt, i) => (
                    <g key={i}>
                      <circle
                        cx={pt.cx}
                        cy={pt.cy}
                        r={pt.active ? 6 : 4}
                        fill="#FFFFFF"
                        stroke="#B49029"
                        strokeWidth="3"
                      />
                      {pt.active ? (
                        <g>
                          <rect
                            x={pt.cx - 36}
                            y={pt.cy - 28}
                            width="72"
                            height="22"
                            rx="11"
                            fill="#B49029"
                          />
                          <text
                            x={pt.cx}
                            y={pt.cy - 13}
                            textAnchor="middle"
                            fill="#FFFFFF"
                            fontSize="11"
                            fontWeight="bold"
                            fontFamily="monospace"
                          >
                            {pt.val}
                          </text>
                        </g>
                      ) : (
                        <text
                          x={pt.cx}
                          y={pt.cy - 10}
                          textAnchor="middle"
                          fill="#030508"
                          fontSize="10"
                          fontWeight="bold"
                          fontFamily="monospace"
                        >
                          {pt.val}
                        </text>
                      )}
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* X-Axis Quarter Labels */}
            <div className="flex justify-between pl-12 pr-4 pt-3 text-[11px] font-semibold text-[#64748B]">
              <span>Q1 2025</span>
              <span>Q2 2025</span>
              <span>Q3 2025</span>
              <span>Q4 2025</span>
              <span>Q1 2026</span>
              <span>Q2 2026</span>
              <span>Q3 2026</span>
            </div>
          </div>
        </div>

        {/* Right Column: Micro-Market Health Card (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-3xl border border-[#E8E4D8] p-6 sm:p-7 shadow-xs space-y-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#B49029]" />
              <h3 className="text-base font-bold text-[#030508] font-display">
                Micro-Market Health Card
              </h3>
            </div>

            <div className="space-y-4">
              {/* Heat Index Meter */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1.5">
                  <span className="text-[#64748B] flex items-center gap-1">
                    Demand Heat Index
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                  </span>
                  <span className="text-slate-900 font-mono font-bold">96 / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#B49029] to-emerald-500 h-full rounded-full"
                    style={{ width: '96%' }}
                  />
                </div>
              </div>

              {/* Total Active Supply Card */}
              <div className="p-4 bg-[#FAFCFD] rounded-2xl border border-[#E8E4D8] flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-[#64748B] block">Total Active Supply Under Construction</span>
                  <div className="text-2xl font-black text-[#030508] font-mono-numbers">
                    3,400 Units
                  </div>
                  <p className="text-[11px] text-[#64748B]">
                    72% absorbed in pre-launch and early construction tranches.
                  </p>
                </div>
                <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-200 bg-slate-100">
                  <img
                    src="https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=400&q=80"
                    alt="Active Construction Supply"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=400&q=80';
                    }}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Swamy Reddy Recommendation */}
              <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-1.5 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                  <Compass className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Swamy Reddy Recommendation</span>
                </div>
                <p className="text-emerald-800 leading-relaxed font-medium">
                  Strong Buy for 4 & 5 BHK sky mansions with delivery horizons between Q4 2026 and Q4 2028.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 
        ====================================================================
        BOTTOM SECTION: INFRASTRUCTURE CATALYSTS & MARKET INSIGHTS (MATCHING IMAGE 4)
        ====================================================================
      */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left: Catalysts with Real Visual Cards (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#E8E4D8] p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-[#B49029]" />
            <h3 className="text-xs sm:text-sm font-bold text-[#030508] uppercase tracking-wide">
              Key Infrastructure Growth Catalysts for Neopolis, Kokapet
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {catalysts.map((cat, i) => (
              <div key={i} className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50 group hover:border-[#B49029] transition-all">
                <div className="aspect-4/3 w-full overflow-hidden bg-slate-100">
                  <img
                    src={cat.image}
                    alt={cat.title}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=600&q=80';
                    }}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-2 text-center">
                  <span className="text-[11px] font-bold text-slate-800 line-clamp-2 leading-tight">
                    {cat.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Market Insights (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E8E4D8] p-6 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#B49029]" />
                <h3 className="text-xs sm:text-sm font-bold text-[#030508] uppercase tracking-wide">
                  Market Insights
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View Full Trends & Charts</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <TrendingUp className="w-4 h-4 text-emerald-600 mx-auto" />
                <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                  Sustained Price Growth
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <Layers3 className="w-4 h-4 text-purple-600 mx-auto" />
                <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                  High Demand Zone
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-1">
                <Calendar className="w-4 h-4 text-amber-600 mx-auto" />
                <span className="text-[11px] font-bold text-slate-800 block leading-tight">
                  Q4 2026 - Q4 2028 Window
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-slate-400 text-center border-t border-slate-100">
            Property Studio Institutional Research Desk &bull; Western Corridor Desk
          </div>
        </div>
      </div>
    </div>
  );
};