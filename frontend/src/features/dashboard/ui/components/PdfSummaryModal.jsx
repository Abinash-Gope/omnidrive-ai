import React, { useState } from "react";
import {
  X,
  FileText,
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  Download,
  Layers,
  BrainCircuit,
  Bot,
} from "lucide-react";

const PdfSummaryModal = ({ file, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !file || file.type !== "pdf") return null;

  // Extract real Bedrock summary if present
  const summary = file.summary
    ? typeof file.summary === "string"
      ? {
          executive: file.summary,
          takeaways: file.takeaways || [],
          pages: file.pages || 1,
          model: "Amazon Bedrock (Anthropic Claude 3 Haiku)",
        }
      : {
          executive: file.summary.executive || file.summary.summary || "",
          takeaways: file.summary.takeaways || file.summary.key_takeaways || [],
          pages: file.summary.pages || file.summary.page_count || file.pages || 1,
          model: file.summary.model || "Amazon Bedrock (Anthropic Claude 3 Haiku)",
        }
    : null;

  const handleCopy = () => {
    if (!summary) return;
    const textToCopy = `Executive Summary:\n${summary.executive}\n\nKey Takeaways:\n${summary.takeaways.map((t, i) => `${i + 1}. ${t}`).join("\n")}`;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                {file.name}
              </h3>
              <p className="text-xs text-slate-500 flex items-center gap-2">
                <span>Textract OCR & Amazon Bedrock Claude 3</span>
                {summary?.pages && (
                  <>
                    <span>•</span>
                    <span className="text-purple-600 dark:text-purple-400 font-mono font-semibold">
                      {summary.pages} Pages
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
              title="Copy Summary"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-500">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {!summary ? (
            <div className="py-12 px-4 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40">
              <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 animate-pulse">
                <BrainCircuit className="w-7 h-7" />
              </div>
              <h4 className="text-base font-bold text-slate-900 dark:text-white">
                AI Document Summary In Progress
              </h4>
              <p className="text-xs text-slate-500 max-w-md mt-2 leading-relaxed">
                This document is queued for Amazon Textract OCR line extraction and Amazon Bedrock (Claude 3 Haiku) summarization. Once processed, your executive brief and takeaways will automatically appear here.
              </p>
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Textract OCR & Bedrock Pipeline</span>
              </div>
            </div>
          ) : (
            <>
              {/* Bedrock Model Badge Card */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md">
                    <BrainCircuit className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                      <span>Generative AI Extraction</span>
                      <Sparkles className="w-3 h-3 text-amber-500" />
                    </span>
                    <span className="text-[11px] text-purple-700 dark:text-purple-300 font-mono">
                      {summary.model}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-100 dark:border-purple-800">
                  Textract OCR Verified
                </span>
              </div>

              {/* Executive Summary Section */}
              {summary.executive && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-purple-500" />
                    <span>Executive Brief</span>
                  </h4>
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                    {summary.executive}
                  </div>
                </div>
              )}

              {/* Actionable Takeaways */}
              {summary.takeaways && summary.takeaways.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Key Takeaways & Synthesized Points</span>
                  </h4>
                  <div className="space-y-2">
                    {summary.takeaways.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs"
                      >
                        <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PdfSummaryModal;
