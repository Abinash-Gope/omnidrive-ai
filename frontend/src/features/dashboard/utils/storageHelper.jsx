/**
 * OmniDrive AI - Storage Calculation & Metric Formatter
 * File: src/features/dashboard/utils/storageHelper.jsx
 *
 * Provides high-precision byte tracking, dynamic unit formatting (KB/MB/GB),
 * category aggregation, and 15GB Free Tier quota calculations.
 */

export const FREE_TIER_LIMIT_BYTES = 15 * 1024 * 1024 * 1024; // 15 GB = 16,106,127,360 bytes

/**
 * Converts raw bytes into a clean, human-readable storage string.
 * Examples: 340 KB, 14.5 MB, 1.34 GB, 2.1 TB
 * @param {number} bytes
 * @param {number} decimals
 * @returns {string}
 */
export const formatStorageBytes = (bytes, decimals = 1) => {
  if (!bytes || bytes <= 0 || isNaN(bytes)) return "0 MB";

  const k = 1024;
  if (bytes < k * k) {
    return `${(bytes / k).toFixed(decimals)} KB`;
  }
  if (bytes < k * k * k) {
    return `${(bytes / (k * k)).toFixed(decimals)} MB`;
  }
  if (bytes < k * k * k * k) {
    return `${(bytes / (k * k * k)).toFixed(2)} GB`;
  }
  return `${(bytes / (k * k * k * k)).toFixed(2)} TB`;
};

/**
 * Returns a human-friendly usage percentage string.
 * Examples: 0%, < 0.1%, 1.4%, 45%
 * @param {number} usedBytes
 * @param {number} totalBytes
 * @returns {string}
 */
export const formatStoragePercent = (usedBytes, totalBytes) => {
  if (!usedBytes || usedBytes <= 0 || !totalBytes || totalBytes <= 0) return "0%";

  const ratio = (usedBytes / totalBytes) * 100;
  if (ratio > 0 && ratio < 0.1) return "< 0.1%";
  if (ratio < 10) return `${ratio.toFixed(1)}%`;
  return `${Math.min(100, Math.round(ratio))}%`;
};

/**
 * Aggregates exact bytes and categorizes storage by media format.
 * @param {Array} files - List of file objects with sizeBytes or size
 * @param {number} [totalGB=15.0] - Target quota in GB (default 15.0)
 * @returns {Object} Comprehensive storage metadata
 */
export const calculateStorageFromFiles = (files = [], totalGB = 15.0) => {
  const safeFiles = Array.isArray(files) ? files : [];
  const totalLimitBytes = totalGB * 1024 * 1024 * 1024;

  let totalBytes = 0;
  let imagesBytes = 0;
  let videosBytes = 0;
  let documentsBytes = 0;
  let otherBytes = 0;

  safeFiles.forEach((f) => {
    // Extract exact bytes
    let bytes = Number(f.sizeBytes);
    if (isNaN(bytes) || bytes <= 0) {
      // Fallback: parse string like "1.5 MB" or "300 KB"
      const sizeStr = String(f.size || "").toLowerCase();
      const num = parseFloat(sizeStr) || 0;
      if (sizeStr.includes("gb")) bytes = Math.round(num * 1024 * 1024 * 1024);
      else if (sizeStr.includes("kb")) bytes = Math.round(num * 1024);
      else bytes = Math.round(num * 1024 * 1024); // default MB
    }

    totalBytes += bytes;

    const mime = (f.contentType || f.type || "").toLowerCase();
    const name = (f.name || "").toLowerCase();

    if (mime.includes("image") || /\.(png|jpg|jpeg|webp|gif)$/i.test(name)) {
      imagesBytes += bytes;
    } else if (mime.includes("video") || /\.(mp4|mov|mkv|avi)$/i.test(name)) {
      videosBytes += bytes;
    } else if (
      mime.includes("pdf") ||
      mime.includes("officedocument") ||
      mime.includes("wordprocessingml") ||
      mime.includes("presentationml") ||
      mime.includes("spreadsheetml") ||
      mime.includes("msword") ||
      mime.includes("powerpoint") ||
      /\.(pdf|docx?|dotx?|docm|pptx?|potx?|ppsx?|pptm|xlsx?|xltx?|xlsm|odt|ods|odp|rtf|txt|pages|key|numbers|epub)$/i.test(name)
    ) {
      documentsBytes += bytes;
    } else {
      otherBytes += bytes;
    }
  });

  const rawPercent = totalLimitBytes > 0 ? (totalBytes / totalLimitBytes) * 100 : 0;
  const usedPercentage = Math.min(100, +rawPercent.toFixed(2));

  // Visual bar: if user has any files, ensure at least 1.5% is visible so the bar is alive
  const visualPercentage =
    totalBytes > 0 ? Math.max(1.5, Math.min(100, usedPercentage)) : 0;

  const usedGB = +(totalBytes / (1024 * 1024 * 1024)).toFixed(3);

  return {
    usedBytes: totalBytes,
    totalBytes: totalLimitBytes,
    usedGB,
    totalGB,
    usedPercentage,
    visualPercentage,
    formattedUsed: formatStorageBytes(totalBytes),
    formattedTotal: totalGB >= 1024 ? `${(totalGB / 1024).toFixed(0)} TB` : `${totalGB} GB`,
    formattedPercent: formatStoragePercent(totalBytes, totalLimitBytes),
    freeBytesRemaining: Math.max(0, totalLimitBytes - totalBytes),
    formattedFree: formatStorageBytes(Math.max(0, totalLimitBytes - totalBytes)),
    breakdown: {
      imagesBytes,
      formattedImages: formatStorageBytes(imagesBytes),
      videosBytes,
      formattedVideos: formatStorageBytes(videosBytes),
      documentsBytes,
      formattedDocuments: formatStorageBytes(documentsBytes),
      otherBytes,
      formattedOther: formatStorageBytes(otherBytes),
    },
  };
};
