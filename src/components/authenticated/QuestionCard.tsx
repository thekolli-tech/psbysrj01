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
      className="bg-[#121214] border border-[#333337] hover:border-[#C5A880]/50 rounded-3xl p-4 sm:p-6 transition-all duration-200 shadow-lg hover:shadow-2xl cursor-pointer flex flex-col gap-3.5 relative overflow-hidden text-white"
    >
      <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-[#C5A880]" />

      <div className="flex items-center justify-between text-xs text-[#A5A5AA] pl-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 font-bold text-[#C5A880] bg-[#1B1B1E] px-2.5 py-0.5 rounded-full border border-[#C5A880]/40 text-[11px] font-mono">
            <HelpCircle className="w-3.5 h-3.5 text-[#C5A880]" />
            Property Q&A
          </span>

          {post.communityName && (
            <span className="font-semibold text-white flex items-center gap-1">
              <Building className="w-3 h-3 text-[#C5A880]" />
              {post.communityName}
            </span>
          )}

          <span className="text-[#333337]">•</span>
          <span className="text-[#A5A5AA]">{post.authorName || 'Seeker'}</span>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (onBookmark) onBookmark(post.id);
          }}
          className={`p-1 text-[#A5A5AA] hover:text-[#C5A880] rounded-lg cursor-pointer ${
            isBookmarked ? 'text-[#C5A880]' : ''
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>

      <h3 className="text-base sm:text-lg font-bold font-serif text-white hover:text-[#D7B991] leading-snug pl-1">
        {post.title}
      </h3>

      {post.content && (
        <p className="text-xs sm:text-sm text-[#A5A5AA] line-clamp-2 leading-relaxed pl-1">
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
          className="mt-1 p-3.5 bg-[#1B1B1E] border border-[#C5A880]/40 rounded-2xl space-y-2.5 animate-in fade-in text-xs"
        >
          <div className="flex items-center justify-between font-bold text-[#C5A880]">
            <span className="flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-[#C5A880]" />
              <span>Write Your Verified Answer:</span>
            </span>
            <button
              type="button"
              onClick={() => setIsAnswering(false)}
              className="p-1 text-[#A5A5AA] hover:text-white rounded-lg cursor-pointer"
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
            className="w-full px-3 py-2 text-xs bg-[#121214] text-white border border-[#333337] focus:border-[#C5A880] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C5A880]/30 resize-none font-medium"
            autoFocus
          />

          <div className="flex items-center justify-between gap-2 pt-0.5">
            <span className="text-[11px] text-[#A5A5AA]">
              Published under your verified Property Studio account.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAnswering(false)}
                className="px-3 py-1.5 text-xs text-[#A5A5AA] hover:text-white font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !answerText.trim()}
                onClick={handleAnswerSubmit}
                className="px-4 py-1.5 bg-[#C5A880] hover:bg-[#D7B991] text-[#0A0A0B] text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-[#0A0A0B]" />
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#0A0A0B]" />
                    <span>Post Answer</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-[#333337] text-xs pl-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              if (onUpvote) onUpvote(post.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1B1B1E] hover:bg-[#26262b] text-slate-300 border border-[#333337] rounded-full font-semibold cursor-pointer"
          >
            <ArrowBigUp className="w-4 h-4 fill-current text-[#C5A880]" />
            <span>{post.upvotes || 0} Upvotes</span>
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#1B1B1E] text-[#C5A880] border border-[#C5A880]/30 rounded-full font-semibold">
            <MessageCircle className="w-3.5 h-3.5 text-[#C5A880]" />
            <span>{answersCount} Answers</span>
          </span>
        </div>

        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            setIsAnswering(prev => !prev);
          }}
          className="text-[#C5A880] hover:text-[#D7B991] font-bold text-xs inline-flex items-center gap-1 hover:underline cursor-pointer"
        >
          <span>{isAnswering ? 'Close Answering ×' : 'Answer Question →'}</span>
        </button>
      </div>
    </article>
  );
};
