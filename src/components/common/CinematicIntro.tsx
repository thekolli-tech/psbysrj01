import React, { useState, useEffect, useCallback } from 'react';

const SESSION_KEY = 'ps_cinematic_intro_seen_v1';
const INTRO_IMAGE_SRC = '/brand/property-studio-intro-official.jpg';

interface CinematicIntroProps {
  onComplete?: () => void;
  forcePlay?: boolean;
}

export const CinematicIntro: React.FC<CinematicIntroProps> = ({ onComplete, forcePlay = false }) => {
  const [visible, setVisible] = useState<boolean>(() => {
    if (forcePlay) return true;
    if (typeof window === 'undefined') return false;

    // Respect reduced-motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return false;
    }

    // Check if replay requested via URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('intro') === 'replay' || params.get('intro') === '1') {
      return true;
    }

    // Check session storage
    return !sessionStorage.getItem(SESSION_KEY);
  });

  const [isExiting, setIsExiting] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // Ignore storage errors in restricted private browsing
    }

    // Snappy 250ms exit fade-out before unmounting
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 250);

    return () => clearTimeout(timer);
  }, [isExiting, onComplete]);

  // Keyboard navigation: Escape or Space skips immediately
  useEffect(() => {
    if (!visible) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visible, handleDismiss]);

  // Snappy progression: 1.2s duration then immediate smooth exit for millisecond website loading
  useEffect(() => {
    if (!visible) return;

    const autoTimer = setTimeout(() => {
      handleDismiss();
    }, 1200);

    return () => clearTimeout(autoTimer);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property Studio Intro"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030712] select-none cursor-pointer transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none filter blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes cinematic-zoom {
          0% { transform: scale(0.92); opacity: 0; filter: blur(8px); }
          20% { transform: scale(0.98); opacity: 1; filter: blur(0px); }
          100% { transform: scale(1.04); opacity: 1; filter: blur(0px); }
        }
        @keyframes ambient-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.15); }
        }
        @keyframes light-streak {
          0% { width: 0%; opacity: 0; }
          25% { width: 100%; opacity: 0.85; }
          75% { width: 100%; opacity: 0.65; }
          100% { width: 120%; opacity: 0; }
        }
        @keyframes sheen-sweep {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(240%) skewX(-20deg); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-130px) translateX(var(--drift-x, 20px)); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.92); opacity: 0.7; }
          100% { transform: scale(1.25); opacity: 0; }
        }
      `}</style>

      {/* Atmospheric Background & Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 50%, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.65) 45%, #030712 90%)'
        }}
      />

      {/* Pulsing Central Flare Aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[620px] h-[340px] sm:h-[620px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.24) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 75%)',
          animation: 'ambient-glow 4s ease-in-out infinite'
        }}
      />

      {/* Deep Obsidian Mesh Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.08) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* Cinematic Floating Gold Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[
          { id: 1, left: '12%', bottom: '20%', size: 3, delay: '0.2s', dur: '3.4s', drift: '-15px' },
          { id: 2, left: '20%', bottom: '15%', size: 2, delay: '0.5s', dur: '4.0s', drift: '25px' },
          { id: 3, left: '32%', bottom: '22%', size: 3.5, delay: '0.1s', dur: '3.6s', drift: '-20px' },
          { id: 4, left: '44%', bottom: '10%', size: 2.5, delay: '0.8s', dur: '4.2s', drift: '30px' },
          { id: 5, left: '56%', bottom: '18%', size: 3, delay: '0.3s', dur: '3.5s', drift: '-25px' },
          { id: 6, left: '68%', bottom: '12%', size: 2, delay: '0.6s', dur: '4.1s', drift: '15px' },
          { id: 7, left: '80%', bottom: '22%', size: 3.5, delay: '0.2s', dur: '3.8s', drift: '-30px' },
          { id: 8, left: '88%', bottom: '16%', size: 2, delay: '0.9s', dur: '3.9s', drift: '20px' },
          { id: 9, left: '26%', bottom: '30%', size: 2, delay: '1.1s', dur: '3.2s', drift: '10px' },
          { id: 10, left: '64%', bottom: '28%', size: 2.5, delay: '1.0s', dur: '3.3s', drift: '-12px' },
          { id: 11, left: '50%', bottom: '24%', size: 3, delay: '0.4s', dur: '3.7s', drift: '18px' },
          { id: 12, left: '82%', bottom: '32%', size: 2, delay: '0.7s', dur: '4.0s', drift: '-15px' }
        ].map(p => (
          <div
            key={p.id}
            className="absolute rounded-full bg-gradient-to-t from-amber-400 to-amber-200 shadow-[0_0_8px_rgba(245,158,11,0.8)]"
            style={{
              left: p.left,
              bottom: p.bottom,
              width: `${p.size}px`,
              height: `${p.size}px`,
              animation: `float-particle ${p.dur} cubic-bezier(0.25, 0.46, 0.45, 0.94) ${p.delay} infinite`,
              // @ts-ignore
              '--drift-x': p.drift
            }}
          />
        ))}
      </div>

      {/* Minimal Icon-Only Skip Control (Zero Text) */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleDismiss();
          }}
          className="group relative p-2 sm:p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-slate-300 hover:text-white border border-amber-500/30 hover:border-amber-400/70 backdrop-blur-md transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer active:scale-90"
          aria-label="Skip"
          title="Skip"
        >
          {/* Fast-Forward / Skip Icon (Zero Text) */}
          <svg
            className="w-4 h-4 fill-none stroke-current stroke-2 transition-transform duration-300 group-hover:translate-x-0.5"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Main Cinematic Stage: Showcases the Uploaded Image Without Any Text */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 max-w-2xl">
        {/* Anamorphic Horizontal Light Streak */}
        <div className="relative w-full flex items-center justify-center pointer-events-none mb-3">
          <div
            className="h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.9)]"
            style={{
              animation: 'light-streak 3.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards'
            }}
          />
        </div>

        {/* The Official Image Card */}
        <div
          className="relative group w-[88vw] max-w-[340px] sm:max-w-[460px] md:max-w-[500px] aspect-square rounded-2xl sm:rounded-3xl p-1 sm:p-1.5 bg-gradient-to-tr from-amber-500/40 via-amber-300/30 to-amber-600/40 border border-amber-400/50 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_50px_rgba(245,158,11,0.25)] overflow-hidden"
          style={{
            animation: 'cinematic-zoom 4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
          }}
        >
          {/* Outer Pulse Rings */}
          <div
            className="absolute inset-0 -m-3 rounded-3xl border border-amber-400/30 pointer-events-none"
            style={{ animation: 'pulse-ring 3s cubic-bezier(0.16, 1, 0.3, 1) 0.5s infinite' }}
          />

          {/* Image Container with Rounded Corners */}
          <div className="relative w-full h-full rounded-[18px] sm:rounded-[22px] overflow-hidden bg-white shadow-inner">
            <img
              src={INTRO_IMAGE_SRC}
              alt="Property Studio by Swamy Reddy Javidi"
              className="w-full h-full object-contain bg-white"
              decoding="async"
            />

            {/* Diagonal Light Sheen Sweep Across Card */}
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/35 to-transparent w-full h-full"
              style={{
                animation: 'sheen-sweep 2.6s ease-in-out 1s infinite'
              }}
            />
          </div>
        </div>

        {/* Subtle Bottom Progress Track (Zero Text) */}
        <div className="w-24 sm:w-32 h-[2px] bg-slate-800/80 rounded-full mt-6 overflow-hidden pointer-events-none">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
            style={{
              width: '100%',
              animation: 'light-streak 3.6s linear 0.2s forwards'
            }}
          />
        </div>
      </div>
    </div>
  );
};
