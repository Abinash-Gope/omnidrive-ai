import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { getGoogleOAuthUrl } from "../config/cognitoConfig.jsx";
import { parseJwt, isTokenExpired, formatUserFromClaims, isSessionWithinSevenDays } from "../utils/jwtHelper.jsx";
import { loginApi, registerApi, logoutApi, getActiveSessionApi, getOrRenewIdToken } from "../api/authApi.jsx";
import { loginSuccess, logout as reduxLogout, setLoading as setReduxLoading, loginFailure } from "../state/authSlice.jsx";
import { setToast } from "../../../shared/state/uiSlice.jsx";
import { flushPendingActivityToCloud } from "../../dashboard/services/activitySyncService.jsx";

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Helper function to retrieve the active JWT token string
   * Always auto-renews via Cognito refresh token if expiring within 7-day window
   */
  const getIdToken = useCallback(() => {
    if (idToken && !isTokenExpired(idToken)) {
      return idToken;
    }
    const stored = localStorage.getItem("idToken") || localStorage.getItem("authToken");
    if (stored && (!isTokenExpired(stored) || isSessionWithinSevenDays())) {
      return stored;
    }
    return null;
  }, [idToken]);

  /**
   * Complete login session helper with 7-day persistence
   */
  const establishSession = useCallback((token, userData) => {
    setIdToken(token);
    setUser(userData);
    setIsAuthenticated(true);
    setError(null);

    // Save tokens and session timestamp in persistent storage (7-day window)
    localStorage.setItem("idToken", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("last_login_timestamp", Date.now().toString());
    localStorage.setItem("userPlan", userData.plan || "free");

    // Sync with Redux auth slice
    dispatch(loginSuccess({ token, user: userData }));
  }, [dispatch]);


  /**
   * 1. Google OAuth Initiation
   * Redirects browser to Amazon Cognito Hosted UI endpoint with Google IdP
   */
  const loginWithGoogle = useCallback(() => {
    setIsLoading(true);
    setError(null);
    const hostedUiUrl = getGoogleOAuthUrl();
    window.location.assign(hostedUiUrl);
  }, []);

  /**
   * 2. Email & Password SRP Authentication
   */
  const loginWithEmail = useCallback(async (email, password) => {
    setIsLoading(true);
    setError(null);
    dispatch(setReduxLoading(true));

    try {
      const result = await loginApi({ email, password });
      establishSession(result.token, result.user);
      setIsLoading(false);
      return result;
    } catch (err) {
      const errorMsg = err.message || "Invalid email or password.";
      setError(errorMsg);
      setIsLoading(false);
      dispatch(loginFailure(errorMsg));
      throw err;
    }
  }, [establishSession, dispatch]);

  /**
   * 3. Terminate Active Cognito Session
   */
  const logout = useCallback(async () => {
    try {
      // 1. Immediately flush all buffered local activity & preferences to AWS Cognito Cloud before signing out
      try {
        await Promise.race([
          flushPendingActivityToCloud(),
          new Promise((resolve) => setTimeout(resolve, 3500)), // Safe 3.5s timeout so logout never hangs on offline/slow network
        ]);
      } catch (syncErr) {
        console.warn("Could not flush activity before logout:", syncErr);
      }
      await logoutApi();
    } catch (err) {
      console.warn("Logout error:", err);
    } finally {
      setUser(null);
      setIdToken(null);
      setIsAuthenticated(false);
      setError(null);
      localStorage.removeItem("idToken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("last_login_timestamp");
      dispatch(reduxLogout());
      navigate("/");
    }
  }, [dispatch, navigate]);

  /**
   * 5. Update user plan in context (without re-login)
   */
  const updateUserPlan = useCallback((newPlan) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = {
        ...prev,
        plan: newPlan,
        role: newPlan === "enterprise" ? "Enterprise VPC Admin" : newPlan === "pro" ? "Pro Cloud Creator" : "Sandbox Developer",
      };
      localStorage.setItem("userPlan", newPlan);
      return updated;
    });
  }, []);

  /**
   * 4. App Initialization & OAuth Callback Processing
   */
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Check URL Hash and Query for OAuth return (#id_token=... or error)
      if (typeof window !== "undefined") {
        const hashParams = window.location.hash ? new URLSearchParams(window.location.hash.substring(1)) : null;
        const searchParams = window.location.search ? new URLSearchParams(window.location.search) : null;

        const oauthError =
          hashParams?.get("error_description") ||
          hashParams?.get("error") ||
          searchParams?.get("error_description") ||
          searchParams?.get("errorMessage");

        if (oauthError) {
          dispatch(
            setToast({
              type: "error",
              message: decodeURIComponent(oauthError).replace(/\+/g, " "),
            })
          );
          window.history.replaceState(null, "", window.location.pathname);
        }

        const hashIdToken = hashParams?.get("id_token");
        if (hashIdToken) {
          if (!isTokenExpired(hashIdToken)) {
            const claims = parseJwt(hashIdToken);
            if (claims) {
              const userData = formatUserFromClaims(claims, hashIdToken);
              establishSession(hashIdToken, userData);

              // Clean hash parameters from URL bar without full page reload
              window.history.replaceState(null, "", window.location.pathname);
              setIsLoading(false);
              dispatch(
                setToast({
                  type: "success",
                  message: `Signed in with Google as ${userData.name}! Welcome to OmniDrive AI.`,
                })
              );
              navigate("/dashboard", { replace: true });
              return;
            }
          }
          // Hash token was expired or invalid
          window.history.replaceState(null, "", window.location.pathname);
        }
      }

      // Check stored session or active Cognito UserPool session
      try {
        const activeSession = await getActiveSessionApi();
        if (activeSession && activeSession.token) {
          establishSession(activeSession.token, activeSession.user);
        } else {
          // Clear any expired residuals
          localStorage.removeItem("idToken");
          localStorage.removeItem("authToken");
          setIsAuthenticated(false);
          setUser(null);
          setIdToken(null);
        }
      } catch (err) {
        console.warn("Error restoring session:", err);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [establishSession, navigate]);

  const value = {
    isAuthenticated,
    user,
    idToken,
    isLoading,
    error,
    loginWithGoogle,
    loginWithEmail,
    logout,
    getIdToken,
    establishSession,
    updateUserPlan,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthContext must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
