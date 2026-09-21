import { createSlice } from "@reduxjs/toolkit";

const token = localStorage.getItem("authToken");

const storedPlan = localStorage.getItem("userPlan") || "free";

const initialState = {
  user: token
    ? {
        name: "Alex Gope",
        email: "alex.gope@omnidrive.ai",
        avatar: "AG",
        role: storedPlan === "enterprise" ? "Enterprise VPC Admin" : storedPlan === "pro" ? "Pro Cloud Creator" : "Sandbox Developer",
        plan: storedPlan,
      }
    : null,
  token: token || null,
  isAuthenticated: !!token,
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
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem("authToken", action.payload.token);
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
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem("authToken");
    },
  },
});

export const { setLoading, loginSuccess, loginFailure, logout, updatePlan } = authSlice.actions;

export default authSlice.reducer;
