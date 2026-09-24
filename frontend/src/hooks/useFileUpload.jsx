import { useState, useCallback, useRef } from "react";
import { getOrRenewIdToken } from "../features/auth/api/authApi.jsx";
import axiosInstance from "../shared/api/axiosClient.jsx";
import {
  generateThumbnail,
  saveThumbnail,
} from "../features/dashboard/utils/thumbnailCache.jsx";
import {
  uploadFileMultipart,
  MULTIPART_CHUNK_SIZE,
} from "./useResumableUpload.js";

/**
 * OmniDrive AI — Multi-File Upload Hook (useFileUpload)
 * File: src/hooks/useFileUpload.jsx
 *
 * Supports multi-file queued uploads with bounded concurrency (2 at a time).
 *
 * Exposed API:
 *   filesQueue      — array of { id, file, name, size, type, progress, status, error, result }
 *   overallProgress — aggregate 0-100 value across all files (byte-weighted)
 *   isUploading     — true while any file is actively uploading
 *   isAllDone       — true when every queued file has completed or failed
 *   hasError        — true if at least one file failed
 *   stageFiles(files)      — add File[] to the staging queue (before upload starts)
 *   removeFile(id)         — remove a file from the staging queue
 *   clearQueue()           — reset everything
 *   startUpload(onFileComplete) — begin processing the queue (concurrency 2)
 *   retryFailed(onFileComplete) — retry files whose status is "error"
 *
 * Legacy single-file API (used by useDashboard executePipeline):
 *   uploadFile(file) — async, returns result, sets uploadProgress / isSuccess / error
 *   uploadProgress
 *   isSuccess
 *   error
 *   uploadedData
 *   resetUpload()
 */

