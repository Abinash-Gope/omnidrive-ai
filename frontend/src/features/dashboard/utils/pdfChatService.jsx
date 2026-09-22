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

  // System prompt — ground the model in the document
  const systemPrompt = `You are an intelligent PDF document assistant for OmniDrive AI, a cloud storage platform.
You have been given the full extracted text of the document "${fileMeta.name || "the uploaded PDF"}".
Your job is to answer the user's questions accurately and concisely based ONLY on the document content.
If the answer is not in the document, say so clearly rather than guessing.
Format your answers with markdown (bold, bullet lists, headings) where it improves readability.
Keep answers concise — under 300 words unless a longer answer is clearly needed.

${fileMeta.summary ? `Document AI Summary:\n${fileMeta.summary}\n` : ""}
--- DOCUMENT TEXT START ---
${pdfText || "(No text could be extracted from this PDF.)"}
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
