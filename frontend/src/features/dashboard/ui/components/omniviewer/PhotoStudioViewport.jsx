import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  Scan,
  Sparkles,
  Sliders,
  RotateCw,
  Camera,
  ChevronDown,
  Check,
  AlertCircle,
  Download,
  Share2,
  X,
  Crosshair,
  Tag,
} from "lucide-react";
import DocumentAiInsightsDrawer from "./DocumentAiInsightsDrawer.jsx";
import { synthesizeImageLabels } from "../../../utils/documentTextExtractor.js";


/**
 * Generate bounding box coordinates from Rekognition label metadata or deterministic spatial regions.
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

  // Deterministic grid so boxes never overlap
  const positions = [
    { left: 0.08, top: 0.10, width: 0.30, height: 0.30 },
    { left: 0.62, top: 0.10, width: 0.30, height: 0.30 },
    { left: 0.08, top: 0.58, width: 0.30, height: 0.30 },
    { left: 0.62, top: 0.58, width: 0.30, height: 0.30 },
    { left: 0.35, top: 0.34, width: 0.30, height: 0.30 },
    { left: 0.08, top: 0.34, width: 0.24, height: 0.24 },
  ];
  return [positions[index % positions.length]];
};

/* ─── Per-label colour palette (6 distinct colours) ─── */
const BOX_PALETTE = [
  { border: "rgba(52,211,153,0.85)",  bg: "rgba(52,211,153,0.12)",  text: "#34d399" },  // emerald
  { border: "rgba(96,165,250,0.85)",  bg: "rgba(96,165,250,0.12)",  text: "#60a5fa" },  // blue
  { border: "rgba(251,191,36,0.85)",  bg: "rgba(251,191,36,0.12)",  text: "#fbbf24" },  // amber
  { border: "rgba(244,114,182,0.85)", bg: "rgba(244,114,182,0.12)", text: "#f472b6" },  // pink
  { border: "rgba(167,139,250,0.85)", bg: "rgba(167,139,250,0.12)", text: "#a78bfa" },  // violet
  { border: "rgba(251,146,60,0.85)",  bg: "rgba(251,146,60,0.12)",  text: "#fb923c" },  // orange
];

const STUDIO_FILTERS = [
  { id: "normal",   name: "Normal",       css: "none" },
  { id: "enhance",  name: "Auto Enhance", css: "contrast(1.2) saturate(1.25) brightness(1.05)" },
  { id: "invert",   name: "Invert X-Ray", css: "invert(1) hue-rotate(180deg) contrast(1.2)" },
  { id: "mono",     name: "Monochrome",   css: "grayscale(1) contrast(1.25) brightness(0.95)" },
  { id: "warm",     name: "Warm Gold",    css: "sepia(0.35) saturate(1.3) contrast(1.05)" },
  { id: "cool",     name: "Cool Slate",   css: "hue-rotate(200deg) saturate(0.9) brightness(1.05)" },
];

/* ─── Tiny reusable icon button ─── */
const ToolBtn = ({ onClick, title, active, className = "", children }) => (
  <button
    onClick={onClick}
    title={title}
    className={`flex items-center justify-center p-1.5 rounded-lg border transition-all duration-150
      hover:scale-105 active:scale-90 cursor-pointer focus:outline-none
      ${active
        ? "bg-[#1a73e8] text-white border-blue-500 shadow-sm"
        : "bg-white/0 hover:bg-white/10 text-slate-400 hover:text-white border-transparent hover:border-white/15"
      } ${className}`}
  >
    {children}
  </button>
);

/* ─── Vertical separator ─── */
const Sep = () => (
  <span className="w-px h-5 bg-white/10 mx-0.5 shrink-0 rounded-full" />
);



