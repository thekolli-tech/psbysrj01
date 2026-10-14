import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Property } from '../../types';
import { CorridorMapView } from './CorridorMapView';
import { PropertyCompareModal } from './PropertyCompareModal';
import { PropertyDetailModal } from './PropertyDetailModal';
import {
  Building2,
  MapPin,
  ShieldCheck,
  HardHat,
  Star,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  Eye,
  Plus,
  Map,
  Grid,
  Scale,
  Video,
  Volume2,
  Filter,
  Check,
  X
} from 'lucide-react';

interface PropertyListProps {
  onClaimProject: (property: Property) => void;
  onContactAdmin?: (property: Property) => void;
}

export const PropertyList: React.FC<PropertyListProps> = ({ onClaimProject, onContactAdmin }) => {
  const { properties, constructionLogs, setActiveView } = useApp();

  // Active view mode: Grid vs Corridor Map
  const [viewMode, setViewMode] = useState<'GRID' | 'MAP'>('GRID');

  // Modal states
  const [activePropertyModal, setActivePropertyModal] = useState<Property | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);

  // Comparison tray selection (up to 3 properties)
  const [comparedPropertyIds, setComparedPropertyIds] = useState<string[]>([]);

  // Filter states
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterMarket, setFilterMarket] = useState<string>('ALL');
  const [minProgress, setMinProgress] = useState<number>(0);

  const propertyTypes = ['ALL', 'Sky Villa', 'Luxury High-Rise', 'Grade-A Commercial', 'Gated Villa Community'];
  const microMarkets = ['ALL', 'Neopolis', 'Kokapet', 'Financial District', 'Tellapur'];

  const filtered = properties.filter(p => {
    if (filterType !== 'ALL' && p.propertyType !== filterType) return false;
    if (filterMarket !== 'ALL' && !p.microMarket.toLowerCase().includes(filterMarket.toLowerCase())) return false;
    if (p.progressPercent < minProgress) return false;
    return true;
  });

  const toggleCompare = (propertyId: string) => {
    setComparedPropertyIds(prev => {
      if (prev.includes(propertyId)) {
        return prev.filter(id => id !== propertyId);
      }
      if (prev.length >= 3) {
        return [prev[1], prev[2], propertyId]; // keep max 3
      }
      return [...prev, propertyId];
    });
  };

  const comparedProperties = properties.filter(p => comparedPropertyIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Visual Executive Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider font-mono">
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>DEMONSTRATION PORTFOLIO · HYDERABAD WESTERN CORRIDOR PREVIEWS</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-slate-900 font-display tracking-tight leading-tight">
            Curated High-Rise & Villa Developments
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed font-normal">
            Explore demonstration inventory with real-time construction milestone audits, 4K video drone surveys, interactive architectural blueprints, and executive audio briefings.
          </p>
        </div>

        {/* View Mode Switcher (Grid vs Interactive Corridor Map) */}
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 shrink-0 relative z-10">
          <button
            onClick={() => setViewMode('GRID')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'GRID'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-4 h-4 text-amber-600" />
            <span>Visual Cards</span>
          </button>
          <button
            onClick={() => setViewMode('MAP')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              viewMode === 'MAP'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Map className="w-4 h-4 text-amber-600" />
            <span>Corridor Map</span>
          </button>
        </div>
      </div>

      {/* Visual Filters Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Asset Type Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wide font-mono">Asset Type:</span>
            {propertyTypes.map(t => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterType === t
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Micro-Market Segmented Control */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-wide font-mono">Corridor:</span>
            {microMarkets.map(m => (
              <button
                key={m}
                onClick={() => setFilterMarket(m)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  filterMarket === m
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-bar: Inventory Count & Comparison Status */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <strong className="text-slate-900">{filtered.length}</strong> audited developments
          </div>
          {comparedPropertyIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-700">
                {comparedPropertyIds.length} / 3 selected for comparison
              </span>
              <button
                onClick={() => setCompareModalOpen(true)}
                className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Compare Side-by-Side</span>
              </button>
              <button
                onClick={() => setComparedPropertyIds([])}
                className="text-slate-400 hover:text-slate-600 p-1"
                title="Clear selection"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Demonstration Data Transparency Notice */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <span>
          <strong>Platform Demonstration Portfolio:</strong> The projects, architectural specs, simulated TS-RERA numbers, and civil progress metrics below represent demonstration models for Western Corridor developments. Production API data synchronization is active for user sessions, OTPs, and community feeds.
        </span>
        <span className="font-mono text-amber-800 font-bold text-[11px] uppercase shrink-0">
          Sample Showcase Data
        </span>
      </div>

      {/* VIEW MODE 1: INTERACTIVE CORRIDOR MAP */}
      {viewMode === 'MAP' && (
        <CorridorMapView
          properties={filtered}
          onSelectProperty={p => setActivePropertyModal(p)}
        />
      )}

      {/* VIEW MODE 2: IMAGE-LED PROPERTIES GRID */}
      {viewMode === 'GRID' && (
        filtered.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm space-y-4">
            <Building2 className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-900 font-display">No developments match your current filters</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try selecting a different corridor, lowering the civil progress threshold, or resetting all filters.
            </p>
            <button
              onClick={() => {
                setFilterType('ALL');
                setFilterMarket('ALL');
                setMinProgress(0);
              }}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filtered.map(property => {
            const isCompared = comparedPropertyIds.includes(property.id);

            return (
              <div
                key={property.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  {/* Image Hero with Hover Zoom & Badges */}
                  <div className="relative aspect-16/10 bg-slate-950 overflow-hidden">
                    <img
                      src={property.heroImage}
                      alt={property.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-black/30 pointer-events-none" />

                    {/* Top Status & Verification Controls */}
                    <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider bg-slate-950/90 text-amber-400 px-3 py-1 rounded-xl border border-amber-500/30 font-mono">
                        {property.propertyType}
                      </span>

                      <div className="flex items-center gap-2">
                        {/* Compare toggle button */}
                        <button
                          onClick={() => toggleCompare(property.id)}
                          aria-label={isCompared ? 'Remove from comparison' : 'Add to comparison'}
                          className={`px-2.5 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                            isCompared
                              ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                              : 'bg-slate-900/80 hover:bg-slate-900 text-white border border-slate-700'
                          }`}
                        >
                          <Scale className="w-3.5 h-3.5" />
                          <span>{isCompared ? 'Comparing' : 'Compare'}</span>
                        </button>

                        {property.isClaimedByDeveloper ? (
                          <span className="text-[11px] font-bold bg-emerald-600/90 text-white px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                          </span>
                        ) : (
                          <button
                            onClick={() => onClaimProject(property)}
                            className="text-[11px] font-bold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-xl shadow-sm transition-colors cursor-pointer"
                          >
                            Claim B2B
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Bottom Image Overlay Details */}
                    <div className="absolute bottom-3.5 left-3.5 right-3.5 text-white flex items-end justify-between">
                      <div className="min-w-0 pr-4">
                        <span className="text-xs text-amber-300 flex items-center gap-1 font-medium">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" /> {property.microMarket}
                        </span>
                        <h3 className="text-xl sm:text-2xl font-black text-white mt-1 leading-snug font-display truncate">
                          {property.title}
                        </h3>
                        <p className="text-xs text-slate-300">By {property.developerName}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] text-slate-300 uppercase block font-medium">Starting From</span>
                        <strong className="text-xl sm:text-2xl font-black text-amber-400 font-mono-numbers block">
                          {property.priceRange.split('-')[0].trim()}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6 space-y-5">
                    {/* Architectural KPI Strip */}
                    <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Base Rate</span>
                        <strong className="text-base font-black text-slate-900 font-mono-numbers block">
                          ₹{property.pricePerSqft.toLocaleString('en-IN')}{' '}
                          <span className="text-[10px] text-slate-500 font-normal">/sqft</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Available Units</span>
                        <strong className="text-base font-black text-amber-700 font-mono-numbers block">
                          {property.availableUnits}{' '}
                          <span className="text-[10px] text-slate-400 font-normal">/ {property.totalUnits}</span>
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block">Civil Progress</span>
                        <div className="flex items-center justify-center gap-1.5 mt-0.5">
                          <div className="w-12 bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-emerald-600 h-full rounded-full"
                              style={{ width: `${property.progressPercent}%` }}
                            />
                          </div>
                          <strong className="text-sm font-black text-emerald-700 font-mono-numbers">
                            {property.progressPercent}%
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Highlights */}
                    <div className="space-y-2 text-xs text-slate-600">
                      {property.highlights.slice(0, 2).map((hl, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          <span>{hl}</span>
                        </div>
                      ))}
                    </div>

                    {/* Media Capabilities Badges */}
                    <div className="flex items-center gap-3 pt-2 text-xs text-slate-500 border-t border-slate-100">
                      {property.videoWalkthroughUrl && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Video className="w-3.5 h-3.5 text-amber-600" /> 4K Drone Walkthrough
                        </span>
                      )}
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      {property.floorPlans && property.floorPlans.length > 0 && (
                        <span className="flex items-center gap-1 text-slate-700 font-medium">
                          <Layers className="w-3.5 h-3.5 text-amber-600" /> {property.floorPlans.length} Floor Plans
                        </span>
                      )}
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="flex items-center gap-1 text-slate-700 font-medium">
                        <Volume2 className="w-3.5 h-3.5 text-amber-600" /> Audio Narration
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Footer */}
                <div className="p-4 sm:p-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    RERA: <span className="font-mono text-slate-800 font-bold">{property.reraRegId}</span>
                  </div>

                  <button
                    onClick={() => setActivePropertyModal(property)}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inspect Blueprint, Audio & Logs</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Floating Bottom Comparison Tray */}
      {comparedProperties.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold">
              Comparing {comparedProperties.length} properties
            </span>
          </div>

          <div className="flex items-center gap-2">
            {comparedProperties.map(p => (
              <span
                key={p.id}
                className="px-2.5 py-1 bg-slate-800 rounded-lg text-[11px] font-medium flex items-center gap-1.5"
              >
                <span className="truncate max-w-[100px]">{p.title}</span>
                <button
                  onClick={() => toggleCompare(p.id)}
                  className="text-slate-400 hover:text-white"
                  title="Remove"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          <button
            onClick={() => setCompareModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-md"
          >
            Launch Comparison
          </button>
        </div>
      )}

      {/* Property Detail Modal */}
      {activePropertyModal && (
        <PropertyDetailModal
          property={activePropertyModal}
          constructionLogs={constructionLogs}
          onClose={() => setActivePropertyModal(null)}
          onClaimProject={onClaimProject}
          onContactAdmin={onContactAdmin}
        />
      )}

      {/* Side-by-Side Comparison Modal */}
      {compareModalOpen && (
        <PropertyCompareModal
          properties={comparedProperties}
          onClose={() => setCompareModalOpen(false)}
          onSelectProperty={p => {
            setCompareModalOpen(false);
            setActivePropertyModal(p);
          }}
          onRemoveProperty={id => toggleCompare(id)}
        />
      )}
    </div>
  );
};
