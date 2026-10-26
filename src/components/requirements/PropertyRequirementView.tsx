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

export const PropertyRequirementView: React.FC<{ onOpenLoginModal?: () => void }> = ({ onOpenLoginModal }) => {
  const { isLoggedIn, showToast } = useApp();
  const [propertyType, setPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);
  const [location, setLocation] = useState('');
  const [budget, setBudget] = useState('');
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
      const response = await fetch('/api/requirements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyType, location, budget, details })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The requirement was not saved.');
      setRequirements(prev => [data.requirement, ...prev]);
      setLocation('');
      setBudget('');
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
            <label htmlFor="requirement-property-type" className="block text-xs font-bold text-slate-700 mb-1">Property type</label>
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
              <label htmlFor="requirement-location" className="block text-xs font-bold text-slate-700 mb-1">Location</label>
              <input id="requirement-location" value={location} maxLength={80} onChange={event => setLocation(event.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" />
            </div>
            <div>
              <label htmlFor="requirement-budget" className="block text-xs font-bold text-slate-700 mb-1">Budget</label>
              <input id="requirement-budget" value={budget} maxLength={40} onChange={event => setBudget(event.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" />
            </div>
          </div>
          <div>
            <label htmlFor="requirement-details" className="block text-xs font-bold text-slate-700 mb-1">Details</label>
            <textarea id="requirement-details" value={details} maxLength={500} rows={4} onChange={event => setDetails(event.target.value)} placeholder="Optional" className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" />
          </div>
          {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
          {success ? <p className="text-xs text-emerald-800">{success}</p> : null}
          <button type="submit" disabled={saving} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-60">
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
