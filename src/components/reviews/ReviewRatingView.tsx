import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, Building2, MapPin, Users, Home, Plus, X, Check, ShieldCheck, Sparkles } from 'lucide-react';

type Listing = { id: string; title: string; category?: string };
type PublicReview = { id: string; rating: number; body: string; authorName: string; createdAt: string };
type OwnReview = PublicReview & { status: string; rejectionReason: string };

type ReviewTab = 'ALL' | 'SOCIETY_PROJECT' | 'COLONY' | 'LOCALITY' | 'STAKEHOLDERS';

const DEFAULT_REVIEW_ENTITIES: Listing[] = [
  // Society / Project
  { id: 'entity_proj_aparna_zenon', title: 'Aparna Zenon (Puppalaguda - Financial District)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_myhome_bhooja', title: 'My Home Bhooja (HITEC City - Knowledge City)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_jayabheri_the_peak', title: 'Jayabheri The Peak (Financial District)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_rajapushpa_provincia', title: 'Rajapushpa Provincia (Narsingi - Outer Ring Road)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_candeur_skyline', title: 'Candeur Skyline (Financial District)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_sas_crown', title: 'SAS Crown (Kokapet Golden Mile)', category: 'SOCIETY_PROJECT' },
  { id: 'entity_proj_prestige_tranquil', title: 'Prestige Tranquil (Kokapet)', category: 'SOCIETY_PROJECT' },

  // Colony
  { id: 'entity_colony_jubilee_officers', title: 'Jubilee Hills Officers Colony (Road No. 36)', category: 'COLONY' },
  { id: 'entity_colony_banjara_rd12', title: 'Banjara Hills Road No. 12 Colony', category: 'COLONY' },
  { id: 'entity_colony_madhapur_silicon', title: 'Madhapur Silicon Valley Colony', category: 'COLONY' },
  { id: 'entity_colony_gachibowli_telecom', title: 'Gachibowli Telecom Nagar Colony', category: 'COLONY' },
  { id: 'entity_colony_kondapur_raghavendra', title: 'Kondapur Raghavendra Colony', category: 'COLONY' },
  { id: 'entity_colony_manikonda_green', title: 'Manikonda Puppalguda Green Valley', category: 'COLONY' },

  // Locality
  { id: 'entity_loc_kokapet_neopolis', title: 'Kokapet & Neopolis High-Rise Corridor', category: 'LOCALITY' },
  { id: 'entity_loc_financial_district', title: 'Financial District & Nanakramguda', category: 'LOCALITY' },
  { id: 'entity_loc_gachibowli_hitec', title: 'Gachibowli & HITEC City Corridor', category: 'LOCALITY' },
  { id: 'entity_loc_tellapur_kollur', title: 'Tellapur & Kollur Growth Corridor', category: 'LOCALITY' },
  { id: 'entity_loc_mokila_shankarpally', title: 'Mokila & Shankarpally Villa Zone', category: 'LOCALITY' },
  { id: 'entity_loc_puppalaguda_narsingi', title: 'Puppalaguda & Narsingi Junction', category: 'LOCALITY' },

  // Stakeholders
  { id: 'entity_stakeholder_swamy_reddy', title: 'Swamy Reddy Javidi (CEO & Property Studio Secretariat)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_aparna_constructions', title: 'Aparna Constructions & Estates (Master Builder & Developer)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_my_home_group', title: 'My Home Group (Infrastructure & Township Developer)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_rajapushpa', title: 'Rajapushpa Properties (Premium High-Rise Developer)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_ar_sanjay_kolli', title: 'Ar. Sanjay Kolli (Principal Architect & Urban Planner)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_adv_ramesh_rao', title: 'Adv. Ramesh Rao (RERA & High Court Legal Counsel)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_dr_priya_varma', title: 'Dr. Priya Varma (Commercial ROI & Market Analyst)', category: 'STAKEHOLDERS' },
  { id: 'entity_stakeholder_vikram_reddy', title: 'Vikram Reddy (Neopolis High-Rise Consultant)', category: 'STAKEHOLDERS' }
];

