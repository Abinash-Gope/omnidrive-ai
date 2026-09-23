import {
  saveCloudPreferences,
  saveCloudPreferencesKeepAlive,
  fetchCloudPreferences,
} from "../../auth/api/cloudPreferencesService.jsx";

/**
 * OmniDrive AI - Dynamic Cloud Sync Service & Change Ledger
 * 
 * Provides:
 * 1. 0ms local state buffering for all user actions (Folders, Starring, Trashing, AI Summaries).
 * 2. 1.5s debounced background auto-sync to AWS Cognito Cloud while user works.
 * 3. Urgent keepalive cloud dispatch on browser closure (visibilitychange, pagehide, beforeunload).
 * 4. Pre-logout blocking cloud flush before session credentials are deleted.
 * 5. 5-minute inactivity sync watcher.
 */

export const LOCAL_ACTIVITY_KEY = "omnidrive_local_activity";
export const PENDING_PREFS_KEY = "omnidrive_pending_preferences";
export const SYNC_DIRTY_KEY = "omnidrive_sync_dirty";
export const LAST_ACTIVE_KEY = "omnidrive_last_active";

// Inactivity threshold: 5 minutes in ms
export const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

// Debounce timer for continuous background cloud auto-save
let debouncedSyncTimer = null;

/**
 * Get all buffered local activity items
 * @returns {Array<object>}
 */
export const getLocalActivity = () => {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Get pending local preferences (folders, starred, trash, summaries)
 * @returns {{ starred: string[], trash: string[], folders: Array<object>, summaries: object } | null}
 */
export const getLocalPreferences = () => {
  try {
    const raw = localStorage.getItem(PENDING_PREFS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

/**
 * Check if there is pending data that needs syncing to AWS Cloud
 * @returns {boolean}
 */
export const hasPendingSync = () => {
  try {
    return localStorage.getItem(SYNC_DIRTY_KEY) === "true";
  } catch {
    return false;
  }
};

/**
 * Schedule a debounced cloud sync (1.5 seconds)
 */
export const scheduleDebouncedSync = () => {
  if (debouncedSyncTimer) {
    clearTimeout(debouncedSyncTimer);
  }
  debouncedSyncTimer = setTimeout(async () => {
    if (hasPendingSync()) {
      await flushPendingActivityToCloud();
    }
  }, 1500);
};

/**
 * Record a user interaction into local storage with zero network latency,
 * merge pending state, mark dirty, and schedule debounced cloud sync.
 *
 * @param {string} actionType - 'folder_create' | 'folder_delete' | 'folder_rename' | 'folder_add_files' | 'folder_remove_files' | 'star' | 'unstar' | 'trash' | 'restore' | 'delete' | 'preview' | 'summary_generated'
 * @param {object} details - { fileId, fileName, folderId, folderName, ... }
 * @param {{ starred?: string[], trash?: string[], folders?: Array<object>, summaries?: object }} [preferences] - Updated state snapshot
 */
export const recordLocalActivity = (actionType, details = {}, preferences = null) => {
  const now = Date.now();
  const event = {
    id: `act-${now}-${Math.random().toString(36).slice(2, 6)}`,
    type: actionType,
    fileId: details.fileId || null,
    fileName: details.fileName || null,
    timestamp: new Date().toISOString(),
    epoch: now,
    ...details,
  };

  try {
    // 1. Buffer activity in circular queue (up to 50 items)
    const existing = getLocalActivity();
    const updatedActivity = [event, ...existing.filter((e) => e.id !== event.id)].slice(0, 50);
    localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(updatedActivity));

    // 2. If preferences provided, merge with existing pending preferences to avoid wiping sibling fields
    if (preferences) {
      const prevPrefs = getLocalPreferences() || { starred: [], trash: [], folders: [], summaries: {} };
      const mergedPrefs = {
        starred: preferences.starred !== undefined ? preferences.starred : prevPrefs.starred || [],
        trash: preferences.trash !== undefined ? preferences.trash : prevPrefs.trash || [],
        folders: preferences.folders !== undefined ? preferences.folders : prevPrefs.folders || [],
        summaries: preferences.summaries !== undefined
          ? { ...(prevPrefs.summaries || {}), ...preferences.summaries }
          : prevPrefs.summaries || {},
      };

      localStorage.setItem(PENDING_PREFS_KEY, JSON.stringify(mergedPrefs));
      localStorage.setItem(SYNC_DIRTY_KEY, "true");

      // Auto-sync to cloud after 1.5s debounce
      scheduleDebouncedSync();
    }

    // 3. Update last active timestamp
    localStorage.setItem(LAST_ACTIVE_KEY, now.toString());

    // 4. Notify UI via custom event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("omnidrive:activity", {
          detail: { event, preferences, hasPending: Boolean(preferences) },
        })
      );
    }
  } catch (err) {
    console.warn("Failed to write activity locally:", err);
  }

  return event;
};

