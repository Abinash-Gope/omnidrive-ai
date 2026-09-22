import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";

// Point PDF.js to its bundled worker — must match installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * PdfPreview — Renders a specific page of a PDF as an HTML5 canvas.
 *
 * Props:
 *  url          {string}   Presigned S3 URL or any accessible PDF URL
 *  pageNumber   {number}   1-indexed page to render (default: 1)
 *  scale        {number}   Render scale factor (default: 1.5)
 *  className    {string}   Extra className for the wrapper div
 *  onPageCount  {function} Callback(totalPages) fired after PDF loads
 *  onError      {function} Callback(err) fired on render failure
 */
const PdfPreview = ({
  url,
  pageNumber = 1,
  scale = 1.5,
  className = "",
  onPageCount,
  onError,
}) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let pdfDoc = null;

    const renderPage = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({
          url,
          // Required for cross-origin presigned S3 URLs
          withCredentials: false,
        });

        pdfDoc = await loadingTask.promise;

        if (cancelled) return;

        if (onPageCount) onPageCount(pdfDoc.numPages);

        const clampedPage = Math.min(Math.max(pageNumber, 1), pdfDoc.numPages);
        const page = await pdfDoc.getPage(clampedPage);

        if (cancelled) return;

        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({ canvasContext: ctx, viewport }).promise;

        if (!cancelled) setIsLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to render PDF");
          setIsLoading(false);
          if (onError) onError(err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (pdfDoc) pdfDoc.destroy();
    };
  }, [url, pageNumber, scale]);

  return (
    <div className={`relative flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}>
      {/* Loading shimmer */}
      {isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 animate-pulse">
          <div className="w-8 h-10 rounded bg-slate-300 dark:bg-slate-700" />
          <div className="space-y-1.5 w-2/3">
            <div className="h-2 rounded bg-slate-300 dark:bg-slate-700" />
            <div className="h-2 rounded bg-slate-300 dark:bg-slate-700 w-4/5" />
            <div className="h-2 rounded bg-slate-300 dark:bg-slate-700 w-3/5" />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-4 text-center">
          <span className="text-2xl mb-1">📄</span>
          <span>Preview unavailable</span>
        </div>
      )}

      {/* The actual rendered canvas */}
      <canvas
        ref={canvasRef}
        className={`max-w-full transition-opacity duration-300 ${isLoading || error ? "opacity-0" : "opacity-100"}`}
        style={{ display: "block" }}
      />
    </div>
  );
};

export default PdfPreview;
