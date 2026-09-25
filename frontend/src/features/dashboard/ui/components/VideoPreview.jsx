import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Film, Play } from "lucide-react";
import { findThumbnail, saveThumbnail } from "../../utils/thumbnailCache.jsx";

/**
 * Format raw seconds into MM:SS (or HH:MM:SS) string
 */
const formatSeconds = (sec) => {
  if (!sec || isNaN(sec) || !isFinite(sec) || sec <= 0) return null;
  const totalSecs = Math.round(sec);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const remainingSecs = totalSecs % 60;

  if (hours > 0) {
    return `${hours}:${mins < 10 ? "0" : ""}${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
  }
  return `${mins < 10 ? "0" : ""}${mins}:${remainingSecs < 10 ? "0" : ""}${remainingSecs}`;
};

/**
 * Check if a URL or string is a valid visual image format
 */
const isImageUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:image/") || url.startsWith("blob:")) return true;
  if (/\.(mp4|mov|mkv|webm|m3u8|avi)(\?.*)?$/i.test(url)) return false;
  return /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(url);
};

/**
 * VideoPreview Component
 * Renders high-fidelity video thumbnail previews for grid cards and list views.
 * 
 * Multi-layer resilient preview architecture:
 * 1. Verified local cache thumbnail (instant on known browser)
 * 2. Backend verified image thumbnail (if available)
 * 3. CloudFront HLS ABR frame capture
 * 4. Native HTML5 video decoder first-frame poster (#t=0.5) — works in ANY browser
 * 5. Smooth muted hover preview snippet
 * 6. Sleek cinematic shimmer fallback — NEVER a broken image icon!
 */
const VideoPreview = ({ file, isCompact = false, isHovered = false }) => {
  const fileId = file.id || file.file_id;
  const cdnThumb = fileId ? `https://d3by850sf4vvuz.cloudfront.net/hls/${fileId}/thumbnail.0000000.jpg` : null;

  // Build candidate thumbnail URLs in order of reliability
  const candidates = useMemo(() => {
    const list = [];
    const cached = findThumbnail(fileId, file.s3Key, file.s3_key, file.name);
    if (cached && !list.includes(cached)) list.push(cached);

    if (isImageUrl(file.thumbnail)) list.push(file.thumbnail);
    if (isImageUrl(file.thumbnail_url) && !list.includes(file.thumbnail_url)) {
      list.push(file.thumbnail_url);
    }
    if (cdnThumb && !list.includes(cdnThumb)) list.push(cdnThumb);
    return list;
  }, [file.thumbnail, file.thumbnail_url, cdnThumb, fileId, file.s3Key, file.s3_key, file.name]);

  const [candidateIdx, setCandidateIdx] = useState(0);
  const [allImagesFailed, setAllImagesFailed] = useState(candidates.length === 0);
  const [capturedThumb, setCapturedThumb] = useState(null);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoError, setVideoError] = useState(false);
  const [realDuration, setRealDuration] = useState(() => {
    if (typeof file.duration === "number") return formatSeconds(file.duration);
    if (typeof file.duration === "string" && file.duration !== "03:40" && file.duration.includes(":")) {
      return file.duration;
    }
    return null;
  });

  const videoRef = useRef(null);
  const videoSourceUrl = file.downloadUrl || (typeof file.thumbnail === "string" && file.thumbnail.endsWith(".mp4") ? file.thumbnail : null);

  // Active static image thumbnail (null if all candidates failed or none exist)
  const activeThumb = !allImagesFailed && candidates[candidateIdx]
    ? candidates[candidateIdx]
    : capturedThumb || null;

  // Handle image load error: fall through to next candidate or mark all failed
  const handleImageError = () => {
    if (candidateIdx < candidates.length - 1) {
      setCandidateIdx((prev) => prev + 1);
    } else {
      setAllImagesFailed(true);
    }
  };

  const handleMetadata = (e) => {
    const sec = e.target?.duration;
    const formatted = formatSeconds(sec);
    if (formatted) {
      setRealDuration(formatted);
    }
  };

  // Attempt to capture video frame into local cache once video decodes
  const tryCaptureFrame = useCallback((videoEl) => {
    if (!videoEl || capturedThumb || findThumbnail(fileId, file.s3Key, file.name)) return;
    try {
      const w = videoEl.videoWidth || 640;
      const h = videoEl.videoHeight || 360;
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(640, w);
      canvas.height = Math.round((canvas.width / w) * h);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        if (dataUrl && dataUrl.length > 500) {
          setCapturedThumb(dataUrl);
          saveThumbnail([fileId, file.s3Key, file.name], dataUrl);
        }
      }
    } catch (_) {
      // CORS canvas taint is fine because the native <video> is already visibly displaying the frame
    }
  }, [capturedThumb, fileId, file.s3Key, file.name]);

  // Smooth hover video playback
  useEffect(() => {
    if (isCompact || !videoRef.current || !videoSourceUrl) return;

    if (isHovered && isVideoLoaded) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
      try {
        videoRef.current.currentTime = 0.5;
      } catch (_) {}
    }
  }, [isHovered, isVideoLoaded, isCompact, videoSourceUrl]);

  // List View (Compact 36x36)
  if (isCompact) {
    if (activeThumb) {
      return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900">
          <img
            src={activeThumb}
            alt={file.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
            onError={handleImageError}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="w-3 h-3 text-white/90 fill-current" />
          </div>
        </div>
      );
    }

    if (videoSourceUrl && !videoError) {
      return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
          <video
            src={`${videoSourceUrl}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            onError={() => setVideoError(true)}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="w-3 h-3 text-white/90 fill-current" />
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-full rounded-lg bg-blue-950/60 text-blue-400 flex items-center justify-center">
        <Film className="w-4 h-4 stroke-[1.75]" />
      </div>
    );
  }

  // Grid View (16:9 Aspect Video Card)
  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden select-none group">
      {/* 1. Visual Thumbnail Image (only rendered when valid image candidate exists) */}
      {activeThumb ? (
        <img
          src={activeThumb}
          alt={file.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={handleImageError}
          loading="lazy"
          decoding="async"
        />
      ) : (
        /* Cinematic Shimmer Placeholder — Shown while video is loading or if stream is unavailable */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center mb-2 shadow-inner">
            <Film className="w-6 h-6 stroke-[1.5]" />
          </div>
          <span className="text-[11px] font-mono text-slate-300 font-medium tracking-wide truncate max-w-[85%]">
            {file.name || "Video Stream"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {file.status === "PROCESSING" ? "Transcoding..." : "HLS Video Stream"}
          </span>
        </div>
      )}

      {/* 2. Native Video First-Frame Poster & Hover Snippet */}
      {videoSourceUrl && !videoError && (
        <video
          ref={videoRef}
          src={`${videoSourceUrl}#t=0.5`}
          preload="metadata"
          muted
          loop
          playsInline
          onLoadedData={(e) => {
            setIsVideoLoaded(true);
            tryCaptureFrame(e.target);
          }}
          onError={() => setVideoError(true)}
          onLoadedMetadata={handleMetadata}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 pointer-events-none ${
            activeThumb
              ? (isHovered && isVideoLoaded ? "opacity-100" : "opacity-0")
              : (isVideoLoaded ? "opacity-100" : "opacity-0")
          }`}
        />
      )}

      {/* Bottom Gradient Scrim for high contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

      {/* Center Hover Play Button with Glassmorphism */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-11 h-11 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transform scale-90 opacity-90 group-hover:scale-110 group-hover:opacity-100 group-hover:bg-[#1a73e8] group-hover:border-[#1a73e8] transition-all duration-300 shadow-xl">
          <Play className="w-5 h-5 fill-current translate-x-0.5" />
        </div>
      </div>

      {/* Floating Bottom-Right Video Duration Badge */}
      {realDuration && (
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[11px] font-mono font-medium flex items-center gap-1.5 border border-white/10 shadow-md pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{realDuration}</span>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
