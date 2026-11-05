import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { DEFAULT_NEW_PROPERTY_TYPE, displayPropertyType } from '../../shared/propertyCategories';
import {
  Briefcase,
  ShieldCheck,
  Building2,
  Wallet,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Send
} from 'lucide-react';

export const ProfessionalDashboard: React.FC = () => {
  const { currentUser, showToast } = useApp();
  const [profile, setProfile] = useState<any>(null);
  const [listings, setListings] = useState<any[]>([]);
  const [unlocks, setUnlocks] = useState<any[]>([]);
  const [reraNumber, setReraNumber] = useState('');
  const [organization, setOrganization] = useState(currentUser.organization || '');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [propertyType, setPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);

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
      body: JSON.stringify({
        title,
        location,
        microMarket: location,
        developerName: organization,
        propertyType
      })
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Listing was not submitted.');
      return;
    }
    setTitle('');
    setLocation('');
    setPropertyType(DEFAULT_NEW_PROPERTY_TYPE);
    showToast('Listing submitted for approval. It is not public yet.');
    load().catch(() => {});
  };

  const verificationStatus = profile?.verification_status || 'NOT_SUBMITTED';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Executive Workspace Header */}
      <div className="bg-[#0B1530] text-white rounded-3xl p-6 sm:p-8 border border-[#101C38] shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FFF5E4] text-[#92580c] uppercase tracking-wider">
                {currentUser.role.replaceAll('_', ' ')}
              </span>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                verificationStatus === 'VERIFIED'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
              }`}>
                {verificationStatus === 'VERIFIED' ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Verified Professional</span>
                  </>
                ) : (
                  <>
                    <Clock className="w-3 h-3" />
                    <span>{verificationStatus.replaceAll('_', ' ')}</span>
                  </>
                )}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-display">
              Professional Workspace
            </h1>
            <p className="text-xs sm:text-sm text-slate-300">
              Manage developer listings, regulatory credentials, RERA compliance, and buyer lead credits.
            </p>
          </div>

          <div className="bg-[#101C38] px-4 py-3 rounded-2xl border border-slate-700/80 text-right shrink-0">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Available Wallet Balance</span>
            <span className="text-xl font-bold text-[#E99A18] font-mono-numbers">
              ₹{Number(currentUser.walletBalance || 0).toLocaleString('en-IN')}
            </span>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-60 h-60 bg-[#E99A18]/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Verification & Accreditation Card */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-4 shadow-xs">
          <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
            <div className="w-8 h-8 rounded-xl bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#14213D]">Accreditation & Identity</h2>
              <p className="text-[11px] text-[#64748B]">State RERA registration & organization</p>
            </div>
          </div>

          <p className="text-xs text-[#64748B] leading-relaxed">
            Status: <strong className="text-[#14213D]">{profile?.verification_status || 'Not submitted'}</strong>. Submission of a valid RERA number initiates administrative verification with TS-RERA portal records.
          </p>

          <form onSubmit={saveProfile} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-[#14213D] mb-1">Organization / Developer Entity</label>
              <input
                value={organization}
                onChange={e => setOrganization(e.target.value)}
                placeholder="Developer or Advisory Firm Name"
                className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#14213D] mb-1">RERA Registration Number (Optional)</label>
              <input
                value={reraNumber}
                onChange={e => setReraNumber(e.target.value)}
                placeholder="e.g. P0240000XXXX"
                className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0B1530] hover:bg-[#101C38] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Submit for Verification
            </button>
          </form>
        </section>

        {/* Lead Credits & Unlock Telemetry Card */}
        <section className="lg:col-span-6 bg-white border border-[#E2E8F0] rounded-3xl p-6 space-y-4 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
              <div className="w-8 h-8 rounded-xl bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center shrink-0">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#14213D]">Lead Credits & Unlocks</h2>
                <p className="text-[11px] text-[#64748B]">Transactional wallet & lead records</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#F7F9FD] p-4 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Available Credits</span>
                <span className="text-xl font-bold text-[#14213D] font-mono-numbers">
                  ₹{Number(currentUser.walletBalance || 0).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="bg-[#F7F9FD] p-4 rounded-2xl border border-[#E2E8F0]">
                <span className="text-[11px] text-[#64748B] block">Unlocked Buyer Leads</span>
                <span className="text-xl font-bold text-[#14213D] font-mono-numbers">
                  {unlocks.length}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-[#64748B] bg-slate-50 p-3 rounded-xl border border-slate-100">
            Lead unlocks grant direct access to verified seeker telemetry with 100% compliance auditing.
          </p>
        </section>
      </div>

      {/* Submit New Listing Section */}
      <section className="bg-white border border-[#E2E8F0] rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E2E8F0]">
          <div className="w-8 h-8 rounded-xl bg-[#FFF5E4] text-[#E99A18] flex items-center justify-center shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#14213D]">Portfolio Listings & Blueprints</h2>
            <p className="text-[11px] text-[#64748B]">Submit new property blueprint for Super Admin compliance auditing</p>
          </div>
        </div>

        <form onSubmit={submitListing} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#14213D] mb-1">
              Project Title <span className="text-red-500">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Aurelia Sky Residences"
              required
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#14213D] mb-1">
              Micro-Market / Location <span className="text-red-500">*</span>
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Kokapet, Hyderabad"
              required
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-[#14213D] mb-1">
              Property Category <span className="text-red-500">*</span>
            </label>
            <PropertyCategorySelect
              ariaLabel="Property type"
              value={propertyType}
              onChange={setPropertyType}
              className="w-full border border-[#E2E8F0] rounded-xl px-3.5 py-2.5 text-xs text-[#14213D] bg-white focus:outline-none focus:ring-2 focus:ring-[#E99A18]/20 focus:border-[#E99A18]"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#0B1530] hover:bg-[#101C38] text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Submit Listing for Audit
            </button>
          </div>
        </form>

        {/* Existing Listings Table */}
        <div className="pt-4 border-t border-[#E2E8F0] space-y-3">
          <h3 className="text-xs font-bold text-[#14213D] uppercase tracking-wider font-mono">
            Active Submissions ({listings.length})
          </h3>

          {listings.length === 0 ? (
            <p className="text-xs text-[#64748B] bg-slate-50 p-4 rounded-xl text-center">
              No listings submitted yet. Submissions will appear here after compliance verification.
            </p>
          ) : (
            <div className="divide-y divide-[#E2E8F0] border border-[#E2E8F0] rounded-2xl overflow-hidden">
              {listings.map(listing => (
                <div key={listing.id} className="p-4 flex items-center justify-between gap-4 bg-white hover:bg-slate-50 transition-colors">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[#14213D]">{listing.title}</h4>
                    <p className="text-[11px] text-[#64748B]">
                      {displayPropertyType(listing.propertyType) || 'Residential'} · {listing.location || 'Hyderabad'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    listing.publicationStatus === 'APPROVED'
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : listing.publicationStatus === 'REJECTED'
                      ? 'bg-red-50 text-red-800 border border-red-200'
                      : 'bg-amber-50 text-amber-900 border border-amber-200'
                  }`}>
                    {listing.publicationStatus}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

