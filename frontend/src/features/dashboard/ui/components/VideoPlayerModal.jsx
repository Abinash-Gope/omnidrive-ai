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
  RefreshCw,
  WifiOff,
  AlertCircle,
  Crown,
  ArrowRight,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import { setToast } from "../../../../shared/state/uiSlice.jsx";
import { useDispatch } from "react-redux";
import { getFilesApi } from "../../api/dashboardApi.jsx";

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
  const { plan, handleUpdatePlan } = useAuth();

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

  // 3G Resilience & Auto-Recovery state
  const [streamMode, setStreamMode] = useState("auto"); // "auto" | "direct-mp4"
  const [retryCount, setRetryCount] = useState(0);
  const [reconnectCountdown, setReconnectCountdown] = useState(0);
  const [isAutoRetrying, setIsAutoRetrying] = useState(false);
  const [streamErrorReason, setStreamErrorReason] = useState(null); // "network_stall" | "processing" | null
  const [reloadTrigger, setReloadTrigger] = useState(0);
  const [activeFile, setActiveFile] = useState(file);
  const activeFileRef = useRef(file);
  activeFileRef.current = activeFile;
  const currentMediaIdRef = useRef(null);
  const currentSetupRef = useRef({ id: null, mode: null, trigger: null });
  const retryTimerRef = useRef(null);
  const maxRetries = 2;

  useEffect(() => {
    const fileId = file?.id || file?.file_id || file?.s3Key;
    if (fileId && fileId !== currentMediaIdRef.current) {
      currentMediaIdRef.current = fileId;
      setActiveFile(file);
      setStreamMode("auto");
      setRetryCount(0);
      setHasStreamError(false);
      setIsAutoRetrying(false);
      setReconnectCountdown(0);
      setSelectedQuality("auto");
      setActiveRendition("Auto");
    } else if (file) {
      setActiveFile(file);
    }
  }, [file]);

  // Quality & Multi-Bitrate state
  const [selectedQuality, setSelectedQuality] = useState("auto"); // "auto" | "1080p" | "720p" | "480p"
  const [activeRendition, setActiveRendition] = useState("Auto");
  const [availableLevels, setAvailableLevels] = useState([]);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);
  const [upgradeTargetQuality, setUpgradeTargetQuality] = useState("");

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

  // Debounce buffering spinner by 750ms to prevent micro-stutter flash during brief Range requests
  useEffect(() => {
    if (isBuffering) {
      const timer = setTimeout(() => setIsDebouncedBuffering(true), 750);
      return () => clearTimeout(timer);
    } else {
      setIsDebouncedBuffering(false);
    }
  }, [isBuffering]);

  // Active playback recovery & dynamic URL refresh
  const isRefreshingRef = useRef(false);
  const savedPlaybackTimeRef = useRef(0);

  // Dynamically refresh authenticated S3 presigned URLs via API Gateway without user lockout
  const refreshFileAndStream = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsBuffering(true);
    setHasStreamError(false);

    if (videoRef.current && videoRef.current.currentTime > 0) {
      savedPlaybackTimeRef.current = videoRef.current.currentTime;
    }

    try {
      const latestFiles = await getFilesApi();
      const currentTarget = activeFileRef.current;
      const updated = latestFiles.find(
        (f) =>
          (f.id && (f.id === currentTarget?.id || f.id === currentTarget?.file_id)) ||
          (f.file_id && (f.file_id === currentTarget?.file_id || f.file_id === currentTarget?.id)) ||
          (f.s3Key && f.s3Key === currentTarget?.s3Key)
      );

      if (updated) {
        console.info("[VideoPlayerModal] Successfully refreshed presigned streaming URL from AWS S3.");
        setActiveFile(updated);
      }
    } catch (err) {
      console.warn("[VideoPlayerModal] Could not refresh URL from API:", err);
    } finally {
      isRefreshingRef.current = false;
      setRetryCount(0);
      setIsAutoRetrying(false);
      setReconnectCountdown(0);
      setHasStreamError(false);
      setIsBuffering(true);
      setReloadTrigger((t) => t + 1);
    }
  }, []);


  // Trigger automated backoff reconnection for 3G cellular stability
  const triggerAutoRetry = useCallback((reason = "network_stall") => {
    setStreamErrorReason(reason);

    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (reason === "processing") {
      setHasStreamError(true);
      setIsBuffering(false);
      setIsAutoRetrying(false);
      setReconnectCountdown(0);
      return;
    }

    setRetryCount((prevCount) => {
      const nextCount = prevCount + 1;
      if (nextCount <= maxRetries) {
        const backoffSec = 3;
        setReconnectCountdown(backoffSec);
        setIsAutoRetrying(true);
        setHasStreamError(true);
        setIsBuffering(false);

        let currentSec = backoffSec;
        retryTimerRef.current = setInterval(() => {
          currentSec -= 1;
          setReconnectCountdown(currentSec);
          if (currentSec <= 0) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
            refreshFileAndStream();
          }
        }, 1000);
      } else {
        // If max retries reached, attempt an automatic silent refresh instead of locking the user out!
        refreshFileAndStream();
      }
      return nextCount;
    });
  }, [maxRetries, refreshFileAndStream]);

  // Immediate manual retry (refreshes presigned URL and resumes playback)
  const handleManualRetry = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    refreshFileAndStream();
  }, [refreshFileAndStream]);

  // Force direct MP4 fallback playback (low-bandwidth mode)
  const handleForceDirectMp4 = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    setStreamMode("direct-mp4");
    setIsAutoRetrying(false);
    setReconnectCountdown(0);
    setHasStreamError(false);
    setIsBuffering(true);
    setReloadTrigger((t) => t + 1);
  }, []);

  // Video error handler on native HTML5 <video>
  const handleVideoError = useCallback(() => {
    const video = videoRef.current;
    const errorCode = video?.error?.code;
    console.warn("[VideoPlayerModal] Native video error event:", errorCode);

    const currentTarget = activeFileRef.current;
    const rawUrl = currentTarget?.downloadUrl || currentTarget?.download_url;
    if (streamMode !== "direct-mp4" && rawUrl) {
      console.info("[VideoPlayerModal] HLS stream error, falling back to direct MP4 stream:", rawUrl);
      setStreamMode("direct-mp4");
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      setHasStreamError(false);
      setIsBuffering(true);
      setReloadTrigger((t) => t + 1);
      return;
    }

    // Code 4: MEDIA_ERR_SRC_NOT_SUPPORTED - indicates expired S3 signature or dropped range request
    // Automatically fetch a fresh presigned URL from API Gateway instead of locking out the user
    if ((errorCode === 4 || !rawUrl) && !isRefreshingRef.current) {
      console.info("[VideoPlayerModal] Expired S3 presigned URL or network drop detected. Refreshing stream...");
      refreshFileAndStream();
    } else {
      setIsBuffering(true);
    }
  }, [streamMode, refreshFileAndStream]);

  // Background Cloud Poller: If the video is still processing in AWS, automatically
  // poll every 4s and auto-play as soon as status becomes COMPLETED or HLS is ready
  useEffect(() => {
    if (!isOpen || !activeFile) return;
    const isPending =
      activeFile.status === "PROCESSING" ||
      activeFile.status === "APPROVED_PROCESSING" ||
      activeFile.status === "PENDING_PROCESSING" ||
      activeFile.status === "PENDING_UPLOAD";

    if (!isPending) return;

    const timer = setInterval(async () => {
      try {
        const latestFiles = await getFilesApi();
        const updated = latestFiles.find(
          (f) =>
            (f.id && (f.id === activeFile.id || f.id === activeFile.file_id)) ||
            (f.file_id && (f.file_id === activeFile.file_id || f.file_id === activeFile.id)) ||
            (f.s3Key && f.s3Key === activeFile.s3Key)
        );
        if (updated && (updated.status === "COMPLETED" || updated.hlsUrl)) {
          console.info("[VideoPlayerModal] Video transcoding finished! Auto-reloading stream.");
          clearInterval(timer);
          setActiveFile(updated);
          setStreamMode("auto");
          setHasStreamError(false);
          setReloadTrigger((t) => t + 1);
        }
      } catch (err) {
        console.warn("[VideoPlayerModal] Polling file status notice:", err);
      }
    }, 4000);

    return () => clearInterval(timer);
  }, [isOpen, activeFile]);

  // Clean up timers on close
  useEffect(() => {
    if (!isOpen) {
      if (retryTimerRef.current) {
        clearInterval(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setIsAutoRetrying(false);
      setReconnectCountdown(0);
      setHasStreamError(false);
    }
  }, [isOpen]);

  // Video Streaming Source Setup & Robust HLS VOD Configuration
  const activeFileId = activeFile?.id || activeFile?.file_id || activeFile?.s3Key;

  useEffect(() => {
    const isVideo =
      activeFile?.type === "video" ||
      /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(activeFile?.name || "");

    if (!isOpen || !activeFile || !isVideo) return;

    const currentKey = activeFile.id || activeFile.file_id || activeFile.s3Key;
    const isNewMedia = currentSetupRef.current.id !== currentKey;
    const isModeChange = currentSetupRef.current.mode !== streamMode;
    const isManualReload = currentSetupRef.current.trigger !== reloadTrigger;

    const video = videoRef.current;
    if (!video) return;

    // Guard: If the media stream is already established and running for this file, mode, and reloadTrigger, do not reload or rewind!
    if (!isNewMedia && !isModeChange && !isManualReload && (hlsRef.current || video.src)) {
      return;
    }

    currentSetupRef.current = { id: currentKey, mode: streamMode, trigger: reloadTrigger };

    setHasStreamError(false);
    setIsBuffering(true);

    if (isNewMedia) {
      setCurrentTime(0);
      setSelectedQuality("auto");
      setActiveRendition("Auto");
    }

    const rawUrl = activeFile.downloadUrl || activeFile.download_url;
    const hlsCandidate = activeFile.cdnHlsUrl || activeFile.hlsUrl || activeFile.hls_master_url;

    // Only attempt HLS if streamMode allows it AND an HLS stream actually exists (not a 404 placeholder)
    const hasHlsStream = Boolean(
      streamMode !== "direct-mp4" &&
      hlsCandidate &&
      hlsCandidate.includes(".m3u8") &&
      (activeFile.status === "COMPLETED" || activeFile.hls_master_url)
    );

    const targetUrl = hasHlsStream ? hlsCandidate : rawUrl;

    if (!targetUrl) {
      const isProcessing =
        activeFile.status === "PROCESSING" ||
        activeFile.status === "APPROVED_PROCESSING" ||
        activeFile.status === "PENDING_PROCESSING";

      if (!isProcessing && !isRefreshingRef.current) {
        refreshFileAndStream();
        return;
      }

      setStreamErrorReason(isProcessing ? "processing" : "network_stall");
      setHasStreamError(true);
      setIsBuffering(false);
      setIsAutoRetrying(false);
      setReconnectCountdown(0);
      return;
    }

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (hasHlsStream && Hls.isSupported()) {
      /**
       * Broadcast & YouTube-Grade HLS Engine Configuration
       * - maxBufferLength: 60s (Buffers a full 60 seconds ahead, preventing network stalls)
       * - maxMaxBufferLength: 90s (Permits up to 90s buffer on stable connections)
       * - maxBufferSize: 60MB (Generous memory pool for seamless high-definition chunks)
       * - progressive: true (Progressive MP4/TS fragment demuxing for instantaneous rendering)
       * - backBufferLength: 30s (Retains 30s of watched footage in RAM for instant rewind)
       * - enableWorker: true (Runs demuxer/transmuxer in separate Web Worker thread)
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

      hlsRef.current = hls;
      hls.loadSource(targetUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);

        // Map all available rendition levels directly from Hls.js
        const parsedLevels = (data.levels || []).map((lvl, index) => {
          const rawH = lvl.height || 720;
          const normH =
            rawH <= 200 ? 240 :
            rawH <= 300 ? 360 :
            rawH <= 500 ? 480 :
            rawH <= 750 ? 720 :
            rawH <= 1200 ? 1080 :
            rawH <= 1600 ? 1440 : 2160;

          const fps = lvl.attrs?.["FRAME-RATE"] ? Math.round(lvl.attrs["FRAME-RATE"]) : 60;
          const bitrateMbps = lvl.bitrate ? (lvl.bitrate / 1000000).toFixed(1) : null;
          const bitrateKbps = lvl.bitrate ? Math.round(lvl.bitrate / 1000) : null;
          const bitrateDisplay = bitrateMbps && parseFloat(bitrateMbps) >= 1.0
            ? `${bitrateMbps} Mbps`
            : bitrateKbps
            ? `${bitrateKbps} kbps`
            : "Auto Rate";

          const tierSuffix =
            normH >= 2160 ? "4K Ultra HD" :
            normH >= 1440 ? "2K QHD" :
            normH >= 1080 ? "Full HD" :
            normH >= 720 ? "HD" :
            normH >= 480 ? "SD" :
            normH >= 360 ? "Low" : "Ultra-Low";

          return {
            levelIndex: index,
            height: normH,
            rawHeight: rawH,
            width: lvl.width || 1280,
            fps,
            bitrate: bitrateDisplay,
            label: `${normH}p ${tierSuffix}`,
            value: `${normH}p`,
            isLocked: plan === "free" && normH > 480,
          };
        });

        // Deduplicate resolutions keeping the highest bitrate entry for each resolution tier,
        // and sort in descending resolution order (1080p -> 720p -> 480p -> 360p -> 240p)
        const uniqueMap = new Map();
        for (const l of parsedLevels) {
          if (!uniqueMap.has(l.height)) {
            uniqueMap.set(l.height, l);
          }
        }
        const uniqueLevels = Array.from(uniqueMap.values()).sort((a, b) => b.height - a.height);
        setAvailableLevels(uniqueLevels);

        // FREE TIER RESOLUTION CLAMPING:
        // Capped to 480p SD max on Free plan
        if (plan === "free" && hls.levels && hls.levels.length > 0) {
          let maxFreeLevelIndex = -1;
          hls.levels.forEach((lvl, idx) => {
            const h = lvl.height || 0;
            const normH = h <= 200 ? 240 : h <= 300 ? 360 : h <= 500 ? 480 : h <= 750 ? 720 : 1080;
            if (normH <= 480) {
              maxFreeLevelIndex = Math.max(maxFreeLevelIndex, idx);
            }
          });

          if (maxFreeLevelIndex === -1) {
            maxFreeLevelIndex = Math.min(2, Math.max(0, Math.floor(hls.levels.length / 2) - 1));
          }

          // Lock autoLevelCapping to 480p maximum
          hls.autoLevelCapping = maxFreeLevelIndex;
          hls.startLevel = 0; // Quick initial startup at lowest bandwidth
        } else if (hls.levels && hls.levels.length > 0) {
          hls.autoLevelCapping = -1;
        }

        // Trigger seamless auto-playback
        video.play().catch(() => {});
      });

      // Track active rendition changes in real time
      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const lvl = hls.levels[data.level];
        if (lvl) {
          const rawH = lvl.height || 720;
          const normH = rawH <= 200 ? 240 : rawH <= 300 ? 360 : rawH <= 500 ? 480 : rawH <= 750 ? 720 : 1080;
          const fps = lvl.attrs?.["FRAME-RATE"] ? Math.round(lvl.attrs["FRAME-RATE"]) : 60;
          setActiveRendition(`${normH}p @ ${fps}fps`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn("[VideoPlayerModal] Hls.js error:", data.type, data.details, data.response?.code);

        const isMissingManifest =
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
          data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
          data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
          data.response?.code === 404 ||
          data.response?.code === 403;

        if (isMissingManifest && rawUrl) {
          console.info("[VideoPlayerModal] HLS manifest missing; falling back to direct MP4 streaming:", rawUrl);
          setStreamMode("direct-mp4");
          hls.destroy();
          hlsRef.current = null;
          video.src = rawUrl;
          video.load();
          video.play().catch(() => {});
          return;
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (rawUrl && streamMode !== "direct-mp4") {
                console.info("[VideoPlayerModal] Fatal network error on HLS, falling back to direct MP4 stream:", rawUrl);
                setStreamMode("direct-mp4");
                hls.destroy();
                hlsRef.current = null;
                video.src = rawUrl;
                video.load();
                video.play().catch(() => {});
              } else {
                triggerAutoRetry("network_stall");
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              if (rawUrl && streamMode !== "direct-mp4") {
                setStreamMode("direct-mp4");
                hls.destroy();
                hlsRef.current = null;
                video.src = rawUrl;
                video.load();
                video.play().catch(() => {});
              } else {
                triggerAutoRetry("network_stall");
              }
              break;
          }
        }
      });
    } else if (hasHlsStream && video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = targetUrl;
      video.load();
    } else {
      // Direct MP4 fallback playback
      video.src = targetUrl;
      video.load();
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
  }, [isOpen, activeFileId, plan, streamMode, reloadTrigger, triggerAutoRetry]);

  // Seamless background probe: When playing in direct-mp4 mode, check if Cloud HLS transcode has completed
  useEffect(() => {
    if (!isOpen || streamMode !== "direct-mp4") return;

    const hlsCandidate = activeFile?.cdnHlsUrl || activeFile?.hlsUrl || activeFile?.hls_master_url;
    if (!hlsCandidate || !hlsCandidate.includes(".m3u8")) return;

    let isCancelled = false;
    const probeInterval = setInterval(async () => {
      try {
        const res = await fetch(hlsCandidate, { method: "HEAD", cache: "no-cache" });
        if (res.ok && !isCancelled) {
          console.info("[VideoPlayerModal] Cloud HLS transcode completed! Seamlessly switching to Netflix-grade ABR stream.");
          if (videoRef.current && videoRef.current.currentTime > 0) {
            savedPlaybackTimeRef.current = videoRef.current.currentTime;
          }
          setStreamMode("hls");
          setReloadTrigger((t) => t + 1);
          dispatch(
            setToast({
              type: "success",
              message: "🚀 Cloud Transcoding Complete! Switched to Netflix-grade Adaptive Bitrate Streaming.",
            })
          );
        }
      } catch (_) {}
    }, 12000);

    return () => {
      isCancelled = true;
      clearInterval(probeInterval);
    };
  }, [isOpen, streamMode, activeFile, dispatch]);

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

        // 3. Performance Monitor Status Display (Hls.js ABR handles smooth bitrate selection)
        if (selectedQuality === "auto") {
          const capInfo = plan === "free" ? "Free 480p SD Cap" : "Pro 1080p ABR";
          setAdaptiveStatus(`Optimal • ${Math.round(boundedFps)} FPS Auto (${capInfo})`);
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

  // Adaptive Quality Selection & Manual Level Switcher with Timestamp Preservation
  const handleQualitySelect = (targetQuality, targetLevelIndex) => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;

    // Check Free Tier plan restriction for 720p and 1080p (Free tier locked to 480p max)
    const isHdQuality =
      targetQuality.startsWith("1080") ||
      targetQuality.startsWith("720") ||
      targetQuality === "original";

    if (isHdQuality && plan === "free") {
      setUpgradeTargetQuality(
        targetQuality.startsWith("1080") ? "1080p Full HD" : "720p HD"
      );
      setShowUpgradePrompt(true);
      setShowQualityMenu(false);
      resetControlsTimeout();
      return;
    }

    // Save exact playback timestamp and playback state BEFORE any level adjustments
    const savedTime = video.currentTime;
    const wasPlaying = !video.paused;

    setSelectedQuality(targetQuality);

    if (targetQuality === "auto") {
      setActiveRendition("Auto");
      if (hls && hls.levels && hls.levels.length > 0) {
        if (plan === "free") {
          let maxFreeLevelIndex = -1;
          hls.levels.forEach((lvl, idx) => {
            const h = lvl.height || 0;
            const normH =
              h <= 200 ? 240 : h <= 300 ? 360 : h <= 500 ? 480 : h <= 750 ? 720 : 1080;
            if (normH <= 480) {
              maxFreeLevelIndex = Math.max(maxFreeLevelIndex, idx);
            }
          });
          hls.autoLevelCapping = maxFreeLevelIndex !== -1 ? maxFreeLevelIndex : 0;
        } else {
          hls.autoLevelCapping = -1;
        }
        hls.currentLevel = -1; // Re-engage automatic ABR
        hls.nextLevel = -1;
      }
      dispatch(
        setToast({
          type: "info",
          message:
            plan === "free"
              ? "Adaptive Engine active (Free Tier capped at 480p SD)."
              : "Adaptive Bitrate Engine engaged (Optimal playback).",
        })
      );
    } else {
      // Manual Quality Selection
      if (hls && hls.levels && hls.levels.length > 0) {
        let matchIdx = -1;
        if (
          typeof targetLevelIndex === "number" &&
          targetLevelIndex >= 0 &&
          targetLevelIndex < hls.levels.length
        ) {
          matchIdx = targetLevelIndex;
        } else {
          const targetHeight = parseInt(targetQuality, 10);
          matchIdx = hls.levels.findIndex((lvl) => {
            const rawH = lvl.height || 0;
            const normH =
              rawH <= 200 ? 240 : rawH <= 300 ? 360 : rawH <= 500 ? 480 : rawH <= 750 ? 720 : 1080;
            return normH === targetHeight || Math.abs(rawH - targetHeight) <= 60;
          });

          if (matchIdx === -1) {
            matchIdx = hls.levels.reduce((closest, lvl, idx) => {
              if (closest === -1) return idx;
              const diff1 = Math.abs((lvl.height || 0) - targetHeight);
              const diff2 = Math.abs((hls.levels[closest].height || 0) - targetHeight);
              return diff1 < diff2 ? idx : closest;
            }, -1);
          }
        }

        if (matchIdx !== -1) {
          // Switch to exact level without buffer destruction
          hls.currentLevel = matchIdx;
          hls.nextLevel = matchIdx;
          const lvl = hls.levels[matchIdx];
          const rawH = lvl?.height || parseInt(targetQuality, 10);
          const normH =
            rawH <= 200 ? 240 : rawH <= 300 ? 360 : rawH <= 500 ? 480 : rawH <= 750 ? 720 : 1080;
          const fps = lvl?.attrs?.["FRAME-RATE"]
            ? Math.round(lvl.attrs["FRAME-RATE"])
            : 60;
          setActiveRendition(`${normH}p @ ${fps}fps`);
        }
      } else if (!hls) {
        setActiveRendition(targetQuality);
      }

      dispatch(
        setToast({
          type: "info",
          message: `Video stream locked to ${targetQuality}.`,
        })
      );
    }

    // Critical: Timestamp preservation across quality switch
    // Guard against Hls.js buffer flush or browser video element seeking to 0:00
    if (savedTime > 0) {
      if (Math.abs(video.currentTime - savedTime) > 0.5) {
        video.currentTime = savedTime;
      }
      if (wasPlaying && video.paused) {
        video.play().catch(() => {});
      }

      // Next tick / RAF verification
      requestAnimationFrame(() => {
        if (video && savedTime > 0 && Math.abs(video.currentTime - savedTime) > 0.5) {
          video.currentTime = savedTime;
          if (wasPlaying && video.paused) {
            video.play().catch(() => {});
          }
        }
      });

      // Temporary 1.2s timeupdate guard
      const protectTimestamp = () => {
        if (video && savedTime > 0 && video.currentTime < 0.5 && savedTime >= 1.0) {
          video.currentTime = savedTime;
          if (wasPlaying && video.paused) {
            video.play().catch(() => {});
          }
        }
      };
      video.addEventListener("timeupdate", protectTimestamp);
      setTimeout(() => {
        video.removeEventListener("timeupdate", protectTimestamp);
      }, 1200);
    }

    if (onChangeQuality) {
      onChangeQuality(targetQuality);
    }

    setShowQualityMenu(false);
    resetControlsTimeout();
  };

  const handleUpgradeNow = () => {
    handleUpdatePlan("pro");
    setShowUpgradePrompt(false);
    dispatch(
      setToast({
        type: "success",
        message: "🎉 Upgraded to Pro Cloud! 1080p Full HD & High-Bitrate streaming unlocked.",
      })
    );
    const target = upgradeTargetQuality.includes("1080") ? "1080p" : "720p";
    setTimeout(() => {
      handleQualitySelect(target);
    }, 150);
  };

  const progressPercent = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration ? (bufferedEnd / duration) * 100 : 0;

  // Fallback qualities if levels not yet parsed (5-tier ladder)
  const renderedQualities =
    availableLevels.length > 0
      ? availableLevels
      : [
          {
            label: "1080p Full HD",
            value: "1080p",
            bitrate: "3.5 Mbps",
            fps: 60,
            isLocked: plan === "free",
          },
          {
            label: "720p HD",
            value: "720p",
            bitrate: "1.8 Mbps",
            fps: 60,
            isLocked: plan === "free",
          },
          {
            label: "480p SD",
            value: "480p",
            bitrate: "800 kbps",
            fps: 60,
            isLocked: false,
          },
          {
            label: "360p Low",
            value: "360p",
            bitrate: "400 kbps",
            fps: 30,
            isLocked: false,
          },
          {
            label: "240p Ultra-Low",
            value: "240p",
            bitrate: "200 kbps",
            fps: 30,
            isLocked: false,
          },
        ];

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        ref={playerContainerRef}
        onMouseMove={resetControlsTimeout}
        onClick={togglePlayPause}
        className="bg-black border border-white/10 rounded-3xl w-full max-w-5xl overflow-hidden shadow-2xl relative aspect-video cursor-pointer group select-none"
      >
        {/* Floating Minimalist Top Header Overlay (Auto-Hides with Controls) */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-0 inset-x-0 bg-gradient-to-b from-black/90 via-black/40 to-transparent pt-4 pb-12 px-5 flex items-center justify-between z-30 transition-opacity duration-300 pointer-events-auto ${
            showControls ? "opacity-100" : "opacity-0 !pointer-events-none"
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-white/10 backdrop-blur-md border border-white/15 text-white flex items-center justify-center shrink-0 shadow-lg">
              <Film className="w-4 h-4 stroke-[2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-white truncate drop-shadow-md">{activeFile?.name || file?.name || "Video"}</h3>
              <p className="text-xs text-slate-300 flex items-center gap-2 mt-0.5 font-mono drop-shadow-sm">
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  {hlsRef.current
                    ? (selectedQuality === "auto"
                        ? (plan === "free" ? "Auto (480p SD)" : "Auto ABR")
                        : "Locked")
                    : "Direct MP4 (Transcoding in cloud...)"}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-blue-300 font-medium">
                  {hlsRef.current ? activeRendition : "Original 4K"}
                </span>
                <span className="text-white/30">•</span>
                <span className="text-slate-400">{Math.round(liveFps)} FPS</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">


            {/* Stream Diagnostics HUD Toggle */}
            <button
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono transition-all flex items-center gap-1.5 backdrop-blur-md shadow-lg ${
                showDiagnostics
                  ? "bg-blue-600/30 border-blue-400/50 text-blue-300"
                  : "bg-white/10 border-white/15 text-slate-300 hover:text-white hover:bg-white/20"
              }`}
              title="Toggle Live Stream Diagnostics & FPS HUD (d)"
            >
              <Activity className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Stats</span>
            </button>

            {/* Quick Refresh Stream Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                refreshFileAndStream();
              }}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-300 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
              title="Refresh authenticated stream link"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-white/80 hover:text-white backdrop-blur-md transition-all active:scale-95 shadow-lg"
              title="Close video player (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
          {/* HTML5 Native Video Tag */}
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            onPlay={() => {
              setIsPlaying(true);
              setHasStreamError(false);
              setIsBuffering(false);
            }}
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
                setHasStreamError(false);
                if (savedPlaybackTimeRef.current > 0) {
                  videoRef.current.currentTime = savedPlaybackTimeRef.current;
                  savedPlaybackTimeRef.current = 0;
                }
              }
            }}
            onWaiting={() => {
              if (videoRef.current && !videoRef.current.paused) {
                setIsBuffering(true);
              }
            }}
            onStalled={() => {
              // Benign stall on Range chunks: only set buffering if video is starved and unpaused
              if (videoRef.current && videoRef.current.readyState < 3 && !videoRef.current.paused) {
                setIsBuffering(true);
              }
            }}
            onPlaying={() => {
              setIsBuffering(false);
              setHasStreamError(false);
              setIsAutoRetrying(false);
              setRetryCount(0);
              setIsPlaying(true);
            }}
            onCanPlay={() => {
              setIsBuffering(false);
              setHasStreamError(false);
            }}
            onError={handleVideoError}
            className="w-full h-full object-contain bg-black"
          />

          {/* Minimalist Cinema Buffering Spinner */}
          {isDebouncedBuffering && !hasStreamError && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="w-14 h-14 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center shadow-2xl">
                <Loader2 className="w-7 h-7 text-[#1a73e8] animate-spin" />
              </div>
            </div>
          )}

          {/* Interactive 3G Auto-Recovery & Stream Resilience Banner */}
          {hasStreamError && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md p-6 text-center z-10 animate-in fade-in duration-200 cursor-default"
            >
              <div className="relative mb-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-xl ${
                  streamErrorReason === "processing"
                    ? "bg-blue-950/60 border-blue-800/50 text-blue-400"
                    : "bg-amber-950/60 border-amber-800/50 text-amber-400"
                }`}>
                  {isAutoRetrying ? (
                    <RefreshCw className="w-7 h-7 animate-spin text-[#1a73e8]" />
                  ) : streamErrorReason === "processing" ? (
                    <Film className="w-7 h-7 text-blue-400" />
                  ) : (
                    <WifiOff className="w-7 h-7 text-amber-400" />
                  )}
                </div>
                {isAutoRetrying && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-white mb-1">
                {streamErrorReason === "processing"
                  ? "Video Stream Initializing"
                  : "Stream Session Interrupted"}
              </h4>

              <p className="text-xs text-slate-400 max-w-md mb-3 leading-relaxed">
                {streamErrorReason === "processing"
                  ? "The multi-bitrate HLS rendition pipeline is processing this media file in AWS S3. Polling cloud status in background."
                  : "The AWS authenticated media stream signature timed out or experienced a connection drop. Click below to refresh the authenticated stream."}
              </p>

              {/* Live Countdown & Attempt Status */}
              {isAutoRetrying && reconnectCountdown > 0 ? (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-mono mb-4 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Auto-reconnecting in <strong className="text-white">{reconnectCountdown}s</strong> • Attempt {retryCount} of {maxRetries}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-blue-400 text-xs font-mono mb-4">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>Ready to resume playback with fresh stream credentials.</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-1">
                <button
                  type="button"
                  onClick={handleManualRetry}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-lg transition-all active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Stream & Resume Playback
                </button>

                {(activeFile?.downloadUrl || activeFile?.download_url) && streamMode !== "direct-mp4" && (
                  <button
                    type="button"
                    onClick={handleForceDirectMp4}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 text-xs font-medium shadow-md transition-all active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-400" />
                    Play Direct MP4
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-slate-800/80 text-slate-400 hover:text-slate-200 text-xs transition-colors"
                >
                  Close
                </button>
              </div>
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

          {/* Pro Cloud High-Definition Upgrade Prompt Modal */}
          {showUpgradePrompt && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 sm:p-6 z-40 animate-in fade-in duration-200 cursor-default"
            >
              <div className="bg-slate-900/95 border border-blue-500/40 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative overflow-hidden text-center animate-in zoom-in-95 duration-200">
                {/* Subtle Glows */}
                <div className="absolute -top-20 -left-20 w-44 h-44 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -right-20 w-44 h-44 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

                <div className="relative">
                  {/* Close button */}
                  <button
                    onClick={() => setShowUpgradePrompt(false)}
                    className="absolute top-0 right-0 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                    title="Dismiss"
                  >
                    <X className="w-4 h-4" />
                  </button>

                  {/* Crown Icon */}
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center shadow-lg shadow-amber-500/25 mb-3.5">
                    <Crown className="w-7 h-7 fill-current" />
                  </div>

                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-amber-500/10 text-amber-300 border border-amber-500/30 mb-2">
                    <Sparkles className="w-3 h-3" />
                    <span>Pro Cloud Upgrade</span>
                  </span>

                  <h3 className="text-lg font-bold text-white mb-1.5">
                    Unlock {upgradeTargetQuality} Streaming
                  </h3>

                  <p className="text-xs text-slate-300 leading-relaxed mb-4">
                    The Free Sandbox tier is locked to <strong className="text-white">480p SD</strong> max. Upgrade to <strong className="text-[#1a73e8]">Pro Cloud</strong> ($19/mo) to unlock crystal-clear 1080p Full HD, 60 FPS, Original Source Bitrate, and 2TB S3 Cloud Storage.
                  </p>

                  <div className="bg-slate-950/70 rounded-2xl p-3.5 border border-slate-800/80 mb-5 text-left space-y-2">
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>1080p Full HD & Original Source Quality</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>2 TB Dedicated S3 Multi-Region Storage</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>AWS MediaConvert Broadcast-Grade HLS Streams</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-200">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>Priority Cloud Transcoding & AI Summaries</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleUpgradeNow}
                      className="w-full py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 transition-all flex items-center justify-center gap-2 active:scale-98"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Upgrade to Pro Cloud ($19/mo)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUpgradePrompt(false)}
                      className="w-full py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      Stay on 480p SD (Free Tier)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Live Floating Stream Diagnostics HUD Card */}
          {showDiagnostics && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute top-16 left-4 p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800/90 backdrop-blur-md shadow-2xl z-30 font-mono text-xs w-72 pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-150"
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
                    title="Close Diagnostics (d)"
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
                      {hlsRef.current
                        ? (selectedQuality === "auto" ? "Auto" : selectedQuality)
                        : "Source MP4"}
                    </span>
                  </button>

                  {showQualityMenu && (
                    <div className="absolute bottom-full right-0 mb-3 w-48 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-white/10 shadow-[0_12px_40px_rgba(0,0,0,0.85)] overflow-hidden p-1.5 text-xs z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 flex items-center justify-between">
                        <span>Quality</span>
                        {plan === "free" && (
                          <span className="text-[10px] text-amber-400/90 font-medium">Free: 480p max</span>
                        )}
                      </div>

                      <div className="py-1 space-y-0.5">
                        {/* Auto Quality Option */}
                        <button
                          type="button"
                          onClick={() => handleQualitySelect("auto")}
                          className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors ${
                            selectedQuality === "auto"
                              ? "text-blue-400 font-semibold bg-blue-500/10"
                              : "text-slate-200"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                            <span>Auto</span>
                          </div>
                          {selectedQuality === "auto" && <Check className="w-4 h-4 text-blue-400" />}
                        </button>

                        <div className="my-1 border-t border-white/5" />

                        {/* Rendition Levels (1080p, 720p, 480p, etc.) */}
                        {renderedQualities.map((q) => {
                          const isSelected = selectedQuality === q.value;
                          const isHd = q.value === "1080p" || q.value === "720p";
                          return (
                            <button
                              key={q.value}
                              type="button"
                              onClick={() => handleQualitySelect(q.value, q.levelIndex)}
                              className={`w-full px-3 py-2 text-left rounded-xl flex items-center justify-between hover:bg-white/10 transition-colors ${
                                isSelected
                                  ? "text-blue-400 font-semibold bg-blue-500/10"
                                  : q.isLocked
                                  ? "text-slate-400 hover:text-slate-200"
                                  : "text-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span>{q.value}</span>
                                {isHd && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-white/10 text-slate-300 tracking-wider">
                                    HD
                                  </span>
                                )}
                                {q.isLocked && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[9px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    <Lock className="w-2.5 h-2.5" />
                                    Pro
                                  </span>
                                )}
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-blue-400" />}
                            </button>
                          );
                        })}
                      </div>
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
  );
};

export default VideoPlayerModal;
