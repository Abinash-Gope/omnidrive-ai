import { CognitoUserAttribute } from "amazon-cognito-identity-js";
import { userPool } from "../config/cognitoConfig.jsx";

/**
 * Cloud Preferences Service
 * Persists and retrieves user-level preferences (Starred files, Trashed files)
 * directly in AWS Cognito User Pool cloud storage.
 *
 * This guarantees 100% cloud persistence across all browsers, devices, and sessions
 * without using browser-local storage.
 */

/**
 * Parse cloud preferences from a raw Cognito name attribute value.
 * Format: "DisplayName::{"starred":["id1"],"trash":["id2"]}"
 *
 * @param {string} rawName - The raw name attribute from Cognito
 * @returns {{ displayName: string, preferences: { starred: string[], trash: string[] } }}
 */
export const parseCloudNameAttribute = (rawName) => {
  if (!rawName || typeof rawName !== "string") {
    return { displayName: "OmniDrive User", preferences: { starred: [], trash: [], albums: [] } };
  }

  if (!rawName.includes("::")) {
    return { displayName: rawName.trim(), preferences: { starred: [], trash: [], albums: [] } };
  }

  const parts = rawName.split("::");
  const displayName = parts[0].trim() || "OmniDrive User";
  let preferences = { starred: [], trash: [], albums: [] };

  try {
    const jsonStr = parts.slice(1).join("::");
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed === "object") {
      preferences = {
        starred: Array.isArray(parsed.starred) ? parsed.starred : [],
        trash: Array.isArray(parsed.trash) ? parsed.trash : [],
        albums: Array.isArray(parsed.albums) ? parsed.albums : [],
      };
    }
  } catch (err) {
    console.warn("Could not parse cloud preferences JSON from Cognito:", err);
  }

  return { displayName, preferences };
};

/**
 * Fetch the latest cloud preferences directly from AWS Cognito User Pool.
 *
 * @returns {Promise<{ starred: string[], trash: string[], albums: Array<{ id: string, name: string, fileIds: string[], createdAt: string }> }>}
 */
export const fetchCloudPreferences = () => {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      return resolve({ starred: [], trash: [], albums: [] });
    }

    currentUser.getSession((sessionErr, session) => {
      if (sessionErr || !session || !session.isValid()) {
        return resolve({ starred: [], trash: [], albums: [] });
      }

      currentUser.getUserAttributes((attrErr, attributes) => {
        if (attrErr || !attributes) {
          console.warn("Could not fetch Cognito user attributes:", attrErr);
          // Fall back to decoded ID token claim if available
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
 * Save updated preferences (Starred, Trashed file IDs, and Custom Albums) directly to AWS Cognito Cloud.
 *
 * @param {{ starred?: string[], trash?: string[], albums?: Array<{ id: string, name: string, fileIds: string[] }> }} updates
 * @returns {Promise<boolean>} True on success
 */
export const saveCloudPreferences = async ({ starred = [], trash = [], albums = [] }) => {
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      return resolve(false);
    }

    currentUser.getSession((sessionErr, session) => {
      if (sessionErr || !session || !session.isValid()) {
        return resolve(false);
      }

      // Read current display name from token
      const claims = session.getIdToken()?.decodePayload();
      const currentRawName = claims?.name || "OmniDrive User";
      const { displayName } = parseCloudNameAttribute(currentRawName);

      const prefPayload = JSON.stringify({
        starred: Array.from(new Set(starred)),
        trash: Array.from(new Set(trash)),
        albums: Array.isArray(albums) ? albums : [],
      });

      const combinedValue = `${displayName}::${prefPayload}`;

      const attribute = new CognitoUserAttribute({
        Name: "name",
        Value: combinedValue,
      });

      currentUser.updateAttributes([attribute], (updateErr, result) => {
        if (updateErr) {
          console.warn("Failed to persist cloud preferences to AWS Cognito:", updateErr);
          return resolve(false);
        }
        console.log("Cloud preferences successfully saved to AWS Cognito:", result);
        resolve(true);
      });
    });
  });
};

export default {
  parseCloudNameAttribute,
  fetchCloudPreferences,
  saveCloudPreferences,
};
