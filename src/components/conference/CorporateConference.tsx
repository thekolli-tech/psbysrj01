import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Radio,
  Users,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Send,
  Building,
  CheckCircle,
  HelpCircle,
  Play,
  Video,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const CorporateConferenceView: React.FC = () => {
  const {
    conference,
    upvoteQuestion,
    submitQuestion,
    votePoll,
    changeSlide,
    showToast,
    mediaItems,
    setSelectedMedia,
    setActiveView
  } = useApp();

  const [questionInput, setQuestionInput] = useState('');
  const [activeTab, setActiveTab] = useState<'QNA' | 'POLLS' | 'AGENDA'>('QNA');
  const [standbyQuestion, setStandbyQuestion] = useState('');
  const [standbySubmitted, setStandbySubmitted] = useState(false);

  const handleQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    submitQuestion(questionInput.trim());
    setQuestionInput('');
  };

  const handleStandbyQuestionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standbyQuestion.trim()) return;
    submitQuestion(standbyQuestion.trim());
    setStandbyQuestion('');
    setStandbySubmitted(true);
    showToast('Question submitted to Secretariat for the upcoming executive session!');
  };

  if (!conference?.id) {
    const recentMedia = (mediaItems || []).slice(0, 3);
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Active Studio Header Banner */}
        <div className="bg-[#182A3E] text-white rounded-3xl p-6 sm:p-10 border border-slate-700/60 shadow-xl relative overflow-hidden">
          <div className="relative z-10 max-w-2xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
              <span>Property Studio Broadcast Network</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black font-display tracking-tight text-white leading-tight">
              Executive Video Briefings & Live Intelligence Sessions
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Curated by CEO Swamy Reddy Javidi and the Property Studio Secretariat. Access verified real estate analysis, micro-market drone reports, and regulatory compliance roundtables.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveView('MEDIA')}
                className="px-5 py-2.5 bg-[#B49029] hover:bg-[#A99137] text-white rounded-xl font-bold text-xs inline-flex items-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Video className="w-4 h-4" />
                <span>Explore Media & Podcast Engine</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => setActiveView('HOME')}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl font-bold text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
              >
                <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Join Community Discussions</span>
              </button>
            </div>
          </div>
        </div>

        {/* Featured Broadcasts & Episodes */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Play className="w-4 h-4 text-[#B49029]" />
              <h2 className="text-base font-black text-slate-900 font-display">
                Featured Studio Productions & Briefings
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('MEDIA')}
              className="text-xs font-bold text-slate-600 hover:text-[#B49029] transition-colors cursor-pointer"
            >
              View all &rarr;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {recentMedia.map(item => (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedMedia(item);
                  setActiveView('MEDIA');
                }}
                className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all group cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-900">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <Play className="w-4 h-4 ml-0.5 text-[#182A3E]" />
                      </div>
                    </div>
                    {item.duration && (
                      <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/80 text-white text-[10px] font-mono font-bold">
                        {item.duration}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#B49029] block mb-1">
                      {item.type}
                    </span>
                    <h3 className="font-bold text-slate-900 text-xs line-clamp-2 group-hover:text-[#B49029] transition-colors">
                      {item.title}
                    </h3>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {item.summary}
                    </p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-[11px] text-slate-400">
                  <span>{item.host || 'Swamy Reddy Javidi'}</span>
                  <span className="text-amber-600 font-bold group-hover:underline">Watch &rarr;</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Secretariat Q&A Standby Card */}
        <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#B49029] flex items-center justify-center shrink-0">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 text-sm sm:text-base font-display">
                Submit an Intelligence Question for the Next Live Session
              </h3>
              <p className="text-xs text-slate-500">
                Direct questions addressed during Swamy Reddy Javidi's keynote broadcasts and institutional investor roundtables.
              </p>
            </div>
          </div>

          {standbySubmitted ? (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 flex items-center gap-3 text-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Your question has been logged with the Secretariat. It will be reviewed for the upcoming live broadcast!</span>
            </div>
          ) : (
            <form onSubmit={handleStandbyQuestionSubmit} className="flex gap-2">
              <input
                type="text"
                value={standbyQuestion}
                onChange={e => setStandbyQuestion(e.target.value)}
                placeholder="Ask about Kokapet price trends, RERA legal approvals, developer track records..."
                className="flex-1 px-4 py-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#182A3E] hover:bg-slate-800 text-white rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5 text-amber-400" />
                <span>Submit</span>
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  const activePoll = conference.polls?.[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Conference Header Banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-950 border border-red-700 text-red-400 text-xs font-bold uppercase tracking-wider font-mono">
              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
              LIVE CORPORATE SUMMIT
            </span>
            <span className="text-xs text-slate-400 font-mono">Phase 2 High-Density Stream</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white font-display">
            {conference.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
            <span className="flex items-center gap-1 text-amber-400 font-medium">
              <Building className="w-3.5 h-3.5" /> {conference.developerName}
            </span>
            <span aria-hidden="true">·</span>
            <span>Focus: {conference.projectFocus}</span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
              <Users className="w-3.5 h-3.5" /> {conference.attendeesCount} Institutional Investors Connected
            </span>
          </div>
        </div>

        <button
          onClick={() => showToast('One-on-One Investor Due Diligence session booked with PMO.')}
          className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold tracking-wide shadow-lg transition-all shrink-0"
        >
          Schedule 1-on-1 Due Diligence
        </button>
      </div>

      {/* Main Conference Room Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stage Video Stream & Slide Deck (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Live Stage Stream Screen */}
          <div className="bg-slate-950 rounded-2xl border-2 border-slate-800 overflow-hidden relative aspect-video shadow-2xl flex items-center justify-center">
            <img
              src={conference.streamThumbnail}
              alt="Live Stage Stream"
              className="w-full h-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/40" />

            {/* Presenter Pill */}
            <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md border border-slate-700 px-3 py-1.5 rounded-xl text-white flex items-center gap-2.5">
              <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <div>
                <span className="text-xs font-bold block leading-tight">
                  {conference.currentPresenter}
                </span>
                <span className="text-[10px] text-amber-400 font-medium block leading-none">
                  {conference.presenterRole}
                </span>
              </div>
            </div>

            {/* Stream Status Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between text-white text-xs">
              <span className="bg-red-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                1080p 60FPS Low Latency
              </span>
              <span className="bg-slate-900/80 px-2 py-0.5 rounded font-mono text-[11px] text-slate-300">
                Audio: Balanced Dolby Voice
              </span>
            </div>
          </div>

          {/* Synchronized Investor Slide Deck Deck */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700 font-bold text-xs">
                SLIDE
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Synchronized Presentation Deck: {conference.projectFocus}
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Slide {conference.currentSlideIndex} of {conference.totalSlides} (Audited Pro-Forma & Engineering Blueprints)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeSlide(-1)}
                className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                title="Previous Slide"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => changeSlide(1)}
                className="p-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 active:scale-95 transition-all"
                title="Next Slide"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Live Audience Interactivity Deck (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between overflow-hidden">
          {/* Header & Tabs */}
          <div>
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {(['QNA', 'POLLS', 'AGENDA'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      activeTab === tab
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab === 'QNA' ? 'Live Q&A' : tab === 'POLLS' ? 'Live Polls' : 'Agenda'}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab 1: Live Q&A with Upvoting */}
            {activeTab === 'QNA' && (
              <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto no-scrollbar">
                <div className="text-[11px] text-slate-500 italic pb-1">
                  Questions are curated live for Swamy Reddy Javidi and Developer MD:
                </div>
                {conference.questions.map(q => (
                  <div
                    key={q.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900">{q.authorName}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">({q.authorRole})</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{q.timestamp}</span>
                    </div>

                    <p className="text-slate-700 leading-snug">{q.question}</p>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={() => upvoteQuestion(q.id)}
                        className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 transition-colors"
                      >
                        <ThumbsUp className="w-3 h-3 text-amber-600" />
                        <span>{q.upvotes} Upvotes</span>
                      </button>

                      {q.isAnswered ? (
                        <span className="text-[10px] font-semibold text-emerald-700 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Addressed on Air
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-400">
                          In Queue
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 2: Live Interactive Polls */}
            {activeTab === 'POLLS' && activePoll && (
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-700 uppercase">
                  <BarChart3 className="w-4 h-4" />
                  <span>Real-Time Audience Sentiment</span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {activePoll.question}
                </h3>

                <div className="space-y-2.5">
                  {activePoll.options.map((opt, idx) => {
                    const percentage = Math.round((opt.votes / (activePoll.totalVotes || 1)) * 100);
                    const isUserVoted = activePoll.userVotedIndex === idx;

                    return (
                      <button
                        key={idx}
                        onClick={() => votePoll(activePoll.id, idx)}
                        className={`w-full text-left p-3 rounded-xl border transition-all relative overflow-hidden ${
                          isUserVoted
                            ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        {/* Progress fill bar */}
                        <div
                          className="absolute inset-y-0 left-0 bg-amber-100/40 z-0 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />

                        <div className="relative z-10 flex items-center justify-between text-xs">
                          <span className={`font-semibold ${isUserVoted ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>
                            {opt.label} {isUserVoted && '✓'}
                          </span>
                          <span className="font-mono font-bold text-slate-700 ml-2">
                            {percentage}% ({opt.votes})
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-500 text-right">
                  Total Verified Responses: {activePoll.totalVotes}
                </div>
              </div>
            )}

            {/* Tab 3: Agenda */}
            {activeTab === 'AGENDA' && (
              <div className="p-5 space-y-3 text-xs">
                <h4 className="font-bold text-slate-900 mb-2">Summit Session Blueprint</h4>
                {conference.agenda.map((item, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-700">
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bottom Question Input Bar */}
          <form onSubmit={handleQuestionSubmit} className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={e => setQuestionInput(e.target.value)}
              placeholder="Ask Swamy Reddy or Builder MD..."
              className="flex-1 px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 bg-white"
            />
            <button
              type="submit"
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl active:scale-95 transition-all"
              title="Submit Question"
            >
              <Send className="w-4 h-4 text-amber-400" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
