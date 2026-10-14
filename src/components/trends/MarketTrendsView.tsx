import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  TrendingUp,
  MapPin,
  Building,
  Layers,
  ArrowUpRight,
  Compass,
  CheckCircle2
} from 'lucide-react';

export const MarketTrendsView: React.FC = () => {
  const { marketTrends } = useApp();
  const [selectedMarketIndex, setSelectedMarketIndex] = useState(0);

  const activeMarket = marketTrends[selectedMarketIndex] || marketTrends[0];

  // Calculate highest rate in history to scale SVG bars/points accurately
  const maxRate = Math.max(...activeMarket.history.map(h => h.avgRate), 13000);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Trends Intelligence Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2">
            <TrendingUp className="w-4 h-4 text-amber-600" />
            Executive Data Intelligence Desk
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Western Corridor Market Trends & Capital Appreciation
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Proprietary pricing models, quarterly absorption velocity, infrastructure impact analyses, and historical rate trajectories curated by Swamy Reddy Javidi.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Top Performer (1-Yr)</span>
            <span className="text-lg font-black text-emerald-600 font-mono-numbers">+22.4% Neopolis</span>
          </div>
        </div>
      </div>

      {/* Micro-Market Selector Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        {marketTrends.map((market, idx) => {
          const isSelected = selectedMarketIndex === idx;
          return (
            <button
              key={market.microMarket}
              onClick={() => setSelectedMarketIndex(idx)}
              className={`p-4 rounded-xl border text-left transition-all ${
                isSelected
                  ? 'border-amber-600 bg-amber-50/50 ring-2 ring-amber-500/20 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 truncate">
                  {market.microMarket}
                </span>
                <ArrowUpRight className={`w-4 h-4 ${isSelected ? 'text-amber-600' : 'text-slate-400'}`} />
              </div>
              <div className="text-xl font-black text-slate-900 font-mono-numbers mt-1.5">
                ₹{market.currentAvgRate.toLocaleString('en-IN')}{' '}
                <span className="text-[10px] text-slate-500 font-normal">/sqft</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs mt-1">
                <span>+{market.yearlyAppreciationPct}% 1-Yr CAGR</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Dynamic Interactive Price Chart & Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Interactive Quarterly Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Quarterly Price Index (2025 - 2026)
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {activeMarket.microMarket} Historical Trajectory
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                +{activeMarket.quarterlyChangePct}% QoQ
              </span>
            </div>
          </div>

          {/* SVG Line / Bar Interactive Graph */}
          <div className="h-64 sm:h-72 w-full pt-6 flex flex-col justify-end">
            <div className="grid grid-cols-7 gap-3 sm:gap-6 items-end h-48 border-b border-slate-200 pb-2">
              {activeMarket.history.map((h, i) => {
                const heightPct = Math.round((h.avgRate / maxRate) * 100);
                const isLatest = i === activeMarket.history.length - 1;

                return (
                  <div key={h.quarter} className="flex flex-col items-center gap-2 group h-full justify-end">
                    {/* Hover Tooltip */}
                    <div className="text-[11px] font-mono font-bold text-slate-700 bg-slate-100 group-hover:bg-slate-900 group-hover:text-white px-1.5 py-0.5 rounded transition-colors whitespace-nowrap">
                      ₹{h.avgRate}
                    </div>

                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-lg transition-all duration-300 ${
                        isLatest
                          ? 'bg-amber-500 shadow-md shadow-amber-500/20'
                          : 'bg-slate-800 hover:bg-slate-700'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />

                    {/* Label */}
                    <span className="text-[10px] font-semibold text-slate-400 truncate mt-1">
                      {h.quarter}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Infrastructure Catalysts */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Key Infrastructure Growth Catalysts for {activeMarket.microMarket}:
            </h3>
            <div className="space-y-2">
              {activeMarket.infrastructureHighlights.map((hl, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-slate-600">
                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{hl}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Supply, Absorption & Investment Rating (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
            <h3 className="text-base font-bold text-slate-900">
              Micro-Market Health Card
            </h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-600">Demand Heat Index</span>
                  <span className="text-amber-600 font-mono font-bold">{activeMarket.demandScore} / 100</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full"
                    style={{ width: `${activeMarket.demandScore}%` }}
                  />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                <span className="text-xs text-slate-500 block">Total Active Supply Under Construction</span>
                <div className="text-2xl font-black text-slate-900 font-mono-numbers">
                  {activeMarket.supplyUnits.toLocaleString()} Units
                </div>
                <p className="text-[11px] text-slate-500">
                  72% absorbed in pre-launch and early construction tranches.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-1 text-xs text-emerald-950">
                <div className="font-bold flex items-center gap-1.5">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <span>Swamy Reddy Recommendation:</span>
                </div>
                <p className="text-emerald-900 leading-relaxed">
                  Strong Buy for 4 & 5 BHK sky mansions with delivery horizons between Q4 2026 and Q4 2028.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
