import { createSlice } from "@reduxjs/toolkit";
import { calculateStorageFromFiles } from "../utils/storageHelper.jsx";

const initialState = {
  files: [],
  quarantinedFiles: [],
  selectedFile: null,
  activeTab: "my-files", // 'my-files' | 'recent' | 'starred' | 'shared' | 'trash' | 'videos' | 'documents' | 'photos'
  filterType: "all", // 'all' | 'video' | 'image' | 'pdf'
  searchQuery: "",
  viewMode: "grid", // 'grid' | 'list'
  isLoading: true,
  error: null,
  storage: {
    usedBytes: 0,
    usedGB: 0,
    totalGB: 15.0,
    usedPercentage: 0,
    visualPercentage: 0,
    formattedUsed: "0 KB",
    formattedTotal: "15 GB",
    formattedPercent: "0%",
    freeBytesRemaining: 15 * 1024 * 1024 * 1024,
    formattedFree: "15 GB",
    breakdown: {
      imagesBytes: 0,
      formattedImages: "0 KB",
      videosBytes: 0,
      formattedVideos: "0 KB",
      documentsBytes: 0,
      formattedDocuments: "0 KB",
      otherBytes: 0,
      formattedOther: "0 KB",
    },
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
      const all = action.payload || [];
      state.files = all.filter((f) => f.status !== "REJECTED_SAFETY_VIOLATION");
      state.quarantinedFiles = all.filter((f) => f.status === "REJECTED_SAFETY_VIOLATION");
      state.isLoading = false;
      state.error = null;

      // Recalculate byte-accurate storage used based on real files in state
      state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);

      // Automatically sync any currently open preview modal with newly fetched labels/data
      if (state.previewModal.isOpen && state.previewModal.file) {
        const matching = state.files.find(
          (f) => f.id === state.previewModal.file.id || f.name === state.previewModal.file.name
        );
        if (matching) {
          state.previewModal.file = matching;
        }
      }
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
      state.uploadPipeline.errorMessage = typeof action.payload === "string" ? action.payload : action.payload?.message;
      state.uploadPipeline.errorTitle = "Flagged by Amazon Rekognition";
    },
    setPipelineError: (state, action) => {
      const payload = action.payload || {};
      const failedStep = payload.step || 1;
      state.uploadPipeline.isViolation = true;
      state.uploadPipeline.stepStatus[failedStep] = "failed";
      // Mark remaining steps as skipped
      for (let i = failedStep + 1; i <= 4; i++) {
        state.uploadPipeline.stepStatus[i] = "skipped";
      }
      state.uploadPipeline.errorMessage = payload.message || "Operation failed.";
      state.uploadPipeline.errorTitle = payload.title || "Pipeline Execution Error";
    },
    closeUploadPipeline: (state) => {
      state.uploadPipeline.isOpen = false;
    },
    addFile: (state, action) => {
      state.files.unshift(action.payload);
      state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);
    },
    removeFile: (state, action) => {
      const fileId = action.payload;
      state.files = state.files.filter((f) => f.id !== fileId);
      state.quarantinedFiles = state.quarantinedFiles.filter((f) => f.id !== fileId);
      state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);
    },
    setStorageQuota: (state, action) => {
      const totalGB = Number(action.payload) || 15.0;
      state.storage = calculateStorageFromFiles(state.files, totalGB);
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
    updateFileStatus: (state, action) => {
      const { fileId, ...updates } = action.payload;
      const file = state.files.find((f) => f.id === fileId);
      if (file) {
        Object.assign(file, updates);
      }
      if (state.previewModal.file && state.previewModal.file.id === fileId) {
        state.previewModal.file = { ...state.previewModal.file, ...updates };
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
  setPipelineError,
  closeUploadPipeline,
  addFile,
  removeFile,
  setStorageQuota,
  addQuarantinedFile,
  openPreviewModal,
  closePreviewModal,
  updateVideoQuality,
  updateFileStatus,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
