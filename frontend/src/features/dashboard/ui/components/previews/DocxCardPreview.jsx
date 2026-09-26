import React, { useState, useEffect } from "react";
import { FileText } from "lucide-react";
import { extractDocumentText } from "../../../utils/documentTextExtractor.js";

// In-memory cache for document snippets
const docxSnippetCache = new Map();

/**
 * DocxCardPreview — Renders a realistic full-bleed document sheet preview
 * for Word documents (.docx, .doc, .odt, .rtf) in FileCard grid.
 * Fills 100% of the card area seamlessly like an authentic office document page.
 */
const DocxCardPreview = ({ file }) => {
  const fileName = file?.name || "document.docx";
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const fileId = file?.id || file?.file_id || fileName;
  const downloadUrl = file?.downloadUrl || file?.download_url;

  const [snippet, setSnippet] = useState(() => {
    return file?.previewSnippet || file?.summary?.executive || docxSnippetCache.get(fileId) || null;
  });

  useEffect(() => {
    if (snippet || !downloadUrl) return;

    let isMounted = true;
    extractDocumentText(downloadUrl, fileName)
      .then((text) => {
        if (!isMounted || !text) return;
        const cleaned = text.trim().slice(0, 160);
        if (cleaned) {
          docxSnippetCache.set(fileId, cleaned);
          setSnippet(cleaned);
        }
      })
      .catch(() => {
        // Fallback gracefully to stylized document skeleton lines
      });

    return () => {
      isMounted = false;
    };
  }, [downloadUrl, fileId, fileName, snippet]);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white text-slate-900 select-none flex flex-col justify-between p-3.5">
      {/* Top Header: Word Icon & Format Tag */}
      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-blue-600 font-sans">
          <FileText className="w-3 h-3 text-blue-600" />
          <span>Word Document</span>
        </div>
        <span className="text-[8px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
          DOCX
        </span>
      </div>

      {/* Document Body Area */}
      <div className="space-y-1 my-auto">
        {/* Document Title Heading */}
        <h4 className="text-[11px] font-bold text-slate-900 leading-snug line-clamp-1 font-sans tracking-tight capitalize">
          {title}
        </h4>

        {/* Real Extracted Excerpt or Document Paragraph Skeleton Lines */}
        {snippet ? (
          <p className="text-[8px] text-slate-600 leading-relaxed line-clamp-3 font-serif italic border-l-2 border-blue-500/60 pl-2 bg-slate-50/70 py-0.5 rounded-r">
            "{snippet}"
          </p>
        ) : (
          <div className="space-y-1.5 pt-0.5">
            <div className="w-full h-1 bg-slate-300/80 rounded-full" />
            <div className="w-[94%] h-1 bg-slate-300/70 rounded-full" />
            <div className="w-[86%] h-1 bg-slate-300/60 rounded-full" />
            <div className="w-[72%] h-1 bg-slate-300/50 rounded-full" />
          </div>
        )}
      </div>

      {/* Document Page Footer */}
      <div className="flex items-center justify-between text-[7px] text-slate-400 font-mono pt-1.5 border-t border-slate-100">
        <span>Page 1 of 1</span>
        <div className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500/40" />
          <span>Office Word</span>
        </div>
      </div>

      {/* Bottom subtle shadow vignette for smooth transition to card footer */}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-slate-900/10 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default DocxCardPreview;
