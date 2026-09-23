import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const rawBaseUrl = import.meta.env.VITE_NVIDIA_BASE_URL || "/nvidia-api/v1";
// Route directly via Vite dev proxy if integrate.api.nvidia.com is specified to avoid CORS errors
const NVIDIA_BASE_URL = rawBaseUrl.includes("integrate.api.nvidia.com")
  ? rawBaseUrl.replace(/https?:\/\/integrate\.api\.nvidia\.com/, "/nvidia-api")
  : rawBaseUrl;

const MODEL = import.meta.env.VITE_NVIDIA_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";
const MAX_EXTRACT_PAGES = 30; // cap to avoid huge context
const FAST_EXTRACT_PAGES = 10; // pages to extract for fast first summary

/**
 * Extract all readable text from a PDF URL using PDF.js.
 * Returns a plain-text string with page separators.
 *
 * @param {string} pdfUrl   URL of the PDF to extract text from
 * @param {number} maxPages Maximum number of pages to extract (default 30)
 * @param {Function} onProgress  Optional callback: (currentPage, totalPages) => void
 */
export const extractPdfText = async (pdfUrl, maxPages = MAX_EXTRACT_PAGES, onProgress = null) => {
  const loadingTask = pdfjsLib.getDocument({ url: pdfUrl, withCredentials: false });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);
  const pages = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(" ");
    if (pageText.trim()) {
      pages.push(`[Page ${i}]\n${pageText}`);
    }
    // Fire progress callback so the UI can show "Reading page X / Y"
    if (typeof onProgress === "function") {
      onProgress(i, numPages);
    }
  }

  await pdfDoc.destroy();
  return pages.join("\n\n");
};

// ─── Streaming SSE helpers ──────────────────────────────────────────────────

/**
 * Parse a single SSE line and return the delta text (if any).
 * Returns null if the line should be skipped.
 */
const parseSseDelta = (line) => {
  if (!line.startsWith("data: ")) return null;
  const payload = line.slice(6).trim();
  if (payload === "[DONE]") return null;
  try {
    const json = JSON.parse(payload);
    return json.choices?.[0]?.delta?.content ?? null;
  } catch {
    return null;
  }
};

/**
 * Stream a chat completion request and call onChunk(text) for each token.
 * Returns the full accumulated text when the stream ends.
 */
