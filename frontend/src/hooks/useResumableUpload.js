/**
 * OmniDrive AI — Resumable Chunked Multipart Upload Hook (useResumableUpload)
 * File: src/hooks/useResumableUpload.js
 *
 * Implements resilient 5MB S3 multipart chunking with exponential backoff retry.
 * Designed for 3G cellular stability: if a packet drops mid-upload, only the
 * affected 5MB part is retried (up to 5 attempts) instead of restarting the entire file.
 */

import { useState, useRef, useCallback } from "react";
import { getOrRenewIdToken } from "../features/auth/api/authApi.jsx";
import axiosInstance from "../shared/api/axiosClient.jsx";

// Minimum S3 multipart upload chunk size: 5MB
export const MULTIPART_CHUNK_SIZE = 5 * 1024 * 1024;
export const MAX_CHUNK_RETRIES = 5;

/** Exponential backoff delay with jitter (capped at 10s) */
const getBackoffDelay = (attempt) => {
  const base = Math.min(1000 * Math.pow(2, attempt), 10000);
  const jitter = Math.random() * 500;
  return base + jitter;
};

/** Get configured API Gateway base URL */
const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || "";
  return envUrl.replace(/\/+$/, "");
};

/** Resolve robust MIME type from file.type or file extension */
export function resolveMimeType(file) {
  if (file.type && file.type !== "application/octet-stream" && file.type !== "binary/octet-stream") {
    return file.type.toLowerCase();
  }
  const ext = (file.name || "").split(".").pop().toLowerCase();
  const mimeMap = {
    // Video
    mp4: "video/mp4",
    mov: "video/quicktime",
    mkv: "video/x-matroska",
    webm: "video/webm",
    avi: "video/x-msvideo",
    m4v: "video/mp4",
    "3gp": "video/3gpp",
    ts: "video/mp2t",
    // Images
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
    avif: "image/avif",
    tiff: "image/tiff",
    tif: "image/tiff",
    heic: "image/heic",
    heif: "image/heif",
    raw: "image/x-raw",
    dng: "image/x-adobe-dng",
    // PDF & Documents
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    dot: "application/msword",
    dotx: "application/vnd.openxmlformats-officedocument.wordprocessingml.template",
    docm: "application/vnd.ms-word.document.macroEnabled.12",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    xls: "application/vnd.ms-excel",
    xlt: "application/vnd.ms-excel",
    xltx: "application/vnd.openxmlformats-officedocument.spreadsheetml.template",
    xlsm: "application/vnd.ms-excel.sheet.macroEnabled.12",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ppt: "application/vnd.ms-powerpoint",
    pot: "application/vnd.ms-powerpoint",
    potx: "application/vnd.openxmlformats-officedocument.presentationml.template",
    pps: "application/vnd.ms-powerpoint",
    ppsx: "application/vnd.openxmlformats-officedocument.presentationml.slideshow",
    pptm: "application/vnd.ms-powerpoint.presentation.macroEnabled.12",
    odt: "application/vnd.oasis.opendocument.text",
    ods: "application/vnd.oasis.opendocument.spreadsheet",
    odp: "application/vnd.oasis.opendocument.presentation",
    rtf: "application/rtf",
    pages: "application/vnd.apple.pages",
    key: "application/vnd.apple.keynote",
    numbers: "application/vnd.apple.numbers",
    epub: "application/epub+zip",
    // Tabular Data / CSV
    csv: "text/csv",
    tsv: "text/tab-separated-values",
    // Code & Markup
    js: "text/javascript",
    jsx: "text/javascript",
    ts: "text/typescript",
    tsx: "text/typescript",
    py: "text/x-python",
    json: "application/json",
    html: "text/html",
    css: "text/css",
    sql: "application/sql",
    sh: "application/x-sh",
    bash: "application/x-sh",
    yml: "text/yaml",
    yaml: "text/yaml",
    env: "text/plain",
    xml: "application/xml",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    java: "text/x-java",
    rs: "text/x-rust",
    go: "text/x-go",
    php: "application/x-httpd-php",
    // Markdown & Text
    md: "text/markdown",
    markdown: "text/markdown",
    txt: "text/plain",
    log: "text/plain",
    // Audio
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    aac: "audio/aac",
    flac: "audio/flac",
    m4a: "audio/mp4",
    wma: "audio/x-ms-wma",
    // Archives
    zip: "application/zip",
    tar: "application/x-tar",
    gz: "application/gzip",
    rar: "application/vnd.rar",
    "7z": "application/x-7z-compressed",
  };
  return mimeMap[ext] || "application/octet-stream";
}

