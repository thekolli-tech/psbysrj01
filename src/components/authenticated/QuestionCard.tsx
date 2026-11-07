import React from 'react';
import { CommunityPost } from '../../types';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import {
  HelpCircle,
  MessageCircle,
  ArrowBigUp,
  ArrowBigDown,
  Clock,
  Building,
  ShieldCheck,
  Bookmark,
  Share2
} from 'lucide-react';

interface QuestionCardProps {
  post: CommunityPost;
  onOpenDetail: (postId: string) => void;
  onUpvote?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  isBookmarked?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  post,
  onOpenDetail,
  onUpvote,
  onBookmark,
  isBookmarked = false
}) => {
  return (
    <article
      onClick={() => onOpenDetail(post.id)}
      className="bg-white border border-amber-200/70 hover:border-amber-300 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col gap-3 relative overflow-hidden"
    >
      <div className="absolute top-0 left-0 bottom-0 w-1 bg-[#B49029]" />

      <div className="flex items-center justify-between text-xs text-slate-500 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            Property Q&A
          </span>

          {post.communityName && (
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Building className="w-3 h-3 text-[#B49029]" />
              {post.communityName}
            </span>
          )}

          <span className="text-slate-300">•</span>
          <span className="text-slate-500">{post.authorName || 'Seeker'}</span>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (onBookmark) onBookmark(post.id);
          }}
          className={`p-1 text-slate-400 hover:text-amber-600 rounded-lg cursor-pointer ${
            isBookmarked ? 'text-amber-600' : ''
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#182A3E] leading-snug pl-1">
        {post.title}
      </h3>

      {post.content && (
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed pl-1">
          {post.content}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs pl-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (onUpvote) onUpvote(post.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full font-semibold text-slate-700 cursor-pointer"
          >
            <ArrowBigUp className="w-4 h-4 fill-slate-400 text-slate-500" />
            <span>{post.upvotes || 0} Upvotes</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-full font-semibold">
            <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{post.commentsCount || (post as any).replies?.length || 0} Answers</span>
          </span>
        </div>

        <span className="text-[#182A3E] hover:text-[#B49029] font-bold text-xs">
          Answer Question →
        </span>
      </div>
    </article>
  );
};
