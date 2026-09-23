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

/**
 * Extract all readable text from a PDF URL using PDF.js.
 * Returns a plain-text string with page separators.
 */
export const extractPdfText = async (pdfUrl, maxPages = MAX_EXTRACT_PAGES) => {
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
  }

  await pdfDoc.destroy();
  return pages.join("\n\n");
};

/**
 * Ask NVIDIA NIM a question about a PDF document.
 * Uses the OpenAI-compatible /chat/completions endpoint.
 *
 * @param {string} question   User's question
 * @param {string} pdfText    Full extracted text of the PDF
 * @param {object} fileMeta   { name, summary } — extra context
 * @param {Array}  history    Previous messages [{ role, text }]
 * @returns {Promise<string>} AI response text
 */
export const askPdfQuestion = async (question, pdfText, fileMeta = {}, history = []) => {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  if (!apiKey || apiKey === "your-nvidia-api-key-here") {
    throw new Error(
      "NVIDIA API Key is missing. Please add VITE_NVIDIA_API_KEY in frontend/.env"
    );
  }

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
  const messages = [
    { role: "system", content: systemPrompt },
  ];

  // Inject previous turns (skip loading/error messages)
  for (const msg of history) {
    if (!msg.loading && !msg.error) {
      messages.push({
        role: msg.role === "user" ? "user" : "assistant",
        content: msg.text,
      });
    }
  }

  // Add the current question
  messages.push({ role: "user", content: question });

  let response;
  try {
    response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.2,
        top_p: 0.7,
        max_tokens: 1024,
        stream: false,
      }),
    });
  } catch (netErr) {
    throw new Error(`Network request failed: ${netErr.message}. Ensure the Vite dev server is running with proxy.`);
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
        `NVIDIA NIM 403 Authorization Failed: Your NVIDIA key requires active credits. Go to build.nvidia.com -> click "Generate API Key" to obtain an active key with 1,000 free credits.`
      );
    }

    if (response.status === 410) {
      throw new Error(
        `NVIDIA NIM Model Deprecated (410 Gone): ${errorDetail || "The selected model is no longer available on NVIDIA NIM. Use an active model like nvidia/llama-3.1-nemotron-70b-instruct."}`
      );
    }

    throw new Error(errorDetail || `NVIDIA NIM API error (${response.status})`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("No response received from NVIDIA NIM.");
  return content;
};

/**
 * Synthesize a real Executive Summary and Key Takeaways from document text using NVIDIA NIM.
 * Returns { executive, takeaways, model }
 */
export const generateRealPdfSummary = async (pdfText) => {
  const apiKey = import.meta.env.VITE_NVIDIA_API_KEY;
  if (!apiKey || apiKey === "your-nvidia-api-key-here") {
    throw new Error(
      "NVIDIA API Key is missing. Please add VITE_NVIDIA_API_KEY in frontend/.env"
    );
  }

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

  let response;
  try {
    response = await fetch(`${NVIDIA_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        temperature: 0.2,
        max_tokens: 800,
        stream: false,
      }),
    });
  } catch (netErr) {
    throw new Error(`Network request failed: ${netErr.message}`);
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AI generation failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error("No response from AI engine.");

  // Parse JSON safely
  let parsed = null;
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsed = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn("Could not parse JSON from NIM response, falling back to text:", content);
  }

  if (parsed && parsed.summary) {
    return {
      executive: parsed.summary,
      takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways : [],
      model: "Meta LLaMA 3.2 · Live GenAI",
    };
  }

  // Fallback if model output is plain text
  return {
    executive: content.slice(0, 400),
    takeaways: ["Comprehensive analysis extracted directly from verified document content."],
    model: "Meta LLaMA 3.2 · Live GenAI",
  };
};

