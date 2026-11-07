import React, { useState, useRef } from 'react';
import { CommunityHub } from '../../types';
import { parseYouTubeUrl } from '../../shared/mediaParser';
import {
  X,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Building,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Shield,
  Image as ImageIcon,
  Link2,
  Video,
  FileVideo,
  Globe,
  Lock,
  ExternalLink,
  Trash2
} from 'lucide-react';

export type ComposerMode = 'POST' | 'QUESTION' | 'IMAGE' | 'VIDEO' | 'LINK' | 'COMMUNITY' | 'DISCUSSION' | 'UPDATE';

interface PostComposerProps {
  isOpen: boolean;
  initialMode?: ComposerMode;
  onClose: () => void;
  communities: CommunityHub[];
  currentUser: any;
  onSubmitPost: (postData: any) => Promise<{ success: boolean; error?: string }>;
  onSubmitCommunity?: (commData: any) => Promise<{ success: boolean; message?: string; error?: string }>;
  onSuccess: (msg: string) => void;
}

const TOPIC_OPTIONS = [
  'General Discussion',
  'Kokapet & Neopolis',
  'Construction Updates',
  'Legal & RERA',
  'Rental Yield & ROI',
  'Luxury Villas & Communities',
  'Architecture & Vaastu',
  'Interior Design & Renovation',
  'Land & Plotting Guidelines',
  'Price Trends & Market Updates'
];

type PostTab = 'POST' | 'IMAGE' | 'VIDEO' | 'LINK' | 'COMMUNITY';

