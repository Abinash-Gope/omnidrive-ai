import React, { useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  ShieldAlert,
  Server,
  Database,
  CloudUpload,
  Cpu,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";

const PipelineDrawer = ({ pipeline, onClose }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const { plan } = useAuth();

  if (!pipeline || !pipeline.isOpen) return null;

  const { file, step, stepStatus, uploadProgress, isViolation, errorMessage } = pipeline;

  const stepsConfig = [
    {
      step: 1,
      title: plan === "enterprise" ? "Private S3 VPC Upload" : "Direct S3 Upload",
      subtitle: plan === "enterprise" ? "Encrypted via customer BYOK KMS" : "Presigned URL bypasses web server bottleneck",
      icon: CloudUpload,
    },
    {
      step: 2,
      title: "Rekognition Moderation Gate",
      subtitle: plan === "enterprise" ? "Zero-retention private scanning" : "Automated content moderation & quarantine",
      icon: isViolation ? ShieldAlert : ShieldCheck,
    },
    {
      step: 3,
      title:
        file?.type === "video"
          ? plan === "enterprise"
            ? "Dedicated ARM64 Fargate Transcode"
            : plan === "pro"
            ? "Priority Graviton3 Transcode (1080p/4K)"
            : "ECS Fargate FFmpeg Transcode"
          : file?.type === "pdf"
          ? plan === "enterprise"
            ? "OmniDrive Neural Engine (Zero-Retention VPC)"
            : "OmniDrive Document Intelligence"
          : "Vision AI Object Tagging",
      subtitle:
        file?.type === "video"
          ? plan === "enterprise"
            ? "Dedicated Graviton3 task generating 4K/1080p HLS"
            : plan === "pro"
            ? "Priority Graviton3 worker generating HLS renditions"
            : "ARM64 Spot worker generating 720p HLS .m3u8"
          : file?.type === "pdf"
          ? "Neural OCR & Executive Document Synthesis"
          : "Deep learning label & EXIF extraction",
      icon: Cpu,
    },
    {
      step: 4,
      title: "DynamoDB & EventBridge Sync",
      subtitle: plan === "enterprise" ? "Dedicated DAX cache + private event bus" : "Real-time state broadcast and metadata indexation",
      icon: Database,
    },
  ];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300">
      {/* Header Bar */}
      <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {isViolation ? (
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          ) : step === 4 && stepStatus[4] === "done" ? (
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
          ) : (
            <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin shrink-0" />
          )}
          <div className="min-w-0">
            <h4 className="text-xs font-bold truncate">
              {isViolation ? "Pipeline Quarantined" : step === 4 && stepStatus[4] === "done" ? "Pipeline Completed" : "AWS Serverless Pipeline"}
            </h4>
            <p className="text-[10px] text-slate-400 truncate">{file?.name || "Processing asset..."}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {isMinimized ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Step Progress List */}
      {!isMinimized && (
        <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
          {/* Upload Progress Bar if on Step 1 */}
          {step === 1 && (
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-500">
                <span>S3 Direct PUT Progress</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#1a73e8] transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Violation Banner if Flagged */}
          {isViolation && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">
                  {pipeline.errorTitle || "Upload / Pipeline Error"}
                </strong>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  {errorMessage || "Operation failed. Please check AWS configuration."}
                </p>
              </div>
            </div>
          )}

          {/* Steps Timeline */}
          <div className="space-y-3">
            {stepsConfig.map((s) => {
              const status = stepStatus[s.step];
              const Icon = s.icon;
              const isCurrent = step === s.step;

              return (
                <div
                  key={s.step}
                  className={`flex items-start gap-3 p-2.5 rounded-xl transition-colors ${
                    isCurrent
                      ? "bg-blue-50/60 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50"
                      : "opacity-80"
                  }`}
                >
                  <div className="mt-0.5">
                    {status === "done" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : status === "active" ? (
                      <Loader2 className="w-4 h-4 text-[#1a73e8] animate-spin" />
                    ) : status === "failed" ? (
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                    ) : status === "skipped" ? (
                      <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] text-slate-400">
                        -
                      </span>
                    ) : (
                      <span className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 flex items-center justify-center text-[9px] text-slate-400">
                        {s.step}
                      </span>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${isCurrent ? "text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                        {s.title}
                      </span>
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        {status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                      {s.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PipelineDrawer;
