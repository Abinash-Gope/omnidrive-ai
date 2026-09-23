import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  UploadCloud,
  AlertCircle,
  X,
  File,
  Film,
  Camera,
  FileText,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Plus,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import useFileUpload from "../hooks/useFileUpload.jsx";

/**
 * OmniDrive AI — Multi-File Upload Modal
 * File: src/components/UploadModal.jsx
 *
 * Three phases:
 *   STAGING   — user can add / remove files before upload starts
 *   UPLOADING — bounded concurrency (2 files at a time) with live per-file progress
 *   DONE      — success / partial failure summary with retry support
 */

// ── Helpers ─────────────────────────────────────────────────────────────────

const formatSize = (bytes) => {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const getFileCategory = (file) => {
  const type = file?.type || "";
  if (type.startsWith("video/")) return "video";
  if (type.startsWith("image/")) return "image";
  if (type.includes("pdf")) return "pdf";
  return "other";
};

const FileTypeIcon = ({ file, className = "w-4 h-4" }) => {
  const cat = getFileCategory(file);
  if (cat === "video") return <Film className={className} />;
  if (cat === "image") return <Camera className={className} />;
  if (cat === "pdf") return <FileText className={className} />;
  return <File className={className} />;
};

const categoryColors = {
  video: "bg-blue-100/80 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400",
  image: "bg-emerald-100/80 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400",
  pdf: "bg-purple-100/80 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400",
  other: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400",
};

// ── StatusPill ───────────────────────────────────────────────────────────────

const StatusPill = ({ status }) => {
  if (status === "completed") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3 h-3" /> Done
      </span>
    );
  }
  if (status === "uploading") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#1a73e8]">
        <Loader2 className="w-3 h-3 animate-spin" /> Uploading
      </span>
    );
  }
  if (status === "error") {
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
        <AlertCircle className="w-3 h-3" /> Failed
      </span>
    );
  }
  return (
    <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Queued</span>
  );
};

// ── File Row (used in STAGING and UPLOADING / DONE phases) ──────────────────

