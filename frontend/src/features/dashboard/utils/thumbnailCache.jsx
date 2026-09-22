/**
 * OmniDrive AI - Client-Side Thumbnail & Image Preview Cache
 * File: src/features/dashboard/utils/thumbnailCache.jsx
 *
 * Responsibilities:
 * 1. Generate lightweight, optimized image thumbnails using HTML5 Canvas.
 * 2. Persist thumbnails in localStorage (with size constraints and LRU cleanup)
 *    so user uploads show their real image on the dashboard and modal immediately.
 * 3. Provide lookup across fileId, s3Key, and fileName.
 */

const THUMBNAIL_STORAGE_KEY = "omnidrive_thumbnails_cache";
const MAX_CACHED_ITEMS = 60;

/**
 * Generate a compressed base64 data URL from a native File or Blob.
 * @param {File|Blob} file - The uploaded image file
 * @param {number} maxWidth - Maximum bounding width (default 800)
 * @param {number} maxHeight - Maximum bounding height (default 600)
 * @param {number} quality - JPEG compression quality (0.1 to 1.0)
 * @returns {Promise<{ dataUrl: string, width: number, height: number, format: string }>}
 */
export const generateThumbnail = (file, maxWidth = 800, maxHeight = 600, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file || !(file instanceof Blob)) {
      return reject(new Error("Invalid file passed to generateThumbnail"));
    }

    // Only process image files
    if (!file.type?.startsWith("image/")) {
      return resolve(null);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        const origWidth = width;
        const origHeight = height;

        // Scale down while maintaining aspect ratio
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          return resolve({
            dataUrl: e.target.result,
            width: origWidth,
            height: origHeight,
            format: file.type.replace("image/", "").toUpperCase(),
          });
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const format = file.type.includes("png") ? "image/png" : "image/jpeg";
        const dataUrl = canvas.toDataURL(format, quality);

        resolve({
          dataUrl,
          width: origWidth,
          height: origHeight,
          format: file.type.replace("image/", "").toUpperCase(),
        });
      };

      img.onerror = () => {
        resolve({
          dataUrl: e.target.result,
          width: 0,
          height: 0,
          format: "IMAGE",
        });
      };

      img.src = e.target.result;
    };

    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

/**
 * Get the full thumbnail cache store
 * @returns {Object}
 */
const getCacheStore = () => {
  try {
    const raw = localStorage.getItem(THUMBNAIL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.warn("Could not read thumbnail cache:", err);
    return {};
  }
};

/**
 * Save thumbnail data URL keyed by one or more identifier keys
 * @param {string|string[]} keys - One or multiple keys (e.g. file_id, s3_key, file_name)
 * @param {string} dataUrl - The base64 data URL
 * @param {Object} metadata - Optional dimensions or format info
 */
export const saveThumbnail = (keys, dataUrl, metadata = null) => {
  if (!keys || !dataUrl) return;

  const keyList = Array.isArray(keys) ? keys.filter(Boolean) : [keys];
  if (keyList.length === 0) return;

  try {
    const store = getCacheStore();

    // Check size limit: prune oldest if cache grows too large
    const entries = Object.keys(store);
    if (entries.length > MAX_CACHED_ITEMS * 2) {
      entries.slice(0, 20).forEach((k) => delete store[k]);
    }

    const payload = {
      dataUrl,
      metadata,
      savedAt: Date.now(),
    };

    keyList.forEach((k) => {
      store[k] = payload;
    });

    localStorage.setItem(THUMBNAIL_STORAGE_KEY, JSON.stringify(store));
  } catch (err) {
    console.warn("Storage quota exceeded or error writing thumbnail cache:", err);
  }
};

/**
 * Find thumbnail data URL by any matching key (fileId, s3Key, or fileName)
 * @param {...string} possibleKeys - Keys to check in order
 * @returns {string|null}
 */
export const findThumbnail = (...possibleKeys) => {
  try {
    const store = getCacheStore();
    for (const key of possibleKeys) {
      if (key && store[key]) {
        return store[key].dataUrl || store[key];
      }
    }
  } catch {}
  return null;
};

/**
 * Find metadata (dimensions, format) by keys
 * @param {...string} possibleKeys
 * @returns {Object|null}
 */
export const findThumbnailMetadata = (...possibleKeys) => {
  try {
    const store = getCacheStore();
    for (const key of possibleKeys) {
      if (key && store[key] && store[key].metadata) {
        return store[key].metadata;
      }
    }
  } catch {}
  return null;
};

/**
 * Remove thumbnail entries from cache
 * @param {...string} keysToRemove
 */
export const removeThumbnail = (...keysToRemove) => {
  try {
    const store = getCacheStore();
    let modified = false;
    keysToRemove.filter(Boolean).forEach((k) => {
      if (store[k]) {
        delete store[k];
        modified = true;
      }
    });
    if (modified) {
      localStorage.setItem(THUMBNAIL_STORAGE_KEY, JSON.stringify(store));
    }
  } catch {}
};
