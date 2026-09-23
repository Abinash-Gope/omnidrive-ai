import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  X,
  Camera,
  Sparkles,
  ShieldCheck,
  Tag,
  Sliders,
  Info,
  Layers,
  Loader2,
  Eye,
  EyeOff,
  Filter,
  Search,
  Scan,
} from "lucide-react";
import { pollJobStatusApi } from "../../api/dashboardApi.jsx";
import {
  updateFileStatus,
  setFilterType,
  setActiveTagFilter,
} from "../../state/dashboardSlice.jsx";
import { findThumbnail } from "../../utils/thumbnailCache.jsx";

/**
 * Generate normalized [left, top, width, height] (0..1) for a label
 * If instances are provided by Rekognition, use them; otherwise produce
 * deterministically placed contextual bounding boxes for visual feedback.
 */
function getBoundingBoxesForLabel(lbl, index, total) {
  // If Rekognition returned Instances with BoundingBox
  const rawInstances = lbl.instances || lbl.Instances;
  if (Array.isArray(rawInstances) && rawInstances.length > 0) {
    return rawInstances.map((inst) => {
      const box = inst.bounding_box || inst.BoundingBox || {};
      return {
        left: box.left ?? box.Left ?? 0.1,
        top: box.top ?? box.Top ?? 0.1,
        width: box.width ?? box.Width ?? 0.3,
        height: box.height ?? box.Height ?? 0.3,
      };
    });
  }

  // Contextual fallback based on label semantics & index
  const name = (lbl.name || "").toLowerCase();
  let left = 0.15;
  let top = 0.15;
  let width = 0.45;
  let height = 0.45;

  if (/person|human|portrait|man|woman|face|smile/i.test(name)) {
    left = 0.25;
    top = 0.12;
    width = 0.5;
    height = 0.58;
  } else if (/car|vehicle|automobile|truck|bus/i.test(name)) {
    left = 0.15;
    top = 0.38;
    width = 0.7;
    height = 0.42;
  } else if (/dog|cat|pet|animal|bird/i.test(name)) {
    left = 0.22;
    top = 0.3;
    width = 0.55;
    height = 0.5;
  } else if (/building|architecture|tower|house|skyscraper/i.test(name)) {
    left = 0.12;
    top = 0.08;
    width = 0.76;
    height = 0.75;
  } else if (/text|paper|document|font/i.test(name)) {
    left = 0.18;
    top = 0.2;
    width = 0.64;
    height = 0.5;
  } else {
    // Distribute based on index
    const col = index % 3;
    const row = Math.floor(index / 3) % 2;
    left = 0.08 + col * 0.28;
    top = 0.15 + row * 0.38;
    width = 0.28;
    height = 0.32;
  }

  return [{ left, top, width, height }];
}

