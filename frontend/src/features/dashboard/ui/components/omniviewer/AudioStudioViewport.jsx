import React, { useState, useRef, useEffect } from "react";
import {
  Music,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Volume1,
  Gauge,
  Radio,
  Sparkles,
  Share2,
  Download,
  X,
} from "lucide-react";

const formatTime = (sec) => {
  if (!sec || isNaN(sec) || !isFinite(sec)) return "00:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
};

const AudioStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState(1);

  const audioRef = useRef(null);
  const audioUrl = file.downloadUrl || file.download_url || downloadLink || null;
  const fileName = file.name || "audio.mp3";

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.pause();
    }
  }, [file.id, file.file_id, file.name]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSeek = (e) => {
    if (!audioRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const target = pos * duration;
    audioRef.current.currentTime = target;
    setCurrentTime(target);
  };

  const handleSpeedToggle = () => {
    const speeds = [0.75, 1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(speed) + 1) % speeds.length;
    const next = speeds[nextIdx];
    setSpeed(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = next;
    }
  };

  const handleVolumeChange = (v) => {
    setVolume(v);
    setIsMuted(v === 0);
    if (audioRef.current) {
      audioRef.current.volume = v;
      audioRef.current.muted = v === 0;
    }
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      style={{ maxHeight: "calc(100vh - 105px)" }}
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden relative select-none"
    >
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />

      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-slate-300 shrink-0 z-20">
        {/* Left: Format & Track Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Music className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-white text-xs truncate max-w-[160px] sm:max-w-xs font-sans">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-mono shrink-0">
            AUDIO
          </span>
          {duration > 0 && (
            <span className="text-slate-400 text-[11px] font-mono hidden sm:inline">
              {formatTime(duration)}
            </span>
          )}
        </div>

        {/* Right: Actions (Speed, Volume, Share, Download, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Speed Toggle */}
          <button
            onClick={handleSpeedToggle}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-all text-xs font-mono"
            title="Playback Speed"
          >
            <Gauge className="w-3.5 h-3.5 text-slate-400" />
            <span>{speed}x</span>
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-xl px-2.5 py-1">
            <button
              onClick={() => handleVolumeChange(isMuted ? 1 : 0)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-3.5 h-3.5 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-3.5 h-3.5" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-14 sm:w-16 accent-cyan-400 cursor-pointer h-1"
            />
          </div>

          {/* Share Link */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Link */}
          {(downloadLink || audioUrl) && (
            <a
              href={downloadLink || audioUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Download audio file"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Audio Visualizer Stage */}
      <div className="flex-1 w-full min-h-0 relative flex flex-col items-center justify-center p-6 bg-slate-950/70 overflow-y-auto custom-scrollbar">
        {/* Center Vinyl / Waveform Studio Graphic */}
        <div className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-full bg-gradient-to-tr from-slate-900 via-cyan-950 to-slate-900 border-4 border-white/10 shadow-[0_0_50px_rgba(6,182,212,0.2)] flex items-center justify-center mb-6">
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full border border-white/10 flex items-center justify-center ${
              isPlaying ? "animate-spin [animation-duration:8s]" : ""
            }`}
          >
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-slate-950 border-2 border-cyan-500/40 flex items-center justify-center shadow-inner">
              <Music className="w-8 h-8 text-cyan-400" />
            </div>
          </div>

          {/* Pulsing Aura */}
          {isPlaying && (
            <div className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping [animation-duration:3s] pointer-events-none" />
          )}
        </div>

        {/* Track Title */}
        <div className="text-center max-w-md mb-4">
          <h3 className="text-sm sm:text-base font-bold text-white truncate drop-shadow-md mb-1">
            {fileName}
          </h3>
          <p className="text-xs text-slate-400 font-mono">
            {file.size || "Original Master"} • 48 kHz High-Fidelity
          </p>
        </div>

        {/* Dynamic Audio Equalizer Bars */}
        <div className="flex items-center gap-1 h-10 mb-5">
          {Array.from({ length: 32 }).map((_, i) => {
            const heightPercent = isPlaying
              ? Math.max(15, Math.sin(i * 0.4 + currentTime * 5) * 45 + 50)
              : 15;

            return (
              <div
                key={i}
                style={{ height: `${heightPercent}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPlaying
                    ? "bg-gradient-to-t from-cyan-500 to-blue-400"
                    : "bg-slate-800"
                }`}
              />
            );
          })}
        </div>

        {/* Scrubber Progress Bar */}
        <div className="w-full max-w-md mb-4 px-2">
          <div
            onClick={handleSeek}
            className="relative w-full h-2 bg-white/15 hover:h-2.5 rounded-full cursor-pointer transition-all flex items-center"
          >
            <div
              style={{ width: `${progress}%` }}
              className="absolute top-0 bottom-0 left-0 bg-cyan-400 rounded-full shadow-[0_0_10px_rgba(6,182,212,0.6)]"
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-cyan-400" />
            </div>
          </div>

          <div className="flex justify-between items-center text-[11px] font-mono text-slate-400 mt-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Master Play / Pause Button */}
        <button
          onClick={togglePlay}
          className="w-13 h-13 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 flex items-center justify-center shadow-xl shadow-cyan-500/25 transition-all hover:scale-105 active:scale-95"
        >
          {isPlaying ? (
            <Pause className="w-6 h-6 fill-current" />
          ) : (
            <Play className="w-6 h-6 fill-current translate-x-0.5" />
          )}
        </button>
      </div>
    </div>
  );
};

export default AudioStudioViewport;
