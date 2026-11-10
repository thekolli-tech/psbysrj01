import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Star,
  Plus,
  Play,
  ShieldCheck,
  ThumbsUp,
  X,
  CheckCircle2,
  Users,
  Video,
  Building,
  Briefcase,
  Quote
} from 'lucide-react';

interface Testimonial {
  id: string;
  name: string;
  role: 'Buyer' | 'Investor' | 'Channel Partner' | 'Developer';
  location: string;
  rating: number;
  content: string;
  isVerified: boolean;
  helpfulCount: number;
  date: string;
}

const INITIAL_TESTIMONIALS: Testimonial[] = [
  {
    id: 'test-1',
    name: 'Suresh Chandra',
    role: 'Buyer',
    location: 'Tellapur',
    rating: 5,
    content: 'The RERA audit checklists saved us months of anxiety. Completely transparent data without developer spin.',
    isVerified: true,
    helpfulCount: 42,
    date: '2 days ago'
  },
  {
    id: 'test-2',
    name: 'Vikramaditya Rao',
    role: 'Investor',
    location: 'Kokapet',
    rating: 5,
    content: 'Neopolis rental yield analytics are spot on. Highly recommended for NRI investors looking at premium Hyderabad high-rises.',
    isVerified: true,
    helpfulCount: 38,
    date: '4 days ago'
  },
  {
    id: 'test-3',
    name: 'Kalyan Reddy',
    role: 'Channel Partner',
    location: 'Financial District',
    rating: 5,
    content: 'Lead marketplace economics are fair and transparent. Quality leads with verified budgets and zero broker spam.',
    isVerified: true,
    helpfulCount: 29,
    date: '1 week ago'
  },
  {
    id: 'test-4',
    name: 'Prajay Infrastructure Exec',
    role: 'Developer',
    location: 'Neopolis',
    rating: 5,
    content: 'PMO workspace milestone tracking connects us directly with verified buyers and serious institutional investors.',
    isVerified: true,
    helpfulCount: 19,
    date: '1 week ago'
  },
  {
    id: 'test-5',
    name: 'Ananya Sharma',
    role: 'Buyer',
    location: 'Tellapur',
    rating: 5,
    content: 'Found our 3BHK in Tellapur through verified listings without broker calls. The legal documentation checklist was indispensable.',
    isVerified: true,
    helpfulCount: 51,
    date: '2 weeks ago'
  },
  {
    id: 'test-6',
    name: 'Rajiv Mehta',
    role: 'Investor',
    location: 'Mokila',
    rating: 5,
    content: 'The corridor pulse and infrastructure milestone timeline is unmatched in Hyderabad real estate platforms.',
    isVerified: true,
    helpfulCount: 33,
    date: '3 weeks ago'
  }
];

