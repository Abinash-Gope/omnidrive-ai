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
  BookOpen,
} from "lucide-react";
import PdfPreview from "./PdfPreview.jsx";
import { extractPdfText, askPdfQuestion } from "../../utils/pdfChatService.jsx";
import { useDispatch } from "react-redux";
import { updateFileStatus } from "../../state/dashboardSlice.jsx";

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

// ─── Main Modal ────────────────────────────────────────────────────────────────
const PdfSummaryModal = ({ file, isOpen, onClose }) => {
  const dispatch = useDispatch();

  // PDF viewer state
  const [copied, setCopied] = useState(false);
  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(null);
  const [scale, setScale] = useState(1.0);

  const handlePageCount = (count) => {
    if (!count) return;
    setTotalPages(count);
    const fileId = file?.id || file?.file_id;
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

  // Chat state
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [pdfText, setPdfText] = useState(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractError, setExtractError] = useState(null);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

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

  // Auto-extract PDF text when chat tab is first opened
  useEffect(() => {
    if (activeTab !== "chat" || pdfText !== null || isExtractingText) return;
    const pdfUrl = file?.downloadUrl || file?.download_url;
    if (!pdfUrl) {
      setExtractError("No PDF URL available — cannot extract text for chat.");
      return;
    }
    setIsExtractingText(true);
    setExtractError(null);
    extractPdfText(pdfUrl)
      .then((text) => {
        setPdfText(text);
        setIsExtractingText(false);
        // Greet the user
        setMessages([
          {
            role: "model",
            text: `Hi! I've read "${file.name}". Ask me anything about it — I'll answer from the document content.`,
          },
        ]);
      })
      .catch((err) => {
        setExtractError(err.message || "Failed to read PDF text.");
        setIsExtractingText(false);
      });
  }, [activeTab, pdfText, isExtractingText, file]);

  if (!isOpen || !file || file.type !== "pdf") return null;

  // Normalise summary
  const summary = file.summary
    ? typeof file.summary === "string"
      ? {
          executive: file.summary,
          takeaways: file.takeaways || [],
          pages: file.pages || 1,
          model: "OmniDrive Neural Engine",
        }
      : {
          executive: file.summary.executive || file.summary.summary || "",
          takeaways: file.summary.takeaways || file.summary.key_takeaways || [],
          pages: file.summary.pages || file.summary.page_count || file.pages || 1,
          model: "OmniDrive Neural Engine",
        }
    : null;

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

  // ── Chat send ──────────────────────────────────────────────────────────────
  const sendMessage = async (text) => {
    const question = (text || inputValue).trim();
    if (!question || isSending) return;

    setInputValue("");
    setIsSending(true);

    const userMsg = { role: "user", text: question };
    const loadingMsg = { role: "model", text: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    try {
      const history = messages.filter((m) => !m.loading && !m.error);
      const summaryText = summary?.executive
        ? `Executive Summary: ${summary.executive}`
        : undefined;
      const answer = await askPdfQuestion(
        question,
        pdfText || "",
        { name: file.name, summary: summaryText },
        history
      );

      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 ? { role: "model", text: answer } : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? { role: "model", text: err.message || "Failed to get a response. Check your Gemini API key.", error: true }
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
                {!summary ? (
                  <div className="py-14 px-4 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/40 mt-2">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4 animate-pulse">
                      <BrainCircuit className="w-7 h-7" />
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">AI Summary In Progress</h4>
                    <p className="text-xs text-slate-500 max-w-xs mt-2 leading-relaxed">
                      Analyzing document structure and synthesizing your executive brief and key takeaways.
                    </p>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-xs font-medium">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>OmniDrive AI Pipeline</span>
                    </div>
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
                          <span className="text-[11px] text-purple-700 dark:text-purple-300 font-mono">{summary.model}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-purple-700 dark:text-purple-300 shadow-xs border border-purple-100 dark:border-purple-800">Verified AI</span>
                        <span className="text-[10px] font-mono text-purple-500 dark:text-purple-400">
                          <Layers className="inline w-3 h-3 mr-0.5" />
                          {totalPages || file.pages || summary?.pages || 1} {(totalPages || file.pages || summary?.pages || 1) === 1 ? "page" : "pages"}
                        </span>
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
                {/* Chat messages area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {isExtractingText && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
                      <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                      <p className="text-xs text-center text-slate-500">
                        Reading PDF content…<br />
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
                      placeholder={pdfText ? "Ask anything about this PDF…" : "Loading PDF…"}
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
