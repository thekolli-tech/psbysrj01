import React, { useEffect, useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { PropertyCategorySelect } from '../properties/PropertyCategorySelect';
import { DEFAULT_NEW_PROPERTY_TYPE } from '../../shared/propertyCategories';
import {
  Building2,
  Building,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Pause,
  Play,
  Archive,
  Edit3,
  X,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Unlock,
  Lock,
  Phone,
  Mail,
  RefreshCw,
  Activity,
  Database,
  FileText,
  Check,
  AlertTriangle,
  MapPin,
  IndianRupee,
  Layers,
  Sparkles
} from 'lucide-react';

type DevTab = 'PORTFOLIO' | 'LEADS' | 'PROFILE' | 'DIAGNOSTICS';

interface ListingItem {
  id: string;
  ownerId: string;
  title: string;
  publicationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'ARCHIVED';
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
  propertyType?: string;
  location?: string;
  microMarket?: string;
  priceRange?: string;
  pricePerSqft?: number;
  totalUnits?: number;
  availableUnits?: number;
  developerName?: string;
  reraRegId?: string;
  completionDate?: string;
}

interface LeadItem {
  id: string;
  seekerName: string;
  seekerPhone: string;
  seekerEmail: string;
  revealed: boolean;
  budget: string;
  microMarket: string;
  propertyType: string;
  requirements?: string;
  tier: string;
  priceCredits: number;
  isUnlocked: boolean;
  createdAt: string;
}

interface UnlockHistoryItem {
  id: string;
  lead_id: string;
  professional_id: string;
  idempotency_key: string;
  amount: number;
  ledger_id: string;
  created_at: string;
}

interface ProfessionalProfile {
  user_id: string;
  professional_role: string;
  rera_number?: string | null;
  organization?: string | null;
  verification_status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
  rejection_reason?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export const DeveloperDashboard: React.FC = () => {
  const { currentUser, setActiveView, walletBalance, showToast, refreshSession } = useApp();

  const [activeTab, setActiveTab] = useState<DevTab>('PORTFOLIO');

  // Diagnostics State
  const [report, setReport] = useState<any>(null);
  const [diagnosticsError, setDiagnosticsError] = useState('');
  const [loadingDiagnostics, setLoadingDiagnostics] = useState(false);

  // Listings / Portfolio State
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [listingsError, setListingsError] = useState<string | null>(null);

  // New Listing Form State
  const [showNewListingForm, setShowNewListingForm] = useState(false);
  const [submittingListing, setSubmittingListing] = useState(false);
  const [listingFormError, setListingFormError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newPropertyType, setNewPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);
  const [newPriceRange, setNewPriceRange] = useState('');
  const [newPricePerSqft, setNewPricePerSqft] = useState('');
  const [newTotalUnits, setNewTotalUnits] = useState('');
  const [newAvailableUnits, setNewAvailableUnits] = useState('');
  const [newReraRegId, setNewReraRegId] = useState('');
  const [newCompletionDate, setNewCompletionDate] = useState('');

  // Edit Listing State
  const [editingListingId, setEditingListingId] = useState<string | null>(null);
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editPropertyType, setEditPropertyType] = useState(DEFAULT_NEW_PROPERTY_TYPE);
  const [editPriceRange, setEditPriceRange] = useState('');
  const [editPricePerSqft, setEditPricePerSqft] = useState('');
  const [editTotalUnits, setEditTotalUnits] = useState('');
  const [editAvailableUnits, setEditAvailableUnits] = useState('');
  const [editReraRegId, setEditReraRegId] = useState('');

  // Leads & Unlocks State
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [unlocks, setUnlocks] = useState<UnlockHistoryItem[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [leadViewFilter, setLeadViewFilter] = useState<'ALL' | 'UNLOCKED'>('ALL');

  // Lead Unlock Confirmation Modal State
  const [confirmUnlockLead, setConfirmUnlockLead] = useState<LeadItem | null>(null);
  const [unlockingInProgress, setUnlockingInProgress] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  // Business Profile State
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [organization, setOrganization] = useState(currentUser.organization || '');
  const [reraNumber, setReraNumber] = useState(currentUser.reraNumber || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);

  // Lifecycle State Change In Progress
  const [stateChangeInProgressId, setStateChangeInProgressId] = useState<string | null>(null);

  // 1. Fetch Diagnostics
  const fetchDiagnostics = useCallback(async () => {
    setLoadingDiagnostics(true);
    setDiagnosticsError('');
    try {
      const res = await fetch('/api/developer/status');
      const data = await res.json();
      if (!res.ok && res.status !== 503) {
        throw new Error(data.error || 'Diagnostics unavailable');
      }
      setReport(data);
    } catch (err: any) {
      setDiagnosticsError(err.message || 'Could not load platform diagnostics');
    } finally {
      setLoadingDiagnostics(false);
    }
  }, []);

  // 2. Fetch Owned Listings
  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    setListingsError(null);
    try {
      const res = await fetch('/api/me/listings');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load listings');
      setListings(Array.isArray(data.listings) ? data.listings : []);
    } catch (err: any) {
      setListingsError(err.message || 'Could not load owned listings');
    } finally {
      setLoadingListings(false);
    }
  }, []);

  // 3. Fetch Leads and Unlocks
  const fetchLeadsAndUnlocks = useCallback(async () => {
    setLoadingLeads(true);
    setLeadsError(null);
    try {
      const [leadsRes, unlocksRes] = await Promise.all([
        fetch('/api/leads'),
        fetch('/api/me/unlocks')
      ]);

      if (leadsRes.ok) {
        const leadsData = await leadsRes.json();
        setLeads(Array.isArray(leadsData.leads) ? leadsData.leads : []);
      } else {
        const err = await leadsRes.json().catch(() => ({}));
        throw new Error(err.error || 'Could not load buyer leads');
      }

      if (unlocksRes.ok) {
        const unlocksData = await unlocksRes.json();
        setUnlocks(Array.isArray(unlocksData.unlocks) ? unlocksData.unlocks : []);
      }
    } catch (err: any) {
      setLeadsError(err.message || 'Failed to load leads or unlock history');
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  // 4. Fetch Professional Profile
  const fetchProfile = useCallback(async () => {
    setLoadingProfile(true);
    setProfileError(null);
    try {
      const res = await fetch('/api/professional/profile');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load professional profile');
      setProfile(data.profile || null);
      if (data.profile) {
        setOrganization(data.profile.organization || currentUser.organization || '');
        setReraNumber(data.profile.rera_number || currentUser.reraNumber || '');
      }
    } catch (err: any) {
      setProfileError(err.message || 'Could not load business profile');
    } finally {
      setLoadingProfile(false);
    }
  }, [currentUser.organization, currentUser.reraNumber]);

  // Initial Load
  useEffect(() => {
    fetchDiagnostics();
    fetchListings();
    fetchLeadsAndUnlocks();
    fetchProfile();
  }, [fetchDiagnostics, fetchListings, fetchLeadsAndUnlocks, fetchProfile]);

  // Create Listing Handler
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setListingFormError(null);
    setSubmittingListing(true);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          location: newLocation.trim(),
          microMarket: newLocation.trim(),
          propertyType: newPropertyType,
          priceRange: newPriceRange.trim(),
          pricePerSqft: newPricePerSqft ? Number(newPricePerSqft) : 0,
          totalUnits: newTotalUnits ? Number(newTotalUnits) : 0,
          availableUnits: newAvailableUnits ? Number(newAvailableUnits) : 0,
          developerName: organization || currentUser.name,
          reraRegId: newReraRegId.trim(),
          completionDate: newCompletionDate.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create listing');

      showToast('Project listing created! Submitted for publication approval.');
      setNewTitle('');
      setNewLocation('');
      setNewPriceRange('');
      setNewPricePerSqft('');
      setNewTotalUnits('');
      setNewAvailableUnits('');
      setNewReraRegId('');
      setNewCompletionDate('');
      setShowNewListingForm(false);
      fetchListings();
    } catch (err: any) {
      setListingFormError(err.message || 'Failed to submit listing');
    } finally {
      setSubmittingListing(false);
    }
  };

  // Change Listing State (PAUSED, ARCHIVED, PENDING)
  const handleStateChange = async (listingId: string, newState: 'PAUSED' | 'ARCHIVED' | 'PENDING') => {
    setStateChangeInProgressId(listingId);
    try {
      const res = await fetch(`/api/properties/${listingId}/state`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newState })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Could not set state to ${newState}`);

      showToast(`Listing updated to ${newState}`);
      fetchListings();
    } catch (err: any) {
      showToast(err.message || 'State change failed');
    } finally {
      setStateChangeInProgressId(null);
    }
  };

  // Start Editing Listing
  const startEditing = (listing: ListingItem) => {
    setEditingListingId(listing.id);
    setEditTitle(listing.title || '');
    setEditLocation(listing.location || listing.microMarket || '');
    setEditPropertyType(listing.propertyType || DEFAULT_NEW_PROPERTY_TYPE);
    setEditPriceRange(listing.priceRange || '');
    setEditPricePerSqft(listing.pricePerSqft ? String(listing.pricePerSqft) : '');
    setEditTotalUnits(listing.totalUnits ? String(listing.totalUnits) : '');
    setEditAvailableUnits(listing.availableUnits ? String(listing.availableUnits) : '');
    setEditReraRegId(listing.reraRegId || '');
    setEditError(null);
  };

  // Submit Listing Edit (returns to PENDING)
  const handleUpdateListing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingListingId) return;

    setEditError(null);
    setSubmittingEdit(true);

    try {
      const res = await fetch(`/api/properties/${editingListingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          location: editLocation.trim(),
          microMarket: editLocation.trim(),
          propertyType: editPropertyType,
          priceRange: editPriceRange.trim(),
          pricePerSqft: editPricePerSqft ? Number(editPricePerSqft) : 0,
          totalUnits: editTotalUnits ? Number(editTotalUnits) : 0,
          availableUnits: editAvailableUnits ? Number(editAvailableUnits) : 0,
          reraRegId: editReraRegId.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update listing');

      showToast(data.notice || 'Listing updated. Returned to pending review.');
      setEditingListingId(null);
      fetchListings();
    } catch (err: any) {
      setEditError(err.message || 'Update failed');
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Perform Lead Unlock
  const handleUnlockLead = async () => {
    if (!confirmUnlockLead) return;
    setUnlockError(null);
    setUnlockingInProgress(true);

    const idempotencyKey = crypto.randomUUID();

    try {
      const res = await fetch(`/api/leads/${confirmUnlockLead.id}/unlock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey
        },
        body: JSON.stringify({ idempotencyKey })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Lead unlock failed.');
      }

      showToast(data.charged > 0 ? `Lead unlocked! ₹${data.charged} debited.` : 'Lead contact details unlocked.');
      setConfirmUnlockLead(null);
      await Promise.all([
        fetchLeadsAndUnlocks(),
        refreshSession()
      ]);
    } catch (err: any) {
      setUnlockError(err.message || 'Unlock was not approved by server.');
    } finally {
      setUnlockingInProgress(false);
    }
  };

  // Submit Business Profile Verification
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileNotice(null);
    setProfileError(null);
    setSavingProfile(true);

    try {
      const res = await fetch('/api/professional/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: organization.trim(),
          reraNumber: reraNumber.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit profile');

      setProfile(data.profile);
      setProfileNotice(data.notice || 'Profile submitted for review.');
      showToast('Profile verification submitted.');
      await refreshSession();
    } catch (err: any) {
      setProfileError(err.message || 'Profile save failed.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Derived Counts
  const approvedListingsCount = listings.filter(l => l.publicationStatus === 'APPROVED').length;
  const pendingListingsCount = listings.filter(l => l.publicationStatus === 'PENDING').length;
  const pausedListingsCount = listings.filter(l => l.publicationStatus === 'PAUSED' || l.publicationStatus === 'ARCHIVED').length;
  const unlockedLeadsCount = leads.filter(l => l.revealed || l.isUnlocked).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Workspace Header Card */}
      <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start sm:items-center gap-4 sm:gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
              <Building2 className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black font-display text-white">
                  {organization || currentUser.organization || currentUser.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  <ShieldCheck className="w-3 h-3" />
                  Developer Workspace
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span>Account: {currentUser.name} ({currentUser.email})</span>
              </p>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                <span>
                  Verification Status:{' '}
                  <strong
                    className={
                      profile?.verification_status === 'VERIFIED'
                        ? 'text-emerald-400 font-bold'
                        : profile?.verification_status === 'REJECTED'
                        ? 'text-red-400 font-bold'
                        : 'text-amber-400 font-bold'
                    }
                  >
                    {profile?.verification_status || 'NOT_SUBMITTED'}
                  </strong>
                </span>
                {profile?.rera_number && (
                  <span className="text-slate-400">RERA: {profile.rera_number}</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Wallet / Super Admin Shortcut */}
          <div className="flex items-center gap-3 self-start md:self-center">
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-2xl px-4 py-3 text-center min-w-[120px]">
              <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-semibold">
                Wallet Balance
              </span>
              <span className="text-lg font-black text-amber-400 font-mono-numbers">
                ₹{walletBalance.toLocaleString('en-IN')}
              </span>
            </div>

            <button
              onClick={() => setActiveView('ADMIN')}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer whitespace-nowrap"
              title="Open Super Admin Platform Command Center"
            >
              Super Admin Console
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar gap-2 sm:gap-4">
        <button
          onClick={() => setActiveTab('PORTFOLIO')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'PORTFOLIO'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Building className="w-4 h-4 text-amber-600" />
          <span>Portfolio & Listings</span>
          {listings.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
              {listings.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('LEADS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'LEADS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Unlock className="w-4 h-4 text-amber-600" />
          <span>Buyer Leads & Unlocks</span>
          {leads.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 font-bold">
              {leads.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('PROFILE')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'PROFILE'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          <span>Business Profile & RERA</span>
        </button>

        <button
          onClick={() => setActiveTab('DIAGNOSTICS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'DIAGNOSTICS'
              ? 'border-amber-500 text-amber-800 bg-amber-50/50 rounded-t-xl'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Activity className="w-4 h-4 text-amber-600" />
          <span>Platform Diagnostics</span>
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: PORTFOLIO & LISTINGS */}
      {/* ============================================================== */}
      {activeTab === 'PORTFOLIO' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                Total Listings
              </span>
              <p className="text-2xl font-black text-slate-900 font-mono-numbers mt-1">
                {loadingListings ? '…' : listings.length}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Projects in portfolio</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-700 block">
                Approved & Live
              </span>
              <p className="text-2xl font-black text-emerald-700 font-mono-numbers mt-1">
                {loadingListings ? '…' : approvedListingsCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Visible to buyers</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-700 block">
                Under Review
              </span>
              <p className="text-2xl font-black text-amber-700 font-mono-numbers mt-1">
                {loadingListings ? '…' : pendingListingsCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Awaiting publication</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-600 block">
                Paused / Archived
              </span>
              <p className="text-2xl font-black text-slate-700 font-mono-numbers mt-1">
                {loadingListings ? '…' : pausedListingsCount}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">Hidden by developer</p>
            </div>
          </div>

          {/* Section Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Project Portfolio Management</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Manage your projects. Editing an approved listing automatically returns it to pending review.
              </p>
            </div>
            <button
              onClick={() => {
                setShowNewListingForm(!showNewListingForm);
                setEditingListingId(null);
              }}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 self-start cursor-pointer shadow-sm transition-all"
            >
              {showNewListingForm ? (
                <>
                  <X className="w-4 h-4 text-amber-400" />
                  <span>Cancel</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Add New Project</span>
                </>
              )}
            </button>
          </div>

          {/* New Listing Form */}
          {showNewListingForm && (
            <div className="bg-white border-2 border-amber-500/40 rounded-2xl p-6 shadow-md animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center gap-2 mb-4 text-amber-800">
                <Sparkles className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold">Register New Project Listing</h3>
              </div>

              {listingFormError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{listingFormError}</span>
                </div>
              )}

              <form onSubmit={handleCreateListing} className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Title */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Project Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="e.g. Prestige High Fields, Kokapet Sky Villas"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  {/* Property Type from Catalog */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Property Category <span className="text-red-500">*</span>
                    </label>
                    <PropertyCategorySelect
                      ariaLabel="Select property type"
                      value={newPropertyType}
                      onChange={setNewPropertyType}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Location / Micro-market */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Location / Micro-Market <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newLocation}
                      onChange={e => setNewLocation(e.target.value)}
                      placeholder="e.g. Kokapet, Financial District, Neopolis"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  {/* Price Range */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price Range</label>
                    <input
                      type="text"
                      value={newPriceRange}
                      onChange={e => setNewPriceRange(e.target.value)}
                      placeholder="e.g. ₹1.8 Cr – ₹3.5 Cr"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Price Per Sq.ft. */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price per Sq.ft. (₹)</label>
                    <input
                      type="number"
                      value={newPricePerSqft}
                      onChange={e => setNewPricePerSqft(e.target.value)}
                      placeholder="e.g. 8500"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Total Units */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Units</label>
                    <input
                      type="number"
                      value={newTotalUnits}
                      onChange={e => setNewTotalUnits(e.target.value)}
                      placeholder="e.g. 250"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Available Units */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Available Units</label>
                    <input
                      type="number"
                      value={newAvailableUnits}
                      onChange={e => setNewAvailableUnits(e.target.value)}
                      placeholder="e.g. 45"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* RERA Registration */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RERA Registration ID</label>
                    <input
                      type="text"
                      value={newReraRegId}
                      onChange={e => setNewReraRegId(e.target.value)}
                      placeholder="e.g. P02400001234"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Completion Date */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estimated Handover</label>
                    <input
                      type="text"
                      value={newCompletionDate}
                      onChange={e => setNewCompletionDate(e.target.value)}
                      placeholder="e.g. December 2027"
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                  <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                  <span>
                    <strong>Publication Policy:</strong> Newly submitted listings enter <strong>PENDING</strong> review.
                    A Super Admin must approve the project before it appears in public search or buyer catalogs.
                  </span>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowNewListingForm(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingListing}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {submittingListing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Create & Submit for Review</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Edit Listing Modal / Form */}
          {editingListingId && (
            <div className="bg-white border-2 border-slate-900 rounded-2xl p-6 shadow-xl animate-in slide-in-from-top-3 duration-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <h3 className="text-sm font-bold text-slate-900">Edit Project Listing</h3>
                </div>
                <button
                  onClick={() => setEditingListingId(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="p-3 mb-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
                <span>
                  <strong>Important Notice:</strong> Saving edits to this listing will automatically reset its
                  publication status to <strong>PENDING</strong> review. It will require administrator re-approval
                  before appearing live again.
                </span>
              </div>

              <form onSubmit={handleUpdateListing} className="space-y-4">
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 mb-1">Project Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Property Category</label>
                    <PropertyCategorySelect
                      ariaLabel="Edit property type"
                      value={editPropertyType}
                      onChange={setEditPropertyType}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                    <input
                      type="text"
                      value={editLocation}
                      onChange={e => setEditLocation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price Range</label>
                    <input
                      type="text"
                      value={editPriceRange}
                      onChange={e => setNewPriceRange(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Price per Sq.ft. (₹)</label>
                    <input
                      type="number"
                      value={editPricePerSqft}
                      onChange={e => setEditPricePerSqft(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Total Units</label>
                    <input
                      type="number"
                      value={editTotalUnits}
                      onChange={e => setEditTotalUnits(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Available Units</label>
                    <input
                      type="number"
                      value={editAvailableUnits}
                      onChange={e => setEditAvailableUnits(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">RERA Registration ID</label>
                    <input
                      type="text"
                      value={editReraRegId}
                      onChange={e => setEditReraRegId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingListingId(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submittingEdit}
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {submittingEdit ? 'Saving & Resubmitting...' : 'Save Changes & Resubmit'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Listings Error State */}
          {listingsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
              <span>{listingsError}</span>
              <button
                onClick={fetchListings}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Listings List */}
          {loadingListings ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-28 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Building className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Projects in Portfolio</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Submit your first residential or commercial development to begin receiving matched buyer leads and verified reviews.
              </p>
              <button
                onClick={() => setShowNewListingForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Add Your First Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {listings.map(item => {
                const isApproved = item.publicationStatus === 'APPROVED';
                const isPending = item.publicationStatus === 'PENDING';
                const isRejected = item.publicationStatus === 'REJECTED';
                const isPaused = item.publicationStatus === 'PAUSED';
                const isArchived = item.publicationStatus === 'ARCHIVED';

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                          {item.reraRegId && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                              RERA: {item.reraRegId}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          {item.propertyType && (
                            <span className="font-semibold text-slate-700">{item.propertyType}</span>
                          )}
                          {item.location && (
                            <span className="flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              {item.location}
                            </span>
                          )}
                          {item.priceRange && (
                            <span className="font-mono-numbers font-semibold text-amber-800">
                              {item.priceRange}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Separate Status Badges: Approval Status vs Lifecycle State */}
                      <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                        {/* Approval Status Badge */}
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : isPending
                              ? 'bg-amber-100 text-amber-800'
                              : isRejected
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {isApproved && <CheckCircle2 className="w-3 h-3" />}
                          {isPending && <Clock className="w-3 h-3" />}
                          {isRejected && <AlertCircle className="w-3 h-3" />}
                          <span>
                            {isApproved
                              ? 'Approved & Live'
                              : isPending
                              ? 'Pending Review'
                              : isRejected
                              ? 'Approval Rejected'
                              : 'Review Needed'}
                          </span>
                        </span>

                        {/* Lifecycle State Badge */}
                        {(isPaused || isArchived) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800">
                            {isPaused ? <Pause className="w-3 h-3" /> : <Archive className="w-3 h-3" />}
                            <span>{isPaused ? 'Paused by Owner' : 'Archived'}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rejection Feedback if any */}
                    {isRejected && item.rejectionReason && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
                        <div>
                          <strong className="block font-bold">Admin Rejection Feedback:</strong>
                          <span>{item.rejectionReason}</span>
                        </div>
                      </div>
                    )}

                    {/* Operational Details & Lifecycle Controls */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 text-xs">
                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500">
                        <span>Units: {item.availableUnits ?? 0} available of {item.totalUnits ?? 0}</span>
                        <span>ID: {item.id}</span>
                        <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {/* Edit Button */}
                        <button
                          onClick={() => startEditing(item)}
                          className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        {/* Pause / Resume Controls */}
                        {isPaused ? (
                          <button
                            onClick={() => handleStateChange(item.id, 'PENDING')}
                            disabled={stateChangeInProgressId === item.id}
                            className="px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Play className="w-3.5 h-3.5" />
                            <span>Resume</span>
                          </button>
                        ) : !isArchived ? (
                          <button
                            onClick={() => handleStateChange(item.id, 'PAUSED')}
                            disabled={stateChangeInProgressId === item.id}
                            className="px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Pause className="w-3.5 h-3.5" />
                            <span>Pause</span>
                          </button>
                        ) : null}

                        {/* Archive Control */}
                        {!isArchived && (
                          <button
                            onClick={() => handleStateChange(item.id, 'ARCHIVED')}
                            disabled={stateChangeInProgressId === item.id}
                            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
                          >
                            <Archive className="w-3.5 h-3.5" />
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: BUYER LEADS & UNLOCKS */}
      {/* ============================================================== */}
      {activeTab === 'LEADS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Buyer Leads & High-Intent Enquiries</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Contact information is revealed only upon explicit wallet authorization, protecting buyer privacy.
              </p>
            </div>
            {/* View Filter Pill */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start text-xs font-bold">
              <button
                onClick={() => setLeadViewFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  leadViewFilter === 'ALL'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Enquiries ({leads.length})
              </button>
              <button
                onClick={() => setLeadViewFilter('UNLOCKED')}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  leadViewFilter === 'UNLOCKED'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Unlocked Contacts ({unlockedLeadsCount})
              </button>
            </div>
          </div>

          {leadsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
              <span>{leadsError}</span>
              <button
                onClick={fetchLeadsAndUnlocks}
                className="underline font-bold hover:text-red-900 cursor-pointer"
              >
                Retry
              </button>
            </div>
          )}

          {/* Leads Grid */}
          {loadingLeads ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-white border border-slate-200 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-10 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                <Unlock className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">No Buyer Leads Available</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                When property seekers submit enquiries on your projects or catalog types, they will appear here with sanitised privacy protections.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {leads
                .filter(lead => leadViewFilter === 'ALL' || (lead.revealed || lead.isUnlocked))
                .map(lead => {
                  const isUnlocked = Boolean(lead.revealed || lead.isUnlocked);
                  const price = lead.priceCredits || 300;

                  return (
                    <div
                      key={lead.id}
                      className={`p-5 rounded-2xl border transition-all space-y-3 ${
                        isUnlocked
                          ? 'bg-white border-emerald-200 shadow-sm'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-slate-900">{lead.seekerName}</h3>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                              {lead.tier}
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            {lead.microMarket && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {lead.microMarket}
                              </span>
                            )}
                            {lead.propertyType && (
                              <span className="font-semibold text-slate-700">{lead.propertyType}</span>
                            )}
                            <span className="font-bold text-amber-800">Budget: {lead.budget}</span>
                          </div>
                        </div>

                        {/* Unlock Status / Action Button */}
                        <div>
                          {isUnlocked ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                              <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Unlocked</span>
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                setConfirmUnlockLead(lead);
                                setUnlockError(null);
                              }}
                              className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              <span>Unlock Contact (₹{price})</span>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Contact Info (Revealed vs Masked) */}
                      <div className="grid sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-slate-700">
                            {isUnlocked ? (
                              <a href={`tel:${lead.seekerPhone}`} className="text-amber-800 font-bold hover:underline">
                                {lead.seekerPhone}
                              </a>
                            ) : (
                              lead.seekerPhone
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-700 truncate">
                            {isUnlocked && lead.seekerEmail ? (
                              <a href={`mailto:${lead.seekerEmail}`} className="text-amber-800 font-bold hover:underline">
                                {lead.seekerEmail}
                              </a>
                            ) : (
                              lead.seekerEmail || 'Masked for privacy'
                            )}
                          </span>
                        </div>
                      </div>

                      {lead.requirements && (
                        <p className="text-xs text-slate-600 leading-relaxed">
                          <strong className="text-slate-800">Specific Requirements: </strong>
                          {lead.requirements}
                        </p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Lead Ref: {lead.id}</span>
                        <span>Received: {new Date(lead.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Unlock History Sub-Section */}
          {unlocks.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-600" />
                <span>Wallet Debit & Unlock Transaction History ({unlocks.length})</span>
              </h3>
              <div className="space-y-2">
                {unlocks.map(item => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100"
                  >
                    <div>
                      <span className="font-bold text-slate-800">Lead Unlock Ref: {item.lead_id}</span>
                      <span className="text-[11px] text-slate-500 block">
                        Idempotency Key: {item.idempotency_key}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-amber-800 block">₹{item.amount}</span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lead Unlock Confirmation Modal */}
          {confirmUnlockLead && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                    <Lock className="w-5 h-5 text-amber-600" />
                    <span>Confirm Lead Unlock</span>
                  </div>
                  <button
                    onClick={() => setConfirmUnlockLead(null)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <p>
                    You are about to unlock direct buyer contact details for{' '}
                    <strong className="text-slate-900">{confirmUnlockLead.seekerName}</strong> (
                    {confirmUnlockLead.propertyType} in {confirmUnlockLead.microMarket}).
                  </p>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-900">Unlock Fee:</span>
                      <span className="font-black text-amber-950 font-mono-numbers">
                        ₹{confirmUnlockLead.priceCredits || 300}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-amber-900">Your Current Wallet Balance:</span>
                      <span className="font-bold text-amber-950 font-mono-numbers">
                        ₹{walletBalance.toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    This transaction executes a real authoritative debit against your platform wallet.
                    Contact details will be permanently accessible in your unlocked leads view.
                  </p>
                </div>

                {unlockError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
                    {unlockError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setConfirmUnlockLead(null)}
                    disabled={unlockingInProgress}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleUnlockLead}
                    disabled={unlockingInProgress}
                    className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm"
                  >
                    {unlockingInProgress ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Authorizing Unlock...</span>
                      </>
                    ) : (
                      <>
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Confirm & Unlock (₹{confirmUnlockLead.priceCredits || 300})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: BUSINESS PROFILE & RERA */}
      {/* ============================================================== */}
      {activeTab === 'PROFILE' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Developer Profile & Verification</h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Statutory verification establishes builder credibility for property seekers and channel partners.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Verification Status Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Account Verification Status</span>
              </h3>

              <div className="p-4 rounded-xl border space-y-2 bg-slate-50 border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Status</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      profile?.verification_status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : profile?.verification_status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : profile?.verification_status === 'PENDING'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {profile?.verification_status === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                    {profile?.verification_status === 'PENDING' && <Clock className="w-3 h-3" />}
                    {profile?.verification_status === 'REJECTED' && <AlertCircle className="w-3 h-3" />}
                    <span>{profile?.verification_status || 'NOT SUBMITTED'}</span>
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed pt-1">
                  {profile?.verification_status === 'VERIFIED'
                    ? 'Your developer credentials have been verified by a Super Admin. Your verified badge is live.'
                    : profile?.verification_status === 'PENDING'
                    ? 'Your documentation has been received. Status remains pending until a Super Admin approves your statutory RERA documents.'
                    : profile?.verification_status === 'REJECTED'
                    ? 'Verification was rejected. Please review feedback and resubmit valid credentials.'
                    : 'Submit your organization and RERA documentation to start the verification review.'}
                </p>

                {profile?.rejection_reason && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                    <strong>Moderator Feedback: </strong>
                    {profile.rejection_reason}
                  </div>
                )}
              </div>

              <div className="text-[11px] text-slate-500 space-y-1">
                <p><strong>RERA Verification Policy:</strong> Entering a RERA registration number does not automatically grant a verified badge. All credentials must be cross-verified against official state registries.</p>
              </div>
            </div>

            {/* Profile Update Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-600" />
                <span>Organization & Statutory Details</span>
              </h3>

              {profileNotice && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileNotice}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Organization / Developer Company Name
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={e => setOrganization(e.target.value)}
                    placeholder="e.g. Prestige Estates Projects Ltd."
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    State RERA Promoter Registration Number
                  </label>
                  <input
                    type="text"
                    value={reraNumber}
                    onChange={e => setReraNumber(e.target.value)}
                    placeholder="e.g. PRM/KA/RERA/1251/310/PR/170915/000234"
                    className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Optional at profile draft stage; mandatory for accredited badge.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={savingProfile}
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {savingProfile ? 'Submitting for Review...' : 'Submit / Update Profile Credentials'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: PLATFORM DIAGNOSTICS */}
      {/* ============================================================== */}
      {activeTab === 'DIAGNOSTICS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-mono uppercase tracking-widest text-amber-700">Developer Console</p>
              <h2 className="text-lg font-bold text-slate-900">Platform Diagnostics & Service Health</h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Technical database connectivity, schema readiness, and integration statuses.
              </p>
            </div>
            <button
              onClick={fetchDiagnostics}
              disabled={loadingDiagnostics}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 self-start cursor-pointer shadow-sm transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDiagnostics ? 'animate-spin' : ''}`} />
              <span>Refresh Status</span>
            </button>
          </div>

          {diagnosticsError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
              {diagnosticsError}
            </div>
          )}

          <div className="grid md:grid-cols-3 gap-4">
            {/* Database Diagnostics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Database className="w-5 h-5 text-slate-700" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Database</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {report?.authoritativeDatabase || 'Checking…'}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Connected:{' '}
                  <strong className={report?.database?.connected ? 'text-emerald-700' : 'text-red-700'}>
                    {String(report?.database?.connected ?? '…')}
                  </strong>
                </p>
                <p className="text-xs text-slate-600">
                  Schema ready:{' '}
                  <strong className={report?.database?.schemaReady ? 'text-emerald-700' : 'text-amber-700'}>
                    {String(report?.database?.schemaReady ?? '…')}
                  </strong>
                </p>
              </div>
            </div>

            {/* Payments Diagnostics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <Activity className="w-5 h-5 text-slate-700" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Payments</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {report?.payments || report?.integrations?.payments || '…'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Payment provider is currently unconfigured.
                </p>
              </div>
            </div>

            {/* MongoDB Diagnostics */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <ShieldCheck className="w-5 h-5 text-slate-700" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">MongoDB</span>
              </div>
              <div>
                <p className="font-bold text-slate-900 text-sm">
                  {report?.integrations?.mongodb || 'NOT_USED'}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Architecture uses PostgreSQL & SQLite.
                </p>
              </div>
            </div>
          </div>

          {Array.isArray(report?.database?.missingTables) && report.database.missingTables.length > 0 && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-700 mt-0.5" />
              <span>
                Missing tables: <strong>{report.database.missingTables.join(', ')}</strong>. Run{' '}
                <code className="bg-amber-100 px-1 py-0.5 rounded font-mono text-amber-950 font-bold">npm run db:init</code>{' '}
                before serving production traffic.
              </span>
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={() => setActiveView('ADMIN')}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
            >
              Open platform administration
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
