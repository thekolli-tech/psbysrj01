import React, { useEffect, useState, useRef } from 'react';
import { CommunityPost, CommentItem } from '../../types';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import { communityPostShareUrl } from '../../shared/communityEngagement';
import {
  ArrowLeft,
  Clock,
  MessageSquare,
  Repeat,
  Bookmark,
  Share2,
  UserCheck,
  Trash2,
  Flag,
  Radio,
  BarChart2,
  Check,
  ArrowBigUp,
  ArrowBigDown,
  Reply,
  Edit3,
  ThumbsUp,
  Send,
  Star,
  CheckCircle2,
  Lock,
  Globe,
  User,
  AlertTriangle,
  ChevronDown
} from 'lucide-react';

interface DiscussionDetailViewProps {
  postId: string;
  onBack: () => void;
  currentUser: any;
  isLoggedIn: boolean;
  onOpenLoginModal?: () => void;
  onOpenReportModal?: (post: CommunityPost) => void;
  onOpenDeletionModal?: (post: CommunityPost) => void;
  onOpenUserProfile?: (userId?: string) => void;
  allPosts?: CommunityPost[];
  showToast: (msg: string) => void;
  refreshPosts: () => Promise<void>;
  repostDiscussion: (postId: string, note?: string) => Promise<{ success: boolean; reposted?: boolean; count?: number }>;
}

