import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  telemetry: null,
  activePricingTier: "pro",
  activeFaqIndex: null,
};

export const publicSlice = createSlice({
  name: "public",
  initialState,
  reducers: {
    setTelemetry: (state, action) => {
      state.telemetry = { ...state.telemetry, ...action.payload };
    },
    setActivePricingTier: (state, action) => {
      state.activePricingTier = action.payload;
    },
    toggleFaq: (state, action) => {
      state.activeFaqIndex = state.activeFaqIndex === action.payload ? null : action.payload;
    },
  },
});

export const { setTelemetry, setActivePricingTier, toggleFaq } = publicSlice.actions;

export default publicSlice.reducer;
