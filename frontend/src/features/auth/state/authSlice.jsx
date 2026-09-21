import { createSlice } from "@reduxjs/toolkit";

const token = localStorage.getItem("authToken");

const initialState = {
  user: token ? { name: "Alex Gope", email: "alex.gope@omnidrive.ai", avatar: "AG" } : null,
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
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.isLoading = false;
      state.error = null;
      localStorage.setItem("authToken", action.payload.token);
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

export const { setLoading, loginSuccess, loginFailure, logout } = authSlice.actions;

export default authSlice.reducer;
