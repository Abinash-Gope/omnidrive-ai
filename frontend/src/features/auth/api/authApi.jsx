import {
  AuthenticationDetails,
  CognitoUser,
  CognitoUserAttribute,
} from "amazon-cognito-identity-js";
import { userPool, cognitoConfig } from "../config/cognitoConfig.jsx";
import { parseJwt, formatUserFromClaims, isTokenExpired } from "../utils/jwtHelper.jsx";

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
