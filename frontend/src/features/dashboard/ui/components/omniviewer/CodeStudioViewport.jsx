import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import {
  Code2,
  Copy,
  Check,
  Search,
  FileCode,
  Loader2,
  AlertCircle,
  Share2,
  Download,
  X,
} from "lucide-react";

/**
 * Advanced multi-language syntax highlighting tokenizer supporting light & dark themes.
 */
const tokenizeSegment = (segment, ext) => {
  const isWeb = /^(html|xml|svg|vue|jsx|tsx)$/i.test(ext);
  const isCss = /^(css|scss|sass|less)$/i.test(ext);

  // Tokenize words, delimiters, operators, numbers, and strings
  const tokens = segment.split(/(\s+|[(){}[\].,;:=+\-*/&|!<>?`"'])/);

  return (
    <span>
      {tokens.map((token, i) => {
        if (!token) return null;

        // Strings
        if (/^(".*?"|'.*?'|`.*?`)$/.test(token)) {
          return (
            <span key={i} className="text-emerald-700 dark:text-emerald-400 font-normal">
              {token}
            </span>
          );
        }

        // Keywords
        if (
          /\b(const|let|var|function|return|if|else|for|while|import|from|export|default|class|def|async|await|try|catch|self|this|public|private|static|void|interface|type|extends|implements|new|throw|typeof|instanceof|switch|case|break|continue|package|fn|mut|struct|enum|match)\b/.test(
            token
          )
        ) {
          return (
            <span key={i} className="text-purple-700 dark:text-purple-400 font-semibold">
              {token}
            </span>
          );
        }

        // HTML Tags / Elements
        if (
          isWeb &&
          /^(<[\w:-]+|<\/|<!DOCTYPE|\/?>|>|<)$/i.test(token)
        ) {
          return (
            <span key={i} className="text-blue-700 dark:text-blue-400 font-semibold">
              {token}
            </span>
          );
        }

        // HTML & CSS attribute names and properties
        if (
          (isWeb || isCss) &&
          /^(lang|charset|name|content|title|href|src|rel|class|id|style|type|width|height|color|background|padding|margin|font-family|box-sizing|text-align|display|flex|grid|border|overflow|position|top|left|right|bottom|z-index|cursor|opacity|transition|animation|align-items|justify-content)$/i.test(
            token
          )
        ) {
          return (
            <span key={i} className="text-cyan-700 dark:text-cyan-300 font-medium">
              {token}
            </span>
          );
        }

        // HTML Tag names inside tags (html, head, meta, style, body, h1, div, etc.)
        if (
          isWeb &&
          /^(html|head|meta|title|style|body|h[1-6]|p|div|span|button|input|a|img|ul|li|table|tr|td|th|script|link|header|footer|nav|section|article|aside|form|label|select|option)$/i.test(
            token
          )
        ) {
          return (
            <span key={i} className="text-blue-700 dark:text-blue-400 font-semibold">
              {token}
            </span>
          );
        }

        // Hex Colors
        if (/^#[0-9a-fA-F]{3,8}$/.test(token)) {
          return (
            <span key={i} className="text-orange-700 dark:text-orange-300 font-mono font-medium">
              {token}
            </span>
          );
        }

        // Numbers & Units (e.g. 1.0, 24px, 100%)
        if (/^\b\d+(?:\.\d+)?(?:px|rem|em|%|vh|vw|ms|s|deg)?\b$/.test(token)) {
          return (
            <span key={i} className="text-amber-700 dark:text-amber-400 font-medium">
              {token}
            </span>
          );
        }

        // Booleans & Null
        if (/^(true|false|null|undefined|None|True|False)$/.test(token)) {
          return (
            <span key={i} className="text-rose-700 dark:text-rose-400 font-semibold">
              {token}
            </span>
          );
        }

        // Default code text: deep readable slate in light mode, crisp light slate in dark mode
        return (
          <span key={i} className="text-slate-800 dark:text-slate-200">
            {token}
          </span>
        );
      })}
    </span>
  );
};

const tokenizeLine = (line, ext = "") => {
  if (!line) return <span>&nbsp;</span>;

  // 1. Comments
  const isHtml = /^(html|xml|svg|vue)$/i.test(ext);

  if (isHtml && line.includes("<!--")) {
    const parts = line.split(/(<!--.*?-->|<!--.*|.*-->)/g);
    return (
      <span>
        {parts.map((part, i) =>
          /<!--.*|.*-->/.test(part) ? (
            <span key={i} className="text-slate-500 dark:text-slate-400 italic">
              {part}
            </span>
          ) : (
            tokenizeSegment(part, ext)
          )
        )}
      </span>
    );
  }

  const commentRegex = /(\/\/.*|\/\*.*\*\/|#.*)/;
  if (!isHtml && commentRegex.test(line)) {
    const parts = line.split(commentRegex);
    return (
      <span>
        {parts.map((part, i) =>
          commentRegex.test(part) ? (
            <span key={i} className="text-slate-500 dark:text-slate-400 italic">
              {part}
            </span>
          ) : (
            tokenizeSegment(part, ext)
          )
        )}
      </span>
    );
  }

  return tokenizeSegment(line, ext);
};

const CodeStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [editorTheme, setEditorTheme] = useState("auto"); // "auto" | "light" | "dark"

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
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/85 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl overflow-hidden relative font-mono text-xs select-text animate-in fade-in zoom-in-95 duration-200"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-3 sm:px-4 bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 shrink-0 z-20 backdrop-blur-xl">
        {/* Left: Format & Code Metrics */}
        <div className="flex-1 min-w-0 flex items-center gap-2 sm:gap-2.5 mr-2">
          <FileCode className="w-4 h-4 text-cyan-600 dark:text-cyan-400 shrink-0" />
          <span
            className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[200px] sm:max-w-xs font-sans"
            title={fileName}
          >
            {fileName}
          </span>
          <span className="h-6 px-2 rounded-lg text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 shrink-0 flex items-center leading-none">
            {language}
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-[11px] hidden md:flex items-center leading-none shrink-0">
            {lines.length} lines • {content.length} bytes
          </span>
        </div>

        {/* Right: Actions (Search, Theme, Wrap, Copy, Share, Download, Close) */}
        <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
          {/* In-File Search */}
          <div className="relative hidden md:flex items-center h-8">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Search code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 pr-3 rounded-xl bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-hidden focus:border-cyan-500 w-36"
            />
          </div>

          {/* Editor Theme Switcher Pill */}
          <div className="flex items-center h-8 bg-slate-100/90 dark:bg-white/10 p-0.5 rounded-xl border border-slate-200/80 dark:border-white/10 text-xs">
            <button
              onClick={() => setEditorTheme("auto")}
              className={`h-full px-2 rounded-lg flex items-center gap-1 font-medium transition-all hover:scale-[1.02] active:scale-95 leading-none cursor-pointer ${
                editorTheme === "auto"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Theme matches app appearance"
            >
              Auto
            </button>
            <button
              onClick={() => setEditorTheme("light")}
              className={`h-full px-2 rounded-lg flex items-center gap-1 font-medium transition-all hover:scale-[1.02] active:scale-95 leading-none cursor-pointer ${
                editorTheme === "light"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Light editor canvas"
            >
              Light
            </button>
            <button
              onClick={() => setEditorTheme("dark")}
              className={`h-full px-2 rounded-lg flex items-center gap-1 font-medium transition-all hover:scale-[1.02] active:scale-95 leading-none cursor-pointer ${
                editorTheme === "dark"
                  ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
              title="Dark editor canvas"
            >
              Dark
            </button>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className="h-8 flex items-center gap-1.5 px-3 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white text-xs font-sans font-medium transition-all hover:scale-105 active:scale-90 cursor-pointer leading-none"
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
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90 cursor-pointer"
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
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90 cursor-pointer"
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
              className="w-8 h-8 rounded-xl flex items-center justify-center bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-white/80 hover:text-slate-900 dark:hover:text-white transition-all hover:scale-105 active:scale-90 cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Code Text Viewport with Line Numbers (Single Unified Scrollbar) */}
      <div
        className={`flex-1 min-h-0 overflow-auto p-4 custom-scrollbar select-text transition-colors ${
          editorTheme === "dark"
            ? "bg-[#18181b] text-slate-100 dark"
            : editorTheme === "light"
            ? "bg-slate-50/90 text-slate-800"
            : "bg-slate-50/80 dark:bg-slate-950/70 text-slate-800 dark:text-slate-200"
        }`}
      >
        <div className="flex min-w-full w-max">
          {/* Line Numbers Gutter (Sticky on left during horizontal scroll) */}
          <div
            className={`select-none text-right pr-4 font-mono text-xs border-r shrink-0 sticky left-0 z-10 ${
              editorTheme === "dark"
                ? "text-slate-500 border-slate-800 bg-[#18181b]"
                : editorTheme === "light"
                ? "text-slate-400 border-slate-200 bg-slate-50/90"
                : "text-slate-400 dark:text-slate-500 border-slate-200/80 dark:border-slate-800/80 bg-slate-50/90 dark:bg-slate-950/90"
            }`}
          >
            {lines.map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Code Content (Single scrollable container, no inner overflow) */}
          <pre className="pl-4 flex-1 font-mono text-xs leading-6 whitespace-pre">
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
    </div>
  );
};

export default CodeStudioViewport;
