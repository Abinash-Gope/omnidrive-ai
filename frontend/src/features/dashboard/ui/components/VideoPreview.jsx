import React, { useState, useRef, useEffect } from "react";
import { Film, Play } from "lucide-react";

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
 * VideoPreview Component
 * Renders video thumbnail for grid cards and list views.
 * Handles instant cached image thumbnail, native video frame extraction (#t=0.5),
 * smooth hover video preview snippet, and elegant fallback styling.
 */
const VideoPreview = ({ file, isCompact = false, isHovered = false }) => {
  const [hasError, setHasError] = useState(false);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [realDuration, setRealDuration] = useState(() => {
    if (typeof file.duration === "number") return formatSeconds(file.duration);
    if (typeof file.duration === "string" && file.duration !== "03:40" && file.duration.includes(":")) {
      return file.duration;
    }
    return null;
  });
  const videoRef = useRef(null);

  // Check if thumbnail is a valid image URL or base64 dataUrl (not a raw mp4 video)
  const thumbUrl = file.thumbnail_url || file.thumbnail;
  const isImageThumbnail =
    thumbUrl &&
    typeof thumbUrl === "string" &&
    (thumbUrl.startsWith("data:image/") ||
      thumbUrl.startsWith("blob:") ||
      /\.(jpe?g|png|webp|gif)(\?.*)?$/i.test(thumbUrl));

  const videoSourceUrl = file.downloadUrl || (thumbUrl && typeof thumbUrl === "string" && thumbUrl.endsWith(".mp4") ? thumbUrl : null);

  const handleMetadata = (e) => {
    const sec = e.target?.duration;
    const formatted = formatSeconds(sec);
    if (formatted) {
      setRealDuration(formatted);
    }
  };

  // Play muted short preview on hover (grid view only)
  useEffect(() => {
    if (isCompact || !videoRef.current || !videoSourceUrl) return;

    if (isHovered && isVideoLoaded) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {
          // Auto-play was prevented; ignore silently
        });
      }
    } else if (videoRef.current) {
      videoRef.current.pause();
      // Seek back to poster frame
      try {
        videoRef.current.currentTime = 0.5;
      } catch (_) {}
    }
  }, [isHovered, isVideoLoaded, isCompact, videoSourceUrl]);

  // List View (Compact 36x36)
  if (isCompact) {
    if (isImageThumbnail) {
      return (
        <img
          src={thumbUrl}
          alt={file.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover rounded-lg"
          onError={() => setHasError(true)}
        />
      );
    }

    if (videoSourceUrl && !hasError) {
      return (
        <div className="relative w-full h-full rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center">
          <video
            src={`${videoSourceUrl}#t=0.5`}
            preload="metadata"
            muted
            playsInline
            className="w-full h-full object-cover pointer-events-none"
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
            <Play className="w-3.5 h-3.5 text-white/90 fill-current" />
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

  // Grid View (16:9 Aspect Video)
  return (
    <div className="relative w-full h-full bg-slate-950 flex items-center justify-center overflow-hidden select-none">
      {/* 1. Image Thumbnail from Cache or S3 */}
      {isImageThumbnail && !hasError ? (
        <img
          src={thumbUrl}
          alt={file.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={() => setHasError(true)}
          loading="lazy"
          decoding="async"
        />
      ) : videoSourceUrl && !hasError ? (
        /* 2. Live Video Poster & Hover Preview Frame */
        <video
          ref={videoRef}
          src={`${videoSourceUrl}#t=0.5`}
          preload="metadata"
          muted
          loop
          playsInline
          onLoadedData={() => setIsVideoLoaded(true)}
          onLoadedMetadata={handleMetadata}
          onError={() => setHasError(true)}
          className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover:scale-105"
        />
      ) : (
        /* 3. Sleek OmniDrive Fallback Placeholder */
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950/40 p-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center mb-2 shadow-inner">
            <Film className="w-6 h-6 stroke-[1.5]" />
          </div>
          <span className="text-[11px] font-mono text-slate-300 font-medium tracking-wide">
            {file.name || "Video Stream"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
            {file.status === "PROCESSING" ? "Transcoding..." : "Video Media"}
          </span>
        </div>
      )}

      {/* Background metadata probe for accurate real duration when displaying image thumbnail */}
      {videoSourceUrl && !realDuration && (
        <video
          src={videoSourceUrl}
          preload="metadata"
          muted
          playsInline
          className="hidden"
          onLoadedMetadata={handleMetadata}
        />
      )}

      {/* Center Hover Play Button with Glassmorphism */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white flex items-center justify-center transform scale-90 opacity-80 group-hover:scale-110 group-hover:opacity-100 group-hover:bg-[#1a73e8] group-hover:border-[#1a73e8] transition-all duration-300 shadow-xl">
          <Play className="w-5 h-5 fill-current translate-x-0.5" />
        </div>
      </div>

      {/* Floating Bottom-Right Video Duration Tag — only show real duration, never fake fallback */}
      {realDuration && (
        <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-xs text-white text-[11px] font-mono font-medium flex items-center gap-1.5 border border-white/10 shadow-xs pointer-events-none animate-fadeIn">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span>{realDuration}</span>
        </div>
      )}
    </div>
  );
};

export default VideoPreview;