// Supported MIME type groups
const ACCEPTED_TYPES = ["image/", "video/", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 * 1024; // 5 GB guard
const CONCURRENCY = 2;

let _nextId = 1;
const nextId = () => `uf_${_nextId++}_${Date.now()}`;

/** Build a queue item from a raw File */
const makeQueueItem = (file) => ({
  id: nextId(),
  file,
  name: file.name,
  size: file.size,
  type: file.type || "",
  progress: 0,
  status: "pending", // "pending" | "uploading" | "completed" | "error"
  error: null,
  result: null,
});

/** True if the file passes type/size guard */
const isFileAccepted = (file) => {
  const mime = file.type || "";
  const accepted = ACCEPTED_TYPES.some((t) => mime.startsWith(t));
  return accepted && file.size <= MAX_FILE_SIZE_BYTES;
};

// ---------------------------------------------------------------------------
// Core single-file upload (shared between legacy and queue modes)
// ---------------------------------------------------------------------------
async function uploadSingleFile(file, onProgress) {
  let thumbData = null;
  try {
    if (file.type?.startsWith("image/") || file.type?.startsWith("video/")) {
      thumbData = await generateThumbnail(file);
    }
  } catch (_) {}

  // Delegate files > 5MB to S3 Transfer-Accelerated 5MB chunked multipart uploads
  if (file.size > MULTIPART_CHUNK_SIZE) {
    const mpResult = await uploadFileMultipart(file, {
      onProgress: (percent, xhr) => {
        onProgress?.(percent, xhr);
      },
      onXhrCreated: (xhr) => {
        onProgress?.(null, xhr);
      },
    });

    if (thumbData?.dataUrl && mpResult.file_id) {
      saveThumbnail([mpResult.file_id, mpResult.s3_key, file.name], thumbData.dataUrl, {
        width: thumbData.width,
        height: thumbData.height,
        format: thumbData.format,
      });
    }

    return {
      file_id: mpResult.file_id,
      s3_key: mpResult.s3_key,
      file_name: file.name,
      file_size: file.size,
      file_type: file.type,
      thumbnail: thumbData?.dataUrl || null,
      dimensions: thumbData
        ? { width: thumbData.width, height: thumbData.height, format: thumbData.format }
        : null,
    };
  }

  let data;
  try {
    const res = await axiosInstance.post("/upload-url", {
      file_name: file.name,
      content_type: (file.type || "application/octet-stream").toLowerCase(),
      file_size: file.size || 0,
    });
    data = res.data;
  } catch (err) {
    if (err.response?.status === 401) {
      throw new Error("Your authentication session has expired (HTTP 401). Please sign in again.");
    }
    const msg = err.response?.data?.error || err.message || `Failed to get upload authorization (${err.response?.status || "network error"}).`;
    throw new Error(msg);
  }

  const { upload_url, file_id, s3_key } = data;
  if (!upload_url) throw new Error("API Gateway did not return a valid S3 upload URL.");

  // Persist thumbnail in client storage
  if (thumbData?.dataUrl && file_id) {
    saveThumbnail([file_id, s3_key, file.name], thumbData.dataUrl, {
      width: thumbData.width,
      height: thumbData.height,
      format: thumbData.format,
    });
  }

  // Inspect signed headers
  let signedHeaders = [];
  try {
    const urlObj = new URL(upload_url);
    const signedParam = urlObj.searchParams.get("X-Amz-SignedHeaders");
    if (signedParam) signedHeaders = signedParam.toLowerCase().split(";");
  } catch (_) {}

  // Stream directly to S3 via XMLHttpRequest
  await new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress?.(percent, xhr);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100, xhr);
        resolve();
      } else {
        reject(new Error(`S3 upload failed (HTTP ${xhr.status}). Check CORS policy.`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during S3 upload. Check connection/CORS."));
    xhr.onabort = () => reject(new Error("File upload was cancelled."));

    xhr.open("PUT", upload_url, true);
    onProgress?.(0, xhr);

    if (signedHeaders.length === 0 || signedHeaders.includes("content-type")) {
      xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    }
    if (signedHeaders.includes("x-amz-meta-file_id") && file_id) {
      xhr.setRequestHeader("x-amz-meta-file_id", file_id);
    }
    if (signedHeaders.includes("x-amz-meta-original_name") && file.name) {
      xhr.setRequestHeader("x-amz-meta-original_name", file.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
    }

    xhr.send(file);
  });

  const result = {
    file_id,
    s3_key,
    file_name: file.name,
    file_size: file.size,
    file_type: file.type,
    thumbnail: thumbData?.dataUrl || null,
    dimensions: thumbData
      ? { width: thumbData.width, height: thumbData.height, format: thumbData.format }
      : null,
  };

  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export const useFileUpload = () => {
  // ── Multi-file queue state ──────────────────────────────────────────────
  const [filesQueue, setFilesQueue] = useState([]); // QueueItem[]
  const filesQueueRef = useRef(filesQueue);
  filesQueueRef.current = filesQueue;
  const isProcessingRef = useRef(false);
  const activeXhrsRef = useRef(new Map());

  // ── Legacy single-file state (for PipelineDrawer / UploadModal legacy) ──
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);
  const xhrRef = useRef(null);

  // ── Helpers ────────────────────────────────────────────────────────────

  /** Update a single queue item by id */
  const patchItem = useCallback((id, patch) => {
    setFilesQueue((prev) => {
      const updated = prev.map((item) => (item.id === id ? { ...item, ...patch } : item));
      filesQueueRef.current = updated;
      return updated;
    });
  }, []);

  // ── Queue mutation ──────────────────────────────────────────────────────

  /** Stage one or more File objects. Ignores unsupported types and deduplicates identical files. Returns list of rejected file names. */
  const stageFiles = useCallback((files) => {
    const rejected = [];
    const existingSignatures = new Set(
      filesQueueRef.current.map((item) => `${item.name}-${item.size}-${item.file?.lastModified || 0}`)
    );
    const newItems = [];
    Array.from(files || []).forEach((f) => {
      if (!isFileAccepted(f)) {
        rejected.push(f.name);
        return;
      }
      const sig = `${f.name}-${f.size}-${f.lastModified || 0}`;
      if (existingSignatures.has(sig)) {
        // File is already in the queue, skip duplicate
        return;
      }
      existingSignatures.add(sig);
      newItems.push(makeQueueItem(f));
    });

    if (newItems.length > 0) {
      const updated = [...filesQueueRef.current, ...newItems];
      filesQueueRef.current = updated;
      setFilesQueue(updated);
    }
    return rejected;
  }, []);

  /** Remove a single pending item from the queue (cannot remove an active upload) */
  const removeFile = useCallback((id) => {
    const updated = filesQueueRef.current.filter((item) => item.id !== id || item.status !== "pending");
    filesQueueRef.current = updated;
    setFilesQueue(updated);
  }, []);

  /** Clear entire queue (only when not actively uploading) */
  const clearQueue = useCallback(() => {
    if (isProcessingRef.current) return;
    filesQueueRef.current = [];
    setFilesQueue([]);
  }, []);

  // ── Computed derived values ─────────────────────────────────────────────

  const isUploading_multi = filesQueue.some((i) => i.status === "uploading");
  const isAllDone =
    filesQueue.length > 0 &&
    filesQueue.every((i) => i.status === "completed" || i.status === "error");
  const hasError = filesQueue.some((i) => i.status === "error");

  // Byte-weighted overall progress across all files
  const overallProgress = (() => {
    if (filesQueue.length === 0) return 0;
    const totalBytes = filesQueue.reduce((s, i) => s + (i.size || 1), 0);
    const doneBytes = filesQueue.reduce((s, i) => {
      if (i.status === "completed") return s + (i.size || 1);
      if (i.status === "uploading") return s + ((i.size || 1) * i.progress) / 100;
      return s;
    }, 0);
    return Math.round((doneBytes / totalBytes) * 100);
  })();

  // ── Queue processor ────────────────────────────────────────────────────

  /**
   * Processes the queue with bounded concurrency without re-entrant state updates.
   * @param {function} onFileComplete - called with result for each successfully uploaded file
   */
  const startUpload = useCallback(
    (onFileComplete) => {
      if (isProcessingRef.current) return;

      const currentPending = filesQueueRef.current.filter((i) => i.status === "pending");
      if (currentPending.length === 0) return;

      isProcessingRef.current = true;

      const runWorker = async () => {
        while (isProcessingRef.current) {
          // Synchronously grab next pending item from filesQueueRef
          const targetItem = filesQueueRef.current.find((i) => i.status === "pending");
          if (!targetItem) break;

          // Immediately mutate and notify React so another worker cannot pick this item
          targetItem.status = "uploading";
          targetItem.progress = 0;
          setFilesQueue([...filesQueueRef.current]);

          try {
            const result = await uploadSingleFile(targetItem.file, (percent, xhr) => {
              if (xhr) activeXhrsRef.current.set(targetItem.id, xhr);
              if (typeof percent === "number") {
                targetItem.progress = percent;
                setFilesQueue([...filesQueueRef.current]);
              }
            });
            activeXhrsRef.current.delete(targetItem.id);

            targetItem.status = "completed";
            targetItem.progress = 100;
            targetItem.result = result;
            setFilesQueue([...filesQueueRef.current]);

            onFileComplete?.(result);
          } catch (err) {
            activeXhrsRef.current.delete(targetItem.id);
            targetItem.status = "error";
            targetItem.error = err.message || "Upload failed";
            setFilesQueue([...filesQueueRef.current]);
          }
        }
      };

      // Launch CONCURRENCY parallel workers
      const workerCount = Math.min(CONCURRENCY, currentPending.length);
      const workers = Array.from({ length: workerCount }, () => runWorker());

      Promise.all(workers).finally(() => {
        const stillPending = filesQueueRef.current.some((i) => i.status === "pending");
        if (!stillPending) {
          isProcessingRef.current = false;
        }
      });
    },
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** Retry only failed items */
  const retryFailed = useCallback(
    (onFileComplete) => {
      filesQueueRef.current = filesQueueRef.current.map((i) =>
        i.status === "error" ? { ...i, status: "pending", error: null, progress: 0 } : i
      );
      setFilesQueue([...filesQueueRef.current]);
      setTimeout(() => {
        isProcessingRef.current = false;
        startUpload(onFileComplete);
      }, 50);
    },
    [startUpload]
  );

  // ── Legacy single-file API ─────────────────────────────────────────────

  const resetUpload = useCallback(() => {
    isProcessingRef.current = false;
    activeXhrsRef.current.forEach((xhr) => {
      try {
        xhr.abort();
      } catch (_) {}
    });
    activeXhrsRef.current.clear();
    if (xhrRef.current && xhrRef.current.readyState !== XMLHttpRequest.DONE) {
      xhrRef.current.abort();
    }
    setUploadProgress(0);
    setIsUploading(false);
    setIsSuccess(false);
    setError(null);
    setUploadedData(null);
    filesQueueRef.current = [];
    setFilesQueue([]);
  }, []);

  /**
   * Legacy single-file upload used by useDashboard (PipelineDrawer flow).
   * Returns the upload result object.
   */
  const uploadFile = useCallback(async (file) => {
    if (!file) {
      const err = "No file selected for upload.";
      setError(err);
      throw new Error(err);
    }

    setIsUploading(true);
    setIsSuccess(false);
    setError(null);
    setUploadProgress(0);
    setUploadedData(null);

    try {
      const result = await uploadSingleFile(file, (percent, xhr) => {
        if (xhr) xhrRef.current = xhr;
        if (typeof percent === "number") {
          setUploadProgress(percent);
        }
      });

      setUploadedData(result);
      setIsSuccess(true);
      setIsUploading(false);
      return result;
    } catch (err) {
      const msg = err.message || "An unexpected error occurred during upload.";
      setError(msg);
      setIsUploading(false);
      setIsSuccess(false);
      throw err;
    }
  }, []);

  return {
    // ── Multi-file API ─────────────────────────
    filesQueue,
    overallProgress,
    isUploading: isUploading_multi || isUploading,
    isAllDone,
    hasError,
    stageFiles,
    removeFile,
    clearQueue,
    startUpload,
    retryFailed,

    // ── Legacy single-file API ──────────────────
    uploadFile,
    uploadProgress,
    isSuccess,
    error,
    uploadedData,
    resetUpload,
  };
};

export default useFileUpload;
