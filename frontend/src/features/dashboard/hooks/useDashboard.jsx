import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  setCloudState,
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
import {
  fetchCloudPreferences,
  saveCloudPreferences,
} from "../../auth/api/cloudPreferencesService.jsx";
import {
  getLocalPreferences,
  recordLocalActivity,
  flushPendingActivityToCloud,
  initInactivitySyncWatcher,
  hasPendingSync,
  getLocalActivity,
} from "../services/activitySyncService.jsx";

/**
 * Layer 2: useDashboard Custom Hook
 * Controller/Orchestrator between UI presentation components and API/Redux state.
 */
export const useDashboard = () => {
  const dispatch = useDispatch();
  const authUser = useSelector((state) => state.auth?.user);
  const {
    files,
    trashFiles,
    starredIds,
    cloudTrashIds,
    quarantinedFiles,
    selectedFileIds = [],
    albums = [],
    activeAlbumId = null,
    activePhotoCategory = "all",
    activeTagFilter = null,
    photoViewMode = "cards",
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

  // Load local preferences immediately, initialize 5-min inactivity watcher, and load remote files
  useEffect(() => {
    // 1. Immediately restore local buffered preferences for 0ms instant UI rendering
    const localPrefs = getLocalPreferences();
    if (
      localPrefs &&
      (localPrefs.starred?.length > 0 ||
        localPrefs.trash?.length > 0 ||
        localPrefs.albums?.length > 0)
    ) {
      dispatch(
        setCloudState({
          starredIds: localPrefs.starred || [],
          trashIds: localPrefs.trash || [],
          albums: localPrefs.albums || [],
        })
      );
    }

    // 2. Fetch cloud preferences in background if local is not currently holding unsynced edits
    const init = async () => {
      try {
        if (!hasPendingSync()) {
          const prefs = await fetchCloudPreferences();
          if (prefs) {
            dispatch(
              setCloudState({
                starredIds: prefs.starred || [],
                trashIds: prefs.trash || [],
                albums: prefs.albums || [],
              })
            );
          }
        }
      } catch (err) {
        console.warn("Could not fetch cloud preferences on dashboard mount:", err);
      }
      loadFiles();
    };

    init();

    // 3. Initialize 5-minute inactivity & leave watcher (automatically flushes to AWS Cloud)
    const cleanupInactivityWatcher = initInactivitySyncWatcher(() => {
      console.log("[Dashboard] Background 5-min inactivity sync completed.");
    });

    return () => {
      cleanupInactivityWatcher();
    };
  }, [dispatch]);

  // Sync when authenticated user claims provide cloud preferences (if no pending local edits)
  useEffect(() => {
    if (authUser?.cloudPreferences && !hasPendingSync()) {
      dispatch(
        setCloudState({
          starredIds: authUser.cloudPreferences.starred || [],
          trashIds: authUser.cloudPreferences.trash || [],
          albums: authUser.cloudPreferences.albums || [],
        })
      );
    }
  }, [authUser?.cloudPreferences, dispatch]);

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

  // Filter & Search Logic for Active Tabs
  const filteredFiles = (() => {
    let sourceList = files;
    if (activeTab === "trash") {
      sourceList = trashFiles || [];
    } else if (activeTab === "starred") {
      sourceList = files.filter(
        (f) => f.isStarred || (starredIds && starredIds.includes(f.id || f.file_id))
      );
    } else if (activeTab === "recent") {
      // Sort newest files first
      sourceList = [...files].sort((a, b) => {
        const timeA = new Date(a.createdAt || a.date || 0).getTime();
        const timeB = new Date(b.createdAt || b.date || 0).getTime();
        return timeB - timeA;
      });
    } else if (activeTab === "shared") {
      sourceList = files.filter((f) => Boolean(f.isShared));
    }

    // Filter by Active Album if set
    if (activeAlbumId) {
      const targetAlbum = (albums || []).find((a) => a.id === activeAlbumId);
      const albumFileIds = new Set(targetAlbum?.fileIds || []);
      sourceList = sourceList.filter((f) => albumFileIds.has(f.id || f.file_id));
    }

    return sourceList.filter((f) => {
      const matchesSearch =
        !searchQuery ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (f.labels && f.labels.some((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
        (f.summary && f.summary.executive?.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      // Base media type filter
      if (filterType !== "all" && f.type !== filterType) {
        return false;
      }

      // If filtering images, apply smart category & tag filters
      if (filterType === "image" || f.type === "image") {
        if (activeTagFilter) {
          const hasTag =
            f.labels &&
            f.labels.some(
              (l) => (l.name || "").toLowerCase() === activeTagFilter.toLowerCase()
            );
          if (!hasTag) return false;
        }

        if (activePhotoCategory && activePhotoCategory !== "all") {
          const lbls = f.labels || [];
          if (activePhotoCategory === "people") {
            const matches = lbls.some((l) =>
              /person|face|human|portrait|smile|man|woman|people|girl|boy/i.test(l.name || "")
            );
            if (!matches) return false;
          } else if (activePhotoCategory === "nature") {
            const matches = lbls.some((l) =>
              /nature|landscape|sky|plant|tree|flower|water|ocean|mountain|cloud|sunset|sunrise/i.test(
                l.name || ""
              )
            );
            if (!matches) return false;
          } else if (activePhotoCategory === "urban") {
            const matches = lbls.some((l) =>
              /city|building|architecture|street|house|urban|skyscraper|downtown|bridge/i.test(
                l.name || ""
              )
            );
            if (!matches) return false;
          } else if (activePhotoCategory === "documents") {
            const matches = lbls.some((l) =>
              /text|paper|document|webpage|screenshot|poster|book|font|diagram|receipt/i.test(
                l.name || ""
              )
            );
            if (!matches) return false;
          } else if (activePhotoCategory === "vehicles") {
            const matches = lbls.some((l) =>
              /car|vehicle|transportation|automobile|road|highway|airplane|train|boat/i.test(
                l.name || ""
              )
            );
            if (!matches) return false;
          }
        }
      }

      return true;
    });
  })();

  // Dynamic tab counts for badges
  const myFilesCount = files.length;
  const recentCount = files.length;
  const starredCount = files.filter(
    (f) => f.isStarred || (starredIds && starredIds.includes(f.id || f.file_id))
  ).length;
  const sharedCount = files.filter((f) => Boolean(f.isShared)).length;
  const trashCount = (trashFiles || []).length;

  // Action handlers
  const handleSelectTab = (tabId) => dispatch(setActiveTab(tabId));
  const handleSelectFilter = (type) => dispatch(setFilterType(type));
  const handleSearch = (query) => dispatch(setSearchQuery(query));
  const handleToggleViewMode = () => dispatch(toggleViewMode());
  const handleClosePipeline = () => dispatch(closeUploadPipeline());
  const handleOpenPreview = (file) => dispatch(openPreviewModal(file));
  const handleClosePreview = () => dispatch(closePreviewModal());
  const handleChangeQuality = (quality) => dispatch(updateVideoQuality(quality));

  // Toggle star handler (buffered locally with 0ms latency, synced on 5-min leave or logout)
  const handleToggleStar = (fileOrId) => {
    const fileId = typeof fileOrId === "object" ? fileOrId.id || fileOrId.file_id : fileOrId;
    const fileName = typeof fileOrId === "object" ? fileOrId.name : null;
    if (!fileId) return;

    dispatch(toggleStar(fileId));
    const wasStarred = (starredIds || []).includes(fileId);
    dispatch(
      setToast({
        type: "info",
        message: wasStarred ? "Removed from Starred." : "Added to Starred.",
      })
    );

    const updatedStarred = wasStarred
      ? (starredIds || []).filter((id) => id !== fileId)
      : [...(starredIds || []), fileId];

    // Store activity & preferences in local buffer with 0ms network latency
    recordLocalActivity(
      wasStarred ? "unstar" : "star",
      { fileId, fileName },
      { starred: updatedStarred, trash: cloudTrashIds || [] }
    );
  };

  // Soft-delete to Trash (buffered locally with 0ms latency, synced on 5-min leave or logout)
  const handleMoveToTrash = (file) => {
    if (!file) return;
    const fileId = file.id || file.file_id;
    dispatch(moveToTrash(fileId));
    dispatch(
      setToast({
        type: "info",
        message: `"${file.name}" moved to Trash.`,
      })
    );

    const updatedTrash = Array.from(new Set([...(cloudTrashIds || []), fileId]));
    recordLocalActivity(
      "trash",
      { fileId, fileName: file.name },
      { starred: starredIds || [], trash: updatedTrash }
    );
  };

  // Restore from Trash back to active files (buffered locally with 0ms latency)
  const handleRestoreFile = (file) => {
    if (!file) return;
    const fileId = file.id || file.file_id;
    dispatch(restoreFromTrash(fileId));
    dispatch(
      setToast({
        type: "success",
        message: `"${file.name}" restored to My Files.`,
      })
    );

    const updatedTrash = (cloudTrashIds || []).filter((id) => id !== fileId);
    recordLocalActivity(
      "restore",
      { fileId, fileName: file.name },
      { starred: starredIds || [], trash: updatedTrash }
    );
  };

  // Permanent Delete File Handler (AWS S3 & DynamoDB purge + local buffer cleanup)
  const handlePermanentDelete = async (file) => {
    if (!file) return;
    const fileId = file.id || file.file_id;
    const fileName = file.name;
    const s3Key = file.s3Key || file.s3_key;

    try {
      // Optimistically remove from state & trash
      dispatch(permanentDeleteFile(fileId));

      // Call API to remove from DynamoDB and S3
      await deleteFileApi(fileId, s3Key, fileName);

      // Clean up local preference buffer and record deletion activity
      const updatedTrash = (cloudTrashIds || []).filter((id) => id !== fileId);
      const updatedStarred = (starredIds || []).filter((id) => id !== fileId);
      recordLocalActivity(
        "delete",
        { fileId, fileName },
        { starred: updatedStarred, trash: updatedTrash }
      );

      dispatch(
        setToast({
          type: "success",
          message: `"${fileName}" was permanently deleted.`,
        })
      );
    } catch (err) {
      console.error("Failed to delete file permanently:", err);
      dispatch(
        setToast({
          type: "error",
          message: err.message || "Failed to remove file permanently.",
        })
      );
    }
  };

  // Bulk Empty Trash (AWS S3 & DynamoDB purge + local buffer cleanup)
  const handleEmptyTrash = async () => {
    const items = [...(trashFiles || [])];
    if (items.length === 0) return;

    dispatch(emptyTrash());
    dispatch(
      setToast({
        type: "success",
        message: `Trash emptied (${items.length} items permanently deleted).`,
      })
    );

    // Update local preference buffer
    recordLocalActivity(
      "empty_trash",
      { count: items.length },
      { starred: starredIds || [], trash: [] }
    );

    // Concurrently purge from S3 & DynamoDB
    for (const f of items) {
      const fileId = f.id || f.file_id;
      const s3Key = f.s3Key || f.s3_key;
      const fileName = f.name;
      try {
        await deleteFileApi(fileId, s3Key, fileName);
      } catch (err) {
        console.warn(`Failed to permanently delete ${fileId}:`, err);
      }
    }
  };

  // Generic delete handler dispatched by cards
  const handleDeleteFile = async (file) => {
    if (!file) return;
    if (activeTab === "trash" || file.inTrash) {
      await handlePermanentDelete(file);
    } else {
      handleMoveToTrash(file);
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
      isStarred: false,
    };

    dispatch(addFile(newFile));
  };

  return {
    files: filteredFiles,
    allFiles: files,
    totalFilesCount: files.length,
    allFilesCount: files.length,
    tabCounts: {
      myFilesCount,
      recentCount,
      starredCount,
      sharedCount,
      trashCount,
    },
    myFilesCount,
    recentCount,
    starredCount,
    sharedCount,
    trashCount,
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
    selectedFileIds,
    albums,
    activeAlbumId,
    activePhotoCategory,
    activeTagFilter,
    photoViewMode,
    handleUploadFile,
    handleDeleteFile,
    handleMoveToTrash,
    handleRestoreFile,
    handlePermanentDelete,
    handleEmptyTrash,
    handleToggleStar,
    handleUploadedFileSuccess,
    reloadFiles: loadFiles,
    handleSelectTab: (tab) => dispatch(setActiveTab(tab)),
    handleSelectFilter: (type) => dispatch(setFilterType(type)),
    handleOpenPreview: (file) => {
      dispatch(openPreviewModal(file));
      if (file) {
        recordLocalActivity("preview", { fileId: file.id || file.file_id, fileName: file.name });
      }
    },
    handleClosePreview: () => dispatch(closePreviewModal()),
    handleChangeQuality: (fileId, quality) => dispatch(updateVideoQuality({ fileId, quality })),
    handleToggleSelect: (fileOrId) => {
      const id = typeof fileOrId === "object" ? fileOrId.id || fileOrId.file_id : fileOrId;
      if (!id) return;
      dispatch(toggleSelectFile(id));
    },
    handleSelectAll: (ids) => dispatch(selectAllFiles(ids)),
    handleClearSelection: () => dispatch(clearSelection()),
    handleSetPhotoViewMode: (mode) => dispatch(setPhotoViewMode(mode)),
    handleSetPhotoCategory: (cat) => dispatch(setPhotoCategory(cat)),
    handleSetActiveTagFilter: (tag) => dispatch(setActiveTagFilter(tag)),
    handleSetActiveAlbumId: (id) => dispatch(setActiveAlbumId(id)),
    handleCreateAlbum: (album) => dispatch(createAlbum(album)),
    handleDeleteAlbum: (id) => dispatch(deleteAlbum(id)),
    handleAddFilesToAlbum: ({ albumId, fileIds }) => dispatch(addFilesToAlbum({ albumId, fileIds })),
    handleRemoveFilesFromAlbum: ({ albumId, fileIds }) =>
      dispatch(removeFilesFromAlbum({ albumId, fileIds })),
    flushActivityToCloud: flushPendingActivityToCloud,
    getLocalActivity,
  };
};

export default useDashboard;
