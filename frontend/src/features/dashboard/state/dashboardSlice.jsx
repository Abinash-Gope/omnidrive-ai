import { createSlice } from "@reduxjs/toolkit";
import { calculateStorageFromFiles } from "../utils/storageHelper.jsx";

const initialState = {
  files: [],
  trashFiles: [],
  starredIds: [],
  cloudTrashIds: [],
  quarantinedFiles: [],
  selectedFile: null,
  selectedFileIds: [],
  albums: [],
  activeAlbumId: null,
  activePhotoCategory: "all", // 'all' | 'people' | 'nature' | 'urban' | 'documents' | 'vehicles'
  activeTagFilter: null,
  photoViewMode: "cards", // 'cards' | 'wall'
  activeTab: "my-files", // 'my-files' | 'starred' | 'shared' | 'trash' | 'videos' | 'documents' | 'photos'
  filterType: "all", // 'all' | 'video' | 'image' | 'pdf'
  sortBy: "recent", // 'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'size-desc' | 'size-asc'
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
    setCloudState: (state, action) => {
      const { starredIds = [], trashIds = [], albums = [] } = action.payload || {};
      state.starredIds = starredIds;
      state.cloudTrashIds = trashIds;
      if (Array.isArray(albums)) {
        state.albums = albums;
      }

      const trashSet = new Set(trashIds);
      const starredSet = new Set(starredIds);

      // Re-apply to active files
      state.files = state.files.map((f) => ({
        ...f,
        isStarred: starredSet.has(f.id || f.file_id),
      }));

      // Move any files that match cloudTrashIds into trashFiles
      if (trashIds.length > 0 && state.files.length > 0) {
        const toTrash = state.files.filter((f) => trashSet.has(f.id || f.file_id));
        if (toTrash.length > 0) {
          state.files = state.files.filter((f) => !trashSet.has(f.id || f.file_id));
          state.trashFiles = [
            ...toTrash.map((t) => ({ ...t, inTrash: true })),
            ...state.trashFiles.filter((tf) => !toTrash.some((t) => (t.id || t.file_id) === (tf.id || tf.file_id))),
          ];
        }
      }
    },
    setFiles: (state, action) => {
      const all = action.payload || [];
      const trashIdSet = new Set([
        ...(state.trashFiles || []).map((t) => t.id || t.file_id),
        ...(state.cloudTrashIds || []),
      ]);
      const starredIdSet = new Set(state.starredIds || []);

      const validFiles = all
        .filter((f) => f.status !== "REJECTED_SAFETY_VIOLATION")
        .filter((f) => !trashIdSet.has(f.id || f.file_id))
        .map((f) => ({
          ...f,
          isStarred: starredIdSet.has(f.id || f.file_id),
        }));

      // Populate trashFiles from cloud files that are in trashIdSet
      const trashedFromRemote = all
        .filter((f) => f.status !== "REJECTED_SAFETY_VIOLATION" && trashIdSet.has(f.id || f.file_id))
        .map((f) => ({ ...f, inTrash: true }));

      const existingTrashIds = new Set(state.trashFiles.map((t) => t.id || t.file_id));
      const newTrashItems = trashedFromRemote.filter((t) => !existingTrashIds.has(t.id || t.file_id));
      state.trashFiles = [...state.trashFiles, ...newTrashItems];

      const seenIds = new Set();
      const uniqueValidFiles = [];
      for (const f of validFiles) {
        const uid = f.id || f.file_id || f.s3Key || f.s3_key;
        if (uid && seenIds.has(uid)) continue;
        if (uid) seenIds.add(uid);
        uniqueValidFiles.push(f);
      }
      state.files = uniqueValidFiles;
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
      state.activeTagFilter = null;
      state.activePhotoCategory = "all";
      state.filterType = "all";
      state.activeAlbumId = null;
      state.selectedFileIds = [];
    },
    setFilterType: (state, action) => {
      state.filterType = action.payload;
      state.activeTagFilter = null;
      state.activePhotoCategory = "all";
      state.selectedFileIds = [];
    },
    setSearchQuery: (state, action) => {
      state.searchQuery = action.payload;
    },
    setSortBy: (state, action) => {
      state.sortBy = action.payload;
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
      const newFile = action.payload;
      if (!newFile) return;
      const targetId = newFile.id || newFile.file_id;
      const targetKey = newFile.s3Key || newFile.s3_key;
      const existingIdx = state.files.findIndex(
        (f) =>
          (targetId && (f.id === targetId || f.file_id === targetId)) ||
          (targetKey && (f.s3Key === targetKey || f.s3_key === targetKey))
      );
      if (existingIdx >= 0) {
        state.files[existingIdx] = { ...state.files[existingIdx], ...newFile };
      } else {
        state.files.unshift(newFile);
      }
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
      let fileId = null;
      let quality = null;
      if (typeof action.payload === "string") {
        quality = action.payload;
        fileId = state.previewModal.file?.id || state.previewModal.file?.file_id;
      } else if (action.payload) {
        fileId = action.payload.fileId;
        quality = action.payload.quality;
      }
      if (!quality) return;

      const file = state.files.find(
        (f) => (f.id && f.id === fileId) || (f.file_id && f.file_id === fileId)
      );
      if (file) {
        file.activeQuality = quality;
      }
      if (
        state.previewModal.file &&
        (!fileId ||
          state.previewModal.file.id === fileId ||
          state.previewModal.file.file_id === fileId)
      ) {
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
    toggleStar: (state, action) => {
      const fileId = action.payload;
      const index = state.starredIds.indexOf(fileId);
      if (index >= 0) {
        state.starredIds.splice(index, 1);
      } else {
        state.starredIds.push(fileId);
      }

      // Update in active files
      const targetFile = state.files.find((f) => f.id === fileId || f.file_id === fileId);
      if (targetFile) {
        targetFile.isStarred = state.starredIds.includes(fileId);
      }
      if (state.previewModal.file && (state.previewModal.file.id === fileId || state.previewModal.file.file_id === fileId)) {
        state.previewModal.file.isStarred = state.starredIds.includes(fileId);
      }
    },
    moveToTrash: (state, action) => {
      const fileId = action.payload;
      const fileToTrash = state.files.find((f) => f.id === fileId || f.file_id === fileId);
      if (fileToTrash) {
        state.files = state.files.filter((f) => f.id !== fileId && f.file_id !== fileId);
        const trashedItem = {
          ...fileToTrash,
          inTrash: true,
          trashedAt: new Date().toISOString(),
        };
        state.trashFiles = [trashedItem, ...state.trashFiles.filter((t) => t.id !== fileId && t.file_id !== fileId)];
        if (!state.cloudTrashIds.includes(fileId)) {
          state.cloudTrashIds.push(fileId);
        }
        state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);
      }
    },
    restoreFromTrash: (state, action) => {
      const fileId = action.payload;
      const fileToRestore = state.trashFiles.find((f) => f.id === fileId || f.file_id === fileId);
      if (fileToRestore) {
        state.trashFiles = state.trashFiles.filter((f) => f.id !== fileId && f.file_id !== fileId);
        state.cloudTrashIds = state.cloudTrashIds.filter((id) => id !== fileId);
        const restoredItem = {
          ...fileToRestore,
          inTrash: false,
          trashedAt: null,
          isStarred: state.starredIds.includes(fileId),
        };
        state.files = [restoredItem, ...state.files.filter((f) => f.id !== fileId && f.file_id !== fileId)];
        state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);
      }
    },
    permanentDeleteFile: (state, action) => {
      const fileId = action.payload;
      state.trashFiles = state.trashFiles.filter((f) => f.id !== fileId && f.file_id !== fileId);
      state.cloudTrashIds = state.cloudTrashIds.filter((id) => id !== fileId);
      state.starredIds = state.starredIds.filter((id) => id !== fileId);
      state.files = state.files.filter((f) => f.id !== fileId && f.file_id !== fileId);
      state.quarantinedFiles = state.quarantinedFiles.filter((f) => f.id !== fileId && f.file_id !== fileId);
      state.selectedFileIds = state.selectedFileIds.filter((id) => id !== fileId);
      // Remove from all albums
      state.albums.forEach((album) => {
        album.fileIds = (album.fileIds || []).filter((id) => id !== fileId);
      });
      state.storage = calculateStorageFromFiles(state.files, state.storage?.totalGB || 15.0);
    },
    emptyTrash: (state) => {
      state.trashFiles = [];
      state.cloudTrashIds = [];
    },
    // Multi-Selection Reducers
    toggleSelectFile: (state, action) => {
      const fileId = typeof action.payload === "object" ? action.payload?.fileId : action.payload;
      if (!fileId) return;
      const index = state.selectedFileIds.indexOf(fileId);
      if (index >= 0) {
        state.selectedFileIds.splice(index, 1);
      } else {
        state.selectedFileIds.push(fileId);
      }
    },
    selectAllFiles: (state, action) => {
      state.selectedFileIds = action.payload || state.files.map((f) => f.id || f.file_id);
    },
    clearSelection: (state) => {
      state.selectedFileIds = [];
    },
    // Photo Gallery & View Mode Reducers
    setPhotoViewMode: (state, action) => {
      state.photoViewMode = action.payload || "cards"; // 'cards' | 'wall'
    },
    setPhotoCategory: (state, action) => {
      state.activePhotoCategory = action.payload || "all";
      state.activeTagFilter = null; // reset specific tag filter when category changes
    },
    setActiveTagFilter: (state, action) => {
      state.activeTagFilter = action.payload;
    },
    // Custom Albums Reducers
    setActiveAlbumId: (state, action) => {
      state.activeAlbumId = action.payload;
    },
    createAlbum: (state, action) => {
      const newAlbum = action.payload;
      if (newAlbum && !state.albums.some((a) => a.id === newAlbum.id)) {
        state.albums.push(newAlbum);
      }
    },
    deleteAlbum: (state, action) => {
      const albumId = action.payload;
      state.albums = state.albums.filter((a) => a.id !== albumId);
      if (state.activeAlbumId === albumId) {
        state.activeAlbumId = null;
      }
    },
    addFilesToAlbum: (state, action) => {
      const { albumId, fileIds = [] } = action.payload || {};
      const album = state.albums.find((a) => a.id === albumId);
      if (album) {
        album.fileIds = Array.from(new Set([...(album.fileIds || []), ...fileIds]));
      }
    },
    removeFilesFromAlbum: (state, action) => {
      const { albumId, fileIds = [] } = action.payload || {};
      const album = state.albums.find((a) => a.id === albumId);
      if (album) {
        album.fileIds = (album.fileIds || []).filter((id) => !fileIds.includes(id));
      }
    },
  },
});

export const {
  setCloudState,
  setFiles,
  setLoading,
  setError,
  setActiveTab,
  setFilterType,
  setSortBy,
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
  toggleStar,
  moveToTrash,
  restoreFromTrash,
  permanentDeleteFile,
  emptyTrash,
  toggleSelectFile,
  selectAllFiles,
  clearSelection,
  setPhotoViewMode,
  setPhotoCategory,
  setActiveTagFilter,
  setActiveAlbumId,
  createAlbum,
  deleteAlbum,
  addFilesToAlbum,
  removeFilesFromAlbum,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
