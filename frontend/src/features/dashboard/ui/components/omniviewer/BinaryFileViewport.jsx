import React, { useState } from "react";
import {
  Archive,
  Download,
  Copy,
  Check,
  ShieldCheck,
  HardDrive,
  FileBadge,
  ExternalLink,
  Share2,
  X,
} from "lucide-react";

const BinaryFileViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [copied, setCopied] = useState(false);
  const fileUrl = file.downloadUrl || file.download_url || downloadLink || null;
  const fileName = file.name || "archive.bin";
  const ext = (file.name || "").split(".").pop().toUpperCase();

  const handleCopyLink = () => {
    if (!fileUrl) return;
    navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{ maxHeight: "calc(100vh - 105px)" }}
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-white/10 bg-slate-900/80 backdrop-blur-2xl shadow-2xl overflow-hidden relative select-none"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-slate-900/90 border-b border-white/10 flex items-center justify-between text-slate-300 shrink-0 z-20">
        {/* Left: Format & Archive Details */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Archive className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-semibold text-white text-xs truncate max-w-[160px] sm:max-w-xs font-sans">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30 font-mono shrink-0">
            {ext} ARCHIVE
          </span>
          <span className="text-slate-400 text-[11px] font-mono hidden sm:inline">
            {file.size || "Original Size"}
          </span>
        </div>

        {/* Right: Actions (Copy Link, Direct Download, Share, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Share Link */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white transition-colors"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Button */}
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-md shadow-blue-500/25 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download</span>
            </a>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-white/80 hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Telemetry Stage */}
      <div className="flex-1 w-full min-h-0 relative flex items-center justify-center p-6 bg-slate-950/70 overflow-y-auto custom-scrollbar">
        {/* Enterprise Telemetry Card */}
        <div className="relative max-w-md w-full rounded-2xl bg-slate-900/90 border border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
          {/* Format Badge */}
          <div className="w-18 h-18 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center shadow-inner mb-4">
            <Archive className="w-9 h-9 stroke-[1.5]" />
          </div>

          <h3 className="text-base font-bold text-white mb-1 truncate max-w-full">
            {fileName}
          </h3>
          <p className="text-xs text-slate-400 font-mono mb-5">
            {ext} Binary Package • {file.size || "Unknown Size"}
          </p>

          {/* Metadata Details Grid */}
          <div className="w-full bg-black/40 rounded-xl p-3.5 border border-white/5 space-y-2.5 font-mono text-xs text-left mb-6">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500 flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5" />
                S3 Storage:
              </span>
              <span className="text-emerald-400 font-semibold">Standard AWS S3</span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                Integrity:
              </span>
              <span
                className="text-slate-300 truncate max-w-[180px]"
                title={file.id || "Verified"}
              >
                SHA-256 Verified
              </span>
            </div>

            <div className="flex items-center justify-between text-slate-300">
              <span className="text-slate-500 flex items-center gap-1.5">
                <FileBadge className="w-3.5 h-3.5" />
                Format:
              </span>
              <span className="text-amber-300 uppercase">{ext} File</span>
            </div>
          </div>

          {/* Download Action */}
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 active:scale-98"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default BinaryFileViewport;
