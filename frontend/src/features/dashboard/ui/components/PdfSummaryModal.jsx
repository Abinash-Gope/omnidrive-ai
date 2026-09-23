import React, { useState, useRef, useEffect } from "react";
import {
  X,
  FileText,
  Sparkles,
  CheckCircle,
  Copy,
  Check,
  BrainCircuit,
  Bot,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Layers,
  MessageSquare,
  Send,
  User,
  Loader2,
  AlertCircle,
  RefreshCw,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import PdfPreview from "./PdfPreview.jsx";
import { extractPdfText, askPdfQuestion, generateRealPdfSummary } from "../../utils/pdfChatService.jsx";
import { useDispatch } from "react-redux";
import { updateFileStatus } from "../../state/dashboardSlice.jsx";
import { recordLocalActivity } from "../../services/activitySyncService.jsx";

// Detect if a summary is the hardcoded mock/fallback string from Lambda
export const isPlaceholderSummary = (text) => {
  if (!text || typeof text !== "string") return true;
  const lower = text.toLowerCase();
  return (
    lower.includes("comprehensive enterprise cloud documentation") ||
    lower.includes("automated content safety governance with aws rekognition") ||
    lower.includes("direct client s3 ingestion eliminates compute bottleneck") ||
    lower.includes("omnidrive ai cloud architecture document") ||
    (lower.includes("rekognition") && !lower.includes("lexiassist"))
  );
};

// Sanitize any model name so Meta/LLaMA third-party branding is completely stripped
export const sanitizeModelName = (name) => {
  if (!name || typeof name !== "string") return "OmniDrive Neural Engine";
  const lower = name.toLowerCase();
  if (lower.includes("meta") || lower.includes("llama")) {
    return "OmniDrive Neural Engine";
  }
  return name;
};

// Session-based summary cache: persists for the active browser session so AI never re-runs until browser is closed
export const getSessionSummary = (id) => {
  if (!id) return null;
  try {
    const raw = sessionStorage.getItem(`omnidrive_session_summary_${id}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.executive && !isPlaceholderSummary(parsed.executive)) {
        parsed.model = sanitizeModelName(parsed.model);
        return parsed;
      }
    }
  } catch (e) {}
  return null;
};

export const setSessionSummary = (id, summaryObj) => {
  if (!id || !summaryObj) return;
  try {
    const cleanObj = {
      ...summaryObj,
      model: sanitizeModelName(summaryObj.model),
    };
    sessionStorage.setItem(`omnidrive_session_summary_${id}`, JSON.stringify(cleanObj));
  } catch (e) {}
};


// ─── Format live streaming JSON/text for natural preview ─────────────────────
const formatStreamingPreview = (raw) => {
  if (!raw) return "";
  try {
    // If the model is outputting JSON: {"summary": "...", "takeaways": [...]}
    const match = raw.match(/"summary"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)/);
    if (match && match[1]) {
      return match[1].replace(/\\n/g, "\n").replace(/\\"/g, '"');
    }
  } catch {}
  // Fallback: strip markdown codefence and outer punctuation
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/^[{\s"]+/, "");
};

// ─── Chat message bubble ───────────────────────────────────────────────────────
const ChatBubble = ({ msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex gap-2.5 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-gradient-to-br from-purple-500 to-indigo-600 text-white"
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
          isUser
            ? "bg-blue-600 text-white rounded-tr-sm"
            : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm"
        }`}
      >
        {msg.loading ? (
          <span className="flex items-center gap-2 text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Thinking…
          </span>
        ) : msg.error ? (
          <span className="flex items-center gap-1.5 text-rose-400">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {msg.text}
          </span>
        ) : (
          /* Render markdown-ish text — newlines + bold */
          <span
            className="whitespace-pre-wrap"
            dangerouslySetInnerHTML={{
              __html: msg.text
                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                .replace(/^### (.*)$/gm, '<span class="font-bold text-purple-600 dark:text-purple-300 block mt-1">$1</span>')
                .replace(/^## (.*)$/gm, '<span class="font-bold block mt-1">$1</span>')
                .replace(/^- (.*)$/gm, "• $1"),
            }}
          />
        )}
      </div>
    </div>
  );
};

// ─── Suggested quick questions ─────────────────────────────────────────────────
const SUGGESTIONS = [
  "What is this document about?",
  "Summarize the key findings",
  "What are the main conclusions?",
  "List the most important data points",
  "Who is the intended audience?",
];

const DEFAULT_GREETING = [
  {
    role: "model",
    text: "Hi! I've analyzed this document. Ask me anything about it — I'll answer directly from the content.",
  },
];

// ─── Main Modal ────────────────────────────────────────────────────────────────
const PdfSummaryModal = ({ file, isOpen, onClose }) => {
  const dispatch = useDispatch();
  const fileId = file?.id || file?.file_id || file?.s3Key || file?.name;

  // PDF viewer state
  const [copied, setCopied] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [scale, setScale] = useState(1.0);

  const handlePageCount = (count) => {
    if (!count) return;
    setTotalPages(count);
    if (fileId) {
      dispatch(
        updateFileStatus({
          fileId,
          pages: count,
          summary: {
            ...(typeof file.summary === "object" ? file.summary : {}),
            pages: count,
          },
        })
      );
    }
  };

  // Right panel tabs: "summary" | "chat"
  const [activeTab, setActiveTab] = useState("summary");

  // Chat state - scoped per document from localStorage
  const [messages, setMessages] = useState(() => {
    if (!fileId) return DEFAULT_GREETING;
    try {
      const saved = localStorage.getItem(`omnidrive_pdf_chat_${fileId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {}
    return DEFAULT_GREETING;
  });

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pdfText, setPdfText] = useState(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  // Real-time AI synthesis state (synchronously loaded from sessionStorage so AI never re-runs)
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [synthError, setSynthError] = useState(null);
  const [realSummary, setRealSummary] = useState(() => getSessionSummary(fileId));

  // Progressive loading state
  // extractionProgress: { current: number, total: number } | null
  const [extractionProgress, setExtractionProgress] = useState(null);
  // streamingText: partial JSON text coming in token-by-token from NVIDIA NIM
  const [streamingText, setStreamingText] = useState("");

  // When changing document, load session cache and reset viewer state
  useEffect(() => {
    if (!fileId) return;
    setPdfText(null);
    setSynthError(null);
    setExtractError(null);
    setIsExtractingText(false);
    setExtractionProgress(null);
    setStreamingText("");
    setPageNumber(1);
    setScale(1.0);
    setInputValue("");

    // Instantly load from sessionStorage if already analyzed in this browser session
    const sessionCached = getSessionSummary(fileId);
    setRealSummary(sessionCached);

    // Load this specific document's saved chat
    try {
      const saved = localStorage.getItem(`omnidrive_pdf_chat_${fileId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages(DEFAULT_GREETING);
  }, [fileId]);

  // Persist chat history per document whenever messages change
  useEffect(() => {
    if (!fileId || messages.length === 0) return;
    const clean = messages.filter((m) => !m.loading);
    try {
      localStorage.setItem(`omnidrive_pdf_chat_${fileId}`, JSON.stringify(clean));
    } catch {}
  }, [messages, fileId]);

  // Clear chat history for this specific document
  const handleClearChat = () => {
    if (fileId) {
      try {
        localStorage.removeItem(`omnidrive_pdf_chat_${fileId}`);
      } catch {}
    }
    setMessages(DEFAULT_GREETING);
  };

  // PDF viewer container & free-movement drag state
  const viewerContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });

  // When reset to 100% or below, center and reset scroll; when zooming in, center view
  useEffect(() => {
    if (scale <= 1.0 && viewerContainerRef.current) {
      viewerContainerRef.current.scrollLeft = 0;
      viewerContainerRef.current.scrollTop = 0;
    } else if (scale > 1.0 && viewerContainerRef.current) {
      const el = viewerContainerRef.current;
      setTimeout(() => {
        if (el) {
          el.scrollLeft = Math.max(0, (el.scrollWidth - el.clientWidth) / 2);
        }
      }, 50);
    }
  }, [scale]);

  const handlePointerDown = (e) => {
    if (scale <= 1.0 || !viewerContainerRef.current) return;
    if (e.button !== 0) return; // Primary left click only
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: viewerContainerRef.current.scrollLeft,
      scrollTop: viewerContainerRef.current.scrollTop,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerMove = (e) => {
    if (!isDragging || scale <= 1.0 || !viewerContainerRef.current) return;
    e.preventDefault();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    viewerContainerRef.current.scrollLeft = dragStartPos.current.scrollLeft - dx;
    viewerContainerRef.current.scrollTop = dragStartPos.current.scrollTop - dy;
  };

  const handlePointerUp = (e) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Pre-warm: start extracting PDF text as soon as the modal opens ──────────
  // This runs regardless of which tab is active, so text is ready when needed.
  useEffect(() => {
    if (!isOpen || !file || !fileId) return;
    const pdfUrl = file?.downloadUrl || file?.download_url;
    if (!pdfUrl || pdfText !== null || isExtractingText) return;
    // Skip extraction if we already have a cached summary and the chat tab isn't active
    // (avoids burning bandwidth on docs that the user just views)
    const hasCachedSummary = !!getSessionSummary(fileId);
    if (hasCachedSummary && activeTab === "summary") return;

    setIsExtractingText(true);
    setExtractError(null);
    extractPdfText(pdfUrl, 30, (current, total) => {
      // Only show extraction progress if we're in summary-generating mode
      setExtractionProgress((prev) => {
        if (isSynthesizing) return { current, total };
        return prev;
      });
    })
      .then((text) => {
        setPdfText(text);
        setIsExtractingText(false);
        setExtractionProgress(null);
        setMessages((prev) => (prev && prev.length > 0 ? prev : DEFAULT_GREETING));
      })
      .catch((err) => {
        setExtractError(err.message || "Failed to read document text.");
        setIsExtractingText(false);
        setExtractionProgress(null);
      });
  }, [isOpen, fileId, file]);

  const handleSynthesizeSummary = async (force = false) => {
    const pdfTargetUrl = file?.downloadUrl || file?.download_url || file?.thumbnail_url;
    if (!pdfTargetUrl) {
      setSynthError("No document URL available for AI synthesis.");
      return;
    }
    setIsSynthesizing(true);
    setSynthError(null);
    setRealSummary(null);
    setStreamingText("");

    try {
      // ── Phase 1: Extract text with per-page progress ────────────────────
      let text = pdfText; // reuse pre-warmed text if available
      if (!text) {
        setExtractionProgress({ current: 0, total: null });
        setIsExtractingText(true);
        text = await extractPdfText(
          pdfTargetUrl,
          30,
          (current, total) => setExtractionProgress({ current, total })
        );
        setPdfText(text);
        setIsExtractingText(false);
        setExtractionProgress(null);
      }

      // ── Phase 2: Stream summary tokens from NVIDIA NIM ──────────────────
      const generated = await generateRealPdfSummary(text, (delta, fullSoFar) => {
        setStreamingText(fullSoFar);
      });
      setStreamingText("");
      setRealSummary(generated);

      if (fileId) {
        // Store in sessionStorage: AI never needs to run again for this file until the browser is closed
        setSessionSummary(fileId, generated);

        const summaryPayload = {
          executive: generated.executive,
          takeaways: generated.takeaways,
          pages: totalPages || file.pages || null,
          model: generated.model || "OmniDrive Neural Engine",
        };

        dispatch(
          updateFileStatus({
            fileId,
            summary: summaryPayload,
            takeaways: generated.takeaways,
          })
        );

        // Register dynamic summary into Sync Manager for cloud persistence on logout/close
        recordLocalActivity(
          "summary_generated",
          { fileId, fileName: file?.name },
          {
            summaries: {
              [fileId]: summaryPayload,
            },
          }
        );
      }
    } catch (err) {
      console.error("Failed to synthesize real AI summary:", err);
      setSynthError(err.message || "AI synthesis failed.");
      setIsExtractingText(false);
      setExtractionProgress(null);
      setStreamingText("");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Auto-detect and synthesize real AI summary if placeholder/missing for this specific file
  useEffect(() => {
    if (!isOpen || !file || file.type !== "pdf" || !fileId) return;

    // 1. If already present in memory state or sessionStorage, do NOT call AI!
    if (realSummary && !isPlaceholderSummary(realSummary.executive)) return;
    const sessionCached = getSessionSummary(fileId);
    if (sessionCached) {
      setRealSummary(sessionCached);
      return;
    }

    // 2. If file.summary from Redux is already a real verified summary, do NOT call AI!
    const curExec = typeof file.summary === "string"
      ? file.summary
      : file.summary?.executive || file.summary?.summary || "";

    if (!isPlaceholderSummary(curExec)) {
      return;
    }

    // 3. Only synthesize if completely missing / placeholder
    handleSynthesizeSummary();
  }, [isOpen, fileId, realSummary]);

  if (!isOpen || !file || file.type !== "pdf") return null;

  // Normalise summary (prefer verified realSummary for current document)
  const rawSummary = realSummary || (file.summary
    ? typeof file.summary === "string"
      ? {
          executive: file.summary,
          takeaways: file.takeaways || [],
          pages: file.pages || null,
          model: "OmniDrive Neural Engine",
        }
      : {
          executive: file.summary.executive || file.summary.summary || "",
          takeaways: file.summary.takeaways || file.summary.key_takeaways || [],
          pages: file.summary.pages || file.summary.page_count || file.pages || null,
          model: sanitizeModelName(file.summary.model),
        }
    : null);

  // If currently synthesizing OR if summary is detected as placeholder, hide it so fake text is never shown
  const summary = (isSynthesizing || (rawSummary && isPlaceholderSummary(rawSummary.executive)))
    ? null
    : rawSummary;



  const pdfUrl = file.downloadUrl || file.download_url || file.thumbnail_url || null;

  const handleCopy = () => {
    if (!summary) return;
    const text = `Executive Summary:\n${summary.executive}\n\nKey Takeaways:\n${summary.takeaways
      .map((t, i) => `${i + 1}. ${t}`)
      .join("\n")}`;
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!pdfUrl) return;
    const a = document.createElement("a");
    a.href = pdfUrl;
    a.download = file.name || "document.pdf";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  };

  const prevPage = () => setPageNumber((p) => Math.max(1, p - 1));
  const nextPage = () => setPageNumber((p) => Math.min(totalPages || p, p + 1));
  const zoomIn = () => setScale((s) => Math.min(3.0, +(s + 0.2).toFixed(1)));
  const zoomOut = () => setScale((s) => Math.max(0.5, +(s - 0.2).toFixed(1)));

  // ── Chat send (streaming) ──────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const question = (text || inputValue).trim();
    if (!question || isSending) return;

    setInputValue("");
    setIsSending(true);

    const userMsg = { role: "user", text: question };
    // Start with an empty model message — we'll stream tokens into it
    const placeholderMsg = { role: "model", text: "", loading: true };

    setMessages((prev) => [...prev, userMsg, placeholderMsg]);

    try {
      const history = messages.filter((m) => !m.loading && !m.error);
      const isPlaceholder = isPlaceholderSummary(summary?.executive);
      const summaryText =
        !isPlaceholder && summary?.executive
          ? `Executive Summary: ${summary.executive}`
          : undefined;

      // Stream tokens directly into the last message as they arrive
      await askPdfQuestion(
        question,
        pdfText || "",
        { summary: summaryText },
        history,
        (_delta, fullSoFar) => {
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { role: "model", text: fullSoFar, loading: false } : m
            )
          );
        }
      );

      // Ensure loading flag is removed after stream ends
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { ...m, loading: false } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: "model", text: err.message || "Failed to get a response from AI assistant.", error: true, loading: false }
            : m
        )
      );
    } finally {
      setIsSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-6xl overflow-hidden shadow-2xl flex flex-col max-h-[93vh]">

        {/* ── Header ── */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">
                {file.name}
              </h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
                <span className="font-medium text-slate-600 dark:text-slate-400">Document Intelligence</span>
                {totalPages && (
                  <>
                    <span>·</span>
                    <span className="text-purple-600 dark:text-purple-400 font-mono font-medium">
                      {totalPages}p
                    </span>
                  </>
                )}
                <span>·</span>
                <span className="font-mono text-slate-400">{file.size}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {summary && (
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                {copied ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-500" /><span className="text-emerald-500">Copied!</span></>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /><span className="hidden sm:inline">Copy</span></>
                )}
              </button>
            )}
            {pdfUrl && (
              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ── Body: split pane ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT: PDF Viewer */}
          <div className="flex flex-col w-1/2 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 min-h-0">
            {/* Viewer toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={prevPage} disabled={pageNumber <= 1}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono text-slate-600 dark:text-slate-400 px-1 min-w-[60px] text-center">
                  {pageNumber} / {totalPages ?? "…"}
                </span>
                <button onClick={nextPage} disabled={!totalPages || pageNumber >= totalPages}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                {scale > 1.0 && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full font-medium mr-1 animate-in fade-in">
                    ✋ Drag to move
                  </span>
                )}
                <button
                  onClick={zoomOut}
                  disabled={scale <= 0.5}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setScale(1.0)}
                  title="Click to reset to 100%"
                  className="text-xs font-mono text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 w-12 text-center transition-colors cursor-pointer"
                >
                  {Math.round(scale * 100)}%
                </button>
                <button
                  onClick={zoomIn}
                  disabled={scale >= 3.0}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* PDF Canvas Container */}
            <div
              ref={viewerContainerRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className={`flex-1 overflow-auto min-h-0 select-none ${
                scale > 1.0
                  ? isDragging
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-default"
              }`}
            >
              {pdfUrl ? (
                <div
                  className={`min-w-full min-h-full flex p-6 box-border ${
                    scale <= 1.0 ? "items-center justify-center" : "w-fit"
                  }`}
                >
                  <div
                    className={`shrink-0 shadow-2xl rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 bg-white transition-shadow ${
                      scale <= 1.0 ? "max-w-full max-h-full" : "m-auto"
                    } ${isDragging ? "pointer-events-none shadow-blue-500/20" : ""}`}
                  >
                    <PdfPreview
                      url={pdfUrl}
                      pageNumber={pageNumber}
                      scale={scale}
                      onPageCount={handlePageCount}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                  <div className="w-16 h-20 rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <FileText className="w-8 h-8 opacity-40" />
                  </div>
                  <p className="text-xs text-center text-slate-500">PDF preview unavailable.<br />Document may still be processing.</p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Tab Panel */}
          <div className="flex flex-col w-1/2 min-h-0">

            {/* Tab bar */}
            <div className="flex shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <button
                onClick={() => setActiveTab("summary")}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "summary"
                    ? "border-purple-600 text-purple-700 dark:text-purple-400 bg-purple-50/60 dark:bg-purple-950/20"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                AI Summary
              </button>
              <button
                onClick={() => setActiveTab("chat")}
                className={`flex items-center gap-2 px-5 py-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === "chat"
                    ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-950/20"
                    : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat with PDF
                <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white text-[9px] font-bold leading-none">AI</span>
              </button>
            </div>

            {/* ── SUMMARY TAB ── */}
            {activeTab === "summary" && (
              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                {synthError && !isSynthesizing ? (
                  <div className="py-10 px-4 text-center flex flex-col items-center justify-center border border-rose-200 dark:border-rose-900/60 rounded-3xl bg-rose-50/40 dark:bg-rose-950/20 mt-2">
                    <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Analysis Notice</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 leading-relaxed">
                      {synthError}
                    </p>
                    <button
                      onClick={() => handleSynthesizeSummary(true)}
                      className="mt-4 flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Retry AI Analysis
                    </button>
                  </div>
                ) : !summary || isSynthesizing ? (
                  <div className="mt-2 space-y-4">
                    {/* ── Phase label ── */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-white">
                          {isExtractingText
                            ? extractionProgress
                              ? `Reading page ${extractionProgress.current} of ${extractionProgress.total}…`
                              : "Reading document…"
                            : streamingText
                            ? "Generating summary…"
                            : "AI Summary In Progress"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isExtractingText
                            ? "Extracting text from PDF pages"
                            : streamingText
                            ? "OmniDrive AI is writing your summary"
                            : "Connecting to OmniDrive AI…"}
                        </p>
                      </div>
                      <div className="ml-auto">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                      </div>
                    </div>

                    {/* ── Extraction progress bar ── */}
                    {isExtractingText && extractionProgress?.total && (
                      <div className="px-1">
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round((extractionProgress.current / extractionProgress.total) * 100)}%`,
                            }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1 text-right font-mono">
                          {Math.round((extractionProgress.current / extractionProgress.total) * 100)}%
                        </p>
                      </div>
                    )}

                    {/* ── Live streaming text preview ── */}
                    {streamingText && !isExtractingText && (
                      <div className="p-4 rounded-2xl bg-purple-50/60 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans whitespace-pre-wrap animate-in fade-in">
                        <div className="flex items-center gap-1.5 mb-2 text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
                          <Bot className="w-3.5 h-3.5" /> Live Synthesis
                        </div>
                        {formatStreamingPreview(streamingText)}
                        <span className="inline-block w-1.5 h-3.5 bg-purple-600 ml-1 animate-pulse align-middle rounded-xs" />
                      </div>
                    )}

                    {/* ── Skeleton cards ── */}
                    {!streamingText && (
                      <>
                        <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 bg-white dark:bg-slate-800">
                          <div className="h-3 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse w-1/3" />
                          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 animate-pulse w-full" />
                          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 animate-pulse w-5/6" />
                          <div className="h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 animate-pulse w-4/6" />
                        </div>
                        <div className="space-y-2">
                          {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse shrink-0" />
                              <div className="flex-1 h-2.5 rounded-full bg-slate-100 dark:bg-slate-700/60 animate-pulse" style={{ width: `${70 + i * 5}%` }} />
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-200/80 dark:border-purple-900/60 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-md shrink-0">
                          <BrainCircuit className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-purple-900 dark:text-purple-200 flex items-center gap-1">
                            Generative AI Extraction <Sparkles className="w-3 h-3 text-amber-500" />
                          </span>
                          <span className="text-[11px] text-purple-700 dark:text-purple-300 font-mono">
                            {sanitizeModelName(summary.model)}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleSynthesizeSummary(true)}
                            disabled={isSynthesizing}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/60 dark:hover:bg-purple-800 text-purple-700 dark:text-purple-300 text-[10px] font-semibold transition-colors disabled:opacity-50"
                            title="Regenerate summary with AI"
                          >
                            <RefreshCw className={`w-3 h-3 ${isSynthesizing ? "animate-spin" : ""}`} />
                            <span>{isSynthesizing ? "Analyzing…" : "Regenerate"}</span>
                          </button>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-100 dark:border-purple-800 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Verified AI
                          </span>
                        </div>
                        {(totalPages || file.pages || summary?.pages) && (
                          <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400">
                            <Layers className="inline w-3 h-3 mr-0.5" />
                            {totalPages || file.pages || summary?.pages}{" "}
                            {(totalPages || file.pages || summary?.pages) === 1 ? "page" : "pages"}
                          </span>
                        )}
                      </div>
                    </div>

                    {summary.executive && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5 text-purple-500" /> Executive Brief
                        </h4>
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                          {summary.executive}
                        </div>
                      </div>
                    )}

                    {summary.takeaways?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Key Takeaways
                        </h4>
                        <div className="space-y-2">
                          {summary.takeaways.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 shadow-xs hover:border-purple-200 dark:hover:border-purple-800 transition-colors">
                              <div className="w-5 h-5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 font-mono text-xs flex items-center justify-center shrink-0 mt-0.5 font-bold">{idx + 1}</div>
                              <p className="text-xs text-slate-700 dark:text-slate-300 leading-normal">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Prompt to try chat */}
                    <button
                      onClick={() => setActiveTab("chat")}
                      className="w-full mt-2 flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-blue-200 dark:border-blue-900/60 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors text-xs font-semibold group"
                    >
                      <MessageSquare className="w-4 h-4 group-hover:scale-110 transition-transform" />
                      Ask follow-up questions with AI Chat →
                    </button>
                  </>
                )}
              </div>
            )}

            {/* ── CHAT TAB ── */}
            {activeTab === "chat" && (
              <div className="flex flex-col flex-1 min-h-0">
                {/* Chat toolbar */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 shrink-0">
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
                    Document Conversation
                  </span>
                  {messages.length > 1 && (
                    <button
                      onClick={handleClearChat}
                      className="text-[10px] text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-slate-200/60 dark:hover:bg-slate-800"
                      title="Clear chat history for this document"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Chat
                    </button>
                  )}
                </div>

                {/* Chat messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isExtractingText && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                      <p className="text-xs text-center text-slate-500">
                        Reading document content…<br />
                        <span className="text-[11px] text-slate-400">This takes a moment for large documents</span>
                      </p>
                    </div>
                  )}

                  {extractError && (
                    <div className="flex flex-col items-center justify-center h-full gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-rose-500" />
                      </div>
                      <p className="text-xs text-center text-slate-500 max-w-[220px] leading-relaxed">{extractError}</p>
                      <button
                        onClick={() => { setPdfText(null); setExtractError(null); setIsExtractingText(false); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Retry
                      </button>
                    </div>
                  )}

                  {!isExtractingText && !extractError && messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 flex items-center justify-center">
                        <MessageSquare className="w-7 h-7 text-blue-500" />
                      </div>
                      <p className="text-xs text-center text-slate-500">Loading chat…</p>
                    </div>
                  )}

                  {messages.map((msg, idx) => (
                    <ChatBubble key={idx} msg={msg} />
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggestions */}
                {messages.length <= 1 && !isExtractingText && !extractError && pdfText && (
                  <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
                    {SUGGESTIONS.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors truncate max-w-[180px]"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input bar */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 px-3 py-2 focus-within:border-blue-400 dark:focus-within:border-blue-500 transition-colors">
                    <textarea
                      ref={inputRef}
                      rows={1}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={pdfText ? "Ask anything about this document…" : "Reading document…"}
                      disabled={!pdfText || isSending}
                      className="flex-1 bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none outline-none leading-relaxed max-h-28 disabled:opacity-50"
                      style={{ minHeight: "1.5rem" }}
                      onInput={(e) => {
                        e.target.style.height = "auto";
                        e.target.style.height = Math.min(e.target.scrollHeight, 112) + "px";
                      }}
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={!inputValue.trim() || !pdfText || isSending}
                      className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1.5 text-center">
                    AI Document Assistant · answers from document content
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfSummaryModal;
