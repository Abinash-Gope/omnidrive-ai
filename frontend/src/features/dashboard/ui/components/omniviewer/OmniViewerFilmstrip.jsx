import React, { useRef, useEffect, useState } from "react";
import {
  FileText,
  FileCode,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileSpreadsheet,
  Presentation,
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
  const fileType = (file.type || "").toLowerCase();

  const isVideo = fileType === "video" || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(name);
  const isPdf = fileType === "pdf" || name.endsWith(".pdf");
  const isPpt =
    fileType === "presentation" ||
    /\.(pptx?|potx?|ppsx?|pptm|odp|key)$/i.test(name);
  const isWord =
    fileType === "word" ||
    /\.(docx?|dotx?|docm|odt|rtf|pages)$/i.test(name);
  const isExcel =
    fileType === "spreadsheet" ||
    /\.(xlsx?|xltx?|xlsm|ods|numbers)$/i.test(name);
  const isDoc =
    fileType === "document" ||
    isWord ||
    isPpt ||
    isExcel ||
    /\.(docx?|dotx?|docm|pptx?|potx?|ppsx?|pptm|xlsx?|xltx?|xlsm|odt|ods|odp|rtf|pages|key|numbers|epub)$/i.test(
      name
    );
  const isCsv = fileType === "csv" || /\.(csv|tsv)$/i.test(name);
  const isCode =
    fileType === "code" ||
    /\.(js|jsx|ts|tsx|py|json|html|css|sql|sh|bash|yml|yaml|env|xml|c|cpp|h|java|rs|go|php)$/i.test(
      name
    );
  const isAudio = fileType === "audio" || /\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(name);
  const isArchive = fileType === "archive" || /\.(zip|tar|gz|rar|exe|iso|7z|bin)$/i.test(name);

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
  } else if (fileType === "image" || /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(name)) {
    thumbSrc = rawThumb || findThumbnail(fileId, file.s3Key, file.s3_key, file.name);
  }

  const ext = (file.name || "").split(".").pop().toUpperCase().slice(0, 4);

  return (
    <button
      onClick={onClick}
      className={`relative w-24 h-16 rounded-xl overflow-hidden shrink-0 transition-all select-none border group ${
        isActive
          ? "ring-2 ring-[#1a73e8] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 border-transparent shadow-lg shadow-blue-500/25 z-10 opacity-100"
          : "border-slate-300/80 dark:border-white/10 hover:border-[#1a73e8]/70 dark:hover:border-white/30 opacity-75 hover:opacity-100 bg-white/80 dark:bg-slate-900/80 shadow-xs"
      }`}
      title={file.name}
    >
      {/* Top Accent Active Line */}
      {isActive && (
        <div className="absolute top-0 inset-x-0 h-1 bg-[#1a73e8] shadow-md shadow-blue-500/50 pointer-events-none z-20" />
      )}

      {thumbSrc && !imgError ? (
        /* Image / Video Thumbnail with strict dimensions */
        <div className="relative w-full h-full overflow-hidden bg-slate-950">
          <img
            src={thumbSrc}
            alt={file.name}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover block"
            loading="lazy"
          />
          {isVideo && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center pointer-events-none">
              <div className="w-5 h-5 rounded-full bg-black/60 backdrop-blur-xs flex items-center justify-center text-white">
                <Play className="w-2.5 h-2.5 fill-current translate-x-0.2" />
              </div>
            </div>
          )}
          {/* Format Badge Overlay */}
          <div className="absolute bottom-1 right-1 px-1 py-0.2 rounded bg-black/70 backdrop-blur-xs text-[8px] font-mono font-bold text-white/90 uppercase tracking-wider pointer-events-none">
            {ext || (isVideo ? "MP4" : "IMG")}
          </div>
        </div>
      ) : isVideo ? (
        /* Video Fallback Card */
        <div className="w-full h-full bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-slate-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-blue-400/30 shadow-xs">
            <Film className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300 leading-none">
            {ext || "MP4"}
          </span>
        </div>
      ) : isPdf ? (
        /* PDF Card */
        <div className="w-full h-full bg-gradient-to-br from-rose-500/10 via-pink-500/10 to-purple-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-rose-400/30 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-rose-700 dark:text-rose-300 leading-none">
            PDF
          </span>
        </div>
      ) : isPpt ? (
        /* PowerPoint Card */
        <div className="w-full h-full bg-gradient-to-br from-orange-500/10 via-amber-500/10 to-rose-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-orange-400/30 shadow-xs">
            <Presentation className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-orange-700 dark:text-orange-300 leading-none">
            {ext || "PPTX"}
          </span>
        </div>
      ) : isWord ? (
        /* Word Document Card */
        <div className="w-full h-full bg-gradient-to-br from-blue-500/10 via-sky-500/10 to-indigo-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-blue-400/30 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-blue-700 dark:text-blue-300 leading-none">
            {ext || "DOCX"}
          </span>
        </div>
      ) : isExcel ? (
        /* Excel Spreadsheet Card */
        <div className="w-full h-full bg-gradient-to-br from-emerald-500/10 via-teal-500/10 to-green-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-emerald-400/30 shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-emerald-700 dark:text-emerald-300 leading-none">
            {ext || "XLSX"}
          </span>
        </div>
      ) : isDoc ? (
        /* Generic Document Card */
        <div className="w-full h-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-blue-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-indigo-400/30 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-indigo-700 dark:text-indigo-300 leading-none">
            {ext || "DOC"}
          </span>
        </div>
      ) : isCsv ? (
        /* CSV Card */
        <div className="w-full h-full bg-gradient-to-br from-teal-500/10 via-emerald-500/10 to-cyan-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-teal-400/30 shadow-xs">
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-teal-700 dark:text-teal-300 leading-none">
            CSV
          </span>
        </div>
      ) : isCode ? (
        /* Code Card */
        <div className="w-full h-full bg-gradient-to-br from-purple-500/10 via-violet-500/10 to-indigo-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-purple-400/30 shadow-xs">
            <FileCode className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-purple-700 dark:text-purple-300 leading-none">
            {ext}
          </span>
        </div>
      ) : isAudio ? (
        /* Audio Card */
        <div className="w-full h-full bg-gradient-to-br from-amber-500/10 via-orange-500/10 to-yellow-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-amber-400/30 shadow-xs">
            <Music className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-700 dark:text-amber-300 leading-none">
            AUDIO
          </span>
        </div>
      ) : isArchive ? (
        /* Archive Card */
        <div className="w-full h-full bg-gradient-to-br from-amber-500/10 via-yellow-500/10 to-orange-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-amber-400/30 shadow-xs">
            <Archive className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-amber-700 dark:text-amber-300 leading-none">
            {ext}
          </span>
        </div>
      ) : (
        /* Generic File Card */
        <div className="w-full h-full bg-gradient-to-br from-slate-500/10 via-gray-500/10 to-zinc-500/10 flex flex-col items-center justify-center p-1.5 gap-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/70 dark:bg-black/40 border border-slate-400/30 shadow-xs">
            <FileText className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
          </div>
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-slate-600 dark:text-slate-400 leading-none">
            {ext}
          </span>
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
    if (scrollRef.current && !isCollapsed) {
      const activeEl = scrollRef.current.querySelector(".ring-2");
      if (activeEl) {
        activeEl.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeFile?.id, activeFile?.file_id, activeFile?.name, isCollapsed]);

  // Mouse wheel horizontal scrolling
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || isCollapsed) return;

    const handleWheel = (e) => {
      // If already scrolling horizontally with trackpad, respect natural deltaX
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      if (e.deltaY !== 0) {
        e.preventDefault();
        // Scroll horizontally based on wheel delta
        el.scrollBy({
          left: e.deltaY * 1.5,
          behavior: "auto",
        });
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [isCollapsed]);

  if (!files || files.length <= 1) return null;

  // When collapsed: Render floating pill button centered at bottom of screen
  if (isCollapsed) {
    return (
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/90 dark:bg-slate-900/90 hover:bg-white dark:hover:bg-slate-800 text-slate-800 dark:text-white border border-slate-200/90 dark:border-white/15 text-xs font-semibold shadow-2xl backdrop-blur-2xl transition-all hover:scale-105 active:scale-95 group"
          title="Show Filmstrip (H)"
        >
          <Film className="w-3.5 h-3.5 text-[#1a73e8]" />
          <span>Filmstrip ({files.length})</span>
          <ChevronUp className="w-3.5 h-3.5 text-slate-400 group-hover:-translate-y-0.5 transition-transform" />
        </button>
      </div>
    );
  }

  // When visible: Full luxury frosted glass filmstrip bar
  return (
    <div className="w-full bg-white/80 dark:bg-slate-950/80 border-t border-slate-200/80 dark:border-white/10 px-3 sm:px-5 py-2.5 z-30 shrink-0 backdrop-blur-3xl transition-all duration-300 shadow-2xl animate-in slide-in-from-bottom-2">
      <div className="flex items-center justify-between gap-3 max-w-full">
        {/* Filmstrip Carousel Container with Left/Right Edge Fades */}
        <div className="relative flex-1 min-w-0 overflow-hidden">
          {/* Subtle Left Fade */}
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-white/90 dark:from-slate-950/90 to-transparent pointer-events-none z-10" />

          {/* Scrolling Track */}
          <div
            ref={scrollRef}
            className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth py-1 px-1"
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

          {/* Subtle Right Fade */}
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-white/90 dark:from-slate-950/90 to-transparent pointer-events-none z-10" />
        </div>

        {/* Hide Button */}
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100/90 dark:bg-white/10 hover:bg-slate-200/90 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/80 dark:border-white/10 text-xs font-medium transition-all shrink-0 backdrop-blur-md active:scale-95 group shadow-xs"
          title="Hide Filmstrip (H)"
        >
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:translate-y-0.5 transition-transform" />
          <span className="hidden sm:inline">Hide</span>
        </button>
      </div>
    </div>
  );
};

export default OmniViewerFilmstrip;
