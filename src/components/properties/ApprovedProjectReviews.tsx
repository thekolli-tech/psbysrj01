import React, { useEffect, useState } from 'react';

type PublicReview = {
  id: string;
  rating: number;
  body: string;
  authorName: string;
};

/**
 * Approved reviews for a persisted project.
 * A missing project returns nothing. Stored listing rating fields are not shown.
 */
export const ApprovedProjectReviews: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [state, setState] = useState<'hidden' | 'loading' | 'ready'>('loading');
  const [reviews, setReviews] = useState<PublicReview[]>([]);
  const [summary, setSummary] = useState<{ count: number; average: number | null }>({ count: 0, average: null });

  useEffect(() => {
    let cancelled = false;
    setState('loading');
    fetch(`/api/reviews?entityType=LISTING&entityId=${encodeURIComponent(projectId)}`)
      .then(async response => {
        if (!response.ok) {
          if (!cancelled) setState('hidden');
          return;
        }
        const data = await response.json();
        if (cancelled) return;
        setReviews(Array.isArray(data.reviews) ? data.reviews : []);
        setSummary(data.summary || { count: 0, average: null });
        setState('ready');
      })
      .catch(() => {
        if (!cancelled) setState('hidden');
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (state !== 'ready') return null;

  return (
    <section className="pt-6 border-t border-slate-200 space-y-3" aria-labelledby={`project-reviews-${projectId}`}>
      <h4 id={`project-reviews-${projectId}`} className="text-sm font-bold text-slate-900 uppercase tracking-wide font-mono">
        Approved reviews
      </h4>
      <p className="text-sm text-slate-600">
        {summary.count === 0
          ? 'No approved reviews yet.'
          : `${summary.average} average from ${summary.count} approved review${summary.count === 1 ? '' : 's'}.`}
      </p>
      {reviews.map(review => (
        <article key={review.id} className="bg-slate-50 border border-slate-100 rounded-xl p-3">
          <p className="text-sm font-bold text-slate-900">{review.authorName} · {review.rating} / 5</p>
          <p className="text-sm text-slate-700">{review.body}</p>
        </article>
      ))}
    </section>
  );
};
