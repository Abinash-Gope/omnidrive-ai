import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/state/authSlice.jsx";
import dashboardReducer from "../features/dashboard/state/dashboardSlice.jsx";
import publicReducer from "../features/public/state/publicSlice.jsx";
import uiReducer from "../shared/state/uiSlice.jsx";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    public: publicReducer,
    ui: uiReducer,
  },
});

export default store;
