import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

export const ProfessionalDashboard: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [reraNumber, setReraNumber] = useState('');
  const [organization, setOrganization] = useState(currentUser.organization || '');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');

  const load = async () => {
    const [profileRes, listingRes, unlockRes] = await Promise.all([
      fetch('/api/professional/profile'),
      fetch('/api/me/listings'),
      fetch('/api/me/unlocks')
    ]);
    if (profileRes.ok) {
      const data = await profileRes.json();
      setProfile(data.profile);
      setReraNumber(data.profile?.rera_number || '');
      setOrganization(data.profile?.organization || currentUser.organization || '');
    }
    if (listingRes.ok) setListings((await listingRes.json()).listings || []);
    if (unlockRes.ok) setUnlocks((await unlockRes.json()).unlocks || []);
  };

  useEffect(() => {
    load().catch(() => showToast('Could not load the professional workspace.'));
  }, []);

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch('/api/professional/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reraNumber, organization })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Profile was not saved.');
      return;
    }
    setProfile(data.profile);
    showToast(data.notice || 'Verification submitted.');
  };

  const submitListing = async (event: React.FormEvent) => {
    event.preventDefault();
    const res = await fetch('/api/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, location, microMarket: location, developerName: organization })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Listing was not submitted.');
      return;
    }
    setTitle('');
    setLocation('');
    showToast('Listing submitted for approval. It is not public yet.');
    load().catch(() => {});
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-[11px] font-mono uppercase tracking-widest text-amber-700">{currentUser.role.replaceAll('_', ' ')}</p>
        <h1 className="text-2xl font-black text-slate-900 font-display">Professional workspace</h1>
      </div>
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-slate-900">Verification</h2>
        <p className="text-xs text-slate-600">Status: {profile?.verification_status || 'Not submitted'}. A RERA number does not verify this account.</p>
        <form onSubmit={saveProfile} className="grid sm:grid-cols-2 gap-3 text-xs">
          <input value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Organization" className="border border-slate-300 rounded-xl px-3 py-2" />
          <input value={reraNumber} onChange={e => setReraNumber(e.target.value)} placeholder="RERA number, if any" className="border border-slate-300 rounded-xl px-3 py-2" />
          <button className="sm:col-span-2 justify-self-start px-4 py-2 bg-slate-900 text-white rounded-xl font-bold">Submit for review</button>
        </form>
      </section>
      <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
        <h2 className="font-bold text-slate-900">Listings</h2>
        <form onSubmit={submitListing} className="grid sm:grid-cols-2 gap-3 text-xs">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Listing title" required className="border border-slate-300 rounded-xl px-3 py-2" />
          <input value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="border border-slate-300 rounded-xl px-3 py-2" />
          <button className="sm:col-span-2 justify-self-start px-4 py-2 bg-slate-900 text-white rounded-xl font-bold">Submit listing</button>
        </form>
        <ul className="text-xs text-slate-700 space-y-1">
          {listings.length === 0 && <li>No listings yet.</li>}
          {listings.map(listing => (
            <li key={listing.id}>{listing.title} — {listing.publicationStatus}</li>
          ))}
        </ul>
      </section>
      <section className="bg-white border border-slate-200 rounded-2xl p-5">
        <h2 className="font-bold text-slate-900">Lead credits and unlocks</h2>
        <p className="text-xs text-slate-600 mt-1">Wallet balance: ₹{Number(currentUser.walletBalance || 0).toLocaleString('en-IN')}</p>
        <p className="text-xs text-slate-600">Unlock records: {unlocks.length}</p>
      </section>
    </div>
  );
};
