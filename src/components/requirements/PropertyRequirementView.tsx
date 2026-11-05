import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { DEFAULT_NEW_PROPERTY_TYPE } from '../../shared/propertyCategories';
import {
  ClipboardList,
  ShieldCheck,
  MapPin,
  IndianRupee,
  Clock,
  CheckCircle2,
  Sparkles,
  Building,
  Building2,
  Layers,
  Send,
  Bookmark,
  Key,
  Calendar,
  Zap,
  Lock,
  Users,
  Award,
  FileText,
  Check,
  Maximize2
} from 'lucide-react';

type Requirement = {
  id: string;
  propertyType: string;
  location: string;
  budget: string;
  details: string;
  createdAt: string;
};

const HYDERABAD_LOCALITIES = [
  'Kokapet',
  'Financial District / Nanakramguda',
  'Gachibowli',
  'Puppalaguda',
  'Manikonda',
  'Narsingi',
  'Manchirevula',
  'Miyapur',
  'Tellapur',
  'Kollur',
  'Tukkuguda',
  'Other Localities'
];

const POSSESSION_OPTIONS = [
  'Ready to Move / Ready To Construct',
  'Within 3 Months',
  'Within 6 Months',
  'Within 1 Year',
  '1 - 1.6 Years',
  '1.7 - 2.0 Years',
  '2 - 3 Years',
  '3 - 4 Years',
  'More than 5 Years'
];

const PURCHASE_TIMELINES = [
  'Immediately',
  '1-3 Months',
  '4-6 Months',
  '6-9 Months',
  'After 1 Year'
];

