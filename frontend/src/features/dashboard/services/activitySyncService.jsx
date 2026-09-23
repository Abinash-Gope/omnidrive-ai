import { saveCloudPreferences, fetchCloudPreferences } from "../../auth/api/cloudPreferencesService.jsx";

/**
 * OmniDrive AI - Activity & Deferred Cloud Sync Service
 * 
 * Provides ultra-fast, 0ms local activity buffering for all user interactions
 * (starring, trashing, restoring, previewing) and automatically flushes
 * pending state to AWS Cognito Cloud when:
 * 1. The user explicitly logs out.
 * 2. The user is inactive or leaves for 5 minutes (300,000 ms).
 * 3. The page is hidden / navigated away from.
 */

export const LOCAL_ACTIVITY_KEY = "omnidrive_local_activity";
export const PENDING_PREFS_KEY = "omnidrive_pending_preferences";
export const SYNC_DIRTY_KEY = "omnidrive_sync_dirty";
export const LAST_ACTIVE_KEY = "omnidrive_last_active";

// 5 minutes in milliseconds
export const INACTIVITY_THRESHOLD_MS = 5 * 60 * 1000;

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
 * Get pending local preferences (starred, trash) if any
 * @returns {{ starred: string[], trash: string[] } | null}
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
 * Record a user interaction into local storage with zero network latency.
 *
 * @param {string} actionType - 'star' | 'unstar' | 'trash' | 'restore' | 'delete' | 'preview' | 'upload'
 * @param {object} details - { fileId, fileName, ... }
 * @param {{ starred?: string[], trash?: string[] }} [preferences] - Updated preferences if modified
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
    const updated = [event, ...existing.filter((e) => e.id !== event.id)].slice(0, 50);
    localStorage.setItem(LOCAL_ACTIVITY_KEY, JSON.stringify(updated));

    // 2. If preferences updated, save pending preferences and mark dirty
    if (preferences) {
      localStorage.setItem(
        PENDING_PREFS_KEY,
        JSON.stringify({
          starred: Array.isArray(preferences.starred) ? preferences.starred : [],
          trash: Array.isArray(preferences.trash) ? preferences.trash : [],
        })
      );
      localStorage.setItem(SYNC_DIRTY_KEY, "true");
    }

    // 3. Update last active timestamp
    localStorage.setItem(LAST_ACTIVE_KEY, now.toString());

    // 4. Notify UI via custom event for instant reactivity
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
 * - 5 minutes of user inactivity / leave
 * - Page unload or visibility change
 *
 * @returns {Promise<boolean>} True if sync succeeded or was not needed
 */
export const flushPendingActivityToCloud = async () => {
  const isDirty = hasPendingSync();
  const pendingPrefs = getLocalPreferences();

  if (!isDirty || !pendingPrefs) {
    return true;
  }

  try {
    console.log("[ActivitySync] Flushing pending activity & preferences to AWS Cognito Cloud...");
    const success = await saveCloudPreferences({
      starred: pendingPrefs.starred || [],
      trash: pendingPrefs.trash || [],
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
 * Initializes the 5-minute inactivity & leave watcher.
 * Tracks user interaction (mouse, keyboard, scroll, touch) and automatically flushes
 * pending state to AWS Cloud if the user leaves or remains inactive for 5 minutes.
 *
 * @param {function} [onSyncCallback] - Optional callback after background sync
 * @returns {function} Cleanup function to remove listeners
 */
export const initInactivitySyncWatcher = (onSyncCallback) => {
  if (typeof window === "undefined") return () => {};

  let lastInteraction = Date.now();
  localStorage.setItem(LAST_ACTIVE_KEY, lastInteraction.toString());

  // Debounced interaction updater
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

  // Periodic checker every 15 seconds: if idle for >= 5 minutes, flush pending data
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

  // Tab hidden / leave handler: if user leaves tab and has been away >= 5 minutes or hides tab
  const handleVisibilityChange = async () => {
    if (document.visibilityState === "hidden") {
      const now = Date.now();
      const storedLastActive = Number(localStorage.getItem(LAST_ACTIVE_KEY) || lastInteraction);
      const idleDuration = now - Math.max(lastInteraction, storedLastActive);

      if (idleDuration >= INACTIVITY_THRESHOLD_MS && hasPendingSync()) {
        console.log("[ActivitySync] Tab hidden after 5min inactivity. Flushing to cloud...");
        await flushPendingActivityToCloud();
      }
    }
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Page unload handler: flush before window closes
  const handleBeforeUnload = () => {
    if (hasPendingSync()) {
      flushPendingActivityToCloud();
    }
  };

  window.addEventListener("beforeunload", handleBeforeUnload);

  // Return cleanup function
  return () => {
    events.forEach((evt) => window.removeEventListener(evt, handleUserInteraction));
    document.removeEventListener("visibilitychange", handleVisibilityChange);
    window.removeEventListener("beforeunload", handleBeforeUnload);
    clearInterval(intervalId);
    if (interactionTimeout) clearTimeout(interactionTimeout);
  };
};

export default {
  getLocalActivity,
  getLocalPreferences,
  hasPendingSync,
  recordLocalActivity,
  flushPendingActivityToCloud,
  initInactivitySyncWatcher,
};
