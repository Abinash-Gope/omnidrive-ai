import axios from "axios";
import axiosInstance from "../../../shared/api/axiosClient.jsx";

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

    return rawFiles.map((item) => ({
      id: item.file_id || item.SK?.replace("FILE#", "") || `file-${Date.now()}`,
      name: item.file_name || "Uploaded File",
      type: item.content_type?.startsWith("video/")
        ? "video"
        : item.content_type?.startsWith("image/")
        ? "image"
        : item.content_type?.includes("pdf")
        ? "pdf"
        : "other",
      size: item.file_size ? `${(item.file_size / (1024 * 1024)).toFixed(1)} MB` : "Unknown",
      date: item.created_at ? new Date(item.created_at).toLocaleDateString() : "Recently",
      status: item.status || "PROCESSING",
      moderationPassed: item.status !== "REJECTED_SAFETY_VIOLATION",
      labels: item.labels || [],
      summary: typeof item.summary === "string"
        ? {
            executive: item.summary,
            takeaways: item.key_takeaways || [],
            pages: item.page_count || 1,
            model: "Amazon Bedrock (Claude 3 Haiku)",
          }
        : item.summary || null,
      thumbnail: item.thumbnail_url || null,
      previewSnippet: item.preview_snippet || item.status,
      s3Key: item.s3_key || null,
      duration: item.duration || null,
      hlsQualities: item.hls_qualities || (item.hls_url ? ["1080p", "720p", "480p"] : []),
      activeQuality: "1080p",
      transcoderInfo: item.transcoder_info || null,
    }));
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
  const response = await axiosInstance.post("/upload-url", {
    file_name: fileMetadata.name,
    content_type: fileMetadata.contentType || "application/octet-stream",
    file_size: fileMetadata.fileSize || 1024,
  });
  return response.data;
};

/**
 * Binary streaming directly to S3 Presigned PUT URL (Zero web-tier memory consumption)
 * Raw axios is used without Authorization header so AWS S3 SigV4 signature is not invalidated.
 * @param {string} uploadUrl - Pre-authenticated S3 PUT URL
 * @param {File|Blob} file - Binary file stream
 * @param {function} onProgress - Progress callback (0-100)
 */
export const uploadToS3Api = async (uploadUrl, file, onProgress) => {
  if (!uploadUrl) {
    throw new Error("Missing S3 presigned upload URL.");
  }

  return await axios.put(uploadUrl, file, {
    headers: {
      "Content-Type": file?.type || "application/octet-stream",
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
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
