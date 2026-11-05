import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { DEFAULT_NEW_PROPERTY_TYPE } from '../../shared/propertyCategories';
import { ClipboardList, ShieldCheck, MapPin, IndianRupee, Clock, CheckCircle2, Sparkles, Building, Layers } from 'lucide-react';

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

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Visual Header */}
      <div className="bg-[#0B1530] text-white rounded-3xl p-6 sm:p-8 border border-[#101C38] shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF5E4] text-[#92580c] border border-[#E99A18]/30 text-xs font-bold font-mono uppercase tracking-wide">
            <ClipboardList className="w-3.5 h-3.5 text-[#E99A18]" />
            <span>CONFIDENTIAL BUYER BRIEF</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
            Tell Property Studio What You Need
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Directly submit your acquisition parameters to the Property Studio advisory team. Your personal telephone number and identity remain completely encrypted and are never exposed to public call lists.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5 text-[#E99A18] font-bold">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> 100% Privacy Protected
            </span>
            <span aria-hidden="true">·</span>
            <span>Zero Brokerage Cold Calls</span>
            <span aria-hidden="true">·</span>
            <span>Audited Project Matching</span>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-[#E99A18]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {!isLoggedIn ? (
        <div className="bg-white border border-[#E2E8F0] rounded-3xl p-8 text-center space-y-4 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-[#FFF5E4] border border-[#E99A18]/30 flex items-center justify-center mx-auto text-[#E99A18]">
            <ClipboardList className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[#14213D]">Sign in to submit your property requirement</h2>
            <p className="text-xs sm:text-sm text-[#64748B] max-w-md mx-auto">
              A verified account is required so your requirement stays linked securely to your profile and is never published as an open lead.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-6 py-2.5 bg-[#0B1530] hover:bg-[#101C38] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            Login / Sign Up
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          {/* Section 1: Asset & Location */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
              <div className="w-6 h-6 rounded-full bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center text-xs font-bold font-mono">
                1
              </div>
              <h3 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">
                Asset Category & Corridor
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="requirement-property-type" className="block text-xs font-bold text-[#14213D] mb-1.5">
                  Property Type <span className="text-red-500">*</span>
                </label>
                <PropertyCategorySelect
                  id="requirement-property-type"
                  ariaLabel="Property type"
                  value={propertyType}
                  onChange={setPropertyType}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all bg-white"
                />
              </div>

              <div>
                <label htmlFor="requirement-location" className="block text-xs font-bold text-[#14213D] mb-1.5">
                  Hyderabad Locality <span className="text-red-500">*</span>
                </label>
                <select
                  id="requirement-location"
                  value={location}
                  onChange={event => setLocation(event.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer"
                  required
                >
                  {HYDERABAD_LOCALITIES.map(loc => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
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
            </div>
          </div>

          {/* Section 2: Financials & Timeline */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
              <div className="w-6 h-6 rounded-full bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center text-xs font-bold font-mono">
                2
              </div>
              <h3 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">
                Budget & Execution Timelines
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="requirement-budget" className="block text-xs font-bold text-[#14213D] mb-1.5">
                  Target Budget <span className="text-red-500">*</span>
                </label>
                <input
                  id="requirement-budget"
                  value={budget}
                  maxLength={40}
                  onChange={event => setBudget(event.target.value)}
                  placeholder="e.g. 1.5 Cr or 2.25"
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
                  required
                />
              </div>

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
                <input
                  id="requirement-size"
                  type="number"
                  min="0"
                  step="any"
                  value={size}
                  onChange={e => setSize(e.target.value)}
                  placeholder={`e.g. 2400 (${sizeUnit})`}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
                />
              </div>

              <div>
                <label htmlFor="requirement-possession" className="block text-xs font-bold text-[#14213D] mb-1.5">
                  Possession Horizon <span className="text-red-500">*</span>
                </label>
                <select
                  id="requirement-possession"
                  value={possession}
                  onChange={e => setPossession(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer"
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
                Purchase Execution Window <span className="text-red-500">*</span>
              </label>
              <select
                id="requirement-timeline"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all cursor-pointer"
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

          {/* Section 3: Bespoke Preferences */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
              <div className="w-6 h-6 rounded-full bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center text-xs font-bold font-mono">
                3
              </div>
              <h3 className="text-sm font-bold text-[#14213D] uppercase tracking-wide">
                Custom Architectural & Facing Preferences
              </h3>
            </div>

            <div>
              <label htmlFor="requirement-details" className="block text-xs font-bold text-[#14213D] mb-1.5">
                Details & Preferences (Optional)
              </label>
              <textarea
                id="requirement-details"
                value={details}
                maxLength={500}
                rows={3}
                onChange={event => setDetails(event.target.value)}
                placeholder="e.g. East or North facing only, high floor (above 30th floor), 100% Vaastu compliant, 3 car parks, lake view..."
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-[#E2E8F0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18] transition-all"
              />
            </div>
          </div>

          {error ? <p role="alert" className="text-xs font-bold text-[#DC2626] bg-red-50 p-3 rounded-xl border border-red-200">{error}</p> : null}
          {success ? <p className="text-xs font-bold text-[#16A34A] bg-emerald-50 p-3 rounded-xl border border-emerald-200">{success}</p> : null}

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-[#0B1530] hover:bg-[#101C38] active:scale-95 text-white rounded-xl text-xs sm:text-sm font-bold disabled:opacity-60 transition-all shadow-sm cursor-pointer"
            >
              {saving ? 'Encrypting & Saving…' : 'Submit Private Requirement'}
            </button>
            <span className="text-[11px] text-[#64748B] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#16A34A] shrink-0" />
              Direct transmission to official desk
            </span>
          </div>
        </form>
      )}

      {/* Existing Requirements Ledger */}
      <section className="space-y-4" aria-labelledby="my-requirements">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
