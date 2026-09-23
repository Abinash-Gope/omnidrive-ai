import axios from "axios";
import axiosInstance from "../../../shared/api/axiosClient.jsx";
import {
  findThumbnail,
  findThumbnailMetadata,
  removeThumbnail,
} from "../utils/thumbnailCache.jsx";

/**
 * Layer 1: Dashboard API Service
 * Pure async functions connecting directly to AWS API Gateway HTTP v2, S3, and DynamoDB.
 */

/**
 * Fetch authenticated user's files from DynamoDB via API Gateway GET /files
 * Multi-tenant isolation is enforced by Cognito JWT authorizer on API Gateway.
 * @returns {Promise<Array>} List of user files or empty array
 */
export const getFilesApi = async () => {
  try {
    const token = localStorage.getItem("idToken") || localStorage.getItem("authToken");
    if (!token) {
      return [];
    }

    const response = await axiosInstance.get("/files");
    const rawFiles = response.data?.files || (Array.isArray(response.data) ? response.data : []);

    const remoteFiles = rawFiles
      .map((item) => {
        const fileId = item.file_id || item.SK?.replace("FILE#", "") || `file-${Date.now()}`;
        const s3Key = item.s3_key || item.s3_raw_key || null;
        const fileName = item.file_name || "Uploaded File";

        // Check persistent client-side thumbnail cache for the uploaded asset
        const cachedThumb = findThumbnail(fileId, s3Key, fileName);
        const cachedMeta = findThumbnailMetadata(fileId, s3Key, fileName);
        const dimensions = item.image_dimensions || item.dimensions || cachedMeta || null;

        // Construct clean metadata / EXIF object
        let exifData = item.exif || null;
        if (!exifData && dimensions) {
          exifData = {
            camera: dimensions.format ? `${dimensions.format} Image File` : "Digital Image",
            lens: dimensions.width ? `${dimensions.width} × ${dimensions.height} px` : "Native Dimensions",
            shutter: dimensions.format ? `Color Profile: sRGB / Raster` : "Standard",
            focalLength: dimensions.width && dimensions.height
              ? `${(dimensions.width / dimensions.height).toFixed(2)}:1 Aspect Ratio`
              : "Native",
          };
        }

        const isVideo = item.content_type?.startsWith("video/") || (fileName && fileName.endsWith(".mp4"));
        const isImage = item.content_type?.startsWith("image/") || (fileName && /\.(jpe?g|png|webp|gif)$/i.test(fileName));
        const isPdf = item.content_type?.includes("pdf") || (fileName && fileName.endsWith(".pdf"));

        return {
          id: fileId,
          name: fileName,
          type: isVideo
            ? "video"
            : isImage
            ? "image"
            : isPdf
            ? "pdf"
            : "other",
          sizeBytes: item.file_size ? Number(item.file_size) : 0,
          size: item.file_size
            ? (item.file_size < 1024 * 1024
                ? `${(item.file_size / 1024).toFixed(1)} KB`
                : `${(item.file_size / (1024 * 1024)).toFixed(1)} MB`)
            : "Unknown",
          createdAt: item.created_at || null,
          date: item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently",
          status: item.status || "PROCESSING",
          moderationPassed: item.status !== "REJECTED_SAFETY_VIOLATION",
          labels: item.labels || [],
          summary: typeof item.summary === "string"
            ? {
                executive: item.summary,
                takeaways: item.key_takeaways || [],
                pages: item.page_count || null,
                model: "OmniDrive Neural Engine",
              }
            : item.summary || null,
          // Resolve thumbnail: for images prefer thumbnail_url -> download_url -> cachedThumb.
          // For videos, NEVER set raw .mp4 download_url as thumbnail (it breaks <img> tags).
          thumbnail: isVideo
            ? (item.thumbnail_url || cachedThumb || null)
            : (item.thumbnail_url || item.download_url || cachedThumb || null),
          // Expose raw download_url so players and preview components can stream directly
          downloadUrl: item.download_url || null,
          hlsUrl: item.hls_master_url || item.hls_url || null,
          dimensions,
          exif: exifData,
          previewSnippet: item.preview_snippet || item.status,
          s3Key: s3Key,
          duration: item.duration || null,
          hlsQualities: item.hls_qualities || ["1080p", "720p", "480p"],
          activeQuality: "720p",
          transcoderInfo: item.transcoder_info || null,
        };
      });

    // When the user is authenticated, the backend (DynamoDB + S3 presigned URLs) is the single
    // source of truth. Do NOT merge localStorage offline files — they are browser-local blobs
    // that cause missing thumbnails and ghost files on other browsers/devices.
    // Only fall back to offline cache when there is truly no network token.
    return remoteFiles;
  } catch (err) {
    if (err.response && err.response.status === 404) {
      return [];
    }
    console.error("Failed to query AWS DynamoDB file registry:", err.message);
    return [];
  }
};

/**
 * Request S3 Presigned PUT URL via API Gateway POST /upload-url
 * @param {object} fileMetadata - { name, contentType, fileSize }
 * @returns {Promise<{ file_id: string, upload_url: string, s3_key: string, expires_in: number }>}
 */
export const getPresignedUrlApi = async (fileMetadata) => {
  const normalizedContentType = (
    fileMetadata.contentType ||
    fileMetadata.type ||
    "application/octet-stream"
  ).toLowerCase();

  const response = await axiosInstance.post("/upload-url", {
    file_name: fileMetadata.name,
    content_type: normalizedContentType,
    file_size: fileMetadata.fileSize || 1024,
  });
  return response.data;
};