export const PSTestimonialsView: React.FC = () => {
  const { showToast, isLoggedIn } = useApp();
  const [selectedRole, setSelectedRole] = useState<string>('All');
  const [testimonials, setTestimonials] = useState<Testimonial[]>(INITIAL_TESTIMONIALS);
  const [helpfulVoted, setHelpfulVoted] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);

  // Form state
  const [authorName, setAuthorName] = useState('');
  const [authorRole, setAuthorRole] = useState<'Buyer' | 'Investor' | 'Channel Partner' | 'Developer'>('Buyer');
  const [authorLocation, setAuthorLocation] = useState('');
  const [authorRating, setAuthorRating] = useState(5);
  const [authorContent, setAuthorContent] = useState('');

  const handleHelpful = (id: string) => {
    if (helpfulVoted.has(id)) {
      setHelpfulVoted(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      setTestimonials(prev =>
        prev.map(t => (t.id === id ? { ...t, helpfulCount: t.helpfulCount - 1 } : t))
      );
    } else {
      setHelpfulVoted(prev => new Set(prev).add(id));
      setTestimonials(prev =>
        prev.map(t => (t.id === id ? { ...t, helpfulCount: t.helpfulCount + 1 } : t))
      );
      showToast('Marked as helpful!');
    }
  };

  const handleSubmitTestimonial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !authorContent.trim()) return;

    const newTestimonial: Testimonial = {
      id: `test-${Date.now()}`,
      name: authorName.trim(),
      role: authorRole,
      location: authorLocation.trim() || 'Hyderabad',
      rating: authorRating,
      content: authorContent.trim(),
      isVerified: true,
      helpfulCount: 1,
      date: 'Just now'
    };

    setTestimonials([newTestimonial, ...testimonials]);
    setModalOpen(false);
    setAuthorName('');
    setAuthorLocation('');
    setAuthorContent('');
    showToast('Your testimonial has been submitted and verified!');
  };

  const filteredTestimonials = testimonials.filter(t => {
    if (selectedRole === 'All') return true;
    if (selectedRole === 'Buyers') return t.role === 'Buyer';
    if (selectedRole === 'Investors') return t.role === 'Investor';
    if (selectedRole === 'Channel Partners') return t.role === 'Channel Partner';
    if (selectedRole === 'Developers') return t.role === 'Developer';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Page Header Matching PDF Page 25 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-display tracking-tight">
            PS Testimonials
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            What buyers, investors and partners say about Property Studio.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add your testimonial</span>
        </button>
      </div>

      {/* Top Rating Distribution Card Matching PDF Page 25 */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Left Column: Overall Score */}
        <div className="text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-100 pb-6 md:pb-0 md:pr-6">
          <div className="text-4xl sm:text-5xl font-black text-slate-900 font-display">
            4.9
          </div>
          <div className="flex items-center justify-center md:justify-start gap-1">
            {[1, 2, 3, 4, 5].map(star => (
              <Star key={star} className="w-5 h-5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            142 verified testimonials
          </p>
        </div>

        {/* Right 2 Columns: Rating Distribution Bars */}
        <div className="md:col-span-2 space-y-2">
          {[
            { stars: '5★', pct: 88, count: 125 },
            { stars: '4★', pct: 10, count: 14 },
            { stars: '3★', pct: 2, count: 3 },
            { stars: '2★', pct: 0, count: 0 },
            { stars: '1★', pct: 0, count: 0 }
          ].map(row => (
            <div key={row.stars} className="flex items-center gap-3 text-xs">
              <span className="w-6 font-bold text-slate-600 shrink-0">{row.stars}</span>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#B49029] rounded-full transition-all duration-500"
                  style={{ width: `${row.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-slate-400 font-mono text-[11px] shrink-0">
                {row.pct}%
              </span>
            </div>
          ))}
          <p className="text-[11px] text-slate-400 pt-1">
            Distribution shape is verified by Property Studio audit.
          </p>
        </div>
      </div>

      {/* Audience Filter Pills: All | Buyers | Investors | Channel Partners | Developers */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {['All', 'Buyers', 'Investors', 'Channel Partners', 'Developers'].map(role => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedRole === role
                ? 'bg-[#182A3E] text-white shadow-xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200/80'
            }`}
          >
            {role}
          </button>
        ))}
      </div>

      {/* Featured Video Testimonial Card Matching PDF Page 25 */}
      <div className="bg-[#182A3E] text-white rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-lg relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Video Preview Block */}
          <div
            onClick={() => setVideoModalOpen(true)}
            className="w-full lg:w-72 h-44 bg-slate-800 rounded-2xl relative overflow-hidden group cursor-pointer border border-slate-700 shrink-0 flex items-center justify-center shadow-inner"
          >
            <img
              src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80"
              alt="Video Testimonial"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 opacity-60"
            />
            <div className="absolute inset-0 bg-slate-900/40" />
            <div className="w-12 h-12 rounded-full bg-[#B49029] text-white flex items-center justify-center group-hover:scale-110 shadow-lg transition-transform z-10">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
            <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-black/70 text-[10px] font-mono text-white">
              03:45
            </span>
          </div>

          {/* Video Info */}
          <div className="space-y-2 flex-1">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
              FEATURED VIDEO TESTIMONIAL
            </span>
            <h3 className="text-lg sm:text-xl font-bold text-white leading-snug">
              How Property Studio helped us avoid a non-RERA pitfall in Neopolis
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Swetha & Raghu share their 6-month journey evaluating high-rise apartments in Kokapet and Neopolis, and how verified corridor telemetry protected their life savings.
            </p>
            <p className="text-xs font-bold text-amber-400">
              Swetha & Raghu · First-time Homebuyers (Tellapur)
            </p>
          </div>
        </div>
      </div>

      {/* 3-Column Responsive Testimonial Cards Grid Matching PDF Page 25 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTestimonials.map(t => {
          const isVoted = helpfulVoted.has(t.id);
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Header: User name, role pill, stars */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{t.name}</h4>
                    <span className="text-[11px] text-slate-400 font-medium">
                      {t.role} · {t.location}
                    </span>
                  </div>

                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Quote Text */}
                <p className="text-xs text-slate-700 leading-relaxed italic">
                  "{t.content}"
                </p>
              </div>

              {/* Card Footer: VERIFIED badge & Helpful counter */}
              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>VERIFIED</span>
                </span>

                <button
                  type="button"
                  onClick={() => handleHelpful(t.id)}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    isVoted
                      ? 'bg-amber-50 text-[#B49029] font-bold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className={`w-3.5 h-3.5 ${isVoted ? 'fill-current text-[#B49029]' : ''}`} />
                  <span>Helpful {t.helpfulCount}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Testimonial Submission Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                  Add Your Testimonial
                </h3>
                <p className="text-xs text-slate-500">
                  Share your experience with the Property Studio community.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitTestimonial} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  placeholder="e.g. Suresh Chandra"
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Role</label>
                  <select
                    value={authorRole}
                    onChange={e => setAuthorRole(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                  >
                    <option value="Buyer">Buyer</option>
                    <option value="Investor">Investor</option>
                    <option value="Channel Partner">Channel Partner</option>
                    <option value="Developer">Developer</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Corridor / Location</label>
                  <input
                    type="text"
                    value={authorLocation}
                    onChange={e => setAuthorLocation(e.target.value)}
                    placeholder="e.g. Tellapur"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Rating</label>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setAuthorRating(star)}
                      className="p-1 cursor-pointer"
                    >
                      <Star
                        className={`w-6 h-6 ${
                          star <= authorRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Your Testimonial (max 500 characters)</label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={authorContent}
                  onChange={e => setAuthorContent(e.target.value)}
                  placeholder="Tell others how Property Studio helped your property search, investment analysis or developer verification..."
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-bold cursor-pointer hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer"
                >
                  Publish Testimonial
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Modal */}
      {videoModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setVideoModalOpen(false)}
        >
          <div
            className="bg-black rounded-3xl max-w-3xl w-full p-4 shadow-2xl relative animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoModalOpen(false)}
              className="absolute -top-10 right-0 text-white hover:text-slate-300 p-1 cursor-pointer"
              aria-label="Close video"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center">
              <iframe
                className="w-full h-full"
                src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1"
                title="Property Studio Testimonial Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
