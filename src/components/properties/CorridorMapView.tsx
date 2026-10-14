import React, { useState } from 'react';
import { Property } from '../../types';
import {
  MapPin,
  Building2,
  Navigation,
  Eye,
  Plane,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight
} from 'lucide-react';

interface CorridorMapViewProps {
  properties: Property[];
  onSelectProperty: (property: Property) => void;
}

export const CorridorMapView: React.FC<CorridorMapViewProps> = ({
  properties,
  onSelectProperty
}) => {
  const [selectedPinId, setSelectedPinId] = useState<string>(properties[0]?.id || '');
  const [activeZone, setActiveZone] = useState<string>('ALL');

  const selectedProperty = properties.find(p => p.id === selectedPinId) || properties[0];

  // Micro-market zones
  const zones = [
    { id: 'ALL', name: 'Entire Western Corridor' },
    { id: 'Neopolis', name: 'Neopolis SEZ' },
    { id: 'Kokapet', name: 'Kokapet Golden Mile' },
    { id: 'Financial District', name: 'Financial District' },
    { id: 'Tellapur', name: 'Tellapur Radial Road' }
  ];

  // Map coordinates placed on relative 100% SVG coordinate plane
  const pinCoordinates: Record<string, { x: number; y: number }> = {
    prop_crown_neopolis: { x: 58, y: 38 },
    prop_kokapet_pinnacle: { x: 48, y: 52 },
    prop_vertex_horizon: { x: 72, y: 46 },
    prop_tellapur_aura: { x: 26, y: 28 }
  };

  const filteredProperties = properties.filter(p => {
    if (activeZone === 'ALL') return true;
    return p.microMarket.toLowerCase().includes(activeZone.toLowerCase());
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Map Header */}
      <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
            <Navigation className="w-3.5 h-3.5" />
            <span>Interactive Corridor Intelligence Map</span>
          </div>
          <h3 className="text-xl font-black text-slate-900 font-display">
            Hyderabad Western Corridor & ORR Golden Mile
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Geospatial audits, travel distances, and infrastructure links to Neopolis Trumpet Interchange & RGIA.
          </p>
        </div>

        {/* Zone switcher tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-200/60 rounded-xl">
          {zones.map(z => (
            <button
              key={z.id}
              onClick={() => setActiveZone(z.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeZone === z.id
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {z.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Map Visual Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 relative">
        {/* Interactive Map Graphic (7 cols) */}
        <div className="lg:col-span-8 bg-slate-950 relative min-h-[420px] sm:min-h-[500px] overflow-hidden flex items-center justify-center p-4">
          {/* Stylized Vector Grid Background */}
          <svg
            className="w-full h-full absolute inset-0 select-none pointer-events-none"
            viewBox="0 0 1000 650"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" />
              </pattern>
              <linearGradient id="orrGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            {/* Gandipet Lake / Osmansagar Ecological Buffer (Waterbody) */}
            <path
              d="M 320 480 Q 400 450 460 520 T 560 620 L 320 640 Z"
              fill="#0284c7"
              fillOpacity="0.15"
              stroke="#0284c7"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />
            <text x="360" y="550" fill="#38bdf8" fontSize="12" fontFamily="sans-serif" fontWeight="bold" opacity="0.6">
              Gandipet Lake Ecological Buffer
            </text>

            {/* Outer Ring Road (ORR Expressway - Curved Arterial Line) */}
            <path
              d="M 120 180 Q 420 220 580 340 T 880 560"
              stroke="url(#orrGrad)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <text x="210" y="195" fill="#f59e0b" fontSize="11" fontWeight="bold" letterSpacing="1">
              8-LANE ORR EXPRESSWAY (NEOPOLIS TRUMPET)
            </text>

            {/* Radial Road 7 to Tellapur */}
            <path
              d="M 180 190 Q 240 280 320 320"
              stroke="#64748b"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            <text x="140" y="270" fill="#94a3b8" fontSize="10">
              Radial Road 7 (150ft Arterial)
            </text>

            {/* Golden Mile Road */}
            <path
              d="M 450 350 L 620 380"
              stroke="#64748b"
              strokeWidth="2.5"
            />
            <text x="500" y="370" fill="#94a3b8" fontSize="10">
              Golden Mile Road
            </text>

            {/* Nanakramguda Financial District Link */}
            <path
              d="M 680 410 L 820 450"
              stroke="#64748b"
              strokeWidth="2"
            />
            <text x="710" y="435" fill="#94a3b8" fontSize="10">
              IT Financial Corridor
            </text>
          </svg>

          {/* Interactive Property Pin Markers */}
          {filteredProperties.map(property => {
            const coords = pinCoordinates[property.id] || { x: 50, y: 50 };
            const isSelected = selectedPinId === property.id;

            return (
              <div
                key={property.id}
                style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20"
              >
                <button
                  onClick={() => setSelectedPinId(property.id)}
                  aria-label={`Select ${property.title}`}
                  className={`group relative flex items-center justify-center transition-all cursor-pointer ${
                    isSelected ? 'scale-110 z-30' : 'hover:scale-105'
                  }`}
                >
                  {/* Pin Glow ring */}
                  <span
                    className={`absolute -inset-2 rounded-full transition-all ${
                      isSelected
                        ? 'bg-amber-400/40 animate-ping'
                        : 'bg-transparent group-hover:bg-amber-400/20'
                    }`}
                  />

                  {/* Marker Body */}
                  <div
                    className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xl transition-all border ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 border-white shadow-amber-500/50'
                        : 'bg-slate-900/95 text-white border-slate-700 hover:border-amber-400'
                    }`}
                  >
                    <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-slate-950' : 'text-amber-400'}`} />
                    <span className="truncate max-w-[120px] sm:max-w-[160px] font-display">
                      {property.title.split(' ')[0]} {property.title.split(' ')[1]}
                    </span>
                    <span className="text-[10px] font-mono opacity-80">
                      {property.progressPercent}%
                    </span>
                  </div>
                </button>
              </div>
            );
          })}

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-md p-3 rounded-xl border border-slate-800 text-[11px] text-slate-300 space-y-1.5 pointer-events-none">
            <div className="font-bold text-white uppercase text-[10px] tracking-wider font-mono">
              Corridor Legend
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-0.5 bg-amber-500 rounded" />
              <span>ORR Expressway (Golden Mile Link)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500/50 border border-sky-400" />
              <span>Gandipet Protected Buffer</span>
            </div>
          </div>
        </div>

        {/* Selected Property Preview Drawer (4 cols) */}
        {selectedProperty && (
          <div className="lg:col-span-4 p-5 sm:p-6 bg-white flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-200">
            <div className="space-y-4">
              {/* Photo preview with click to detail */}
              <div
                onClick={() => onSelectProperty(selectedProperty)}
                className="relative aspect-video rounded-xl overflow-hidden bg-slate-900 group cursor-pointer"
              >
                <img
                  src={selectedProperty.heroImage}
                  alt={selectedProperty.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute top-2.5 left-2.5 bg-slate-900/90 text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-md border border-amber-500/30 font-mono">
                  {selectedProperty.propertyType}
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 text-white">
                  <span className="text-[11px] text-amber-300 block font-medium">
                    {selectedProperty.microMarket}
                  </span>
                  <h4 className="text-sm sm:text-base font-bold truncate">
                    {selectedProperty.title}
                  </h4>
                </div>
              </div>

              {/* Transit & Key Distances */}
              {selectedProperty.mapCoordinates && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block">ORR Exit</span>
                    <strong className="text-slate-900 font-mono-numbers">
                      {selectedProperty.mapCoordinates.distanceToOrrKm} km
                    </strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-semibold block flex items-center gap-1">
                      <Plane className="w-3 h-3 text-slate-400" /> Airport (RGIA)
                    </span>
                    <strong className="text-slate-900 font-mono-numbers">
                      {selectedProperty.mapCoordinates.distanceToAirportKm} km
                    </strong>
                  </div>
                </div>
              )}

              {/* Pricing & Rate */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Price Range</span>
                  <strong className="text-amber-900 font-mono-numbers text-sm">
                    {selectedProperty.priceRange}
                  </strong>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Base Rate</span>
                  <strong className="text-slate-800 font-mono-numbers">
                    ₹{selectedProperty.pricePerSqft.toLocaleString('en-IN')}/sqft
                  </strong>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200/60">
                  <span className="text-slate-600">Civil Progress</span>
                  <strong className="text-emerald-700 font-mono-numbers">
                    {selectedProperty.progressPercent}% Audited
                  </strong>
                </div>
              </div>

              {/* Top Highlights */}
              <div className="space-y-1.5 text-xs text-slate-600">
                {selectedProperty.highlights.slice(0, 2).map((h, i) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{h}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Inspect Button */}
            <button
              onClick={() => onSelectProperty(selectedProperty)}
              className="mt-4 w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-amber-400" />
              <span>Inspect Blueprint, Audio & Logs</span>
              <ArrowRight className="w-4 h-4 ml-auto" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
