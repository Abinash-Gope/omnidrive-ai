import { useState, useCallback, useRef } from "react";
import { getOrRenewIdToken } from "../features/auth/api/authApi.jsx";
import {
  generateThumbnail,
  saveThumbnail,
} from "../features/dashboard/utils/thumbnailCache.jsx";

/**
 * OmniDrive AI - Phase 3: Direct S3 Ingestion & Upload Hook
 * File: src/hooks/useFileUpload.jsx
 *
 * Responsibilities:
 * 1. Read active Cognito id_token from localStorage ("idToken" or "authToken").
 * 2. Request an S3 presigned PUT URL via POST /upload-url on API Gateway.
 * 3. Stream the file directly to AWS S3 using XMLHttpRequest with upload.onprogress tracking.
 * 4. Expose clean, reactive upload states:
 *    - uploadFile(file): async trigger
 *    - uploadProgress: 0 to 100
 *    - isUploading: boolean
 *    - isSuccess: boolean
 *    - error: string | null
 *    - uploadedData: object | null
 *    - resetUpload(): resets all states
 */
export const useFileUpload = () => {
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedData, setUploadedData] = useState(null);

  // Keep a ref to XMLHttpRequest in case abort/cancel is needed
  const xhrRef = useRef(null);

  /**
   * Reset all state flags
   */
  const resetUpload = useCallback(() => {
    if (xhrRef.current && xhrRef.current.readyState !== XMLHttpRequest.DONE) {
      xhrRef.current.abort();
    }
    setUploadProgress(0);
    setIsUploading(false);
    setIsSuccess(false);
    setError(null);
    setUploadedData(null);
  }, []);

  /**
   * Main upload execution method
   * @param {File} file - The native browser File object to upload
   * @returns {Promise<object>} Result containing file_id, s3_key, file_name
   */
  const uploadFile = useCallback(async (file) => {
    if (!file) {
      const err = "No file selected for upload.";
      setError(err);
      throw new Error(err);
    }

    // Reset previous run state
    setIsUploading(true);
    setIsSuccess(false);
    setError(null);
    setUploadProgress(0);
    setUploadedData(null);

    // Generate client thumbnail preview
    let thumbData = null;
    try {
      if (file.type?.startsWith("image/")) {
        thumbData = await generateThumbnail(file);
      }
    } catch (tErr) {
      console.warn("Thumbnail generation notice:", tErr);
    }

    try {
      // 1. Obtain fresh Cognito ID token via 7-day persistent auto-renewal
      const idToken = await getOrRenewIdToken();
      if (!idToken) {
        throw new Error("Authentication required: Your session has expired. Please sign in again.");
      }

      // Determine API Gateway base URL from Vite environment variables
      const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "");
      const uploadUrlEndpoint = apiBaseUrl ? `${apiBaseUrl}/upload-url` : "/upload-url";

      // 2. Request S3 Presigned PUT URL from AWS API Gateway
      const payload = {
        file_name: file.name,
        content_type: (file.type || "application/octet-stream").toLowerCase(),
        file_size: file.size || 0,
      };

      const response = await fetch(uploadUrlEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errMessage = `Failed to get upload authorization (HTTP ${response.status})`;
        try {
          const errorData = await response.json();
          if (errorData?.error) {
            errMessage = errorData.error;
          }
        } catch (_) {
          // Ignore JSON parse error on non-json error responses
        }
        throw new Error(errMessage);
      }

      const { upload_url, file_id, s3_key } = await response.json();

      if (!upload_url) {
        throw new Error("API Gateway did not return a valid S3 upload URL.");
      }

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
        if (signedParam) {
          signedHeaders = signedParam.toLowerCase().split(";");
        }
      } catch (_) {}

      // 3. Stream binary directly to S3 via XMLHttpRequest with real-time progress
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhrRef.current = xhr;

        // Track live upload progress
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && event.total > 0) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percent);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setUploadProgress(100);
            resolve();
          } else {
            reject(
              new Error(
                `Direct S3 upload failed (HTTP ${xhr.status}). Please check S3 bucket CORS policy and signature.`
              )
            );
          }
        };

        xhr.onerror = () => {
          reject(
            new Error(
              "Network error during direct S3 upload. Check your internet connection or S3 CORS configuration."
            )
          );
        };

        xhr.onabort = () => {
          reject(new Error("File upload was cancelled."));
        };

        // Initialize PUT request to S3 Presigned URL
        xhr.open("PUT", upload_url, true);

        // Content-Type: Set if signed or default
        if (signedHeaders.length === 0 || signedHeaders.includes("content-type")) {
          xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        }

        // Check if x-amz-meta-* headers were signed
        if (signedHeaders.includes("x-amz-meta-file_id") && file_id) {
          xhr.setRequestHeader("x-amz-meta-file_id", file_id);
        }
        if (signedHeaders.includes("x-amz-meta-original_name") && file.name) {
          xhr.setRequestHeader("x-amz-meta-original_name", file.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
        }

        // CRITICAL: Do NOT send Authorization header to S3; S3 uses pre-authenticated SigV4 query parameters.
        xhr.send(file);
      });

      const result = {
        file_id,
        s3_key,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
        thumbnail: thumbData?.dataUrl || null,
        dimensions: thumbData ? { width: thumbData.width, height: thumbData.height, format: thumbData.format } : null,
      };

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
    uploadFile,
    uploadProgress,
    isUploading,
    isSuccess,
    error,
    uploadedData,
    resetUpload,
  };
};

export default useFileUpload;
