import React, { useState, useEffect } from "react";
import axios from "axios";
import { FileCode } from "lucide-react";

// In-memory cache for code snippet text
const codeSnippetCache = new Map();

/**
 * Lightweight syntax colorizer for card previews
 */
const renderPreviewCodeLine = (line, ext) => {
  if (!line || line.trim() === "") return <span>&nbsp;</span>;

  // Comments
  if (/^\s*(<!--|\/\/|#|\/\*)/.test(line)) {
    return <span className="text-slate-500 italic">{line}</span>;
  }

  // Tokenize
  const parts = line.split(/(\s+|[(){}[\].,;:=+\-*/&|!<>?`"'])/);
  return (
    <span>
      {parts.map((p, i) => {
        if (!p) return null;
        if (/^(".*?"|'.*?'|`.*?`)$/.test(p)) {
          return <span key={i} className="text-emerald-400">{p}</span>;
        }
        if (/\b(const|let|var|function|return|if|else|import|from|export|class|def|async|await)\b/.test(p)) {
          return <span key={i} className="text-purple-400 font-semibold">{p}</span>;
        }
        if (/^(<[\w:-]+|<\/|<!DOCTYPE|\/?>|>|<)$/i.test(p)) {
          return <span key={i} className="text-blue-400 font-semibold">{p}</span>;
        }
        if (/^(html|body|head|meta|title|style|div|span|h1|h2|p|a|button)$/i.test(p)) {
          return <span key={i} className="text-cyan-300 font-medium">{p}</span>;
        }
        if (/^\b\d+(px|rem|%|ms)?\b/.test(p)) {
          return <span key={i} className="text-amber-400">{p}</span>;
        }
        return <span key={i} className="text-slate-300">{p}</span>;
      })}
    </span>
  );
};

/**
 * CodeCardPreview — Renders miniature IDE code snapshot card
 */
const CodeCardPreview = ({ file }) => {
  const fileName = file?.name || "code.js";
  const ext = fileName.split(".").pop().toLowerCase();
  const fileId = file?.id || file?.file_id || fileName;
  const downloadUrl = file?.downloadUrl || file?.download_url;

  const [lines, setLines] = useState(() => {
    return codeSnippetCache.get(fileId) || null;
  });

  useEffect(() => {
    if (lines || !downloadUrl) return;

    let isMounted = true;
    axios
      .get(downloadUrl, {
        headers: { Range: "bytes=0-1000" },
        responseType: "text",
      })
      .then((res) => {
        if (!isMounted) return;
        const text = typeof res.data === "string" ? res.data : String(res.data);
        const splitLines = text.split(/\r?\n/).slice(0, 5);
        codeSnippetCache.set(fileId, splitLines);
        setLines(splitLines);
      })
      .catch(() => {
        // Fallback default code lines
        setLines([
          `<!DOCTYPE html>`,
          `<html lang="en">`,
          `<head>`,
          `  <title>${fileName}</title>`,
          `</head>`,
        ]);
      });

    return () => {
      isMounted = false;
    };
  }, [downloadUrl, fileId, fileName, lines]);

  const displayLines = lines || [
    `// ${fileName}`,
    `import React from "react";`,
    `export default function App() {`,
    `  return <div>Loaded</div>;`,
    `}`,
  ];

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#13171f] border border-cyan-500/20 select-none p-3 flex flex-col justify-between font-mono">
      {/* IDE Top Window Bar */}
      <div className="flex items-center justify-between pb-1.5 border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-rose-500/80" />
          <span className="w-2 h-2 rounded-full bg-amber-500/80" />
          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
        </div>
        <span className="text-[7px] font-bold text-cyan-400 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20 uppercase tracking-wider">
          {ext.toUpperCase()}
        </span>
      </div>

      {/* Code Text with Line Numbers */}
      <div className="my-auto space-y-0.5 text-[7px] leading-tight overflow-hidden">
        {displayLines.map((line, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="w-3 text-right text-slate-600 select-none shrink-0 font-mono">
              {idx + 1}
            </span>
            <div className="truncate flex-1 font-mono">
              {renderPreviewCodeLine(line, ext)}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[7px] text-slate-500 pt-1 border-t border-white/5">
        <div className="flex items-center gap-1">
          <FileCode className="w-2.5 h-2.5 text-cyan-400" />
          <span className="truncate max-w-[120px]">{fileName}</span>
        </div>
        <span>UTF-8</span>
      </div>

      {/* Vignette Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default CodeCardPreview;
