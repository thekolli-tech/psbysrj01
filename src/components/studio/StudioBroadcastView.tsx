import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { StudioBroadcast } from '../../types';
import {
  PenTool,
  RotateCcw,
  Maximize2,
  Tv,
  ArrowRight,
  TrendingUp,
  MapPin,
  Building,
  CheckCircle2,
  Minimize2,
  Layers,
  Radio,
  Calendar,
  Clock,
  Copy,
  Check,
  AlertTriangle,
  Play,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Film
} from 'lucide-react';

export const StudioBroadcastView: React.FC = () => {
  const { setActiveView, setDeviceMode, properties, marketTrends, currentUser, isLoggedIn, showToast } = useApp();
  const isSuperAdmin = Boolean(isLoggedIn && currentUser?.role === 'SUPER_ADMIN');

  // Top view mode: Live Viewer, Studio Operator Console, or Interactive Telestrator Desk
  const [viewMode, setViewMode] = useState<'LIVE_VIEWER' | 'STUDIO_CONSOLE' | 'TELESTRATOR'>('LIVE_VIEWER');

  // Broadcasts state
  const [broadcasts, setBroadcasts] = useState<StudioBroadcast[]>([]);
  const [, setLoadingBroadcasts] = useState(false);
  const [activeBroadcast, setActiveBroadcast] = useState<StudioBroadcast | null>(null);
  const [streamConfig, setStreamConfig] = useState<{ configured: boolean; provider: string | null; missingVariables: string[] }>({
    configured: false,
    provider: null,
    missingVariables: []
  });

  // Schedule modal state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDesc, setScheduleDesc] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [schedulePoster, setSchedulePoster] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // Ingest stream key copy state
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Telestrator state
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [penColor, setPenColor] = useState<string>('#F59E0B');
  const [penWidth] = useState<number>(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedStudioTab, setSelectedStudioTab] = useState<'MASTERPLAN' | 'TRENDS_RADAR' | 'CONSTRUCTION_AUDIT'>('MASTERPLAN');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [broadcastCue, setBroadcastCue] = useState(0);

  const cues = [
    {
      segment: 'SEGMENT 1: MACRO ROADWAYS',
      headline: 'Neopolis Trumpet Interchange & 100m Arterial Corridor',
      bullet: 'Point out: Land auctions at ₹100 Cr/acre creating ₹12,000/sq.ft structural floor price.',
      camCue: 'CAMERA 1 (WIDE SHOT)'
    },
    {
      segment: 'SEGMENT 2: STRUCTURAL INTEGRITY',
      headline: 'Level 42 Floor Slab Casting & High-Strength Concrete',
      bullet: 'Point out: 28-day cylinder compressive strength report from SGS India (68.4 N/mm² achieved).',
      camCue: 'CAMERA 2 (CLOSE-UP DIAGRAM)'
    },
    {
      segment: 'SEGMENT 3: DEVELOPER MD DEBATE',
      headline: 'Aparna Infra vs My Home: The Western Corridor High-Rise Race',
      bullet: 'Point out: FSI relaxation impacts, tuned mass dampers for wind vortex deflection.',
      camCue: 'STUDIO LIVE DIALOGUE'
    }
  ];

  // Fetch broadcasts and config
  const fetchStudioData = () => {
    setLoadingBroadcasts(true);
    Promise.all([
      fetch('/api/studio/broadcasts').then(r => r.ok ? r.json() : { broadcasts: [] }),
      fetch('/api/studio/config').then(r => r.ok ? r.json() : null)
    ]).then(([bData, cData]) => {
      const list = Array.isArray(bData?.broadcasts) ? bData.broadcasts : [];
      setBroadcasts(list);
      if (list.length > 0) {
        const liveOne = list.find((b: StudioBroadcast) => b.status === 'LIVE');
        setActiveBroadcast(liveOne || list[0]);
      }
      if (cData) setStreamConfig(cData);
    }).catch(() => {}).finally(() => setLoadingBroadcasts(false));
  };

  useEffect(() => {
    fetchStudioData();
  }, []);

  // Telestrator canvas resizing
  useEffect(() => {
    if (viewMode !== 'TELESTRATOR') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [selectedStudioTab, viewMode]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = penWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Broadcast Actions (Super Admin only)
  const handleScheduleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleTitle.trim()) return;
    setScheduling(true);
    try {
      const res = await fetch('/api/studio/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: scheduleTitle.trim(),
          description: scheduleDesc.trim() || undefined,
          scheduledStartTime: scheduleDate || new Date().toISOString(),
          thumbnail: schedulePoster.trim() || undefined
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule broadcast');
      showToast('Live telecast broadcast scheduled successfully!');
      setIsScheduleModalOpen(false);
      setScheduleTitle('');
      setScheduleDesc('');
      setScheduleDate('');
      setSchedulePoster('');
      fetchStudioData();
    } catch (err: any) {
      showToast(err.message || 'Error scheduling broadcast');
    } finally {
      setScheduling(false);
    }
  };

  const handleStartBroadcast = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/broadcasts/${id}/start`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start broadcast');
      }
      showToast('Broadcast is now LIVE on air!');
      fetchStudioData();
    } catch (err: any) {
      showToast(err.message || 'Error starting broadcast');
    }
  };

  const handleEndBroadcast = async (id: string) => {
    try {
      const res = await fetch(`/api/studio/broadcasts/${id}/end`, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to end broadcast');
      }
      showToast('Broadcast has ended.');
      fetchStudioData();
    } catch (err: any) {
      showToast(err.message || 'Error ending broadcast');
    }
  };

  const handlePublishReplay = async (id: string, replayUrl: string) => {
    try {
      const res = await fetch(`/api/studio/broadcasts/${id}/publish-replay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replayUrl })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to publish replay');
      }
      showToast('Recorded replay published for public viewing!');
      fetchStudioData();
    } catch (err: any) {
      showToast(err.message || 'Error publishing replay');
    }
  };

  const currentLive = broadcasts.find(b => b.status === 'LIVE');
  const upcomingList = broadcasts.filter(b => b.status === 'SCHEDULED');
  const pastReplays = broadcasts.filter(b => b.status === 'REPLAY_AVAILABLE' || b.status === 'ENDED');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Studio Global Navigation Bar */}
      <div className="bg-slate-900 border-b-2 border-slate-800 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 bg-red-950/80 border-2 border-red-700/80 px-3 py-1 rounded-lg shrink-0">
            <span className={`w-2.5 h-2.5 rounded-full ${currentLive ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            <span className="text-xs font-black tracking-widest text-red-400 font-mono">
              {currentLive ? 'ON AIR · LIVE BROADCAST' : 'ON AIR · STUDIO CAPTURE'}
            </span>
          </div>

          <div className="hidden md:block min-w-0">
            <h1 className="text-lg lg:text-xl font-black text-white font-display truncate">
              Property Studio Live Broadcast Desk
            </h1>
            <p className="text-xs font-semibold text-amber-400 tracking-wide truncate">
              Hosted by Swamy Reddy Javidi · Telecasts, Masterclasses & In-Depth Interviews
            </p>
          </div>
        </div>

        {/* View Mode Switcher Tabs */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewMode('LIVE_VIEWER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'LIVE_VIEWER'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Live & Replays</span>
          </button>

          {isSuperAdmin && (
            <button
              onClick={() => setViewMode('STUDIO_CONSOLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'STUDIO_CONSOLE'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Studio Console</span>
            </button>
          )}

          <button
            onClick={() => setViewMode('TELESTRATOR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === 'TELESTRATOR'
                ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Telestrator</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {viewMode === 'TELESTRATOR' && (
            <button
              onClick={toggleFullscreen}
              className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl cursor-pointer"
              title="Toggle Fullscreen"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => {
              setActiveView('HOME');
              setDeviceMode('AUTO');
            }}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
          >
            Exit Studio Mode
          </button>
        </div>
      </div>

      {/* VIEW 1: LIVE BROADCAST VIEWER INTERFACE */}
      {viewMode === 'LIVE_VIEWER' && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-150">
          {/* Hero Live Video Player */}
          {currentLive ? (
            <div className="bg-slate-900 border-2 border-amber-500/40 rounded-3xl overflow-hidden shadow-2xl">
              <div className="relative aspect-video bg-black flex items-center justify-center">
                {currentLive.streamUrl ? (
                  <video
                    src={currentLive.streamUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                    poster={currentLive.posterUrl || properties[0]?.heroImage}
                  />
                ) : (
                  <div className="text-center p-8 space-y-3">
                    <Radio className="w-12 h-12 text-red-500 mx-auto animate-pulse" />
                    <h3 className="text-xl font-bold text-white font-display">Live Signal Ingesting...</h3>
                    <p className="text-xs text-slate-400 max-w-md mx-auto">
                      Studio operator is broadcasting via live ingest server. Stream playback begins momentarily.
                    </p>
                  </div>
                )}

                {/* Overlaid LIVE Badge */}
                <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-lg">
                  <span className="w-2 h-2 bg-white rounded-full animate-ping" />
                  <span>LIVE NOW</span>
                </div>

                <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-slate-200 px-3 py-1 rounded-full text-xs font-mono font-bold">
                  {currentLive.viewerCount || 1} watching
                </div>
              </div>

              <div className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900">
                <div className="space-y-1 min-w-0">
                  <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-widest">
                    PROPERTY STUDIO LIVE SPECIAL
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-display">{currentLive.title}</h2>
                  <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">{currentLive.description}</p>
                </div>

                {isSuperAdmin && (
                  <button
                    onClick={() => handleEndBroadcast(currentLive.id)}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                  >
                    End Live Telecast
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Radio className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-white font-display">Studio Broadcast Desk Is Currently Off-Air</h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
                No telecast is transmitting live right now. Browse upcoming scheduled studio discussions below or watch our recorded technical replays.
              </p>
              {isSuperAdmin && (
                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide cursor-pointer inline-flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Schedule Studio Broadcast
                </button>
              )}
            </div>
          )}

          {/* Upcoming Scheduled Broadcasts */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-amber-400" />
              <span>Upcoming Scheduled Broadcasts ({upcomingList.length})</span>
            </h3>

            {upcomingList.length === 0 ? (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                No upcoming broadcasts scheduled at this moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {upcomingList.map(b => (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between text-xs text-amber-400 font-mono mb-2">
                        <span className="flex items-center gap-1 font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Upcoming'}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                          SCHEDULED
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white font-display line-clamp-2">{b.title}</h4>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{b.description || 'Live expert discussion & market breakdown.'}</p>
                    </div>

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleStartBroadcast(b.id)}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Go Live Now</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Past Broadcast Replays Library */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Film className="w-5 h-5 text-amber-400" />
              <span>Recorded Studio Replays ({pastReplays.length})</span>
            </h3>

            {pastReplays.length === 0 ? (
              <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-xs text-slate-400">
                No recorded replays available yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pastReplays.map(b => (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between">
                    <div className="aspect-video bg-black relative flex items-center justify-center">
                      {b.posterUrl ? (
                        <img src={b.posterUrl} alt={b.title} className="w-full h-full object-cover" />
                      ) : (
                        <Tv className="w-8 h-8 text-slate-600" />
                      )}
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center">
                        <div className="w-10 h-10 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-2 right-2 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white">
                        REPLAY
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <h4 className="text-sm font-bold text-white line-clamp-2">{b.title}</h4>
                      <p className="text-xs text-slate-400 line-clamp-2">{b.description || 'Full studio session recording.'}</p>
                      {b.replayUrl && (
                        <a
                          href={b.replayUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block text-xs font-bold text-amber-400 hover:text-amber-300 mt-1"
                        >
                          Watch Replay Video →
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: STUDIO OPERATOR CONSOLE (Super Admin only) */}
      {viewMode === 'STUDIO_CONSOLE' && isSuperAdmin && (
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white font-display">
                Studio Master Control & Streaming Ingest
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Manage live telecast sessions, RTMPS/WHIP private ingestion keys, and public HLS distribution.
              </p>
            </div>

            <button
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-black tracking-wide flex items-center gap-2 cursor-pointer shadow-lg"
            >
              <Plus className="w-4 h-4" />
              <span>Create / Schedule Broadcast</span>
            </button>
          </div>

          {/* Provider Status Card (Honest disclosure of configuration) */}
          <div className={`p-5 rounded-2xl border ${streamConfig.configured ? 'bg-emerald-950/30 border-emerald-700/50 text-emerald-200' : 'bg-amber-950/30 border-amber-700/50 text-amber-200'}`}>
            <div className="flex items-start gap-3">
              {streamConfig.configured ? (
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1">
                <span className="font-bold text-xs uppercase tracking-wider block">
                  Live Streaming Infrastructure: {streamConfig.configured ? 'ACTIVE & CONFIGURED' : 'PENDING CREDENTIALS'}
                </span>
                <p className="text-xs opacity-90 leading-relaxed">
                  {streamConfig.configured
                    ? `Live streaming is connected to ${streamConfig.provider?.toUpperCase()}. Live inputs and viewer HLS playback are operational.`
                    : `Streaming provider credentials are not yet configured in production environment. Missing variables: [${streamConfig.missingVariables.join(', ')}]. The system is operating in safe deterministic simulation mode without claiming false live connectivity.`}
                </p>
              </div>
            </div>
          </div>

          {/* Active Operator Ingest Credentials */}
          {activeBroadcast && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block">
                    CURRENT BROADCAST CHANNEL
                  </span>
                  <h3 className="text-xl font-black text-white font-display mt-0.5">{activeBroadcast.title}</h3>
                  <span className={`inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                    activeBroadcast.status === 'LIVE'
                      ? 'bg-red-500 text-white animate-pulse'
                      : activeBroadcast.status === 'SCHEDULED'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    STATUS: {activeBroadcast.status}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {activeBroadcast.status !== 'LIVE' && activeBroadcast.status !== 'ENDED' && (
                    <button
                      onClick={() => handleStartBroadcast(activeBroadcast.id)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Go Live
                    </button>
                  )}
                  {activeBroadcast.status === 'LIVE' && (
                    <button
                      onClick={() => handleEndBroadcast(activeBroadcast.id)}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      End Stream
                    </button>
                  )}
                </div>
              </div>

              {/* Private Ingest Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">RTMPS / RTMP Server Ingest URL</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeBroadcast.ingestUrl || 'rtmps://live.propertystudio.org:443/live');
                        setCopiedUrl(true);
                        setTimeout(() => setCopiedUrl(false), 2000);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    readOnly
                    value={activeBroadcast.ingestUrl || 'rtmps://live.propertystudio.org:443/live'}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-slate-300 select-all"
                  />
                </div>

                <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400">Private Stream Key (Keep Confidential)</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(activeBroadcast.streamKey || 'ps_live_key_hidden');
                        setCopiedKey(true);
                        setTimeout(() => setCopiedKey(false), 2000);
                      }}
                      className="text-amber-400 hover:text-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
                    </button>
                  </div>
                  <input
                    type="password"
                    readOnly
                    value={activeBroadcast.streamKey || 'ps_live_key_hidden'}
                    className="w-full px-3 py-2 text-xs font-mono bg-slate-900 border border-slate-700 rounded-xl text-amber-400 select-all"
                  />
                </div>
              </div>

              <div className="p-3 bg-red-950/30 border border-red-800/40 rounded-xl text-xs text-red-300 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
                <span>Security Notice: Never share your stream key in public chats or documents. Only authorized studio operators may access this key.</span>
              </div>
            </div>
          )}

          {/* Broadcasts Management Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
            <h3 className="text-base font-bold text-white">All Scheduled & Past Broadcasts</h3>
            <div className="divide-y divide-slate-800">
              {broadcasts.map(b => (
                <div key={b.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white truncate">{b.title}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        b.status === 'LIVE' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}>{b.status}</span>
                    </div>
                    <span className="text-xs text-slate-500 block">
                      {b.scheduledAt ? new Date(b.scheduledAt).toLocaleString() : 'Not scheduled'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setActiveBroadcast(b)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Manage
                    </button>
                    {b.status === 'ENDED' && (
                      <button
                        onClick={() => {
                          const url = prompt('Enter recorded replay URL for public viewing:');
                          if (url) handlePublishReplay(b.id, url);
                        }}
                        className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Publish Replay
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: TELESTRATOR CANVAS DESK */}
      {viewMode === 'TELESTRATOR' && (
        <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-amber-400" /> Stylus:
              </span>
              {[
                { color: '#F59E0B', label: 'Gold' },
                { color: '#EF4444', label: 'Red' },
                { color: '#3B82F6', label: 'Blue' },
                { color: '#10B981', label: 'Green' }
              ].map(p => (
                <button
                  key={p.color}
                  onClick={() => setPenColor(p.color)}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    penColor === p.color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.label}
                />
              ))}

              <button
                onClick={clearCanvas}
                className="ml-2 px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Clear Ink
              </button>
            </div>

            <div className="flex items-center gap-2">
              {[
                { id: 'MASTERPLAN', label: 'Neopolis Blueprint', icon: <Building className="w-4 h-4" /> },
                { id: 'TRENDS_RADAR', label: 'Rate Trajectory', icon: <TrendingUp className="w-4 h-4" /> },
                { id: 'CONSTRUCTION_AUDIT', label: 'Concrete Audit', icon: <Layers className="w-4 h-4" /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStudioTab(tab.id as any)}
                  className={`py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    selectedStudioTab === tab.id
                      ? 'bg-amber-500 text-slate-950 font-black'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex-1 min-h-[560px] bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {selectedStudioTab === 'MASTERPLAN' && (
              <div className="w-full h-full relative">
                <img
                  src={properties[0]?.heroImage}
                  alt="Neopolis Masterplan"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-8 flex flex-col justify-end">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase w-fit mb-2">
                    <MapPin className="w-3.5 h-3.5" /> Neopolis Sector 12
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white font-display">
                    58 Storey Structural Blueprint
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-200 mt-1 max-w-2xl font-medium">
                    FSI: 8.5 · Ground Coverage: 18% · 3.5-Acre Elevated Biophilic Sky Park
                  </p>
                </div>
              </div>
            )}

            {selectedStudioTab === 'TRENDS_RADAR' && (
              <div className="w-full h-full p-8 flex flex-col justify-between bg-slate-900">
                <div>
                  <h3 className="text-2xl font-black text-amber-400 font-display">
                    Micro-Market Capital Appreciation Radar
                  </h3>
                  <p className="text-xs text-slate-400">
                    Real estate intelligence compiled by Swamy Reddy Javidi Analytics Desk
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 my-6">
                  {marketTrends.slice(0, 4).map(trend => (
                    <div key={trend.microMarket} className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                      <span className="text-xs font-bold text-slate-400 block truncate">{trend.microMarket}</span>
                      <div className="text-xl font-black text-white font-mono-numbers mt-1">
                        ₹{trend.currentAvgRate.toLocaleString('en-IN')}{' '}
                        <span className="text-[10px] font-normal text-slate-400">/sqft</span>
                      </div>
                      <div className="flex items-center gap-1 text-emerald-400 font-bold text-xs mt-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>+{trend.yearlyAppreciationPct}% 1-Yr</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedStudioTab === 'CONSTRUCTION_AUDIT' && (
              <div className="w-full h-full p-8 bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    SGS Verified Physical Test Dossier
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 font-display">
                    Level 42 Floor Slab Casting & High-Strength Concrete
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Concrete Mix Spec</div>
                    <div className="text-xl font-black text-white font-mono-numbers mt-1">M60 Grade</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">28-Day Achieved Strength</div>
                    <div className="text-xl font-black text-emerald-400 font-mono-numbers mt-1">68.4 N/mm²</div>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Seismic Resistance</div>
                    <div className="text-xl font-black text-amber-400 font-mono-numbers mt-1">Zone II High</div>
                  </div>
                </div>
              </div>
            )}

            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="absolute inset-0 w-full h-full cursor-crosshair z-20 touch-none"
            />
          </div>
        </div>
      )}

      {/* Modal: Schedule Broadcast (Super Admin only) */}
      {isScheduleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 w-full max-w-lg space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white font-display">Schedule New Live Studio Broadcast</h3>
            <form onSubmit={handleScheduleBroadcast} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Broadcast Title</label>
                <input
                  type="text"
                  value={scheduleTitle}
                  onChange={e => setScheduleTitle(e.target.value)}
                  placeholder="e.g. Kokapet Neopolis Sky-Mansions Masterclass"
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Description</label>
                <textarea
                  value={scheduleDesc}
                  onChange={e => setScheduleDesc(e.target.value)}
                  rows={3}
                  placeholder="Technical synopsis and discussion topics..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Scheduled Date & Time</label>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => setScheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Poster / Thumbnail URL</label>
                <input
                  type="url"
                  value={schedulePoster}
                  onChange={e => setSchedulePoster(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={scheduling || !scheduleTitle.trim()}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl font-black tracking-wide cursor-pointer disabled:opacity-50"
                >
                  {scheduling ? 'Scheduling...' : 'Confirm Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
