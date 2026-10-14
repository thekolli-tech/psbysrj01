import React, { useRef, useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
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
  Layers
} from 'lucide-react';

export const StudioBroadcastView: React.FC = () => {
  const { setActiveView, setDeviceMode, properties, marketTrends } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [penColor, setPenColor] = useState<string>('#F59E0B'); // Gold accent by default
  const [penWidth, setPenWidth] = useState<number>(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [selectedStudioTab, setSelectedStudioTab] = useState<'MASTERPLAN' | 'TRENDS_RADAR' | 'CONSTRUCTION_AUDIT'>('MASTERPLAN');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [broadcastCue, setBroadcastCue] = useState(0);

  const cues = [
    {
      segment: 'SEGMENT 1: MACRO ROADWAYS',
      headline: 'Neopolis Trumpet Interchange & 100m Arterial Corridor',
      bullet: 'Point out: Land auctions at ₹100 Cr/acre creating ₹12,000/sq.ft structural floor price.',
      camCue: 'CAMERA 1 (WIDE IFP SHOT)'
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

  // Canvas drawing logic for 86-inch touch panel stylus
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [selectedStudioTab]);

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

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* 86-inch IFP Studio Broadcast Header (+30% scale, glare-reduction dark matte, bold borders) */}
      <div className="bg-slate-900 border-b-2 border-slate-800 px-6 py-4 flex items-center justify-between shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-red-950/80 border-2 border-red-700/80 px-4 py-1.5 rounded-lg">
            <span className="w-3.5 h-3.5 bg-red-500 rounded-full animate-ping" />
            <span className="text-sm font-extrabold tracking-widest text-red-400 font-mono">
              ON AIR · 86" STUDIO IFP CAPTURE
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-black tracking-tight text-white font-display">
              PROPERTY STUDIO BROADCAST DESK
            </h1>
            <p className="text-sm font-semibold text-amber-400 tracking-wide">
              HOST: SWAMY REDDY JAVIDI · DATA INTELLIGENCE & REAL ESTATE MASTERCLASSES
            </p>
          </div>
        </div>

        {/* Studio Stylus Tools & Control Bar */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-950 border-2 border-slate-800 rounded-xl px-3 py-1.5 flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <PenTool className="w-4 h-4 text-amber-400" /> Stylus Pen:
            </span>
            <div className="flex items-center gap-2">
              {[
                { color: '#F59E0B', label: 'Gold' },
                { color: '#EF4444', label: 'Red' },
                { color: '#3B82F6', label: 'Blue' },
                { color: '#10B981', label: 'Green' }
              ].map(p => (
                <button
                  key={p.color}
                  onClick={() => setPenColor(p.color)}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${
                    penColor === p.color
                      ? 'border-white scale-110 shadow-lg'
                      : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: p.color }}
                  title={p.label}
                />
              ))}
            </div>

            <button
              onClick={clearCanvas}
              className="ml-2 px-3 py-1 text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center gap-1 border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Clear Ink
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 border-2 border-slate-700 text-slate-200 rounded-xl"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>

          <button
            onClick={() => {
              setActiveView('HOME');
              setDeviceMode('AUTO');
            }}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-black tracking-wide border-2 border-amber-400 shadow-lg"
          >
            Exit Studio Mode
          </button>
        </div>
      </div>

      {/* Main Interactive Studio Stage Canvas */}
      <div className="flex-1 grid grid-cols-12 gap-6 p-6">
        {/* Left Column: Interactive Visual Display & Drawing Surface (8 cols) */}
        <div className="col-span-8 flex flex-col gap-4">
          {/* Studio Tab Selectors (+30% typography) */}
          <div className="flex items-center gap-3">
            {[
              { id: 'MASTERPLAN', label: '1. Neopolis High-Rise Masterplan', icon: <Building className="w-5 h-5" /> },
              { id: 'TRENDS_RADAR', label: '2. Micro-Market Rate Trajectory', icon: <TrendingUp className="w-5 h-5" /> },
              { id: 'CONSTRUCTION_AUDIT', label: '3. Core Concrete & Slab Audit', icon: <Layers className="w-5 h-5" /> }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedStudioTab(tab.id as any)}
                className={`flex-1 py-3.5 px-4 rounded-xl text-base font-extrabold flex items-center justify-center gap-2 border-2 transition-all ${
                  selectedStudioTab === tab.id
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-xl'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Interactive Digital Canvas Screen for 86-inch Touch Panel */}
          <div className="relative flex-1 min-h-[560px] bg-slate-900 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
            {/* Background Content Based on Tab */}
            {selectedStudioTab === 'MASTERPLAN' && (
              <div className="w-full h-full relative">
                <img
                  src={properties[0].heroImage}
                  alt="Neopolis Masterplan"
                  className="w-full h-full object-cover opacity-85"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent p-8 flex flex-col justify-end">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-xs font-bold uppercase w-fit mb-2">
                    <MapPin className="w-3.5 h-3.5" /> Neopolis Golden Mile Sector 12
                  </div>
                  <h2 className="text-3xl font-black text-white font-display">
                    {properties[0].title} — 58 Storey Structural Blueprint
                  </h2>
                  <p className="text-base text-slate-200 mt-1 max-w-2xl font-medium">
                    FSI: 8.5 · Ground Coverage: 18% · 3.5-Acre Elevated Biophilic Sky Park
                  </p>
                </div>
              </div>
            )}

            {selectedStudioTab === 'TRENDS_RADAR' && (
              <div className="w-full h-full p-8 flex flex-col justify-between bg-slate-900">
                <div>
                  <h3 className="text-2xl font-black text-amber-400 font-display">
                    Micro-Market Capital Appreciation Radar (2025 - 2026)
                  </h3>
                  <p className="text-sm text-slate-400">
                    Real estate intelligence compiled by Swamy Reddy Javidi Analytics Desk
                  </p>
                </div>

                <div className="grid grid-cols-4 gap-4 my-6">
                  {marketTrends.map(trend => (
                    <div
                      key={trend.microMarket}
                      className="bg-slate-950 p-5 rounded-xl border-2 border-slate-800"
                    >
                      <span className="text-xs font-bold text-slate-400 block truncate">
                        {trend.microMarket}
                      </span>
                      <div className="text-2xl font-black text-white font-mono-numbers mt-1">
                        ₹{trend.currentAvgRate.toLocaleString('en-IN')}{' '}
                        <span className="text-xs font-normal text-slate-400">/sqft</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-sm mt-2">
                        <TrendingUp className="w-4 h-4" />
                        <span>+{trend.yearlyAppreciationPct}% 1-Yr Surge</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 p-6 rounded-xl border-2 border-slate-800">
                  <div className="text-sm font-bold text-amber-400 mb-2">
                    Key Infrastructure Drivers (Use stylus to annotate):
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-xs text-slate-300">
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      • Neopolis Trumpet Interchange: 100m direct entry to ORR
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      • Radial Road 7 Tellapur Expansion: 150-ft 6-lane link
                    </div>
                    <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                      • Hyderabad Metro Phase 2: Kokapet & Neopolis Spur
                    </div>
                  </div>
                </div>
              </div>
            )}

            {selectedStudioTab === 'CONSTRUCTION_AUDIT' && (
              <div className="w-full h-full p-8 bg-slate-900 flex flex-col justify-between">
                <div>
                  <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    SGS Verified Physical Test Dossier
                  </div>
                  <h3 className="text-3xl font-black text-white mt-1 font-display">
                    Level 42 Floor Slab Casting & High-Strength Concrete
                  </h3>
                </div>

                <div className="grid grid-cols-3 gap-6 my-4">
                  <div className="bg-slate-950 p-6 rounded-xl border-2 border-slate-800">
                    <div className="text-xs font-bold text-slate-400 uppercase">Concrete Mix Spec</div>
                    <div className="text-3xl font-black text-white font-mono-numbers mt-2">M60 Grade</div>
                    <div className="text-xs text-slate-400 mt-2">Batching with micro-silica pozzolana</div>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-xl border-2 border-slate-800">
                    <div className="text-xs font-bold text-slate-400 uppercase">28-Day Achieved Strength</div>
                    <div className="text-3xl font-black text-emerald-400 font-mono-numbers mt-2">68.4 N/mm²</div>
                    <div className="text-xs text-emerald-400 mt-2">+14% above design threshold</div>
                  </div>
                  <div className="bg-slate-950 p-6 rounded-xl border-2 border-slate-800">
                    <div className="text-xs font-bold text-slate-400 uppercase">Seismic Resistance</div>
                    <div className="text-3xl font-black text-amber-400 font-mono-numbers mt-2">Zone II High</div>
                    <div className="text-xs text-slate-400 mt-2">Post-tensioned tendon reinforcement</div>
                  </div>
                </div>

                <div className="p-4 bg-amber-950/40 border-2 border-amber-600/60 rounded-xl text-amber-200 text-sm font-semibold flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>
                    Zero honeycombing observed on core elevator shear walls. Property Studio civil engineering certification verified.
                  </span>
                </div>
              </div>
            )}

            {/* Transparent Touch / Stylus Drawing Canvas Overlay */}
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

        {/* Right Column: Live Teleprompter / Anchor Notes for Swamy Reddy Javidi (4 cols) */}
        <div className="col-span-4 flex flex-col gap-4">
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-2xl flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b-2 border-slate-800 mb-4">
                <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                  ANCHOR TELEPROMPTER & CUES
                </span>
                <span className="text-xs font-mono font-bold text-red-400">
                  {cues[broadcastCue].camCue}
                </span>
              </div>

              <div className="space-y-4">
                <div className="bg-slate-950 p-4 rounded-xl border-2 border-slate-800">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                    {cues[broadcastCue].segment}
                  </span>
                  <h4 className="text-xl font-black text-white mt-1 leading-snug font-display">
                    {cues[broadcastCue].headline}
                  </h4>
                </div>

                <div className="p-4 bg-slate-950 border-2 border-slate-800 rounded-xl text-sm leading-relaxed text-slate-200 font-medium">
                  {cues[broadcastCue].bullet}
                </div>

                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-300">
                  💡 <span className="font-bold">Broadcast Tip:</span> Use the gold stylus tool to circle the Trumpet Interchange on the IFP panel before transitioning to the commercial chart.
                </div>
              </div>
            </div>

            {/* Cue Switcher */}
            <div className="pt-4 border-t-2 border-slate-800 flex items-center justify-between">
              <button
                disabled={broadcastCue === 0}
                onClick={() => setBroadcastCue(c => Math.max(0, c - 1))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg disabled:opacity-40"
              >
                Previous Cue
              </button>
              <span className="text-xs font-mono font-bold text-slate-400">
                Cue {broadcastCue + 1} of {cues.length}
              </span>
              <button
                disabled={broadcastCue === cues.length - 1}
                onClick={() => setBroadcastCue(c => Math.min(cues.length - 1, c + 1))}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-lg disabled:opacity-40 flex items-center gap-1"
              >
                Next Cue <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