/** Determine high-level file type category for routing, badges, and viewports */
export function inferFileTypeCategory(fileName = "", mimeType = "") {
  const name = (fileName || "").toLowerCase();
  const mime = (mimeType || "").toLowerCase();

  if (mime.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(name)) {
    return "video";
  }
  if (mime.startsWith("image/") || /\.(jpe?g|png|webp|gif|svg|bmp|ico|avif|heic|heif|tiff?|raw|dng|psd)$/i.test(name)) {
    return "image";
  }
  if (mime.includes("pdf") || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (
    /\.(docx?|dotx?|docm|pptx?|potx?|ppsx?|pptm|xlsx?|xltx?|xlsm|odt|ods|odp|rtf|pages|key|numbers|epub)$/i.test(
      name
    ) ||
    mime.includes("wordprocessingml") ||
    mime.includes("presentationml") ||
    mime.includes("spreadsheetml") ||
    mime.includes("msword") ||
    mime.includes("ms-powerpoint") ||
    mime.includes("ms-excel")
  ) {
    return "document";
  }
  if (mime.includes("csv") || /\.(csv|tsv)$/i.test(name)) {
    return "csv";
  }
  if (
    /\.(js|jsx|ts|tsx|py|json|html|css|sql|sh|bash|yml|yaml|env|xml|c|cpp|h|java|rs|go|php)$/i.test(
      name
    )
  ) {
    return "code";
  }
  if (mime.startsWith("audio/") || /\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(name)) {
    return "audio";
  }
  if (/\.(md|markdown|txt|log)$/i.test(name)) {
    return "markdown";
  }
  if (/\.(zip|tar|gz|rar|7z|exe|bin|iso)$/i.test(name)) {
    return "archive";
  }
  return "binary";
}

/**
 * Low-level function to upload a file via S3 multipart chunks.
 *
 * @param {File} file - Browser File object
 * @param {Object} options
 * @param {Function} options.onProgress - (percent: number, xhr?: XMLHttpRequest) => void
 * @param {AbortSignal} options.signal - AbortSignal for user cancellation
 * @param {Function} options.onXhrCreated - (xhr: XMLHttpRequest) => void
 * @returns {Promise<Object>} Completed upload result { file_id, s3_key, file_name, file_size, file_type }
 */
export async function uploadFileMultipart(file, options = {}) {
  const { onProgress, signal, onXhrCreated } = options;

  const idToken = await getOrRenewIdToken();
  if (!idToken) {
    throw new Error("Your authentication session has expired. Please sign in again.");
  }

  const detectedMime = resolveMimeType(file);

  // Step 1: Initiate S3 Multipart Upload via authenticated Axios client
  let initData;
  try {
    const initRes = await axiosInstance.post(
      "/upload-url",
      {
        action: "initiate_multipart",
        file_name: file.name,
        file_type: detectedMime,
        file_size: file.size,
      },
      { signal }
    );
    initData = initRes.data;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("Your authentication session has expired (HTTP 401). Please sign in again.");
    }
    const msg = err.response?.data?.error || err.message || `Failed to initiate multipart upload (${err.response?.status || "network error"}).`;
    throw new Error(msg);
  }
  const uploadId = initData.upload_id || initData.uploadId;
  const s3Key = initData.s3_key || initData.file_key || initData.fileKey || initData.s3_raw_key;
  const fileId = initData.file_id || initData.fileId;

  // Seamless fallback: If backend returns direct presigned PUT URL (S3 supports up to 5 GB single-part PUT)
  if (!uploadId && initData.upload_url) {
    const uploadUrl = initData.upload_url;
    const resolvedFileId = fileId || `file_${Date.now()}`;
    const resolvedS3Key = s3Key || `raw/${file.name}`;

    // Inspect signed headers
    let signedHeaders = [];
    try {
      const urlObj = new URL(uploadUrl);
      const signedParam = urlObj.searchParams.get("X-Amz-SignedHeaders");
      if (signedParam) signedHeaders = signedParam.toLowerCase().split(";");
    } catch (_) {}

    await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      onXhrCreated?.(xhr);

      if (signal) {
        signal.addEventListener("abort", () => xhr.abort(), { once: true });
      }

      xhr.upload.onprogress = (evt) => {
        if (evt.lengthComputable && evt.total > 0) {
          const percent = Math.min(99, Math.round((evt.loaded / evt.total) * 100));
          onProgress?.(percent, xhr);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100, xhr);
          resolve();
        } else {
          reject(new Error(`S3 direct upload failed with HTTP ${xhr.status}. Check CORS/permissions.`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during S3 upload. Check internet connection or CORS."));
      xhr.onabort = () => reject(new Error("Upload cancelled by user."));

      xhr.open("PUT", uploadUrl, true);
      onProgress?.(0, xhr);

      const contentType = detectedMime;
      if (signedHeaders.length === 0 || signedHeaders.includes("content-type")) {
        xhr.setRequestHeader("Content-Type", contentType);
      }
      xhr.send(file);
    });

    return {
      file_id: resolvedFileId,
      s3_key: resolvedS3Key,
      file_name: file.name,
      file_size: file.size,
      file_type: detectedMime,
      status: "PENDING_PROCESSING",
    };
  }

  if (!uploadId || !s3Key) {
    throw new Error("Backend did not return valid multipart upload identifiers.");
  }

  // Step 2: Slice file into 5MB chunks and upload sequentially with retries
  const totalParts = Math.ceil(file.size / MULTIPART_CHUNK_SIZE);
  const completedParts = [];
  let totalUploadedBytes = 0;

  for (let partIndex = 0; partIndex < totalParts; partIndex++) {
    if (signal?.aborted) {
      throw new Error("Upload cancelled by user.");
    }

    const partNumber = partIndex + 1;
    const start = partIndex * MULTIPART_CHUNK_SIZE;
    const end = Math.min(start + MULTIPART_CHUNK_SIZE, file.size);
    const partBlob = file.slice(start, end);
    const partSize = end - start;

    let partSuccess = false;
    let lastPartError = null;

    for (let attempt = 0; attempt < MAX_CHUNK_RETRIES; attempt++) {
      if (signal?.aborted) {
        throw new Error("Upload cancelled by user.");
      }

      try {
        // Fetch presigned URL for this specific part via authenticated Axios client
        let partUrlData;
        try {
          const partUrlRes = await axiosInstance.post(
            "/upload-url",
            {
              action: "part_url",
              file_key: s3Key,
              upload_id: uploadId,
              part_number: partNumber,
            },
            { signal }
          );
          partUrlData = partUrlRes.data;
        } catch (err) {
          if (err.response?.status === 401) {
            throw new Error("Your authentication session has expired. Please sign in again.");
          }
          throw new Error(`Failed to get presigned URL for part ${partNumber}: ${err.message}`);
        }
        const presignedUrl = partUrlData.presigned_url || partUrlData.presignedUrl;
        if (!presignedUrl) {
          throw new Error(`Presigned URL missing for part ${partNumber}`);
        }

        // Upload part blob to S3 via XHR (with fine-grained progress)
        const etag = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          onXhrCreated?.(xhr);

          if (signal) {
            signal.addEventListener("abort", () => xhr.abort(), { once: true });
          }

          xhr.upload.onprogress = (evt) => {
            if (evt.lengthComputable && evt.total > 0) {
              const currentChunkLoaded = evt.loaded;
              const currentOverall = totalUploadedBytes + currentChunkLoaded;
              const percent = Math.min(99, Math.round((currentOverall / file.size) * 100));
              onProgress?.(percent, xhr);
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const rawEtag = xhr.getResponseHeader("ETag") || "";
              const cleanEtag = rawEtag.replace(/^"|"$/g, "").trim();
              if (!cleanEtag) {
                // If ETag header is masked by browser, provide a dummy fallback
                resolve(`part-${partNumber}`);
              } else {
                resolve(cleanEtag);
              }
            } else {
              reject(new Error(`S3 returned HTTP ${xhr.status} for part ${partNumber}`));
            }
          };

          xhr.onerror = () => reject(new Error(`Network error uploading part ${partNumber}`));
          xhr.onabort = () => reject(new Error("Upload cancelled"));

          xhr.open("PUT", presignedUrl, true);
          xhr.send(partBlob);
        });

        completedParts.push({ PartNumber: partNumber, ETag: etag });
        totalUploadedBytes += partSize;
        const progressPercent = Math.min(99, Math.round((totalUploadedBytes / file.size) * 100));
        onProgress?.(progressPercent);

        partSuccess = true;
        break; // Successfully uploaded this part, exit retry loop
      } catch (err) {
        lastPartError = err;
        if (signal?.aborted || err.message === "Upload cancelled") {
          throw err;
        }

        // Wait with exponential backoff before retrying this chunk
        if (attempt < MAX_CHUNK_RETRIES - 1) {
          const delay = getBackoffDelay(attempt);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (!partSuccess) {
      throw new Error(
        `Failed to upload part ${partNumber}/${totalParts} after ${MAX_CHUNK_RETRIES} attempts. ` +
        `Connection dropped: ${lastPartError?.message || "Unknown error"}`
      );
    }
  }

  // Step 3: Complete Multipart Upload via authenticated Axios client
  try {
    await axiosInstance.post(
      "/upload-url",
      {
        action: "complete_multipart",
        file_key: s3Key,
        upload_id: uploadId,
        file_id: fileId,
        parts: completedParts,
      },
      { signal }
    );
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("Your authentication session has expired. Please sign in again.");
    }
    const msg = err.response?.data?.error || err.message || `Failed to finalize multipart upload (${err.response?.status || "network error"}).`;
    throw new Error(msg);
  }

  onProgress?.(100);

  return {
    file_id: fileId,
    s3_key: s3Key,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    status: "PENDING_PROCESSING",
  };
}

/**
 * React hook exposing resumable chunked multipart uploads with state.
 */
export const useResumableUpload = () => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const abortControllerRef = useRef(null);
  const activeXhrRef = useRef(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (activeXhrRef.current && activeXhrRef.current.readyState !== XMLHttpRequest.DONE) {
      try {
        activeXhrRef.current.abort();
      } catch (_) {}
    }
    setIsUploading(false);
  }, []);

  const reset = useCallback(() => {
    abort();
    setProgress(0);
    setError(null);
    setResult(null);
  }, [abort]);

  const uploadFileInChunks = useCallback(
    async (file, onChunkProgress) => {
      reset();
      setIsUploading(true);
      setError(null);
      setProgress(0);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const uploadResult = await uploadFileMultipart(file, {
          signal: controller.signal,
          onProgress: (pct, xhr) => {
            setProgress(pct);
            onChunkProgress?.(pct, xhr);
          },
          onXhrCreated: (xhr) => {
            activeXhrRef.current = xhr;
          },
        });

        setResult(uploadResult);
        setProgress(100);
        setIsUploading(false);
        return uploadResult;
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(err.message || "Multipart upload failed");
        }
        setIsUploading(false);
        throw err;
      }
    },
    [reset]
  );

  return {
    uploadFileInChunks,
    abort,
    reset,
    progress,
    isUploading,
    error,
    result,
  };
};

export default useResumableUpload;
