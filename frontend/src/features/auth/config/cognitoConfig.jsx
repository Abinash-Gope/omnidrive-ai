import { CognitoUserPool } from "amazon-cognito-identity-js";

/**
 * AWS Amazon Cognito Configuration for OmniDrive AI
 * Reads from Vite environment variables with graceful fallback defaults.
 */
export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "us-east-1_mockOmniDrivePool",
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "mockOmniDriveClient123456789",
  region: import.meta.env.VITE_AWS_REGION || "us-east-1",
  domain: import.meta.env.VITE_COGNITO_DOMAIN || "omnidrive-ai.auth.us-east-1.amazoncognito.com",
  redirectUri: import.meta.env.VITE_COGNITO_REDIRECT_URI || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"),
  responseType: "token", // Implicit grant returning #id_token=... in hash fragment
  scopes: ["email", "openid", "profile"],
};

/**
 * Initialize Amazon Cognito User Pool instance
 */
export const userPool = new CognitoUserPool({
  UserPoolId: cognitoConfig.userPoolId,
  ClientId: cognitoConfig.clientId,
});

/**
 * Construct the Hosted UI Google OAuth endpoint
 * Directs the browser to Amazon Cognito Hosted UI with identity_provider=Google
 */
export const getGoogleOAuthUrl = () => {
  const { domain, clientId, redirectUri, responseType, scopes } = cognitoConfig;
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const scopeParam = encodeURIComponent(scopes.join(" "));
  const redirectParam = encodeURIComponent(redirectUri);

  return `https://${cleanDomain}/oauth2/authorize?identity_provider=Google&response_type=${responseType}&client_id=${clientId}&redirect_uri=${redirectParam}&scope=${scopeParam}`;
};
