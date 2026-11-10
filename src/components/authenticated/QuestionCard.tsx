import React, { useState } from 'react';
import { CommunityPost } from '../../types';
import {
  HelpCircle,
  MessageCircle,
  ArrowBigUp,
  Building,
  Bookmark
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
  const [answersCount] = useState<number>(
    post.commentsCount || (post as any).replies?.length || 0
  );

  return (
    <article
      onClick={() => onOpenDetail(post.id)}
      className="group bg-white border border-slate-200/90 hover:border-[#B99A24]/80 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col gap-3 relative overflow-hidden text-slate-800"
    >
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#B99A24]" />

      <div className="flex items-center justify-between text-xs text-slate-500 pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 text-[11px]">
            <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
            Property Q&A
          </span>

          <span className="text-slate-300">•</span>
          <span className="text-slate-600 font-semibold">{post.authorName || 'Seeker'}</span>

          {post.communityName && (
            <>
              <span className="text-slate-300">•</span>
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <Building className="w-3 h-3 text-[#B99A24]" />
                {post.communityName}
              </span>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (onBookmark) onBookmark(post.id);
          }}
          className={`p-1 text-slate-400 hover:text-amber-600 rounded-lg cursor-pointer transition-colors ${
            isBookmarked ? 'text-amber-600' : ''
          }`}
          title={isBookmarked ? 'Bookmarked' : 'Bookmark question'}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3
        onClick={e => {
          e.stopPropagation();
          onOpenDetail(post.id);
        }}
        className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-[#001C38] hover:text-[#B99A24] leading-snug pl-1 cursor-pointer transition-colors"
      >
        {post.title}
      </h3>

      {post.content && (
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed pl-1 cursor-pointer">
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
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-full font-semibold cursor-pointer transition-colors"
          >
            <ArrowBigUp className="w-4 h-4 fill-current text-[#B99A24]" />
            <span>{post.upvotes || 0} Upvotes</span>
          </button>

          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenDetail(post.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-full font-semibold cursor-pointer transition-colors"
            title="View answers and replies"
          >
            <MessageCircle className="w-3.5 h-3.5 text-amber-600" />
            <span>{answersCount} Answers</span>
          </button>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            onOpenDetail(post.id);
          }}
          className="text-[#001C38] hover:text-[#B99A24] font-bold text-xs inline-flex items-center gap-1 hover:underline cursor-pointer transition-colors"
          title="Open thread and write answer"
        >
          <span>Answer Question →</span>
        </button>
      </div>
    </article>
  );
};
