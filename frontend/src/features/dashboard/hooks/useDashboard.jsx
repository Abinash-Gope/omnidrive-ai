import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
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
} from "../state/dashboardSlice.jsx";
import { setToast } from "../../../shared/state/uiSlice.jsx";
import {
  getFilesApi,
  getPresignedUrlApi,
  uploadToS3Api,
  pollJobStatusApi,
} from "../api/dashboardApi.jsx";

/**
 * Layer 2: useDashboard Custom Hook
 * Controller/Orchestrator between UI presentation components and API/Redux state.
 */
export const useDashboard = () => {
  const dispatch = useDispatch();
  const {
    files,
    quarantinedFiles,
    activeTab,
    filterType,
    searchQuery,
    viewMode,
    storage,
    isLoading,
    error,
    uploadPipeline,
    previewModal,
  } = useSelector((state) => state.dashboard || {});

  // Load initial files on mount
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      dispatch(setLoading(true));
      const data = await getFilesApi();
      dispatch(setFiles(data));
    } catch (err) {
      dispatch(setError(err.message || "Failed to load files"));
    }
  };

  // Handle incoming file uploads (drag-and-drop or manual input)
  const handleUploadFile = async (file) => {
    if (!file) return;

    let inferredType = "pdf";
    if (file.type?.startsWith("video/") || file.name.endsWith(".mp4")) inferredType = "video";
    else if (file.type?.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(file.name)) inferredType = "image";

    const fileMeta = {
      name: file.name,
      type: inferredType,
      size: `${(file.size / (1024 * 1024) || 3.5).toFixed(1)} MB`,
      contentType:
        file.type ||
        (inferredType === "image"
          ? "image/jpeg"
          : inferredType === "video"
          ? "video/mp4"
          : "application/pdf"),
      fileSize: file.size || 1024,
      rawFile: file,
    };

    await executePipeline(fileMeta, file);
  };

  const executePipeline = async (fileMeta, binaryFile = null) => {
    dispatch(openUploadPipeline(fileMeta));

    try {
      // Step 1: Request Presigned URL from API Gateway
      dispatch(updatePipelineStep({ step: 1, status: "active", progress: 0 }));
      const presigned = await getPresignedUrlApi(fileMeta);

      const payloadToUpload =
        binaryFile ||
        fileMeta.rawFile ||
        new Blob([fileMeta.name], { type: fileMeta.contentType || "application/octet-stream" });

      // Step 2: Direct Binary Streaming to S3 Presigned URL
      await uploadToS3Api(presigned.upload_url, payloadToUpload, (progress) => {
        dispatch(updatePipelineStep({ step: 1, status: "active", progress }));
      });
      dispatch(updatePipelineStep({ step: 1, status: "done", progress: 100 }));

      // Step 2: S3 Ingestion Active (EventBridge trigger)
      dispatch(updatePipelineStep({ step: 2, status: "active" }));
      await new Promise((r) => setTimeout(r, 800));
      dispatch(updatePipelineStep({ step: 2, status: "done" }));

      // Step 3: Multimodal Worker Fan-Out
      dispatch(updatePipelineStep({ step: 3, status: "active" }));
      await new Promise((r) => setTimeout(r, 1200));
      dispatch(updatePipelineStep({ step: 3, status: "done" }));

      // Step 4: DynamoDB Sync & Real State Reload
      dispatch(updatePipelineStep({ step: 4, status: "active" }));
      await loadFiles();
      dispatch(updatePipelineStep({ step: 4, status: "done" }));

      dispatch(
        setToast({
          type: "success",
          message: `File "${fileMeta.name}" uploaded to S3 successfully!`,
        })
      );
    } catch (err) {
      dispatch(setPipelineViolation(err.message || "Upload failed. Please check AWS configuration."));
      dispatch(
        setToast({
          type: "error",
          message: err.message || "Failed to upload file to AWS S3.",
        })
      );
    }
  };

  // Filter & Search Logic
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.labels && f.labels.some((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (f.summary && f.summary.executive?.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterType === "all") return true;
    return f.type === filterType;
  });

  // Action handlers
  const handleSelectTab = (tabId) => dispatch(setActiveTab(tabId));
  const handleSelectFilter = (type) => dispatch(setFilterType(type));
  const handleSearch = (query) => dispatch(setSearchQuery(query));
  const handleToggleViewMode = () => dispatch(toggleViewMode());
  const handleClosePipeline = () => dispatch(closeUploadPipeline());
  const handleOpenPreview = (file) => dispatch(openPreviewModal(file));
  const handleClosePreview = () => dispatch(closePreviewModal());
  const handleChangeQuality = (quality) => dispatch(updateVideoQuality(quality));

  return {
    files: filteredFiles,
    totalFilesCount: files.length,
    allFilesCount: files.length,
    quarantinedFiles,
    activeTab,
    filterType,
    searchQuery,
    viewMode,
    storage,
    isLoading,
    error,
    uploadPipeline,
    previewModal,
    handleUploadFile,
    handleSelectTab: (tab) => dispatch(setActiveTab(tab)),
    handleSelectFilter: (type) => dispatch(setFilterType(type)),
    handleSearch: (query) => dispatch(setSearchQuery(query)),
    handleToggleViewMode: () => dispatch(toggleViewMode()),
    handleClosePipeline: () => dispatch(closeUploadPipeline()),
    handleOpenPreview: (file) => dispatch(openPreviewModal(file)),
    handleClosePreview: () => dispatch(closePreviewModal()),
    handleChangeQuality: (fileId, quality) => dispatch(updateVideoQuality({ fileId, quality })),
  };
};

export default useDashboard;
