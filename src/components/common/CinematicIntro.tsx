import React, { useState, useEffect, useCallback } from 'react';
import { ASSET_IMAGES } from '../../data/mockData';

const SESSION_KEY = 'ps_cinematic_intro_seen_v1';

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
  const [logoLoaded, setLogoLoaded] = useState(false);

  const handleDismiss = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // Ignore storage errors in restricted private browsing
    }

    // Allow smooth 600ms exit fade-out before unmounting
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 600);

    return () => clearTimeout(timer);
  }, [isExiting, onComplete]);

  // Keyboard navigation: Escape or Space skips the intro immediately
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

  // Automatic progression: 3.8s cinematic duration then smooth exit
  useEffect(() => {
    if (!visible) return;

    const autoTimer = setTimeout(() => {
      handleDismiss();
    }, 3800);

    return () => clearTimeout(autoTimer);
  }, [visible, handleDismiss]);

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Property Studio Cinematic Intro"
      className={`fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-[#030712] select-none transition-all duration-700 ease-out ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none filter blur-sm' : 'opacity-100 scale-100'
      }`}
    >
      <style>{`
        @keyframes cinematic-zoom {
          0% { transform: scale(0.96); }
          100% { transform: scale(1.04); }
        }
        @keyframes ambient-glow {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.15); }
        }
        @keyframes light-streak {
          0% { width: 0%; opacity: 0; }
          30% { width: 100%; opacity: 0.9; }
          70% { width: 100%; opacity: 0.7; }
          100% { width: 120%; opacity: 0; }
        }
        @keyframes emblem-reveal {
          0% { opacity: 0; transform: scale(0.82) translateY(12px); filter: blur(8px); }
          50% { opacity: 1; transform: scale(1.02) translateY(0); filter: blur(0px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes sheen-sweep {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(240%) skewX(-20deg); }
        }
        @keyframes text-reveal-1 {
          0% { opacity: 0; transform: translateY(8px); letter-spacing: 0.15em; filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); letter-spacing: 0.35em; filter: blur(0px); }
        }
        @keyframes text-reveal-title {
          0% { opacity: 0; transform: translateY(14px) scale(0.97); filter: blur(6px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0px); }
        }
        @keyframes text-reveal-sub {
          0% { opacity: 0; transform: translateY(10px); filter: blur(4px); }
          100% { opacity: 1; transform: translateY(0); filter: blur(0px); }
        }
        @keyframes float-particle {
          0% { transform: translateY(0) translateX(0); opacity: 0; }
          20% { opacity: 0.8; }
          80% { opacity: 0.6; }
          100% { transform: translateY(-120px) translateX(var(--drift-x, 20px)); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.85); opacity: 0.8; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      `}</style>

      {/* Atmospheric Background & Ambient Lighting */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at 50% 48%, rgba(245, 158, 11, 0.14) 0%, rgba(15, 23, 42, 0.6) 45%, #030712 90%)'
        }}
      />

      {/* Pulsing Central Flare Aura */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] sm:w-[560px] h-[340px] sm:h-[560px] rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.22) 0%, rgba(217, 119, 6, 0.08) 50%, transparent 75%)',
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
          { id: 1, left: '15%', bottom: '25%', size: 3, delay: '0.2s', dur: '3.4s', drift: '-15px' },
          { id: 2, left: '22%', bottom: '15%', size: 2, delay: '0.5s', dur: '4.0s', drift: '25px' },
          { id: 3, left: '35%', bottom: '20%', size: 4, delay: '0.1s', dur: '3.6s', drift: '-20px' },
          { id: 4, left: '42%', bottom: '10%', size: 2.5, delay: '0.8s', dur: '4.2s', drift: '30px' },
          { id: 5, left: '55%', bottom: '18%', size: 3, delay: '0.3s', dur: '3.5s', drift: '-25px' },
          { id: 6, left: '68%', bottom: '12%', size: 2, delay: '0.6s', dur: '4.1s', drift: '15px' },
          { id: 7, left: '78%', bottom: '22%', size: 3.5, delay: '0.2s', dur: '3.8s', drift: '-30px' },
          { id: 8, left: '85%', bottom: '16%', size: 2, delay: '0.9s', dur: '3.9s', drift: '20px' },
          { id: 9, left: '28%', bottom: '30%', size: 2, delay: '1.1s', dur: '3.2s', drift: '10px' },
          { id: 10, left: '62%', bottom: '28%', size: 2.5, delay: '1.0s', dur: '3.3s', drift: '-12px' },
          { id: 11, left: '48%', bottom: '24%', size: 3, delay: '0.4s', dur: '3.7s', drift: '18px' },
          { id: 12, left: '80%', bottom: '32%', size: 2, delay: '0.7s', dur: '4.0s', drift: '-15px' }
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

      {/* Skip Intro Button */}
      <div className="absolute top-4 sm:top-6 right-4 sm:right-6 z-20">
        <button
          type="button"
          onClick={handleDismiss}
          className="group relative inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-900/90 text-slate-300 hover:text-white border border-amber-500/30 hover:border-amber-400/60 backdrop-blur-md text-[11px] font-bold tracking-wider uppercase transition-all duration-300 shadow-[0_4px_16px_rgba(0,0,0,0.5)] cursor-pointer active:scale-95"
          aria-label="Skip website intro animation"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Skip Intro</span>
          <span className="text-amber-400 transition-transform duration-300 group-hover:translate-x-0.5">→</span>
        </button>
      </div>

      {/* Main Cinematic Stage (Dolly-in Zoom) */}
      <div
        className="relative z-10 flex flex-col items-center justify-center px-4 max-w-2xl text-center"
        style={{
          animation: 'cinematic-zoom 4s cubic-bezier(0.16, 1, 0.3, 1) forwards'
        }}
      >
        {/* Anamorphic Horizontal Light Streak */}
        <div className="relative w-full flex items-center justify-center pointer-events-none mb-2">
          <div
            className="h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_16px_rgba(251,191,36,0.9)]"
            style={{
              animation: 'light-streak 3.2s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards'
            }}
          />
        </div>

        {/* Central Official Emblem Jewel */}
        <div
          className="relative group mb-5 sm:mb-6"
          style={{
            animation: 'emblem-reveal 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.3s both'
          }}
        >
          {/* Subtle Outer Pulse Rings */}
          <div
            className="absolute inset-0 -m-3 rounded-3xl border border-amber-400/30 pointer-events-none"
            style={{ animation: 'pulse-ring 2.8s cubic-bezier(0.16, 1, 0.3, 1) 0.6s infinite' }}
          />

          {/* Golden Ambient Backlight Halo */}
          <div className="absolute inset-0 -m-4 bg-gradient-to-tr from-amber-500/30 via-orange-500/20 to-transparent rounded-3xl blur-xl" />

          {/* The Emblem Card */}
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-3xl bg-slate-900/90 p-2 sm:p-2.5 border-2 border-amber-400/80 shadow-[0_0_40px_rgba(245,158,11,0.35),0_20px_40px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-md">
            <img
              src={ASSET_IMAGES.officialLogoSquare || ASSET_IMAGES.officialLogo}
              alt="Property Studio Official Emblem"
              className="w-full h-full object-contain rounded-2xl bg-white/95 transition-opacity duration-500"
              onLoad={() => setLogoLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = ASSET_IMAGES.officialLogo;
              }}
            />

            {/* Diagonal Light Sweep Across Logo */}
            <div
              className="absolute inset-0 pointer-events-none bg-gradient-to-r from-transparent via-white/40 to-transparent w-full h-full"
              style={{
                animation: 'sheen-sweep 2.4s ease-in-out 1.2s infinite'
              }}
            />
          </div>
        </div>

        {/* Typography Reveal 1: Pre-title */}
        <p
          className="text-[10px] sm:text-xs font-bold text-amber-400/90 uppercase mb-2 select-none"
          style={{
            animation: 'text-reveal-1 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.2s both'
          }}
        >
          Swamy Reddy Javidi Presents
        </p>

        {/* Typography Reveal 2: Brand Name "PROPERTY STUDIO" */}
        <h1
          className="font-display text-3xl sm:text-5xl md:text-6xl font-black tracking-[0.14em] uppercase text-white mb-2.5 sm:mb-3 drop-shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
          style={{
            animation: 'text-reveal-title 1.3s cubic-bezier(0.16, 1, 0.3, 1) 1.5s both'
          }}
        >
          <span className="bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent">
            Property Studio
          </span>
        </h1>

        {/* Hairline Divider with Diamond */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 w-48 sm:w-64 my-1 opacity-80"
          style={{
            animation: 'text-reveal-sub 1.2s cubic-bezier(0.16, 1, 0.3, 1) 1.9s both'
          }}
        >
          <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent via-amber-400/60 to-amber-400" />
          <div className="w-1.5 h-1.5 rotate-45 bg-amber-400 shadow-[0_0_6px_rgba(245,158,11,0.9)]" />
          <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent via-amber-400/60 to-amber-400" />
        </div>

        {/* Typography Reveal 3: Tagline */}
        <p
          className="text-[10.5px] sm:text-xs md:text-sm font-semibold tracking-[0.24em] text-slate-300 uppercase mt-2 mb-1"
          style={{
            animation: 'text-reveal-sub 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.1s both'
          }}
        >
          Institutional Real Estate Intelligence
        </p>

        {/* Region Tag */}
        <p
          className="text-[9px] sm:text-[10px] font-mono tracking-[0.22em] text-amber-400/80 uppercase"
          style={{
            animation: 'text-reveal-sub 1.2s cubic-bezier(0.16, 1, 0.3, 1) 2.4s both'
          }}
        >
          Hyderabad · Telangana
        </p>

        {/* Subtle Bottom Progress Indicator */}
        <div className="w-28 sm:w-36 h-[2px] bg-slate-800 rounded-full mt-6 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-300"
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
