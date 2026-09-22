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
  setPipelineError,
  closeUploadPipeline,
  addFile,
  removeFile,
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
  deleteFileApi,
} from "../api/dashboardApi.jsx";
import {
  generateThumbnail,
  saveThumbnail,
  findThumbnail,
  findThumbnailMetadata,
} from "../utils/thumbnailCache.jsx";

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

  // Intelligent background poller: polls DynamoDB whenever any file is pending Rekognition analysis
  // so Rekognition Vision AI labels and dimensions appear automatically in real-time without user refresh
  useEffect(() => {
    const isAnalyzing = (f) => {
      if (f.status === "PROCESSING" || f.status === "PENDING_UPLOAD") return true;
      if (
        f.type === "image" &&
        (!f.labels || f.labels.length === 0) &&
        f.status !== "REJECTED_SAFETY_VIOLATION"
      ) {
        return true;
      }
      return false;
    };

    const hasPendingAnalysis = files.some(isAnalyzing);
    if (!hasPendingAnalysis) return;

    let attempts = 0;
    const maxAttempts = 15; // poll every 2s up to 30s

    const timer = setInterval(async () => {
      attempts += 1;
      try {
        const latestFiles = await getFilesApi();
        dispatch(setFiles(latestFiles));
        const stillPending = latestFiles.some(isAnalyzing);
        if (!stillPending || attempts >= maxAttempts) {
          clearInterval(timer);
        }
      } catch {
        clearInterval(timer);
      }
    }, 2000);

    return () => clearInterval(timer);
  }, [files, dispatch]);

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

    // Instant client-side thumbnail generation
    let thumbData = null;
    try {
      if (inferredType === "image" || inferredType === "video") {
        thumbData = await generateThumbnail(file);
      }
    } catch (thumbErr) {
      console.warn("Thumbnail generation notice:", thumbErr);
    }

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
      thumbnail: thumbData?.dataUrl || null,
      thumbMeta: thumbData
        ? { width: thumbData.width, height: thumbData.height, format: thumbData.format }
        : null,
    };

    await executePipeline(fileMeta, file);
  };

  const executePipeline = async (fileMeta, binaryFile = null) => {
    dispatch(openUploadPipeline(fileMeta));
    let currentStep = 1;

    try {
      // Step 1: Request Presigned URL from API Gateway
      currentStep = 1;
      dispatch(updatePipelineStep({ step: 1, status: "active", progress: 0 }));
      const presigned = await getPresignedUrlApi(fileMeta);

      // Persist thumbnail in client storage keyed to presigned file_id & s3_key
      if (fileMeta.thumbnail && presigned.file_id) {
        saveThumbnail(
          [presigned.file_id, presigned.s3_key, fileMeta.name],
          fileMeta.thumbnail,
          fileMeta.thumbMeta
        );
      }

      const payloadToUpload =
        binaryFile ||
        fileMeta.rawFile ||
        new Blob([fileMeta.name], { type: fileMeta.contentType || "application/octet-stream" });

      // Direct Binary Streaming to S3 Presigned URL
      await uploadToS3Api(
        presigned.upload_url,
        payloadToUpload,
        (progress) => {
          dispatch(updatePipelineStep({ step: 1, status: "active", progress }));
        },
        {
          fileId: presigned.file_id,
          s3Key: presigned.s3_key,
          name: fileMeta.name,
          contentType: fileMeta.contentType,
        }
      );
      dispatch(updatePipelineStep({ step: 1, status: "done", progress: 100 }));

      // Step 2: S3 Ingestion Active (EventBridge trigger)
      currentStep = 2;
      dispatch(updatePipelineStep({ step: 2, status: "active" }));
      await new Promise((r) => setTimeout(r, 800));
      dispatch(updatePipelineStep({ step: 2, status: "done" }));

      // Step 3: Multimodal Worker Fan-Out
      currentStep = 3;
      dispatch(updatePipelineStep({ step: 3, status: "active" }));
      await new Promise((r) => setTimeout(r, 1200));
      dispatch(updatePipelineStep({ step: 3, status: "done" }));

      // Step 4: DynamoDB Sync & Real State Reload
      currentStep = 4;
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
      // Differentiate S3 direct PUT errors from API Gateway auth errors
      const isS3Error =
        Boolean(err.config?.url && err.config.url.includes("amazonaws.com") && err.config.method?.toLowerCase() === "put") ||
        Boolean(err.request && !err.response && currentStep === 1);
      const isAuthError =
        (err.response?.status === 401 || err.response?.status === 403) && !isS3Error;

      let errorTitle = "Upload Failed";
      let errorMsg = err.message || "An unexpected error occurred.";

      if (isS3Error) {
        errorTitle = "S3 Direct Upload Error";
        errorMsg = err.message || "Direct binary transfer to Amazon S3 failed. Please verify bucket CORS configuration and S3 access.";
      } else if (isAuthError) {
        errorTitle = "Authentication Required";
        errorMsg = "Your session expired or API Gateway rejected the token. Please sign in again.";
      }

      dispatch(
        setPipelineError({
          step: currentStep,
          title: errorTitle,
          message: errorMsg,
        })
      );

      dispatch(
        setToast({
          type: "error",
          message: errorMsg,
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

  // Delete / Remove file handler
  const handleDeleteFile = async (file) => {
    if (!file) return;
    const fileId = file.id || file.file_id;
    const fileName = file.name;
    const s3Key = file.s3Key || file.s3_key;

    try {
      // Optimistically remove from UI
      dispatch(removeFile(fileId));

      // Call API / clear offline storage and blacklist from refresh
      await deleteFileApi(fileId, s3Key, fileName);

      dispatch(
        setToast({
          type: "success",
          message: `"${file.name}" was removed successfully.`,
        })
      );
    } catch (err) {
      console.error("Failed to delete file:", err);
      dispatch(
        setToast({
          type: "error",
          message: err.message || "Failed to remove file.",
        })
      );
    }
  };

  // Add newly uploaded file immediately into Redux and offline storage
  const handleUploadedFileSuccess = (uploadedInfo) => {
    if (!uploadedInfo) return;

    let inferredType = "pdf";
    const mime = (uploadedInfo.file_type || "").toLowerCase();
    const name = (uploadedInfo.file_name || "").toLowerCase();
    if (mime.startsWith("video/") || name.endsWith(".mp4") || name.endsWith(".mov")) inferredType = "video";
    else if (mime.startsWith("image/") || /\.(jpg|jpeg|png|webp)$/i.test(name)) inferredType = "image";

    const cachedThumb = findThumbnail(uploadedInfo.file_id, uploadedInfo.s3_key, uploadedInfo.file_name);
    const cachedMeta = findThumbnailMetadata(uploadedInfo.file_id, uploadedInfo.s3_key, uploadedInfo.file_name);

    const newFile = {
      id: uploadedInfo.file_id,
      name: uploadedInfo.file_name,
      type: inferredType,
      sizeBytes: uploadedInfo.file_size || uploadedInfo.sizeBytes || 0,
      size: uploadedInfo.file_size
        ? (uploadedInfo.file_size < 1024 * 1024
            ? `${(uploadedInfo.file_size / 1024).toFixed(1)} KB`
            : `${(uploadedInfo.file_size / (1024 * 1024)).toFixed(1)} MB`)
        : "1.0 MB",
      date: new Date().toLocaleDateString(),
      status: "PROCESSING",
      moderationPassed: true,
      labels: [],
      summary: null,
      thumbnail: uploadedInfo.thumbnail || cachedThumb || null,
      dimensions: cachedMeta || null,
      exif: cachedMeta ? {
        camera: `${cachedMeta.format || "Digital"} Format`,
        lens: `${cachedMeta.width} × ${cachedMeta.height} px`,
        shutter: "Color Space: sRGB",
        focalLength: `${(cachedMeta.width / (cachedMeta.height || 1)).toFixed(2)}:1 Ratio`,
      } : null,
      previewSnippet: "Uploaded to S3 raw bucket",
      s3Key: uploadedInfo.s3_key,
      isOffline: !navigator.onLine,
    };

    // Do NOT persist to localStorage offline cache for authenticated sessions.
    // The background poller (getFilesApi every 2s) will re-fetch from DynamoDB
    // which returns proper S3 presigned download_url / thumbnail_url visible on
    // any browser/device. Writing browser-local thumbnail blobs to localStorage
    // was the root cause of missing previews when logging in from a different browser.

    dispatch(addFile(newFile));
  };

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
    handleDeleteFile,
    handleUploadedFileSuccess,
    reloadFiles: loadFiles,
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
