import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, Building2, MapPin, Users, Home } from 'lucide-react';

type Listing = { id: string; title: string; category?: string };
type PublicReview = { id: string; rating: number; body: string; authorName: string; createdAt: string };
type OwnReview = PublicReview & { status: string; rejectionReason: string };

type ReviewTab = 'ALL' | 'SOCIETY_PROJECT' | 'COLONY' | 'LOCALITY' | 'STAKEHOLDERS';

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

  useEffect(() => {
    fetch('/api/properties')
      .then(response => response.json())
      .then(data => {
        const rows = Array.isArray(data.properties) ? data.properties : [];
        const formatted = rows.map((item: any, idx: number) => {
          let cat = 'SOCIETY_PROJECT';
          if (idx % 4 === 1) cat = 'COLONY';
          else if (idx % 4 === 2) cat = 'LOCALITY';
          else if (idx % 4 === 3) cat = 'STAKEHOLDERS';
          return {
            id: item.id,
            title: item.title || 'Project',
            category: cat
          };
        });
        setListings(formatted);
        if (formatted[0]?.id) setListingId(formatted[0].id);
      })
      .catch(() => setError('Approved projects could not be loaded.'))
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

  const tabs: { key: ReviewTab; label: string; icon: any }[] = [
    { key: 'ALL', label: 'All Reviews', icon: Star },
    { key: 'SOCIETY_PROJECT', label: 'Society / Project', icon: Building2 },
    { key: 'COLONY', label: 'Colony', icon: Home },
    { key: 'LOCALITY', label: 'Locality', icon: MapPin },
    { key: 'STAKEHOLDERS', label: 'Stakeholders', icon: Users }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">Review & Rating Engine</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Performance Index & Reviews</h1>
        <p className="text-sm text-slate-600">
          Transparent, multi-dimensional rating and review framework evaluating builders, societies, localities, and real estate professionals.
        </p>
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
      {!loadingListings && listings.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">No approved entities are available to review yet.</p>
      ) : null}

      {filteredListings.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
          <div>
            <label htmlFor="review-project" className="block text-xs font-bold text-slate-700 mb-1">
              Select {activeTab === 'COLONY' ? 'Colony' : activeTab === 'LOCALITY' ? 'Locality' : activeTab === 'STAKEHOLDERS' ? 'Stakeholder / Developer' : 'Project / Society'} to Review
            </label>
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
      ) : null}
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
};
