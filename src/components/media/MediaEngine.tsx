import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaItem } from '../../types';
import {
  Play,
  Video,
  ThumbsUp,
  MessageSquare,
  Share2,
  Calendar,
  Clock,
  Send,
  Plus,
  Trash2,
  LifeBuoy,
  X,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
  isLiked?: boolean;
}

export const MediaEngine: React.FC<{
  onOpenLoginModal?: () => void;
  onTriggerSupportWithContext?: (ctx: string) => void;
}> = ({ onOpenLoginModal, onTriggerSupportWithContext }) => {
  const {
    mediaItems,
    selectedMedia,
    setSelectedMedia,
    currentUser,
    isLoggedIn,
    showToast,
    createMediaItem,
    deleteMediaItem
  } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'MASTERCLASS' | 'PODCAST'>('ALL');
  const [likesState, setLikesState] = useState<Record<string, { count: number; isLiked: boolean }>>({});
  const [commentsState, setCommentsState] = useState<Record<string, Comment[]>>({});
  const [commentInput, setCommentInput] = useState('');

  // Post new update modal state
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState<'MASTERCLASS' | 'PODCAST' | 'PROJECT_WALKTHROUGH'>('MASTERCLASS');
  const [newDuration, setNewDuration] = useState('28:40');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newHost, setNewHost] = useState(currentUser?.name || 'Swamy Reddy Javidi');

  const activeVideo = selectedMedia || (mediaItems.length > 0 ? mediaItems[0] : null);
  const activeLikes = activeVideo ? (likesState[activeVideo.id] || { count: 0, isLiked: false }) : { count: 0, isLiked: false };
  const activeComments = activeVideo ? (commentsState[activeVideo.id] || []) : [];

  const handleLike = () => {
    if (!activeVideo) return;
    if (!isLoggedIn) {
      showToast('Please sign in to like this video audit.');
      onOpenLoginModal?.();
      return;
    }

    setLikesState(prev => {
      const current = prev[activeVideo.id] || { count: 0, isLiked: false };
      const newIsLiked = !current.isLiked;
      return {
        ...prev,
        [activeVideo.id]: {
          count: newIsLiked ? current.count + 1 : Math.max(0, current.count - 1),
          isLiked: newIsLiked
        }
      };
    });

    showToast(activeLikes.isLiked ? 'Removed from liked broadcasts' : 'Liked video broadcast!');
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !commentInput.trim()) return;

    if (!isLoggedIn) {
      showToast('Please sign in to join the conversation.');
      onOpenLoginModal?.();
      return;
    }

    const newComment: Comment = {
      id: `comm_${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role.replace('_', ' '),
      authorAvatar: currentUser.avatar,
      text: commentInput.trim(),
      timestamp: 'Just now',
      likes: 1,
      isLiked: true
    };

    setCommentsState(prev => ({
      ...prev,
      [activeVideo.id]: [newComment, ...(prev[activeVideo.id] || [])]
    }));

    setCommentInput('');
    showToast('Your comment has been posted!');
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    showToast('Broadcast link copied to clipboard!');
  };

  const handleEnquire = () => {
    if (!activeVideo) return;
    const context = `${activeVideo.title} (Broadcast by ${activeVideo.host})`;
    if (onTriggerSupportWithContext) {
      onTriggerSupportWithContext(context);
    } else {
      showToast(`Inquiry initiated for ${activeVideo.title}. Opening Support Desk...`);
    }
  };

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newSummary.trim()) {
      showToast('Please provide broadcast title and summary.');
      return;
    }

    createMediaItem({
      title: newTitle.trim(),
      type: newType,
      duration: newDuration || '20:00',
      host: newHost.trim() || 'Swamy Reddy Javidi',
      videoUrl: newVideoUrl.trim() || 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
      summary: newSummary.trim(),
      keyTakeaways: [
        'Regulatory due diligence and structural verification',
        'Direct vector masterplan inspection without marketing fluff',
        'Accredited market evaluation standards'
      ],
      timestamps: [
        { time: '00:00', label: 'Executive Intro & Foundation Audit' },
        { time: '08:15', label: 'Detailed Engineering Breakdown' }
      ]
    });

    setIsPostModalOpen(false);
    setNewTitle('');
    setNewSummary('');
    setNewVideoUrl('');
  };

  const filteredItems = mediaItems.filter(item => {
    if (activeTab === 'ALL') return true;
    return item.type === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <Video className="w-4 h-4 text-amber-400" />
            YOUTUBE-STYLE VISUAL STORIES & STRUCTURAL AUDITS
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            Masterclasses & Builder MD Podcasts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Hosted by <strong className="text-white">Swamy Reddy Javidi</strong>. Unbiased technical breakdowns, soil load certifications, and candid interviews with top infrastructure leaders.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Post Video / Podcast Update</span>
          </button>

          <button
            onClick={handleEnquire}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 text-amber-400" />
            <span>Enquire on Projects</span>
          </button>
        </div>
      </div>

      {/* Featured Video Player */}
      {activeVideo ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Video Screen Viewport */}
            <div className="lg:col-span-8 bg-slate-950 relative aspect-video flex items-center justify-center group overflow-hidden">
              <img
                src={activeVideo.thumbnail}
                alt={activeVideo.title}
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/30" />

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => showToast(`Playing broadcast: "${activeVideo.title}"`)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/95 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                </button>
              </div>

              {/* Bottom Meta Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-white z-10 flex items-end justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 px-2 py-0.5 rounded mr-2 font-mono">
                    {activeVideo.type}
                  </span>
                  <span className="text-xs text-slate-300 font-mono">
                    {activeVideo.duration}
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-white mt-1 leading-snug">
                    {activeVideo.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Video Metadata & Whitepaper */}
            <div className="lg:col-span-4 p-6 flex flex-col justify-between space-y-4 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-200">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Broadcaster Desk:</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeVideo.host} {activeVideo.guest && `with ${activeVideo.guest}`}
                  </div>
                  {activeVideo.guestTitle && (
                    <p className="text-xs text-slate-500">{activeVideo.guestTitle}</p>
                  )}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeVideo.summary}
                </p>

                {activeVideo.keyTakeaways && activeVideo.keyTakeaways.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200/80">
                    <span className="text-xs font-bold text-slate-900">Key Audit Takeaways:</span>
                    <ul className="space-y-1.5 text-xs text-slate-600">
                      {activeVideo.keyTakeaways.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Interactive Toolbar */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      activeLikes.isLiked
                        ? 'bg-amber-100 text-amber-900'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${activeLikes.isLiked ? 'fill-current' : ''}`} />
                    <span>{activeLikes.count}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                    title="Share Broadcast"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {currentUser.role === 'SUPER_ADMIN' && (
                  <button
                    onClick={() => deleteMediaItem(activeVideo.id)}
                    className="text-xs text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Real Comments Section */}
          <div className="p-6 border-t border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Discussion ({activeComments.length})</span>
            </h3>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Join the technical discussion on this audit..."
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Comment</span>
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {activeComments.map(c => (
                <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{c.authorName}</span>
                    <span className="text-[10px] text-slate-400">{c.timestamp}</span>
                  </div>
                  <p className="text-xs text-slate-600">{c.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900 font-display">
              No Video Broadcasts Uploaded Yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              All masterclasses and builder podcasts are published dynamically. Click below to post the first official broadcast.
            </p>
          </div>
          <button
            onClick={() => setIsPostModalOpen(true)}
            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Upload New Broadcast</span>
          </button>
        </div>
      )}

      {/* Grid of Broadcasts */}
      {mediaItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <h3 className="text-base font-bold text-slate-900 font-display">
              All Broadcasts & Podcasts ({filteredItems.length})
            </h3>

            <div className="flex gap-2">
              {(['ALL', 'MASTERCLASS', 'PODCAST'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                    activeTab === tab
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'ALL' ? 'All Formats' : tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedMedia(item);
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }}
                className={`group cursor-pointer bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between ${
                  activeVideo?.id === item.id
                    ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div>
                  <div className="relative aspect-video bg-slate-950 overflow-hidden">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-black uppercase bg-slate-900/90 text-amber-400 px-2 py-0.5 rounded font-mono">
                      {item.type}
                    </span>
                    <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded">
                      {item.duration}
                    </span>
                  </div>

                  <div className="p-4 space-y-1.5">
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-500 line-clamp-2">
                      {item.summary}
                    </p>
                  </div>
                </div>

                <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                  <span>{item.publishedDate}</span>
                  <span className="text-amber-700 font-semibold group-hover:underline">Select & Watch →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Post New Broadcast */}
      {isPostModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Video className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white font-display">
                  Publish Video Audit or Podcast
                </h3>
              </div>
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Neopolis Infrastructure Audit: 100M Trumpet Interchange"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Format Category</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="MASTERCLASS">Masterclass</option>
                    <option value="PODCAST">Builder MD Podcast</option>
                    <option value="PROJECT_WALKTHROUGH">Site & Engineering Audit</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    placeholder="e.g. 35:20"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Host / Broadcaster Name</label>
                <input
                  type="text"
                  value={newHost}
                  onChange={e => setNewHost(e.target.value)}
                  placeholder="Swamy Reddy Javidi"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Video Stream URL</label>
                <input
                  type="url"
                  value={newVideoUrl}
                  onChange={e => setNewVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Summary & Technical Scope</label>
                <textarea
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  rows={3}
                  placeholder="Brief synopsis of what this broadcast audits..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsPostModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  <span>Publish Update</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
