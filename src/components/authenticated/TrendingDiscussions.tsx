import React from 'react';
import { CommunityPost } from '../../types';
import { BASELINE_COMMUNITY_POSTS } from './CommunityFeed';
import { Flame, ArrowUpRight, MessageSquare, ArrowBigUp } from 'lucide-react';

interface TrendingDiscussionsProps {
  posts: CommunityPost[];
  onOpenDetail: (postId: string) => void;
}

export const TrendingDiscussions: React.FC<TrendingDiscussionsProps> = ({
  posts,
  onOpenDetail
}) => {
  // Sort posts by engagement (upvotes + comments)
  const trending = React.useMemo(() => {
    const combined = [...(posts || [])];

    return combined
      .sort((a, b) => {
        const scoreA = (a.upvotes || 0) * 2 + (a.commentsCount || 0);
        const scoreB = (b.upvotes || 0) * 2 + (b.commentsCount || 0);
        return scoreB - scoreA;
      })
      .slice(0, 4);
  }, [posts]);

  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-amber-500 fill-amber-500" />
          <h3 className="text-xs font-bold font-display uppercase tracking-wider text-slate-800">
            Trending Discussions
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-400">Past 24h</span>
      </div>

      <div className="mt-3 divide-y divide-slate-100">
        {trending.length === 0 ? (
          <p className="text-xs text-slate-400 py-2">No trending topics yet.</p>
        ) : (
          trending.map((post, idx) => (
            <div
              key={post.id}
              onClick={() => onOpenDetail(post.id)}
              className="py-2.5 first:pt-0 last:pb-0 group cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <span className="text-xs font-bold text-slate-400 group-hover:text-[#B49029] w-4 shrink-0 pt-0.5">
                  0{idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold text-slate-800 group-hover:text-[#182A3E] line-clamp-2 leading-snug">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <ArrowBigUp className="w-3.5 h-3.5 text-slate-400" />
                      {post.upvotes || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3 text-slate-400" />
                      {post.commentsCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
