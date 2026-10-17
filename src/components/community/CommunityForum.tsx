import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CommunityPost } from '../../types';
import { AudioStoryPlayer } from '../common/AudioStoryPlayer';
import { Avatar } from '../common/Avatar';
import {
  MessageSquare,
  ArrowBigUp,
  ArrowBigDown,
  ShieldCheck,
  Star,
  PlusCircle,
  Building,
  CheckCircle2,
  Send,
  LogIn,
  Share2,
  Bookmark,
  TrendingUp,
  Flame,
  Clock,
  Users,
  ShieldAlert,
  X,
  Layers,
  Sparkles,
  Video,
  Volume2,
  Image as ImageIcon
} from 'lucide-react';

interface CommunityForumViewProps {
  onOpenLoginModal?: () => void;
}

export const CommunityForumView: React.FC<CommunityForumViewProps> = ({ onOpenLoginModal }) => {
  const {
    communityPosts,
    properties,
    currentUser,
    isLoggedIn,
    showToast,
    createCommunityPost,
    communities,
    createCommunityProposal
  } = useApp();

  const [selectedTopic, setSelectedTopic] = useState<'ALL' | string>('ALL');
  const [selectedCommunityId, setSelectedCommunityId] = useState<'ALL' | string>('ALL');
  const [sortMode, setSortMode] = useState<'HOT' | 'TOP' | 'NEW'>('HOT');
  const [showNewPostModal, setShowNewPostModal] = useState(false);
  const [showCreateCommunityModal, setShowCreateCommunityModal] = useState(false);

  // New Community Proposal form state
  const [commForm, setCommForm] = useState({
    name: '',
    category: 'Micro-Market Hub',
    location: 'Kokapet Neopolis, Hyderabad',
    description: '',
    rules: '1. No spam. 2. Verify RERA numbers before quoting delay metrics. 3. Civil discourse only.'
  });
  const [commSubmitting, setCommSubmitting] = useState(false);

  // Voting tracking per post: net score and user vote state (1, -1, 0)
  const [votesState, setVotesState] = useState<Record<string, { score: number; userVote: 1 | -1 | 0 }>>({});

  const [newPostForm, setNewPostForm] = useState({
    title: '',
    content: '',
    topic: 'Construction Updates' as CommunityPost['topic'],
    propertyId: '',
    communityId: '',
    mediaType: 'POST' as 'POST' | 'VIDEO' | 'PODCAST',
    mediaUrl: '',
    photoUrl: ''
  });

  const [replyInput, setReplyInput] = useState<Record<string, string>>({});
  const [activeReplyBox, setActiveReplyBox] = useState<string | null>(null);

  const handleCreateCommunitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoggedIn) {
      showToast('Please sign in to propose a new community.');
      onOpenLoginModal?.();
      return;
    }

    if (!commForm.name.trim() || !commForm.description.trim()) {
      showToast('Please fill out the community name and description.');
      return;
    }

    setCommSubmitting(true);
    try {
      await createCommunityProposal({
        name: commForm.name.trim(),
        category: commForm.category,
        location: commForm.location.trim(),
        description: commForm.description.trim(),
        rules: commForm.rules.trim()
      });
      setShowCreateCommunityModal(false);
      setCommForm({
        name: '',
        category: 'Micro-Market Hub',
        location: 'Kokapet Neopolis, Hyderabad',
        description: '',
        rules: '1. No spam. 2. Verify RERA numbers. 3. Civil discourse only.'
      });
    } finally {
      setCommSubmitting(false);
    }
  };

  const handleVote = (postId: string, direction: 1 | -1) => {
    if (!isLoggedIn) {
      showToast('Please sign in to vote on community discussions.');
      onOpenLoginModal?.();
      return;
    }

    setVotesState(prev => {
      const current = prev[postId] || { score: 10, userVote: 0 };
      let newScore = current.score;
      let newVote: 1 | -1 | 0 = direction;

      if (current.userVote === direction) {
        // Toggle off
        newScore -= direction;
        newVote = 0;
      } else if (current.userVote === 0) {
        newScore += direction;
        newVote = direction;
      } else {
        // Switching from -1 to 1 or vice versa
        newScore += direction * 2;
        newVote = direction;
      }

      return {
        ...prev,
        [postId]: { score: newScore, userVote: newVote }
      };
    });
  };

  const handlePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostForm.title || !newPostForm.content) return;

    if (!isLoggedIn) {
      showToast('Please sign in to post a question.');
      onOpenLoginModal?.();
      return;
    }

    const prop = properties.find(p => p.id === newPostForm.propertyId);

    const attachments = newPostForm.photoUrl ? [
      { type: 'image', url: newPostForm.photoUrl, name: 'Site Photo Attachment' }
    ] : undefined;

    createCommunityPost({
      authorName: currentUser.name,
      authorRole: currentUser.role,
      topic: newPostForm.topic,
      title: newPostForm.title,
      content: newPostForm.content,
      propertyId: newPostForm.propertyId || undefined,
      propertyName: prop ? prop.title : undefined,
      mediaType: newPostForm.mediaType,
      mediaUrl: newPostForm.mediaUrl || undefined,
      thumbnailUrl: newPostForm.photoUrl || undefined,
      attachments
    });

    setNewPostForm({
      title: '',
      content: '',
      topic: 'Construction Updates',
      propertyId: '',
      communityId: '',
      mediaType: 'POST',
      mediaUrl: '',
      photoUrl: ''
    });
    setShowNewPostModal(false);
    showToast('Discussion published to community thread!');
  };

  const handleReplySubmit = (postId: string) => {
    const text = replyInput[postId];
    if (!text || !text.trim()) return;

    if (!isLoggedIn) {
      showToast('Please sign in to reply to community queries.');
      onOpenLoginModal?.();
      return;
    }

    showToast('Reply posted to thread!');
    setReplyInput({ ...replyInput, [postId]: '' });
    setActiveReplyBox(null);
  };

  const filteredPosts = communityPosts.filter(p => {
    if (selectedTopic === 'ALL') return true;
    return p.topic === selectedTopic;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Community Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            REDDIT-STYLE THREADED DISCUSSIONS & BUILDER RATINGS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Uncensored Community Q&A & Peer Reviews
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-2xl leading-relaxed">
            Directly ask questions regarding Vaastu compliance, slab casting audits, water table levels, and RERA approvals. Upvote high-quality answers and engage with verified PMO directors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to propose a new community.');
                onOpenLoginModal?.();
              } else {
                setShowCreateCommunityModal(true);
              }
            }}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-2xl text-xs font-black flex items-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Users className="w-4 h-4" />
            <span>+ Propose / Create Community</span>
          </button>

          <button
            onClick={() => {
              if (!isLoggedIn) {
                showToast('Please sign in to ask a community question.');
                onOpenLoginModal?.();
              } else {
                setShowNewPostModal(true);
              }
            }}
            className="px-4 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-slate-900/10 active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-amber-400" />
            <span>Ask Community Question</span>
          </button>
        </div>
      </div>

      {/* Verified Live Community Hubs Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 font-display">
                Verified Live Community Hubs
              </h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Super Admin Approved
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Super Admin approval is required for proposed communities to be live. Select a community to filter discussions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedCommunityId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                selectedCommunityId === 'ALL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Hubs ({communities.filter(c => c.status === 'APPROVED').length})
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {communities.filter(c => c.status === 'APPROVED').map(comm => (
            <div
              key={comm.id}
              onClick={() => setSelectedCommunityId(selectedCommunityId === comm.id ? 'ALL' : comm.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                selectedCommunityId === comm.id
                  ? 'border-amber-500 bg-amber-50/40 shadow-sm ring-2 ring-amber-500/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {comm.category}
                  </span>
                  <span className="text-[11px] font-mono text-emerald-700 font-bold flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{comm.memberCount} members</span>
                  </span>
                </div>

                <h3 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">
                  {comm.name}
                </h3>

                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {comm.description}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 mt-2">
                <span>{comm.location || 'Western Corridor'}</span>
                <span className="font-bold text-amber-700 hover:underline">
                  {selectedCommunityId === comm.id ? 'Active Filter ✓' : 'Filter Discussions →'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sorting & Topic Tabs (Reddit Style) */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        {/* Sort modes */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSortMode('HOT')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sortMode === 'HOT' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            <span>Hot</span>
          </button>
          <button
            onClick={() => setSortMode('TOP')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sortMode === 'TOP' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            <span>Top</span>
          </button>
          <button
            onClick={() => setSortMode('NEW')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              sortMode === 'NEW' ? 'bg-amber-100 text-amber-900' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>New</span>
          </button>
        </div>

        {/* Filter by Topic Pills */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['ALL', 'Construction Updates', 'Legal & RERA', 'Livability & Amenities', 'Resale & Rental Yield', 'Builder Credibility'] as const).map(topic => (
            <button
              key={topic}
              onClick={() => setSelectedTopic(topic)}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedTopic === topic
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>

      {/* Reddit-Style Post Feed or Clean Empty State */}
      <div className="space-y-4">
        {filteredPosts.length > 0 ? (
          filteredPosts.map(post => {
            const vote = votesState[post.id] || { score: post.upvotes, userVote: 0 };

            return (
              <div
                key={post.id}
                className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row"
              >
                {/* Left Column: Reddit-Style Upvote / Downvote Pillar */}
                <div className="w-full md:w-16 bg-slate-50/80 p-3 md:py-5 border-b md:border-b-0 md:border-r border-slate-200 flex md:flex-col items-center justify-between md:justify-start gap-2 shrink-0">
                  <button
                    onClick={() => handleVote(post.id, 1)}
                    className={`p-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer ${
                      vote.userVote === 1
                        ? 'text-amber-600 bg-amber-100'
                        : 'text-slate-400 hover:text-amber-600 hover:bg-slate-200'
                    }`}
                    title="Upvote"
                  >
                    <ArrowBigUp className="w-6 h-6 fill-current" />
                  </button>

                  <span
                    className={`font-mono-numbers font-black text-sm ${
                      vote.userVote === 1
                        ? 'text-amber-600'
                        : vote.userVote === -1
                        ? 'text-blue-600'
                        : 'text-slate-800'
                    }`}
                  >
                    {vote.score}
                  </span>

                  <button
                    onClick={() => handleVote(post.id, -1)}
                    className={`p-1.5 rounded-lg transition-colors active:scale-95 cursor-pointer ${
                      vote.userVote === -1
                        ? 'text-blue-600 bg-blue-100'
                        : 'text-slate-400 hover:text-blue-600 hover:bg-slate-200'
                    }`}
                    title="Downvote"
                  >
                    <ArrowBigDown className="w-6 h-6 fill-current" />
                  </button>
                </div>

                {/* Right Column: Post Body & Threaded Replies */}
                <div className="flex-1 p-6 space-y-4">
                  {/* Meta Header with Clean Typographic Separators (Zero-Pill Rule) */}
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <Avatar id={post.authorAvatar} label={post.authorName} className="w-7 h-7 rounded-lg" />
                      <span className="font-bold text-slate-900">{post.authorName}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-slate-600">u/{post.authorRole.toLowerCase()}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono text-[11px] text-slate-400">{post.createdAt}</span>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      {post.propertyName && (
                        <span className="text-amber-800 font-bold">
                          {post.propertyName}
                        </span>
                      )}
                      {post.propertyName && <span className="text-slate-300" aria-hidden="true">·</span>}
                      <span className="text-slate-600 font-medium font-mono text-[11px]">
                        r/{post.topic}
                      </span>
                    </div>
                  </div>

                  {/* Post Title & Content */}
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                      {post.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed mt-2 whitespace-pre-line">
                      {post.content}
                    </p>
                  </div>

                  {/* MEDIA EMBED 1: AUDIO STORY / PODCAST BRIEFING */}
                  {post.mediaType === 'PODCAST' && (
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

                  {/* MEDIA EMBED 2: 4K VIDEO EMBED */}
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
                          Video playback not supported on your browser.
                        </video>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 px-1 font-mono">
                        <span className="flex items-center gap-1 font-semibold text-amber-700">
                          <Video className="w-3 h-3" /> Verified 4K Site Survey
                        </span>
                        <span>Duration: {post.duration || '3:45'}</span>
                      </div>
                    </div>
                  )}

                  {/* MEDIA EMBED 3: PHOTO ATTACHMENTS GALLERY */}
                  {post.attachments && post.attachments.filter(a => a.type === 'image').length > 0 && (
                    <div className="pt-2 space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        {post.attachments.filter(a => a.type === 'image').map((att, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-4/3 rounded-xl overflow-hidden bg-slate-950 border border-slate-200 group"
                          >
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute bottom-1.5 left-2 right-2 bg-slate-950/80 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded truncate">
                              {att.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post Action Bar */}
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setActiveReplyBox(activeReplyBox === post.id ? null : post.id)}
                        className="flex items-center gap-1.5 hover:text-slate-900 py-1 cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4 text-slate-400" />
                        <span>{post.replies ? post.replies.length : 0} Comments</span>
                      </button>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          showToast('Discussion link copied to clipboard!');
                        }}
                        className="flex items-center gap-1.5 hover:text-slate-900 py-1 cursor-pointer"
                      >
                        <Share2 className="w-4 h-4 text-slate-400" />
                        <span>Share</span>
                      </button>
                    </div>

                    {currentUser.role === 'SUPER_ADMIN' && (
                      <button
                        onClick={() => {
                          fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE' })
                            .then(() => {
                              showToast('Post removed by Super Admin');
                              window.location.reload();
                            })
                            .catch(() => {});
                        }}
                        className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                      >
                        Delete Post
                      </button>
                    )}
                  </div>

                  {/* Threaded Nested Replies */}
                  {post.replies && post.replies.length > 0 && (
                    <div className="space-y-3 pt-3 border-l-2 border-slate-200 pl-4 mt-2">
                      {post.replies.map(reply => (
                        <div
                          key={reply.id}
                          className={`p-3.5 rounded-2xl text-xs space-y-1.5 ${
                            reply.isVerifiedBuilderReply
                              ? 'bg-amber-50/80 border border-amber-200'
                              : 'bg-slate-50 border border-slate-100'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{reply.authorName}</span>
                              {reply.isVerifiedBuilderReply && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-200 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-amber-700" /> Verified PMO Voice
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">{reply.createdAt}</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Inline Reply Input Field */}
                  {activeReplyBox === post.id && (
                    <div className="pt-2 flex gap-2">
                      <input
                        type="text"
                        placeholder={
                          isLoggedIn
                            ? 'What are your thoughts on this inquiry?...'
                            : 'Login to reply to this thread...'
                        }
                        value={replyInput[post.id] || ''}
                        onChange={e => setReplyInput({ ...replyInput, [post.id]: e.target.value })}
                        className="flex-1 px-4 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-slate-50"
                      />
                      <button
                        onClick={() => handleReplySubmit(post.id)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5 text-amber-400" />
                        <span>Reply</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center mx-auto">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-display">
                No Community Discussions Posted Yet
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Be the first to ask about construction milestones, structural title clearances, or micro-market rate audits.
              </p>
            </div>
            <button
              onClick={() => setShowNewPostModal(true)}
              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>Start First Discussion</span>
            </button>
          </div>
        )}
      </div>

      {/* Ask Community Question Modal */}
      {showNewPostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Post Query to Property Studio Community</h3>

            <form onSubmit={handlePostSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Query Headline *</label>
                <input
                  type="text"
                  required
                  value={newPostForm.title}
                  onChange={e => setNewPostForm({ ...newPostForm, title: e.target.value })}
                  placeholder="e.g. Independent check on Level 42 concrete strength reports"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newPostForm.topic}
                    onChange={e => setNewPostForm({ ...newPostForm, topic: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="Construction Updates">Construction Updates</option>
                    <option value="Legal & RERA">Legal & RERA</option>
                    <option value="Livability & Amenities">Livability & Amenities</option>
                    <option value="Resale & Rental Yield">Resale & Rental Yield</option>
                    <option value="Builder Credibility">Builder Credibility</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Related Project</label>
                  <select
                    value={newPostForm.propertyId}
                    onChange={e => setNewPostForm({ ...newPostForm, propertyId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">General Discussion</option>
                    {properties.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Technical Inquiry Description *</label>
                <textarea
                  rows={3}
                  required
                  value={newPostForm.content}
                  onChange={e => setNewPostForm({ ...newPostForm, content: e.target.value })}
                  placeholder="Provide context on your question (e.g. soil test reports, Vaastu angles, or delivery delays)..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Optional Visual & Audio Media Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Media Format</label>
                  <select
                    value={newPostForm.mediaType}
                    onChange={e => setNewPostForm({ ...newPostForm, mediaType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="POST">Standard Discussion</option>
                    <option value="VIDEO">4K Drone Walkthrough Video</option>
                    <option value="PODCAST">Audio Voice Note / Briefing</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Photo Attachment URL (Optional)</label>
                  <input
                    type="url"
                    value={newPostForm.photoUrl}
                    onChange={e => setNewPostForm({ ...newPostForm, photoUrl: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                  />
                </div>

                {newPostForm.mediaType !== 'POST' && (
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">
                      {newPostForm.mediaType === 'VIDEO' ? '4K Video Stream URL' : 'Audio MP3 Stream URL'}
                    </label>
                    <input
                      type="url"
                      value={newPostForm.mediaUrl}
                      onChange={e => setNewPostForm({ ...newPostForm, mediaUrl: e.target.value })}
                      placeholder={newPostForm.mediaType === 'VIDEO' ? 'https://assets.mixkit.co/...mp4' : 'https://cdn.example.com/audio.mp3'}
                      className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPostModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold"
                >
                  Publish Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Propose / Create Community Modal (Super Admin Approval Gated) */}
      {showCreateCommunityModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Propose a New Community Hub
                  </h3>
                  <p className="text-xs text-slate-400">
                    Property Studio Community Architecture
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateCommunityModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunitySubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-900 text-xs">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block font-bold">Super Admin Approval Required</strong>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    To maintain strict regulatory decorum and prevent broker spam, all new communities are reviewed and approved by Super Admin Swamy Reddy Javidi before going live.
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Community Hub Name *</label>
                <input
                  type="text"
                  required
                  value={commForm.name}
                  onChange={e => setCommForm({ ...commForm, name: e.target.value })}
                  placeholder="e.g. Kokapet Neopolis Sky Villa Owners"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hub Category</label>
                  <select
                    value={commForm.category}
                    onChange={e => setCommForm({ ...commForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  >
                    <option value="Micro-Market Hub">Micro-Market Hub</option>
                    <option value="Residential Luxury">Residential Luxury</option>
                    <option value="Town Development">Town Development</option>
                    <option value="Legal & Land Title">Legal & Land Title</option>
                    <option value="Commercial & Retail">Commercial & Retail</option>
                    <option value="Developer Town Hall">Developer Town Hall</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Location / Micro-Market</label>
                  <input
                    type="text"
                    value={commForm.location}
                    onChange={e => setCommForm({ ...commForm, location: e.target.value })}
                    placeholder="e.g. Kokapet, Hyderabad"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Purpose & Description *</label>
                <textarea
                  rows={3}
                  required
                  value={commForm.description}
                  onChange={e => setCommForm({ ...commForm, description: e.target.value })}
                  placeholder="Describe the focus of this community (e.g. verified discussions for tower owners, quarterly milestone reviews, or drainage infrastructure audits)..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Community Guidelines & Rules</label>
                <textarea
                  rows={2}
                  value={commForm.rules}
                  onChange={e => setCommForm({ ...commForm, rules: e.target.value })}
                  placeholder="e.g. 1. No duplicate spam listings. 2. Verify RERA numbers before quoting delay metrics."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCommunityModal(false)}
                  className="px-4 py-2.5 text-slate-600 hover:text-slate-900 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={commSubmitting}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md active:scale-95 transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>{commSubmitting ? 'Submitting Proposal...' : 'Submit for Super Admin Approval'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
