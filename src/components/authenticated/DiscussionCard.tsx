import React, { useState } from 'react';
import { CommunityPost } from '../../types';
import { getSafeAvatar, DEFAULT_AVATAR } from '../../shared/avatar';
import { communityPostShareUrl } from '../../shared/communityEngagement';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  MoreHorizontal,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  Building,
  Clock,
  Pin,
  Check,
  Flag,
  HelpCircle
} from 'lucide-react';

interface DiscussionCardProps {
  post: CommunityPost;
  onOpenDetail: (postId: string) => void;
  onUpvote?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  onShare?: (post: CommunityPost) => void;
  onReport?: (post: CommunityPost) => void;
  isBookmarked?: boolean;
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return 'Recently';
  const time = new Date(dateStr).getTime();
  if (isNaN(time)) return 'Recently';
  const diffSec = Math.floor((Date.now() - time) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo ago`;
}

export const DiscussionCard: React.FC<DiscussionCardProps> = ({
  post,
  onOpenDetail,
  onUpvote,
  onBookmark,
  onShare,
  onReport,
  isBookmarked = false
}) => {
  const [localVote, setLocalVote] = useState<number>(post.userVote || 0);
  const [localScore, setLocalScore] = useState<number>(post.upvotes || 0);
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handleVote = (e: React.MouseEvent, delta: 1 | -1) => {
    e.stopPropagation();
    if (localVote === delta) {
      setLocalVote(0);
      setLocalScore(prev => prev - delta);
    } else {
      const adjustment = delta - localVote;
      setLocalVote(delta);
      setLocalScore(prev => prev + adjustment);
    }
    if (onUpvote) {
      onUpvote(post.id);
    }
  };

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://propertystudio.org';
    const shareUrl = communityPostShareUrl(origin, post.id);
    navigator.clipboard?.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
    if (onShare) onShare(post);
  };

  const isQuestion = post.postType === 'QUESTION';
  const isPinned = Boolean(post.isPinned);

  return (
    <article
      onClick={() => onOpenDetail(post.id)}
      className="group relative bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl p-4 sm:p-5 transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer flex flex-col gap-3"
      style={{
        transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Pinned Indicator if present */}
      {isPinned && (
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200/60 w-fit">
          <Pin className="w-3 h-3 fill-amber-600 text-amber-600" />
          <span>Pinned Announcement</span>
        </div>
      )}

      {/* Top Metadata Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={getSafeAvatar(post.attachments?.[0]?.url ? undefined : undefined) || DEFAULT_AVATAR}
            alt={post.authorName || 'User'}
            className="w-8 h-8 rounded-full object-cover bg-slate-100 border border-slate-200 shrink-0"
            onError={e => {
              (e.currentTarget as HTMLImageElement).src = DEFAULT_AVATAR;
            }}
          />

          <div className="min-w-0 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
            {/* Community Pill */}
            {post.communityName && (
              <span className="font-bold text-[#182A3E] hover:text-[#B49029] transition-colors truncate max-w-[160px] flex items-center gap-1">
                <Building className="w-3 h-3 text-[#B49029]" />
                {post.communityName}
              </span>
            )}

            <span className="text-slate-300">•</span>

            {/* Author Name + Professional Designation */}
            <span className="font-semibold text-slate-800 truncate">
              {post.authorName || 'Community Member'}
            </span>

            {post.authorProfession && (
              <span className="text-[11px] text-slate-500 hidden sm:inline truncate max-w-[140px]">
                ({post.authorProfession})
              </span>
            )}

            {/* Verified Badge */}
            {(post.authorRole === 'DEVELOPER' || post.authorRole === 'SUPER_ADMIN' || post.authorRole === 'RERA_AGENT') && (
              <span className="inline-flex items-center text-emerald-600" title="Verified Professional">
                <ShieldCheck className="w-3.5 h-3.5 fill-emerald-100" />
              </span>
            )}

            <span className="text-slate-300">•</span>

            {/* Relative Time */}
            <span className="text-[11px] text-slate-400 flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3" />
              {formatRelativeTime(post.createdAt || (post as any).created_at)}
            </span>
          </div>
        </div>

        {/* More Options Dropdown */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div
              onClick={e => e.stopPropagation()}
              className="absolute right-0 top-7 z-20 w-44 bg-white border border-slate-200 rounded-xl shadow-xl py-1 text-xs text-slate-700 animate-in fade-in"
            >
              <button
                type="button"
                onClick={e => {
                  handleShare(e);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Share Link</span>
              </button>
              <button
                type="button"
                onClick={e => {
                  e.stopPropagation();
                  if (onBookmark) onBookmark(post.id);
                  setMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Bookmark className="w-3.5 h-3.5 text-slate-400" />
                <span>{isBookmarked ? 'Remove Bookmark' : 'Save Discussion'}</span>
              </button>
              {onReport && (
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    onReport(post);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 border-t border-slate-100 cursor-pointer"
                >
                  <Flag className="w-3.5 h-3.5" />
                  <span>Report Post</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Post Title */}
      <h3 className="text-base sm:text-lg font-bold font-display text-slate-900 group-hover:text-[#182A3E] tracking-tight leading-snug">
        {post.title}
      </h3>

      {/* Post Body Description Preview */}
      {post.content && (
        <p className="text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed whitespace-pre-line font-normal">
          {post.content}
        </p>
      )}

      {/* Attached Media Preview (Image or Video) */}
      {(post.mediaUrl || post.thumbnailUrl) && (
        <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 max-h-72 mt-1">
          <img
            src={post.mediaUrl || post.thumbnailUrl}
            alt={post.title}
            className="w-full h-auto max-h-72 object-cover hover:scale-[1.01] transition-transform duration-200"
            loading="lazy"
          />
        </div>
      )}

      {/* Topic Tags */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        {post.topic && (
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
            #{post.topic}
          </span>
        )}
        {isQuestion && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            Question
          </span>
        )}
        {post.propertyName && (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60 truncate max-w-[180px]">
            {post.propertyName}
          </span>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Upvote / Downvote Pill */}
          <div
            onClick={e => e.stopPropagation()}
            className="inline-flex items-center bg-slate-100 hover:bg-slate-200/70 rounded-full p-0.5 border border-slate-200/60 transition-colors"
          >
            <button
              type="button"
              onClick={e => handleVote(e, 1)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                localVote === 1 ? 'text-[#B49029] bg-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Upvote"
              aria-label="Upvote"
            >
              <ArrowBigUp className="w-4 h-4 fill-current" />
            </button>

            <span className={`px-1.5 text-xs font-bold ${localVote !== 0 ? 'text-[#182A3E]' : 'text-slate-700'}`}>
              {localScore}
            </span>

            <button
              type="button"
              onClick={e => handleVote(e, -1)}
              className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                localVote === -1 ? 'text-blue-600 bg-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Downvote"
              aria-label="Downvote"
            >
              <ArrowBigDown className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Comment Count Pill */}
          <button
            type="button"
            onClick={e => {
              e.stopPropagation();
              onOpenDetail(post.id);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-full font-semibold transition-colors cursor-pointer"
          >
            <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>{post.commentsCount || (post as any).replies?.length || 0}</span>
            <span className="hidden sm:inline">Comments</span>
          </button>

          {/* Share Pill */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200/70 rounded-full font-semibold transition-colors cursor-pointer"
            title="Share discussion"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Share</span>
              </>
            )}
          </button>
        </div>

        {/* Bookmark Button */}
        <button
          type="button"
          onClick={e => {
            e.stopPropagation();
            if (onBookmark) onBookmark(post.id);
          }}
          className={`p-1.5 rounded-full transition-colors cursor-pointer ${
            isBookmarked
              ? 'text-[#B49029] bg-amber-50 hover:bg-amber-100'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
          title={isBookmarked ? 'Saved to Bookmarks' : 'Bookmark discussion'}
          aria-label="Bookmark"
        >
          <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </article>
  );
};
