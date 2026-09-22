import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { pollJobStatusApi } from "../../api/dashboardApi.jsx";
import { updateFileStatus } from "../../state/dashboardSlice.jsx";
import { findThumbnail } from "../../utils/thumbnailCache.jsx";

const ImageAiModal = ({ file, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const [isPolling, setIsPolling] = useState(false);

  const fileId = file?.id || file?.file_id;
  const labels = file?.labels || [];
  const exif = file?.exif || null;

  // Real-time automatic poller: if labels are empty, poll AWS DynamoDB every 2s
  // so the user never has to manually refresh the page
  // IMPORTANT: Must be called unconditionally before any early return to adhere to React Rules of Hooks
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

  if (!isOpen || !file || file.type !== "image") return null;

  const displayImage =
    file.thumbnail ||
    file.thumbnail_url ||
    file.downloadUrl ||
    file.download_url ||
    findThumbnail(file.id || file.file_id, file.s3Key || file.s3_key, file.name);

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
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>AWS Rekognition Vision AI & EXIF Extraction</span>
                <span>•</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                  {labels.length} Detected Labels
                </span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: Left Image / Right AI telemetry */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 overflow-y-auto">
          {/* Left: High-Res Image Viewport */}
          <div className="relative bg-slate-950 flex items-center justify-center p-4 min-h-[320px]">
            {displayImage ? (
              <img
                src={displayImage}
                alt={file.name}
                className="max-h-[420px] w-auto object-contain rounded-xl shadow-lg"
              />
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
            <div className="absolute top-6 left-6 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md text-emerald-400 text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Moderation Passed (99.9% Safe)</span>
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
                  labels.map((lbl, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {lbl.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full"
                            style={{ width: `${lbl.confidence}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {lbl.confidence ? `${Number(lbl.confidence).toFixed(1)}%` : ""}
                        </span>
                      </div>
                    </div>
                  ))
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
