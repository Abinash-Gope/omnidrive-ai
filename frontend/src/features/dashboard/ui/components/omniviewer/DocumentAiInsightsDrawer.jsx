import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sparkles,
  BarChart3,
  MessageSquare,
  X,
  BrainCircuit,
  RefreshCw,
  Loader2,
  BookOpen,
  CheckCircle,
  Copy,
  Check,
  Send,
  User,
  Bot,
  Clock,
  Gauge,
  Tag,
  FileText,
  AlertCircle,
} from "lucide-react";
import { extractDocumentText } from "../../../utils/documentTextExtractor.js";
import {
  generateRealDocumentSummary,
  askDocumentQuestion,
  computeDocumentMetrics,
} from "../../../utils/documentChatService.js";

const DEFAULT_GREETING = [
  {
    id: "welcome",
    role: "assistant",
    text: "Hello! I am your OmniDrive Document Intelligence Assistant. Ask me anything about this document, its findings, data, or action items.",
  },
];

const PROMPT_SUGGESTIONS = [
  "Summarize key takeaways in 3 bullets",
  "What are the main action items?",
  "Explain in simple terms",
  "Analyze document structure & data",
];

const DocumentAiInsightsDrawer = ({
  file,
  fileUrl,
  fileName,
  isOpen,
  onClose,
  theme = {},
}) => {
  const isImage =
    file?.type === "image" ||
    /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif|heic|heif|tiff?|raw|dng|psd)$/i.test(
      fileName || ""
    );

  const defaultGreeting = useMemo(
    () => [
      {
        id: "welcome",
        role: "assistant",
        text: isImage
          ? "Hello! I am your OmniDrive Vision AI Assistant. Ask me anything about this image — what objects are present, visual style, colors, composition, or layout."
          : "Hello! I am your OmniDrive Document Intelligence Assistant. Ask me anything about this document, its findings, data, or action items.",
      },
    ],
    [isImage]
  );

  const [activeTab, setActiveTab] = useState("summary"); // "summary" | "chat"
  const [documentText, setDocumentText] = useState("");
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState(null);

  const [aiSummary, setAiSummary] = useState(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [synthError, setSynthError] = useState(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Chat state
  const [messages, setMessages] = useState(defaultGreeting);
  const [inputMessage, setInputMessage] = useState("");
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatStreamingText, setChatStreamingText] = useState("");
  const chatScrollRef = useRef(null);

  const fileId = file?.id || file?.file_id || fileName;

  // Primary accent styles
  const accentColor = theme.accent || "text-purple-600 dark:text-purple-400";
  const btnColor = theme.btnBg || "bg-purple-600 hover:bg-purple-700 text-white";

  // Pre-load saved summary or chat from localStorage
  useEffect(() => {
    if (!fileId) return;
    try {
      const savedSummary = localStorage.getItem(`omnidrive_doc_summary_${fileId}`);
      if (savedSummary) {
        setAiSummary(JSON.parse(savedSummary));
      }
      const savedChat = localStorage.getItem(`omnidrive_doc_chat_${fileId}`);
      if (savedChat) {
        const parsed = JSON.parse(savedChat);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch {}
  }, [fileId]);

  // Persist chat per document
  useEffect(() => {
    if (!fileId || messages === DEFAULT_GREETING) return;
    try {
      localStorage.setItem(`omnidrive_doc_chat_${fileId}`, JSON.stringify(messages));
    } catch {}
  }, [messages, fileId]);

  // Extract text on demand
  const ensureDocumentText = useCallback(async () => {
    if (documentText) return documentText;
    if (!fileUrl) return "";

    setIsExtractingText(true);
    setExtractionProgress({ current: 0, total: 3 });

    try {
      const text = await extractDocumentText(fileUrl, fileName, (current, total) => {
        setExtractionProgress({ current, total });
      });
      setDocumentText(text);
      setIsExtractingText(false);
      setExtractionProgress(null);
      return text;
    } catch (err) {
      console.warn("[DocumentAI] Text extraction warning:", err);
      setIsExtractingText(false);
      setExtractionProgress(null);
      return "";
    }
  }, [documentText, fileUrl, fileName]);

  // Synthesize structured executive brief & takeaways
  const handleSynthesizeSummary = async (force = false) => {
    if ((aiSummary && !force) || isSynthesizing || !fileUrl) return;

    setIsSynthesizing(true);
    setSynthError(null);
    setStreamingText("");

    try {
      const text = await ensureDocumentText();
      const generated = await generateRealDocumentSummary(
        text,
        { name: fileName, ...file },
        (delta, fullSoFar) => {
          setStreamingText(fullSoFar);
        }
      );

      if (generated) {
        setAiSummary(generated);
        try {
          localStorage.setItem(`omnidrive_doc_summary_${fileId}`, JSON.stringify(generated));
        } catch {}
      }
    } catch (err) {
      console.warn("[DocumentAI] Synthesis error:", err);
      setSynthError(err.message || "Failed to generate AI summary.");
    } finally {
      setIsSynthesizing(false);
      setStreamingText("");
    }
  };

  // Auto-synthesize when drawer opens if missing
  useEffect(() => {
    if (isOpen && !aiSummary && !isSynthesizing) {
      handleSynthesizeSummary();
    }
  }, [isOpen]);

  // Copy Summary text
  const handleCopySummary = () => {
    if (!aiSummary?.executive) return;
    navigator.clipboard.writeText(aiSummary.executive);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Handle Send Chat Question
  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isChatSending) return;

    setInputMessage("");
    const userMsg = {
      id: Date.now().toString(),
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsChatSending(true);
    setChatStreamingText("");

    try {
      const docText = await ensureDocumentText();
      const answer = await askDocumentQuestion(
        query,
        docText,
        { name: fileName, summary: aiSummary?.executive },
        messages,
        (delta, fullSoFar) => {
          setChatStreamingText(fullSoFar);
        }
      );

      const assistantMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: answer || "I analyzed the document content.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      console.error("[DocumentAI] Chat error:", err);
      const errorMsg = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        text: `Error: ${err.message || "Could not complete document query."}`,
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsChatSending(false);
      setChatStreamingText("");
    }
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat" && chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, chatStreamingText, activeTab]);

  const metrics = aiSummary?.metrics || computeDocumentMetrics(documentText, fileName);

  return (
    <div
      className={`h-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-3xl flex flex-col shrink-0 z-30 shadow-2xl select-none overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        isOpen
          ? "w-80 sm:w-96 md:w-[420px] opacity-100 translate-x-0 border-l border-slate-200/80 dark:border-white/10 pointer-events-auto"
          : "w-0 opacity-0 translate-x-12 border-0 pointer-events-none"
      }`}
    >
      <div className="w-80 sm:w-96 md:w-[420px] h-full flex flex-col shrink-0">
        {/* Drawer Header Toolbar with Tab Switcher */}
        <div className="px-4 py-2.5 border-b border-slate-200/80 dark:border-white/10 flex items-center justify-between shrink-0 bg-white/80 dark:bg-slate-900/90">
          <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-black/40 border border-slate-200/80 dark:border-white/10 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab("summary")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                activeTab === "summary"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Intelligence & Charts</span>
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 active:scale-95 ${
                activeTab === "chat"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>AI Chat</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all duration-150 active:scale-90 hover:scale-105"
            title="Close Drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* TAB 1: SUMMARY, CHARTS & INTELLIGENCE */}
      {activeTab === "summary" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar text-xs animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
          {/* Engine Header Status Badge */}
          <div className="p-3.5 rounded-2xl bg-purple-500/10 dark:bg-gradient-to-r dark:from-purple-950/40 dark:to-indigo-950/40 border border-purple-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-lg shadow-purple-600/30 shrink-0">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 truncate">
                  {isImage ? "Vision AI Intelligence" : "Document Intelligence"}
                </h4>
                <p className="text-[10px] text-purple-700 dark:text-purple-300 font-mono truncate">
                  {isImage ? "Amazon Rekognition & Vision Engine" : (aiSummary?.model || "OmniDrive Neural Engine")}
                </p>
              </div>
            </div>

            <button
              onClick={() => handleSynthesizeSummary(true)}
              disabled={isSynthesizing}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-700 dark:text-purple-200 text-[10px] font-semibold transition-all duration-150 active:scale-95 hover:scale-105 disabled:opacity-50 shrink-0"
              title="Re-run AI Analysis"
            >
              <RefreshCw className={`w-3 h-3 ${isSynthesizing ? "animate-spin" : ""}`} />
              <span>{isSynthesizing ? "Analyzing…" : "Regenerate"}</span>
            </button>
          </div>

          {/* Synthesis Loading State */}
          {isSynthesizing ? (
            <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting and analyzing document content...</span>
              </div>

              {isExtractingText && extractionProgress && (
                <div className="space-y-1">
                  <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.round(
                          (extractionProgress.current / (extractionProgress.total || 3)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono text-right">
                    Processing OpenXML document chunks...
                  </p>
                </div>
              )}

              {streamingText && (
                <div className="p-3 rounded-xl bg-white/90 dark:bg-black/40 border border-purple-500/30 text-[11px] text-slate-800 dark:text-slate-300 leading-relaxed font-sans shadow-xs">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider mb-1">
                    <Bot className="w-3 h-3" /> Live Generation
                  </div>
                  <p className="whitespace-pre-wrap">{streamingText}</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Executive Brief Card */}
              <div className="bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-purple-700 dark:text-purple-300">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    Executive Brief
                  </span>
                  <button
                    onClick={handleCopySummary}
                    className="hover:text-slate-900 dark:hover:text-white transition-colors"
                    title="Copy summary text"
                  >
                    {copiedSummary ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </button>
                </div>
                <p className="text-slate-700 dark:text-slate-200 leading-relaxed text-xs">
                  {aiSummary?.executive || "Synthesizing executive findings from document..."}
                </p>
              </div>

              {/* Key Takeaways & Findings */}
              {aiSummary?.takeaways && aiSummary.takeaways.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    Key Takeaways & Findings
                  </span>
                  <div className="space-y-2">
                    {aiSummary.takeaways.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-700 dark:text-slate-200"
                      >
                        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5 font-bold">
                          {idx + 1}
                        </div>
                        <p className="text-[11px] leading-relaxed flex-1">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rekognition Visual Objects & Vision AI Tags */}
              {file?.labels && file.labels.length > 0 && (
                <div className="space-y-2">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
                    Vision AI Recognized Objects
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {file.labels.map((lbl, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[11px] font-medium"
                      >
                        <span>{lbl.name}</span>
                        {lbl.confidence && (
                          <span className="text-[9px] opacity-70 font-mono">
                            {Math.round(lbl.confidence)}%
                          </span>
                        )}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Document / Image Metrics Grid */}
              <div className="space-y-2">
                <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-blue-500" />
                  {isImage ? "Image Analytics & Telemetry" : "Document Analytics & Telemetry"}
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <Clock className="w-3 h-3 text-purple-500" />
                      <span>{isImage ? "Pixel Resolution" : "Est. Reading Time"}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono">
                      {isImage
                        ? (file?.dimensions?.width && file?.dimensions?.height
                            ? `${file.dimensions.width}×${file.dimensions.height} px`
                            : "High Resolution")
                        : `${metrics.readingTimeMinutes} min read`}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <FileText className="w-3 h-3 text-blue-500" />
                      <span>{isImage ? "Image Format" : "Total Words"}</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs font-mono uppercase">
                      {isImage
                        ? ((fileName || "").split(".").pop() || "Image")
                        : metrics.words.toLocaleString()}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <Gauge className="w-3 h-3 text-emerald-500" />
                      <span>Complexity Rating</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate block">
                      {metrics.complexity}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span>Domain</span>
                    </div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs truncate block">
                      {metrics.domain}
                    </span>
                  </div>
                </div>
              </div>

              {/* Concept & Topic Distribution Chart */}
              {metrics.topics && metrics.topics.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                    Concept & Topic Distribution
                  </span>
                  <div className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-3">
                    {metrics.topics.map((t, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {t.label}
                          </span>
                          <span className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                            {t.percentage}%
                          </span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${t.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {synthError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{synthError}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: INTERACTIVE AI CHAT */}
      {activeTab === "chat" && (
        <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-black/20 animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
          {/* Scrollable Conversation Stream */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed ${
                    m.role === "user"
                      ? "bg-[#1a73e8] text-white shadow-md shadow-blue-500/20 rounded-br-xs"
                      : "bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-slate-200 shadow-xs rounded-bl-xs"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.timestamp && (
                    <span className="text-[9px] opacity-60 mt-1 block text-right">
                      {m.timestamp}
                    </span>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}

            {/* Live Streaming Message Bubble */}
            {isChatSending && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5 animate-pulse shadow-sm">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="max-w-[85%] rounded-2xl p-3 bg-white dark:bg-slate-800 border border-blue-500/30 text-slate-800 dark:text-slate-200 shadow-xs rounded-bl-xs">
                  {chatStreamingText ? (
                    <p className="whitespace-pre-wrap">{chatStreamingText}</p>
                  ) : (
                    <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 py-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:0.4s]" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompt Suggestion Chips */}
          <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-200/60 dark:border-white/5 bg-white/60 dark:bg-slate-900/60 shrink-0">
            {(isImage
              ? [
                  "Describe visual scene & composition",
                  "What objects & tags were detected?",
                  "Analyze colors, lighting & palette",
                  "Summarize graphic structure & layout",
                ]
              : PROMPT_SUGGESTIONS
            ).map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(suggestion)}
                disabled={isChatSending}
                className="whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 dark:bg-white/5 dark:hover:bg-blue-950/40 text-slate-600 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-300 border border-slate-200/70 dark:border-white/10 text-[10px] font-medium transition-all duration-150 shrink-0 active:scale-90 hover:scale-[1.03] disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-slate-200/80 dark:border-white/10 bg-white/90 dark:bg-slate-900/90 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder={isImage ? "Ask about this image..." : "Ask about this document..."}
                disabled={isChatSending}
                className="flex-1 h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
              />
              <button
                type="submit"
                disabled={!inputMessage.trim() || isChatSending}
                className="h-9 w-9 rounded-xl bg-[#1a73e8] hover:bg-[#1557b0] text-white flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:hover:bg-[#1a73e8] active:scale-90 hover:scale-105 shrink-0 shadow-md shadow-blue-500/25"
                title="Send Question"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default DocumentAiInsightsDrawer;
