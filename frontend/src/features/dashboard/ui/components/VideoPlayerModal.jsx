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
  Cpu,
  Tv,
  Film,
  Check,
  Lock,
  RotateCcw,
  Loader2,
  Gauge,
  Sparkles,
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

  // Playback & player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [hasStreamError, setHasStreamError] = useState(false);
  const [clickFeedback, setClickFeedback] = useState(null);
  const feedbackTimeoutRef = useRef(null);

  // Plan Quality Policy: Free tier defaults to 720p and 1080p is locked
  const currentQuality =
    plan === "free"
      ? file?.activeQuality === "1080p"
        ? "720p"
        : file?.activeQuality || "720p"
      : file?.activeQuality || "1080p";

  const qualities = [
    {
      label: "1080p Full HD",
      value: "1080p",
      bitrate: "5.2 Mbps",
      resolution: "1920x1080",
      isLocked: plan === "free",
    },
    {
      label: "720p HD",
      value: "720p",
      bitrate: "2.8 Mbps",
      resolution: "1280x720",
      isLocked: false,
    },
    {
      label: "480p SD",
      value: "480p",
      bitrate: "1.2 Mbps",
      resolution: "854x480",
      isLocked: false,
    },
  ];

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

  // Video Streaming Source Setup
  useEffect(() => {
    if (!isOpen || !file || file.type !== "video") return;

    setHasStreamError(false);
    setIsBuffering(true);
    setCurrentTime(0);

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
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(sourceUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsBuffering(false);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          // If HLS fails, attempt direct MP4 fallback
          if (file.downloadUrl && file.downloadUrl !== sourceUrl) {
            hls.destroy();
            video.src = file.downloadUrl;
            video.load();
          } else {
            setHasStreamError(true);
            setIsBuffering(false);
          }
        }
      });
    } else if (isHls && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = sourceUrl;
    } else {
      // Direct MP4 playback
      video.src = file.downloadUrl || sourceUrl;
    }

    // Auto-play on mount
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch(() => {
          // Browser prevented autoplay without prior interaction; keep paused
          setIsPlaying(false);
        });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, file]);

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

  // Free Tier Quality Downgrade Enforcement Logic
  const handleQualitySelect = (targetQuality) => {
    if (targetQuality === "1080p" && plan === "free") {
      // 1. Trigger warning toast informing the user about Pro requirement
      dispatch(
        setToast({
          type: "warning",
          message: "1080p Full HD streaming requires Pro Cloud or Enterprise tier. Your stream has been automatically downgraded to 720p HD.",
        })
      );

      // 2. Enforce / retain 720p
      if (onChangeQuality) {
        onChangeQuality(file.id, "720p");
      }
      setShowQualityMenu(false);
      resetControlsTimeout();
      return;
    }

    // Apply allowed resolution
    if (onChangeQuality) {
      onChangeQuality(file.id, targetQuality);
    }

    dispatch(
      setToast({
        type: "info",
        message: `Adaptive bitrate stream switched to ${targetQuality}.`,
      })
    );
    setShowQualityMenu(false);
    resetControlsTimeout();
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
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
              <p className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>Adaptive HLS Stream</span>
                <span>•</span>
                <span className="text-[#1a73e8] font-mono font-medium">{currentQuality}</span>
                {plan === "free" && (
                  <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-300 font-mono">
                    Free Tier 720p Max
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Close video player (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
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
            onError={() => {
              setHasStreamError(true);
              setIsBuffering(false);
            }}
            className="w-full h-full object-contain bg-black"
          />

          {/* Buffering Loader Spinner */}
          {isBuffering && !hasStreamError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-2xs pointer-events-none z-10">
              <div className="flex flex-col items-center gap-2.5">
                <Loader2 className="w-10 h-10 text-[#1a73e8] animate-spin" />
                <span className="text-xs font-mono text-white/80 tracking-wider">
                  STREAMING BUFFER...
                </span>
              </div>
            </div>
          )}

          {/* Error Fallback Banner */}
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

          {/* Transient Play/Pause Flash Icon on Click Only (disappears after 600ms, never lingers) */}
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

          {/* Top-Right Active Resolution Badge */}
          <div
            className={`absolute top-4 right-4 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs font-mono text-white flex items-center gap-2 border border-white/10 z-10 transition-opacity duration-300 pointer-events-none ${
              showControls ? "opacity-100" : "opacity-0"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>HLS {currentQuality}</span>
          </div>

          {/* Bottom Player Controls Overlay Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-12 pb-3 px-4 flex flex-col gap-2 z-20 transition-opacity duration-300 ${
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
                  className="absolute bottom-5 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-white font-mono text-[10px] pointer-events-none border border-white/10 shadow-lg"
                  style={{ left: `${hoverPosition}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}
            </div>

            {/* Bottom Row Controls */}
            <div className="flex items-center justify-between text-white text-xs mt-1">
              {/* Left Controls: Play/Pause, Volume, Timer */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlayPause}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition-colors"
                  title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
                </button>

                {/* Rewind 5s */}
                <button
                  onClick={() => seekDelta(-5)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors hidden sm:block"
                  title="Rewind 5 seconds (←)"
                >
                  <RotateCcw className="w-4 h-4" />
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
                  <span>{formatTime(duration || 220)}</span>
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

                {/* Stream Bitrate / Quality Selector with Free Tier Lock */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setShowQualityMenu(!showQualityMenu);
                      setShowSpeedMenu(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 transition-colors font-mono text-[11px] text-slate-200"
                    title="Select streaming quality"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>{currentQuality}</span>
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-2 w-56 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden py-1 text-xs z-30">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800/80 flex items-center justify-between">
                        <span>Stream Bitrate</span>
                        {plan === "free" && (
                          <span className="text-[10px] text-amber-400 font-normal">Free: 720p Max</span>
                        )}
                      </div>

                      {qualities.map((q) => (
                        <button
                          key={q.value}
                          onClick={() => handleQualitySelect(q.value)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between hover:bg-slate-800 transition-colors ${
                            currentQuality === q.value
                              ? "text-[#1a73e8] font-bold bg-blue-950/20"
                              : q.isLocked
                              ? "text-slate-400 hover:text-slate-300"
                              : "text-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span>{q.label}</span>
                              {q.isLocked && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  <Lock className="w-2.5 h-2.5" />
                                  Pro
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {q.isLocked ? "Clicks will downgrade to 720p" : q.bitrate}
                            </div>
                          </div>
                          {currentQuality === q.value && <Check className="w-4 h-4 text-[#1a73e8]" />}
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

        {/* Technical Transcoder Pipeline Footer (Hidden in Fullscreen) */}
        {!isFullscreen && (
          <div className="p-5 bg-slate-950 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <Cpu className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Transcoding Engine</span>
              </span>
              <p className="font-mono text-white text-[11px]">
                {plan === "enterprise"
                  ? "Dedicated ARM64 Fargate Cluster"
                  : plan === "pro"
                  ? "AWS Graviton3 Priority Worker"
                  : "AWS ECS Fargate ARM64 Spot"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {plan === "enterprise" ? "Private VPC execution" : "FFmpeg 6.1 static binary"}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <Tv className="w-3.5 h-3.5 text-emerald-400" />
                <span>Streaming Format</span>
              </span>
              <p className="font-mono text-white text-[11px]">
                {plan === "enterprise" ? "HLS .m3u8 (BYOK KMS Encrypted)" : "HLS .m3u8 Master Playlist"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">6s TS segments with AAC audio</p>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 mb-1">
                <Film className="w-3.5 h-3.5 text-purple-400" />
                <span>Adaptive Renditions</span>
              </span>
              <p className="font-mono text-white text-[11px]">
                {plan === "enterprise"
                  ? "4K Cinema • 1080p • 720p"
                  : plan === "pro"
                  ? "1080p • 720p • 480p"
                  : "720p • 480p (Pro: 1080p)"}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {plan === "free" ? "Free account locked to 720p max" : "Automated multi-bitrate S3 distribution"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayerModal;
