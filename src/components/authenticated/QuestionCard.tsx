import React, { useState } from 'react';
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
  Share2,
  X,
  Send,
  CheckCircle2
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
  const [isAnswering, setIsAnswering] = useState(false);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [answersCount, setAnswersCount] = useState<number>(
    post.commentsCount || (post as any).replies?.length || 0
  );
  const [answerSuccess, setAnswerSuccess] = useState(false);

  const handleAnswerSubmit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = answerText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/community/posts/${post.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          isAmaAnswer: true
        })
      });

      if (!res.ok) {
        // If unauthenticated or error, navigate to detail view for login
        onOpenDetail(post.id);
        return;
      }

      setAnswerText('');
      setIsAnswering(false);
      setAnswersCount(prev => prev + 1);
      setAnswerSuccess(true);
      setTimeout(() => setAnswerSuccess(false), 4000);
    } catch {
      onOpenDetail(post.id);
    } finally {
      setIsSubmitting(false);
    }
  };

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

      {/* Answer Success Confirmation */}
      {answerSuccess && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-1.5 pl-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">Your answer has been submitted successfully!</span>
        </div>
      )}

      {/* Inline Answer Composer */}
      {isAnswering && (
        <div
          onClick={e => e.stopPropagation()}
          className="mt-1 p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5 animate-in fade-in text-xs"
        >
          <div className="flex items-center justify-between font-bold text-amber-950">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-amber-600" />
              <span>Write Your Verified Answer:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAnswering(false)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <textarea
            rows={3}
            value={answerText}
            onChange={e => setAnswerText(e.target.value)}
            disabled={isSubmitting}
            placeholder="Type your answer, pricing observation, construction status, or advice here..."
            className="w-full px-3 py-2 text-xs bg-white text-slate-800 border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/30 resize-none font-medium"
            autoFocus
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-slate-500">
              Published under your verified Property Studio account.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnswering(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !answerText.trim()}
                onClick={handleAnswerSubmit}
                className="px-4 py-1.5 bg-[#182A3E] hover:bg-[#203750] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Post Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
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
            <span>{answersCount} Answers</span>
          </span>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsAnswering(prev => !prev);
          }}
          className="text-[#182A3E] hover:text-[#B49029] font-bold text-xs inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>{isAnswering ? 'Close Answering ×' : 'Answer Question →'}</span>
        </button>
      </div>
    </article>
  );
};
