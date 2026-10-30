import React from 'react';
import { Property } from '../../types';
import { displayPropertyType } from '../../shared/propertyCategories';
import {
  X,
  Building2,
  CheckCircle2,
  ShieldCheck,
  HardHat,
  ArrowRight,
  Eye
} from 'lucide-react';

interface PropertyCompareModalProps {
  properties: Property[];
  onClose: () => void;
  onSelectProperty: (property: Property) => void;
  onRemoveProperty: (propertyId: string) => void;
}

export const PropertyCompareModal: React.FC<PropertyCompareModalProps> = ({
  properties,
  onClose,
  onSelectProperty,
  onRemoveProperty
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (properties.length === 0) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-compare-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[92vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" />
              <span>Architectural & Financial Side-by-Side Audit</span>
            </div>
            <h2 id="modal-compare-title" className="text-lg sm:text-2xl font-black text-slate-900 font-display">
              Comparative Property Intelligence
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
            title="Close Comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Comparison Matrix */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6 sm:space-y-8">
          {/* Top Cards Grid */}
          <div className={`grid grid-cols-1 md:grid-cols-${properties.length} gap-6`}>
            {properties.map(p => (
              <div
                key={p.id}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-slate-900">
                    <img
                      src={p.heroImage}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => onRemoveProperty(p.id)}
                      className="absolute top-2.5 right-2.5 p-1 rounded-full bg-slate-900/80 text-white hover:bg-red-600 transition-colors cursor-pointer"
                      title="Remove from comparison"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded font-mono">
                      {displayPropertyType(p.propertyType)}
                    </div>
                  </div>
                  <div className="p-4 space-y-1">
                    <span className="text-xs text-amber-700 font-bold block">{p.microMarket}</span>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">{p.title}</h3>
                    <p className="text-xs text-slate-500">By {p.developerName}</p>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    onClick={() => {
                      onClose();
                      onSelectProperty(p);
                    }}
                    className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Inspect Blueprint</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Detailed Metric Rows */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden divide-y divide-slate-100 text-xs">
            {/* Price Range */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4 bg-slate-50/50">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Price Range</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0">
                  <strong className="text-sm font-black text-slate-900 font-mono-numbers">{p.priceRange}</strong>
                </div>
              ))}
            </div>

            {/* Base Rate */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Base Rate / Sq.Ft</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0">
                  <strong className="text-amber-800 font-mono-numbers">₹{p.pricePerSqft.toLocaleString('en-IN')} /sqft</strong>
                </div>
              ))}
            </div>

            {/* Civil Completion Progress */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4 bg-slate-50/50">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Civil Progress</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0 flex items-center gap-2">
                  <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-full rounded-full"
                      style={{ width: `${p.progressPercent}%` }}
                    />
                  </div>
                  <strong className="text-emerald-700 font-mono-numbers">{p.progressPercent}%</strong>
                </div>
              ))}
            </div>

            {/* RERA Registration */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">TG RERA ID</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0 font-mono text-slate-800">
                  {p.reraRegId}
                </div>
              ))}
            </div>

            {/* Handover Timeline */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4 bg-slate-50/50">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Possession Handover</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0 text-slate-700 font-medium">
                  {p.completionDate}
                </div>
              ))}
            </div>

            {/* Key Amenities */}
            <div className="grid grid-cols-1 md:grid-cols-4 p-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[11px]">Top Amenities</span>
              {properties.map(p => (
                <div key={p.id} className="md:col-span-1 pt-1 md:pt-0 space-y-1 text-slate-600">
                  {p.amenities.slice(0, 3).map((a, i) => (
                    <div key={i} className="flex items-start gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{a}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
