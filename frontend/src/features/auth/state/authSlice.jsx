import { createSlice } from "@reduxjs/toolkit";
import { parseJwt, isTokenExpired, formatUserFromClaims } from "../utils/jwtHelper.jsx";

const storedToken = localStorage.getItem("idToken") || localStorage.getItem("authToken");
const validToken = storedToken && !isTokenExpired(storedToken) ? storedToken : null;
const decodedClaims = validToken ? parseJwt(validToken) : null;
const initialUser = decodedClaims ? formatUserFromClaims(decodedClaims, validToken) : null;

const initialState = {
  user: initialUser,
  token: validToken,
  idToken: validToken,
  isAuthenticated: !!validToken,
  isLoading: false,
  error: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    loginSuccess: (state, action) => {
      const activePlan = action.payload.user?.plan || localStorage.getItem("userPlan") || "free";
      state.user = {
        ...action.payload.user,
        plan: activePlan,
        role: activePlan === "enterprise" ? "Enterprise VPC Admin" : activePlan === "pro" ? "Pro Cloud Creator" : "Sandbox Developer",
      };
      state.token = action.payload.token;
      state.idToken = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem("authToken", action.payload.token);
      localStorage.setItem("idToken", action.payload.token);
      localStorage.setItem("userPlan", activePlan);
    },
    updatePlan: (state, action) => {
      const newPlan = action.payload;
      if (state.user) {
        state.user.plan = newPlan;
        state.user.role = newPlan === "enterprise" ? "Enterprise VPC Admin" : newPlan === "pro" ? "Pro Cloud Creator" : "Sandbox Developer";
      }
      localStorage.setItem("userPlan", newPlan);
    },
    loginFailure: (state, action) => {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.idToken = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("authToken");
      localStorage.removeItem("idToken");
    },
  },
});

export const { setLoading, loginSuccess, loginFailure, logout, updatePlan } = authSlice.actions;

export default authSlice.reducer;