const streamChatCompletion = async (messages, options = {}, onChunk = null) => {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  if (!apiKey || apiKey === "your-nvidia-api-key-here") {
    throw new Error(
      "NVIDIA API Key is missing. Please add VITE_NVIDIA_API_KEY in frontend/.env"
    );
  }

  let response;
  try {
    response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: options.temperature ?? 0.2,
        top_p: options.top_p ?? 0.7,
        max_tokens: options.max_tokens ?? 1024,
        stream: true,
      }),
    });
  } catch (netErr) {
    throw new Error(
      `Network request failed: ${netErr.message}. Ensure the Vite dev server is running with proxy.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    let errorDetail = "";
    try {
      const errorJson = JSON.parse(errorText);
      errorDetail = errorJson.detail || errorJson.message || errorJson.title || "";
    } catch {}

    if (response.status === 403) {
      throw new Error(
        `AI Service Authorization Failed: Your API key is invalid or unauthorized. Please verify your configuration.`
      );
    }
    if (response.status === 410) {
      throw new Error(
        `AI Model Notice: ${errorDetail || "The selected AI model is currently unavailable."}`
      );
    }
    throw new Error(errorDetail || `AI Service error (${response.status})`);
  }

  // Read the SSE stream line by line
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let accumulated = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Split on newlines and process complete lines
    const lines = buffer.split("\n");
    // Keep the last (potentially incomplete) line in the buffer
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const delta = parseSseDelta(line.trim());
      if (delta) {
        accumulated += delta;
        if (typeof onChunk === "function") {
          onChunk(delta, accumulated);
        }
      }
    }
  }

  // Flush any remaining buffer content
  if (buffer.trim()) {
    const delta = parseSseDelta(buffer.trim());
    if (delta) {
      accumulated += delta;
      if (typeof onChunk === "function") {
        onChunk(delta, accumulated);
      }
    }
  }

  return accumulated;
};

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Ask NVIDIA NIM a question about a PDF document.
 * Streams the response token-by-token and calls onChunk(delta, fullSoFar) for each.
 * Returns the full answer string when complete.
 *
 * @param {string}   question   User's question
 * @param {string}   pdfText    Full extracted text of the PDF
 * @param {object}   fileMeta   { name, summary } — extra context
 * @param {Array}    history    Previous messages [{ role, text }]
 * @param {Function} onChunk    Called with (delta, fullTextSoFar) for each streamed token
 * @returns {Promise<string>} Full AI response text
 */
export const askPdfQuestion = async (
  question,
  pdfText,
  fileMeta = {},
  history = [],
  onChunk = null
) => {
  // System prompt — ground the model in the document without raw file name leaks
  const systemPrompt = `You are an intelligent document assistant for OmniDrive AI.
You have been provided with the full extracted text of this document.
Your job is to answer the user's questions accurately and concisely based ONLY on the document content.
If the answer is not in the document, say so clearly rather than guessing.
CRITICAL: Never mention the technical file name or file extension (e.g. do not say .pdf or the filename). The user is already inside the document viewing it. Refer to it naturally as "this document" or by its subject matter.
Format your answers with markdown (bold, bullet lists, headings) where it improves readability.
Keep answers concise — under 300 words unless a longer answer is clearly needed.

${fileMeta.summary ? `Document AI Summary:\n${fileMeta.summary}\n` : ""}
--- DOCUMENT TEXT START ---
${pdfText || "(No text could be extracted from this document.)"}
--- DOCUMENT TEXT END ---`;

  // Build messages array from conversation history
  const messages = [{ role: "system", content: systemPrompt }];

  // Inject previous turns (skip loading/error messages)
  for (const msg of history) {
    if (!msg.loading && !msg.error) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }
  }
  messages.push({ role: "user", content: question });

  return streamChatCompletion(messages, { max_tokens: 1024 }, onChunk);
};

/**
 * Synthesize a real Executive Summary and Key Takeaways from document text using NVIDIA NIM.
 * Streams the JSON response token-by-token and calls:
 *   - onChunk(delta, fullSoFar)  for each raw streaming token (used to show typing in progress)
 *   - resolves with { executive, takeaways, model } when the stream is complete
 *
 * @param {string}   pdfText   Extracted document text
 * @param {Function} onChunk   Optional streaming callback (delta, fullSoFar) => void
 * @returns {Promise<{ executive: string, takeaways: string[], model: string }>}
 */
export const generateRealPdfSummary = async (pdfText, onChunk = null) => {
  const systemPrompt = `You are an expert enterprise document intelligence engine for OmniDrive AI.
Analyze the provided document text and generate a structured executive brief and key takeaways.
CRITICAL RULES:
1. Do NOT mention the technical file name or extension (e.g., .pdf). The user is already inside the document viewer. Refer to it naturally by its actual title or subject (e.g., "This project documentation outlines...", "LexiAssist AI is designed to...").
2. Return ONLY a valid JSON object matching this exact schema:
{
  "summary": "A concise, professional 2-3 sentence executive summary explaining the document's core purpose, context, and primary objective.",
  "takeaways": [
    "First concrete takeaway, statistic, or core feature from the document",
    "Second concrete takeaway, statistic, or core feature from the document",
    "Third concrete takeaway, statistic, or core feature from the document",
    "Fourth concrete takeaway, statistic, or core feature from the document"
  ]
}
Do NOT include markdown backticks like \`\`\`json, no explanations, only the raw JSON string.`;

  const userMessage = `Here is the full text of the document:\n\n${(pdfText || "").slice(0, 15000)}`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage },
  ];

  const fullContent = await streamChatCompletion(
    messages,
    { temperature: 0.2, max_tokens: 800 },
    onChunk
  );

  // Parse JSON safely from the accumulated stream output
  let parsed = null;
  try {
    const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn("Could not parse JSON from NIM stream response, falling back to text:", fullContent);
  }

  if (parsed && parsed.summary) {
    return {
      executive: parsed.summary,
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      model: "OmniDrive Neural Engine",
    };
  }

  // Fallback if model output is plain text (not JSON)
  return {
    executive: fullContent.slice(0, 400),
    takeaways: ["Comprehensive analysis extracted directly from verified document content."],
    model: "OmniDrive Neural Engine",
  };
};
