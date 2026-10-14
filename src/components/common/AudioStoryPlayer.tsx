import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  FileText,
  RotateCcw,
  Sparkles,
  Headphones,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface AudioStoryPlayerProps {
  title: string;
  narrator?: string;
  duration?: string;
  audioUrl?: string;
  transcript?: string;
  badge?: string;
  variant?: 'inline' | 'card' | 'compact';
  autoStart?: boolean;
}

export const AudioStoryPlayer: React.FC<AudioStoryPlayerProps> = ({
  title,
  narrator = 'Swamy Reddy Javidi',
  duration = '2:45',
  audioUrl,
  transcript,
  badge = 'Audio Story',
  variant = 'card'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(165); // Default ~2m45s
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [synthSupported, setSynthSupported] = useState(false);
  const [playbackSource, setPlaybackSource] = useState<'IDLE' | 'HOSTED_AUDIO' | 'SYNTHESIS' | 'UNAVAILABLE'>('IDLE');
  const [playbackNotice, setPlaybackNotice] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<number | null>(null);

  // Parse duration string like "2:45" to seconds
  useEffect(() => {
    if (duration) {
      const parts = duration.split(':');
      if (parts.length === 2) {
        const secs = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        if (!isNaN(secs) && secs > 0) {
          setTotalSeconds(secs);
        }
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSynthSupported(true);
    }
  }, [duration]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleTogglePlay = () => {
    if (isPlaying) {
      pauseAudio();
    } else {
      playAudio();
    }
  };

  const playAudio = () => {
    setIsPlaying(true);

    // Try HTML5 Audio if audioUrl exists and is accessible
    if (audioUrl && audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current
        .play()
        .then(() => {
          setPlaybackSource('HOSTED_AUDIO');
          setPlaybackNotice('Streaming hosted broadcast audio file');
        })
        .catch(() => {
          // Explicit fallback to speech synthesis
          fallbackToSpeechSynthesis();
        });
    } else {
      fallbackToSpeechSynthesis();
    }

    // Start progress timer
    if (intervalRef.current) window.clearInterval(intervalRef.current);
    intervalRef.current = window.setInterval(() => {
      setCurrentTime((prev) => {
        if (prev >= totalSeconds) {
          pauseAudio();
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackRate);
  };

  const fallbackToSpeechSynthesis = () => {
    if (synthSupported && transcript) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(transcript);
      utterance.rate = playbackRate;
      utterance.pitch = 0.95;
      utterance.onstart = () => {
        setPlaybackSource('SYNTHESIS');
        setPlaybackNotice('Playing via browser speech synthesis (Hosted MP3 not provisioned on server)');
      };
      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentTime(0);
        setPlaybackSource('IDLE');
        if (intervalRef.current) window.clearInterval(intervalRef.current);
      };
      utterance.onerror = () => {
        handlePlaybackFailure('Speech synthesis interrupted. Read transcript below.');
      };
      speechUtteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    } else {
      handlePlaybackFailure('Audio stream offline. Verified transcript provided below.');
    }
  };

  const handlePlaybackFailure = (msg: string) => {
    pauseAudio();
    setPlaybackSource('UNAVAILABLE');
    setPlaybackNotice(msg);
    setShowTranscript(true);
  };

  const pauseAudio = () => {
    setIsPlaying(false);
    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (synthSupported) {
      window.speechSynthesis.pause();
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleReset = () => {
    pauseAudio();
    setCurrentTime(0);
  };

  const toggleSpeed = () => {
    const speeds = [1.0, 1.25, 1.5];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextRate = speeds[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
    if (isPlaying) {
      // Restart interval with new rate
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      intervalRef.current = window.setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= totalSeconds) {
            pauseAudio();
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / nextRate);
    }
  };

  const progressPercent = Math.min(100, (currentTime / totalSeconds) * 100);

  // Compact variant (e.g. for header bar or card footer)
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3 bg-slate-900 text-white px-3.5 py-2 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={handleTogglePlay}
          aria-label={isPlaying ? 'Pause audio' : 'Play audio narration'}
          className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shrink-0 transition-transform active:scale-95 cursor-pointer shadow-md"
        >
          {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-100 truncate text-[11px]">{title}</p>
          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>{narrator}</span>
            <span aria-hidden="true">·</span>
            <span>{formatTime(currentTime)} / {duration}</span>
          </div>
        </div>
        {transcript && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-amber-400 hover:text-amber-300 p-1 rounded transition-colors text-[11px] flex items-center gap-1"
            title="Toggle Transcript"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl relative overflow-hidden">
      {/* Background ambient waveform glow */}
      <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hidden audio element for actual stream fallback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="none"
          muted={isMuted}
          onEnded={() => {
            setIsPlaying(false);
            setCurrentTime(0);
          }}
        />
      )}

      {/* Header bar: Badge & Narrator */}
      <div className="flex items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-[11px] uppercase tracking-wider font-bold text-amber-400 font-mono">
            {badge}
          </span>
          <span className="text-slate-500" aria-hidden="true">·</span>
          <span className="text-xs text-slate-300 font-medium">{narrator}</span>
        </div>

        {/* Speed toggle & reset */}
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <button
            onClick={toggleSpeed}
            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-[11px] transition-colors cursor-pointer"
            title="Change Playback Speed"
          >
            {playbackRate}x
          </button>
          <button
            onClick={handleReset}
            className="p-1 hover:text-white rounded transition-colors cursor-pointer"
            title="Reset to Beginning"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Title */}
      <h4 className="text-base sm:text-lg font-bold text-slate-50 font-display leading-snug mb-4">
        {title}
      </h4>

      {/* Waveform Visualizer & Progress Slider */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-1 h-7 px-1">
          {Array.from({ length: 32 }).map((_, i) => {
            const barHeight = Math.sin((i / 32) * Math.PI) * 20 + 6;
            const isBarPassed = (i / 32) * 100 <= progressPercent;
            return (
              <div
                key={i}
                className="flex-1 rounded-full transition-all duration-150"
                style={{
                  height: `${isPlaying ? Math.max(4, Math.random() * 24 + 4) : barHeight}px`,
                  backgroundColor: isBarPassed ? '#f59e0b' : '#334155'
                }}
              />
            );
          })}
        </div>

        {/* Native range slider */}
        <div className="relative flex items-center">
          <input
            type="range"
            min={0}
            max={totalSeconds}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Audio progress scrubber"
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{duration}</span>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleTogglePlay}
            aria-label={isPlaying ? 'Pause narration' : 'Play audio narration'}
            className="w-11 h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center font-bold transition-all shadow-lg shadow-amber-500/20 active:scale-95 cursor-pointer"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
          <div>
            <span className="text-xs font-bold text-slate-200 block">
              {isPlaying
                ? (playbackSource === 'SYNTHESIS' ? 'Playing Browser Speech Synthesis (Fallback)' : 'Playing Hosted Broadcast Audio')
                : (playbackSource === 'UNAVAILABLE' ? 'Audio Stream Offline (Transcript Available)' : 'Listen to Audio Analysis')}
            </span>
            <span className="text-[11px] text-slate-400 block truncate max-w-xs sm:max-w-md">
              {playbackNotice || 'Spatial flow, structural checks & market thesis'}
            </span>
          </div>
        </div>

        {transcript && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-amber-400" />
            <span>{showTranscript ? 'Hide Transcript' : 'Transcript'}</span>
            {showTranscript ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Full Transcript Sheet */}
      {showTranscript && transcript && (
        <div className="mt-4 pt-4 border-t border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-4 rounded-xl">
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-400 uppercase tracking-wide">
            <span>Verified Audio Transcript</span>
            <span>Spoken by {narrator}</span>
          </div>
          <p className="whitespace-pre-line text-slate-200">{transcript}</p>
        </div>
      )}
    </div>
  );
};
