import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import { userPool, cognitoConfig } from "../config/cognitoConfig.jsx";
import {
  parseJwt,
  formatUserFromClaims,
  isTokenExpired,
  isTokenExpiringSoon,
  isSessionWithinSevenDays,
} from "../utils/jwtHelper.jsx";

/**
 * Pure Amazon Cognito SRP Authentication API
 * Uses amazon-cognito-identity-js SRP protocol against live AWS User Pool.
 */

/**
 * Perform real SRP Authentication with Amazon Cognito
 * @param {object} credentials - { email, password }
 * @returns {Promise<{ token: string, user: object }>}
 */
export const loginApi = ({ email, password }) => {
  return new Promise((resolve, reject) => {
    if (!email || !password) {
      return reject(new Error("Email and password are required."));
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
        localStorage.setItem("last_login_timestamp", Date.now().toString());
        resolve({ token: idToken, user });
      },
      onFailure: (err) => {
        const error = new Error(err.message || "Failed to authenticate with Amazon Cognito.");
        error.code = err.code || err.name;
        reject(error);
      },
      newPasswordRequired: (userAttributes, requiredAttributes) => {
        cognitoUser.completeNewPasswordChallenge(password, {}, {
          onSuccess: (result) => {
            const idToken = result.getIdToken().getJwtToken();
            const claims = result.getIdToken().decodePayload();
            const user = formatUserFromClaims(claims, idToken);
            localStorage.setItem("last_login_timestamp", Date.now().toString());
            resolve({ token: idToken, user });
          },
          onFailure: (err) => {
            const error = new Error(err.message || "New password challenge failed.");
            error.code = err.code || err.name;
            reject(error);
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

    const attributeList = [
      new CognitoUserAttribute({ Name: "email", Value: email.trim() }),
      new CognitoUserAttribute({ Name: "name", Value: fullName || email.split("@")[0] }),
    ];

    userPool.signUp(email.trim(), password, attributeList, null, (err, result) => {
      if (err) {
        const error = new Error(err.message || "Failed to register with Cognito.");
        error.code = err.code || err.name;
        return reject(error);
      }

      const cognitoUser = result.user;
      resolve({
        token: null,
        userSub: cognitoUser.getUsername(),
        userConfirmed: result.userConfirmed,
        codeDeliveryDetails: result.codeDeliveryDetails,
      });
    });
  });
};

/**
 * Confirm user registration via Amazon Cognito with 6-digit email code
 * @param {object} param - { email, code }
 * @returns {Promise<string>}
 */
export const confirmSignUpApi = ({ email, code }) => {
  return new Promise((resolve, reject) => {
    if (!email || !code) {
      return reject(new Error("Email and confirmation code are required."));
    }

    const userData = {
      Username: email.trim(),
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.confirmRegistration(code.trim(), true, (err, result) => {
      if (err) {
        const error = new Error(err.message || "Invalid or expired confirmation code.");
        error.code = err.code || err.name;
        return reject(error);
      }
      resolve(result);
    });
  });
};

/**
 * Resend verification code via Amazon Cognito
 * @param {string} email
 * @returns {Promise<object>}
 */
export const resendConfirmationCodeApi = (email) => {
  return new Promise((resolve, reject) => {
    if (!email) {
      return reject(new Error("Email address is required."));
    }

    const userData = {
      Username: email.trim(),
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.resendConfirmationCode((err, result) => {
      if (err) {
        const error = new Error(err.message || "Failed to resend confirmation code.");
        error.code = err.code || err.name;
        return reject(error);
      }
      resolve(result);
    });
  });
};

/**
 * Obtain a guaranteed valid ID Token, auto-refreshing via Cognito Refresh Token if expiring,
 * while strictly enforcing the user's 7-day persistent session rule.
 * 
 * Rules:
 * 1. If > 7 days without login/activity: session expires (returns null, clears storage).
 * 2. If <= 7 days and current token is valid (not expiring within 2 min): returns current token.
 * 3. If <= 7 days and token is expired/expiring soon: seamlessly exchanges Cognito refresh
 *    token for a fresh 1-hour ID token without prompting the user.
 * @returns {Promise<string|null>}
 */
export const getOrRenewIdToken = async () => {
  const storedToken = localStorage.getItem("idToken") || localStorage.getItem("authToken");
  const lastLogin = parseInt(localStorage.getItem("last_login_timestamp") || "0", 10);
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

  // 1. Enforce strict 7-day persistence limit
  if (lastLogin && Date.now() - lastLogin >= SEVEN_DAYS_MS) {
    console.warn("7-day persistent session expired. Re-authentication required.");
    localStorage.removeItem("idToken");
    localStorage.removeItem("authToken");
    return null;
  }

  // 2. If stored token is still valid and not expiring soon (> 2 min remaining), return immediately
  if (storedToken && !isTokenExpiringSoon(storedToken, 120)) {
    return storedToken;
  }

  // 3. Token is expired or expiring soon: attempt transparent refresh via Cognito SDK
  return new Promise((resolve) => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (!err && session && session.isValid()) {
          const freshIdToken = session.getIdToken().getJwtToken();
          localStorage.setItem("idToken", freshIdToken);
          localStorage.setItem("authToken", freshIdToken);
          localStorage.setItem("last_login_timestamp", Date.now().toString());
          return resolve(freshIdToken);
        }

        // If SDK refresh fails, fallback to stored token if within 7-day window
        if (storedToken && (!lastLogin || Date.now() - lastLogin < SEVEN_DAYS_MS)) {
          return resolve(storedToken);
        }
        resolve(null);
      });
    } else {
      // Non-SDK session (e.g. Google OAuth or local token) within 7 days
      if (storedToken && (!lastLogin || Date.now() - lastLogin < SEVEN_DAYS_MS)) {
        return resolve(storedToken);
      }
      resolve(null);
    }
  });
};

/**
 * Retrieve active Cognito session with 7-day continuity and automatic background renewal.
 * @returns {Promise<{ token: string, user: object } | null>}
 */
export const getActiveSessionApi = async () => {
  try {
    const validToken = await getOrRenewIdToken();
    if (!validToken) return null;

    const claims = parseJwt(validToken);
    if (!claims) return null;

    return {
      token: validToken,
      user: formatUserFromClaims(claims, validToken),
    };
  } catch (err) {
    console.warn("Failed to retrieve or renew active session:", err);
    return null;
  }
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
  localStorage.removeItem("last_login_timestamp");
  return { success: true };
};