export const PostComposer: React.FC<PostComposerProps> = ({
  isOpen,
  initialMode = 'POST',
  onClose,
  communities,
  currentUser,
  onSubmitPost,
  onSubmitCommunity,
  onSuccess
}) => {
  // Map legacy initial modes to the standard tabs
  const getInitialTab = (mode: ComposerMode): PostTab => {
    if (mode === 'COMMUNITY') return 'COMMUNITY';
    if (mode === 'IMAGE') return 'IMAGE';
    if (mode === 'VIDEO') return 'VIDEO';
    if (mode === 'LINK') return 'LINK';
    return 'POST';
  };

  const [activeTab, setActiveTab] = useState<PostTab>(getInitialTab(initialMode));
  const [isQuestionMode, setIsQuestionMode] = useState(initialMode === 'QUESTION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(TOPIC_OPTIONS[0]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Image Upload state (for all users)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Video Link state (for all users)
  const [videoLinkUrl, setVideoLinkUrl] = useState('');
  const [videoSubTab, setVideoSubTab] = useState<'LINK' | 'UPLOAD'>('LINK');

  // Video File Upload state (SUPER_ADMIN only)
  const [videoDataUrl, setVideoDataUrl] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Link Post state (for all users)
  const [linkUrl, setLinkUrl] = useState('');

  // Community creation state
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCategory, setCommCategory] = useState('Micro-Market Hub');
  const [commLocation, setCommLocation] = useState('Hyderabad, Telangana');

  if (!isOpen) return null;

  const isSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
  const approvedCommunities = (communities || []).filter(c => c.status === 'APPROVED');

  // Handle image file selection
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please select a valid image file (PNG, JPG, WEBP, GIF).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Image size cannot exceed 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUrl(reader.result as string);
      setImageFileName(file.name);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // Handle direct video file selection (Super Admin only)
  const handleVideoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isSuperAdmin) {
      setErrorMsg('Direct video file upload is exclusively reserved for Super Admin platform broadcasts.');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setErrorMsg('Please select a valid video file (MP4, WebM, MOV).');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('Video file size cannot exceed 50MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setVideoDataUrl(reader.result as string);
      setVideoFileName(file.name);
      setErrorMsg(null);
    };
    reader.readAsDataURL(file);
  };

  // YouTube live embed helper
  const parsedYouTube = videoLinkUrl ? parseYouTubeUrl(videoLinkUrl) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    // 1. COMMUNITY CREATION SUBMISSION
    if (activeTab === 'COMMUNITY') {
      if (!commName.trim() || commName.trim().length < 3) {
        setErrorMsg('Community name must be at least 3 characters.');
        return;
      }
      if (!commDesc.trim() || commDesc.trim().length < 10) {
        setErrorMsg('Please provide a community description of at least 10 characters.');
        return;
      }
      setSubmitting(true);
      try {
        if (!onSubmitCommunity) throw new Error('Community creation is not available.');
        const res = await onSubmitCommunity({
          name: commName.trim(),
          description: commDesc.trim(),
          category: commCategory,
          location: commLocation.trim(),
          visibility: 'PUBLIC'
        });
        if (!res.success) throw new Error(res.error || 'Failed to submit community proposal.');
        onSuccess(res.message || 'Community proposal submitted for Super Admin review!');
        onClose();
      } catch (err: any) {
        setErrorMsg(err.message || 'Failed to propose community.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // 2. STANDARD POST VALIDATION
    const cleanTitle = title.trim();
    if (!cleanTitle || cleanTitle.length < 5) {
      setErrorMsg('Please enter a descriptive post title of at least 5 characters.');
      return;
    }

    // Tab-specific validation
    if (activeTab === 'POST') {
      if (!content.trim() || content.trim().length < 10) {
        setErrorMsg('Please write at least 10 characters in the post body.');
        return;
      }
    } else if (activeTab === 'IMAGE') {
      if (!imageDataUrl) {
        setErrorMsg('Please select or upload an image.');
        return;
      }
    } else if (activeTab === 'VIDEO') {
      if (videoSubTab === 'LINK') {
        if (!videoLinkUrl.trim()) {
          setErrorMsg('Please enter a video link URL (YouTube, Vimeo, etc.).');
          return;
        }
      } else {
        if (!isSuperAdmin) {
          setErrorMsg('Direct video file upload is exclusively reserved for Super Admin accounts.');
          return;
        }
        if (!videoDataUrl) {
          setErrorMsg('Please upload a video file.');
          return;
        }
      }
    } else if (activeTab === 'LINK') {
      if (!linkUrl.trim() || !/^https?:\/\//i.test(linkUrl.trim())) {
        setErrorMsg('Please enter a valid link URL starting with http:// or https://');
        return;
      }
    }

    setSubmitting(true);
    try {
      const chosenComm = approvedCommunities.find(c => c.id === selectedCommunityId);

      const postPayload: any = {
        title: cleanTitle,
        topic: selectedTopic,
        postType: isQuestionMode ? 'QUESTION' : 'POST',
        communityId: selectedCommunityId || undefined,
        communityName: chosenComm?.name || undefined,
        authorName: currentUser.name || 'Member',
        authorRole: currentUser.role || 'PROPERTY_SEEKER',
        authorProfession: currentUser.profession || undefined
      };

      if (activeTab === 'POST') {
        postPayload.content = content.trim();
        postPayload.mediaType = 'POST';
      } else if (activeTab === 'IMAGE') {
        postPayload.content = content.trim() || cleanTitle;
        postPayload.mediaType = 'IMAGE';
        postPayload.mediaUrl = imageDataUrl;
        postPayload.attachments = [
          {
            type: 'image',
            url: imageDataUrl,
            name: imageFileName || 'Uploaded Image'
          }
        ];
      } else if (activeTab === 'VIDEO') {
        postPayload.content = content.trim() || cleanTitle;
        postPayload.mediaType = 'VIDEO';
        if (videoSubTab === 'LINK') {
          postPayload.mediaUrl = videoLinkUrl.trim();
        } else {
          // Direct file upload by Super Admin
          postPayload.mediaUrl = videoDataUrl;
        }
      } else if (activeTab === 'LINK') {
        postPayload.content = content.trim() || `Link: ${linkUrl.trim()}`;
        postPayload.mediaType = 'POST';
        postPayload.links = [
          {
            url: linkUrl.trim(),
            title: cleanTitle
          }
        ];
      }

      const res = await onSubmitPost(postPayload);
      if (!res.success) throw new Error(res.error || 'Failed to publish post.');

      onSuccess(
        isQuestionMode
          ? 'Question published to community feed!'
          : activeTab === 'IMAGE'
          ? 'Image post published!'
          : activeTab === 'VIDEO'
          ? 'Video post published!'
          : activeTab === 'LINK'
          ? 'Link post published!'
          : 'Discussion published to community feed!'
      );
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to publish content.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-slate-200">
        {/* Header */}
        <div
          className="px-6 py-4 flex items-center justify-between border-b border-slate-100"
          style={{ background: 'linear-gradient(135deg, #182A3E 0%, #203750 100%)' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-white/10 rounded-xl text-amber-400">
              {activeTab === 'COMMUNITY' ? (
                <Building className="w-5 h-5" />
              ) : activeTab === 'IMAGE' ? (
                <ImageIcon className="w-5 h-5" />
              ) : activeTab === 'VIDEO' ? (
                <Video className="w-5 h-5" />
              ) : activeTab === 'LINK' ? (
                <Link2 className="w-5 h-5" />
              ) : isQuestionMode ? (
                <HelpCircle className="w-5 h-5" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white">
                {activeTab === 'COMMUNITY'
                  ? 'Start a Community Hub'
                  : activeTab === 'IMAGE'
                  ? 'Upload Image Post'
                  : activeTab === 'VIDEO'
                  ? 'Share Video'
                  : activeTab === 'LINK'
                  ? 'Share Link'
                  : isQuestionMode
                  ? 'Ask the Community'
                  : 'Create a Post'}
              </h2>
              <p className="text-[11px] text-slate-300">
                Property Studio Verified Community Platform
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Reddit-Style Format Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200 overflow-x-auto text-xs">
          {[
            { id: 'POST' as const, label: 'Post', icon: MessageSquare },
            { id: 'IMAGE' as const, label: 'Images', icon: ImageIcon },
            { id: 'VIDEO' as const, label: 'Video', icon: Video },
            { id: 'LINK' as const, label: 'Link', icon: Link2 },
            { id: 'COMMUNITY' as const, label: 'Start Community', icon: Building }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setErrorMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-[#182A3E] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {activeTab === 'COMMUNITY' ? (
            /* Community Hub Creation Form */
            <div className="space-y-3.5">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Community Hub Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={commName}
                  onChange={e => setCommName(e.target.value)}
                  placeholder="e.g. Kokapet High-Rise Investors, Financial District Commercial"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Hub Category</label>
                  <select
                    value={commCategory}
                    onChange={e => setCommCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="Micro-Market Hub">Micro-Market Hub</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Luxury Villas & Communities">Luxury Villas & Communities</option>
                    <option value="Legal & RERA">Legal & RERA Advisory</option>
                    <option value="Investor Syndicate">Investor Syndicate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operating Micro-Market</label>
                  <input
                    type="text"
                    value={commLocation}
                    onChange={e => setCommLocation(e.target.value)}
                    placeholder="e.g. Kokapet, Tellapur, Neopolis"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Community Description & Charter <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={commDesc}
                  onChange={e => setCommDesc(e.target.value)}
                  placeholder="Outline the charter, who should join, and key topics discussed..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                  required
                />
              </div>
            </div>
          ) : (
            /* Post / Image / Video / Link Form */
            <div className="space-y-3.5">
              {/* Community & Topic Flair */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Select Community <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={selectedCommunityId}
                    onChange={e => setSelectedCommunityId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="">General Feed (All Communities)</option>
                    {approvedCommunities.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Topic Flair <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedTopic}
                    onChange={e => setSelectedTopic(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    {TOPIC_OPTIONS.map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    Title <span className="text-red-500">*</span>
                  </label>
                  {activeTab === 'POST' && (
                    <label className="flex items-center gap-1.5 text-[11px] text-slate-500 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isQuestionMode}
                        onChange={e => setIsQuestionMode(e.target.checked)}
                        className="rounded text-[#B49029] focus:ring-amber-500"
                      />
                      <span>Mark as Question</span>
                    </label>
                  )}
                </div>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={
                    activeTab === 'IMAGE'
                      ? 'Descriptive title for your image post...'
                      : activeTab === 'VIDEO'
                      ? 'Descriptive title for your video...'
                      : activeTab === 'LINK'
                      ? 'Title for the shared link...'
                      : isQuestionMode
                      ? 'What is your real estate question? (e.g. Kokapet vs Tellapur ROI)'
                      : 'Interesting title for your discussion...'
                  }
                  className="w-full px-3 py-2.5 text-xs font-semibold text-slate-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  required
                />
              </div>

              {/* TAB 1: TEXT POST */}
              {activeTab === 'POST' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Content Details <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Share insights, numbers, analysis, or questions with the community..."
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none leading-relaxed"
                    required
                  />
                </div>
              )}

              {/* TAB 2: IMAGE UPLOAD (EVERYONE) */}
              {activeTab === 'IMAGE' && (
                <div className="space-y-3">
                  <label className="block font-bold text-slate-700 mb-1">
                    Upload Image <span className="text-red-500">*</span>
                  </label>

                  {imageDataUrl ? (
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 max-h-72 flex items-center justify-center">
                      <img
                        src={imageDataUrl}
                        alt="Uploaded preview"
                        className="max-h-72 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImageDataUrl(null);
                          setImageFileName(null);
                          if (imageInputRef.current) imageInputRef.current.value = '';
                        }}
                        className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => imageInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 hover:border-[#B49029] bg-slate-50/70 hover:bg-amber-50/20 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#B49029] border border-amber-200 flex items-center justify-center mx-auto">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">
                          Click to upload or drag & drop image
                        </p>
                        <p className="text-[11px] text-slate-400">
                          PNG, JPG, WEBP, GIF up to 5MB (Open to all members)
                        </p>
                      </div>
                    </div>
                  )}

                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileChange}
                    className="hidden"
                  />

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Caption / Commentary <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Add context, site visit details, or explanation for the image..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: VIDEO (LINKS FOR EVERYONE; UPLOAD FOR SUPER_ADMIN) */}
              {activeTab === 'VIDEO' && (
                <div className="space-y-3">
                  {/* Video Sub-selector */}
                  <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl w-fit">
                    <button
                      type="button"
                      onClick={() => setVideoSubTab('LINK')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        videoSubTab === 'LINK'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>Video Link (Everyone)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVideoSubTab('UPLOAD')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        videoSubTab === 'UPLOAD'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {isSuperAdmin ? (
                        <FileVideo className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Upload Video File {isSuperAdmin ? '(Super Admin)' : '(Locked)'}</span>
                    </button>
                  </div>

                  {videoSubTab === 'LINK' ? (
                    /* Video Link for everyone */
                    <div className="space-y-3">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">
                          Video Link URL <span className="text-red-500">*</span>
                        </label>
                        <div className="relative">
                          <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="url"
                            value={videoLinkUrl}
                            onChange={e => setVideoLinkUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            required
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1">
                          Everyone can share video links from YouTube, Vimeo, Loom, or direct video streams.
                        </p>
                      </div>

                      {/* YouTube Live Embed Preview */}
                      {parsedYouTube?.isValid && parsedYouTube.embedUrl && (
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-black aspect-video max-h-64">
                          <iframe
                            src={parsedYouTube.embedUrl}
                            title="Video Preview"
                            className="w-full h-full border-0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Direct Video Upload */
                    <div className="space-y-3">
                      {!isSuperAdmin ? (
                        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-amber-900 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-xs">
                            <Lock className="w-4 h-4 text-amber-700" />
                            <span>Direct Video File Upload is Super Admin Only</span>
                          </div>
                          <p className="text-[11px] text-amber-800 leading-relaxed">
                            Direct video file uploads are exclusively reserved for Super Admin platform broadcasts.
                            You can share video links (YouTube, Vimeo, etc.) anytime using the <strong>Video Link</strong> tab!
                          </p>
                          <button
                            type="button"
                            onClick={() => setVideoSubTab('LINK')}
                            className="px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                          >
                            Switch to Video Link
                          </button>
                        </div>
                      ) : (
                        /* Super Admin video upload */
                        <div className="space-y-3">
                          <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-700 shrink-0" />
                            <span className="font-semibold">
                              Super Admin Privileged Broadcast: Direct Video Upload Enabled
                            </span>
                          </div>

                          {videoDataUrl ? (
                            <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-black max-h-64">
                              <video
                                src={videoDataUrl}
                                controls
                                className="w-full max-h-64 object-contain"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  setVideoDataUrl(null);
                                  setVideoFileName(null);
                                  if (videoInputRef.current) videoInputRef.current.value = '';
                                }}
                                className="absolute top-3 right-3 p-1.5 bg-slate-900/80 hover:bg-red-600 text-white rounded-full transition-colors cursor-pointer"
                                title="Remove Video"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => videoInputRef.current?.click()}
                              className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-2"
                            >
                              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                                <FileVideo className="w-6 h-6" />
                              </div>
                              <div>
                                <p className="font-bold text-slate-800 text-xs">
                                  Select direct broadcast video file (Super Admin)
                                </p>
                                <p className="text-[11px] text-slate-400">
                                  MP4, WebM, MOV up to 50MB
                                </p>
                              </div>
                            </div>
                          )}

                          <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            onChange={handleVideoFileChange}
                            className="hidden"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Description / Notes <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Add commentary or summary of the video content..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: LINK (EVERYONE) */}
              {activeTab === 'LINK' && (
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Link URL <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={linkUrl}
                        onChange={e => setLinkUrl(e.target.value)}
                        placeholder="https://example.com/article-or-report"
                        className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                    </div>
                    {linkUrl && (
                      <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-500">
                        <ExternalLink className="w-3 h-3 text-slate-400" />
                        <span>Source domain: </span>
                        <strong className="text-slate-700">
                          {(() => {
                            try {
                              return new URL(linkUrl).hostname;
                            } catch {
                              return 'Invalid URL';
                            }
                          })()}
                        </strong>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Your Analysis / Commentary <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Why is this link relevant to Hyderabad real estate? Share your takeaway..."
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compliance notice */}
          <div className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-500">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              All content is moderated in accordance with Property Studio Community Guidelines and statutory RERA standards.
            </span>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-md cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: '#182A3E', borderColor: '#B49029', borderWidth: '1px' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                <span>Publishing...</span>
              </>
            ) : (
              <>
                <span>
                  {activeTab === 'COMMUNITY'
                    ? 'Submit Community Proposal'
                    : isQuestionMode
                    ? 'Post Question'
                    : activeTab === 'IMAGE'
                    ? 'Publish Image Post'
                    : activeTab === 'VIDEO'
                    ? 'Publish Video Post'
                    : activeTab === 'LINK'
                    ? 'Share Link Post'
                    : 'Publish to Feed'}
                </span>
                <Send className="w-3.5 h-3.5 text-amber-400" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
