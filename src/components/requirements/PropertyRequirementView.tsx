import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { DEFAULT_NEW_PROPERTY_TYPE } from '../../shared/propertyCategories';
import { ClipboardList } from 'lucide-react';

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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">Property Requirement</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Tell Property Studio what you need</h1>
        <p className="text-sm text-slate-600 leading-relaxed">
          This page is separate from Buyer Leads. Your phone number is not included in the submission.
        </p>
      </div>

      {!isLoggedIn ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-3">
          <ClipboardList className="w-8 h-8 text-amber-600" />
          <h2 className="text-lg font-bold text-slate-900">Sign in to submit a requirement</h2>
          <p className="text-sm text-slate-600">A signed-in account is required so the requirement stays with you and is not published as a lead.</p>
          <button
            type="button"
            onClick={onOpenLoginModal}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Login / Sign Up
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-4">
          <div>
            <label htmlFor="requirement-property-type" className="block text-xs font-bold text-slate-700 mb-1">
              Property type <span className="text-red-500">*</span>
            </label>
            <PropertyCategorySelect
              id="requirement-property-type"
              ariaLabel="Property type"
              value={propertyType}
              onChange={setPropertyType}
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="requirement-location" className="block text-xs font-bold text-slate-700 mb-1">
                Hyderabad Locality <span className="text-red-500">*</span>
              </label>
              <select
                id="requirement-location"
                value={location}
                onChange={event => setLocation(event.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
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
                  className="mt-1.5 w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  required
                />
              )}
            </div>

            <div>
              <label htmlFor="requirement-budget" className="block text-xs font-bold text-slate-700 mb-1">
                Budget (in ₹ Crores) <span className="text-red-500">*</span>
              </label>
              <input
                id="requirement-budget"
                value={budget}
                maxLength={40}
                onChange={event => setBudget(event.target.value)}
                placeholder="e.g. 1.5 Cr or 2.25"
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="requirement-size" className="text-xs font-bold text-slate-700">Property Size</label>
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setSizeUnit('Sq. Ft.')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      sizeUnit === 'Sq. Ft.' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Sq. Ft.
                  </button>
                  <button
                    type="button"
                    onClick={() => setSizeUnit('Sq. Yards')}
                    className={`px-1.5 py-0.5 rounded font-bold cursor-pointer ${
                      sizeUnit === 'Sq. Yards' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'
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
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="requirement-possession" className="block text-xs font-bold text-slate-700 mb-1">
                Possession <span className="text-red-500">*</span>
              </label>
              <select
                id="requirement-possession"
                value={possession}
                onChange={e => setPossession(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
                required
              >
                {POSSESSION_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="requirement-timeline" className="block text-xs font-bold text-slate-700 mb-1">
                Timeline of Purchase <span className="text-red-500">*</span>
              </label>
              <select
                id="requirement-timeline"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl bg-white"
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

          <div>
            <label htmlFor="requirement-details" className="block text-xs font-bold text-slate-700 mb-1">Details & Preferences</label>
            <textarea
              id="requirement-details"
              value={details}
              maxLength={500}
              rows={3}
              onChange={event => setDetails(event.target.value)}
              placeholder="e.g. East facing, high floor, Vaastu compliant..."
              className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl"
            />
          </div>

          {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-800">{success}</p> : null}
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-60 cursor-pointer">
            {saving ? 'Saving…' : 'Submit requirement'}
          </button>
        </form>
      )}

      <section className="space-y-3" aria-labelledby="my-requirements">
        <h2 id="my-requirements" className="text-lg font-bold text-slate-900">Your requirements</h2>
        {loading ? <p className="text-sm text-slate-500">Loading your requirements…</p> : null}
        {!loading && isLoggedIn && requirements.length === 0 ? (
          <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">You have not submitted a requirement yet.</p>
        ) : null}
        {requirements.map(item => (
          <article key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1">
            <h3 className="text-sm font-bold text-slate-900">{item.propertyType}</h3>
            <p className="text-xs text-slate-600">{[item.location, item.budget].filter(Boolean).join(' · ') || 'No location or budget added'}</p>
            {item.details ? <p className="text-sm text-slate-700">{item.details}</p> : null}
          </article>
        ))}
      </section>
    </div>
  );
};
