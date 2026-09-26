import React, { useState, useEffect } from "react";
import { Presentation, Sparkles } from "lucide-react";
import { findThumbnail, saveThumbnail } from "../../../utils/thumbnailCache.jsx";

/**
 * Fast binary extraction for OpenXML docProps/thumbnail.jpeg inside PPTX
 */
async function extractPptxThumbnailBinary(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-1000000" } }); // Fetch initial chunk
    const arrayBuffer = await res.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    const totalLength = bytes.length;

    // Scan for JPEG SOI marker (0xFFD8FFE0 or 0xFFD8FFE1)
    for (let i = 0; i < totalLength - 4; i++) {
      if (bytes[i] === 0xff && bytes[i + 1] === 0xd8 && bytes[i + 2] === 0xff) {
        // Find JPEG EOI marker (0xFFD9)
        for (let j = i + 100; j < totalLength - 2; j++) {
          if (bytes[j] === 0xff && bytes[j + 1] === 0xd9) {
            const jpegBytes = bytes.subarray(i, j + 2);
            const blob = new Blob([jpegBytes], { type: "image/jpeg" });
            return URL.createObjectURL(blob);
          }
        }
      }
    }
  } catch (e) {
    // Non-blocking fallback
  }
  return null;
}

/**
 * PptxCardPreview — Renders PowerPoint presentation slide preview
 */
const PptxCardPreview = ({ file }) => {
  const fileName = file?.name || "presentation.pptx";
  const title = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
  const fileId = file?.id || file?.file_id;
  const downloadUrl = file?.downloadUrl || file?.download_url;

  const [thumbSrc, setThumbSrc] = useState(() => {
    return findThumbnail(fileId, file?.s3Key, fileName);
  });

  useEffect(() => {
    if (thumbSrc || !downloadUrl) return;

    let isMounted = true;
    extractPptxThumbnailBinary(downloadUrl).then((url) => {
      if (isMounted && url) {
        setThumbSrc(url);
        saveThumbnail([fileId, fileName], url);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [downloadUrl, fileId, fileName, thumbSrc]);

  if (thumbSrc) {
    return (
      <div className="w-full h-full relative overflow-hidden bg-slate-900 group-hover:scale-105 transition-transform duration-500">
        <img
          src={thumbSrc}
          alt={fileName}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
      </div>
    );
  }

  // Executive 16:9 Presentation Slide Layout Fallback
  return (
    <div className="w-full h-full relative overflow-hidden bg-gradient-to-br from-orange-950 via-slate-900 to-amber-950/80 select-none p-3.5 flex flex-col justify-between border border-orange-500/20">
      {/* Top Header: Slide Icon & Format Tag */}
      <div className="flex items-center justify-between pb-1.5 border-b border-orange-500/20">
        <div className="flex items-center gap-1.5 text-[9px] font-semibold text-orange-300 font-sans">
          <Presentation className="w-3 h-3 text-orange-400" />
          <span>Presentation</span>
        </div>
        <span className="text-[8px] font-mono text-orange-300 bg-orange-500/20 px-1.5 py-0.2 rounded border border-orange-500/30">
          16:9 SLIDE
        </span>
      </div>

      {/* Slide Content Mockup */}
      <div className="space-y-1.5 my-auto">
        <h4 className="text-[11px] font-bold text-white capitalize leading-tight line-clamp-2 font-sans tracking-wide">
          {title}
        </h4>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <div className="w-3/4 h-1 bg-white/20 rounded-full" />
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
          <div className="w-1/2 h-1 bg-white/20 rounded-full" />
        </div>
      </div>

      {/* Slide Deck Footer */}
      <div className="flex items-center justify-between text-[7px] text-orange-200/60 font-mono pt-1 border-t border-white/10">
        <span>OmniDrive Presentation</span>
        <span>16:9 HD</span>
      </div>

      {/* Vignette Depth */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
    </div>
  );
};

export default PptxCardPreview;