/**
 * Flush all pending local preferences and activity to AWS Cloud (Cognito).
 * Invoked on:
 * - User logout
 * - Continuous 1.5s background debounce
 * - 5 minutes of user inactivity / leave
 * - Tab hidden or navigated away from
 *
 * @param {{ starred?: string[], trash?: string[], folders?: Array<object>, summaries?: object }} [directSnapshot] - Optional direct state snapshot
 * @returns {Promise<boolean>} True if sync succeeded or was not needed
 */
export const flushPendingActivityToCloud = async (directSnapshot = null) => {
  const isDirty = hasPendingSync() || Boolean(directSnapshot);
  const pendingPrefs = directSnapshot || getLocalPreferences();

  if (!isDirty || !pendingPrefs) {
    return true;
  }

  try {
    console.log("[ActivitySync] Flushing pending state to AWS Cognito Cloud...");
    const success = await saveCloudPreferences({
      starred: pendingPrefs.starred || [],
      trash: pendingPrefs.trash || [],
      folders: pendingPrefs.folders || [],
      summaries: pendingPrefs.summaries || {},
    });

    if (success) {
      localStorage.removeItem(SYNC_DIRTY_KEY);
      console.log("[ActivitySync] Successfully synced state to AWS Cognito Cloud.");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("omnidrive:synced", { detail: pendingPrefs }));
      }
      return true;
    }
    return false;
  } catch (err) {
    console.error("[ActivitySync] Error during cloud flush:", err);
    return false;
  }
};

/**
 * Urgent flush specifically optimized for pagehide and beforeunload when browser is closing.
 * Uses keepalive HTTP request so it is not killed when the window context is destroyed.
 */
export const flushUrgentOnWindowClose = () => {
  if (!hasPendingSync()) return false;
  const pendingPrefs = getLocalPreferences();
  if (!pendingPrefs) return false;

  console.log("[ActivitySync] Browser closing: dispatching urgent keepalive cloud sync...");
  return saveCloudPreferencesKeepAlive(pendingPrefs);
};

/**
 * Initializes the background sync watchers:
 * 1. 15-second check for 5-minute idle sync
 * 2. visibilitychange (when tab is hidden/switched)
 * 3. pagehide and beforeunload with keepalive (when tab/browser closes)
 *
 * @param {function} [onSyncCallback] - Optional callback after background sync
 * @returns {function} Cleanup function
 */
export const initInactivitySyncWatcher = (onSyncCallback) => {
  if (typeof window === "undefined") return () => {};

  let lastInteraction = Date.now();
  localStorage.setItem(LAST_ACTIVE_KEY, lastInteraction.toString());

  // Debounced user activity interaction recorder
  let interactionTimeout = null;
  const handleUserInteraction = () => {
    const now = Date.now();
    lastInteraction = now;
    if (!interactionTimeout) {
      interactionTimeout = setTimeout(() => {
        try {
          localStorage.setItem(LAST_ACTIVE_KEY, lastInteraction.toString());
        } catch {}
        interactionTimeout = null;
      }, 2000);
    }
  };

  const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
  events.forEach((evt) => window.addEventListener(evt, handleUserInteraction, { passive: true }));

  // Periodic checker: if idle for >= 5 minutes, flush pending data
  const intervalId = setInterval(async () => {
    const now = Date.now();
    const storedLastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || lastInteraction);
    const idleDuration = now - Math.max(lastInteraction, storedLastActive);

    if (idleDuration >= INACTIVITY_THRESHOLD_MS && hasPendingSync()) {
      console.log(`[ActivitySync] 5 minutes of inactivity detected (${Math.round(idleDuration / 1000)}s idle). Syncing to cloud...`);
      const flushed = await flushPendingActivityToCloud();
      if (flushed && typeof onSyncCallback === "function") {
        onSyncCallback();
      }
    }
  }, 15000);

  // When tab is hidden or minimized: flush immediately
  const handleVisibilityChange = async () => {
    if (document.visibilityState === "hidden") {
      if (hasPendingSync()) {
        console.log("[ActivitySync] Tab hidden with unsaved changes. Flushing to cloud...");
        await flushPendingActivityToCloud();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // When page begins to unload / browser window is closing: dispatch urgent keepalive
  const handlePageHide = () => {
    flushUrgentOnWindowClose();
  };

  const handleBeforeUnload = () => {
    flushUrgentOnWindowClose();
  };

  window.addEventListener("pagehide", handlePageHide);
  window.addEventListener("beforeunload", handleBeforeUnload);

  // Return cleanup function
  return () => {
    events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("pagehide", handlePageHide);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    clearInterval(intervalId);
    if (interactionTimeout) clearTimeout(interactionTimeout);
    if (debouncedSyncTimer) clearTimeout(debouncedSyncTimer);
  };
};

export default {
  getLocalActivity,
  getLocalPreferences,
  hasPendingSync,
  recordLocalActivity,
  flushPendingActivityToCloud,
  flushUrgentOnWindowClose,
  initInactivitySyncWatcher,
};
