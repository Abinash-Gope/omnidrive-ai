import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import { userPool, cognitoConfig } from "../config/cognitoConfig.jsx";
import { parseJwt, formatUserFromClaims, isTokenExpired } from "../utils/jwtHelper.jsx";

/**
 * Pure async Cognito Authentication API
 * Uses amazon-cognito-identity-js SRP protocol
 */

/**
 * Perform SRP Authentication with Amazon Cognito
 * @param {object} credentials - { email, password }
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginApi = ({ email, password }) => {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      return reject(new Error("Email and password are required."));
    }

    // Check if real Cognito pool is configured
    const isConfigured =
      cognitoConfig.userPoolId &&
      !cognitoConfig.userPoolId.includes("mock") &&
      cognitoConfig.clientId &&
      !cognitoConfig.clientId.includes("mock");

    if (!isConfigured) {
      // Clean fallback SRP simulation for local dev when Cognito is not yet linked
      setTimeout(() => {
        // Create a realistic structured JWT token with sub, email, exp claims
        const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
        const now = Math.floor(Date.now() / 1000);
        const payload = btoa(
          JSON.stringify({
            sub: "cognito-usr-" + btoa(email).replace(/=/g, "").slice(0, 12),
            email_verified: true,
            "cognito:username": email,
            name: email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim() || "Cloud User",
            email: email,
            iat: now,
            exp: now + 3600 * 24, // 24 hour token
          })
        );
        const signature = btoa("mock-cognito-srp-sig-" + Date.now()).replace(/=/g, "");
        const mockJwt = `${header}.${payload}.${signature}`;

        const claims = parseJwt(mockJwt);
        const user = formatUserFromClaims(claims, mockJwt);

        resolve({ token: mockJwt, user });
      }, 400);
      return;
    }

    const authenticationDetails = new AuthenticationDetails({
      Username: email.trim(),
      Password: password,
    });

    const userData = {
      Username: email.trim(),
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.authenticateUser(authenticationDetails, {
      onSuccess: (result) => {
        const idToken = result.getIdToken().getJwtToken();
        const claims = result.getIdToken().decodePayload();
        const user = formatUserFromClaims(claims, idToken);
        resolve({ token: idToken, user });
      },
      onFailure: (err) => {
        reject(new Error(err.message || "Failed to authenticate with Amazon Cognito."));
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        // First login with temporary password
        cognitoUser.completeNewPasswordChallenge(password, {}, {
          onSuccess: (result) => {
            const idToken = result.getIdToken().getJwtToken();
            const claims = result.getIdToken().decodePayload();
            const user = formatUserFromClaims(claims, idToken);
            resolve({ token: idToken, user });
          },
          onFailure: (err) => {
            reject(new Error(err.message || "New password challenge failed."));
          },
        });
      },
    });
  });
};

/**
 * Register a new user in Amazon Cognito User Pool
 * @param {object} userData - { email, password, fullName }
 * @returns {Promise<object>}
 */
export const registerApi = (userData) => {
  return new Promise((resolve, reject) => {
    const { email, password, fullName } = userData;

    if (!email || !password) {
      return reject(new Error("Email and password are required."));
    }

    const isConfigured =
      cognitoConfig.userPoolId &&
      !cognitoConfig.userPoolId.includes("mock") &&
      cognitoConfig.clientId &&
      !cognitoConfig.clientId.includes("mock");

    if (!isConfigured) {
      setTimeout(() => {
        const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
        const now = Math.floor(Date.now() / 1000);
        const payload = btoa(
          JSON.stringify({
            sub: "cognito-reg-" + Date.now(),
            email_verified: true,
            name: fullName || email.split("@")[0],
            email: email,
            iat: now,
            exp: now + 3600 * 24,
          })
        );
        const signature = btoa("mock-reg-sig").replace(/=/g, "");
        const mockJwt = `${header}.${payload}.${signature}`;
        const claims = parseJwt(mockJwt);
        const user = formatUserFromClaims(claims, mockJwt);

        resolve({ token: mockJwt, user });
      }, 500);
      return;
    }

    const attributeList = [
      new CognitoUserAttribute({ Name: "email", Value: email.trim() }),
      new CognitoUserAttribute({ Name: "name", Value: fullName || email.split("@")[0] }),
    ];

    userPool.signUp(email.trim(), password, attributeList, null, (err, result) => {
      if (err) {
        return reject(new Error(err.message || "Failed to register with Cognito."));
      }

      // Auto-authenticate if user is confirmed, or return user details
      const cognitoUser = result.user;
      resolve({
        token: null,
        userSub: cognitoUser.getUsername(),
        userConfirmed: result.userConfirmed,
      });
    });
  });
};

/**
 * Retrieve active Cognito session from local storage or UserPool
 * @returns {Promise<{ token: string, user: object } | null>}
 */
export const getActiveSessionApi = () => {
  return new Promise((resolve) => {
    // 1. Check local storage ID token first
    const storedToken = localStorage.getItem("idToken") || localStorage.getItem("authToken");
    if (storedToken && !isTokenExpired(storedToken)) {
      const claims = parseJwt(storedToken);
      if (claims) {
        return resolve({
          token: storedToken,
          user: formatUserFromClaims(claims, storedToken),
        });
      }
    }

    // 2. Check amazon-cognito-identity-js storage session
    const currentUser = userPool.getCurrentUser();
    if (!currentUser) {
      return resolve(null);
    }

    currentUser.getSession((err, session) => {
      if (err || !session || !session.isValid()) {
        return resolve(null);
      }

      const idToken = session.getIdToken().getJwtToken();
      if (isTokenExpired(idToken)) {
        return resolve(null);
      }

      const claims = session.getIdToken().decodePayload();
      const user = formatUserFromClaims(claims, idToken);
      resolve({ token: idToken, user });
    });
  });
};

/**
 * Terminate Cognito session and clean local storage
 */
export const logoutApi = async () => {
  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }
  localStorage.removeItem("authToken");
  localStorage.removeItem("idToken");
  return { success: true };
};