/**
 * Binary streaming directly to S3 Presigned PUT URL (Zero web-tier memory consumption)
 * Uses native XMLHttpRequest without Authorization header so AWS S3 SigV4 signature is not invalidated.
 * Dynamically extracts signed headers from the S3 URL path (user_id, file_id, original_name)
 * to guarantee 100% compliance with AWS SigV4 signatures generated by Lambda.
 * @param {string} uploadUrl - Pre-authenticated S3 PUT URL
 * @param {File|Blob} file - Binary file stream
 * @param {function} onProgress - Progress callback (0-100)
 * @param {object} [fileMeta] - Optional file metadata
 */
export const uploadToS3Api = async (uploadUrl, file, onProgress, fileMeta = {}) => {
  if (!uploadUrl) {
    throw new Error("Missing S3 presigned upload URL.");
  }

  // 1. Inspect signed headers from the presigned URL query string
  let signedHeaders = [];
  let pathParts = [];
  try {
    const urlObj = new URL(uploadUrl);
    const signedParam = urlObj.searchParams.get("X-Amz-SignedHeaders");
    if (signedParam) {
      signedHeaders = signedParam.toLowerCase().split(";");
    }
    pathParts = urlObj.pathname.replace(/^\/+/, "").split("/");
  } catch (_) {}

  // Extract metadata directly from the S3 key path: raw/{user_id}/{file_id}/{sanitized_file_name}
  // This guarantees exact alignment with the SigV4 signature generated by AWS Lambda
  const keyUserId = fileMeta.userId || (pathParts.length >= 2 ? decodeURIComponent(pathParts[1]) : null);
  const keyFileId = fileMeta.fileId || (pathParts.length >= 3 ? decodeURIComponent(pathParts[2]) : null);
  const keySanitizedName =
    fileMeta.sanitizedName ||
    (pathParts.length >= 4 ? decodeURIComponent(pathParts.slice(3).join("/")) : null) ||
    fileMeta.name?.replace(/ /g, "_");

  // Content-Type: Set normalized MIME type matching presigned URL
  const contentType =
    fileMeta.contentType ||
    file?.type ||
    "application/octet-stream";

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track real-time byte progress
    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        if (onProgress) onProgress(100);
        resolve({
          status: xhr.status,
          statusText: xhr.statusText,
          headers: xhr.getAllResponseHeaders(),
        });
      } else {
        // Parse AWS S3 Error XML response for precise diagnostics
        let s3ErrorMessage = `S3 direct upload failed with status ${xhr.status}`;
        try {
          if (xhr.responseText) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xhr.responseText, "text/xml");
            const code = xml.getElementsByTagName("Code")[0]?.textContent;
            const message = xml.getElementsByTagName("Message")[0]?.textContent;
            if (code || message) {
              s3ErrorMessage = `${code ? code + ": " : ""}${message || s3ErrorMessage}`;
            }
          }
        } catch (_) {}

        const s3Error = new Error(s3ErrorMessage);
        s3Error.status = xhr.status;
        s3Error.response = {
          status: xhr.status,
          statusText: xhr.statusText,
          data: xhr.responseText,
        };
        s3Error.config = {
          url: uploadUrl,
          method: "put",
        };
        reject(s3Error);
      }
    };

    xhr.onerror = () => {
      const netError = new Error(
        "Network error during direct S3 binary stream. Please check internet connection and S3 CORS configuration."
      );
      netError.config = { url: uploadUrl, method: "put" };
      reject(netError);
    };

    xhr.open("PUT", uploadUrl, true);

    // Set Content-Type if signed or by default
    if (signedHeaders.length === 0 || signedHeaders.includes("content-type")) {
      xhr.setRequestHeader("Content-Type", contentType);
    }

    // Attach x-amz-meta-* headers if signed into SigV4
    if (signedHeaders.includes("x-amz-meta-file_id") && keyFileId) {
      xhr.setRequestHeader("x-amz-meta-file_id", keyFileId);
    }
    if (signedHeaders.includes("x-amz-meta-user_id") && keyUserId) {
      xhr.setRequestHeader("x-amz-meta-user_id", keyUserId);
    }
    if (signedHeaders.includes("x-amz-meta-original_name") && keySanitizedName) {
      xhr.setRequestHeader("x-amz-meta-original_name", keySanitizedName);
    }

    // Send the raw binary stream directly to S3
    xhr.send(file);
  });
};

/**
 * Poll file processing status from DynamoDB via API Gateway GET /files/{fileId}
 * @param {string} fileId - The unique file UUID
 * @returns {Promise<object>} Current processing status and AI extracted metadata
 */
export const pollJobStatusApi = async (fileId) => {
  const response = await axiosInstance.get(`/files/${fileId}`);
  return response.data?.file || response.data;
};

/**
 * Delete file from DynamoDB and S3
 * @param {string} fileId - Unique file ID to remove
 * @param {string} [s3Key] - Optional S3 key for cloud cleanup
 * @param {string} [fileName] - Optional filename
 */
export const deleteFileApi = async (fileId, s3Key, fileName) => {
  // Clean thumbnail cache if available
  try {
    removeThumbnail(fileId, s3Key, fileName);
  } catch {}

  // Delete directly from AWS DynamoDB & S3 via API Gateway
  const token = localStorage.getItem("idToken") || localStorage.getItem("authToken");
  if (token && fileId) {
    const cleanId = String(fileId).replace(/^FILE#/, "").trim();
    try {
      const res = await axiosInstance.delete(`/files/${encodeURIComponent(cleanId)}`, {
        data: { s3_key: s3Key, file_name: fileName },
      });
      console.log("DynamoDB file deleted successfully:", res.data);
    } catch (err) {
      console.error("Failed to delete file from AWS DynamoDB:", err.response?.data || err.message);
      throw new Error(err.response?.data?.error || "Failed to remove file from AWS DynamoDB.");
    }
  }

  return { success: true, fileId };
};
