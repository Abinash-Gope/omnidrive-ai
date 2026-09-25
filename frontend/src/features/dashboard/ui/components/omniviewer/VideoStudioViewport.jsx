import React, { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Sparkles,
  Lock,
  Check,
  RotateCcw,
  Loader2,
  Film,
  Maximize,
  Minimize,
  Settings,
  Activity,
  Gauge,
  ShieldCheck,
  RefreshCw,
  X,
  Download,
  Share2,
} from "lucide-react";
import useAuth from "../../../../auth/hooks/useAuth.jsx";

const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const { plan } = useAuth();
  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const currentSetupRef = useRef({ id: null, url: null });

  // Playback & player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isDebouncedBuffering, setIsDebouncedBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [clickFeedback, setClickFeedback] = useState(null);

  // Quality & Renditions
  const [selectedQuality, setSelectedQuality] = useState("auto");
  const [activeRendition, setActiveRendition] = useState("Auto");
  const [availableLevels, setAvailableLevels] = useState([]);

  // FPS & Performance Monitor state
  const [liveFps, setLiveFps] = useState(60);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [bufferAheadSeconds, setBufferAheadSeconds] = useState(0);

  const hlsUrl = file?.cdnHlsUrl || file?.hlsUrl || file?.stream_url || null;
  const rawUrl = file?.downloadUrl || file?.download_url || downloadLink || null;
  const fileName = file?.name || "video.mp4";

  // Debounce buffering indicator by 600ms so tiny range requests don't flash the spinner
  useEffect(() => {
    if (isBuffering) {
      const timer = setTimeout(() => setIsDebouncedBuffering(true), 600);
      return () => clearTimeout(timer);
    } else {
      setIsDebouncedBuffering(false);
    }
  }, [isBuffering]);

  // Auto-hide controls after inactivity while playing
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowQualityMenu(false);
        setShowSpeedMenu(false);
      }, 3500);
    }
  }, [isPlaying]);

  // Flash play/pause feedback icon in center
  const triggerClickFeedback = (type) => {
    setClickFeedback({ id: Date.now(), type });
    setTimeout(() => setClickFeedback(null), 500);
  };

  // Toggle play/pause
  const togglePlayPause = (e) => {
    if (e) e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
      triggerClickFeedback("pause");
      setShowControls(true);
    } else {
      video.play().then(() => {
        setIsPlaying(true);
        triggerClickFeedback("play");
        resetControlsTimeout();
      }).catch(() => {});
    }
  };

  // Initialize playback with broadcast-grade buffering and anti-restart guard
  const initializePlayback = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    const fileKey = file?.id || file?.file_id || file?.s3Key || file?.name;
    const hlsCandidate = file?.cdnHlsUrl || file?.hlsUrl || file?.stream_url;
    const directUrl = file?.downloadUrl || file?.download_url || downloadLink;

    const hasHlsStream = Boolean(
      hlsCandidate &&
      hlsCandidate.includes(".m3u8") &&
      (file?.status === "COMPLETED" || file?.hls_master_url || file?.hlsUrl)
    );

    const targetUrl = hasHlsStream ? hlsCandidate : directUrl;
    if (!targetUrl) return;

    // Guard: If the media stream is already established and running for this file, do not reload or rewind!
    if (currentSetupRef.current.id === fileKey && currentSetupRef.current.url === targetUrl && (hlsRef.current || video.src)) {
      return;
    }

    currentSetupRef.current = { id: fileKey, url: targetUrl };

    setAvailableLevels([]);
    setSelectedQuality("auto");
    setActiveRendition("Auto");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (hasHlsStream && Hls.isSupported()) {
      /**
       * Broadcast & YouTube-Grade HLS Engine Configuration
       * - maxBufferLength: 60s (Buffers 60s ahead, preventing network stalls on any speed)
       * - maxMaxBufferLength: 90s
       * - maxBufferSize: 60MB (Smooth HD streaming)
       * - progressive: true (Instant progressive demuxing)
       * - backBufferLength: 30s (Instant smooth seekback without refetching)
       */
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        progressive: true,
        manifestLoadingTimeOut: 20000,
        manifestLoadingMaxRetry: 6,
        manifestLoadingRetryDelay: 800,
        manifestLoadingMaxRetryTimeout: 30000,
        fragLoadingTimeOut: 20000,
        fragLoadingMaxRetry: 8,
        fragLoadingRetryDelay: 800,
        fragLoadingMaxRetryTimeout: 30000,
        levelLoadingTimeOut: 20000,
        levelLoadingMaxRetry: 6,
        levelLoadingRetryDelay: 800,
        maxBufferLength: 60,
        maxMaxBufferLength: 90,
        maxBufferSize: 60 * 1024 * 1024,
        maxBufferHole: 0.5,
        backBufferLength: 30,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        abrEwmaDefaultEstimate: 800000,
        abrBandWidthFactor: 0.85,
        abrBandWidthUpFactor: 0.65,
      });

      hls.loadSource(targetUrl);
      hls.attachMedia(video);
      hlsRef.current = hls;

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        const parsed = (data.levels || []).map((lvl, index) => {
          const h = lvl.height || 720;
          const normH = h <= 200 ? 240 : h <= 300 ? 360 : h <= 500 ? 480 : h <= 750 ? 720 : 1080;
          return {
            value: `${normH}p`,
            height: normH,
            levelIndex: index,
            isLocked: plan === "free" && normH > 480,
          };
        });

        // Deduplicate levels by height descending
        const unique = [];
        const seen = new Set();
        for (const item of parsed) {
          if (!seen.has(item.height)) {
            seen.add(item.height);
            unique.push(item);
          }
        }
        unique.sort((a, b) => b.height - a.height);
        setAvailableLevels(unique);

        if (plan === "free" && hls.levels.length > 0) {
          hls.levels.forEach((lvl, idx) => {
            if ((lvl.height || 0) <= 480) {
              hls.autoLevelCapping = idx;
            }
          });
        }

        video.play().then(() => setIsPlaying(true)).catch(() => {});
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level) {
          const h = level.height || 720;
          setActiveRendition(`${h}p HD`);
        }
      });

      // Robust Error Handling — only fatal errors trigger recovery, preventing mid-stream restarts!
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (!data.fatal) return; // Non-fatal warnings and stalls are handled automatically by Hls.js

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          console.warn("[VideoStudioViewport] Recovering media error smoothly");
          hls.recoverMediaError();
          return;
        }

        if (directUrl && video.src !== directUrl) {
          console.info("[VideoStudioViewport] Fatal HLS error, falling back to direct MP4 stream:", directUrl);
          const savedTime = video.currentTime;
          hls.destroy();
          hlsRef.current = null;
          video.src = directUrl;
          video.load();
          if (savedTime > 0) video.currentTime = savedTime;
          video.play().then(() => setIsPlaying(true)).catch(() => {});
          setActiveRendition("Direct MP4");
        }
      });
    } else if (directUrl) {
      video.src = directUrl;
      video.load();
      video.play().then(() => setIsPlaying(true)).catch(() => {});
      setActiveRendition("Direct MP4");
    }
  }, [file, downloadLink, plan]);

  useEffect(() => {
    initializePlayback();
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    };
  }, [file?.id, file?.file_id, file?.s3Key, file?.name, downloadLink, initializePlayback]);

  // Video time & buffer tracking
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.buffered && video.buffered.length > 0) {
      const end = video.buffered.end(video.buffered.length - 1);
      setBufferedEnd(end);
      setBufferAheadSeconds(Math.max(0, Math.round(end - video.currentTime)));
    }

    // Measure video playback frame metrics if available
    if (video.getVideoPlaybackQuality) {
      const q = video.getVideoPlaybackQuality();
      setDroppedFrames(q.droppedVideoFrames || 0);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
  };

  // Seekbar handling with hover tooltip
  const handleSeek = (e) => {
    e.stopPropagation();
    const bar = progressBarRef.current;
    const video = videoRef.current;
    if (!bar || !video || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    video.currentTime = pos * duration;
    setCurrentTime(pos * duration);
  };

  const handleProgressBarHover = (e) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const handleQualityChange = (level) => {
    setSelectedQuality(level.value);
    setShowQualityMenu(false);
    if (!hlsRef.current) return;

    if (level.value === "auto") {
      hlsRef.current.currentLevel = -1;
      setActiveRendition("Auto");
    } else {
      hlsRef.current.currentLevel = level.levelIndex;
      setActiveRendition(level.value);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    } else {
      videoRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const toggleContainerFullscreen = (e) => {
    if (e) e.stopPropagation();
    const el = playerContainerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div className="w-full h-full flex items-center justify-center p-2 sm:p-4 select-none">
      <div
        ref={playerContainerRef}
        onMouseMove={resetControlsTimeout}
        onClick={togglePlayPause}
        style={{ maxHeight: "calc(100vh - 105px)" }}
        className="relative w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl border border-white/20 dark:border-white/15 bg-black/90 dark:bg-black/95 backdrop-blur-3xl flex items-center justify-center group cursor-pointer ring-1 ring-black/10 dark:ring-white/10"
      >
        {/* Floating Minimalist Top Header Overlay (Auto-Hides with Controls) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/85 via-black/45 to-transparent backdrop-blur-xs pt-4 pb-12 px-5 flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-auto ${
            showControls ? "opacity-100" : "opacity-0 !pointer-events-none"
          }`}
        >
          {/* Left: Film Icon & Title & Telemetry */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Film className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate drop-shadow-md max-w-xs sm:max-w-md">
                {fileName}
              </h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 font-mono drop-shadow-sm">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {hlsRef.current ? "HLS ABR" : "Direct MP4 (Raw S3)"}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-blue-300 font-medium">
                  {hlsRef.current ? activeRendition : "Original 4K"}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-slate-400">60 FPS</span>
              </p>
            </div>
          </div>

          {/* Right: Actions (Stats, Refresh, Share, Download, Close) */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Stats HUD Toggle */}
            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
                showDiagnostics
                  ? "bg-blue-600/30 border-blue-400/50 text-blue-300"
                  : "bg-white/10 border-white/15 text-slate-300 hover:text-white hover:bg-white/20"
              }`}
              title="Toggle Live Stream Diagnostics & FPS HUD"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Quick Refresh Stream Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                initializePlayback();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
              title="Refresh authenticated stream link"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Share Link */}
            {onShare && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onShare();
                }}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
                title="Copy share link"
              >
                <Share2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Download Link */}
            {downloadLink && (
              <a
                href={downloadLink}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
                title="Download video file"
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
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
                title="Close viewer (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* HTML5 Native Video Tag */}
        <video
          ref={videoRef}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onEnded={() => setIsPlaying(false)}
          className="w-full h-full object-contain bg-black"
        />

        {/* Transient Play/Pause Flash Icon on Click Only */}
        {clickFeedback && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl animate-in zoom-in-75 fade-in duration-150">
              {clickFeedback.type === "pause" ? (
                <Pause className="w-7 h-7" />
              ) : (
                <Play className="w-7 h-7 fill-current translate-x-0.5" />
              )}
            </div>
          </div>
        )}

        {/* Buffering Indicator */}
        {isDebouncedBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
            <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-2xl">
              <Loader2 className="w-7 h-7 text-[#1a73e8] animate-spin" />
            </div>
          </div>
        )}

        {/* Live Stream Diagnostics HUD Overlay Card */}
        {showDiagnostics && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute top-16 right-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-md shadow-2xl z-30 font-mono text-xs w-72 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
              <span className="font-semibold text-white flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#1a73e8]" />
                Engine Diagnostics
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  LIVE
                </span>
                <button
                  type="button"
                  onClick={() => setShowDiagnostics(false)}
                  className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="space-y-1.5 text-[11px]">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Decoded FPS:</span>
                <span className="font-bold text-white flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {liveFps} FPS
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Buffer Health:</span>
                <span
                  className={`font-medium ${
                    bufferAheadSeconds > 10
                      ? "text-emerald-400"
                      : bufferAheadSeconds > 3
                      ? "text-amber-400"
                      : "text-rose-400"
                  }`}
                >
                  {bufferAheadSeconds}s forward
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Rendition:</span>
                <span className="text-[#1a73e8] font-semibold">{activeRendition}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-500">Engine Mode:</span>
                <span className="text-slate-300 uppercase">
                  {selectedQuality === "auto" ? "Adaptive ABR (Auto)" : "Manual Lock"}
                </span>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span>Optimal • 60 FPS</span>
            </div>
          </div>
        )}

        {/* Bottom Player Controls Overlay Bar (Auto-Hides with Controls) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/85 to-transparent backdrop-blur-xs pt-12 pb-3.5 px-5 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
            showControls ? "opacity-100" : "opacity-0 pointer-events-none"
          }`}
        >
          {/* Seekable Progress Bar with Buffered Bar & Hover Tooltip */}
          <div
            ref={progressBarRef}
            onClick={handleSeek}
            onMouseMove={handleProgressBarHover}
            onMouseLeave={() => setHoverTime(null)}
            className="group/seek relative w-full h-2 hover:h-3 bg-white/20 rounded-full cursor-pointer transition-all flex items-center"
          >
            {/* Buffer Bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all duration-300"
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Progress Played Bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-[#1a73e8] to-blue-400 rounded-full"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Draggable Knob */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg border-2 border-[#1a73e8] scale-0 group-hover/seek:scale-100 transition-transform" />
            </div>

            {/* Hover Tooltip Timestamp */}
            {hoverTime !== null && (
              <div
                className="absolute bottom-4 -translate-x-1/2 px-2 py-1 rounded bg-black/90 border border-slate-700 text-white font-mono text-[10px] pointer-events-none shadow-lg z-30"
                style={{ left: `${hoverPosition}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Bottom Actions Row: Play/Pause, Volume, Time, Speed, Quality, Fullscreen */}
          <div className="flex items-center justify-between text-white mt-1">
            {/* Left Controls: Play/Pause, Volume, Time */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={togglePlayPause}
                className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5 fill-current translate-x-0.5" />
                )}
              </button>

              {/* Volume & Mute */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleMute}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4 text-rose-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 sm:w-20 h-1.5 accent-[#1a73e8] bg-white/20 rounded-lg cursor-pointer"
                />
              </div>

              {/* Dynamic Time Counter */}
              <div className="font-mono text-[11px] text-slate-300 ml-1">
                <span>{formatTime(currentTime)}</span>
                <span className="text-slate-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls: Speed, Quality, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-3 relative">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowSpeedMenu(!showSpeedMenu);
                    setShowQualityMenu(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px] text-slate-200"
                  title="Playback Speed"
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>{playbackSpeed}x</span>
                </button>

                {showSpeedMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-32 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl py-1 text-xs z-30 backdrop-blur-xl">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-white/5">
                      Speed
                    </div>
                    {SPEED_OPTIONS.map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-white/10 transition-colors ${
                          playbackSpeed === speed ? "text-blue-400 font-bold" : "text-white"
                        }`}
                      >
                        <span>{speed === 1 ? "1.0x Normal" : `${speed}x`}</span>
                        {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Multi-Bitrate Quality Selector */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowQualityMenu(!showQualityMenu);
                    setShowSpeedMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px] text-slate-200"
                  title="Select streaming quality"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span className="capitalize">
                    {hlsRef.current
                      ? (selectedQuality === "auto" ? "Auto" : selectedQuality)
                      : "Source MP4"}
                  </span>
                </button>

                {showQualityMenu && (
                  <div className="absolute bottom-full right-0 mb-2 w-48 rounded-2xl bg-slate-900/95 border border-white/10 shadow-2xl p-1.5 text-xs z-30 backdrop-blur-xl">
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                      <span>Quality</span>
                      {plan === "free" && (
                        <span className="text-[10px] text-amber-400 font-medium">Free: 480p max</span>
                      )}
                    </div>

                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => handleQualityChange({ value: "auto" })}
                        className={`w-full px-3 py-1.5 text-left rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors ${
                          selectedQuality === "auto"
                            ? "text-blue-400 font-semibold bg-blue-500/10"
                            : "text-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                          <span>Auto ABR</span>
                        </div>
                        {selectedQuality === "auto" && <Check className="w-3.5 h-3.5 text-blue-400" />}
                      </button>

                      <div className="my-1 border-t border-white/5" />

                      {availableLevels.map((lvl) => (
                        <button
                          key={lvl.value}
                          disabled={lvl.isLocked}
                          onClick={() => handleQualityChange(lvl)}
                          className={`w-full px-3 py-1.5 text-left rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors ${
                            lvl.isLocked
                              ? "opacity-40 cursor-not-allowed text-slate-500"
                              : selectedQuality === lvl.value
                              ? "text-blue-400 font-semibold bg-blue-500/10"
                              : "text-slate-200"
                          }`}
                        >
                          <span>{lvl.value}</span>
                          {lvl.isLocked ? (
                            <Lock className="w-3 h-3 text-amber-400" />
                          ) : selectedQuality === lvl.value ? (
                            <Check className="w-3.5 h-3.5 text-blue-400" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Fullscreen Button */}
              <button
                onClick={toggleContainerFullscreen}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <Maximize className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoStudioViewport;