export const DiscussionDetailView: React.FC<DiscussionDetailViewProps> = ({
  postId,
  onBack,
  currentUser,
  isLoggedIn,
  onOpenLoginModal,
  onOpenReportModal,
  onOpenDeletionModal,
  onOpenUserProfile,
  allPosts = [],
  showToast,
  refreshPosts,
  repostDiscussion
}) => {
  // Post data state
  const [post, setPost] = useState<CommunityPost | null>(() => {
    return allPosts.find(p => p.id === postId) || null;
  });
  const [postLoading, setPostLoading] = useState(!post);

  // Engagement state for the main post
  const [userVote, setUserVote] = useState<number>(post?.userVote ?? 0);
  const [agreeCount, setAgreeCount] = useState<number>(post?.agreeCount ?? 0);
  const [disagreeCount, setDisagreeCount] = useState<number>(post?.disagreeCount ?? 0);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(Boolean(post?.bookmarked));
  const [hasReposted, setHasReposted] = useState<boolean>(Boolean(post?.hasReposted));
  const [repostsCount, setRepostsCount] = useState<number>(post?.repostsCount ?? 0);
  const [isFollowing, setIsFollowing] = useState<boolean>(Boolean(post?.following));
  const [selectedPollOption, setSelectedPollOption] = useState<string | null>(post?.userVotedOptionId || null);

  // Loading states for post interactions (Module 9)
  const [isVotingPost, setIsVotingPost] = useState(false);
  const [isBookmarkingPost, setIsBookmarkingPost] = useState(false);
  const [isFollowingPost, setIsFollowingPost] = useState(false);
  const [isRepostingPost, setIsRepostingPost] = useState(false);
  const [isVotingPoll, setIsVotingPoll] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [sortMode, setSortMode] = useState<'best' | 'newest' | 'oldest'>('best');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalComments, setTotalComments] = useState(0);

  // Top-level comment composer state
  const [topCommentText, setTopCommentText] = useState('');
  const [topCommentIsAma, setTopCommentIsAma] = useState(false);
  const [isSubmittingTopComment, setIsSubmittingTopComment] = useState(false);
  const [topCommentError, setTopCommentError] = useState<string | null>(null);

  // Inline reply composer state
  const [replyingCommentId, setReplyingCommentId] = useState<string | null>(null);
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [isSubmittingReplyId, setIsSubmittingReplyId] = useState<string | null>(null);
  const [replyErrors, setReplyErrors] = useState<Record<string, string>>({});

  // Inline edit state
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingTexts, setEditingTexts] = useState<Record<string, string>>({});
  const [isSavingEditId, setIsSavingEditId] = useState<string | null>(null);

  // Individual loading states for comments
  const [isLikingCommentId, setIsLikingCommentId] = useState<string | null>(null);
  const [isDeletingCommentId, setIsDeletingCommentId] = useState<string | null>(null);

  // Fetch full post details
  const fetchPostDetails = async () => {
    try {
      const res = await fetch(`/api/community/posts/${postId}`);
      const data = await res.json();
      if (res.ok && data.post) {
        setPost(data.post);
        setUserVote(data.post.userVote ?? 0);
        setAgreeCount(data.post.agreeCount ?? 0);
        setDisagreeCount(data.post.disagreeCount ?? 0);
        setIsBookmarked(Boolean(data.post.bookmarked));
        setHasReposted(Boolean(data.post.hasReposted));
        setRepostsCount(data.post.repostsCount ?? 0);
        setIsFollowing(Boolean(data.post.following));
        setSelectedPollOption(data.post.userVotedOptionId || null);
      }
    } catch (err) {
      console.error('Failed to fetch post details:', err);
    } finally {
      setPostLoading(false);
    }
  };

  // Fetch discussion comments with sorting and pagination
  const fetchComments = async (targetSort = sortMode, targetPage = 1, append = false) => {
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/comments?sort=${targetSort}&page=${targetPage}&limit=25`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.comments)) {
        if (append) {
          setComments(prev => [...prev, ...data.comments]);
        } else {
          setComments(data.comments);
        }
        setTotalComments(data.totalComments ?? data.comments.length);
        setHasMore(Boolean(data.hasMore));
        setPage(targetPage);
      }
    } catch (err) {
      console.error('Failed to fetch comments:', err);
    } finally {
      setCommentsLoading(false);
    }
  };

  useEffect(() => {
    fetchPostDetails();
    fetchComments(sortMode, 1, false);
  }, [postId]);

  useEffect(() => {
    fetchComments(sortMode, 1, false);
  }, [sortMode]);

  // Real-time EventSource listener for active discussion thread
  useEffect(() => {
    const processEvent = (evt: any) => {
      if (!evt || !evt.type) return;

      if (evt.type === 'COMMENT_CREATED' && evt.data) {
        const newComment = evt.data.comment || evt.data;
        if (newComment.postId === postId) {
          setComments(prev => {
            const exists = (items: CommentItem[]): boolean =>
              items.some(it => it.id === newComment.id || (it.replies && exists(it.replies)));
            if (exists(prev)) return prev;

            if (newComment.parentId) {
              const addReply = (items: CommentItem[]): CommentItem[] =>
                items.map(it => {
                  if (it.id === newComment.parentId) {
                    return { ...it, replies: [...(it.replies || []), newComment] };
                  }
                  if (it.replies && it.replies.length > 0) {
                    return { ...it, replies: addReply(it.replies) };
                  }
                  return it;
                });
              return addReply(prev);
            } else {
              return [newComment, ...prev];
            }
          });
          setTotalComments(c => c + 1);
        }
      } else if (evt.type === 'COMMENT_UPDATED' && evt.data) {
        const { commentId, postId: evtPostId, content, updatedAt } = evt.data;
        if (evtPostId === postId) {
          const updateInTree = (items: CommentItem[]): CommentItem[] =>
            items.map(it => {
              if (it.id === commentId) {
                return { ...it, content, updatedAt };
              }
              if (it.replies && it.replies.length > 0) {
                return { ...it, replies: updateInTree(it.replies) };
              }
              return it;
            });
          setComments(prev => updateInTree(prev));
        }
      } else if (evt.type === 'COMMENT_DELETED' && evt.data) {
        const { id, postId: evtPostId } = evt.data;
        if (evtPostId === postId) {
          const deleteInTree = (items: CommentItem[]): CommentItem[] =>
            items.map(it => {
              if (it.id === id) {
                return {
                  ...it,
                  isDeleted: true,
                  content: '[This comment was deleted by the author]',
                  authorName: '[deleted]',
                  authorAvatar: null,
                  likesCount: 0
                };
              }
              if (it.replies && it.replies.length > 0) {
                return { ...it, replies: deleteInTree(it.replies) };
              }
              return it;
            });
          setComments(prev => deleteInTree(prev));
          setTotalComments(c => Math.max(0, c - 1));
        }
      } else if (evt.type === 'COMMENT_LIKED' && evt.data) {
        const { commentId, likesCount } = evt.data;
        const likeInTree = (items: CommentItem[]): CommentItem[] =>
          items.map(it => {
            if (it.id === commentId) return { ...it, likesCount };
            if (it.replies && it.replies.length > 0) return { ...it, replies: likeInTree(it.replies) };
            return it;
          });
        setComments(prev => likeInTree(prev));
      }
    };

    const handleSseMessage = (e: MessageEvent) => {
      try {
        const evt = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        processEvent(evt);
      } catch {}
    };

    const handleCustomSse = (e: Event) => {
      const customEvt = e as CustomEvent;
      processEvent(customEvt.detail);
    };

    window.addEventListener('message', handleSseMessage);
    window.addEventListener('community-sse-event', handleCustomSse);
    return () => {
      window.removeEventListener('message', handleSseMessage);
      window.removeEventListener('community-sse-event', handleCustomSse);
    };
  }, [postId]);

  // Upvote / Downvote Vote Handler
  const handleVote = async (direction: 1 | -1) => {
    if (!isLoggedIn) {
      showToast('Please sign in to vote on community discussions.');
      onOpenLoginModal?.();
      return;
    }
    const prevVote = userVote;
    const prevAgree = agreeCount;
    const prevDisagree = disagreeCount;

    const newVote = userVote === direction ? 0 : direction;
    const diffAgree = (newVote === 1 ? 1 : 0) - (userVote === 1 ? 1 : 0);
    const diffDisagree = (newVote === -1 ? 1 : 0) - (userVote === -1 ? 1 : 0);

    // Optimistic update
    setUserVote(newVote);
    setAgreeCount(Math.max(0, agreeCount + diffAgree));
    setDisagreeCount(Math.max(0, disagreeCount + diffDisagree));
    setIsVotingPost(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote: direction })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Vote was not saved.');
      setAgreeCount(Number(data.agreeCount || 0));
      setDisagreeCount(Number(data.disagreeCount || 0));
      setUserVote(data.userVote === 1 || data.userVote === -1 ? data.userVote : 0);
    } catch (err: any) {
      // Rollback
      setUserVote(prevVote);
      setAgreeCount(prevAgree);
      setDisagreeCount(prevDisagree);
      showToast(err.message || 'Vote was not saved.');
    } finally {
      setIsVotingPost(false);
    }
  };

  // Follow / Unfollow Discussion
  const handleFollow = async () => {
    if (!isLoggedIn) {
      showToast('Please sign in to follow a discussion.');
      onOpenLoginModal?.();
      return;
    }
    const prevFollowing = isFollowing;
    setIsFollowing(!prevFollowing);
    setIsFollowingPost(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/follow`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Follow was not saved.');
      setIsFollowing(Boolean(data.following));
      showToast(data.following ? 'You are following this discussion.' : 'You unfollowed this discussion.');
    } catch (err: any) {
      setIsFollowing(prevFollowing);
      showToast(err.message || 'Follow was not saved.');
    } finally {
      setIsFollowingPost(false);
    }
  };

  // Bookmark / Unbookmark
  const handleToggleBookmark = async () => {
    if (!isLoggedIn) {
      showToast('Please sign in to bookmark discussions.');
      onOpenLoginModal?.();
      return;
    }
    const prevBm = isBookmarked;
    setIsBookmarked(!prevBm);
    setIsBookmarkingPost(true);

    try {
      const response = await fetch(`/api/community/posts/${postId}/bookmark`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not update bookmark.');
      setIsBookmarked(Boolean(data.bookmarked));
      showToast(data.bookmarked ? 'Discussion saved to your Bookmarks.' : 'Discussion removed from Bookmarks.');
    } catch (err: any) {
      setIsBookmarked(prevBm);
      showToast(err.message || 'Bookmark action failed.');
    } finally {
      setIsBookmarkingPost(false);
    }
  };

  // Repost Handler
  const handleToggleRepost = async () => {
    if (!isLoggedIn) {
      showToast('Please sign in to repost discussions.');
      onOpenLoginModal?.();
      return;
    }
    const prevHasReposted = hasReposted;
    const prevCount = repostsCount;

    setHasReposted(!prevHasReposted);
    setRepostsCount(Math.max(0, repostsCount + (!prevHasReposted ? 1 : -1)));
    setIsRepostingPost(true);

    try {
      const res = await repostDiscussion(postId);
      if (res.success) {
        showToast(res.reposted ? 'Discussion reposted to your profile!' : 'Repost removed.');
        setHasReposted(Boolean(res.reposted));
        if (typeof res.count === 'number') setRepostsCount(res.count);
      } else {
        throw new Error('Repost action failed.');
      }
    } catch (err: any) {
      setHasReposted(prevHasReposted);
      setRepostsCount(prevCount);
      showToast(err.message || 'Repost action failed.');
    } finally {
      setIsRepostingPost(false);
    }
  };

  // Share Handler
  const handleShare = async () => {
    if (!post) return;
    const url = communityPostShareUrl(window.location.origin, post.id);
    if (!url) {
      showToast('This discussion does not have a public link.');
      return;
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: post.title, url });
        return;
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      showToast('Discussion link copied to clipboard.');
    } catch {
      showToast('The discussion link could not be copied.');
    }
  };

  // Poll Vote Handler
  const handleVotePoll = async (optionId: string) => {
    if (!isLoggedIn) {
      showToast('Please sign in to vote on polls.');
      onOpenLoginModal?.();
      return;
    }
    setIsVotingPoll(true);
    try {
      const res = await fetch(`/api/community/posts/${postId}/poll-vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to cast poll vote.');
      setSelectedPollOption(optionId);
      if (post) {
        setPost({ ...post, pollOptions: data.pollOptions, userVotedOptionId: data.userVotedOptionId });
      }
      showToast('Poll vote recorded!');
    } catch (err: any) {
      showToast(err.message || 'Failed to record poll vote.');
    } finally {
      setIsVotingPoll(false);
    }
  };

  // Top-Level Comment Submission
  const handleTopCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = topCommentText.trim();
    if (!trimmed) return;
    if (!isLoggedIn) {
      showToast('Please sign in to join the discussion.');
      onOpenLoginModal?.();
      return;
    }
    setIsSubmittingTopComment(true);
    setTopCommentError(null);

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: trimmed,
          isAmaAnswer: topCommentIsAma
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit comment');

      showToast(topCommentIsAma ? 'Verified AMA answer posted!' : 'Comment posted!');
      setTopCommentText('');
      setTopCommentIsAma(false);

      if (data.comment) {
        setComments(prev => [data.comment, ...prev]);
        setTotalComments(c => c + 1);
      }
      refreshPosts();
    } catch (err: any) {
      setTopCommentError(err.message || 'Failed to submit comment');
    } finally {
      setIsSubmittingTopComment(false);
    }
  };

  // Inline Nested Reply Submission
  const handleInlineReplySubmit = async (parentCommentId: string) => {
    const text = (replyTexts[parentCommentId] || '').trim();
    if (!text) return;
    if (!isLoggedIn) {
      showToast('Please sign in to reply.');
      onOpenLoginModal?.();
      return;
    }
    setIsSubmittingReplyId(parentCommentId);
    setReplyErrors(prev => ({ ...prev, [parentCommentId]: '' }));

    try {
      const res = await fetch(`/api/community/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          parentId: parentCommentId
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit reply');

      showToast('Reply posted to conversation!');
      setReplyTexts(prev => ({ ...prev, [parentCommentId]: '' }));
      setReplyingCommentId(null);

      if (data.comment) {
        const insertReply = (items: CommentItem[]): CommentItem[] =>
          items.map(item => {
            if (item.id === parentCommentId) {
              return {
                ...item,
                replies: [...(item.replies || []), data.comment]
              };
            }
            if (item.replies && item.replies.length > 0) {
              return {
                ...item,
                replies: insertReply(item.replies)
              };
            }
            return item;
          });
        setComments(prev => insertReply(prev));
        setTotalComments(c => c + 1);
      }
      refreshPosts();
    } catch (err: any) {
      setReplyErrors(prev => ({ ...prev, [parentCommentId]: err.message || 'Failed to submit reply' }));
    } finally {
      setIsSubmittingReplyId(null);
    }
  };

  // Edit Comment Save Handler
  const handleSaveEdit = async (commentId: string) => {
    const text = (editingTexts[commentId] || '').trim();
    if (!text) return;
    setIsSavingEditId(commentId);

    try {
      const res = await fetch(`/api/community/comments/${commentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update comment');

      showToast('Comment updated');
      setEditingCommentId(null);

      const updateInTree = (items: CommentItem[]): CommentItem[] =>
        items.map(item => {
          if (item.id === commentId) {
            return {
              ...item,
              content: text,
              updatedAt: data.comment?.updatedAt || new Date().toISOString()
            };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: updateInTree(item.replies) };
          }
          return item;
        });
      setComments(prev => updateInTree(prev));
    } catch (err: any) {
      showToast(err.message || 'Failed to update comment');
    } finally {
      setIsSavingEditId(null);
    }
  };

  // Delete Comment Handler
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    setIsDeletingCommentId(commentId);

    try {
      const res = await fetch(`/api/community/comments/${commentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete comment');

      showToast('Comment removed');
      const deleteInTree = (items: CommentItem[]): CommentItem[] =>
        items.map(item => {
          if (item.id === commentId) {
            return {
              ...item,
              isDeleted: true,
              content: '[This comment was deleted by the author]',
              authorName: '[deleted]',
              authorAvatar: null,
              likesCount: 0
            };
          }
          if (item.replies && item.replies.length > 0) {
            return { ...item, replies: deleteInTree(item.replies) };
          }
          return item;
        });

      setComments(prev => deleteInTree(prev));
      setTotalComments(c => Math.max(0, c - 1));
      refreshPosts();
    } catch (err: any) {
      showToast(err.message || 'Failed to delete comment');
    } finally {
      setIsDeletingCommentId(null);
    }
  };

  // Toggle Comment Like Handler
  const handleToggleCommentLike = async (comment: CommentItem) => {
    if (!isLoggedIn) {
      showToast('Please sign in to upvote comments.');
      onOpenLoginModal?.();
      return;
    }
    if (comment.isDeleted) return;

    const currentLiked = Boolean(comment.userLiked);
    const nextLiked = !currentLiked;
    const nextCount = Math.max(0, comment.likesCount + (nextLiked ? 1 : -1));

    const setLikeInTree = (items: CommentItem[], liked: boolean, count: number): CommentItem[] =>
      items.map(item => {
        if (item.id === comment.id) {
          return { ...item, userLiked: liked, likesCount: count };
        }
        if (item.replies && item.replies.length > 0) {
          return { ...item, replies: setLikeInTree(item.replies, liked, count) };
        }
        return item;
      });

    setComments(prev => setLikeInTree(prev, nextLiked, nextCount));
    setIsLikingCommentId(comment.id);

    try {
      const res = await fetch(`/api/community/comments/${comment.id}/like`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to like comment');
      setComments(prev => setLikeInTree(prev, Boolean(data.liked), Number(data.likesCount || 0)));
    } catch (err: any) {
      setComments(prev => setLikeInTree(prev, currentLiked, comment.likesCount));
      showToast(err.message || 'Failed to update like');
    } finally {
      setIsLikingCommentId(null);
    }
  };

  if (postLoading) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-slate-200 text-center space-y-4 shadow-sm animate-pulse">
        <Clock className="w-8 h-8 text-amber-500 animate-spin mx-auto" />
        <p className="text-sm font-semibold text-slate-600">Loading discussion thread...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="bg-white rounded-3xl p-10 border border-slate-200 text-center space-y-4 shadow-sm">
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-900">Discussion Not Found</h3>
        <p className="text-xs text-slate-600">This discussion may have been removed or is restricted to members.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
        >
          Return to Feed
        </button>
      </div>
    );
  }

  const score = agreeCount - disagreeCount;
  const isPoll = post.postType === 'POLL';
  const isAma = post.postType === 'AMA';
  const pollOpts = post.pollOptions || [];
  const totalPollVotes = pollOpts.reduce((sum: number, opt: any) => sum + Number(opt.votes || 0), 0);

  if (post.status === 'DELETED') {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center space-y-4">
        <div className="w-16 h-16 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center mx-auto text-2xl">
          🗑️
        </div>
        <h2 className="text-xl font-bold text-slate-800">This discussion has been deleted</h2>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          The requested discussion post is no longer available as it has been deleted.
        </p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Discussions</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="discussion-detail-container">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-amber-600" />
          <span>Back to Discussions Feed</span>
        </button>

        <div className="flex items-center gap-2">
          {post.communityName && (
            <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-full">
              c/{post.communityName}
            </span>
          )}
          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
            r/{post.topic}
          </span>
        </div>
      </div>

      {/* Main Discussion Post Card */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs p-5 sm:p-7 space-y-5">
        {/* Author & Meta Row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              onClick={() => onOpenUserProfile?.(post.authorId)}
              className="w-10 h-10 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-sm shrink-0 cursor-pointer border border-amber-500/20"
            >
              {post.authorName ? post.authorName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  onClick={() => onOpenUserProfile?.(post.authorId)}
                  className="font-bold text-slate-900 text-sm hover:text-amber-700 cursor-pointer transition-colors"
                >
                  {post.authorName}
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {post.authorRole}
                </span>
                {post.authorProfession && (
                  <span className="text-[11px] text-slate-500 hidden sm:inline">
                    • {post.authorProfession}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono mt-0.5">
                <span>Published {post.createdAt}</span>
                {post.visibility === 'COMMUNITY' && (
                  <span className="inline-flex items-center gap-0.5 text-blue-600 font-bold">
                    <Lock className="w-2.5 h-2.5" /> Members Only
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Complete Title & Content */}
        <div className="space-y-3">
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 leading-snug">
            {post.title}
          </h1>
          <p className="text-xs sm:text-base text-slate-800 leading-relaxed whitespace-pre-line">
            {post.content}
          </p>
        </div>

        {/* Attached Media: Audio Podcast */}
        {post.mediaType === 'PODCAST' && post.mediaUrl && (
          <div className="pt-2">
            <AudioStoryPlayer
              title={post.title}
              narrator={post.authorName}
              duration={post.duration || '3:12'}
              audioUrl={post.mediaUrl}
              transcript={post.content}
              badge="Community Voice Note"
              variant="compact"
            />
          </div>
        )}

        {/* Attached Media: Video Player */}
        {post.mediaType === 'VIDEO' && post.mediaUrl && (
          <div className="pt-2">
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-950 shadow-md">
              <video
                src={post.mediaUrl}
                controls
                playsInline
                poster={post.thumbnailUrl}
                className="w-full h-full object-cover"
              >
                Video playback not supported.
              </video>
            </div>
          </div>
        )}

        {/* Attached Media: Photo Attachments */}
        {post.attachments && post.attachments.filter(a => a.type === 'image').length > 0 && (
          <div className="pt-2 grid grid-cols-2 gap-3">
            {post.attachments.filter(a => a.type === 'image').map((att, idx) => (
              <div key={idx} className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group">
                <img src={att.url} alt={att.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded truncate">
                  {att.name}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Attached Media: Interactive Poll Widget */}
        {isPoll && pollOpts.length > 0 && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <BarChart2 className="w-4 h-4 text-amber-600" /> Community Poll
              </span>
              <span className="text-slate-500 font-mono text-[11px]">{totalPollVotes} votes total</span>
            </div>

            <div className="space-y-2">
              {pollOpts.map((opt: any) => {
                const optVotes = Number(opt.votes || 0);
                const pct = totalPollVotes > 0 ? Math.round((optVotes / totalPollVotes) * 100) : 0;
                const isSelectedByMe = selectedPollOption === opt.id;

                return (
                  <div
                    key={opt.id}
                    onClick={() => {
                      if (!selectedPollOption && !isVotingPoll) {
                        handleVotePoll(opt.id);
                      }
                    }}
                    className={`relative overflow-hidden p-3 rounded-xl border transition-all ${
                      isSelectedByMe
                        ? 'border-amber-500 bg-amber-50/50 ring-1 ring-amber-500'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    } ${!selectedPollOption ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    {selectedPollOption && (
                      <div className="absolute inset-y-0 left-0 bg-amber-200/50 transition-all duration-500" style={{ width: `${pct}%` }} />
                    )}
                    <div className="relative z-10 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelectedByMe ? 'border-amber-600 bg-amber-600 text-white' : 'border-slate-300 bg-white'}`}>
                          {isSelectedByMe && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="font-semibold text-slate-800">{opt.text}</span>
                      </div>
                      {selectedPollOption && (
                        <span className="font-mono font-bold text-slate-600 text-[11px]">
                          {pct}% ({optVotes})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Pill Bar with Individual Loading Feedback (Module 9) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {/* Upvote / Downvote Pill */}
            <div className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200/80 p-0.5">
              <button
                type="button"
                disabled={isVotingPost}
                onClick={() => handleVote(1)}
                aria-pressed={userVote === 1}
                aria-label="Upvote"
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  userVote === 1 ? 'text-amber-600 bg-white shadow-xs' : 'text-slate-500 hover:text-amber-600'
                } disabled:opacity-50`}
              >
                <ArrowBigUp className="w-4 h-4 fill-current" />
              </button>
              <span className={`px-2 font-mono font-bold text-xs ${userVote !== 0 ? 'text-slate-900' : 'text-slate-600'}`}>
                {score}
              </span>
              <button
                type="button"
                disabled={isVotingPost}
                onClick={() => handleVote(-1)}
                aria-pressed={userVote === -1}
                aria-label="Downvote"
                className={`p-1.5 rounded-full transition-colors cursor-pointer ${
                  userVote === -1 ? 'text-blue-600 bg-white shadow-xs' : 'text-slate-500 hover:text-blue-600'
                } disabled:opacity-50`}
              >
                <ArrowBigDown className="w-4 h-4 fill-current" />
              </button>
            </div>

            {/* Comment Count Pill */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200/80">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <span>{totalComments}</span>
              <span className="hidden sm:inline">Comments</span>
            </div>

            {/* Repost Pill */}
            <button
              type="button"
              disabled={isRepostingPost}
              onClick={handleToggleRepost}
              aria-pressed={hasReposted}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border transition-colors cursor-pointer ${
                hasReposted
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80'
              } disabled:opacity-50`}
            >
              {isRepostingPost ? (
                <Clock className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              ) : (
                <Repeat className={`w-3.5 h-3.5 ${hasReposted ? 'text-emerald-600' : 'text-slate-500'}`} />
              )}
              <span>{repostsCount}</span>
              <span className="hidden sm:inline">{isRepostingPost ? 'Reposting...' : hasReposted ? 'Reposted' : 'Repost'}</span>
            </button>

            {/* Bookmark Pill */}
            <button
              type="button"
              disabled={isBookmarkingPost}
              onClick={handleToggleBookmark}
              aria-pressed={isBookmarked}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80'
              } disabled:opacity-50`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-amber-600 text-amber-600' : 'text-slate-500'}`} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>

            {/* Share Pill */}
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-semibold border border-slate-200/80 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share</span>
            </button>

            {/* Follow Discussion Pill */}
            <button
              type="button"
              disabled={isFollowingPost}
              onClick={handleFollow}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-semibold border transition-colors cursor-pointer ${
                isFollowing
                  ? 'bg-blue-100 text-blue-900 border-blue-300'
                  : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700 border-slate-200/80'
              } disabled:opacity-50`}
            >
              <UserCheck className={`w-3.5 h-3.5 ${isFollowing ? 'text-blue-600' : 'text-slate-500'}`} />
              <span>{isFollowing ? 'Following' : 'Follow'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {currentUser && post.authorId === currentUser.id && (
              <>
                {post.status === 'PENDING_DELETION' || post.deletionStatus === 'PENDING' ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded-full">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>Deletion Pending</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenDeletionModal?.(post)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Request Deletion</span>
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={() => onOpenReportModal?.(post)}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
              title="Report this post"
            >
              <Flag className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Top-Level Comment Composer (Module 10.3) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {isLoggedIn ? `Join the Discussion as ${currentUser?.name}` : 'Sign in to Join the Discussion'}
            </span>
            {isLoggedIn && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {currentUser?.role}
              </span>
            )}
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {topCommentText.length}/2000 chars
          </span>
        </div>

        {topCommentError && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{topCommentError}</span>
          </div>
        )}

        <form onSubmit={handleTopCommentSubmit} className="space-y-3">
          <textarea
            rows={3}
            value={topCommentText}
            onChange={e => setTopCommentText(e.target.value)}
            disabled={isSubmittingTopComment}
            maxLength={2000}
            placeholder={
              isLoggedIn
                ? isAma
                  ? 'Ask the host a direct question or post your verified answer...'
                  : 'What are your thoughts? Share verified pricing data, legal observations, or market realities...'
                : 'Please sign in to comment on this discussion...'
            }
            className="w-full px-4 py-3 text-xs sm:text-sm border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none bg-slate-50/50"
          />

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            {isAma && isLoggedIn && (
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={topCommentIsAma}
                  onChange={e => setTopCommentIsAma(e.target.checked)}
                  disabled={isSubmittingTopComment}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-amber-900">Mark as Verified Host Answer</span>
              </label>
            )}

            <div className="flex items-center gap-2 ml-auto">
              {topCommentText && (
                <button
                  type="button"
                  onClick={() => setTopCommentText('')}
                  disabled={isSubmittingTopComment}
                  className="px-3.5 py-2 text-xs text-slate-500 hover:text-slate-700 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmittingTopComment || !topCommentText.trim()}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmittingTopComment ? (
                  <>
                    <Clock className="w-3.5 h-3.5 animate-spin text-amber-400" />
                    <span>Commenting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-amber-400" />
                    <span>Comment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Discussion Comments Thread Section (Module 10.2 & 10.5) */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-7 space-y-6">
        {/* Comments Section Header & Sort Dropdown */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Discussion Comments
            </h2>
            <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
              {totalComments}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <label htmlFor="comments-sort" className="text-xs font-bold text-slate-500">
              Sort by:
            </label>
            <div className="relative">
              <select
                id="comments-sort"
                value={sortMode}
                onChange={e => setSortMode(e.target.value as any)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 pr-8 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
              >
                <option value="best">🔥 Best Comments</option>
                <option value="newest">🕒 Newest First</option>
                <option value="oldest">⏳ Oldest First</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Comment Thread List */}
        {commentsLoading && comments.length === 0 ? (
          <div className="py-12 text-center space-y-3">
            <Clock className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
            <p className="text-xs font-semibold text-slate-500">Loading discussion comments...</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="py-12 text-center space-y-2 border border-dashed border-slate-200 rounded-2xl">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Comments Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to share your perspectives, verify market prices, or ask questions!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map(c => (
              <CommentNode
                key={c.id}
                comment={c}
                depth={0}
                currentUser={currentUser}
                isLoggedIn={isLoggedIn}
                onOpenLoginModal={onOpenLoginModal}
                replyingCommentId={replyingCommentId}
                onSetReplyingCommentId={id => {
                  setReplyingCommentId(id);
                  if (id && !replyTexts[id]) setReplyTexts(prev => ({ ...prev, [id]: '' }));
                }}
                replyText={replyTexts[replyingCommentId || ''] || ''}
                onReplyTextChange={text => {
                  if (replyingCommentId) setReplyTexts(prev => ({ ...prev, [replyingCommentId]: text }));
                }}
                onSubmitReply={handleInlineReplySubmit}
                isSubmittingReplyId={isSubmittingReplyId}
                replyError={replyErrors[replyingCommentId || '']}
                editingCommentId={editingCommentId}
                onSetEditingCommentId={id => {
                  setEditingCommentId(id);
                  if (id) {
                    const findInTree = (items: CommentItem[]): string => {
                      for (const it of items) {
                        if (it.id === id) return it.content;
                        if (it.replies) {
                          const res = findInTree(it.replies);
                          if (res) return res;
                        }
                      }
                      return '';
                    };
                    setEditingTexts(prev => ({ ...prev, [id]: findInTree(comments) }));
                  }
                }}
                editText={editingTexts[editingCommentId || ''] || ''}
                onEditTextChange={text => {
                  if (editingCommentId) setEditingTexts(prev => ({ ...prev, [editingCommentId]: text }));
                }}
                onSaveEdit={handleSaveEdit}
                isSavingEditId={isSavingEditId}
                onDeleteComment={handleDeleteComment}
                isDeletingId={isDeletingCommentId}
                onToggleLike={handleToggleCommentLike}
                isLikingId={isLikingCommentId}
                onOpenUserProfile={onOpenUserProfile}
              />
            ))}
          </div>
        )}

        {/* Incremental Loading / Pagination */}
        {hasMore && (
          <div className="pt-4 text-center">
            <button
              type="button"
              disabled={commentsLoading}
              onClick={() => fetchComments(sortMode, page + 1, true)}
              className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold inline-flex items-center gap-2 cursor-pointer transition-colors shadow-2xs"
            >
              {commentsLoading ? (
                <>
                  <Clock className="w-3.5 h-3.5 animate-spin text-amber-600" />
                  <span>Loading more comments...</span>
                </>
              ) : (
                <span>Load More Comments</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ==============================================================================
// RECURSIVE THREADED COMMENT NODE COMPONENT (Module 10.2)
// ==============================================================================

interface CommentNodeProps {
  comment: CommentItem;
  depth: number;
  currentUser: any;
  isLoggedIn: boolean;
  onOpenLoginModal?: () => void;
  replyingCommentId: string | null;
  onSetReplyingCommentId: (id: string | null) => void;
  replyText: string;
  onReplyTextChange: (text: string) => void;
  onSubmitReply: (parentId: string) => void;
  isSubmittingReplyId: string | null;
  replyError?: string;
  editingCommentId: string | null;
  onSetEditingCommentId: (id: string | null) => void;
  editText: string;
  onEditTextChange: (text: string) => void;
  onSaveEdit: (id: string) => void;
  isSavingEditId: string | null;
  onDeleteComment: (id: string) => void;
  isDeletingId: string | null;
  onToggleLike: (comment: CommentItem) => void;
  isLikingId: string | null;
  onOpenUserProfile?: (userId?: string) => void;
}

const CommentNode: React.FC<CommentNodeProps> = ({
  comment,
  depth,
  currentUser,
  isLoggedIn,
  onOpenLoginModal,
  replyingCommentId,
  onSetReplyingCommentId,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  isSubmittingReplyId,
  replyError,
  editingCommentId,
  onSetEditingCommentId,
  editText,
  onEditTextChange,
  onSaveEdit,
  isSavingEditId,
  onDeleteComment,
  isDeletingId,
  onToggleLike,
  isLikingId,
  onOpenUserProfile
}) => {
  const isEditing = editingCommentId === comment.id;
  const isReplying = replyingCommentId === comment.id;
  const isAuthor = currentUser && currentUser.id === comment.authorId;
  const isElevated = currentUser && (currentUser.role === 'SUPER_ADMIN' || currentUser.role === 'DEVELOPER');
  const canDelete = !comment.isDeleted && (isAuthor || isElevated);
  const canEdit = !comment.isDeleted && isAuthor;

  // Visual indentation clamp for deep nesting on mobile viewports
  const indentClass =
    depth === 0
      ? ''
      : depth >= 4
      ? 'ml-1 sm:ml-2 pl-2 sm:pl-3 border-l-2 border-slate-200'
      : 'ml-2 sm:ml-4 pl-3 sm:pl-4 border-l-2 border-slate-200';

  return (
    <div className={`space-y-2.5 ${indentClass} pt-1`}>
      <div
        className={`p-3.5 rounded-2xl text-xs space-y-2 transition-all ${
          comment.isDeleted
            ? 'bg-slate-50/70 border border-slate-200/60'
            : comment.isAmaAnswer
            ? 'bg-amber-50/80 border-2 border-amber-300 shadow-2xs'
            : 'bg-slate-50/80 border border-slate-200/80 hover:border-slate-300'
        }`}
      >
        {/* Comment Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Avatar */}
            {comment.isDeleted ? (
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                <User className="w-3 h-3" />
              </div>
            ) : comment.authorAvatar ? (
              <img
                src={comment.authorAvatar}
                alt={comment.authorName}
                onClick={() => onOpenUserProfile?.(comment.authorId)}
                className="w-5 h-5 rounded-full object-cover cursor-pointer"
              />
            ) : (
              <div
                onClick={() => onOpenUserProfile?.(comment.authorId)}
                className="w-5 h-5 rounded-full bg-slate-900 text-amber-400 font-bold flex items-center justify-center text-[10px] cursor-pointer"
              >
                {comment.authorName ? comment.authorName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}

            {/* Author Name */}
            <span
              onClick={() => !comment.isDeleted && onOpenUserProfile?.(comment.authorId)}
              className={`font-bold ${
                comment.isDeleted
                  ? 'text-slate-400 italic'
                  : 'text-slate-900 hover:text-amber-700 cursor-pointer transition-colors'
              }`}
            >
              {comment.authorName}
            </span>

            {/* Role Badge */}
            {!comment.isDeleted && comment.authorRole && (
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                {comment.authorRole}
              </span>
            )}

            {/* AMA Host Badge */}
            {comment.isAmaAnswer && (
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-950 bg-amber-300 px-2 py-0.5 rounded-full border border-amber-400">
                <Star className="w-2.5 h-2.5 fill-amber-700 text-amber-700" />
                Verified Host Answer
              </span>
            )}

            {/* Timestamp */}
            <span className="text-[10px] font-mono text-slate-400">
              • {comment.createdAt}
            </span>

            {comment.updatedAt && comment.updatedAt !== comment.createdAt && !comment.isDeleted && (
              <span className="text-[10px] text-slate-400 italic">(edited)</span>
            )}
          </div>
        </div>

        {/* Comment Content / Edit Form */}
        {isEditing ? (
          <div className="space-y-2 pt-1">
            <textarea
              rows={3}
              value={editText}
              onChange={e => onEditTextChange(e.target.value)}
              disabled={isSavingEditId === comment.id}
              maxLength={2000}
              className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onSetEditingCommentId(null)}
                disabled={isSavingEditId === comment.id}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSaveEdit(comment.id)}
                disabled={isSavingEditId === comment.id || !editText.trim()}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingEditId === comment.id ? (
                  <>
                    <Clock className="w-3 h-3 animate-spin text-amber-400" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save</span>
                )}
              </button>
            </div>
          </div>
        ) : (
          <p className={`leading-relaxed whitespace-pre-line ${comment.isDeleted ? 'text-slate-400 italic' : 'text-slate-800'}`}>
            {comment.content}
          </p>
        )}

        {/* Comment Action Bar (Module 9 & 10.3) */}
        {!comment.isDeleted && !isEditing && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 text-[11px]">
            <div className="flex items-center gap-1.5">
              {/* Like / Upvote Button */}
              <button
                type="button"
                disabled={isLikingId === comment.id}
                onClick={() => onToggleLike(comment)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                  comment.userLiked
                    ? 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                } disabled:opacity-50`}
              >
                {isLikingId === comment.id ? (
                  <Clock className="w-3 h-3 animate-spin text-amber-600" />
                ) : (
                  <ThumbsUp className={`w-3 h-3 ${comment.userLiked ? 'fill-amber-600 text-amber-600' : 'text-slate-400'}`} />
                )}
                <span>{comment.likesCount}</span>
              </button>

              {/* Reply Button */}
              <button
                type="button"
                onClick={() => onSetReplyingCommentId(isReplying ? null : comment.id)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold transition-colors cursor-pointer ${
                  isReplying
                    ? 'bg-slate-900 text-white'
                    : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <Reply className="w-3 h-3" />
                <span>Reply</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {canEdit && (
                <button
                  type="button"
                  onClick={() => onSetEditingCommentId(comment.id)}
                  className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                  title="Edit comment"
                >
                  <Edit3 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              )}

              {canDelete && (
                <button
                  type="button"
                  disabled={isDeletingId === comment.id}
                  onClick={() => onDeleteComment(comment.id)}
                  className="inline-flex items-center gap-1 text-rose-500 hover:text-rose-700 cursor-pointer disabled:opacity-50"
                  title="Delete comment"
                >
                  {isDeletingId === comment.id ? (
                    <Clock className="w-3 h-3 animate-spin text-rose-600" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Reply Composer (Module 10.3) */}
      {isReplying && (
        <div className="p-3 bg-slate-100/90 border border-slate-300/80 rounded-2xl space-y-2 mt-2 ml-2 sm:ml-4 animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600">
            <span className="flex items-center gap-1">
              <Reply className="w-3 h-3 text-amber-600" /> Replying to @{comment.authorName}
            </span>
            <span className="font-mono text-slate-400">{replyText.length}/2000</span>
          </div>

          {replyError && (
            <p className="text-[11px] text-rose-600 font-semibold">{replyError}</p>
          )}

          <textarea
            rows={2}
            value={replyText}
            onChange={e => onReplyTextChange(e.target.value)}
            disabled={isSubmittingReplyId === comment.id}
            placeholder={`Write your reply to ${comment.authorName}...`}
            maxLength={2000}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 bg-white resize-none"
          />

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => onSetReplyingCommentId(null)}
              disabled={isSubmittingReplyId === comment.id}
              className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => onSubmitReply(comment.id)}
              disabled={isSubmittingReplyId === comment.id || !replyText.trim()}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {isSubmittingReplyId === comment.id ? (
                <>
                  <Clock className="w-3 h-3 animate-spin text-amber-400" />
                  <span>Replying...</span>
                </>
              ) : (
                <>
                  <Reply className="w-3 h-3 text-amber-400" />
                  <span>Reply</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Recursive Child Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="space-y-2">
          {comment.replies.map(child => (
            <CommentNode
              key={child.id}
              comment={child}
              depth={depth + 1}
              currentUser={currentUser}
              isLoggedIn={isLoggedIn}
              onOpenLoginModal={onOpenLoginModal}
              replyingCommentId={replyingCommentId}
              onSetReplyingCommentId={onSetReplyingCommentId}
              replyText={replyText}
              onReplyTextChange={onReplyTextChange}
              onSubmitReply={onSubmitReply}
              isSubmittingReplyId={isSubmittingReplyId}
              replyError={replyError}
              editingCommentId={editingCommentId}
              onSetEditingCommentId={onSetEditingCommentId}
              editText={editText}
              onEditTextChange={onEditTextChange}
              onSaveEdit={onSaveEdit}
              isSavingEditId={isSavingEditId}
              onDeleteComment={onDeleteComment}
              isDeletingId={isDeletingId}
              onToggleLike={onToggleLike}
              isLikingId={isLikingId}
              onOpenUserProfile={onOpenUserProfile}
            />
          ))}
        </div>
      )}
    </div>
  );
};
