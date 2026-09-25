import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Code2,
  Copy,
  Check,
  Search,
  WrapText,
  FileCode,
  Loader2,
  AlertCircle,
  Share2,
  Download,
  X,
} from "lucide-react";

/**
 * Basic syntax highlighting tokenizer
 */
const tokenizeLine = (line, lang) => {
  // Simple regex-based token classification for vibrant dark code theme
  const commentRegex = /(\/\/.*|#.*|\/\*.*\*\/)/;
  const stringRegex = /(".*?"|'.*?'|`.*?`)/;
  const keywordRegex = /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|def|async|await|try|catch|self|this|public|private|static|void|interface|type)\b/;
  const numberRegex = /\b(\d+(\.\d+)?)\b/;
  const booleanRegex = /\b(true|false|null|undefined|None|True|False)\b/;

  // Check comment first
  if (commentRegex.test(line)) {
    const parts = line.split(commentRegex);
    return (
      <span>
        {parts.map((part, i) =>
          commentRegex.test(part) ? (
            <span key={i} className="text-slate-500 italic">
              {part}
            </span>
          ) : (
            <span key={i} className="text-slate-200">
              {part}
            </span>
          )
        )}
      </span>
    );
  }

  // Tokenize words
  const tokens = line.split(/(\s+|[(){}[\].,;:=+\-*/&|!<>?])/);
  return (
    <span>
      {tokens.map((token, i) => {
        if (keywordRegex.test(token)) {
          return (
            <span key={i} className="text-purple-400 font-semibold">
              {token}
            </span>
          );
        }
        if (stringRegex.test(token)) {
          return (
            <span key={i} className="text-emerald-400">
              {token}
            </span>
          );
        }
        if (numberRegex.test(token)) {
          return (
            <span key={i} className="text-amber-400">
              {token}
            </span>
          );
        }
        if (booleanRegex.test(token)) {
          return (
            <span key={i} className="text-rose-400 font-medium">
              {token}
            </span>
          );
        }
        return (
          <span key={i} className="text-slate-200">
            {token}
          </span>
        );
      })}
    </span>
  );
};

const CodeStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [wordWrap, setWordWrap] = useState(false);

  const fileUrl = file.downloadUrl || file.download_url || downloadLink || null;
  const fileName = file.name || "code.txt";

  const ext = fileName.split(".").pop().toLowerCase();
  const language =
    {
      js: "JavaScript",
      jsx: "React JSX",
      ts: "TypeScript",
      tsx: "React TSX",
      py: "Python",
      json: "JSON Data",
      html: "HTML5",
      css: "CSS3",
      sql: "SQL Database",
      sh: "Shell Script",
      yml: "YAML Config",
      yaml: "YAML Config",
      env: "Environment Config",
      xml: "XML",
      md: "Markdown",
      txt: "Plain Text",
    }[ext] || "Source Code";

  // Fetch code text content
  useEffect(() => {
    let isMounted = true;
    if (!fileUrl) {
      setError("Download URL not available for this file.");
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    axios
      .get(fileUrl, { responseType: "text" })
      .then((res) => {
        if (!isMounted) return;
        const text = typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
        setContent(text);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn("Could not fetch code content:", err);
        setError("Unable to stream file content from S3. Direct preview might be restricted by CORS or size.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileUrl]);

  const lines = useMemo(() => content.split("\n"), [content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 text-[#1a73e8] animate-spin mb-3" />
        <span className="text-xs font-mono">Fetching source code from S3...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">Cannot Load Code Preview</h4>
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
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl overflow-hidden relative font-mono text-xs select-text"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 shrink-0 z-20 backdrop-blur-xl">
        {/* Left: Format & Code Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[160px] sm:max-w-xs font-sans">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0">
            {language}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden sm:inline">
            {lines.length} lines • {content.length} bytes
          </span>
        </div>

        {/* Right: Actions (Search, Wrap, Copy, Share, Download, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* In-File Search */}
          <div className="relative hidden md:flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-[11px] focus:outline-hidden focus:border-cyan-500 w-36"
            />
          </div>

          {/* Word Wrap Toggle */}
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className={`p-1.5 rounded-xl border transition-colors ${
              wordWrap
                ? "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/40"
                : "bg-slate-100/80 dark:bg-white/5 border-slate-200/70 dark:border-white/10 hover:bg-slate-200/80 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
            }`}
            title="Toggle Word Wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
          </button>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white text-xs font-sans font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-500">Copied!</span>
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
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Copy share link"
            >
              <Share2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Download Link */}
          {(downloadLink || fileUrl) && (
            <a
              href={downloadLink || fileUrl}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Download source code"
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
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Code Text Viewport with Line Numbers */}
      <div className="flex-1 overflow-auto p-4 flex bg-slate-50/60 dark:bg-transparent backdrop-blur-xs">
        {/* Line Numbers Gutter */}
        <div className="select-none text-right pr-4 text-slate-400 dark:text-slate-600 font-mono text-xs border-r border-slate-300/80 dark:border-slate-800/80 shrink-0">
          {lines.map((_, i) => (
            <div key={i} className="leading-6">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <pre
          className={`pl-4 flex-1 font-mono text-xs leading-6 ${
            wordWrap ? "whitespace-pre-wrap break-all" : "whitespace-pre overflow-x-auto"
          }`}
        >
          {lines.map((line, i) => {
            const isMatch =
              searchQuery.trim() !== "" &&
              line.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={i}
                className={`${isMatch ? "bg-amber-500/20 rounded px-1 -mx-1" : ""}`}
              >
                {tokenizeLine(line, ext)}
              </div>
            );
          })}
        </pre>
      </div>
    </div>
  );
};

export default CodeStudioViewport;
