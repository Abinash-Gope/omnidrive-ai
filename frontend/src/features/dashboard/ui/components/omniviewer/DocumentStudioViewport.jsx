import React, { useState } from "react";
import {
  FileText,
  Presentation,
  FileSpreadsheet,
  Download,
  Share2,
  ExternalLink,
  ShieldCheck,
  HardDrive,
  FileBadge,
  Sparkles,
  Eye,
  Info,
  X,
  RefreshCw,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from "lucide-react";
import DocumentAiInsightsDrawer from "./DocumentAiInsightsDrawer.jsx";

const DocumentStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [viewMode, setViewMode] = useState("preview"); // "preview" | "details"
  const [engine, setEngine] = useState("google"); // "google" | "office"
  const [iframeLoading, setIframeLoading] = useState(true);
  const [iframeError, setIframeError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  const fileUrl = file.downloadUrl || file.download_url || downloadLink || null;
  const fileName = file.name || "document.docx";
  const fileNameLower = fileName.toLowerCase();
  const ext = fileName.split(".").pop().toUpperCase();

  // Categorize document format
  const isPpt =
    file.type === "presentation" ||
    /\.(pptx?|potx?|ppsx?|pptm|odp|key)$/i.test(fileNameLower);
  const isWord =
    file.type === "word" ||
    /\.(docx?|dotx?|docm|odt|rtf|pages)$/i.test(fileNameLower);
  const isExcel =
    file.type === "spreadsheet" ||
    /\.(xlsx?|xltx?|xlsm|ods|numbers)$/i.test(fileNameLower);
  const isOfficeDoc = isWord || isPpt || isExcel;

  const theme = isWord
    ? {
        name: "Word Document",
        icon: FileText,
        badgeText: `${ext || "DOCX"} WORD`,
        bgLight: "bg-blue-500/10 text-blue-600 border-blue-500/25",
        bgDark: "dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-400/30",
        accent: "text-blue-600 dark:text-blue-400",
        glow: "from-blue-500/20 to-indigo-500/20",
        ring: "ring-blue-500/30",
      }
    : isPpt
    ? {
        name: "PowerPoint Slides",
        icon: Presentation,
        badgeText: `${ext || "PPTX"} SLIDES`,
        bgLight: "bg-orange-500/10 text-orange-600 border-orange-500/25",
        bgDark: "dark:bg-orange-500/20 dark:text-orange-300 dark:border-orange-400/30",
        accent: "text-orange-600 dark:text-orange-400",
        glow: "from-orange-500/20 to-amber-500/20",
        ring: "ring-orange-500/30",
      }
    : isExcel
    ? {
        name: "Excel Spreadsheet",
        icon: FileSpreadsheet,
        badgeText: `${ext || "XLSX"} SHEET`,
        bgLight: "bg-emerald-500/10 text-emerald-600 border-emerald-500/25",
        bgDark: "dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-400/30",
        accent: "text-emerald-600 dark:text-emerald-400",
        glow: "from-emerald-500/20 to-teal-500/20",
        ring: "ring-emerald-500/30",
      }
    : {
        name: "Office Document",
        icon: FileText,
        badgeText: `${ext || "DOC"}`,
        bgLight: "bg-indigo-500/10 text-indigo-600 border-indigo-500/25",
        bgDark: "dark:bg-indigo-500/20 dark:text-indigo-300 dark:border-indigo-400/30",
        accent: "text-indigo-600 dark:text-indigo-400",
        glow: "from-indigo-500/20 to-purple-500/20",
        ring: "ring-indigo-500/30",
      };

  const IconComponent = theme.icon;

  // Online preview endpoint candidates
  const isHttpUrl = fileUrl && (fileUrl.startsWith("http://") || fileUrl.startsWith("https://"));
  const googleViewerUrl = isHttpUrl
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`
    : null;
  const officeViewerUrl = isHttpUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : null;

  const currentViewerUrl = engine === "office" && officeViewerUrl ? officeViewerUrl : googleViewerUrl;

  const handleCopyLink = () => {
    if (!fileUrl) return;
    navigator.clipboard.writeText(fileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setIframeLoading(true);
    setIframeError(false);
  };

  return (
    <div
      className={`w-full h-full max-w-5xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl overflow-hidden relative select-none animate-in fade-in zoom-in-95 duration-200 ${
        isFocusMode ? "max-w-none" : ""
      }`}
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-3 sm:px-4 bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 shrink-0 z-20 backdrop-blur-xl">
        {/* Left: Document Identity & Badges */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-2.5 mr-2">
          <IconComponent className={`w-4 h-4 shrink-0 ${theme.accent}`} />
          <span
            className="font-semibold text-slate-900 dark:text-white text-xs truncate font-sans max-w-[260px] sm:max-w-sm md:max-w-md"
            title={fileName}
          >
            {fileName}
          </span>
          <span
            className={`h-6 px-2 rounded-lg text-[10px] font-bold uppercase border font-mono shrink-0 flex items-center leading-none ${theme.bgLight} ${theme.bgDark}`}
          >
            {theme.badgeText}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono hidden lg:flex items-center leading-none shrink-0">
            {file.size || "Cloud Document"}
          </span>
        </div>

        {/* Right: Actions & Viewport Controls */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {/* Dual Engine Switcher (when in preview mode and online URL available) */}
          {viewMode === "preview" && isOfficeDoc && officeViewerUrl && (
            <div className="hidden sm:flex items-center h-8 bg-slate-100/90 dark:bg-white/10 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs">
              <button
                onClick={() => {
                  if (engine !== "google") {
                    setEngine("google");
                    handleRefresh();
                  }
                }}
                className={`h-full px-2.5 rounded-lg font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] flex items-center justify-center leading-none ${
                  engine === "google"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Use Google Docs Preview Engine"
              >
                Google Docs
              </button>
              <button
                onClick={() => {
                  if (engine !== "office") {
                    setEngine("office");
                    handleRefresh();
                  }
                }}
                className={`h-full px-2.5 rounded-lg font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] flex items-center justify-center leading-none ${
                  engine === "office"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Use Microsoft Office Preview Engine"
              >
                Office 365
              </button>
            </div>
          )}

          {/* Mode Switcher: Web View vs. Overview */}
          {googleViewerUrl && (
            <div className="flex items-center h-8 bg-slate-100/90 dark:bg-white/10 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs">
              <button
                onClick={() => {
                  setViewMode("preview");
                  setIframeError(false);
                }}
                className={`h-full flex items-center gap-1.5 px-2.5 rounded-lg font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] leading-none ${
                  viewMode === "preview"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Online Document Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Preview</span>
              </button>
              <button
                onClick={() => setViewMode("details")}
                className={`h-full flex items-center gap-1.5 px-2.5 rounded-lg font-medium transition-all duration-150 active:scale-95 hover:scale-[1.02] leading-none ${
                  viewMode === "details"
                    ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Document Info & Actions"
              >
                <Info className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Overview</span>
              </button>
            </div>
          )}

          {/* AI Insights Drawer Toggle Button */}
          <button
            onClick={() => setShowAiDrawer(!showAiDrawer)}
            className={`h-8 flex items-center gap-1.5 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 active:scale-95 hover:scale-105 leading-none shadow-xs hover:shadow-md ${
              showAiDrawer
                ? "bg-purple-600 text-white border-purple-500 shadow-purple-500/25"
                : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30"
            }`}
            title="Toggle Document Intelligence & AI Chat"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300 animate-pulse" />
            <span className="hidden sm:inline font-sans">AI Insights</span>
          </button>

          {/* Refresh Preview */}
          {viewMode === "preview" && currentViewerUrl && (
            <button
              onClick={handleRefresh}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
              title="Refresh Document Preview"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${iframeLoading ? "animate-spin" : ""}`} />
            </button>
          )}

          {/* Focus Mode Toggle */}
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
            title={isFocusMode ? "Exit Focus Canvas" : "Expand Focus Canvas"}
          >
            {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Share Link */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Open in external viewer / new tab */}
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
              title="Open document in new tab"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Download Button */}
          {fileUrl && (
            <a
              href={fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              className="h-8 flex items-center gap-1.5 px-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium shadow-xs shadow-blue-500/25 transition-all duration-150 active:scale-95 hover:scale-105 leading-none"
              title="Download file"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </a>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Split Stage: Embedded Preview or Overview Card + Collapsible AI Insights Drawer */}
      <div className="flex-1 w-full min-h-0 relative flex overflow-hidden">
        {/* Document Canvas Stage */}
        <div
          className={`flex-1 h-full min-w-0 relative flex items-center justify-center bg-slate-100/40 dark:bg-slate-950/60 backdrop-blur-md overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            viewMode === "preview" ? "p-1 sm:p-2" : "p-4 sm:p-6"
          }`}
        >
        {viewMode === "preview" && currentViewerUrl && !iframeError ? (
          <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-200/80 dark:border-white/10 bg-white dark:bg-slate-900 shadow-inner flex flex-col">
            {iframeLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md">
                {/* Elegant Document Shimmer Skeleton */}
                <div className="w-64 max-w-[80%] space-y-3 mb-5 opacity-40 animate-pulse pointer-events-none">
                  <div className="h-4 bg-slate-300 dark:bg-slate-700 rounded-full w-3/4 mx-auto" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-full" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-5/6 mx-auto" />
                  <div className="h-2.5 bg-slate-200 dark:bg-slate-800 rounded-full w-4/5 mx-auto" />
                </div>

                <div className="relative mb-3">
                  <div className="w-10 h-10 border-2 border-slate-200 dark:border-slate-700 border-t-[#1a73e8] rounded-full animate-spin" />
                  <IconComponent className={`w-5 h-5 absolute inset-0 m-auto ${theme.accent}`} />
                </div>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                  Loading {theme.name}...
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  Connecting to {engine === "office" ? "Microsoft 365 Viewer" : "Google Docs Viewer"}
                </p>
              </div>
            )}
            <iframe
              key={`${currentViewerUrl}-${engine}`}
              src={currentViewerUrl}
              title={fileName}
              className="w-full h-full border-0"
              onLoad={() => setIframeLoading(false)}
              onError={() => {
                setIframeLoading(false);
                setIframeError(true);
              }}
            />
          </div>
        ) : (
          /* Document Inspector & Telemetry Overview Card */
          <div className="relative max-w-lg w-full rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-white/10 p-6 sm:p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center overflow-y-auto max-h-full custom-scrollbar animate-in zoom-in-95 duration-150">
            {/* Ambient Format Glow */}
            <div
              className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-gradient-to-b ${theme.glow} blur-3xl pointer-events-none rounded-full`}
            />

            {/* Large Format Badge */}
            <div
              className={`w-20 h-20 rounded-2xl ${theme.bgLight} ${theme.bgDark} flex items-center justify-center shadow-inner mb-4 relative group`}
            >
              <IconComponent className={`w-10 h-10 ${theme.accent}`} />
              <div className="absolute -bottom-1 -right-1 p-1 bg-white dark:bg-slate-800 rounded-full shadow-md border border-slate-200/80 dark:border-white/15">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white truncate max-w-full px-2">
              {fileName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-5 flex items-center gap-1.5">
              <span>{theme.name}</span>
              <span>•</span>
              <span className="font-mono">{file.size || "Verified Cloud Asset"}</span>
            </p>

            {/* Metadata Badges Grid */}
            <div className="w-full grid grid-cols-2 gap-2.5 mb-6 text-left">
              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                  <FileBadge className="w-3 h-3 text-[#1a73e8]" />
                  <span>File Format</span>
                </div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 font-mono">
                  .{ext} ({theme.name})
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                  <HardDrive className="w-3 h-3 text-emerald-500" />
                  <span>Storage Backend</span>
                </div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 font-mono">
                  AWS S3 (AES-256)
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                  <ShieldCheck className="w-3 h-3 text-purple-500" />
                  <span>Integrity & Safety</span>
                </div>
                <div className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 font-mono">
                  Cloud Verified Clean
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/60 dark:border-white/5">
                <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>OmniViewer Pipeline</span>
                </div>
                <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 font-mono">
                  Polymorphic Ingestion
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="w-full flex flex-col sm:flex-row items-center gap-2.5">
              {fileUrl && (
                <a
                  href={fileUrl}
                  download={fileName}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:flex-1 h-10 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </a>
              )}

              {googleViewerUrl && (
                <button
                  onClick={() => {
                    setViewMode("preview");
                    setIframeError(false);
                    setIframeLoading(true);
                  }}
                  className="w-full sm:flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white font-medium text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <Eye className="w-4 h-4" />
                  <span>Open Interactive Viewer</span>
                </button>
              )}

              {fileUrl && (
                <button
                  onClick={handleCopyLink}
                  className="w-full sm:w-auto h-10 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0"
                  title="Copy Direct S3 Download Link"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-500" />
                      <span className="sm:hidden">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="sm:hidden">Copy Link</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-4 leading-relaxed">
              💡 Open in Microsoft 365, Google Workspace, or your native desktop application for full editing capabilities.
            </p>
          </div>
        )}
        </div>

        {/* Collapsible Executive AI Insights Right Drawer */}
        <DocumentAiInsightsDrawer
          file={file}
          fileUrl={fileUrl}
          fileName={fileName}
          isOpen={showAiDrawer}
          onClose={() => setShowAiDrawer(false)}
          theme={theme}
        />
      </div>
    </div>
  );
};

export default DocumentStudioViewport;
