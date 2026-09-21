/**
 * Utility functions for decoding JWT tokens and formatting Cognito claims
 */

/**
 * Safely parse a JWT string without external heavy libraries
 * @param {string} token - The raw JWT token string
 * @returns {object|null} Decoded JSON payload or null if invalid
 */
export const parseJwt = (token) => {
  if (!token || typeof token !== "string") return null;

  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Base64URL to Base64
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );

    return JSON.parse(jsonPayload);
  } catch (err) {
    console.warn("Failed to parse JWT token:", err);
    return null;
  }
};

/**
 * Check whether a JWT token is expired
 * @param {string} token - The raw JWT token string
 * @returns {boolean} True if expired or invalid
 */
export const isTokenExpired = (token) => {
  const payload = parseJwt(token);
  if (!payload || !payload.exp) return true;

  // Current time in seconds
  const currentTime = Math.floor(Date.now() / 1000);
  return payload.exp < currentTime;
};

/**
 * Extract clean user details from decoded Cognito claims
 * @param {object} claims - Decoded JWT payload
 * @param {string} rawToken - Original JWT token
 * @returns {object} Standardized OmniDrive AI user object
 */
export const formatUserFromClaims = (claims, rawToken) => {
  if (!claims) return null;

  const email = claims.email || claims["cognito:username"] || "user@omnidrive.ai";
  const name = claims.name || claims.given_name || email.split("@")[0] || "OmniDrive User";
  const sub = claims.sub || claims.username || `user-${Date.now()}`;

  // Avatar initials
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const storedPlan = localStorage.getItem("userPlan") || "free";

  return {
    id: sub,
    sub,
    name,
    email,
    avatar: initials || "OD",
    plan: storedPlan,
    role: storedPlan === "enterprise" ? "Enterprise VPC Admin" : storedPlan === "pro" ? "Pro Cloud Creator" : "Sandbox Developer",
    emailVerified: claims.email_verified || false,
    rawClaims: claims,
  };
};
