import axiosInstance from "../../../shared/api/axiosClient.jsx";

/**
 * Layer 1: Pure Async Authentication API
 * No React code, no Redux dispatch. Pure async functions.
 */

export const loginApi = async (credentials) => {
  // Simulated backend auth or Cognito JWT exchange
  await new Promise((resolve) => setTimeout(resolve, 400));

  return {
    token: "mock-jwt-token-omnidrive-" + Date.now(),
    user: {
      id: "user-alex-001",
      name: "Alex Gope",
      email: credentials.email || "alex.gope@omnidrive.ai",
      avatar: "AG",
      role: "Lead Cloud Architect",
    },
  };
};

export const googleOAuthApi = async () => {
  // Simulated Google Workspace SSO OAuth exchange
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    token: "mock-google-oauth-jwt-" + Date.now(),
    user: {
      id: "user-google-workspace-101",
      name: "Alex Chen",
      email: "alex@enterprise-cloud.io",
      avatar: "AC",
      role: "Enterprise Cloud Architect",
      company: "Acme Cloud Infrastructure",
    },
  };
};

export const registerApi = async (userData) => {
  // Simulated Enterprise Workspace Registration
  await new Promise((resolve) => setTimeout(resolve, 600));

  return {
    token: "mock-jwt-register-" + Date.now(),
    user: {
      id: "user-" + Date.now(),
      name: userData.fullName || "Enterprise Lead",
      email: userData.email,
      avatar: (userData.fullName || "EN").slice(0, 2).toUpperCase(),
      role: "Enterprise Admin",
      deploymentModel: userData.deploymentModel || "Dedicated AWS VPC",
    },
  };
};

export const logoutApi = async () => {
  await new Promise((resolve) => setTimeout(resolve, 150));
  return { success: true };
};