const FileRow = ({ item, phase, onRemove }) => {
  const cat = getFileCategory(item.file);
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        item.status === "uploading"
          ? "bg-blue-50/60 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900/50"
          : item.status === "completed"
          ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40"
          : item.status === "error"
          ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40"
          : "bg-slate-50/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800"
      }`}
    >
      <div className="flex items-center gap-2.5">
        {/* Icon */}
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${categoryColors[cat]}`}>
          <FileTypeIcon file={item.file} className="w-3.5 h-3.5" />
        </div>

        {/* Name + size */}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">{item.name}</p>
          <p className="text-[10px] text-slate-400">{formatSize(item.size)}</p>
        </div>

        {/* Status / remove */}
        <div className="flex items-center gap-2 shrink-0">
          <StatusPill status={item.status} />
          {phase === "staging" && item.status === "pending" && onRemove && (
            <button
              onClick={() => onRemove(item.id)}
              className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Per-file progress bar (active uploads) */}
      {item.status === "uploading" && (
        <div className="mt-2.5">
          <div className="flex justify-between text-[10px] font-mono text-slate-500 mb-1">
            <span>Streaming to S3…</span>
            <span className="text-[#1a73e8] font-bold">{item.progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-150 rounded-full"
              style={{ width: `${item.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Error message expandable */}
      {item.status === "error" && item.error && (
        <div className="mt-2">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 text-[10px] text-rose-600 dark:text-rose-400 hover:underline"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? "Hide error" : "Show error"}
          </button>
          {expanded && (
            <p className="mt-1 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 rounded-lg p-2 leading-relaxed">
              {item.error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

// ── UploadModal ──────────────────────────────────────────────────────────────

const UploadModal = ({ isOpen, onClose, onUploadComplete, stagedFiles, onClearStagedFiles }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [rejectedNames, setRejectedNames] = useState([]);
  const [isStartingUpload, setIsStartingUpload] = useState(false);
  const isStartingRef = useRef(false);
  const lastStagedFilesRef = useRef(null);
  const addMoreInputRef = useRef(null);
  const dropZoneInputRef = useRef(null);

  const {
    filesQueue,
    overallProgress,
    isUploading,
    isAllDone,
    hasError,
    stageFiles,
    removeFile,
    clearQueue,
    startUpload,
    retryFailed,
    resetUpload,
  } = useFileUpload();

  // Determine current phase
  const phase = (() => {
    if (filesQueue.length === 0) return "empty";
    if (isAllDone) return "done";
    if (isUploading || isStartingUpload || filesQueue.some((i) => i.status === "uploading")) return "uploading";
    return "staging";
  })();

  const successCount = filesQueue.filter((i) => i.status === "completed").length;
  const errorCount = filesQueue.filter((i) => i.status === "error").length;
  const totalCount = filesQueue.length;

  // Pre-load files passed from the dashboard-wide drag-and-drop (guarded against React StrictMode)
  useEffect(() => {
    if (isOpen && stagedFiles && stagedFiles.length > 0) {
      if (lastStagedFilesRef.current === stagedFiles) return;
      lastStagedFilesRef.current = stagedFiles;
      const rejected = stageFiles(stagedFiles);
      if (rejected.length > 0) setRejectedNames(rejected);
      onClearStagedFiles?.();
    }
  }, [isOpen, stagedFiles, stageFiles, onClearStagedFiles]);

  // Reset starting flag once done or empty
  useEffect(() => {
    if (phase === "done" || phase === "empty") {
      isStartingRef.current = false;
      setIsStartingUpload(false);
    }
  }, [phase]);

  // Reset everything when modal closes
  useEffect(() => {
    if (!isOpen) {
      clearQueue();
      resetUpload();
      setIsDragOver(false);
      setRejectedNames([]);
      setIsStartingUpload(false);
      isStartingRef.current = false;
      lastStagedFilesRef.current = null;
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        resetUpload();
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose, resetUpload]);

  if (!isOpen) return null;

  // ── Event Handlers ─────────────────────────────────────────────────────

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (phase !== "uploading" && !isStartingUpload) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (phase === "uploading" || isStartingUpload) return;
    const files = Array.from(e.dataTransfer?.files || []);
    if (files.length > 0) {
      const rejected = stageFiles(files);
      if (rejected.length > 0) setRejectedNames(rejected);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      const rejected = stageFiles(files);
      if (rejected.length > 0) setRejectedNames(rejected);
    }
    e.target.value = "";
  };

  const handleStartUpload = () => {
    if (
      isStartingRef.current ||
      isStartingUpload ||
      phase !== "staging" ||
      filesQueue.filter((i) => i.status === "pending").length === 0
    ) {
      return;
    }
    isStartingRef.current = true;
    setIsStartingUpload(true);
    startUpload((result) => {
      onUploadComplete?.(result);
    });
  };

  const handleRetry = () => {
    if (isStartingRef.current) return;
    isStartingRef.current = true;
    setIsStartingUpload(true);
    retryFailed((result) => {
      onUploadComplete?.(result);
    });
  };

  const handleClose = () => {
    resetUpload();
    onClose();
  };

  const totalStagedBytes = filesQueue.reduce((s, i) => s + (i.size || 0), 0);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 z-10"
        onClick={(e) => e.stopPropagation()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Drag-over overlay inside modal */}
        {isDragOver && (
          <div className="absolute inset-0 z-20 rounded-3xl bg-blue-500/10 border-2 border-blue-400 border-dashed flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <UploadCloud className="w-10 h-10 text-[#1a73e8] mx-auto mb-2 animate-bounce" />
              <p className="text-sm font-bold text-[#1a73e8]">Drop files here</p>
            </div>
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          ref={dropZoneInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="video/*,image/*,application/pdf"
        />
        <input
          ref={addMoreInputRef}
          type="file"
          multiple
          onChange={handleFileChange}
          className="hidden"
          accept="video/*,image/*,application/pdf"
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UploadCloud className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Upload to OmniDrive AI
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {totalCount > 0
                  ? `${totalCount} file${totalCount !== 1 ? "s" : ""} • ${formatSize(totalStagedBytes)}`
                  : "Drag & drop or browse files — supports MP4, MOV, JPG, PNG, PDF"}
              </p>
            </div>
          </div>

          <button
            onClick={handleClose}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="mt-5 space-y-4">
          {/* ─── EMPTY: Drop Zone ─── */}
          {phase === "empty" && (
            <div
              onClick={() => dropZoneInputRef.current?.click()}
              className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-200 ${
                isDragOver
                  ? "border-[#1a73e8] bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01]"
                  : "border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/40"
              }`}
            >
              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/80 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center mb-3 shadow-xs">
                <UploadCloud className="w-6 h-6 stroke-[1.75]" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Drag and drop your files here, or{" "}
                <span className="text-[#1a73e8] hover:underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Select multiple files — each goes through the full AWS AI pipeline
              </p>
              <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-blue-100/70 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  🎬 MP4 / MOV
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-emerald-100/70 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/50">
                  📷 JPG / PNG
                </span>
                <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-purple-100/70 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200/50 dark:border-purple-800/50">
                  📑 PDF
                </span>
              </div>
            </div>
          )}

          {/* ─── STAGING / UPLOADING / DONE: File List ─── */}
          {phase !== "empty" && (
            <>
              {/* Aggregate progress bar (during upload) */}
              {(phase === "uploading") && (
                <div className="space-y-1.5 p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a73e8]" />
                      Uploading{" "}
                      {filesQueue.filter((i) => i.status === "uploading").length > 0
                        ? `${filesQueue.filter((i) => i.status === "completed").length + filesQueue.filter((i) => i.status === "uploading").length} of ${totalCount} files`
                        : "…"}
                    </span>
                    <span className="font-mono font-bold text-[#1a73e8]">{overallProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-200 rounded-full"
                      style={{ width: `${overallProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center">
                    2 concurrent S3 streams • zero web-server overhead
                  </p>
                </div>
              )}

              {/* Done summary banner */}
              {phase === "done" && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                    hasError
                      ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50"
                      : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/80 dark:border-emerald-800/60"
                  }`}
                >
                  {hasError ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {hasError
                        ? `${successCount} uploaded, ${errorCount} failed`
                        : `All ${successCount} file${successCount !== 1 ? "s" : ""} uploaded! ✅`}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {hasError
                        ? "You can retry the failed files or close this dialog."
                        : "Files are being processed through the AWS AI pipeline."}
                    </p>
                  </div>
                </div>
              )}

              {/* File rows */}
              <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-0.5">
                {filesQueue.map((item) => (
                  <FileRow
                    key={item.id}
                    item={item}
                    phase={phase}
                    onRemove={phase === "staging" ? removeFile : null}
                  />
                ))}
              </div>

              {/* Rejected files warning */}
              {rejectedNames.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-semibold">
                      {rejectedNames.length} file{rejectedNames.length !== 1 ? "s" : ""} skipped (unsupported type or too large)
                    </p>
                    <p className="mt-0.5 text-[10px] opacity-80 truncate">
                      {rejectedNames.slice(0, 3).join(", ")}
                      {rejectedNames.length > 3 ? ` +${rejectedNames.length - 3} more` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setRejectedNames([])}
                    className="ml-auto text-amber-500 hover:text-amber-700 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </>
          )}

          {/* ─── Actions ─── */}
          <div className="flex items-center gap-2.5 pt-1">
            {/* EMPTY phase: just handled by drop zone click */}

            {/* STAGING: Add More + Upload All */}
            {phase === "staging" && (
              <>
                <button
                  type="button"
                  onClick={() => addMoreInputRef.current?.click()}
                  disabled={isStartingUpload || isUploading}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add More
                </button>
                <button
                  type="button"
                  onClick={handleStartUpload}
                  disabled={
                    isStartingUpload ||
                    isUploading ||
                    filesQueue.filter((i) => i.status === "pending").length === 0
                  }
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
                >
                  {isStartingUpload ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white shrink-0" />
                      <span>Starting upload…</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-4 h-4 shrink-0" />
                      <span>Upload {filesQueue.length > 0 ? `${filesQueue.length} File${filesQueue.length !== 1 ? "s" : ""}` : "All"}</span>
                    </>
                  )}
                </button>
              </>
            )}

            {/* UPLOADING: live message with option to cancel */}
            {phase === "uploading" && (
              <div className="w-full flex items-center justify-between py-2 px-1">
                <span className="text-xs text-slate-500">
                  Streaming directly to secure S3 storage…
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 transition-colors hover:underline"
                >
                  Cancel Upload
                </button>
              </div>
            )}

            {/* DONE: retry or close */}
            {phase === "done" && (
              <>
                {hasError && (
                  <button
                    type="button"
                    onClick={handleRetry}
                    className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-amber-300 dark:border-amber-800 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Retry Failed ({errorCount})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => { clearQueue(); }}
                  className="flex items-center gap-1.5 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Upload More
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
