import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  files: [],
  quarantinedFiles: [],
  selectedFile: null,
  activeTab: "my-files", // 'my-files' | 'recent' | 'starred' | 'shared' | 'trash' | 'videos' | 'documents' | 'photos'
  filterType: "all", // 'all' | 'video' | 'image' | 'pdf'
  searchQuery: "",
  viewMode: "grid", // 'grid' | 'list'
  isLoading: false,
  error: null,
  storage: {
    usedGB: 1.2,
    totalGB: 15.0,
    usedPercentage: 8,
  },
  uploadPipeline: {
    isOpen: false,
    file: null,
    step: 0, // 1: S3 Upload, 2: Rekognition Gate, 3: Multimodal Worker, 4: DynamoDB Sync
    stepStatus: {
      1: "pending",
      2: "waiting",
      3: "waiting",
      4: "waiting",
    },
    uploadProgress: 0,
    isViolation: false,
    errorMessage: "",
  },
  previewModal: {
    isOpen: false,
    file: null,
  },
};

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setFiles: (state, action) => {
      state.files = action.payload;
      state.isLoading = false;
      state.error = null;
    },
    setLoading: (state, action) => {
      state.isLoading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setFilterType: (state, action) => {
      state.filterType = action.payload;
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    toggleViewMode: (state) => {
      state.viewMode = state.viewMode === "grid" ? "list" : "grid";
    },
    // Pipeline Drawer Reducers
    openUploadPipeline: (state, action) => {
      state.uploadPipeline = {
        isOpen: true,
        file: action.payload,
        step: 1,
        stepStatus: {
          1: "active",
          2: "waiting",
          3: "waiting",
          4: "waiting",
        },
        uploadProgress: 0,
        isViolation: false,
        errorMessage: "",
      };
    },
    updatePipelineStep: (state, action) => {
      const { step, status, progress } = action.payload;
      state.uploadPipeline.step = step;
      if (status) state.uploadPipeline.stepStatus[step] = status;
      if (progress !== undefined) state.uploadPipeline.uploadProgress = progress;
    },
    setPipelineViolation: (state, action) => {
      state.uploadPipeline.isViolation = true;
      state.uploadPipeline.stepStatus[2] = "failed";
      state.uploadPipeline.stepStatus[3] = "skipped";
      state.uploadPipeline.stepStatus[4] = "skipped";
      state.uploadPipeline.errorMessage = action.payload;
    },
    closeUploadPipeline: (state) => {
      state.uploadPipeline.isOpen = false;
    },
    addFile: (state, action) => {
      state.files.unshift(action.payload);
      state.storage.usedGB = +(state.storage.usedGB + 0.1).toFixed(2);
      state.storage.usedPercentage = Math.min(
        100,
        Math.round((state.storage.usedGB / state.storage.totalGB) * 100)
      );
    },
    addQuarantinedFile: (state, action) => {
      state.quarantinedFiles.unshift(action.payload);
    },
    // Preview Modal Reducers
    openPreviewModal: (state, action) => {
      state.previewModal = {
        isOpen: true,
        file: action.payload,
      };
    },
    closePreviewModal: (state) => {
      state.previewModal = {
        isOpen: false,
        file: null,
      };
    },
    updateVideoQuality: (state, action) => {
      const { fileId, quality } = action.payload;
      const file = state.files.find((f) => f.id === fileId);
      if (file) {
        file.activeQuality = quality;
      }
      if (state.previewModal.file && state.previewModal.file.id === fileId) {
        state.previewModal.file.activeQuality = quality;
      }
    },
  },
});

export const {
  setFiles,
  setLoading,
  setError,
  setActiveTab,
  setFilterType,
  setSearchQuery,
  toggleViewMode,
  openUploadPipeline,
  updatePipelineStep,
  setPipelineViolation,
  closeUploadPipeline,
  addFile,
  addQuarantinedFile,
  openPreviewModal,
  closePreviewModal,
  updateVideoQuality,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
