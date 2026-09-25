import React, { useRef, useEffect, useState } from "react";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileSpreadsheet,
  Play,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { findThumbnail } from "../../../utils/thumbnailCache.jsx";

const isVisualImage = (url) => {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith("data:image/") || url.startsWith("blob:")) return true;
  if (/\.(mp4|mov|mkv|webm|m3u8|avi)(\?.*)?$/i.test(url)) return false;
  return /\.(jpe?g|png|webp|gif|svg|avif)(\?.*)?$/i.test(url);
};

const FilmstripCard = ({ file, isActive, onClick }) => {
  const [imgError, setImgError] = useState(false);
  const name = (file.name || "").toLowerCase();
  const isVideo = file.type === "video" || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(name);
  const isPdf = file.type === "pdf" || name.endsWith(".pdf");
  const isCsv = /\.(csv|tsv)$/i.test(name);
  const isCode = /\.(js|jsx|ts|tsx|py|json|html|css|sql|sh|yml|yaml|env|xml)$/i.test(name);
  const isAudio = /\.(mp3|wav|aac|ogg|flac|m4a)$/i.test(name);
  const isArchive = /\.(zip|tar|gz|rar|exe|iso)$/i.test(name);

  const fileId = file.id || file.file_id;
  const cdnVideoThumb = isVideo && fileId
    ? `https://d3by850sf4vvuz.cloudfront.net/hls/${fileId}/thumbnail.0000000.jpg`
    : null;

  // Resolve thumbnail candidate
  const rawThumb = file.thumbnail_url || file.thumbnail;
  let thumbSrc = null;

  if (isVisualImage(rawThumb)) {
    thumbSrc = rawThumb;
  } else if (isVideo) {
    thumbSrc = cdnVideoThumb || findThumbnail(fileId, file.s3Key, file.s3_key, file.name);
  } else if (file.type === "image" || /\.(jpe?g|png|webp|gif)$/i.test(name)) {
    thumbSrc = rawThumb || findThumbnail(fileId, file.s3Key, file.s3_key, file.name);
  }

  const ext = (file.name || "").split(".").pop().toUpperCase().slice(0, 4);

  return (
    <button
      onClick={onClick}
      className={`relative h-13 w-20 rounded-xl overflow-hidden shrink-0 transition-all select-none border group ${
        isActive
          ? "ring-2 ring-[#1a73e8] border-transparent scale-105 shadow-lg shadow-blue-500/30 z-10"
          : "border-white/10 hover:border-white/30 opacity-70 hover:opacity-100 bg-slate-900"
      }`}
      title={file.name}
    >
      {thumbSrc && !imgError ? (
        <div className="relative w-full h-full">
          <img
            src={thumbSrc}
            alt={file.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                <Play className="w-2.5 h-2.5 fill-current translate-x-0.2" />
              </div>
            </div>
          )}
        </div>
      ) : isVideo ? (
        /* Stylized Video Fallback Card - NEVER a broken image icon */
        <div className="w-full h-full bg-gradient-to-tr from-slate-950 via-slate-900 to-blue-950/80 flex flex-col items-center justify-center p-1">
          <Film className="w-4 h-4 text-blue-400 mb-0.5" />
          <span className="text-[9px] font-mono text-blue-300 font-bold uppercase tracking-wider">
            {ext || "HLS"}
          </span>
        </div>
      ) : isPdf ? (
        /* PDF Card */
        <div className="w-full h-full bg-gradient-to-tr from-purple-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-1">
          <FileText className="w-4 h-4 text-purple-400 mb-0.5" />
          <span className="text-[9px] font-mono text-purple-300 font-bold uppercase">
            PDF
          </span>
        </div>
      ) : isCsv ? (
        /* CSV Card */
        <div className="w-full h-full bg-gradient-to-tr from-emerald-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-1">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400 mb-0.5" />
          <span className="text-[9px] font-mono text-emerald-300 font-bold uppercase">
            CSV
          </span>
        </div>
      ) : isCode ? (
        /* Code Card */
        <div className="w-full h-full bg-gradient-to-tr from-purple-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-1">
          <FileCode className="w-4 h-4 text-cyan-400 mb-0.5" />
          <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase">
            {ext}
          </span>
        </div>
      ) : isAudio ? (
        /* Audio Card */
        <div className="w-full h-full bg-gradient-to-tr from-cyan-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-1">
          <Music className="w-4 h-4 text-cyan-400 mb-0.5" />
          <span className="text-[9px] font-mono text-cyan-300 font-bold uppercase">
            AUDIO
          </span>
        </div>
      ) : isArchive ? (
        /* Archive Card */
        <div className="w-full h-full bg-gradient-to-tr from-amber-950/80 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-1">
          <Archive className="w-4 h-4 text-amber-400 mb-0.5" />
          <span className="text-[9px] font-mono text-amber-300 font-bold uppercase">
            {ext}
          </span>
        </div>
      ) : (
        /* Generic File Card */
        <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center p-1">
          <FileText className="w-4 h-4 text-slate-400 mb-0.5" />
          <span className="text-[9px] font-mono text-slate-400 font-bold uppercase">
            {ext}
          </span>
        </div>
      )}

      {/* Active Dot Marker */}
      {isActive && (
        <div className="absolute bottom-1 inset-x-0 flex justify-center pointer-events-none">
          <div className="w-1.5 h-1.5 rounded-full bg-[#1a73e8] shadow-md shadow-blue-400" />
        </div>
      )}
    </button>
  );
};

const OmniViewerFilmstrip = ({
  files = [],
  activeFile,
  onSelectFile,
  isCollapsed,
  onToggleCollapse,
}) => {
  const scrollRef = useRef(null);

  // Auto-scroll active item into center view
  useEffect(() => {
    if (scrollRef.current) {
      const activeEl = scrollRef.current.querySelector(".ring-2");
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeFile?.id, activeFile?.file_id, activeFile?.name]);

  if (!files || files.length <= 1) return null;

  return (
    <div className="w-full bg-slate-950/95 border-t border-white/10 px-4 py-2 z-30 shrink-0 backdrop-blur-2xl transition-all duration-200">
      <div className="flex items-center justify-between gap-3 max-w-full">
        {/* Filmstrip Carousel */}
        {!isCollapsed && (
          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth flex-1 py-1"
          >
            {files.map((f, idx) => {
              const fId = f.id || f.file_id || idx;
              const isActive =
                (activeFile?.id && activeFile.id === f.id) ||
                activeFile?.name === f.name;

              return (
                <FilmstripCard
                  key={fId}
                  file={f}
                  isActive={isActive}
                  onClick={() => onSelectFile(f)}
                />
              );
            })}
          </div>
        )}

        {/* Collapse / Expand Toggle Button */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-mono transition-colors shrink-0"
          title={isCollapsed ? "Show Filmstrip" : "Hide Filmstrip for Full View"}
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filmstrip ({files.length})</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hide</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default OmniViewerFilmstrip;
