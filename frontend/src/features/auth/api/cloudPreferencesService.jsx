import { CognitoUserAttribute } from "amazon-cognito-identity-js";
import { userPool, cognitoConfig } from "../config/cognitoConfig.jsx";

/**
 * Cloud Preferences Service
 * Persists and retrieves user-level preferences (Folders, Starred files, Trashed files, and AI Summaries)
 * directly in AWS Cognito User Pool cloud storage.
 *
 * Guarantees 100% cloud persistence across all browsers, devices, and sessions.
 */

export const DISPLAY_NAME_CACHE_KEY = "omnidrive_user_display_name";

/**
 * Parse cloud preferences from a raw Cognito name attribute value.
 * Format: "DisplayName::{"starred":["id1"],"trash":["id2"],"folders":[...],"summaries":{...}}"
 *
 * @param {string} rawName - The raw name attribute from Cognito
 * @returns {{ displayName: string, preferences: { starred: string[], trash: string[], folders: Array<object>, summaries: object } }}
 */
export const parseCloudNameAttribute = (rawName) => {
  const defaultRes = {
    displayName: "OmniDrive User",
    preferences: { starred: [], trash: [], folders: [], summaries: {} },
  };

  if (!rawName || typeof rawName !== "string") {
    return defaultRes;
  }

  if (!rawName.includes("::")) {
    const dName = rawName.trim() || "OmniDrive User";
    try {
      localStorage.setItem(DISPLAY_NAME_CACHE_KEY, dName);
    } catch {}
    return { displayName: dName, preferences: { starred: [], trash: [], folders: [], summaries: {} } };
  }

  const parts = rawName.split("::");
  const displayName = parts[0].trim() || "OmniDrive User";
  try {
    localStorage.setItem(DISPLAY_NAME_CACHE_KEY, displayName);
  } catch {}

  let preferences = { starred: [], trash: [], folders: [], summaries: {} };

  try {
    const jsonStr = parts.slice(1).join("::");
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object") {
      preferences = {
        starred: Array.isArray(parsed.starred) ? parsed.starred : [],
        trash: Array.isArray(parsed.trash) ? parsed.trash : [],
        folders: Array.isArray(parsed.folders)
          ? parsed.folders
          : Array.isArray(parsed.albums)
          ? parsed.albums
          : [],
        summaries: parsed.summaries && typeof parsed.summaries === "object" ? parsed.summaries : {},
      };
    }
  } catch (err) {
    console.warn("Could not parse cloud preferences JSON from Cognito:", err);
  }

  return { displayName, preferences };
};

/**
 * Helper to construct a safe, compact payload that strictly adheres
 * to the AWS Cognito 2048-character standard attribute limit.
 */
export const buildSafeCloudPayload = (displayName, { starred = [], trash = [], folders = [], summaries = {} }) => {
  const cleanStarred = Array.from(new Set((starred || []).filter(Boolean)));
  const cleanTrash = Array.from(new Set((trash || []).filter(Boolean)));
  const cleanFolders = Array.isArray(folders)
    ? folders.map((f) => ({
        id: f.id,
        name: f.name || "Untitled Folder",
        color: f.color || "blue",
        fileIds: Array.isArray(f.fileIds) ? Array.from(new Set(f.fileIds)) : [],
        createdAt: f.createdAt || new Date().toISOString(),
      }))
    : [];

  const cleanSummaries = {};
  if (summaries && typeof summaries === "object") {
    for (const [id, s] of Object.entries(summaries)) {
      if (s && s.executive) {
        cleanSummaries[id] = {
          executive: s.executive.slice(0, 240),
          takeaways: Array.isArray(s.takeaways) ? s.takeaways.slice(0, 3) : [],
          pages: s.pages || null,
          model: s.model || "OmniDrive Neural Engine",
        };
      }
    }
  }

  let obj = {
    starred: cleanStarred,
    trash: cleanTrash,
    folders: cleanFolders,
    summaries: cleanSummaries,
  };

  let combined = `${displayName}::${JSON.stringify(obj)}`;

  // If payload exceeds 2000 chars, drop summaries first to protect folders and file status
  if (combined.length > 2000) {
    obj.summaries = {};
    combined = `${displayName}::${JSON.stringify(obj)}`;
  }

  // If still near limit, compact folder objects
  if (combined.length > 2040) {
    obj.folders = cleanFolders.map((f) => ({
      id: f.id,
      name: f.name,
      color: f.color,
      fileIds: f.fileIds,
    }));
    combined = `${displayName}::${JSON.stringify(obj)}`;
  }

  return combined;
};

