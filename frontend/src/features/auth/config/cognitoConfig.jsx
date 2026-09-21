import { CognitoUserPool } from "amazon-cognito-identity-js";

/**
 * AWS Amazon Cognito Configuration for OmniDrive AI
 * Reads from Vite environment variables with graceful fallback defaults.
 */
export const cognitoConfig = {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || "ap-south-1_S6BEWSSAC",
  clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || "4gh5u5t7ckq7bpau1e7q6o0j3k",
  region: import.meta.env.VITE_AWS_REGION || "ap-south-1",
  domain: import.meta.env.VITE_COGNITO_DOMAIN || "omnidrive-ai-dev-6127c51d.auth.ap-south-1.amazoncognito.com",
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
