import React, { useState, useRef, useEffect } from "react";
import {
  UploadCloud,
  FileCheck,
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
} from "lucide-react";
import useFileUpload from "../hooks/useFileUpload.jsx";

/**
 * OmniDrive AI - Phase 3: Direct S3 Ingestion Upload Modal Component
 * File: src/components/UploadModal.jsx
 *
 * Features:
 * - Drag-and-drop & file picker
 * - Real-time progress bar (0% -> 100%) tracking direct XMLHttpRequest PUT upload to S3
 * - File details preview (type, size, name)
 * - Clear success (✅ Upload completed!) and error states
 * - Fluid animations & Dark/Light mode support with Tailwind CSS
 */
const UploadModal = ({ isOpen, onClose, onUploadComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const {
    uploadFile,
    uploadProgress,
    isUploading,
    isSuccess,
    error,
    uploadedData,
    resetUpload,
  } = useFileUpload();

  // Reset internal state when modal closes or opens
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsDragOver(false);
      resetUpload();
    }
  }, [isOpen, resetUpload]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isUploading) {
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
  }, [isOpen, isUploading, onClose]);

  if (!isOpen) return null;

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;

    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      setSelectedFile(droppedFile);
      resetUpload();
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      resetUpload();
    }
    e.target.value = "";
  };

  const handleStartUpload = async () => {
    if (!selectedFile || isUploading) return;
    try {
      const res = await uploadFile(selectedFile);
      if (onUploadComplete) {
        onUploadComplete(res);
      }
    } catch (_) {
      // Error is caught and surfaced by useFileUpload state
    }
  };

  const handleSelectAnother = () => {
    setSelectedFile(null);
    resetUpload();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (file) => {
    if (!file) return File;
    const type = file.type || "";
    if (type.startsWith("video/")) return Film;
    if (type.startsWith("image/")) return Camera;
    if (type.includes("pdf")) return FileText;
    return File;
  };

  const FileIcon = getFileIcon(selectedFile);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
      aria-modal="true"
      role="dialog"
    >
      {/* Frosted Glassmorphic Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity duration-300"
        onClick={() => {
          if (!isUploading) onClose();
        }}
        aria-hidden="true"
      />

      {/* Modal Surface */}
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8 z-10 transform transition-all duration-200 scale-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <UploadCloud className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Direct S3 Upload Pipeline
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Phase 3: AWS Presigned URL Ingestion
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isUploading}
            aria-label="Close modal"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="video/*,image/*,application/pdf"
        />

        {/* Modal Body */}
        <div className="mt-5 space-y-5">
          {/* STATE 1: SUCCESS STATE */}
          {isSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/60 text-center space-y-4 animate-fadeIn">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-base font-bold text-emerald-900 dark:text-emerald-200">
                  ✅ Upload completed!
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-300/90 mt-1">
                  File successfully ingested into AWS S3 Raw Storage and registered with status{" "}
                  <span className="font-semibold font-mono">PENDING_UPLOAD</span>.
                </p>
              </div>

              {uploadedData && (
                <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-emerald-100 dark:border-emerald-900/50 text-left text-xs font-mono text-slate-600 dark:text-slate-400 space-y-1">
                  <div className="truncate">
                    <span className="text-slate-400 font-sans">File:</span> {uploadedData.file_name}
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-sans">S3 Key:</span> {uploadedData.s3_key}
                  </div>
                  <div className="truncate">
                    <span className="text-slate-400 font-sans">ID:</span> {uploadedData.file_id}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSelectAnother}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Upload Another
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          ) : !selectedFile ? (
            /* STATE 2: DRAG & DROP ZONE */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
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
                Drag and drop your file here, or{" "}
                <span className="text-[#1a73e8] hover:underline">browse</span>
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Supports MP4, MOV, JPEG, PNG, WEBP, and PDF (Max 500 MB)
              </p>
            </div>
          ) : (
            /* STATE 3: SELECTED FILE PREVIEW & PROGRESS */
            <div className="space-y-4">
              {/* Selected File Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/80 dark:bg-blue-950/80 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center shrink-0">
                    <FileIcon className="w-5 h-5 stroke-[1.75]" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                      {selectedFile.name}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || "file"}
                    </p>
                  </div>
                </div>

                {!isUploading && (
                  <button
                    onClick={handleSelectAnother}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Choose different file"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* LIVE PROGRESS BAR */}
              {isUploading && (
                <div className="space-y-2 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#1a73e8]" />
                      Streaming to S3 Presigned URL...
                    </span>
                    <span className="font-mono font-bold text-[#1a73e8] dark:text-blue-400">
                      {uploadProgress}%
                    </span>
                  </div>

                  {/* Progress Bar Track */}
                  <div className="h-2.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-150 ease-out rounded-full shadow-xs"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center">
                    Direct client-to-storage stream • Zero web server overhead
                  </p>
                </div>
              )}

              {/* ERROR ALERT */}
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-300">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                  <div className="flex-1">
                    <p className="font-semibold">Upload failed</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                </div>
              )}

              {/* ACTIONS */}
              {!isUploading && (
                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSelectAnother}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Change File
                  </button>
                  <button
                    type="button"
                    onClick={handleStartUpload}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-blue-600 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5"
                  >
                    <UploadCloud className="w-4 h-4" />
                    Upload Now
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadModal;
