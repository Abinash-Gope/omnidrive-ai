import React, { useEffect, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileText, AlertCircle } from "lucide-react";

// Point PDF.js to its bundled worker — must match installed version
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * PdfPreview — Renders a specific page of a PDF as an HTML5 canvas
 * with high-fidelity realistic document loading skeleton and zero layout shifts.
 */
const PdfPreview = ({
  url,
  pageNumber = 1,
  scale = 1.0,
  className = "",
  fitParent = false,
  objectFit = "cover",
  objectPosition = "top",
  onPageCount,
  onError,
  onLoadingChange,
}) => {
  const canvasRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dimensions, setDimensions] = useState({
    width: Math.round(595 * scale),
    height: Math.round(842 * scale),
  });

  useEffect(() => {
    if (!url) return;

    let cancelled = false;
    let pdfDoc = null;
    let renderTask = null;

    const renderPage = async () => {
      setIsLoading(true);
      if (onLoadingChange) onLoadingChange(true);
      setError(null);

      try {
        const loadingTask = pdfjsLib.getDocument({
          url,
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

        setDimensions({
          width: Math.round(viewport.width),
          height: Math.round(viewport.height),
        });

        const ctx = canvas.getContext("2d");
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        renderTask = page.render({ canvasContext: ctx, viewport });
        await renderTask.promise;

        if (!cancelled) {
          setIsLoading(false);
          if (onLoadingChange) onLoadingChange(false);
        }
      } catch (err) {
        if (err?.name === "RenderingCancelledException") return;
        if (!cancelled) {
          setError(err.message || "Failed to render PDF page");
          setIsLoading(false);
          if (onLoadingChange) onLoadingChange(false);
          if (onError) onError(err);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch {}
      }
      if (pdfDoc) {
        try {
          pdfDoc.destroy();
        } catch {}
      }
    };
  }, [url, pageNumber, scale]);

  const targetWidth = fitParent ? "100%" : `${dimensions.width}px`;
  const targetHeight = fitParent ? "100%" : `${dimensions.height}px`;

  return (
    <div
      style={{
        width: fitParent ? "100%" : targetWidth,
        height: fitParent ? "100%" : targetHeight,
        minWidth: fitParent ? undefined : `${dimensions.width}px`,
        minHeight: fitParent ? undefined : `${dimensions.height}px`,
      }}
      className={`relative flex ${
        fitParent ? "items-start justify-center" : "items-center justify-center"
      } bg-white dark:bg-slate-900 transition-all duration-150 overflow-hidden ${className}`}
    >
      {/* High-Fidelity Realistic Document Skeleton — Clean, normal document layout with no loading icon */}
      {isLoading && (
        <div
          className={`absolute inset-0 flex flex-col justify-start ${
            fitParent ? "p-3 sm:p-4" : "p-6 sm:p-10"
          } bg-white dark:bg-slate-900 z-10 select-none overflow-hidden animate-pulse`}
        >
          {/* Document Header Skeleton */}
          <div className="space-y-3.5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-800 shrink-0" />
                <div className="space-y-1">
                  <div className="h-3.5 w-36 rounded-md bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2 w-20 rounded-md bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
              <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-slate-800/80" />
            </div>

            {/* Simulated Section Title */}
            <div className="pt-1 space-y-1.5">
              <div className="h-4 w-48 rounded-md bg-slate-200 dark:bg-slate-800" />
              <div className="h-2.5 w-64 rounded-md bg-slate-100 dark:bg-slate-800/60" />
            </div>

            {/* Paragraph Text Lines */}
            <div className="space-y-2 pt-1">
              <div className="h-2.5 w-full rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-2.5 w-[92%] rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-2.5 w-[96%] rounded bg-slate-100 dark:bg-slate-800/70" />
              <div className="h-2.5 w-[76%] rounded bg-slate-100 dark:bg-slate-800/70" />
            </div>

            {/* Two Column Simulated Subsection Card (rendered when not constrained by small card preview) */}
            {!fitParent && (
              <>
                <div className="grid grid-cols-2 gap-3 pt-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="h-3 w-20 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
                    <div className="h-2 w-3/4 rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="h-3 w-24 rounded bg-slate-200 dark:bg-slate-800" />
                    <div className="h-2 w-full rounded bg-slate-100 dark:bg-slate-800/60" />
                    <div className="h-2 w-2/3 rounded bg-slate-100 dark:bg-slate-800/60" />
                  </div>
                </div>

                {/* Bullet Point List */}
                <div className="space-y-2 pt-2">
                  {[0.9, 0.85, 0.7].map((w, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0" />
                      <div
                        style={{ width: `${w * 100}%` }}
                        className="h-2 rounded bg-slate-100 dark:bg-slate-800/70"
                      />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-2">
            <AlertCircle className="w-5 h-5" />
          </div>
          <span className="font-semibold text-white mb-0.5">Page Rendering Error</span>
          <span className="text-slate-400 text-[11px] max-w-xs">{error}</span>
        </div>
      )}

      {/* HTML5 Canvas Rendering Target — Starts from top */}
      <canvas
        ref={canvasRef}
        className={`transition-opacity duration-200 ${
          isLoading || error ? "opacity-0" : "opacity-100"
        } ${fitParent ? "w-full h-full" : ""}`}
        style={{
          display: "block",
          width: fitParent ? "100%" : `${dimensions.width}px`,
          height: fitParent ? "100%" : `${dimensions.height}px`,
          objectFit: fitParent ? objectFit : undefined,
          objectPosition: fitParent ? (objectPosition || "top center") : undefined,
        }}
      />
    </div>
  );
};

export default PdfPreview;
