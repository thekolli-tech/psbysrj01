import React, { useState } from 'react';
import { CommunityHub } from '../../types';
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
  Layers,
  Image as ImageIcon,
  Link2
} from 'lucide-react';

export type ComposerMode = 'QUESTION' | 'DISCUSSION' | 'UPDATE' | 'COMMUNITY';

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

export const PostComposer: React.FC<PostComposerProps> = ({
  isOpen,
  initialMode = 'DISCUSSION',
  onClose,
  communities,
  currentUser,
  onSubmitPost,
  onSubmitCommunity,
  onSuccess
}) => {
  const [mode, setMode] = useState<ComposerMode>(initialMode);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTopic, setSelectedTopic] = useState(TOPIC_OPTIONS[0]);
  const [selectedCommunityId, setSelectedCommunityId] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Community creation state
  const [commName, setCommName] = useState('');
  const [commDesc, setCommDesc] = useState('');
  const [commCategory, setCommCategory] = useState('Micro-Market Hub');
  const [commLocation, setCommLocation] = useState('Hyderabad, Telangana');

  if (!isOpen) return null;

  const approvedCommunities = (communities || []).filter(c => c.status === 'APPROVED');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg(null);

    if (mode === 'COMMUNITY') {
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

    // Post / Question / Update
    const cleanTitle = title.trim();
    const cleanContent = content.trim();

    if (!cleanTitle || cleanTitle.length < 5) {
      setErrorMsg('Please enter a descriptive title of at least 5 characters.');
      return;
    }
    if (!cleanContent || cleanContent.length < 10) {
      setErrorMsg('Please write at least 10 characters in the description.');
      return;
    }

    setSubmitting(true);
    try {
      const chosenComm = approvedCommunities.find(c => c.id === selectedCommunityId);
      const postPayload = {
        title: cleanTitle,
        content: cleanContent,
        topic: selectedTopic,
        postType: mode === 'QUESTION' ? 'QUESTION' : 'POST',
        communityId: selectedCommunityId || undefined,
        communityName: chosenComm?.name || undefined,
        authorName: currentUser.name || 'Member',
        authorRole: currentUser.role || 'PROPERTY_SEEKER',
        authorProfession: currentUser.profession || undefined,
        mediaUrl: mediaUrl.trim() || undefined
      };

      const res = await onSubmitPost(postPayload);
      if (!res.success) throw new Error(res.error || 'Failed to publish post.');
      onSuccess(
        mode === 'QUESTION'
          ? 'Question posted successfully!'
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
              {mode === 'QUESTION' ? (
                <HelpCircle className="w-5 h-5" />
              ) : mode === 'COMMUNITY' ? (
                <Building className="w-5 h-5" />
              ) : (
                <MessageSquare className="w-5 h-5" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold font-display text-white">
                {mode === 'QUESTION'
                  ? 'Ask the Community'
                  : mode === 'COMMUNITY'
                  ? 'Start a New Community Hub'
                  : mode === 'UPDATE'
                  ? 'Share Industry Update'
                  : 'Start a Discussion'}
              </h2>
              <p className="text-[11px] text-slate-300">
                Engage with Hyderabad real estate experts, investors, and homeowners.
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

        {/* Mode Selector Tabs */}
        <div className="flex items-center gap-1 px-4 py-2 bg-slate-50 border-b border-slate-200/80 overflow-x-auto text-xs">
          {[
            { id: 'DISCUSSION' as const, label: 'Discussion', icon: MessageSquare },
            { id: 'QUESTION' as const, label: 'Ask Question', icon: HelpCircle },
            { id: 'UPDATE' as const, label: 'Industry Update', icon: Sparkles },
            { id: 'COMMUNITY' as const, label: 'Start Community', icon: Building }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = mode === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  setErrorMsg(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer shrink-0 ${
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'COMMUNITY' ? (
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
                  <label className="block font-bold text-slate-700 mb-1">
                    Hub Category
                  </label>
                  <select
                    value={commCategory}
                    onChange={e => setCommCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none bg-white"
                  >
                    <option value="Micro-Market Hub">Micro-Market Hub</option>
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Luxury Villas & Gated Communities">Luxury Villas & Communities</option>
                    <option value="Legal & RERA">Legal & RERA Advisory</option>
                    <option value="Investor Syndicate">Investor Syndicate</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Operating Micro-Market
                  </label>
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
            /* Discussion / Question / Update Form */
            <div className="space-y-3.5">
              {/* Community & Topic Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Community (Optional)
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
                    Topic Category <span className="text-red-500">*</span>
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
                <label className="block font-bold text-slate-700 mb-1">
                  {mode === 'QUESTION' ? 'Your Question' : 'Discussion Title'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder={
                    mode === 'QUESTION'
                      ? 'e.g. What is the latest update on Neopolis trumpet road connectivity?'
                      : 'e.g. High-Rise vs Villa livability in West Hyderabad: Price trends and RERA check'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none font-semibold text-slate-900"
                  required
                />
              </div>

              {/* Body Content */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Content Details <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Share details, questions, verified data, or insights..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none leading-relaxed"
                  required
                />
              </div>

              {/* Optional Media URL */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Media / Image URL <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="url"
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder="https://example.com/site-plan.jpg"
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>
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
                  {mode === 'COMMUNITY'
                    ? 'Submit Community Proposal'
                    : mode === 'QUESTION'
                    ? 'Post Question'
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