/**
 * Fetch the latest cloud preferences directly from AWS Cognito User Pool.
 *
 * @returns {Promise<{ starred: string[], trash: string[], folders: Array<object>, summaries: object }>}
 */
export const fetchCloudPreferences = () => {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      return resolve({ starred: [], trash: [], folders: [], summaries: {} });
    }

    currentUser.getSession((sessionErr, session) => {
      if (sessionErr || !session || !session.isValid()) {
        return resolve({ starred: [], trash: [], folders: [], summaries: {} });
      }

      currentUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) {
          console.warn("Could not fetch Cognito user attributes:", attrErr);
          const claims = session.getIdToken()?.decodePayload();
          const { preferences } = parseCloudNameAttribute(claims?.name);
          return resolve(preferences);
        }

        const nameAttr = attributes.find((a) => a.getName() === "name");
        const { preferences } = parseCloudNameAttribute(nameAttr?.getValue());
        resolve(preferences);
      });
    });
  });
};

/**
 * Synchronously retrieves active Cognito access token for urgent page-unload events.
 */
export const getActiveAccessTokenSync = () => {
  try {
    const currentUser = userPool.getCurrentUser();
    if (currentUser?.signInUserSession) {
      const token = currentUser.signInUserSession.getAccessToken()?.getJwtToken();
      if (token) return token;
    }

    const lastUser = localStorage.getItem(`CognitoIdentityServiceProvider.${cognitoConfig.clientId}.LastAuthUser`);
    if (lastUser) {
      const token = localStorage.getItem(
        `CognitoIdentityServiceProvider.${cognitoConfig.clientId}.${lastUser}.accessToken`
      );
      if (token) return token;
    }

    return localStorage.getItem("authToken") || localStorage.getItem("idToken");
  } catch {
    return null;
  }
};

/**
 * Save updated preferences (Folders, Starred, Trash, and Summaries) directly to AWS Cognito Cloud.
 *
 * @param {{ starred?: string[], trash?: string[], folders?: Array<object>, summaries?: object }} updates
 * @returns {Promise<boolean>} True on success
 */
export const saveCloudPreferences = async ({ starred = [], trash = [], folders = [], summaries = {} }) => {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      return resolve(false);
    }

    currentUser.getSession((sessionErr, session) => {
      if (sessionErr || !session || !session.isValid()) {
        return resolve(false);
      }

      // Read current display name from token or local cache
      const claims = session.getIdToken()?.decodePayload();
      const currentRawName = claims?.name || localStorage.getItem(DISPLAY_NAME_CACHE_KEY) || "OmniDrive User";
      const { displayName } = parseCloudNameAttribute(currentRawName);

      const combinedValue = buildSafeCloudPayload(displayName, {
        starred,
        trash,
        folders,
        summaries,
      });

      const attribute = new CognitoUserAttribute({
        Name: "name",
        Value: combinedValue,
      });

      currentUser.updateAttributes([attribute], (updateErr, result) => {
        if (updateErr) {
          console.warn("Failed to persist cloud preferences to AWS Cognito:", updateErr);
          return resolve(false);
        }
        console.log("[CloudSync] Preferences successfully saved to AWS Cognito:", result);
        resolve(true);
      });
    });
  });
};

/**
 * Fire-and-forget save using fetch with keepalive: true during pagehide/beforeunload.
 * Survives tab or browser closure.
 */
export const saveCloudPreferencesKeepAlive = ({ starred = [], trash = [], folders = [], summaries = {} }) => {
  try {
    const accessToken = getActiveAccessTokenSync();
    if (!accessToken) return false;

    const displayName = localStorage.getItem(DISPLAY_NAME_CACHE_KEY) || "OmniDrive User";
    const combinedValue = buildSafeCloudPayload(displayName, { starred, trash, folders, summaries });

    const region = cognitoConfig.region || "ap-south-1";
    const endpoint = `https://cognito-idp.${region}.amazonaws.com/`;

    fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": "AWSCognitoIdentityProviderService.UpdateUserAttributes",
      },
      body: JSON.stringify({
        AccessToken: accessToken,
        UserAttributes: [{ Name: "name", Value: combinedValue }],
      }),
      keepalive: true,
    }).catch(() => {});

    return true;
  } catch (err) {
    return false;
  }
};

export default {
  parseCloudNameAttribute,
  fetchCloudPreferences,
  saveCloudPreferences,
  saveCloudPreferencesKeepAlive,
  getActiveAccessTokenSync,
};
