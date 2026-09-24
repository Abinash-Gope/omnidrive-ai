import { useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
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
  setActiveFolderId,
  createFolder,
  deleteFolder,
  renameFolder,
  addFilesToFolder,
  removeFilesFromFolder,
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
    folders = [],
    activeFolderId = null,
    albums = [],
    activeAlbumId = null,
    activePhotoCategory = "all",
    activeTagFilter = null,
    photoViewMode = "cards",
    activeTab,
    filterType,
    sortBy = "recent",
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
        localPrefs.folders?.length > 0 ||
        localPrefs.albums?.length > 0)
    ) {
      dispatch(
        setCloudState({
          starredIds: localPrefs.starred || [],
          trashIds: localPrefs.trash || [],
          folders: localPrefs.folders || localPrefs.albums || [],
          albums: localPrefs.folders || localPrefs.albums || [],
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
                folders: prefs.folders || prefs.albums || [],
                albums: prefs.folders || prefs.albums || [],
              })
            );
            if (prefs.summaries && typeof prefs.summaries === "object") {
              Object.entries(prefs.summaries).forEach(([fid, sumData]) => {
                dispatch(
                  updateFileStatus({
                    fileId: fid,
                    summary: sumData,
                    takeaways: sumData?.takeaways || [],
                  })
                );
              });
            }
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
    } else if (activeTab === "shared") {
      sourceList = files.filter((f) => Boolean(f.isShared));
    }

    // Filter by Active Folder if set, or exclude folder items from root My Files view
    const currentFolderId = activeFolderId || activeAlbumId;
    if (currentFolderId) {
      const allFlds = (folders && folders.length > 0) ? folders : albums;
      const targetFolder = (allFlds || []).find((f) => f.id === currentFolderId);
      const folderFileIds = new Set(targetFolder?.fileIds || []);
      sourceList = sourceList.filter((f) => folderFileIds.has(f.id || f.file_id));
    } else if (activeTab === "my-files" || !activeTab) {
      // In the dashboard all files page (root view), do not show items that are inside any folder
      const allFlds = (folders && folders.length > 0) ? folders : albums;
      const allFolderFileIds = new Set(
        (allFlds || []).flatMap((f) => f.fileIds || [])
      );
      sourceList = sourceList.filter((f) => !allFolderFileIds.has(f.id || f.file_id));
    }

    const filtered = sourceList.filter((f) => {
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
      if (filterType === "image") {
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

    // Helper to robustly extract timestamp
    const getTimestamp = (item) => {
      const val =
        item.createdAt ||
        item.created_at ||
        item.uploadDate ||
        item.lastModified ||
        item.timestamp;
      if (typeof val === "number" && !isNaN(val)) return val;
      if (val) {
        const parsed = new Date(val).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      if (item.date && item.date !== "Recently") {
        const parsed = new Date(item.date).getTime();
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      // Check for timestamp inside file ID
      const idMatch = String(item.id || item.file_id || "").match(/(\d{10,13})/);
      if (idMatch) {
        const num = Number(idMatch[1]);
        if (!isNaN(num) && num > 1600000000000) return num;
        if (!isNaN(num) && num > 1600000000) return num * 1000;
      }
      return 0;
    };

    // Helper to robustly extract file size in bytes
    const getFileSize = (item) => {
      if (typeof item.sizeBytes === "number" && !isNaN(item.sizeBytes) && item.sizeBytes > 0) {
        return item.sizeBytes;
      }
      if (typeof item.file_size === "number" && !isNaN(item.file_size) && item.file_size > 0) {
        return item.file_size;
      }
      if (typeof item.size === "number" && !isNaN(item.size) && item.size > 0) {
        return item.size;
      }
      if (typeof item.fileSize === "number" && !isNaN(item.fileSize) && item.fileSize > 0) {
        return item.fileSize;
      }
      if (typeof item.bytes === "number" && !isNaN(item.bytes) && item.bytes > 0) {
        return item.bytes;
      }
      if (typeof item.file_size === "string" && !isNaN(Number(item.file_size)) && Number(item.file_size) > 0) {
        return Number(item.file_size);
      }
      // Parse formatted strings like "2.5 MB", "500 KB", "1.2 GB"
      const sizeStr = typeof item.size === "string" ? item.size : typeof item.fileSize === "string" ? item.fileSize : "";
      if (sizeStr) {
        const match = sizeStr.trim().match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
        if (match) {
          const num = parseFloat(match[1]);
          const unit = (match[2] || "").toUpperCase();
          if (unit.startsWith("K")) return Math.round(num * 1024);
          if (unit.startsWith("M")) return Math.round(num * 1024 * 1024);
          if (unit.startsWith("G")) return Math.round(num * 1024 * 1024 * 1024);
          if (unit.startsWith("T")) return Math.round(num * 1024 * 1024 * 1024 * 1024);
          return Math.round(num);
        }
      }
      return 0;
    };

    // Apply Sort By (Recent / Newest first by default)
    return [...filtered].sort((a, b) => {
      if (sortBy === "oldest") {
        const diff = getTimestamp(a) - getTimestamp(b);
        if (diff !== 0) return diff;
        return (a.id || a.file_id || "").localeCompare(b.id || b.file_id || "");
      }
      if (sortBy === "name-asc") {
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
      }
      if (sortBy === "name-desc") {
        return (b.name || "").localeCompare(a.name || "", undefined, { sensitivity: "base", numeric: true });
      }
      if (sortBy === "size-desc") {
        const diff = getFileSize(b) - getFileSize(a);
        if (diff !== 0) return diff;
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
      }
      if (sortBy === "size-asc") {
        const diff = getFileSize(a) - getFileSize(b);
        if (diff !== 0) return diff;
        return (a.name || "").localeCompare(b.name || "", undefined, { sensitivity: "base", numeric: true });
      }
      // Default: "recent" (newest first)
      const diff = getTimestamp(b) - getTimestamp(a);
      if (diff !== 0) return diff;
      return (b.id || b.file_id || "").localeCompare(a.id || a.file_id || "");
    });
  })();

  // Dynamic tab counts for badges
  const allFolderFileIds = new Set(
    ((folders && folders.length > 0 ? folders : albums) || []).flatMap((f) => f.fileIds || [])
  );
  const myFilesCount = files.filter((f) => !allFolderFileIds.has(f.id || f.file_id)).length;
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
      { starred: updatedStarred, trash: cloudTrashIds || [], folders: folders || [] }
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
      { starred: starredIds || [], trash: updatedTrash, folders: folders || [] }
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
      { starred: starredIds || [], trash: updatedTrash, folders: folders || [] }
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

      // Clean up local preference buffer and record deletion activity
      const updatedTrash = (cloudTrashIds || []).filter((id) => id !== fileId);
      const updatedStarred = (starredIds || []).filter((id) => id !== fileId);
      const updatedFolders = (folders || []).map((f) => ({
        ...f,
        fileIds: (f.fileIds || []).filter((id) => id !== fileId),
      }));
      recordLocalActivity(
        "delete",
        { fileId, fileName },
        { starred: updatedStarred, trash: updatedTrash, folders: updatedFolders }
      );

      // Call API to remove from DynamoDB and S3
      await deleteFileApi(fileId, s3Key, fileName);

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
      { starred: starredIds || [], trash: [], folders: folders || [] }
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
      createdAt: new Date().toISOString(),
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
      starredCount,
      sharedCount,
      trashCount,
    },
    myFilesCount,
    starredCount,
    sharedCount,
    trashCount,
    quarantinedFiles,
    activeTab,
    filterType,
    sortBy,
    searchQuery,
    viewMode,
    storage,
    isLoading,
    error,
    uploadPipeline,
    previewModal,
    selectedFileIds,
    folders: (folders && folders.length > 0 ? folders : albums) || [],
    activeFolderId: activeFolderId || activeAlbumId,
    albums: (folders && folders.length > 0 ? folders : albums) || [],
    activeAlbumId: activeFolderId || activeAlbumId,
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
    handleSetSortBy: (sortKey) => dispatch(setSortBy(sortKey)),
    handleSearch: (query) => dispatch(setSearchQuery(query)),
    handleToggleViewMode: () => dispatch(toggleViewMode()),
    handleClosePipeline: () => dispatch(closeUploadPipeline()),
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
    handleSetActiveFolderId: (id) => dispatch(setActiveFolderId(id)),
    handleCreateFolder: (folder) => {
      dispatch(createFolder(folder));
      const updatedFolders = [...(folders || []), folder];
      recordLocalActivity(
        "folder_create",
        { folderId: folder.id, folderName: folder.name },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleDeleteFolder: (folderId) => {
      dispatch(deleteFolder(folderId));
      const updatedFolders = (folders || []).filter((f) => f.id !== folderId);
      recordLocalActivity(
        "folder_delete",
        { folderId },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleRenameFolder: ({ folderId, newName }) => {
      dispatch(renameFolder({ folderId, newName }));
      const updatedFolders = (folders || []).map((f) =>
        f.id === folderId ? { ...f, name: newName?.trim() } : f
      );
      recordLocalActivity(
        "folder_rename",
        { folderId, newName },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleAddFilesToFolder: ({ folderId, fileIds }) => {
      dispatch(addFilesToFolder({ folderId, fileIds }));
      const updatedFolders = (folders || []).map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            fileIds: Array.from(new Set([...(f.fileIds || []), ...fileIds])),
          };
        }
        return f;
      });
      recordLocalActivity(
        "folder_add_files",
        { folderId, count: fileIds?.length || 0 },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleRemoveFilesFromFolder: ({ folderId, fileIds }) => {
      dispatch(removeFilesFromFolder({ folderId, fileIds }));
      const updatedFolders = (folders || []).map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            fileIds: (f.fileIds || []).filter((id) => !fileIds.includes(id)),
          };
        }
        return f;
      });
      recordLocalActivity(
        "folder_remove_files",
        { folderId, count: fileIds?.length || 0 },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleSetActiveAlbumId: (id) => dispatch(setActiveFolderId(id)),
    handleCreateAlbum: (album) => {
      dispatch(createFolder(album));
      const updatedFolders = [...(folders || []), album];
      recordLocalActivity(
        "folder_create",
        { folderId: album.id, folderName: album.name },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleDeleteAlbum: (id) => {
      dispatch(deleteFolder(id));
      const updatedFolders = (folders || []).filter((f) => f.id !== id);
      recordLocalActivity(
        "folder_delete",
        { folderId: id },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleAddFilesToAlbum: ({ albumId, fileIds }) => {
      dispatch(addFilesToFolder({ folderId: albumId, fileIds }));
      const updatedFolders = (folders || []).map((f) => {
        if (f.id === albumId) {
          return {
            ...f,
            fileIds: Array.from(new Set([...(f.fileIds || []), ...fileIds])),
          };
        }
        return f;
      });
      recordLocalActivity(
        "folder_add_files",
        { folderId: albumId, count: fileIds?.length || 0 },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    handleRemoveFilesFromAlbum: ({ albumId, fileIds }) => {
      dispatch(removeFilesFromFolder({ folderId: albumId, fileIds }));
      const updatedFolders = (folders || []).map((f) => {
        if (f.id === albumId) {
          return {
            ...f,
            fileIds: (f.fileIds || []).filter((id) => !fileIds.includes(id)),
          };
        }
        return f;
      });
      recordLocalActivity(
        "folder_remove_files",
        { folderId: albumId, count: fileIds?.length || 0 },
        { folders: updatedFolders, starred: starredIds || [], trash: cloudTrashIds || [] }
      );
    },
    flushActivityToCloud: flushPendingActivityToCloud,
    getLocalActivity,
  };
};

export default useDashboard;
