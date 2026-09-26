import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  FileText,
  Copy,
  Check,
  Eye,
  Code,
  Loader2,
  AlertCircle,
  Share2,
  Download,
  X,
} from "lucide-react";

/**
 * Lightweight, zero-dependency Markdown parser & renderer
 */
const renderMarkdown = (text) => {
  const lines = text.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${i}`}
            className="p-4 rounded-xl bg-slate-100 dark:bg-black/60 border border-slate-200 dark:border-slate-800 text-purple-700 dark:text-purple-300 font-mono text-xs overflow-x-auto my-3"
          >
            <code>{codeBuffer.join("\n")}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    // Headings
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={i}
          className="text-2xl font-extrabold text-slate-900 dark:text-white mt-6 mb-3 pb-2 border-b border-slate-200 dark:border-slate-800"
        >
          {line.replace("# ", "")}
        </h1>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={i} className="text-xl font-bold text-slate-900 dark:text-white mt-5 mb-2 pb-1">
          {line.replace("## ", "")}
        </h2>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      elements.push(
        <h3 key={i} className="text-base font-semibold text-blue-600 dark:text-blue-400 mt-4 mb-2">
          {line.replace("### ", "")}
        </h3>
      );
      continue;
    }

    // Blockquotes
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote
          key={i}
          className="border-l-4 border-[#1a73e8] pl-4 py-1 text-slate-700 dark:text-slate-300 italic bg-blue-500/5 rounded-r-lg my-2 text-sm"
        >
          {line.replace("> ", "")}
        </blockquote>
      );
      continue;
    }

    // Checklists
    if (line.startsWith("- [ ] ") || line.startsWith("- [x] ")) {
      const isChecked = line.startsWith("- [x] ");
      const textVal = line.replace(/- \[[ x]\] /, "");
      elements.push(
        <div key={i} className="flex items-center gap-2.5 my-1.5 text-sm">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="rounded accent-[#1a73e8] w-4 h-4"
          />
          <span className={isChecked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}>
            {textVal}
          </span>
        </div>
      );
      continue;
    }

    // Unordered lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      elements.push(
        <li key={i} className="ml-5 list-disc text-slate-700 dark:text-slate-300 my-1 text-sm leading-relaxed">
          {line.replace(/^[-*] /, "")}
        </li>
      );
      continue;
    }

    // Blank line
    if (line.trim() === "") {
      elements.push(<div key={i} className="h-3" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-slate-700 dark:text-slate-300 text-sm leading-relaxed my-1">
        {line}
      </p>
    );
  }

  return elements;
};

const MarkdownStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("rendered"); // 'rendered' | 'raw'
  const [copied, setCopied] = useState(false);

  const fileUrl = file.downloadUrl || file.download_url || downloadLink || null;

  useEffect(() => {
    let isMounted = true;
    if (!fileUrl) {
      setError("Download URL not available for this document.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    axios
      .get(fileUrl, { responseType: "text" })
      .then((res) => {
        if (!isMounted) return;
        const text = typeof res.data === "string" ? res.data : String(res.data);
        setContent(text);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not fetch markdown content:", err);
        setError("Unable to stream document content from S3.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-3" />
        <span className="text-xs font-mono">Loading document typography...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">Cannot Load Document</h4>
        <p className="text-xs text-slate-400 max-w-md mb-4">{error}</p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold shadow-lg transition-all"
          >
            Download Direct File
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      style={{ maxHeight: "calc(100vh - 105px)" }}
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl overflow-hidden relative select-text animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 shrink-0 z-20 backdrop-blur-xl">
        {/* Left: Format & Document Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[160px] sm:max-w-xs font-sans">
            {file.name}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 font-mono shrink-0">
            MARKDOWN
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-mono hidden sm:inline">
            {content.split(/\s+/).filter(Boolean).length} words
          </span>
        </div>

        {/* Right: Actions (Preview/Raw toggle, Copy, Share, Download, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setMode("rendered")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                mode === "rendered"
                  ? "bg-[#1a73e8] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <button
              onClick={() => setMode("raw")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all hover:scale-[1.02] active:scale-95 cursor-pointer ${
                mode === "raw"
                  ? "bg-[#1a73e8] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>Raw</span>
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white text-xs font-medium transition-all hover:scale-105 active:scale-90 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Share Link */}
          {onShare && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90 cursor-pointer"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Link */}
          {(downloadLink || fileUrl) && (
            <a
              href={downloadLink || fileUrl}
              download={file.name || "document.md"}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90"
              title="Download markdown file"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close Button */}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Document Content Viewport */}
      <div className="flex-1 overflow-auto p-6 md:p-10 flex justify-center bg-slate-50/60 dark:bg-transparent backdrop-blur-xs">
        <div className="max-w-3xl w-full">
          {mode === "rendered" ? (
            <div className="space-y-1">{renderMarkdown(content)}</div>
          ) : (
            <pre className="font-mono text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-6">
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
};

export default MarkdownStudioViewport;