export const ReviewRatingView: React.FC<{ onOpenLoginModal?: () => void }> = ({ onOpenLoginModal }) => {
  const { isLoggedIn, currentUser, showToast } = useApp();
  const [activeTab, setActiveTab] = useState<ReviewTab>('ALL');
  const [listings, setListings] = useState<Listing[]>([]);
  const [listingId, setListingId] = useState('');
  const [loadingListings, setLoadingListings] = useState(true);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<{ count: number; average: number | null }>({ count: 0, average: null });
  const [mine, setMine] = useState<OwnReview | null>(null);
  const [moderation, setModeration] = useState<OwnReview[]>([]);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Modal to Add Society/Project, Colony, Locality, or Stakeholder
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEntityType, setNewEntityType] = useState<'SOCIETY_PROJECT' | 'COLONY' | 'LOCALITY' | 'STAKEHOLDERS'>('SOCIETY_PROJECT');
  const [newEntityName, setNewEntityName] = useState('');
  const [newEntityRole, setNewEntityRole] = useState('Builder / Developer');
  const [newEntityLocation, setNewEntityLocation] = useState('Hyderabad');

  useEffect(() => {
    let customEntities: Listing[] = [];
    try {
      customEntities = JSON.parse(localStorage.getItem('ps_custom_review_entities') || '[]');
    } catch {}

    fetch('/api/properties')
      .then(response => response.json())
      .then(data => {
        const rows = Array.isArray(data.properties) ? data.properties : [];
        const formatted = rows.map((item: any) => ({
          id: item.id,
          title: item.title || 'Project',
          category: 'SOCIETY_PROJECT'
        }));

        const combined = [...customEntities, ...formatted, ...DEFAULT_REVIEW_ENTITIES];
        const unique = combined.filter((item, index, self) =>
          index === self.findIndex(t => t.id === item.id || t.title.toLowerCase().trim() === item.title.toLowerCase().trim())
        );
        setListings(unique);
        if (unique[0]?.id) setListingId(unique[0].id);
      })
      .catch(() => {
        const fallback = [...customEntities, ...DEFAULT_REVIEW_ENTITIES];
        setListings(fallback);
        if (fallback[0]?.id) setListingId(fallback[0].id);
      })
      .finally(() => setLoadingListings(false));
  }, []);

  const filteredListings = useMemo(() => {
    if (activeTab === 'ALL') return listings;
    return listings.filter(l => l.category === activeTab);
  }, [listings, activeTab]);

  useEffect(() => {
    if (filteredListings.length > 0 && !filteredListings.some(l => l.id === listingId)) {
      setListingId(filteredListings[0].id);
    }
  }, [activeTab, filteredListings]);

  const loadReviews = (id: string) => {
    if (!id) return;
    setLoadingReviews(true);
    setError('');
    fetch(`/api/reviews?entityType=LISTING&entityId=${encodeURIComponent(id)}`)
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Reviews could not be loaded.');
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setSummary(data.summary || { count: 0, average: null });
        setMine(data.mine || null);
        setModeration(Array.isArray(data.moderation) ? data.moderation : []);
        if (data.mine && data.mine.status !== 'REMOVED') {
          setRating(data.mine.rating);
          setBody(data.mine.body);
        }
      })
      .catch(err => setError(err.message || 'Reviews could not be loaded.'))
      .finally(() => setLoadingReviews(false));
  };

  useEffect(() => {
    if (listingId) loadReviews(listingId);
  }, [listingId, isLoggedIn]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!isLoggedIn) {
      onOpenLoginModal?.();
      return;
    }
    setSaving(true);
    try {
      const editing = Boolean(mine && mine.status !== 'REMOVED');
      const response = await fetch(editing ? `/api/reviews/${mine!.id}` : '/api/reviews', {
        method: editing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing ? { rating, body } : { entityType: 'LISTING', entityId: listingId, rating, body })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'The review was not saved.');
      showToast(editing ? 'Review updated and returned for approval' : 'Review submitted for approval');
      loadReviews(listingId);
    } catch (err: any) {
      setError(err.message || 'The review was not saved.');
    } finally {
      setSaving(false);
    }
  };

  const moderate = async (reviewId: string, status: 'APPROVED' | 'REJECTED' | 'REMOVED') => {
    const response = await fetch(`/api/admin/reviews/${reviewId}/moderation`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || 'The review was not moderated.');
      return;
    }
    loadReviews(listingId);
  };

  const handleAddEntity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      onOpenLoginModal?.();
      return;
    }
    const name = newEntityName.trim();
    if (!name) return;

    let fullTitle = name;
    if (newEntityType === 'STAKEHOLDERS') {
      fullTitle = `${name} (${newEntityRole})`;
    } else if (newEntityLocation.trim()) {
      fullTitle = `${name} (${newEntityLocation.trim()})`;
    }

    const newId = `custom_entity_${Date.now()}`;
    const newEntry: Listing = {
      id: newId,
      title: fullTitle,
      category: newEntityType
    };

    setListings(prev => [newEntry, ...prev]);
    setActiveTab(newEntityType);
    setListingId(newId);

    try {
      const saved = JSON.parse(localStorage.getItem('ps_custom_review_entities') || '[]');
      saved.unshift(newEntry);
      localStorage.setItem('ps_custom_review_entities', JSON.stringify(saved));
    } catch {}

    showToast(`"${fullTitle}" added! You can now write a review & rating.`);
    setShowAddModal(false);
    setNewEntityName('');
  };

  const tabs: { key: ReviewTab; label: string; icon: any }[] = [
    { key: 'ALL', label: 'All Reviews', icon: Star },
    { key: 'SOCIETY_PROJECT', label: 'Society / Project', icon: Building2 },
    { key: 'COLONY', label: 'Colony', icon: Home },
    { key: 'LOCALITY', label: 'Locality', icon: MapPin },
    { key: 'STAKEHOLDERS', label: 'Stakeholders', icon: Users }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">Review & Rating Engine</p>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Performance Index & Reviews</h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Transparent, multi-dimensional rating and review framework evaluating builders, societies, localities, and real estate professionals.
          </p>
        </div>

        {/* Option to Add Entity: Available to End User, Admin, and Super Admin */}
        <button
          type="button"
          onClick={() => {
            if (!isLoggedIn) {
              onOpenLoginModal?.();
              return;
            }
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Entity to Review</span>
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-slate-200 gap-1 sm:gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {loadingListings ? <p className="text-sm text-slate-500">Loading entities…</p> : null}

      {filteredListings.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="review-project" className="block text-xs font-bold text-slate-700">
                Select {activeTab === 'COLONY' ? 'Colony' : activeTab === 'LOCALITY' ? 'Locality' : activeTab === 'STAKEHOLDERS' ? 'Stakeholder / Developer' : 'Project / Society'} to Review ({filteredListings.length})
              </label>
              <button
                type="button"
                onClick={() => {
                  if (!isLoggedIn) {
                    onOpenLoginModal?.();
                    return;
                  }
                  if (activeTab !== 'ALL') setNewEntityType(activeTab);
                  setShowAddModal(true);
                }}
                className="text-[11px] font-bold text-amber-700 hover:text-amber-800 hover:underline cursor-pointer"
              >
                + Add New Entity
              </button>
            </div>
            <select
              id="review-project"
              value={listingId}
              onChange={event => setListingId(event.target.value)}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              {filteredListings.map(listing => (
                <option key={listing.id} value={listing.id}>
                  {listing.title}
                </option>
              ))}
            </select>
          </div>

          {loadingReviews ? (
            <p className="text-sm text-slate-500">Loading reviews…</p>
          ) : (
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-xs font-bold text-slate-900">
                  {summary.count === 0 ? 'No approved reviews yet' : `${summary.average} / 5.0 Rating`}
                </span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                {summary.count} approved review{summary.count === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {reviews.length > 0 && (
            <div className="space-y-3 pt-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Verified Community Reviews</h3>
              {reviews.map(review => (
                <article key={review.id} className="border border-slate-100 rounded-2xl p-4 bg-slate-50/50 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{review.authorName}</span>
                    <span className="text-xs font-mono font-bold text-amber-700">★ {review.rating} / 5</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{review.body}</p>
                </article>
              ))}
            </div>
          )}

          {reviews.length === 0 && !loadingReviews && (
            <p className="text-xs text-slate-500 italic">No approved reviews yet. Be the first to share your experience!</p>
          )}

          {mine?.status === 'REMOVED' ? (
            <p className="text-xs text-slate-600 bg-red-50 p-3 rounded-xl border border-red-200">Your review was removed.</p>
          ) : (
            <form onSubmit={save} className="space-y-3 border-t border-slate-100 pt-4">
              <p className="text-xs font-bold text-slate-800">
                {mine ? `Your review status: ${mine.status}` : 'Write a Review & Rating'}
              </p>
              <div className="flex gap-1" role="group" aria-label="Rating from 1 to 5">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rating === value}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    onClick={() => setRating(value)}
                    className={`p-1 transition-transform hover:scale-110 cursor-pointer ${
                      value <= rating ? 'text-amber-500' : 'text-slate-300'
                    }`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
              <label htmlFor="review-body" className="sr-only">Review</label>
              <textarea
                id="review-body"
                required
                maxLength={500}
                rows={3}
                value={body}
                onChange={event => setBody(event.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="What should a future buyer or resident know about this entity? (e.g. Construction quality, amenities, management, water supply)..."
              />
              {!isLoggedIn ? (
                <p className="text-xs text-slate-500">Sign in to submit a review.</p>
              ) : null}
              <button
                type="submit"
                disabled={saving || !listingId}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold disabled:opacity-60 transition-colors cursor-pointer shadow-xs"
              >
                {saving ? 'Saving…' : mine ? 'Update Review' : 'Submit Review for Moderation'}
              </button>
            </form>
          )}

          {currentUser.role === 'SUPER_ADMIN' && moderation.length > 0 ? (
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-800">Waiting for Super Admin Moderation</h2>
              {moderation.map(review => (
                <div key={review.id} className="text-xs space-y-1.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{review.authorName} · {review.rating} / 5 · <span className="font-mono text-amber-800">{review.status}</span></p>
                  </div>
                  <p className="text-slate-700">{review.body}</p>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => moderate(review.id, 'APPROVED')} className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Approve</button>
                    <button type="button" onClick={() => moderate(review.id, 'REJECTED')} className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Reject</button>
                    <button type="button" onClick={() => moderate(review.id, 'REMOVED')} className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-[10px] font-bold cursor-pointer">Remove</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      )}
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}

      {/* Modal: Add Entity (Society/Project, Colony, Locality, Stakeholder) */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add Entity to Review</h3>
                  <p className="text-[11px] text-slate-500">Available to all members, admins & super admins</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddEntity} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Entity Type</label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { key: 'SOCIETY_PROJECT', label: 'Society / Project' },
                    { key: 'COLONY', label: 'Colony' },
                    { key: 'LOCALITY', label: 'Locality' },
                    { key: 'STAKEHOLDERS', label: 'Stakeholder' }
                  ].map(item => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setNewEntityType(item.key as any)}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        newEntityType === item.key
                          ? 'border-amber-500 bg-amber-50 text-amber-900'
                          : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {newEntityType === 'STAKEHOLDERS' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stakeholder Name *</label>
                    <input
                      type="text"
                      required
                      value={newEntityName}
                      onChange={e => setNewEntityName(e.target.value)}
                      placeholder="e.g. Ar. Rajesh Verma or ABC Constructions"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Stakeholder Role *</label>
                    <select
                      value={newEntityRole}
                      onChange={e => setNewEntityRole(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="Builder / Developer">Builder / Developer</option>
                      <option value="Principal Architect">Principal Architect</option>
                      <option value="RERA & Legal Counsel">RERA & Legal Counsel</option>
                      <option value="RERA Certified Agent">RERA Certified Agent</option>
                      <option value="Property Consultant">Property Consultant</option>
                      <option value="Structural Engineer">Structural Engineer</option>
                      <option value="Facility Manager">Facility Manager</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {newEntityType === 'COLONY' ? 'Colony Name' : newEntityType === 'LOCALITY' ? 'Locality Name' : 'Society / Project Name'} *
                    </label>
                    <input
                      type="text"
                      required
                      value={newEntityName}
                      onChange={e => setNewEntityName(e.target.value)}
                      placeholder={
                        newEntityType === 'COLONY'
                          ? 'e.g. Green Valley Officers Colony'
                          : newEntityType === 'LOCALITY'
                          ? 'e.g. Tellapur - Kollur Zone'
                          : 'e.g. My Home Sayuk'
                      }
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Area / Location</label>
                    <input
                      type="text"
                      value={newEntityLocation}
                      onChange={e => setNewEntityLocation(e.target.value)}
                      placeholder="e.g. Tellapur, Gachibowli, or Financial District"
                      className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newEntityName.trim()}
                  className="px-5 py-2 text-xs bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Add Entity & Rate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
