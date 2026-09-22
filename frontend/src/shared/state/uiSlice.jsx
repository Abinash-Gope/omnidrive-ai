import { createSlice } from "@reduxjs/toolkit";

const getInitialTheme = () => {
  try {
    const saved = localStorage.getItem("omnidrive_theme");
    if (saved === "dark" || saved === "light" || saved === "system") {
      return saved;
    }
    return "light";
  } catch {
    return "light";
  }
};

const initialState = {
  activeModal: null, // 'auth' | 'upload' | 'videoPreview' | 'imagePreview' | 'pdfPreview'
  toast: null, // { type: 'success'|'error'|'info', message: '' }
  isSidebarOpen: true,
  theme: getInitialTheme(),
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
    setTheme: (state, action) => {
      state.theme = action.payload;
    },
  },
});

export const { openModal, closeModal, setToast, clearToast, toggleSidebar, setTheme } = uiSlice.actions;

export default uiSlice.reducer;
