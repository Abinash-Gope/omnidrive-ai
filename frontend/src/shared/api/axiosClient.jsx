import axios from "axios";

import { isTokenExpired } from "../../features/auth/utils/jwtHelper.jsx";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Active Cognito ID Token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("idToken") || localStorage.getItem("authToken");
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Global Error Handling and Token Eviction
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("idToken");
      localStorage.removeItem("authToken");
      if (typeof window !== "undefined" && (window.location.pathname.startsWith("/dashboard") || window.location.pathname.startsWith("/profile"))) {
        window.location.assign("/");
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
