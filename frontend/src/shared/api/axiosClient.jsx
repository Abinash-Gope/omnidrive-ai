import axios from "axios";
import { getOrRenewIdToken } from "../../features/auth/api/authApi.jsx";
import { isSessionWithinSevenDays } from "../../features/auth/utils/jwtHelper.jsx";

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach Guaranteed-Fresh Cognito ID Token
// Transparently renews token if expiring, enforcing the 7-day persistent session
axiosInstance.interceptors.request.use(
  async (config) => {
    try {
      const token = await getOrRenewIdToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        // Keep active session rolling while user is actively making requests
        localStorage.setItem("last_login_timestamp", Date.now().toString());
      }
    } catch (err) {
      console.warn("Axios request interceptor token check:", err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: 401 Recovery & Token Eviction
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If 401 occurs and we haven't retried yet, attempt a single transparent token refresh
    if (error.response && error.response.status === 401 && originalRequest && !originalRequest._retry) {
      const withinSevenDays = isSessionWithinSevenDays();

      if (withinSevenDays) {
        originalRequest._retry = true;
        try {
          // Force refresh via Cognito refresh token
          const freshToken = await getOrRenewIdToken();
          if (freshToken) {
            originalRequest.headers.Authorization = `Bearer ${freshToken}`;
            return axiosInstance(originalRequest);
          }
        } catch (refreshErr) {
          console.warn("Silent token renewal failed on 401 retry:", refreshErr);
        }
      }

      // If user is truly past 7 days or refresh failed, clean up and redirect
      localStorage.removeItem("idToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("last_login_timestamp");
      if (
        typeof window !== "undefined" &&
        (window.location.pathname.startsWith("/dashboard") || window.location.pathname.startsWith("/profile"))
      ) {
        window.location.assign("/");
      }
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;

