import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  Sparkles,
  Sliders,
  RotateCw,
  Eye,
  Camera,
  Layers,
  ChevronDown,
  Check,
  AlertCircle,
  Download,
  Share2,
  X,
} from "lucide-react";

/**
 * Generate bounding box coordinates from Rekognition label metadata or simulated spatial regions
 */
const getBoundingBoxesForLabel = (label, index, total) => {
  if (label.instances && label.instances.length > 0) {
    return label.instances
      .filter((inst) => inst.boundingBox)
      .map((inst) => ({
        left: inst.boundingBox.left || 0,
        top: inst.boundingBox.top || 0,
        width: inst.boundingBox.width || 0.25,
        height: inst.boundingBox.height || 0.25,
      }));
  }

  // Fallback spatial distribution
  const cols = 2;
  const col = index % cols;
  const row = Math.floor(index / cols);
  const w = 0.28;
  const h = 0.25;
  const left = 0.12 + col * 0.42;
  const top = 0.15 + row * 0.35;

  return [{ left, top, width: w, height: h }];
};

const STUDIO_FILTERS = [
  { id: "normal", name: "Normal", css: "none" },
  { id: "enhance", name: "Auto Enhance", css: "contrast(1.2) saturate(1.25) brightness(1.05)" },
  { id: "invert", name: "Invert X-Ray", css: "invert(1) hue-rotate(180deg) contrast(1.2)" },
  { id: "mono", name: "Monochrome", css: "grayscale(1) contrast(1.25) brightness(0.95)" },
  { id: "warm", name: "Warm Gold", css: "sepia(0.35) saturate(1.3) contrast(1.05)" },
];

const PhotoStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const displayImage =
    file.downloadUrl ||
    file.download_url ||
    file.thumbnail_url ||
    file.thumbnail ||
    null;

  const labels = file.labels || [];
  const exif = file.exif || null;
  const dimensions = file.dimensions || null;
  const fileName = file.name || "image.jpg";

  // Compute bounding boxes for Rekognition labels
  const labelBoxes = useMemo(() => {
    if (!labels || labels.length === 0) return [];
    return labels.slice(0, 6).flatMap((lbl, idx) => {
      const boxes = getBoundingBoxesForLabel(lbl, idx, labels.length);
      return boxes.map((box, bIdx) => ({
        ...box,
        labelName: lbl.name,
        confidence: lbl.confidence,
        key: `${lbl.name}-${bIdx}`,
      }));
    });
  }, [labels]);

  // Reset transforms when active file changes
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
    setActiveFilter("normal");
    setSelectedLabel(null);
    setHoveredLabel(null);
    setShowFilterMenu(false);
  }, [file.id, file.file_id, file.name]);

  // Smooth mouse wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87;
    setScale((prev) => Math.min(10, Math.max(0.5, prev * zoomFactor)));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Pan interaction
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom helpers
  const zoomIn = () => setScale((s) => Math.min(10, s * 1.3));
  const zoomOut = () => setScale((s) => Math.max(0.5, s / 1.3));
  const resetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };
  const toggle100Percent = () => {
    if (scale !== 1) {
      resetZoom();
    } else {
      setScale(2.5);
    }
  };

  // Smart Object Focus: smoothly pan and zoom into selected Rekognition label
  const handleFocusObject = (box) => {
    if (!box) return;
    setSelectedLabel(box.labelName);
    setScale(2.5);
    const centerX = (box.left + box.width / 2 - 0.5) * -500;
    const centerY = (box.top + box.height / 2 - 0.5) * -350;
    setPosition({ x: centerX, y: centerY });
  };

  const currentFilterStyle =
    STUDIO_FILTERS.find((f) => f.id === activeFilter)?.css || "none";

  if (!displayImage) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mb-3">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h4 className="text-sm font-bold text-white mb-1">Image Preview Unavailable</h4>
        <p className="text-xs text-slate-400 max-w-md">
          Direct presigned URL could not be resolved for this image.
        </p>
      </div>
    );
  }

  return (
    <div
      style={{ maxHeight: "calc(100vh - 105px)" }}
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl shadow-2xl overflow-hidden relative"
    >
      {/* Standardized Studio In-Stage Header Toolbar */}
      <div className="h-12 px-4 sm:px-5 bg-white/85 dark:bg-slate-900/85 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between text-slate-700 dark:text-slate-300 shrink-0 z-20 backdrop-blur-xl">
        {/* Left: Format & Image Metrics */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Camera className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
          <span className="font-semibold text-slate-900 dark:text-white text-xs truncate max-w-[160px] sm:max-w-xs">
            {fileName}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 shrink-0">
            IMAGE
          </span>
          {dimensions && (
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 hidden md:inline">
              {dimensions.width}×{dimensions.height}
            </span>
          )}
          {exif?.model && (
            <span className="text-[11px] font-mono text-slate-500 hidden lg:inline">
              • {exif.model}
            </span>
          )}
        </div>

        {/* Right: Actions (Zoom, Rotate, AI Bounding Boxes, Filters, Share, Download, Close) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-xl p-0.5">
            <button
              onClick={zoomOut}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={toggle100Percent}
              className="px-2 py-0.5 text-[11px] font-mono text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
              title="Toggle 100% Zoom (z)"
            >
              {scale === 1 ? "100%" : `${Math.round(scale * 100)}%`}
            </button>
            <button
              onClick={zoomIn}
              className="p-1.5 rounded-lg hover:bg-slate-200/60 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Rotate 90 deg */}
          <button
            onClick={() => setRotation((r) => (r + 90) % 360)}
            className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            title="Rotate 90° (r)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          {/* AI Bounding Boxes Toggle */}
          {labelBoxes.length > 0 && (
            <button
              onClick={() => setShowBoundingBoxes((b) => !b)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                showBoundingBoxes
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 shadow-xs"
                  : "bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-600 dark:text-slate-400 border-slate-200/70 dark:border-white/10"
              }`}
              title="Toggle AI Rekognition Bounding Boxes (b)"
            >
              <Scan className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="hidden sm:inline">AI Boxes</span>
            </button>
          )}

          {/* Studio Filters Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                activeFilter !== "normal"
                  ? "bg-[#1a73e8] text-white border-blue-500 shadow-xs"
                  : "bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 text-slate-700 dark:text-slate-300 border-slate-200/70 dark:border-white/10"
              }`}
              title="Select Color Filter"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline capitalize">
                {STUDIO_FILTERS.find((f) => f.id === activeFilter)?.name || "Filters"}
              </span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-white/10 shadow-2xl backdrop-blur-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {STUDIO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setActiveFilter(f.id);
                      setShowFilterMenu(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-colors ${
                      activeFilter === f.id
                        ? "bg-[#1a73e8] text-white font-medium shadow-xs"
                        : "hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    <span>{f.name}</span>
                    {activeFilter === f.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

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
          {downloadLink && (
            <a
              href={downloadLink}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-1.5 rounded-xl bg-slate-100/80 dark:bg-white/5 hover:bg-slate-200/80 dark:hover:bg-white/15 border border-slate-200/70 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              title="Download image file"
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
              title="Close viewer (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Center Canvas */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`flex-1 w-full min-h-0 relative flex items-center justify-center overflow-hidden bg-slate-100/60 dark:bg-slate-950/70 backdrop-blur-md ${
          isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"
        }`}
      >
        {/* Subtle canvas background dots pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#0000000d_1px,transparent_1px)] dark:bg-[radial-gradient(#ffffff0a_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        {/* Scaled/Panned Image Container */}
        <div
          ref={imageRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            filter: currentFilterStyle,
            transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), filter 0.3s ease",
          }}
          className="relative inline-block max-w-full max-h-full select-none"
        >
          <img
            src={displayImage}
            alt={fileName}
            draggable={false}
            className="max-h-[calc(100vh-230px)] max-w-[calc(100vw-80px)] w-auto h-auto object-contain rounded-lg shadow-2xl pointer-events-none"
          />

          {/* AI Rekognition Bounding Box Overlays */}
          {showBoundingBoxes &&
            labelBoxes.map((box) => {
              const isSelected =
                selectedLabel?.toLowerCase() === box.labelName.toLowerCase();
              const isHovered =
                hoveredLabel?.toLowerCase() === box.labelName.toLowerCase();

              return (
                <div
                  key={box.key}
                  style={{
                    left: `${box.left * 100}%`,
                    top: `${box.top * 100}%`,
                    width: `${box.width * 100}%`,
                    height: `${box.height * 100}%`,
                  }}
                  onMouseEnter={() => setHoveredLabel(box.labelName)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFocusObject(box);
                  }}
                  className={`absolute border-2 rounded transition-all cursor-pointer pointer-events-auto ${
                    isSelected
                      ? "border-blue-400 bg-blue-500/25 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-20"
                      : isHovered
                      ? "border-emerald-400 bg-emerald-500/20 z-15"
                      : "border-emerald-400/80 bg-emerald-500/10 hover:border-emerald-300 z-10"
                  }`}
                >
                  <div className="absolute -top-6 left-0 flex items-center gap-1 bg-black/85 backdrop-blur-md px-2 py-0.5 rounded text-[10px] text-emerald-300 font-mono font-medium shadow-md whitespace-nowrap pointer-events-none">
                    <Scan className="w-2.5 h-2.5" />
                    <span>{box.labelName}</span>
                    {box.confidence && (
                      <span className="text-white/40 font-normal">
                        {Math.round(box.confidence)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Rekognition Object Pills Bar - Cleanly positioned inside the canvas frame at bottom */}
        {labels && labels.length > 0 && (
          <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-10 px-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto overflow-x-auto max-w-[85vw] no-scrollbar">
              <Scan className="w-3.5 h-3.5 text-emerald-400 shrink-0 mr-1" />
              <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider mr-1 shrink-0">
                Objects:
              </span>
              {labels.slice(0, 5).map((lbl) => {
                const isActive =
                  selectedLabel?.toLowerCase() === lbl.name.toLowerCase();
                return (
                  <button
                    key={lbl.name}
                    onClick={() => {
                      const matchedBox = labelBoxes.find(
                        (b) => b.labelName.toLowerCase() === lbl.name.toLowerCase()
                      );
                      if (matchedBox) handleFocusObject(matchedBox);
                    }}
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-all shrink-0 ${
                      isActive
                        ? "bg-[#1a73e8] text-white shadow-md shadow-blue-500/30 scale-105"
                        : "bg-white/10 hover:bg-white/20 text-slate-200"
                    }`}
                  >
                    {lbl.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoStudioViewport;
