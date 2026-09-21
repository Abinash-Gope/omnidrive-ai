import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  activeModal: null, // 'auth' | 'upload' | 'videoPreview' | 'imagePreview' | 'pdfPreview'
  toast: null, // { type: 'success'|'error'|'info', message: '' }
  isSidebarOpen: true,
};

export const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    openModal: (state, action) => {
      state.activeModal = action.payload;
    },
    closeModal: (state) => {
      state.activeModal = null;
    },
    setToast: (state, action) => {
      state.toast = action.payload;
    },
    clearToast: (state) => {
      state.toast = null;
    },
    toggleSidebar: (state) => {
      state.isSidebarOpen = !state.isSidebarOpen;
    },
  },
});

export const { openModal, closeModal, setToast, clearToast, toggleSidebar } = uiSlice.actions;

export default uiSlice.reducer;
