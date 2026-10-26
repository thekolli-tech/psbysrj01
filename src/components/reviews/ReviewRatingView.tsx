import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Star } from 'lucide-react';

type Listing = { id: string; title: string };
type PublicReview = { id: string; rating: number; body: string; authorName: string; createdAt: string };
type OwnReview = PublicReview & { status: string; rejectionReason: string };

export const ReviewRatingView: React.FC<{ onOpenLoginModal?: () => void }> = ({ onOpenLoginModal }) => {
  const { isLoggedIn, currentUser, showToast } = useApp();
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
        setListings(rows.map((item: any) => ({ id: item.id, title: item.title || 'Project' })));
        if (rows[0]?.id) setListingId(rows[0].id);
      })
      .catch(() => setError('Approved projects could not be loaded.'))
      .finally(() => setLoadingListings(false));
  }, []);

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

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="space-y-2">
        <p className="text-xs font-mono font-bold uppercase tracking-widest text-amber-700">Review & Rating</p>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">Project reviews</h1>
        <p className="text-sm text-slate-600">Approved project reviews are shown here. A new or edited review stays hidden until a Super Admin approves it. Stakeholder reviews are not available yet.</p>
      </div>

      {loadingListings ? <p className="text-sm text-slate-500">Loading approved projects…</p> : null}
      {!loadingListings && listings.length === 0 ? (
        <p className="text-sm text-slate-500 bg-white border border-slate-200 rounded-2xl p-4">No approved projects are available to review yet.</p>
      ) : null}

      {listings.length > 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4">
          <label htmlFor="review-project" className="block text-xs font-bold text-slate-700">Project</label>
          <select id="review-project" value={listingId} onChange={event => setListingId(event.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl">
            {listings.map(listing => <option key={listing.id} value={listing.id}>{listing.title}</option>)}
          </select>
          {loadingReviews ? <p className="text-sm text-slate-500">Loading reviews…</p> : (
            <p className="text-sm text-slate-700">
              {summary.count === 0 ? 'No approved reviews yet.' : `${summary.average} average from ${summary.count} approved review${summary.count === 1 ? '' : 's'}.`}
            </p>
          )}
          {reviews.map(review => (
            <article key={review.id} className="border-t border-slate-100 pt-3">
              <p className="text-sm font-bold text-slate-900">{review.authorName} · {review.rating} / 5</p>
              <p className="text-sm text-slate-700">{review.body}</p>
            </article>
          ))}
          {reviews.length === 0 && !loadingReviews ? <p className="text-xs text-slate-500">Approved reviews will appear in this list.</p> : null}

          {mine?.status === 'REMOVED' ? (
            <p className="text-sm text-slate-600">Your review of this project was removed.</p>
          ) : (
            <form onSubmit={save} className="space-y-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-bold text-slate-700">{mine ? `Your review is ${mine.status}.` : 'Write a review'}</p>
              <div className="flex gap-1" role="group" aria-label="Rating from 1 to 5">
                {[1, 2, 3, 4, 5].map(value => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={rating === value}
                    aria-label={`${value} star${value === 1 ? '' : 's'}`}
                    onClick={() => setRating(value)}
                    className={`p-1 ${value <= rating ? 'text-amber-500' : 'text-slate-300'}`}
                  >
                    <Star className="w-5 h-5 fill-current" />
                  </button>
                ))}
              </div>
              <label htmlFor="review-body" className="sr-only">Review</label>
              <textarea id="review-body" required maxLength={500} value={body} onChange={event => setBody(event.target.value)} className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl" placeholder="What should a future buyer know?" />
              {!isLoggedIn ? <p className="text-xs text-slate-500">Sign in to submit a review.</p> : null}
              <button type="submit" disabled={saving || !listingId} className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold disabled:opacity-60">
                {saving ? 'Saving…' : mine ? 'Update review' : 'Submit review'}
              </button>
            </form>
          )}

          {currentUser.role === 'SUPER_ADMIN' && moderation.length > 0 ? (
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h2 className="text-sm font-bold text-slate-900">Waiting for moderation</h2>
              {moderation.map(review => (
                <div key={review.id} className="text-sm space-y-1">
                  <p>{review.authorName} · {review.rating} / 5 · {review.status}</p>
                  <p className="text-slate-700">{review.body}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderate(review.id, 'APPROVED')} className="text-xs font-bold text-emerald-700">Approve</button>
                    <button type="button" onClick={() => moderate(review.id, 'REJECTED')} className="text-xs font-bold text-amber-700">Reject</button>
                    <button type="button" onClick={() => moderate(review.id, 'REMOVED')} className="text-xs font-bold text-red-700">Remove</button>
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