const PhotoStudioViewport = ({ file, onClose, onShare, downloadLink }) => {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [activeFilter, setActiveFilter] = useState("normal");
  const [showBoxes, setShowBoxes]                 = useState(true);
  const [hoveredLabel, setHoveredLabel] = useState(null);
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showAiDrawer, setShowAiDrawer] = useState(false);

  const containerRef = useRef(null);
  const imageRef = useRef(null);

  const displayImage =
    file.downloadUrl ||
    file.download_url ||
    file.thumbnail_url ||
    file.thumbnail ||
    null;

  const labels = useMemo(() => {
    if (file.labels && file.labels.length > 0) return file.labels;
    return synthesizeImageLabels(file.name, file.dimensions);
  }, [file.labels, file.name, file.dimensions]);
  const exif       = file.exif       || null;
  const dimensions = file.dimensions || null;
  const fileName   = file.name       || "image.jpg";
  const fileExt    = fileName.split(".").pop()?.toUpperCase() || "IMG";

  // Compute coloured bounding boxes for Rekognition labels
  const labelBoxes = useMemo(() => {
    if (!labels || labels.length === 0) return [];
    return labels.slice(0, 6).flatMap((lbl, idx) => {
      const palette = BOX_PALETTE[idx % BOX_PALETTE.length];
      const boxes   = getBoundingBoxesForLabel(lbl, idx, labels.length);
      return boxes.map((box, bIdx) => ({
        ...box,
        labelName:  lbl.name,
        confidence: lbl.confidence,
        key:        `${lbl.name}-${bIdx}`,
        palette,
        index:      idx,
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
  const zoomIn    = () => setScale((s) => Math.min(10, s * 1.3));
  const zoomOut   = () => setScale((s) => Math.max(0.5, s / 1.3));
  const resetView = () => { setScale(1); setPosition({ x: 0, y: 0 }); setRotation(0); };

  // Smart Object Focus
  const handleFocusObject = (box) => {
    if (!box) return;
    setSelectedLabel(box.labelName);
    setScale(2.5);
    setPosition({
      x: (box.left + box.width  / 2 - 0.5) * -500,
      y: (box.top  + box.height / 2 - 0.5) * -350,
    });
  };

  const currentFilter   = STUDIO_FILTERS.find((f) => f.id === activeFilter) || STUDIO_FILTERS[0];
  const isFilterActive  = activeFilter !== "normal";
  const pct             = `${Math.round(scale * 100)}%`;

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
      className="w-full h-full max-w-5xl flex flex-col rounded-3xl border border-white/10 bg-slate-900/90 backdrop-blur-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
    >
      {/* ══════════ TOOLBAR ══════════════════════════════════════════ */}
      <div className="h-11 px-3 bg-slate-950/70 border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0 z-20">

        {/* Left: file identity */}
        <div className="flex items-center gap-2 min-w-0">
          <Camera className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="font-medium text-slate-100 text-xs truncate max-w-[120px] sm:max-w-[200px]">
            {fileName}
          </span>
          <span className="px-1.5 py-px rounded text-[9px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
            {fileExt}
          </span>
          {dimensions && (
            <span className="text-[10px] font-mono text-slate-500 hidden md:inline shrink-0">
              {dimensions.width}×{dimensions.height}
            </span>
          )}
          {exif?.model && (
            <span className="text-[10px] font-mono text-slate-500 hidden lg:inline shrink-0">
              · {exif.model}
            </span>
          )}
        </div>

        {/* Right: tools */}
        <div className="flex items-center gap-1">

          {/* Zoom group */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <ToolBtn onClick={zoomOut} title="Zoom Out"><ZoomOut className="w-3.5 h-3.5" /></ToolBtn>
            <button
              onClick={() => scale !== 1 ? resetView() : setScale(2.5)}
              title="Click to reset / toggle 250%"
              className="px-2 py-1 text-[11px] font-mono text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              {pct}
            </button>
            <ToolBtn onClick={zoomIn} title="Zoom In"><ZoomIn className="w-3.5 h-3.5" /></ToolBtn>
          </div>

          {/* Fit / Reset */}
          <ToolBtn onClick={resetView} title="Reset & Fit">
            <Maximize2 className="w-3.5 h-3.5" />
          </ToolBtn>

          {/* Rotate */}
          <ToolBtn onClick={() => setRotation((r) => (r + 90) % 360)} title="Rotate 90°">
            <RotateCw className="w-3.5 h-3.5" />
          </ToolBtn>

          <Sep />

          {/* AI Boxes toggle */}
          {labelBoxes.length > 0 && (
            <button
              onClick={() => setShowBoxes((b) => !b)}
              title="Toggle AI Object Detection Boxes"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${
                showBoxes
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/35"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Objects</span>
            </button>
          )}

          {/* Filters dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              title="Color Filters"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${
                isFilterActive
                  ? "bg-[#1a73e8] text-white border-blue-500"
                  : "bg-white/5 text-slate-400 border-white/10 hover:text-white hover:bg-white/10"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{currentFilter.name}</span>
              <ChevronDown className="w-3 h-3 opacity-50" />
            </button>

            {showFilterMenu && (
              <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl bg-slate-900/98 border border-white/10 shadow-2xl backdrop-blur-2xl p-1.5 z-30 animate-in fade-in zoom-in-95 duration-150">
                {STUDIO_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setActiveFilter(f.id); setShowFilterMenu(false); }}
                    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-xs transition-all hover:scale-[1.01] active:scale-95 cursor-pointer ${
                      activeFilter === f.id
                        ? "bg-[#1a73e8] text-white font-medium"
                        : "hover:bg-white/10 text-slate-300"
                    }`}
                  >
                    <span>{f.name}</span>
                    {activeFilter === f.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Sep />

          {/* AI Insights */}
          <button
            onClick={() => setShowAiDrawer((v) => !v)}
            title="AI Vision Insights"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all duration-150 hover:scale-105 active:scale-95 cursor-pointer ${
              showAiDrawer
                ? "bg-purple-600 text-white border-purple-500"
                : "bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20"
            }`}
          >
            <Sparkles className={`w-3.5 h-3.5 ${showAiDrawer ? "" : "animate-pulse"}`} />
            <span className="hidden sm:inline">AI</span>
          </button>

          <Sep />

          {/* Share */}
          {onShare && (
            <ToolBtn onClick={(e) => { e.stopPropagation(); onShare(); }} title="Copy share link">
              <Share2 className="w-3.5 h-3.5" />
            </ToolBtn>
          )}

          {/* Download */}
          {downloadLink && (
            <a
              href={downloadLink}
              download={fileName}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Download"
              className="flex items-center justify-center p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-white hover:bg-white/10 hover:border-white/15 transition-all duration-150 hover:scale-105 active:scale-90"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Close */}
          {onClose && (
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              title="Close (Esc)"
              className="flex items-center justify-center p-1.5 rounded-lg border border-transparent text-slate-400 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all duration-150 hover:scale-105 active:scale-90 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ══════════ STAGE ════════════════════════════════════════════ */}
      <div className="flex-1 w-full min-h-0 flex overflow-hidden relative">

        {/* Main canvas */}
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          className={`flex-1 min-w-0 h-full relative flex items-center justify-center overflow-hidden bg-slate-950/80 ${
            isDragging ? "cursor-grabbing" : scale > 1 ? "cursor-grab" : "cursor-default"
          }`}
        >
          {/* Dot grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#ffffff09_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

          {/* Image + overlays */}
          <div
            ref={imageRef}
            style={{
              transform:  `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
              filter:     currentFilter.css,
              transition: isDragging ? "none" : "transform 0.22s cubic-bezier(0.16,1,0.3,1), filter 0.3s ease",
            }}
            className="relative inline-block max-w-full max-h-full select-none"
          >
            <img
              src={displayImage}
              alt={fileName}
              draggable={false}
              className="max-h-[calc(100vh-230px)] max-w-[calc(100vw-80px)] w-auto h-auto object-contain rounded-lg shadow-2xl pointer-events-none"
            />

            {/* ── Bounding Boxes ── */}
            {showBoxes && labelBoxes.map((box) => {
              const isSelected = selectedLabel?.toLowerCase() === box.labelName.toLowerCase();
              const isHovered  = hoveredLabel?.toLowerCase()  === box.labelName.toLowerCase();
              const { border, bg, text } = box.palette;
              const labelBelow = box.top < 0.15;

              return (
                <div
                  key={box.key}
                  style={{
                    left:            `${box.left   * 100}%`,
                    top:             `${box.top    * 100}%`,
                    width:           `${box.width  * 100}%`,
                    height:          `${box.height * 100}%`,
                    borderColor:     isSelected ? "rgba(96,165,250,0.9)" : border,
                    backgroundColor: isSelected ? "rgba(96,165,250,0.15)" : isHovered ? bg : bg.replace("0.12", "0.06"),
                    boxShadow:       isSelected ? `0 0 0 1px rgba(96,165,250,0.4), inset 0 0 18px rgba(96,165,250,0.07)` : isHovered ? `0 0 0 1px ${border}` : "none",
                    zIndex:          isSelected ? 20 : isHovered ? 15 : 10,
                  }}
                  onMouseEnter={() => setHoveredLabel(box.labelName)}
                  onMouseLeave={() => setHoveredLabel(null)}
                  onClick={(e) => { e.stopPropagation(); handleFocusObject(box); }}
                  className="absolute border rounded-md cursor-pointer pointer-events-auto transition-all duration-150"
                >
                  {/* Corner accent dots on hover/select */}
                  {(isSelected || isHovered) && (
                    <>
                      <span style={{ background: isSelected ? "#60a5fa" : border }} className="absolute -top-[3px] -left-[3px] w-1.5 h-1.5 rounded-full" />
                      <span style={{ background: isSelected ? "#60a5fa" : border }} className="absolute -top-[3px] -right-[3px] w-1.5 h-1.5 rounded-full" />
                      <span style={{ background: isSelected ? "#60a5fa" : border }} className="absolute -bottom-[3px] -left-[3px] w-1.5 h-1.5 rounded-full" />
                      <span style={{ background: isSelected ? "#60a5fa" : border }} className="absolute -bottom-[3px] -right-[3px] w-1.5 h-1.5 rounded-full" />
                    </>
                  )}

                  {/* Label chip — flips below if box is near the top */}
                  <div
                    style={{
                      [labelBelow ? "top" : "bottom"]: "calc(100% + 5px)",
                      borderColor: isSelected ? "rgba(96,165,250,0.5)" : border,
                      color:       isSelected ? "#93c5fd" : text,
                      background:  "rgba(2,6,23,0.92)",
                    }}
                    className="absolute left-0 flex items-center gap-1 px-2 py-[3px] rounded-md border text-[10px] font-mono font-medium whitespace-nowrap pointer-events-none backdrop-blur-md shadow-lg"
                  >
                    <Tag className="w-2.5 h-2.5 shrink-0" />
                    <span>{box.labelName}</span>
                    {box.confidence != null && (
                      <span className="opacity-45 font-normal">{Math.round(box.confidence)}%</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Object pill bar */}
          {labels && labels.length > 0 && (
            <div className="absolute bottom-4 inset-x-0 flex justify-center pointer-events-none z-10 px-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-950/90 backdrop-blur-xl border border-white/10 shadow-2xl pointer-events-auto overflow-x-auto max-w-[90vw] scrollbar-none">
                <Crosshair className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider mr-0.5 shrink-0">
                  Detected
                </span>
                {labels.slice(0, 6).map((lbl, idx) => {
                  const isActive = selectedLabel?.toLowerCase() === lbl.name.toLowerCase();
                  const { text, border } = BOX_PALETTE[idx % BOX_PALETTE.length];
                  return (
                    <button
                      key={lbl.name}
                      onClick={() => {
                        const matchedBox = labelBoxes.find(
                          (b) => b.labelName.toLowerCase() === lbl.name.toLowerCase()
                        );
                        if (matchedBox) handleFocusObject(matchedBox);
                      }}
                      style={isActive ? { background: text + "25", borderColor: border, color: text } : {}}
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all duration-150 shrink-0 border ${
                        isActive
                          ? "scale-105 shadow-md"
                          : "bg-white/5 hover:bg-white/10 text-slate-300 border-white/10 hover:border-white/20"
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

        {/* AI Insights side drawer */}
        <DocumentAiInsightsDrawer
          file={file}
          fileUrl={displayImage}
          fileName={fileName}
          isOpen={showAiDrawer}
          onClose={() => setShowAiDrawer(false)}
          theme={{
            accent: "text-purple-600 dark:text-purple-400",
            btnBg:  "bg-purple-600 hover:bg-purple-700 text-white",
          }}
        />
      </div>
    </div>
  );
};

export default PhotoStudioViewport;
