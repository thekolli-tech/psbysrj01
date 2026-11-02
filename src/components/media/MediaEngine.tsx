import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { MediaItem } from '../../types';
import {
  parseYouTubeUrl,
  validateMediaUrl,
  detectMediaConfig,
  MediaContentType
} from '../../shared/mediaParser';
import {
  Play,
  Pause,
  Video,
  Radio,
  Headphones,
  Volume2,
  VolumeX,
  Maximize2,
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
  CheckCircle2,
  Repeat,
  UploadCloud,
  AlertCircle,
  FileVideo,
  RefreshCw,
  Check,
  ExternalLink,
  Film,
  Sliders,
  AlertTriangle
} from 'lucide-react';

interface Comment {
  id: string;
  authorName: string;
  authorRole: string;
  authorAvatar: string;
  text: string;
  timestamp: string;
  likes: number;
}

type DiscoveryFilter = 'ALL' | 'VIDEOS' | 'PODCASTS' | 'LIVE_NOW' | 'UPCOMING' | 'RECORDED';

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
    deleteMediaItem,
    refreshMedia
  } = useApp();

  const isSuperAdmin = Boolean(isLoggedIn && currentUser?.role === 'SUPER_ADMIN');

  // Discovery Filter State
  const [activeFilter, setActiveFilter] = useState<DiscoveryFilter>('ALL');

  // Active Showcase Media (for engagement, discussion & highlight)
  const nonDeletedMedia = mediaItems.filter(
    m => m.id !== 'media_01' && m.id !== 'media_02' && m.status !== 'DELETED'
  );

  const activeVideo =
    selectedMedia && selectedMedia.id !== 'media_01' && selectedMedia.id !== 'media_02' && selectedMedia.status !== 'DELETED'
      ? selectedMedia
      : nonDeletedMedia.length > 0
      ? nonDeletedMedia[0]
      : null;

  // Unified Media Modal State (Dedicated Playback Screen)
  const [playbackMedia, setPlaybackMedia] = useState<MediaItem | null>(null);

  // Engagement State for Showcase
  const [engagement, setEngagement] = useState<{
    likesCount: number;
    hasLiked: boolean;
    reactionsCount: number;
    commentsCount: number;
    sharesCount: number;
    repostsCount: number;
    hasReposted: boolean;
  }>({
    likesCount: 0,
    hasLiked: false,
    reactionsCount: 0,
    commentsCount: 0,
    sharesCount: 0,
    repostsCount: 0,
    hasReposted: false
  });
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentInput, setCommentInput] = useState('');

  // Post / Broadcast Creation Modal State
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [uploadSource, setUploadSource] = useState<'DRIVE_FILE' | 'YOUTUBE' | 'EXTERNAL_STREAM'>('YOUTUBE');
  const [newTitle, setNewTitle] = useState('');
  const [newSummary, setNewSummary] = useState('');
  const [newHost, setNewHost] = useState(currentUser?.name || 'Swamy Reddy Javidi');
  const [newDuration, setNewDuration] = useState('25:00');
  const [newType, setNewType] = useState<'MASTERCLASS' | 'PODCAST' | 'PROJECT_WALKTHROUGH' | 'LIVE_VIDEO' | 'LIVE_AUDIO'>('MASTERCLASS');
  const [newUrl, setNewUrl] = useState('');
  const [newBroadcastStatus, setNewBroadcastStatus] = useState<'NONE' | 'LIVE' | 'UPCOMING' | 'ENDED'>('NONE');
  const [newScheduledTime, setNewScheduledTime] = useState('');
  const [newReplayUrl, setNewReplayUrl] = useState('');

  // Google Drive Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'IDLE' | 'GETTING_INTENT' | 'UPLOADING' | 'VERIFYING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // URL parsing & validation state
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message?: string; thumbnail?: string; isLive?: boolean }>({ isValid: true });

  // Escape key and Browser Back (popstate) handler with Body Scroll lock for Unified Media Modal
  useEffect(() => {
    if (playbackMedia) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setPlaybackMedia(null);
        }
      };
      const handlePopState = () => {
        setPlaybackMedia(null);
      };
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('popstate', handlePopState);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [playbackMedia]);

  // Sync engagement & comments from server for active showcase video
  useEffect(() => {
    if (!activeVideo?.id) return;
    Promise.all([
      fetch(`/api/media/${activeVideo.id}/engagement`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (data?.engagement) {
            setEngagement({
              likesCount: data.engagement.likesCount || 0,
              hasLiked: Boolean(data.engagement.hasLiked),
              reactionsCount: data.engagement.reactionsCount || 0,
              commentsCount: data.engagement.commentsCount || 0,
              sharesCount: data.engagement.sharesCount || 0,
              repostsCount: data.engagement.repostsCount || 0,
              hasReposted: Boolean(data.engagement.hasReposted)
            });
          }
        })
        .catch(() => {}),
      fetch(`/api/media/${activeVideo.id}/comments`)
        .then(res => (res.ok ? res.json() : null))
        .then(data => {
          if (Array.isArray(data?.comments)) {
            setComments(
              data.comments.map((c: any) => ({
                id: c.id,
                authorName: c.author_name,
                authorRole: (c.author_role || '').replace('_', ' '),
                authorAvatar: c.author_avatar || '',
                text: c.text,
                timestamp: c.created_at
                  ? new Date(c.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })
                  : 'Recently',
                likes: 0
              }))
            );
          }
        })
        .catch(() => {})
    ]);
  }, [activeVideo?.id, isLoggedIn]);

  // Filter media items
  const filteredMedia = nonDeletedMedia.filter(item => {
    switch (activeFilter) {
      case 'VIDEOS':
        return item.contentType === 'VIDEO' || item.type === 'MASTERCLASS' || item.type === 'PROJECT_WALKTHROUGH' || item.type === 'VIDEO';
      case 'PODCASTS':
        return item.contentType === 'PODCAST' || item.type === 'PODCAST';
      case 'LIVE_NOW':
        return item.broadcastStatus === 'LIVE' || item.isLive || item.type === 'LIVE_VIDEO' || item.type === 'LIVE_AUDIO';
      case 'UPCOMING':
        return item.broadcastStatus === 'UPCOMING';
      case 'RECORDED':
        return item.broadcastStatus === 'ENDED' || Boolean(item.replayUrl);
      case 'ALL':
      default:
        return true;
    }
  });

  const resetUploadModal = () => {
    setIsPostModalOpen(false);
    setNewTitle('');
    setNewSummary('');
    setNewUrl('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('IDLE');
    setUploadError(null);
    setUploadSource('YOUTUBE');
    setNewBroadcastStatus('NONE');
    setNewScheduledTime('');
    setNewReplayUrl('');
    setUrlValidation({ isValid: true });
  };

  const handleUrlChange = (val: string) => {
    setNewUrl(val);
    if (!val.trim()) {
      setUrlValidation({ isValid: true });
      return;
    }

    if (uploadSource === 'YOUTUBE') {
      const yt = parseYouTubeUrl(val);
      if (yt.isValid) {
        setUrlValidation({ isValid: true, thumbnail: yt.thumbnailUrl, isLive: yt.isLive });
        if (yt.isLive && newBroadcastStatus === 'NONE') {
          setNewBroadcastStatus('LIVE');
          setNewType('LIVE_VIDEO');
        }
      } else {
        setUrlValidation({ isValid: false, message: yt.error || 'Please enter a valid YouTube video or live URL.' });
      }
    } else {
      const v = validateMediaUrl(val);
      if (v.isValid) {
        const detected = detectMediaConfig(val, { isLiveBroadcast: newBroadcastStatus === 'LIVE' });
        setUrlValidation({ isValid: true, isLive: detected.isLive });
      } else {
        setUrlValidation({ isValid: false, message: v.error });
      }
    }
  };

  const validateAndSelectFile = (file: File) => {
    setUploadError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const isAudio = ['mp3', 'wav', 'aac', 'm4a', 'ogg'].includes(ext) || file.type.startsWith('audio/');
    const isVideo = ['mp4', 'webm', 'mov', 'avi'].includes(ext) || file.type.startsWith('video/');

    if (!isAudio && !isVideo) {
      setUploadError('Unsupported file type. Please upload MP4, WebM, QuickTime, MP3, WAV, AAC, or M4A.');
      return;
    }

    const maxVideo = 500 * 1024 * 1024;
    const maxAudio = 100 * 1024 * 1024;
    if (isVideo && file.size > maxVideo) {
      setUploadError(`Video exceeds maximum 500 MB limit (${Math.round(file.size / 1024 / 1024)} MB).`);
      return;
    }
    if (isAudio && file.size > maxAudio) {
      setUploadError(`Audio exceeds maximum 100 MB limit (${Math.round(file.size / 1024 / 1024)} MB).`);
      return;
    }

    setSelectedFile(file);
    if (!newTitle.trim()) {
      const rawName = file.name.replace(/\.[^/.]+$/, '');
      setNewTitle(rawName.replace(/[-_]/g, ' '));
    }
    if (isAudio && newType !== 'PODCAST') {
      setNewType('PODCAST');
    }
  };

  const executeDriveUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus('GETTING_INTENT');
    setUploadProgress(0);
    setUploadError(null);

    try {
      const category = newType === 'PODCAST' ? 'AUDIO' : 'VIDEO';
      const intentRes = await fetch('/api/media/upload-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: selectedFile.name,
          contentType: selectedFile.type || (category === 'AUDIO' ? 'audio/mpeg' : 'video/mp4'),
          fileSizeBytes: selectedFile.size,
          mediaCategory: category,
          title: newTitle.trim()
        })
      });

      const intentData = await intentRes.json();
      if (!intentRes.ok || !intentData.allowed) {
        throw new Error(intentData.error || 'Failed to initialize upload session');
      }

      const { uploadUrl, uploadId } = intentData;
      setUploadStatus('UPLOADING');

      // Streaming binary upload to Google Drive proxy
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', uploadUrl, true);
        xhr.setRequestHeader('Content-Type', selectedFile.type || (category === 'AUDIO' ? 'audio/mpeg' : 'video/mp4'));

        xhr.upload.onprogress = event => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Storage rejected upload with status ${xhr.status}: ${xhr.statusText}`));
          }
        };

        xhr.onerror = () => {
          reject(new Error('Network connection failed during upload. Check storage configuration.'));
        };

        xhr.send(selectedFile);
      });

      // Verification via HeadObject on backend
      setUploadStatus('VERIFYING');
      const completeRes = await fetch('/api/media/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uploadId,
          title: newTitle.trim(),
          summary: newSummary.trim(),
          type: newType,
          category: 'Real Estate Intelligence',
          duration: newDuration || '20:00',
          host: newHost.trim() || 'Swamy Reddy Javidi',
          thumbnail: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
          status: 'PUBLISHED'
        })
      });

      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        throw new Error(completeData.error || 'Failed to verify upload on server.');
      }

      setUploadStatus('SUCCESS');
      showToast(`Broadcast "${newTitle.trim()}" successfully uploaded and verified in Google Drive!`);
      await refreshMedia();

      setTimeout(() => {
        resetUploadModal();
      }, 1200);
    } catch (err: any) {
      setUploadStatus('ERROR');
      setUploadError(err.message || 'Upload failed');
      showToast(err.message || 'Upload failed');
    }
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      showToast('Only Super Admin can upload or publish video broadcasts.');
      return;
    }
    if (!newTitle.trim() || !newSummary.trim()) {
      showToast('Please provide broadcast title and summary.');
      return;
    }

    if (uploadSource === 'DRIVE_FILE') {
      if (!selectedFile && uploadStatus !== 'SUCCESS') {
        setUploadError('Please select or drop a video/audio file to upload.');
        return;
      }
      await executeDriveUpload();
    } else {
      // Validate external or YouTube URL
      if (!newUrl.trim()) {
        showToast('Please provide a valid stream or video URL.');
        return;
      }

      const val = validateMediaUrl(newUrl.trim());
      if (!val.isValid) {
        showToast(val.error || 'Invalid media URL');
        return;
      }

      const isLive = newBroadcastStatus === 'LIVE';
      const isUpcoming = newBroadcastStatus === 'UPCOMING';
      const bStatus = newBroadcastStatus === 'NONE' ? null : newBroadcastStatus;

      const detected = detectMediaConfig(newUrl.trim(), {
        explicitContentType: newType === 'PODCAST' || newType === 'LIVE_AUDIO' ? (isLive ? 'LIVE_AUDIO' : 'PODCAST') : (isLive ? 'LIVE_VIDEO' : 'VIDEO'),
        isLiveBroadcast: isLive,
        customThumbnail: urlValidation.thumbnail
      });

      const isAudio = newType === 'PODCAST' || newType === 'LIVE_AUDIO' || detected.contentType === 'PODCAST' || detected.contentType === 'LIVE_AUDIO';

      createMediaItem({
        title: newTitle.trim(),
        type: newType,
        contentType: detected.contentType,
        duration: isLive ? 'LIVE' : newDuration || '20:00',
        host: newHost.trim() || 'Swamy Reddy Javidi',
        videoUrl: !isAudio ? newUrl.trim() : undefined,
        audioUrl: isAudio ? newUrl.trim() : undefined,
        mediaUrl: newUrl.trim(),
        thumbnail:
          detected.thumbnailUrl ||
          (isAudio
            ? 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80'
            : 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80'),
        summary: newSummary.trim(),
        provider: detected.provider,
        providerVideoId: detected.providerVideoId,
        broadcastStatus: bStatus,
        scheduledStartTime: isUpcoming ? newScheduledTime : undefined,
        actualStartTime: isLive ? new Date().toISOString() : undefined,
        replayUrl: newReplayUrl.trim() || undefined,
        category: isAudio ? 'Builder MD Podcast' : 'Real Estate Intelligence'
      });

      resetUploadModal();
    }
  };

  const handleLike = async () => {
    if (!activeVideo) return;
    if (!isLoggedIn) {
      showToast('Please sign in to like this broadcast.');
      onOpenLoginModal?.();
      return;
    }

    try {
      const res = await fetch(`/api/media/${activeVideo.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setEngagement(prev => ({
          ...prev,
          hasLiked: data.liked,
          likesCount: data.count
        }));
        showToast(data.liked ? 'Liked broadcast!' : 'Removed from liked broadcasts');
      }
    } catch {
      showToast('Network error updating like');
    }
  };

  const handleRepost = async () => {
    if (!activeVideo) return;
    if (!isLoggedIn) {
      showToast('Please sign in to repost this broadcast.');
      onOpenLoginModal?.();
      return;
    }

    try {
      const res = await fetch(`/api/media/${activeVideo.id}/repost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        setEngagement(prev => ({
          ...prev,
          hasReposted: data.reposted,
          repostsCount: data.count
        }));
        showToast(data.reposted ? 'Broadcast reposted to your account feed!' : 'Removed from reposts');
      }
    } catch {
      showToast('Network error updating repost');
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVideo || !commentInput.trim()) return;

    if (!isLoggedIn) {
      showToast('Please sign in to join the conversation.');
      onOpenLoginModal?.();
      return;
    }

    try {
      const res = await fetch(`/api/media/${activeVideo.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: commentInput.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        const c = data.comment;
        const newComment: Comment = {
          id: c.id,
          authorName: c.author_name,
          authorRole: (c.author_role || '').replace('_', ' '),
          authorAvatar: c.author_avatar || '',
          text: c.text,
          timestamp: 'Just now',
          likes: 0
        };
        setComments(prev => [newComment, ...prev]);
        setEngagement(prev => ({ ...prev, commentsCount: prev.commentsCount + 1 }));
        setCommentInput('');
        showToast('Your comment has been posted!');
      }
    } catch {
      showToast('Network error posting comment');
    }
  };

  const handleShare = async () => {
    if (!activeVideo) return;
    try {
      await navigator.clipboard.writeText(window.location.href);
      showToast('Broadcast link copied to clipboard!');
      fetch(`/api/media/${activeVideo.id}/share`, { method: 'POST' })
        .then(res => res.json())
        .then(data => {
          if (data?.count) {
            setEngagement(prev => ({ ...prev, sharesCount: data.count }));
          }
        })
        .catch(() => {});
    } catch {
      showToast('Broadcast link ready to share: ' + window.location.href);
    }
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Platform Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold uppercase tracking-wider mb-2 font-mono">
            <Radio className="w-4 h-4 text-amber-400" />
            <span>MULTIMEDIA BROADCASTING & PODCAST NETWORK</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            Masterclasses, Podcasts & Live Broadcasts
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Hosted by <strong className="text-white">Swamy Reddy Javidi</strong>. Unbiased technical breakdowns, soil load certifications, candid builder leader interviews, and live audio/video telemetry.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {isSuperAdmin && (
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="px-4 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Post Video / Podcast Update</span>
            </button>
          )}

          <button
            onClick={handleEnquire}
            className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 active:scale-95 transition-all cursor-pointer"
          >
            <LifeBuoy className="w-4 h-4 text-amber-400" />
            <span>Enquire on Projects</span>
          </button>
        </div>
      </div>

      {/* Discovery Content Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {(
            [
              { key: 'ALL', label: 'All Content', icon: Video, isLivePulse: false },
              { key: 'VIDEOS', label: 'Videos', icon: Film, isLivePulse: false },
              { key: 'PODCASTS', label: 'Podcasts', icon: Headphones, isLivePulse: false },
              { key: 'LIVE_NOW', label: 'Live Now', icon: Radio, isLivePulse: true },
              { key: 'UPCOMING', label: 'Upcoming', icon: Calendar, isLivePulse: false },
              { key: 'RECORDED', label: 'Recorded', icon: Clock, isLivePulse: false }
            ] as const
          ).map(tab => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {tab.isLivePulse ? (
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                  </span>
                ) : (
                  <Icon className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span>
                  {tab.key === 'ALL'
                    ? 'All Media'
                    : tab.key === 'VIDEOS'
                    ? 'Videos'
                    : tab.key === 'PODCASTS'
                    ? 'Podcasts'
                    : tab.key === 'LIVE_NOW'
                    ? 'LIVE NOW'
                    : tab.key === 'UPCOMING'
                    ? 'UPCOMING'
                    : 'RECORDED'}
                </span>
              </button>
            );
          })}
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <span className="font-bold text-slate-900 font-mono">{filteredMedia.length}</span> items
        </div>
      </div>

      {/* Featured Showcase Broadcast Item */}
      {activeVideo ? (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Viewport Screen */}
            <div className="lg:col-span-8 bg-slate-950 relative aspect-video flex items-center justify-center group overflow-hidden">
              <img
                src={activeVideo.thumbnail}
                alt={activeVideo.title}
                className="w-full h-full object-cover opacity-85 group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-black/30" />

              {/* Live / Status Overlay Badges */}
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                {activeVideo.broadcastStatus === 'LIVE' || activeVideo.isLive ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-black uppercase tracking-wider font-mono shadow-md animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-white" />
                    LIVE BROADCAST
                  </span>
                ) : activeVideo.broadcastStatus === 'UPCOMING' ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold uppercase tracking-wider font-mono shadow-md">
                    <Calendar className="w-3 h-3" />
                    UPCOMING: {activeVideo.scheduledStartTime ? new Date(activeVideo.scheduledStartTime).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Scheduled'}
                  </span>
                ) : activeVideo.type === 'PODCAST' || activeVideo.contentType === 'PODCAST' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-600 text-white text-[11px] font-bold uppercase tracking-wider font-mono shadow-md">
                    <Headphones className="w-3 h-3" />
                    PODCAST EPISODE
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[11px] font-black uppercase tracking-wider font-mono shadow-md">
                    <Video className="w-3 h-3" />
                    {activeVideo.type || 'VIDEO'}
                  </span>
                )}
              </div>

              {/* Play Button Overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={() => setPlaybackMedia(activeVideo)}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-amber-500/95 text-slate-950 flex items-center justify-center shadow-2xl group-hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer"
                  title="Play Broadcast"
                >
                  <Play className="w-8 h-8 sm:w-10 sm:h-10 fill-current ml-1" />
                </button>
              </div>

              {/* Bottom Meta Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-white z-10 flex items-end justify-between">
                <div>
                  <span className="text-xs text-slate-300 font-mono">
                    {activeVideo.broadcastStatus === 'LIVE' ? 'Streaming Live' : activeVideo.duration}
                  </span>
                  <h2 className="text-base sm:text-xl font-black text-white mt-1 leading-snug">
                    {activeVideo.title}
                  </h2>
                </div>
              </div>
            </div>

            {/* Showcase Metadata & Interactive Toolbar */}
            <div className="lg:col-span-4 p-6 flex flex-col justify-between space-y-4 bg-slate-50/50 border-t lg:border-t-0 lg:border-l border-slate-200">
              <div className="space-y-4">
                <div>
                  <span className="text-xs text-slate-400 uppercase font-semibold">Broadcaster Desk:</span>
                  <div className="text-sm font-bold text-slate-900 mt-0.5">
                    {activeVideo.host} {activeVideo.guest && `with ${activeVideo.guest}`}
                  </div>
                  {activeVideo.guestTitle && <p className="text-xs text-slate-500">{activeVideo.guestTitle}</p>}
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{activeVideo.summary}</p>

                {activeVideo.replayUrl && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1.5">
                      <Film className="w-3.5 h-3.5 text-amber-600" />
                      Recorded Replay Available
                    </span>
                    <button
                      onClick={() =>
                        setPlaybackMedia({
                          ...activeVideo,
                          videoUrl: activeVideo.replayUrl,
                          mediaUrl: activeVideo.replayUrl,
                          broadcastStatus: 'ENDED'
                        })
                      }
                      className="text-xs font-bold text-amber-800 underline hover:text-amber-900"
                    >
                      Watch Official Broadcast Replay →
                    </button>
                  </div>
                )}
              </div>

              {/* Toolbar */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleLike}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      engagement.hasLiked
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={engagement.hasLiked ? 'Liked' : 'Like Broadcast'}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${engagement.hasLiked ? 'fill-current text-amber-600' : ''}`} />
                    <span>{engagement.likesCount}</span>
                  </button>

                  <button
                    onClick={handleRepost}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      engagement.hasReposted
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs'
                        : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                    title={engagement.hasReposted ? 'Reposted' : 'Repost Broadcast'}
                  >
                    <Repeat className="w-3.5 h-3.5" />
                    <span>{engagement.hasReposted ? 'Reposted' : 'Repost'}</span>
                    {engagement.repostsCount > 0 && <span className="text-[10px] font-mono ml-0.5">({engagement.repostsCount})</span>}
                  </button>

                  <button
                    onClick={handleShare}
                    className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                    title="Share Broadcast Link"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Share</span>
                    {engagement.sharesCount > 0 && <span className="text-[10px] font-mono text-slate-400">({engagement.sharesCount})</span>}
                  </button>
                </div>

                {isSuperAdmin && (
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

          {/* Discussion */}
          <div className="p-6 border-t border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-slate-500" />
              <span>Discussion & Live Questions ({comments.length})</span>
            </h3>

            <form onSubmit={handleCommentSubmit} className="flex gap-2">
              <input
                type="text"
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                placeholder="Ask technical question or comment on this broadcast..."
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Post</span>
              </button>
            </form>

            <div className="space-y-3 pt-2">
              {comments.map(c => (
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
              {isSuperAdmin ? 'Super Admin Broadcast Studio' : 'No Video Broadcasts Published Yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              {isSuperAdmin
                ? 'You have Super Admin broadcasting privileges. Click below to publish the first official broadcast.'
                : 'Check back soon for upcoming masterclasses and builder podcasts hosted by Swamy Reddy Javidi.'}
            </p>
          </div>
        </div>
      )}

      {/* Grid of Broadcasts & Episodes */}
      {filteredMedia.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 font-display">
            Multimedia Library ({filteredMedia.length})
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMedia.map(item => {
              const isPodcast = item.type === 'PODCAST' || item.contentType === 'PODCAST';
              const isLive = item.broadcastStatus === 'LIVE' || item.isLive || item.type === 'LIVE_VIDEO' || item.type === 'LIVE_AUDIO';
              const isUpcoming = item.broadcastStatus === 'UPCOMING';

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedMedia(item);
                    setPlaybackMedia(item);
                  }}
                  className={`group cursor-pointer bg-white rounded-2xl border transition-all overflow-hidden flex flex-col justify-between hover:shadow-md ${
                    activeVideo?.id === item.id ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Media Card Thumbnail Viewport */}
                    <div className="relative aspect-video bg-slate-950 overflow-hidden">
                      <img
                        src={item.thumbnail}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />

                      {/* Top Badges */}
                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        {isLive ? (
                          <span className="flex items-center gap-1 text-[10px] font-black uppercase bg-red-600 text-white px-2 py-0.5 rounded font-mono shadow-sm animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                            LIVE
                          </span>
                        ) : isUpcoming ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-600 text-white px-2 py-0.5 rounded font-mono shadow-sm">
                            <Calendar className="w-2.5 h-2.5" />
                            UPCOMING
                          </span>
                        ) : isPodcast ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold uppercase bg-violet-600 text-white px-2 py-0.5 rounded font-mono shadow-sm">
                            <Headphones className="w-2.5 h-2.5" />
                            PODCAST
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase bg-slate-900/90 text-amber-400 px-2 py-0.5 rounded font-mono">
                            {item.type}
                          </span>
                        )}
                      </div>

                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                        <div className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                          <Play className="w-6 h-6 fill-current ml-0.5" />
                        </div>
                      </div>

                      {/* Bottom Duration Badge */}
                      <span className="absolute bottom-2 right-2 text-[10px] font-mono bg-black/80 text-white px-1.5 py-0.5 rounded">
                        {isLive ? 'LIVE' : item.duration}
                      </span>
                    </div>

                    <div className="p-4 space-y-1.5">
                      <h4 className="text-sm font-bold text-slate-900 group-hover:text-amber-700 transition-colors line-clamp-2 leading-snug">
                        {item.title}
                      </h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{item.summary}</p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 mt-2">
                    <span>
                      {isUpcoming && item.scheduledStartTime
                        ? new Date(item.scheduledStartTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : item.publishedDate}
                    </span>
                    <span className="text-amber-700 font-semibold group-hover:underline">
                      {isPodcast ? 'Listen Episode →' : 'Watch Broadcast →'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* UNIFIED MEDIA MODAL (Consistent Playback Screen) */}
      {playbackMedia && (
        <UnifiedMediaModal
          media={playbackMedia}
          onClose={() => setPlaybackMedia(null)}
          onTriggerSupport={() => {
            const ctx = `${playbackMedia.title} (Broadcast by ${playbackMedia.host})`;
            setPlaybackMedia(null);
            onTriggerSupportWithContext?.(ctx);
          }}
        />
      )}

      {/* MODAL: POST / BROADCAST CREATOR (Super Admin Only) */}
      {isPostModalOpen && isSuperAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between sticky top-0 z-10 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                  <Radio className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Multimedia Broadcast & Podcast Publishing Desk
                  </h3>
                  <p className="text-[11px] text-slate-400">YouTube, Podcasts, Live Telecasts & Google Drive Uploads</p>
                </div>
              </div>
              <button onClick={resetUploadModal} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="p-6 space-y-4 text-xs">
              {/* Media Ingestion Option */}
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Source & Provider Option</label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-xl text-center">
                  <button
                    type="button"
                    onClick={() => { setUploadSource('YOUTUBE'); handleUrlChange(newUrl); }}
                    className={`py-2 px-2 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                      uploadSource === 'YOUTUBE' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Video className="w-3.5 h-3.5 text-red-500" />
                    <span>YouTube (Video/Live)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUploadSource('DRIVE_FILE'); setUploadError(null); }}
                    className={`py-2 px-2 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                      uploadSource === 'DRIVE_FILE' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <UploadCloud className="w-3.5 h-3.5 text-amber-500" />
                    <span>Google Drive File</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setUploadSource('EXTERNAL_STREAM'); handleUrlChange(newUrl); }}
                    className={`py-2 px-2 rounded-lg font-bold flex flex-col sm:flex-row items-center justify-center gap-1.5 transition ${
                      uploadSource === 'EXTERNAL_STREAM' ? 'bg-white text-slate-900 shadow-xs border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Radio className="w-3.5 h-3.5 text-blue-500" />
                    <span>External Stream / HLS</span>
                  </button>
                </div>
              </div>

              {/* Source-specific input */}
              {uploadSource === 'DRIVE_FILE' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Media File <span className="font-normal text-slate-500">(Video max 500 MB, Audio max 100 MB)</span>
                  </label>
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                      e.preventDefault();
                      setIsDragging(false);
                      if (e.dataTransfer.files?.[0]) validateAndSelectFile(e.dataTransfer.files[0]);
                    }}
                    className={`border-2 border-dashed rounded-2xl p-5 text-center transition cursor-pointer ${
                      isDragging
                        ? 'border-amber-500 bg-amber-50/50'
                        : selectedFile
                        ? 'border-emerald-400 bg-emerald-50/30'
                        : 'border-slate-300 hover:border-slate-400 bg-slate-50/50'
                    }`}
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp3,audio/wav,audio/aac,audio/m4a,audio/ogg';
                      input.onchange = e => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) validateAndSelectFile(file);
                      };
                      input.click();
                    }}
                  >
                    {selectedFile ? (
                      <div className="flex items-center justify-between gap-3 text-left">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                            <FileVideo className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 truncate max-w-xs">{selectedFile.name}</p>
                            <p className="text-[11px] text-slate-500">
                              {(selectedFile.size / 1024 / 1024).toFixed(1)} MB • {selectedFile.type || 'Media File'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); setSelectedFile(null); }}
                          className="px-2.5 py-1 text-slate-500 hover:text-red-600 rounded-lg text-xs font-bold"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                          <UploadCloud className="w-5 h-5 text-slate-700" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Drag & drop video/audio here, or <span className="text-amber-600 underline">browse</span></p>
                          <p className="text-[11px] text-slate-500">MP4, WebM, MOV, MP3, WAV, AAC, M4A</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {uploadStatus !== 'IDLE' && (
                    <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-800">
                          {uploadStatus === 'GETTING_INTENT' && <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />}
                          {uploadStatus === 'UPLOADING' && <UploadCloud className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                          {uploadStatus === 'VERIFYING' && <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin" />}
                          {uploadStatus === 'SUCCESS' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                          {uploadStatus === 'ERROR' && <AlertCircle className="w-3.5 h-3.5 text-red-600" />}
                          <span>
                            {uploadStatus === 'GETTING_INTENT' && 'Initializing secure Google Drive upload session...'}
                            {uploadStatus === 'UPLOADING' && `Uploading directly to Google Drive... ${uploadProgress}%`}
                            {uploadStatus === 'VERIFYING' && 'Verifying uploaded file in Google Drive...'}
                            {uploadStatus === 'SUCCESS' && 'Verified & successfully published to Google Drive!'}
                            {uploadStatus === 'ERROR' && 'Upload error occurred'}
                          </span>
                        </span>
                        <span className="text-slate-600 font-mono">{uploadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            uploadStatus === 'SUCCESS' ? 'bg-emerald-500' : uploadStatus === 'ERROR' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {uploadError && (
                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                        <span>{uploadError}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    {uploadSource === 'YOUTUBE' ? 'YouTube Video / Live / Shorts URL' : 'External Stream URL (.m3u8, HLS, or Audio Stream)'}
                  </label>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={e => handleUrlChange(e.target.value)}
                    placeholder={
                      uploadSource === 'YOUTUBE'
                        ? 'https://www.youtube.com/watch?v=... or https://youtube.com/live/...'
                        : 'https://stream.example.com/live/stream.m3u8'
                    }
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono text-xs"
                    required
                  />

                  {uploadSource === 'EXTERNAL_STREAM' && (
                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1">
                      <div className="font-bold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>External Stream Delivery Notice</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed">
                        Property Studio delivers authorized HLS (.m3u8) or audio playback streams. RTMP ingestion requires a dedicated broadcast cluster and cannot be played directly in browser players.
                      </p>
                    </div>
                  )}

                  {!urlValidation.isValid && urlValidation.message && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{urlValidation.message}</span>
                    </p>
                  )}

                  {urlValidation.thumbnail && (
                    <div className="mt-2 flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <img src={urlValidation.thumbnail} alt="Thumbnail preview" className="w-16 h-10 object-cover rounded-lg" />
                      <div className="text-[11px]">
                        <p className="font-bold text-slate-800">YouTube Thumbnail Verified</p>
                        <p className="text-slate-500">Auto-extracted from video ID</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Title & Category */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Broadcast / Episode Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Hyderabad Western Corridor Infrastructure Audit 2026"
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Content Type</label>
                  <select
                    value={newType}
                    onChange={e => setNewType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="MASTERCLASS">Masterclass (Video)</option>
                    <option value="PODCAST">Builder MD Podcast (Audio)</option>
                    <option value="PROJECT_WALKTHROUGH">Site & Engineering Audit</option>
                    <option value="LIVE_VIDEO">Live Video Stream</option>
                    <option value="LIVE_AUDIO">Live Audio Podcast</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Broadcast Status</label>
                  <select
                    value={newBroadcastStatus}
                    onChange={e => setNewBroadcastStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-bold"
                  >
                    <option value="NONE">Standard / On-Demand</option>
                    <option value="LIVE">🔴 LIVE NOW</option>
                    <option value="UPCOMING">📅 Upcoming / Scheduled</option>
                    <option value="ENDED">Ended (Recording)</option>
                  </select>
                </div>
              </div>

              {/* Upcoming Scheduled Time if applicable */}
              {newBroadcastStatus === 'UPCOMING' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Scheduled Broadcast Start Time</label>
                  <input
                    type="datetime-local"
                    value={newScheduledTime}
                    onChange={e => setNewScheduledTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    required={newBroadcastStatus === 'UPCOMING'}
                  />
                </div>
              )}

              {/* Ended Replay URL if applicable */}
              {newBroadcastStatus === 'ENDED' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Replay URL (Optional)</label>
                  <input
                    type="url"
                    value={newReplayUrl}
                    onChange={e => setNewReplayUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=... or replay link"
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
              )}

              {/* Host & Duration */}
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="block font-bold text-slate-700 mb-1">Duration</label>
                  <input
                    type="text"
                    value={newDuration}
                    onChange={e => setNewDuration(e.target.value)}
                    placeholder="e.g. 28:40"
                    disabled={newBroadcastStatus === 'LIVE'}
                    className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Summary & Technical Scope</label>
                <textarea
                  value={newSummary}
                  onChange={e => setNewSummary(e.target.value)}
                  rows={3}
                  placeholder="Summary of topics, technical verifications, or guest highlights..."
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              {/* Footer */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={resetUploadModal}
                  disabled={uploadStatus === 'UPLOADING' || uploadStatus === 'VERIFYING'}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 disabled:opacity-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(uploadStatus === 'UPLOADING' || uploadStatus === 'VERIFYING') || (!urlValidation.isValid && uploadSource !== 'DRIVE_FILE')}
                  className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-sm transition"
                >
                  {uploadStatus === 'UPLOADING' || uploadStatus === 'VERIFYING' ? (
                    <>
                      <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                      <span>{uploadStatus === 'UPLOADING' ? `Uploading (${uploadProgress}%)` : 'Verifying Drive File...'}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-amber-400" />
                      <span>{uploadSource === 'DRIVE_FILE' ? 'Upload & Publish' : 'Publish Broadcast'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * UNIFIED MEDIA MODAL COMPONENT
 * Provides a responsive, consistent playback modal for:
 * - YouTube Standard / Shorts / Live
 * - Native HTML5 Video
 * - Dedicated Podcast Audio Player (Seek bar, volume, speeds 0.75x-2x)
 * - Live Audio Broadcast (Pulsing live badge, no fake seek, reconnection state)
 * - Supported HLS streams
 * - Fallback for unsupported embeds
 */
const UnifiedMediaModal: React.FC<{
  media: MediaItem;
  onClose: () => void;
  onTriggerSupport: () => void;
}> = ({ media, onClose, onTriggerSupport }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const rawUrl = media.videoUrl || media.mediaUrl || media.audioUrl || '';
  const yt = parseYouTubeUrl(rawUrl);

  const isYouTube = yt.isValid && Boolean(yt.videoId);
  const isPodcast = media.type === 'PODCAST' || media.contentType === 'PODCAST';
  const isLiveAudio = media.type === 'LIVE_AUDIO' || media.contentType === 'LIVE_AUDIO';
  const isAudioPlayer = isPodcast || isLiveAudio;
  const isLive = media.broadcastStatus === 'LIVE' || media.isLive || isLiveAudio || media.type === 'LIVE_VIDEO';
  const isHls = rawUrl.includes('.m3u8') || media.provider === 'EXTERNAL_HLS';

  // Audio Player State
  const [isPlaying, setIsPlaying] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioError, setAudioError] = useState<string | null>(null);

  // HLS & Video state
  const [hlsMode, setHlsMode] = useState<'NATIVE' | 'MSE' | 'UNSUPPORTED' | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Initialize HLS for Native vs MediaSource (MSE)
  useEffect(() => {
    if (!isHls || !videoRef.current) return;
    const video = videoRef.current;

    // 1. Native HLS support (Safari, iOS, Android WebKit)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = rawUrl;
      setHlsMode('NATIVE');
      return;
    }

    // 2. MediaSource Extensions (MSE) support (Desktop Chrome, Edge, Firefox)
    if ('MediaSource' in window) {
      let isMounted = true;
      let hlsInstance: any = null;

      const initHls = async () => {
        try {
          if (!(window as any).Hls) {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/hls.js@1';
            script.async = true;
            document.head.appendChild(script);
            await new Promise((res, rej) => {
              script.onload = res;
              script.onerror = rej;
            });
          }

          if (isMounted && (window as any).Hls && (window as any).Hls.isSupported()) {
            hlsInstance = new (window as any).Hls();
            hlsInstance.loadSource(rawUrl);
            hlsInstance.attachMedia(video);
            hlsInstance.on((window as any).Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => {});
            });
            hlsInstance.on((window as any).Hls.Events.ERROR, (_event: any, data: any) => {
              if (data?.fatal) {
                setVideoError('HLS stream encountered network error or disconnected.');
              }
            });
            setHlsMode('MSE');
          } else {
            setHlsMode('UNSUPPORTED');
          }
        } catch {
          if (isMounted) setHlsMode('UNSUPPORTED');
        }
      };

      initHls();

      return () => {
        isMounted = false;
        if (hlsInstance) hlsInstance.destroy();
      };
    } else {
      setHlsMode('UNSUPPORTED');
    }
  }, [isHls, rawUrl]);

  // Stop all playback immediately on unmount (modal close or browser back navigation)
  useEffect(() => {
    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Audio Play / Pause
  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(e => setAudioError(e.message));
    }
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const targetTime = Number(e.target.value);
    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
      if (val === 0) setIsMuted(true);
      else setIsMuted(false);
    }
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (isMuted) {
      audioRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        ref={containerRef}
        className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
            {isLive ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[10px] sm:text-xs font-black uppercase font-mono tracking-wider shrink-0 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                LIVE
              </span>
            ) : isAudioPlayer ? (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-600 text-white text-[10px] sm:text-xs font-bold uppercase font-mono tracking-wider shrink-0">
                <Headphones className="w-3.5 h-3.5" />
                PODCAST
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500 text-slate-950 text-[10px] sm:text-xs font-black uppercase font-mono tracking-wider shrink-0">
                <Video className="w-3.5 h-3.5" />
                VIDEO
              </span>
            )}
            <h3 className="text-sm sm:text-base font-bold text-white truncate font-display">
              {media.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={toggleFullscreen}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              title="Close Player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Player Body */}
        <div className="flex-1 bg-black flex flex-col items-center justify-center relative min-h-[300px] overflow-hidden">
          {/* 1. YOUTUBE PLAYER */}
          {isYouTube ? (
            <div className="w-full h-full aspect-video max-h-[70vh] relative">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${yt.videoId}?autoplay=1&enablejsapi=1&rel=0`}
                title={media.title}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          ) : isAudioPlayer ? (
            /* 2. DEDICATED PODCAST & LIVE AUDIO PLAYER */
            <div className="w-full max-w-xl p-6 sm:p-8 space-y-6 text-center">
              <audio
                ref={audioRef}
                src={media.audioUrl || media.mediaUrl || media.videoUrl}
                autoPlay
                onTimeUpdate={() => {
                  if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
                }}
                onLoadedMetadata={() => {
                  if (audioRef.current && !isLiveAudio) {
                    setAudioDuration(audioRef.current.duration);
                  }
                }}
                onEnded={() => setIsPlaying(false)}
                onError={() => setAudioError('Audio stream connection dropped or format unsupported.')}
              />

              {/* Artwork */}
              <div className="relative w-36 h-36 sm:w-44 sm:h-44 mx-auto rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-700/80">
                <img
                  src={media.thumbnail || 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80'}
                  alt={media.title}
                  className="w-full h-full object-cover"
                />
                {isLiveAudio && (
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-red-600 text-white text-[9px] font-black uppercase font-mono animate-pulse">
                    LIVE
                  </span>
                )}
              </div>

              {/* Title & Host info */}
              <div className="space-y-1">
                <h4 className="text-base sm:text-lg font-bold text-white line-clamp-2">{media.title}</h4>
                <p className="text-xs text-slate-400">
                  Host: <strong className="text-slate-200">{media.host}</strong> {media.guest && `• Guest: ${media.guest}`}
                </p>
              </div>

              {/* Error banner with retry */}
              {audioError && (
                <div className="p-3 bg-red-950/70 border border-red-800 rounded-xl text-red-300 text-xs flex items-center justify-between gap-2">
                  <span>{audioError}</span>
                  <button
                    onClick={() => {
                      setAudioError(null);
                      if (audioRef.current) {
                        audioRef.current.load();
                        audioRef.current.play().catch(() => {});
                      }
                    }}
                    className="px-2.5 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 shrink-0"
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Seek Timeline (Only for Recorded Podcasts, NEVER for Live Audio) */}
              {!isLiveAudio ? (
                <div className="space-y-1.5">
                  <input
                    type="range"
                    min={0}
                    max={audioDuration || 100}
                    value={currentTime}
                    onChange={handleAudioSeek}
                    className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
                  />
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(audioDuration || 0)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-2 px-4 rounded-xl bg-slate-800/80 border border-slate-700 inline-flex items-center gap-2 text-xs font-mono text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE BROADCAST TELEMETRY ACTIVE • NO BUFFER LATENCY</span>
                </div>
              )}

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-6">
                <button
                  onClick={toggleAudioPlay}
                  className="w-14 h-14 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition cursor-pointer"
                >
                  {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-0.5" />}
                </button>
              </div>

              {/* Volume & Speed Controls (Recorded episodes) */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 text-xs">
                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <button onClick={toggleMute} className="text-slate-400 hover:text-white transition">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-amber-500 cursor-pointer h-1 bg-slate-700 rounded-lg"
                  />
                </div>

                {/* Playback Speed Toggles */}
                {!isLiveAudio && (
                  <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
                    {([0.75, 1, 1.25, 1.5, 2] as const).map(speed => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                          playbackSpeed === speed ? 'bg-amber-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* 3. NATIVE HTML5 VIDEO / HLS PLAYER */
            <div className="w-full h-full max-h-[70vh] flex flex-col items-center justify-center bg-black relative">
              <video
                ref={videoRef}
                src={!isHls ? (media.videoUrl || media.mediaUrl) : undefined}
                controls
                autoPlay
                playsInline
                onError={() => {
                  if (!isHls) setVideoError('Video source could not be decoded or loaded.');
                }}
                className="w-full h-full object-contain max-h-[70vh]"
              />

              {isHls && hlsMode && (
                <div className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1.5 shadow-md">
                  <span className={`w-1.5 h-1.5 rounded-full ${hlsMode === 'UNSUPPORTED' ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
                  <span>{hlsMode === 'NATIVE' ? 'Native HLS' : hlsMode === 'MSE' ? 'MSE HLS Engine' : 'Stream Link Mode'}</span>
                </div>
              )}

              {videoError && (
                <div className="absolute inset-0 bg-slate-950/90 flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <AlertCircle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm font-bold text-white">Stream Playback Notice</p>
                  <p className="text-xs text-slate-400 max-w-md">{videoError}</p>
                  {rawUrl.startsWith('http') && (
                    <a
                      href={rawUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-2"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Open in Native Player / VLC</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer & Fallback Link */}
        <div className="p-4 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 text-slate-400">
            {isYouTube && (
              <a
                href={yt.watchUrl || `https://www.youtube.com/watch?v=${yt.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 underline"
              >
                <span>If video is restricted, Watch on YouTube</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            {!isYouTube && rawUrl.startsWith('http') && (
              <a
                href={rawUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-300 hover:text-white font-semibold flex items-center gap-1.5"
              >
                <span>Open Direct Source Stream</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onTriggerSupport}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-bold flex items-center gap-1.5 transition"
            >
              <LifeBuoy className="w-3.5 h-3.5" />
              <span>Enquire with Host</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-white text-slate-900 hover:bg-slate-100 rounded-lg font-bold transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
