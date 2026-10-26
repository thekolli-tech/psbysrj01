import React, { useState } from 'react';
import { Property, ConstructionLog, FloorPlan } from '../../types';
import { displayPropertyType } from '../../shared/propertyCategories';
import { ApprovedProjectReviews } from './ApprovedProjectReviews';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import {
  X,
  Building2,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Layers,
  Video,
  Play,
  Volume2,
  Maximize2,
  Phone,
  Mail,
  Calculator,
  Compass,
  Check,
  HardHat,
  ChevronRight,
  ChevronLeft,
  ExternalLink,
  Award,
  Sparkles
} from 'lucide-react';

interface PropertyDetailModalProps {
  property: Property;
  constructionLogs?: ConstructionLog[];
  onClose: () => void;
  onClaimProject?: (property: Property) => void;
  onContactAdmin?: (property: Property) => void;
}

export const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  constructionLogs = [],
  onClose,
  onClaimProject,
  onContactAdmin
}) => {
  const [activeTab, setActiveTab] = useState<'GALLERY' | 'VIDEO' | 'FLOORPLANS' | 'AUDIO' | 'PRICING' | 'LOGS'>('GALLERY');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState<FloorPlan | undefined>(
    property.floorPlans?.[0]
  );
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [videoError, setVideoError] = useState(false);

  // EMI Calculator state
  const baseRateLakhs = (property.pricePerSqft * 4000) / 100000; // estimated default
  const [loanAmountLakhs, setLoanAmountLakhs] = useState<number>(450);
  const [loanTenureYears, setLoanTenureYears] = useState<number>(20);
  const [interestRatePct, setInterestRatePct] = useState<number>(8.5);

  // EMI formula: P * r * (1+r)^n / ((1+r)^n - 1)
  const calculateEmi = () => {
    const P = loanAmountLakhs * 100000;
    const r = interestRatePct / (12 * 100);
    const n = loanTenureYears * 12;
    if (r === 0) return Math.round(P / n);
    const emi = (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    return isNaN(emi) ? 0 : Math.round(emi);
  };

  const images = property.galleryImages?.length > 0 ? property.galleryImages : [property.heroImage];

  const propLogs = constructionLogs.filter(l => l.propertyId === property.id);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-property-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] overflow-hidden flex flex-col">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/90">
          <div className="min-w-0 pr-4">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase tracking-wider mb-1">
              <Building2 className="w-3.5 h-3.5" />
              <span>{displayPropertyType(property.propertyType)}</span>
              <span className="text-slate-400" aria-hidden="true">·</span>
              <span className="text-slate-600 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-amber-500" /> {property.microMarket}
              </span>
            </div>
            <h2 id="modal-property-title" className="text-xl sm:text-2xl font-black text-slate-900 font-display truncate">
              {property.title}
            </h2>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right hidden sm:block">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Audited Pricing</span>
              <span className="text-base font-black text-amber-700 font-mono-numbers">
                {property.priceRange}
              </span>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-800 rounded-xl hover:bg-slate-200/50 transition-colors cursor-pointer"
              title="Close Blueprint Inspection"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex items-center gap-1 px-4 sm:px-6 py-2 border-b border-slate-200 bg-white overflow-x-auto no-scrollbar">
          {[
            { id: 'GALLERY', label: 'Photo Gallery' },
            { id: 'VIDEO', label: '4K Walkthrough Video' },
            { id: 'FLOORPLANS', label: 'Floor Plans & Layouts' },
            { id: 'AUDIO', label: 'Executive Audio Briefing' },
            { id: 'PRICING', label: 'Transparent Pricing & EMI' },
            { id: 'LOGS', label: `Civil Logs (${propLogs.length})` }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: PHOTO GALLERY */}
          {activeTab === 'GALLERY' && (
            <div className="space-y-4">
              {/* Main Showcase Image */}
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-inner group">
                <img
                  src={images[selectedImageIndex]}
                  alt={`${property.title} view ${selectedImageIndex + 1}`}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

                {/* Left/Right Carousel Controls */}
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setSelectedImageIndex(prev => (prev > 0 ? prev - 1 : images.length - 1))}
                      aria-label="Previous photo"
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setSelectedImageIndex(prev => (prev < images.length - 1 ? prev + 1 : 0))}
                      aria-label="Next photo"
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-900 text-white flex items-center justify-center transition-all cursor-pointer shadow-lg"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                <div className="absolute bottom-3 left-3 text-white text-xs font-medium">
                  <span>Photo {selectedImageIndex + 1} of {images.length}</span>
                </div>
              </div>

              {/* Thumbnails Row */}
              {images.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImageIndex(i)}
                      className={`relative w-20 sm:w-24 aspect-video rounded-xl overflow-hidden shrink-0 transition-all cursor-pointer border-2 ${
                        selectedImageIndex === i ? 'border-amber-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VIDEO WALKTHROUGH */}
          {activeTab === 'VIDEO' && (
            <div className="space-y-4">
              <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-xl">
                {property.videoWalkthroughUrl && !videoError ? (
                  <video
                    src={property.videoWalkthroughUrl}
                    controls
                    playsInline
                    poster={property.heroImage}
                    onError={() => setVideoError(true)}
                    className="w-full h-full object-cover"
                  >
                    Your browser does not support HTML5 video streaming.
                  </video>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3 bg-slate-900">
                    <Video className="w-12 h-12 text-slate-500" />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-slate-200">
                        {videoError ? 'Video Stream Offline or Unreachable' : '4K Drone Video Walkthrough Pending Certification'}
                      </p>
                      <p className="text-xs text-slate-400 max-w-md">
                        {videoError
                          ? 'The hosted video stream provider is currently offline. High-resolution photo galleries, floor plans, and audit logs remain fully accessible.'
                          : 'Aerial survey certification in progress. Explore high-resolution photos and architectural layouts above.'}
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('GALLERY')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                    >
                      View Photo Gallery
                    </button>
                  </div>
                )}
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                <span>Duration: <strong>{property.videoDuration || '3:45'}</strong></span>
                <span>
                  Video Stream Status: <strong>{videoError ? 'Provider Stream Offline' : 'HTML5 Player Ready'}</strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: FLOOR PLANS & LAYOUTS */}
          {activeTab === 'FLOORPLANS' && (
            <div className="space-y-6">
              {/* Floor plan selector buttons */}
              {property.floorPlans && property.floorPlans.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {property.floorPlans.map(fp => (
                      <button
                        key={fp.id}
                        onClick={() => setSelectedFloorPlan(fp)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          selectedFloorPlan?.id === fp.id
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {fp.name} ({fp.type})
                      </button>
                    ))}
                  </div>

                  {selectedFloorPlan && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                      {/* Architectural Blueprint Visual (7 cols) */}
                      <div className="md:col-span-7 bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 p-2 shadow-inner">
                        <div className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950">
                          <img
                            src={selectedFloorPlan.imageUrl}
                            alt={selectedFloorPlan.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </div>

                      {/* Specs Matrix (5 cols) */}
                      <div className="md:col-span-5 bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4 text-xs">
                        <div>
                          <span className="text-amber-700 font-bold uppercase text-[11px] block font-mono">
                            {selectedFloorPlan.type}
                          </span>
                          <h4 className="text-lg font-black text-slate-900 font-display">
                            {selectedFloorPlan.name}
                          </h4>
                          <strong className="text-base font-black text-amber-800 font-mono-numbers block mt-1">
                            {selectedFloorPlan.priceEstimate}
                          </strong>
                        </div>

                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Super Built-Up</span>
                            <strong className="text-slate-900 font-mono-numbers text-sm">
                              {selectedFloorPlan.superBuiltUpSqft} sq.ft
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Carpet Area</span>
                            <strong className="text-slate-900 font-mono-numbers text-sm">
                              {selectedFloorPlan.carpetSqft} sq.ft
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Bedrooms / Baths</span>
                            <strong className="text-slate-900 font-mono-numbers">
                              {selectedFloorPlan.bedrooms} BHK / {selectedFloorPlan.bathrooms} Baths
                            </strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Balconies / Decks</span>
                            <strong className="text-slate-900 font-mono-numbers">
                              {selectedFloorPlan.balconies} Private Decks
                            </strong>
                          </div>
                          <div className="col-span-2">
                            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Vastu Orientation</span>
                            <strong className="text-slate-900">{selectedFloorPlan.facing}</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                  Architectural floor plans are available upon request from the project PMO.
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AUDIO BRIEFING */}
          {activeTab === 'AUDIO' && (
            <div className="space-y-4">
              <AudioStoryPlayer
                title={property.audioNarrationTitle || `${property.title} Architectural & Engineering Briefing`}
                narrator="Swamy Reddy Javidi"
                duration={property.audioNarrationDuration || '2:50'}
                audioUrl={property.audioNarrationUrl}
                transcript={
                  property.audioTranscript ||
                  `This is the Property Studio architectural due-diligence review for ${property.title} located at ${property.location}. Featuring ${displayPropertyType(property.propertyType)} architecture with civil construction verified at ${property.progressPercent}%, this development adheres strictly to TS-RERA approval registration ID ${property.reraRegId}.`
                }
                badge="Executive Voice Audit"
                variant="card"
              />
            </div>
          )}

          {/* TAB 5: PRICING & EMI CALCULATOR */}
          {activeTab === 'PRICING' && (
            <div className="space-y-6">
              {/* Detailed Breakdown Items */}
              {property.priceBreakdown && (
                <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-mono">
                    All-Inclusive Transparent Cost Sheet
                  </h4>
                  <div className="divide-y divide-slate-200 text-xs">
                    {property.priceBreakdown.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-slate-800">{item.label}</span>
                          {item.notes && <span className="text-slate-500 block text-[11px]">{item.notes}</span>}
                        </div>
                        <strong className="text-slate-900 font-mono-numbers">
                          ₹{item.amountLakhs.toFixed(2)} Lakhs
                        </strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Interactive EMI Calculator */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 border border-slate-800 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wide font-mono">
                    <Calculator className="w-4 h-4" />
                    <span>Home Loan EMI Estimator</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase block">Estimated Monthly EMI</span>
                    <strong className="text-xl font-black text-amber-400 font-mono-numbers">
                      ₹{calculateEmi().toLocaleString('en-IN')} /month
                    </strong>
                  </div>
                </div>

                {/* Sliders */}
                <div className="space-y-4 text-xs">
                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-slate-300">Loan Amount: ₹{loanAmountLakhs} Lakhs</span>
                      <span className="text-slate-400">Min ₹50L - Max ₹1,000L</span>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={1000}
                      step={10}
                      value={loanAmountLakhs}
                      onChange={e => setLoanAmountLakhs(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-slate-300">Loan Tenure: {loanTenureYears} Years</span>
                      <span className="text-slate-400">5 to 30 Years</span>
                    </div>
                    <input
                      type="range"
                      min={5}
                      max={30}
                      step={1}
                      value={loanTenureYears}
                      onChange={e => setLoanTenureYears(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-1.5">
                      <span className="text-slate-300">Interest Rate: {interestRatePct}% p.a.</span>
                      <span className="text-slate-400">7.0% to 11.0%</span>
                    </div>
                    <input
                      type="range"
                      min={7.0}
                      max={11.0}
                      step={0.1}
                      value={interestRatePct}
                      onChange={e => setInterestRatePct(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: CIVIL LOGS */}
          {activeTab === 'LOGS' && (
            <div className="space-y-4">
              {propLogs.length > 0 ? (
                <div className="space-y-4">
                  {propLogs.map(log => (
                    <div
                      key={log.id}
                      className="bg-slate-50 rounded-2xl p-5 border border-slate-200 flex flex-col md:flex-row gap-4 items-start"
                    >
                      {log.imageUrl && (
                        <div className="w-full md:w-44 aspect-video rounded-xl overflow-hidden bg-slate-900 shrink-0">
                          <img src={log.imageUrl} alt="" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-800 font-mono">{log.date}</span>
                          <span className="text-slate-300" aria-hidden="true">·</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            {log.stage} ({log.progressPercentage}%)
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{log.milestoneTitle}</h4>
                        <p className="text-slate-600 leading-relaxed">{log.description}</p>
                        <span className="text-[11px] text-slate-400 block pt-1">
                          Audited & verified by: <strong>{log.verifiedBy}</strong>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-200 text-sm">
                  Civil foundation and construction logs will be published upon the next site audit cycle.
                </div>
              )}
            </div>
          )}

          <ApprovedProjectReviews projectId={property.id} />

          {/* Universal Amenities & Highlights Section */}
          <div className="pt-6 border-t border-slate-200 space-y-4">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide font-mono">
              Curated Amenities & Engineering Highlights
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs text-slate-700">
              {property.amenities.map((amenity, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Bottom Action Footer */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            TG RERA ID: <strong className="font-mono text-slate-800">{property.reraRegId}</strong>
            <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
            Handover: <strong className="text-slate-800">{property.completionDate}</strong>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {onContactAdmin && (
              <button
                onClick={() => onContactAdmin(property)}
                className="flex-1 sm:flex-initial px-5 py-3 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Phone className="w-4 h-4 text-amber-600" />
                <span>Contact Project PMO</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              Close Blueprint
            </button>
          </div>
        </div>

        {/* Demonstration Data Notice Bar */}
        <div className="px-6 py-2.5 bg-amber-50/80 border-t border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
          <span>
            <strong>Demonstration Showcase Notice:</strong> Architectural specs, pricing sheets, TS-RERA numbers ({property.reraRegId}), and civil progress metrics are illustrative models for platform demonstration.
          </span>
          <span className="font-mono text-amber-700 uppercase font-semibold text-[10px] hidden md:inline shrink-0 ml-2">
            Pre-Production Sample Record
          </span>
        </div>
      </div>
    </div>
  );
};
