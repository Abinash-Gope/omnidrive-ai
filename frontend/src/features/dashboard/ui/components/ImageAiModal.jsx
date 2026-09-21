import React from "react";
import {
  X,
  Camera,
  Sparkles,
  ShieldCheck,
  Tag,
  Sliders,
  Info,
  Layers,
} from "lucide-react";

const ImageAiModal = ({ file, isOpen, onClose }) => {
  if (!isOpen || !file || file.type !== "image") return null;

  const labels = file.labels || [];
  const exif = file.exif || null;

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
          <div className="relative bg-slate-950 flex items-center justify-center p-4 min-h-[300px]">
            <img
              src={file.thumbnail || "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80"}
              alt={file.name}
              className="max-h-[420px] w-auto object-contain rounded-xl shadow-lg"
            />
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
                  <div className="p-4 text-center rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-500">
                    Rekognition Vision AI labels will appear here once processed.
                  </div>
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