export const PropertyRequirementView: React.FC<{ onOpenLoginModal?: () => void }> = ({ onOpenLoginModal }) => {
  const { isLoggedIn, showToast } = useApp();
  const [propertyType, setPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);
  const [location, setLocation] = useState('Kokapet');
  const [customLocation, setCustomLocation] = useState('');
  const [budget, setBudget] = useState('');
  const [size, setSize] = useState('');
  const [sizeUnit, setSizeUnit] = useState<'Sq. Ft.' | 'Sq. Yards'>('Sq. Ft.');
  const [possession, setPossession] = useState(POSSESSION_OPTIONS[0]);
  const [timeline, setTimeline] = useState(PURCHASE_TIMELINES[0]);
  const [details, setDetails] = useState('');
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isLoggedIn) return;
    let cancelled = false;
    setLoading(true);
    fetch('/api/requirements')
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Requirements could not be loaded.');
        if (!cancelled) setRequirements(Array.isArray(data.requirements) ? data.requirements : []);
      })
      .catch(err => {
        if (!cancelled) setError(err.message || 'Requirements could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    if (!isLoggedIn) {
      onOpenLoginModal?.();
      return;
    }
    setSaving(true);
    try {
      const locationFinal = location === 'Other Localities' ? (customLocation.trim() || 'Hyderabad') : location.trim();
      const budgetClean = budget.trim();
      const budgetFinal = budgetClean.toLowerCase().includes('cr') ? budgetClean : `₹${budgetClean} Cr`;
      const detailParts = [
        size.trim() ? `Size: ${size.trim()} ${sizeUnit}` : '',
        `Possession: ${possession}`,
        `Timeline: ${timeline}`,
        details.trim()
      ].filter(Boolean);

      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyType,
          location: locationFinal,
          budget: budgetFinal,
          details: detailParts.join(' | ')
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The requirement was not saved.');
      setRequirements(prev => [data.requirement, ...prev]);
      setBudget('');
      setSize('');
      setCustomLocation('');
      setDetails('');
      setSuccess('Your property requirement was saved.');
      showToast('Property requirement saved');
    } catch (err: any) {
      setError(err.message || 'The requirement was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem('ps_requirement_draft', JSON.stringify({
        propertyType,
        location,
        customLocation,
        budget,
        size,
        sizeUnit,
        possession,
        timeline,
        details
      }));
      showToast('Requirement parameters saved as draft.');
    } catch {
      showToast('Could not save draft locally.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Visual Architectural Hero Banner matching Reference Screenshot */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#FFFDF9] via-[#FFF9EE] to-slate-100 border border-[#E2E8F0] shadow-sm p-6 sm:p-8 lg:p-10">
        {/* Architectural Image Background Layer */}
        <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 pointer-events-none overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80"
            alt="Property Requirement Architecture"
            className="w-full h-full object-cover object-center opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#FFFDF9] via-[#FFFDF9]/90 to-transparent lg:via-[#FFF9EE]/70" />
        </div>

        <div className="relative z-10 max-w-xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF5E4] text-[#92580c] border border-[#E99A18]/30 text-xs font-bold font-mono uppercase tracking-wide mb-1">
            <Building className="w-3.5 h-3.5 text-[#E99A18]" />
            <span>PROPERTY REQUIREMENT</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-[#14213D] font-display tracking-tight leading-tight">
            Tell Property Studio what you need
          </h1>

          <p className="text-xs sm:text-sm text-[#64748B] max-w-lg leading-relaxed pt-1">
            Share your property requirement and get connected with the right buyers, projects, and market opportunities.
          </p>
        </div>
      </div>

      {!isLoggedIn ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xs max-w-2xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF5E4] border border-[#E99A18]/30 flex items-center justify-center mx-auto text-[#E99A18]">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold text-[#14213D]">Sign in to submit your property requirement</h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto leading-relaxed">
              A verified account is required so your requirement stays linked securely to your profile and is never published as an open lead.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-6 py-2.5 bg-[#101C38] hover:bg-[#0B1530] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-95"
          >
            Login / Sign Up
          </button>
        </div>
      ) : (
        /* Main Two-Column Layout matching Reference Screenshot */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols): Requirement Form */}
          <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-2 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-[#14213D] leading-tight">
                  Submit Your Property Requirement
                </h2>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Help us understand your needs so we can match you with the right opportunities.
                </p>
              </div>
            </div>

            <form onSubmit={submit} className="space-y-5">
              {/* Row 1: Property Type */}
              <div>
                <label htmlFor="requirement-property-type" className="block text-xs font-bold text-[#14213D] mb-1.5">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <PropertyCategorySelect
                    id="requirement-property-type"
                    ariaLabel="Property type"
                    value={propertyType}
                    onChange={setPropertyType}
                    className="w-full pl-3.5 pr-8 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all bg-white"
                  />
                </div>
              </div>

              {/* Row 2: Locality & Budget */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="requirement-location" className="block text-xs font-bold text-[#14213D] mb-1.5">
                    Hyderabad Locality <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="requirement-location"
                      value={location}
                      onChange={event => setLocation(event.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer truncate"
                      required
                    >
                      {HYDERABAD_LOCALITIES.map(loc => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                  {location === 'Other Localities' && (
                    <input
                      type="text"
                      value={customLocation}
                      onChange={e => setCustomLocation(e.target.value)}
                      placeholder="Specify locality name"
                      className="mt-2 w-full px-3.5 py-2 text-xs border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
                      required
                    />
                  )}
                </div>

                <div>
                  <label htmlFor="requirement-budget" className="block text-xs font-bold text-[#14213D] mb-1.5">
                    Budget (in ₹ Crores) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <IndianRupee className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="requirement-budget"
                      value={budget}
                      maxLength={40}
                      onChange={event => setBudget(event.target.value)}
                      placeholder="e.g. 1.5 Cr or 2.25"
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Row 3: Size + Possession + Timeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="requirement-size" className="text-xs font-bold text-[#14213D]">
                      Property Size
                    </label>
                    <div className="inline-flex rounded-lg border border-[#E2E8F0] bg-slate-100 p-0.5 text-[10px]">
                      <button
                        type="button"
                        onClick={() => setSizeUnit('Sq. Ft.')}
                        className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                          sizeUnit === 'Sq. Ft.' ? 'bg-white text-[#14213D] shadow-xs' : 'text-[#64748B]'
                        }`}
                      >
                        Sq. Ft.
                      </button>
                      <button
                        type="button"
                        onClick={() => setSizeUnit('Sq. Yards')}
                        className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                          sizeUnit === 'Sq. Yards' ? 'bg-white text-[#14213D] shadow-xs' : 'text-[#64748B]'
                        }`}
                      >
                        Sq. Yards
                      </button>
                    </div>
                  </div>
                  <div className="relative">
                    <Maximize2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="requirement-size"
                      type="number"
                      min="0"
                      step="any"
                      value={size}
                      onChange={e => setSize(e.target.value)}
                      placeholder={`e.g. 2400 (${sizeUnit})`}
                      className="w-full pl-9 pr-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="requirement-possession" className="block text-xs font-bold text-[#14213D] mb-1.5">
                    Possession <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="requirement-possession"
                      value={possession}
                      onChange={e => setPossession(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer truncate"
                      required
                    >
                      {POSSESSION_OPTIONS.map(opt => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="requirement-timeline" className="block text-xs font-bold text-[#14213D] mb-1.5">
                    Timeline of Purchase <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-amber-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="requirement-timeline"
                      value={timeline}
                      onChange={e => setTimeline(e.target.value)}
                      className="w-full pl-9 pr-8 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer truncate"
                      required
                    >
                      {PURCHASE_TIMELINES.map(t => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 4: Details & Preferences */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="requirement-details" className="text-xs font-bold text-[#14213D]">
                    Details & Preferences
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {details.length}/500
                  </span>
                </div>
                <div className="relative">
                  <FileText className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <textarea
                    id="requirement-details"
                    value={details}
                    maxLength={500}
                    rows={4}
                    onChange={event => setDetails(event.target.value)}
                    placeholder="e.g. East facing, high floor, Vaastu compliant, gated community, etc..."
                    className="w-full pl-10 pr-3.5 py-3 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
                  />
                </div>
              </div>

              {error ? <p role="alert" className="text-xs font-bold text-[#DC2626] bg-red-50 p-3 rounded-xl border border-red-200">{error}</p> : null}
              {success ? <p className="text-xs font-bold text-[#16A34A] bg-emerald-50 p-3 rounded-xl border border-emerald-200">{success}</p> : null}

              {/* Action Buttons Row matching Reference Screenshot */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-[#101C38] hover:bg-[#0B1530] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold disabled:opacity-60 transition-all shadow-sm flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4 text-amber-400" />
                  <span>{saving ? 'Encrypting & Saving…' : 'Submit Requirement'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Bookmark className="w-4 h-4 text-slate-500" />
                  <span>Save as Draft</span>
                </button>
              </div>
            </form>
          </div>

          {/* Right Column (4 cols): Information Cards matching Reference Screenshot */}
          <div className="lg:col-span-4 space-y-6">
            {/* Card 1: Your Requirement Progress */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs space-y-5">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm font-display">
                <Clock className="w-4 h-4 text-amber-600" />
                <h3 className="text-[#14213D] font-bold text-base">Your Requirement Progress</h3>
              </div>

              {/* 3-Step Progress Indicator */}
              <div className="pt-1">
                <div className="flex items-center justify-between relative">
                  {/* Step 1 */}
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className="w-7 h-7 rounded-full bg-[#E99A18] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      1
                    </div>
                    <span className="text-[11px] font-bold text-slate-800">Details</span>
                  </div>

                  <div className="flex-1 h-0.5 bg-slate-200 -mt-5 mx-2" />

                  {/* Step 2 */}
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className="w-7 h-7 rounded-full border border-slate-300 bg-white text-slate-500 font-bold text-xs flex items-center justify-center">
                      2
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Match</span>
                  </div>

                  <div className="flex-1 h-0.5 bg-slate-200 -mt-5 mx-2" />

                  {/* Step 3 */}
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div className="w-7 h-7 rounded-full border border-slate-300 bg-white text-slate-500 font-bold text-xs flex items-center justify-center">
                      3
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">Connect</span>
                  </div>
                </div>

                <div className="mt-5 p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex items-start gap-2 text-xs text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Get matched with verified buyers, projects, and market experts.
                  </p>
                </div>
              </div>
            </div>

            {/* Card 2: Why Submit Here? */}
            <div className="bg-white border border-[#E2E8F0] rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 text-amber-700 font-bold text-sm font-display pb-2 border-b border-slate-100">
                <Award className="w-4 h-4 text-amber-600" />
                <h3 className="text-[#14213D] font-bold text-base">Why Submit Here?</h3>
              </div>

              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Verified & Relevant Matches</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Connect with genuine property opportunities</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Faster Response</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Get outreach from verified parties quickly</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Expert Guidance</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Backed by market intelligence & RERA insights</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">100% Confidential</h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Your details are secure and never misused</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Existing Requirements Ledger */}
      <section className="space-y-4 pt-4" aria-labelledby="my-requirements">
        <div className="flex items-center justify-between">
          <h2 id="my-requirements" className="text-base sm:text-lg font-bold text-[#14213D]">
            Your Submitted Requirements ({requirements.length})
          </h2>
        </div>
        {loading ? <p className="text-xs text-[#64748B]">Loading requirements…</p> : null}
        {!loading && isLoggedIn && requirements.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 text-center text-xs sm:text-sm text-[#64748B]">
            You have not submitted any property requirements yet.
          </div>
        ) : null}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {requirements.map(item => (
            <article key={item.id} className="bg-white border border-[#E2E8F0] rounded-2xl p-4 sm:p-5 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#92580c] bg-[#FFF5E4] border border-[#E99A18]/30 px-2.5 py-0.5 rounded-full font-mono">
                  {item.propertyType}
                </span>
                <span className="text-[10px] text-[#64748B] font-mono">
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Active'}
                </span>
              </div>
              <p className="text-xs font-semibold text-[#14213D]">
                {[item.location, item.budget].filter(Boolean).join(' · ') || 'No location or budget added'}
              </p>
              {item.details ? (
                <p className="text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0] leading-relaxed">
                  {item.details}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
};