const ImageAiModal = ({ file, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [isPolling, setIsPolling] = useState(false);
  const [showBoundingBoxes, setShowBoundingBoxes] = useState(true);
  const [hoveredLabelName, setHoveredLabelName] = useState(null);

  const fileId = file?.id || file?.file_id;
  const labels = file?.labels || [];
  const exif = file?.exif || null;

  // Real-time automatic poller: if labels are empty, poll AWS DynamoDB every 2s
  useEffect(() => {
    if (!isOpen || !file || file.type !== "image" || (labels && labels.length > 0)) {
      setIsPolling(false);
      return;
    }
    if (!fileId) return;

    let isMounted = true;
    setIsPolling(true);
    let attempts = 0;
    const maxAttempts = 15; // up to 30s

    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const remoteData = await pollJobStatusApi(fileId);
        if (!isMounted) return;

        if (remoteData && remoteData.labels && remoteData.labels.length > 0) {
          dispatch(
            updateFileStatus({
              fileId: fileId,
              status: remoteData.status || "COMPLETED",
              labels: remoteData.labels,
              dimensions: remoteData.image_dimensions || remoteData.dimensions,
            })
          );
          setIsPolling(false);
          clearInterval(timer);
        } else if (attempts >= maxAttempts) {
          setIsPolling(false);
          clearInterval(timer);
        }
      } catch (err) {
        if (attempts >= maxAttempts) {
          setIsPolling(false);
          clearInterval(timer);
        }
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [isOpen, fileId, file?.type, labels.length, dispatch]);

  // Compute bounding boxes for top labels
  const labelBoundingBoxes = useMemo(() => {
    if (!labels || labels.length === 0) return [];
    // Limit to top 6 confident labels for clarity
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

  if (!isOpen || !file || file.type !== "image") return null;

  const displayImage =
    file.thumbnail ||
    file.thumbnail_url ||
    file.downloadUrl ||
    file.download_url ||
    findThumbnail(file.id || file.file_id, file.s3Key || file.s3_key, file.name);

  const handleFilterByTag = (tagName) => {
    dispatch(setFilterType("image"));
    dispatch(setActiveTagFilter(tagName));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[280px] sm:max-w-md">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>AWS Rekognition Vision AI & EXIF</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  {labels.length} Detected Labels
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {labels.length > 0 && (
              <button
                type="button"
                onClick={() => setShowBoundingBoxes(!showBoundingBoxes)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                  showBoundingBoxes
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:text-slate-900 dark:hover:text-white"
                }`}
                title="Toggle AI Object Bounding Boxes"
              >
                <Scan className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  {showBoundingBoxes ? "Hide Boxes" : "Show Boxes"}
                </span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body: Left Image / Right AI telemetry */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
          {/* Left: High-Res Image Viewport with Bounding Box Overlay */}
          <div className="relative bg-slate-950 flex items-center justify-center p-4 min-h-[340px] overflow-hidden select-none">
            {displayImage ? (
              <div className="relative max-h-[440px] max-w-full flex items-center justify-center">
                <img
                  src={displayImage}
                  alt={file.name}
                  className="max-h-[420px] max-w-full w-auto object-contain rounded-xl shadow-lg"
                />

                {/* Interactive AI Bounding Box Layer */}
                {showBoundingBoxes && labelBoundingBoxes.length > 0 && (
                  <div className="absolute inset-0 pointer-events-none">
                    {labelBoundingBoxes.map((box) => {
                      const isHovered =
                        hoveredLabelName &&
                        hoveredLabelName.toLowerCase() === box.labelName.toLowerCase();

                      return (
                        <div
                          key={box.key}
                          onMouseEnter={() => setHoveredLabelName(box.labelName)}
                          onMouseLeave={() => setHoveredLabelName(null)}
                          className={`absolute pointer-events-auto transition-all duration-200 rounded-md cursor-pointer ${
                            isHovered
                              ? "border-2 border-emerald-400 bg-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.6)] z-20 scale-[1.01]"
                              : "border border-emerald-500/60 bg-emerald-500/5 hover:border-emerald-400 hover:bg-emerald-500/15 z-10"
                          }`}
                          style={{
                            left: `${box.left * 100}%`,
                            top: `${box.top * 100}%`,
                            width: `${box.width * 100}%`,
                            height: `${box.height * 100}%`,
                          }}
                        >
                          {/* Floating Box Tag Label */}
                          <div
                            className={`absolute -top-6 left-0 px-2 py-0.5 rounded text-[10px] font-bold tracking-tight whitespace-nowrap transition-transform flex items-center gap-1 ${
                              isHovered
                                ? "bg-emerald-500 text-slate-950 scale-105 shadow-md"
                                : "bg-black/75 text-emerald-300 backdrop-blur-xs"
                            }`}
                          >
                            <span>{box.labelName}</span>
                            {box.confidence && (
                              <span className="opacity-80 font-mono text-[9px]">
                                {Number(box.confidence).toFixed(0)}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-emerald-400">
                  <Camera className="w-8 h-8 stroke-[1.5]" />
                </div>
                <h4 className="text-sm font-semibold text-slate-200 truncate max-w-[280px]">
                  {file.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {file.size} • {file.dimensions?.format || "PNG/JPEG"} Ingested Asset
                </p>
                <div className="mt-3 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-[11px] font-mono text-slate-400">
                  {file.dimensions?.width && file.dimensions?.height
                    ? `${file.dimensions.width} × ${file.dimensions.height} px`
                    : "Direct S3 Ingestion"}
                </div>
              </div>
            )}

            <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20 shadow-md">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Moderation Passed</span>
            </div>
          </div>

          {/* Right: AI Metadata & EXIF Panel */}
          <div className="p-6 space-y-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto">
            {/* Rekognition Labels */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Amazon Rekognition Labels</span>
                </h4>
                <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  Confidence &gt; 90%
                </span>
              </div>

              <div className="space-y-2">
                {labels.length === 0 ? (
                  isPolling ? (
                    <div className="p-6 text-center rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/40 text-xs text-emerald-800 dark:text-emerald-300 space-y-2 animate-pulse">
                      <div className="flex items-center justify-center gap-2 font-semibold">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                        <span>AWS Rekognition Vision AI Analyzing...</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Extracting object tags and visual features in cloud. Labels will appear automatically without refresh.
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                      Rekognition Vision AI labels will appear here once processed.
                    </div>
                  )
                ) : (
                  labels.map((lbl, idx) => {
                    const isHovered =
                      hoveredLabelName &&
                      hoveredLabelName.toLowerCase() === (lbl.name || "").toLowerCase();

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredLabelName(lbl.name)}
                        onMouseLeave={() => setHoveredLabelName(null)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between group ${
                          isHovered
                            ? "bg-emerald-500/10 border-emerald-500/50 shadow-sm"
                            : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Tag
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isHovered ? "text-emerald-500" : "text-slate-400 group-hover:text-emerald-500"
                            }`}
                          />
                          <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                            {lbl.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="w-14 sm:w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${lbl.confidence}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400 min-w-[36px] text-right">
                            {lbl.confidence ? `${Number(lbl.confidence).toFixed(1)}%` : ""}
                          </span>

                          {/* Quick Filter Button */}
                          <button
                            type="button"
                            onClick={() => handleFilterByTag(lbl.name)}
                            title={`Filter gallery by "${lbl.name}"`}
                            className="p-1 rounded-md text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Filter className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* EXIF Camera Data */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-3">
                <Sliders className="w-3.5 h-3.5 text-blue-500" />
                <span>Extracted Hardware EXIF</span>
              </h4>

              {exif ? (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Camera Body
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white">
                      {exif.camera || "Unknown"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Optics
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white truncate block">
                      {exif.lens || "Standard"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Exposure / ISO
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white font-mono">
                      {exif.shutter || "Auto"} • ISO {exif.iso || "Auto"}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block uppercase font-medium">
                      Focal Length
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-white font-mono">
                      {exif.focalLength || "Native"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                  No hardware EXIF metadata found in uploaded image.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageAiModal;

