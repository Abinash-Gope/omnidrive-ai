import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  FileText,
  Image as ImageIcon,
  Sparkles,
  ExternalLink,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  Film,
  Camera,
  Layers,
  Trash2,
  Star,
  RotateCcw,
  FolderPlus,
  FolderMinus,
  FileSpreadsheet,
  FileCode,
  Music,
  Archive,
  Presentation,
  File as FileGenericIcon,
} from "lucide-react";
import FileStatusBadge from "./FileStatusBadge.jsx";
import PdfPreview from "./PdfPreview.jsx";
import VideoPreview from "./VideoPreview.jsx";
import DocxCardPreview from "./previews/DocxCardPreview.jsx";
import PptxCardPreview from "./previews/PptxCardPreview.jsx";
import CsvCardPreview from "./previews/CsvCardPreview.jsx";
import CodeCardPreview from "./previews/CodeCardPreview.jsx";
import AudioCardPreview from "./previews/AudioCardPreview.jsx";
import { synthesizeImageLabels } from "../../utils/documentTextExtractor.js";

const FileCard = ({
  file,
  onOpenPreview,
  onDeleteFile,
  onToggleStar,
  onMoveToTrash,
  onRestoreFile,
  onPermanentDelete,
  activeTab,
  viewMode = "grid",
  isSelected = false,
  onToggleSelect,
  isSelectionMode = false,
  onOpenAddToFolder,
  activeFolderId = null,
  onRemoveFromFolder,
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isCardHovered, setIsCardHovered] = useState(false);
  const [realPageCount, setRealPageCount] = useState(null);
  const [isPdfLoading, setIsPdfLoading] = useState(file.type === "pdf");
  const [imgError, setImgError] = useState(false);
  const menuRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const isInTrash = activeTab === "trash" || Boolean(file.inTrash);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (file.pages) setRealPageCount(file.pages);
    else if (file.summary?.pages) setRealPageCount(file.summary.pages);
  }, [file.pages, file.summary?.pages]);

  const fileNameLower = (file.name || "").toLowerCase();
  const isVideo = file.type === "video" || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(fileNameLower);
  const isImage = file.type === "image" || /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif|heic|heif|tiff?|raw|dng|psd)$/i.test(fileNameLower);
  const isPdf = file.type === "pdf" || fileNameLower.endsWith(".pdf");
  const isDoc =
    file.type === "document" ||
    /\.(docx?|dotx?|docm|pptx?|potx?|ppsx?|pptm|xlsx?|xltx?|xlsm|odt|ods|odp|rtf|pages|key|numbers|epub)$/i.test(
      fileNameLower
    );
  const isPpt = /\.(pptx?|potx?|ppsx?|pptm|key)$/i.test(fileNameLower);
  const isWord = /\.(docx?|dotx?|docm|odt|rtf|pages)$/i.test(fileNameLower);
  const isExcel = /\.(xlsx?|xltx?|xlsm|ods|numbers)$/i.test(fileNameLower);
  const isCsv = file.type === "csv" || /\.(csv|tsv)$/i.test(fileNameLower);
  const isCode =
    file.type === "code" ||
    /\.(js|jsx|ts|tsx|py|json|html|css|sql|sh|bash|yml|yaml|env|xml|c|cpp|h|java|rs|go|php)$/i.test(
      fileNameLower
    );
  const isAudio = file.type === "audio" || /\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(fileNameLower);
  const isMarkdown = file.type === "markdown" || /\.(md|markdown|txt|log)$/i.test(fileNameLower);
  const isArchive = file.type === "archive" || /\.(zip|tar|gz|rar|7z|exe|bin|iso)$/i.test(fileNameLower);

  const displayLabels =
    file.labels && file.labels.length > 0
      ? file.labels
      : isImage
      ? synthesizeImageLabels(file.name, file.dimensions)
      : [];

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isMenuOpen]);

  // Quick icon selector
  const getFileIcon = () => {
    if (isVideo) return <Film className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    if (isImage) return <Camera className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (isPdf) return <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    if (isPpt) return <Presentation className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
    if (isWord) return <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    if (isExcel || isCsv) return <FileSpreadsheet className="w-5 h-5 text-teal-600 dark:text-teal-400" />;
    if (isDoc) return <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    if (isCode) return <FileCode className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    if (isAudio) return <Music className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />;
    if (isArchive) return <Archive className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    return <FileGenericIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
  };

  if (viewMode === "list") {
    return (
      <div
        onClick={(e) => {
          e.stopPropagation();
          if (e.shiftKey) {
            e.preventDefault();
            if (onToggleSelect) onToggleSelect(file);
          } else {
            onOpenPreview(file);
          }
        }}
        className={`group flex items-center justify-between px-4 py-3.5 border-b transition-all duration-200 cursor-pointer text-sm select-none ${
          isSelected
            ? "bg-blue-500/10 dark:bg-blue-950/50 border-blue-500 shadow-[inset_3px_0_0_#3b82f6,0_0_15px_rgba(59,130,246,0.25)]"
            : "bg-white dark:bg-slate-900 hover:bg-blue-50/50 dark:hover:bg-slate-800/60 border-slate-100 dark:border-slate-800/80"
        }`}
      >
        {/* Left: Icon & Name */}
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform overflow-hidden">
            {isVideo ? (
              <VideoPreview file={file} isCompact={true} />
            ) : isPdf && file.downloadUrl ? (
              <PdfPreview url={file.downloadUrl} pageNumber={1} scale={0.5} className="w-full h-full" fitParent={true} objectFit="cover" onPageCount={setRealPageCount} />
            ) : isImage && (file.thumbnail_url || file.thumbnail || file.downloadUrl) ? (
              <img
                src={file.thumbnail_url || file.thumbnail || file.downloadUrl}
                alt={file.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover"
              />
            ) : (
              getFileIcon()
            )}
          </div>
          <div className="min-w-0">
            <div className="font-medium text-slate-900 dark:text-white truncate group-hover:text-[#1a73e8] transition-colors">
              {file.name}
            </div>
            <div className="text-xs text-slate-400 truncate flex items-center gap-2">
              {file.previewSnippet && <span>{file.previewSnippet}</span>}
            </div>
          </div>
        </div>

        {/* Center: Status / AI Badge */}
        <div className="hidden sm:flex items-center px-4 shrink-0">
          <FileStatusBadge file={file} />
        </div>

        {/* Right: Meta & Actions */}
        <div className="flex items-center gap-3 shrink-0 text-xs text-slate-500 dark:text-slate-400">
          <span className="w-16 text-right font-mono">{file.size}</span>
          <span className="w-20 text-right hidden md:inline">{file.date}</span>
          <div className="flex items-center gap-1">
            {!isInTrash && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onToggleStar) onToggleStar(file);
                }}
                className={`p-1.5 rounded-lg transition-colors ${file.isStarred
                    ? "text-amber-500 hover:text-amber-600 bg-amber-50/70 dark:bg-amber-950/40"
                    : "text-slate-400 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                title={file.isStarred ? "Starred" : "Star file"}
              >
                <Star className={`w-4 h-4 ${file.isStarred ? "fill-amber-400" : ""}`} />
              </button>
            )}

            {!isInTrash && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenPreview(file);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Inspect with AI Preview"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}

            {!isInTrash && onOpenAddToFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddToFolder(file);
                }}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
                title="Organize into Folder"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}

            {!isInTrash && activeFolderId && onRemoveFromFolder && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromFolder(file.id || file.file_id);
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition-colors"
                title="Remove from Folder"
              >
                <FolderMinus className="w-4 h-4" />
              </button>
            )}

            {isInTrash ? (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onRestoreFile) onRestoreFile(file);
                  }}
                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 transition-colors"
                  title="Restore File"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onPermanentDelete) onPermanentDelete(file);
                    else if (onDeleteFile) onDeleteFile(file);
                  }}
                  className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-500 hover:text-rose-600 transition-colors"
                  title="Delete Permanently"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onMoveToTrash) onMoveToTrash(file);
                  else if (onDeleteFile) onDeleteFile(file);
                }}
                className="p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                title="Move to Trash"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const handleCardMouseEnter = () => {
    if (isVideo) {
      hoverTimeoutRef.current = setTimeout(() => {
        setIsCardHovered(true);
      }, 300);
    }
  };

  const handleCardMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsCardHovered(false);
  };

  // Grid View Card
  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (e.shiftKey) {
          e.preventDefault();
          if (onToggleSelect) onToggleSelect(file);
        } else {
          onOpenPreview(file);
        }
      }}
      onMouseEnter={handleCardMouseEnter}
      onMouseLeave={handleCardMouseLeave}
      className={`group relative bg-white dark:bg-slate-900 border rounded-2xl transition-all duration-200 flex flex-col cursor-pointer select-none ${
        isSelected
          ? "border-blue-500 ring-2 ring-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)] dark:shadow-[0_0_25px_rgba(59,130,246,0.65)] scale-[0.99] z-20"
          : "border-slate-200/90 dark:border-slate-800 hover:border-[#1a73e8]/60 dark:hover:border-blue-500/60 shadow-xs hover:shadow-lg"
      } ${
        isMenuOpen ? "z-30" : ""
      }`}
    >
      {/* Thumbnail / Visual Viewport — Pure, Unobstructed Preview */}
      <div className="relative aspect-video w-full bg-slate-100 dark:bg-slate-800/80 overflow-hidden rounded-t-2xl flex items-center justify-center">
        {isVideo ? (
          <VideoPreview file={file} isHovered={isCardHovered} />
        ) : isPdf && file.downloadUrl ? (
          /* Live PDF page-1 canvas thumbnail */
          <div className="w-full h-full relative overflow-hidden bg-white dark:bg-slate-900">
            <PdfPreview
              url={file.downloadUrl}
              pageNumber={1}
              scale={1.0}
              className="w-full h-full"
              fitParent={true}
              objectFit="cover"
              objectPosition="top"
              onPageCount={setRealPageCount}
              onLoadingChange={setIsPdfLoading}
            />
            {/* Subtle bottom shadow vignette for smooth transition */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
          </div>
        ) : (isImage && (file.thumbnail_url || file.thumbnail || file.downloadUrl || file.download_url) && !imgError) ? (
          <img
            src={file.thumbnail_url || file.thumbnail || file.downloadUrl || file.download_url}
            alt={file.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
          />
        ) : isPpt ? (
          <PptxCardPreview file={file} />
        ) : isWord ? (
          <DocxCardPreview file={file} />
        ) : (isExcel || isCsv) ? (
          <CsvCardPreview file={file} />
        ) : isCode ? (
          <CodeCardPreview file={file} />
        ) : isAudio ? (
          <AudioCardPreview file={file} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 text-slate-400">
            {getFileIcon()}
            <span className="text-[11px] font-mono mt-1 text-slate-400 uppercase">
              {file.type}
            </span>
          </div>
        )}
      </div>

      {/* Card Content Footer */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-start justify-between gap-1.5">
            <h3
              className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-[#1a73e8] transition-colors flex-1"
              title={file.name}
            >
              {file.name}
            </h3>
            <div className="flex items-center gap-0.5 shrink-0">
              {!isInTrash && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onToggleStar) onToggleStar(file);
                  }}
                  className={`p-1 rounded-md transition-colors ${file.isStarred
                      ? "text-amber-500 hover:text-amber-600"
                      : "text-slate-300 dark:text-slate-600 hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  title={file.isStarred ? "Starred" : "Star file"}
                >
                  <Star className={`w-4 h-4 ${file.isStarred ? "fill-amber-400" : ""}`} />
                </button>
              )}
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsMenuOpen((prev) => !prev);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Options"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {/* Context Dropdown Menu */}
                {isMenuOpen && (
                  <div
                    className="absolute right-0 top-full mt-1.5 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 animate-fadeIn text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {!isInTrash && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (onToggleStar) onToggleStar(file);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <Star className={`w-3.5 h-3.5 ${file.isStarred ? "fill-amber-400 text-amber-500" : "text-slate-400"}`} />
                        <span>{file.isStarred ? "Unstar File" : "Star File"}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuOpen(false);
                        onOpenPreview(file);
                      }}
                      className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                      <span>View & AI Preview</span>
                    </button>
                    {!isInTrash && onOpenAddToFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onOpenAddToFolder(file);
                        }}
                        className="w-full px-3 py-2 text-left text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2"
                      >
                        <FolderPlus className="w-3.5 h-3.5 text-blue-500" />
                        <span>Organize into Folder</span>
                      </button>
                    )}
                    {!isInTrash && activeFolderId && onRemoveFromFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onRemoveFromFolder(file.id || file.file_id);
                        }}
                        className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                      >
                        <FolderMinus className="w-3.5 h-3.5 text-rose-500" />
                        <span>Remove from Folder</span>
                      </button>
                    )}
                    <div className="h-px bg-slate-100 dark:bg-slate-700/60 my-1" />
                    {isInTrash ? (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (onRestoreFile) onRestoreFile(file);
                          }}
                          className="w-full px-3 py-2 text-left text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 flex items-center gap-2 font-medium"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore File</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            if (onPermanentDelete) onPermanentDelete(file);
                            else if (onDeleteFile) onDeleteFile(file);
                          }}
                          className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Permanently</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          if (onMoveToTrash) onMoveToTrash(file);
                          else if (onDeleteFile) onDeleteFile(file);
                        }}
                        className="w-full px-3 py-2 text-left text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center gap-2 font-medium"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Move to Trash</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Preview Snippet, Tags, or Format Telemetry */}
          <div className="mt-2 min-h-[26px] flex items-center">
            {isImage ? (
              <div className="flex flex-wrap gap-1">
                {displayLabels.slice(0, 3).map((lbl, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-100 dark:border-emerald-900/50"
                  >
                    #{lbl.name}
                  </span>
                ))}
              </div>
            ) : isVideo ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-1.5 h-1.5 rounded-full bg-[#1a73e8]" />
                <span className="truncate">
                  {file.hlsUrl
                    ? "HLS multi-bitrate stream"
                    : file.dimensions?.width && file.dimensions?.height
                    ? `${file.dimensions.width}×${file.dimensions.height} · MP4 video`
                    : "MP4 video stream ready"}
                </span>
              </div>
            ) : isPdf ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 leading-relaxed">
                {file.summary?.executive || (realPageCount ? `${realPageCount} pages • Document indexed` : "PDF document ready")}
              </p>
            ) : isDoc ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Office document • {fileNameLower.split('.').pop().toUpperCase()} indexed
              </p>
            ) : isCsv ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Dataset table • Structured tabular rows
              </p>
            ) : isAudio ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Audio track • Stereo stream ready
              </p>
            ) : isCode ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Source code • Syntax parsed
              </p>
            ) : (
              <p className="text-xs text-slate-400 truncate">
                {file.size} • Cloud asset verified
              </p>
            )}
          </div>

          {/* Dedicated Trash Action Buttons on Card */}
          {isInTrash && (
            <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRestoreFile) onRestoreFile(file);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200/60 dark:border-emerald-800/60 transition-colors flex items-center justify-center gap-1.5"
                title="Restore file back to My Files"
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Restore</span>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onPermanentDelete) onPermanentDelete(file);
                  else if (onDeleteFile) onDeleteFile(file);
                }}
                className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/60 dark:border-rose-800/60 transition-colors flex items-center justify-center gap-1.5"
                title="Permanently delete file"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer Meta Row: Anchored Status Badge on Left, Page count & Size & Date on Right */}
        <div className="mt-3.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400 gap-2">
          <div className="min-w-0">
            <FileStatusBadge file={file} />
          </div>
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] shrink-0">
            {realPageCount && (
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {realPageCount}p ·
              </span>
            )}
            <span>{file.size}</span>
            <span>·</span>
            <span className="hidden sm:inline">{file.date}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileCard;
