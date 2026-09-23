import React, { useState, useRef, useEffect, useCallback } from "react";
import Hls from "hls.js";
import {
  X,
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Film,
  Check,
  Lock,
  Loader2,
  Gauge,
  Sparkles,
  Activity,
  ShieldCheck,
  Zap,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import { setToast } from "../../../../shared/state/uiSlice.jsx";
import { useDispatch } from "react-redux";

/**
 * Format raw seconds to MM:SS string
 */
const formatTime = (seconds) => {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
};

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const VideoPlayerModal = ({ file, isOpen, onClose, onChangeQuality }) => {
  const dispatch = useDispatch();
  const { plan } = useAuth();

  const videoRef = useRef(null);
  const playerContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const controlsTimeoutRef = useRef(null);
  const progressBarRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);
  const perfIntervalRef = useRef(null);

  // Playback & player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isDebouncedBuffering, setIsDebouncedBuffering] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hasStreamError, setHasStreamError] = useState(false);
  const [clickFeedback, setClickFeedback] = useState(null);

  // Quality & Multi-Bitrate state
  const [selectedQuality, setSelectedQuality] = useState("auto"); // "auto" | "1080p" | "720p" | "480p"
  const [activeRendition, setActiveRendition] = useState("Auto");
  const [availableLevels, setAvailableLevels] = useState([]);

  // Adaptive FPS & Performance Monitor state
  const [displayRefreshRate, setDisplayRefreshRate] = useState(60);
  const [liveFps, setLiveFps] = useState(60.0);
  const [droppedFrames, setDroppedFrames] = useState(0);
  const [totalFrames, setTotalFrames] = useState(0);
  const [droppedFrameRatio, setDroppedFrameRatio] = useState(0);
  const [bufferAheadSeconds, setBufferAheadSeconds] = useState(0);
  const [adaptiveStatus, setAdaptiveStatus] = useState("Optimal • 60 FPS");

  // Previous frame counters for 1-second window calculation
  const lastPerfSampleRef = useRef({
    time: performance.now(),
    totalFrames: 0,
    droppedFrames: 0,
  });

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

  // Measure display refresh rate (Hz) using requestAnimationFrame on mount
  useEffect(() => {
    if (!isOpen) return;
    let frames = 0;
    const start = performance.now();
    let animId;

    const measureHz = (now) => {
      frames++;
      if (frames >= 30) {
        const elapsed = (now - start) / 1000;
        const calculatedHz = Math.round(frames / elapsed);
        setDisplayRefreshRate(calculatedHz >= 24 && calculatedHz <= 240 ? calculatedHz : 60);
        return;
      }
      animId = requestAnimationFrame(measureHz);
    };

    animId = requestAnimationFrame(measureHz);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Debounce buffering spinner by 250ms to prevent micro-stutter flash
  useEffect(() => {
    if (isBuffering) {
      const timer = setTimeout(() => setIsDebouncedBuffering(true), 250);
      return () => clearTimeout(timer);
    } else {
      setIsDebouncedBuffering(false);
    }
  }, [isBuffering]);

  // Video Streaming Source Setup & Robust HLS VOD Configuration
  useEffect(() => {
    if (!isOpen || !file || file.type !== "video") return;

    setHasStreamError(false);
    setIsBuffering(true);
    setCurrentTime(0);
    setSelectedQuality("auto");
    setActiveRendition("Auto");

    const video = videoRef.current;
    if (!video) return;

    const sourceUrl = file.hlsUrl || file.hls_master_url || file.downloadUrl;

    if (!sourceUrl) {
      setHasStreamError(true);
      setIsBuffering(false);
      return;
    }

    const isHls = sourceUrl.includes(".m3u8");

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (isHls && Hls.isSupported()) {
      /**
       * High-Performance HLS Configuration for Smooth VOD Streaming
       * - lowLatencyMode: false (Prevents buffer starving and aggressive catchup)
       * - maxBufferLength: 35s (Generous forward buffer for stutter-free playback)
       * - maxMaxBufferLength: 60s
       * - maxBufferHole: 0.5s (Smoothly jumps across micro-timestamp gaps)
       * - highBufferWatchdogPeriod: 2s (Automatically nudges past hidden stalls)
       */
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 35,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        backBufferLength: 30,
        highBufferWatchdogPeriod: 2,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 5,
        abrEwmaDefaultEstimate: 4500000,
        abrBandWidthFactor: 0.85,
        abrBandWidthUpFactor: 0.7,
      });

      hlsRef.current = hls;
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);

        // Extract available multi-bitrate rendition levels
        const parsedLevels = (data.levels || []).map((lvl, index) => {
          const height = lvl.height || 720;
          const fps = lvl.attrs?.["FRAME-RATE"] ? Math.round(lvl.attrs["FRAME-RATE"]) : 60;
          const bitrateNum = lvl.bitrate ? (lvl.bitrate / 1000000).toFixed(1) : null;
          return {
            index,
            height,
            width: lvl.width || 1280,
            fps,
            bitrate: bitrateNum ? `${bitrateNum} Mbps` : "Auto Rate",
            label: `${height}p ${height >= 1080 ? "Full HD" : height >= 720 ? "HD" : "SD"}`,
            value: `${height}p`,
            isLocked: plan === "free" && height >= 1080,
          };
        });

        // Filter unique resolutions in descending quality order
        const uniqueLevels = [];
        const seenHeights = new Set();
        for (const l of parsedLevels) {
          if (!seenHeights.has(l.height)) {
            seenHeights.add(l.height);
            uniqueLevels.push(l);
          }
        }
        uniqueLevels.sort((a, b) => b.height - a.height);
        setAvailableLevels(uniqueLevels);

        // Enforce Free Tier policy on Auto Level Capping
        if (plan === "free") {
          const maxFreeIdx = (data.levels || []).reduce((acc, lvl, idx) => {
            return lvl.height <= 720 ? Math.max(acc, idx) : acc;
          }, -1);
          if (maxFreeIdx !== -1) {
            hls.autoLevelCapping = maxFreeIdx;
          }
        }
      });

      // Track active rendition changes in real time
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          const height = lvl.height || 720;
          const fps = lvl.attrs?.["FRAME-RATE"] ? Math.round(lvl.attrs["FRAME-RATE"]) : 60;
          setActiveRendition(`${height}p @ ${fps}fps`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (file.downloadUrl && file.downloadUrl !== sourceUrl) {
                hls.destroy();
                video.src = file.downloadUrl;
                video.load();
              } else {
                setHasStreamError(true);
                setIsBuffering(false);
              }
              break;
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native Apple HLS Safari engine
      video.src = sourceUrl;
    } else {
      // Direct MP4 fallback playback
      video.src = file.downloadUrl || sourceUrl;
    }

    // Auto-play on mount with promise guard
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          setIsPlaying(false);
        });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, file, plan]);

  // Real-Time Adaptive FPS & Hardware Performance Engine Loop
  useEffect(() => {
    if (!isOpen) return;

    perfIntervalRef.current = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.paused) return;

      const now = performance.now();
      const last = lastPerfSampleRef.current;
      const elapsedSec = (now - last.time) / 1000;

      if (elapsedSec < 0.8) return;

      // 1. Measure decoded & dropped frames via HTML5 Video Quality API
      if (typeof video.getVideoPlaybackQuality === "function") {
        const q = video.getVideoPlaybackQuality();
        const currentTotal = q.totalVideoFrames;
        const currentDropped = q.droppedVideoFrames;

        const deltaTotal = Math.max(0, currentTotal - last.totalFrames);
        const deltaDropped = Math.max(0, currentDropped - last.droppedFrames);

        const calculatedFps = elapsedSec > 0 ? deltaTotal / elapsedSec : displayRefreshRate;
        const boundedFps = Math.min(120, Math.max(0, calculatedFps));
        const currentRatio = deltaTotal > 0 ? (deltaDropped / deltaTotal) * 100 : 0;

        setLiveFps(Math.round(boundedFps * 10) / 10);
        setTotalFrames(currentTotal);
        setDroppedFrames(currentDropped);
        setDroppedFrameRatio(Math.round(currentRatio * 10) / 10);

        // 2. Compute current forward buffer health
        let forwardBuffer = 0;
        if (video.buffered && video.buffered.length > 0) {
          const curTime = video.currentTime;
          for (let i = 0; i < video.buffered.length; i++) {
            if (video.buffered.start(i) <= curTime && curTime <= video.buffered.end(i)) {
              forwardBuffer = video.buffered.end(i) - curTime;
              break;
            }
          }
        }
        setBufferAheadSeconds(Math.round(forwardBuffer * 10) / 10);

        // 3. Adaptive FPS Guard: Prevent frame drops & buffer starving
        if (selectedQuality === "auto") {
          if (hlsRef.current) {
            const hls = hlsRef.current;
            // If dropped frame ratio exceeds 6% (device GPU/CPU struggling with high-bitrate decode)
            if (currentRatio > 6 && hls.currentLevel > 0) {
              hls.nextLevel = Math.max(0, hls.currentLevel - 1);
              setAdaptiveStatus(`Adapting FPS • Stepped down to reduce frame drops`);
            } else if (forwardBuffer < 2.5 && video.currentTime > 2 && hls.currentLevel > 0) {
              // Buffer running dangerously low: step down level to avoid buffer freeze
              hls.nextLevel = Math.max(0, hls.currentLevel - 1);
              setAdaptiveStatus(`Buffer Guard • Lowered bitrate to prevent stall`);
            } else if (currentRatio === 0 && forwardBuffer > 10) {
              setAdaptiveStatus(`Optimal • ${Math.round(boundedFps)} FPS Zero-Stall`);
            } else {
              setAdaptiveStatus(`Optimal • ${Math.round(boundedFps)} FPS Auto`);
            }
          } else {
            setAdaptiveStatus(`Optimal • ${Math.round(boundedFps)} FPS (Direct)`);
          }
        } else {
          setAdaptiveStatus(`Manual Lock • ${selectedQuality.toUpperCase()}`);
        }

        lastPerfSampleRef.current = {
          time: now,
          totalFrames: currentTotal,
          droppedFrames: currentDropped,
        };
      }
    }, 1000);

    return () => {
      if (perfIntervalRef.current) clearInterval(perfIntervalRef.current);
    };
  }, [isOpen, selectedQuality, displayRefreshRate]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      const video = videoRef.current;
      if (!video) return;

      switch (e.key) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlayPause();
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekDelta(-5);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekDelta(5);
          break;
        case "ArrowUp":
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case "ArrowDown":
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "d":
          e.preventDefault();
          setShowDiagnostics((prev) => !prev);
          break;
        case "Escape":
          if (!document.fullscreenElement) {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, volume, isPlaying]);

  if (!isOpen || !file || file.type !== "video") return null;

  // Media Playback Handlers
  const triggerClickFeedback = (type) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setClickFeedback({ type, id: Date.now() });
    feedbackTimeoutRef.current = setTimeout(() => {
      setClickFeedback(null);
    }, 600);
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => {});
      triggerClickFeedback("play");
    } else {
      video.pause();
      setIsPlaying(false);
      triggerClickFeedback("pause");
    }
    resetControlsTimeout();
  };

  const seekDelta = (deltaSeconds) => {
    const video = videoRef.current;
    if (!video) return;
    const target = Math.max(0, Math.min(duration, video.currentTime + deltaSeconds));
    video.currentTime = target;
    setCurrentTime(target);
    resetControlsTimeout();
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const bar = progressBarRef.current;
    if (!video || !bar || !duration) return;

    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * duration;
    video.currentTime = targetTime;
    setCurrentTime(targetTime);
    resetControlsTimeout();
  };

  const handleProgressBarHover = (e) => {
    const bar = progressBarRef.current;
    if (!bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  const changeVolume = (newVol) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    video.muted = clamped === 0;
    setVolume(clamped);
    setIsMuted(clamped === 0);
    resetControlsTimeout();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    if (isMuted) {
      video.muted = false;
      video.volume = volume > 0 ? volume : 0.5;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
    }
    resetControlsTimeout();
  };

  const handleSpeedChange = (speed) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
    resetControlsTimeout();
  };

  const toggleFullscreen = () => {
    const container = playerContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
    resetControlsTimeout();
  };

  // Adaptive Quality Selection & Manual Level Switcher
  const handleQualitySelect = (targetQuality) => {
    const hls = hlsRef.current;

    if (targetQuality === "auto") {
      setSelectedQuality("auto");
      if (hls) {
        hls.currentLevel = -1; // Resume Auto Adaptive Bitrate
      }
      dispatch(
        setToast({
          type: "info",
          message: "Adaptive FPS & Bitrate Engine engaged (Optimal playback).",
        })
      );
      setShowQualityMenu(false);
      resetControlsTimeout();
      return;
    }

    // Check Free Tier plan restriction for 1080p
    if (targetQuality.startsWith("1080") && plan === "free") {
      dispatch(
        setToast({
          type: "warning",
          message:
            "1080p Full HD streaming requires Pro Cloud or Enterprise tier. Retaining 720p HD stream.",
        })
      );
      if (onChangeQuality) onChangeQuality(file.id, "720p");
      setShowQualityMenu(false);
      resetControlsTimeout();
      return;
    }

    setSelectedQuality(targetQuality);

    if (hls && hls.levels && hls.levels.length > 0) {
      const targetHeight = parseInt(targetQuality, 10);
      const matchIdx = hls.levels.findIndex((lvl) => lvl.height === targetHeight);
      if (matchIdx !== -1) {
        hls.currentLevel = matchIdx;
      }
    }

    if (onChangeQuality) {
      onChangeQuality(file.id, targetQuality);
    }

    dispatch(
      setToast({
        type: "info",
        message: `Video stream locked to ${targetQuality}.`,
      })
    );
    setShowQualityMenu(false);
    resetControlsTimeout();
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  // Fallback qualities if levels not yet parsed
  const renderedQualities =
    availableLevels.length > 0
      ? availableLevels
      : [
          {
            label: "1080p Full HD",
            value: "1080p",
            bitrate: "4.5 Mbps",
            fps: 60,
            isLocked: plan === "free",
          },
          {
            label: "720p HD",
            value: "720p",
            bitrate: "2.2 Mbps",
            fps: 60,
            isLocked: false,
          },
          {
            label: "480p SD",
            value: "480p",
            bitrate: "800 Kbps",
            fps: 30,
            isLocked: false,
          },
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        ref={playerContainerRef}
        onMouseMove={resetControlsTimeout}
        className="bg-slate-950 border border-slate-800 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] relative"
      >
        {/* Top Header Bar */}
        <div
          className={`px-5 py-3.5 border-b border-slate-800/80 bg-slate-900/95 flex items-center justify-between z-20 transition-opacity duration-300 ${
            isFullscreen && !showControls ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-950/80 border border-blue-800/40 text-[#1a73e8] flex items-center justify-center shrink-0">
              <Film className="w-5 h-5 stroke-[1.75]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate">{file.name}</h3>
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {selectedQuality === "auto" ? "Adaptive Engine" : "Manual Mode"}
                </span>
                <span>•</span>
                <span className="text-[#1a73e8] font-medium">{activeRendition}</span>
                <span>•</span>
                <span className="text-slate-400">{Math.round(liveFps)} FPS</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Stream Diagnostics HUD Toggle */}
            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`p-2 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 ${
                showDiagnostics
                  ? "bg-blue-600/20 border-blue-500/40 text-blue-400"
                  : "bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
              title="Toggle Live Stream Diagnostics & FPS HUD (d)"
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title="Close video player (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Canvas Viewport */}
        <div
          onClick={togglePlayPause}
          className="relative aspect-video w-full bg-black flex items-center justify-center overflow-hidden cursor-pointer group"
        >
          {/* HTML5 Native Video Tag */}
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onTimeUpdate={() => {
              if (videoRef.current) {
                setCurrentTime(videoRef.current.currentTime);
                if (videoRef.current.buffered.length > 0) {
                  setBufferedEnd(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
                }
              }
            }}
            onLoadedMetadata={() => {
              if (videoRef.current) {
                setDuration(videoRef.current.duration || 0);
                setIsBuffering(false);
              }
            }}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onCanPlay={() => setIsBuffering(false)}
            onError={() => {
              setHasStreamError(true);
              setIsBuffering(false);
            }}
            className="w-full h-full object-contain bg-black"
          />

          {/* Smooth, Non-Jarring Buffering Loader (Debounced by 250ms) */}
          {isDebouncedBuffering && !hasStreamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 backdrop-blur-[2px] pointer-events-none z-10 transition-opacity duration-200">
              <div className="flex flex-col items-center gap-2 p-3.5 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-2xl">
                <Loader2 className="w-7 h-7 text-[#1a73e8] animate-spin" />
                <span className="text-[11px] font-mono text-slate-200 tracking-wider">
                  OPTIMIZING BUFFER...
                </span>
              </div>
            </div>
          )}

          {/* Stream Error Fallback Banner */}
          {hasStreamError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-6 text-center z-10">
              <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800/50 text-rose-400 flex items-center justify-center mb-3">
                <Film className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Video Stream Initializing</h4>
              <p className="text-xs text-slate-400 max-w-md">
                The multi-bitrate HLS rendition pipeline is processing this media file in AWS S3. Please allow a few moments or reload.
              </p>
            </div>
          )}

          {/* Transient Play/Pause Flash Icon on Click Only */}
          {clickFeedback && (
            <div
              key={clickFeedback.id}
              className="absolute inset-0 flex items-center justify-center pointer-events-none z-20"
            >
              <div className="w-16 h-16 rounded-full bg-black/65 backdrop-blur-md border border-white/20 text-white flex items-center justify-center shadow-2xl animate-in zoom-in-75 fade-in duration-150 animate-out zoom-out-95 fade-out duration-300 fill-mode-forwards">
                {clickFeedback.type === "pause" ? (
                  <Pause className="w-7 h-7" />
                ) : (
                  <Play className="w-7 h-7 fill-current translate-x-0.5" />
                )}
              </div>
            </div>
          )}

          {/* Live Floating Stream Diagnostics HUD Card */}
          {showDiagnostics && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-4 left-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-md shadow-2xl z-30 font-mono text-xs w-72 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#1a73e8]" />
                  Engine Diagnostics
                </span>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/50">
                  LIVE
                </span>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Decoded FPS:</span>
                  <span className="font-bold text-white flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {liveFps} / {displayRefreshRate} Hz
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
                  <span className="text-slate-500">Dropped Frames:</span>
                  <span
                    className={`font-medium ${
                      droppedFrames === 0 ? "text-slate-300" : "text-amber-400"
                    }`}
                  >
                    {droppedFrames} ({droppedFrameRatio}%)
                  </span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Rendition:</span>
                  <span className="text-[#1a73e8] font-semibold">{activeRendition}</span>
                </div>

                <div className="flex justify-between items-center text-slate-300">
                  <span className="text-slate-500">Engine Mode:</span>
                  <span className="text-slate-300 uppercase">
                    {selectedQuality === "auto" ? "Adaptive FPS (Auto)" : "Manual Lock"}
                  </span>
                </div>
              </div>

              <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[10px] text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{adaptiveStatus}</span>
              </div>
            </div>
          )}

          {/* Top-Right Performance Pill Badge */}
          <div
            className={`absolute top-4 right-4 px-3 py-1.5 rounded-full bg-black/75 backdrop-blur-md text-xs font-mono text-white flex items-center gap-2 border border-white/10 z-10 transition-opacity duration-300 pointer-events-none ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>
              {selectedQuality === "auto"
                ? activeRendition === "Auto"
                  ? "Adaptive FPS (Auto)"
                  : `Auto • ${activeRendition}`
                : activeRendition}
            </span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-300">{Math.round(liveFps)} FPS</span>
          </div>

          {/* Bottom Player Controls Overlay Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/85 to-transparent pt-12 pb-3 px-4 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
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
              {/* Left Controls: Play/Pause, Skip 5s, Volume, Time */}
              <div className="flex items-center gap-2 sm:gap-3">
                <button
                  onClick={togglePlayPause}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title={isPlaying ? "Pause (k/space)" : "Play (k/space)"}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5" />
                  ) : (
                    <Play className="w-5 h-5 fill-current translate-x-0.5" />
                  )}
                </button>

                {/* Volume & Mute with Hover Slider */}
                <div className="flex items-center gap-1.5 group/vol">
                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                    title={isMuted ? "Unmute (m)" : "Mute (m)"}
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
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
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
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px] text-slate-200"
                    title="Playback speed"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{playbackSpeed}x</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-28 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl py-1 text-xs z-30">
                      <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Speed
                      </div>
                      {SPEED_OPTIONS.map((speed) => (
                        <button
                          key={speed}
                          onClick={() => handleSpeedChange(speed)}
                          className={`w-full px-3 py-1.5 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            playbackSpeed === speed ? "text-[#1a73e8] font-bold" : "text-white"
                          }`}
                        >
                          <span>{speed === 1 ? "1.0x Normal" : `${speed}x`}</span>
                          {playbackSpeed === speed && <Check className="w-3.5 h-3.5 text-[#1a73e8]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Multi-Bitrate & Auto Adaptive Quality Selector */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowSpeedMenu(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px] text-slate-200"
                    title="Select streaming quality & FPS"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span className="capitalize">
                      {selectedQuality === "auto" ? "Auto" : selectedQuality}
                    </span>
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-60 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden py-1 text-xs z-30">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
                        <span>Quality & Bitrate</span>
                        {plan === "free" && (
                          <span className="text-[10px] text-amber-400 font-normal">Free: 720p Max</span>
                        )}
                      </div>

                      {/* Auto Adaptive FPS Option */}
                      <button
                        onClick={() => handleQualitySelect("auto")}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition-colors border-b border-slate-800/60 ${
                          selectedQuality === "auto"
                            ? "text-[#1a73e8] font-bold bg-blue-950/20"
                            : "text-white"
                        }`}
                      >
                        <div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Zap className="w-3.5 h-3.5 text-amber-400" />
                            <span>Auto (Adaptive FPS)</span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                            Optimal buffer & hardware sync
                          </div>
                        </div>
                        {selectedQuality === "auto" && <Check className="w-4 h-4 text-[#1a73e8]" />}
                      </button>

                      {/* Rendition Levels */}
                      {renderedQualities.map((q) => (
                        <button
                          key={q.value}
                          onClick={() => handleQualitySelect(q.value)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            selectedQuality === q.value
                              ? "text-[#1a73e8] font-bold bg-blue-950/20"
                              : q.isLocked
                              ? "text-slate-400 hover:text-slate-300"
                              : "text-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5 font-medium">
                              <span>{q.label}</span>
                              {q.isLocked && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Lock className="w-2.5 h-2.5" />
                                  Pro
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-2">
                              <span>{q.bitrate}</span>
                              <span>•</span>
                              <span>{q.fps || 60} FPS</span>
                            </div>
                          </div>
                          {selectedQuality === q.value && (
                            <Check className="w-4 h-4 text-[#1a73e8]" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Fullscreen Toggle */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-200 hover:text-white transition-colors"
                  title="Fullscreen (f)"
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayerModal;
