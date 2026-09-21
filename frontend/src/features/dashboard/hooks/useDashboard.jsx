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
    };

    await executePipeline(fileMeta);
  };

  const simulateUpload = async (type) => {
    const samples = {
      video: { name: "product_demo_raw.mp4", type: "video", size: "72.4 MB" },
      image: { name: "kyoto_temple.jpg", type: "image", size: "3.9 MB" },
      pdf: { name: "quarterly_earnings.pdf", type: "pdf", size: "1.9 MB" },
      explicit: { name: "unsafe_explicit_test.jpg", type: "image", size: "5.2 MB" },
    };
    if (samples[type]) {
      await executePipeline(samples[type]);
    }
  };

  const executePipeline = async (fileMeta) => {
    const isViolation = /explicit|unsafe|nude/i.test(fileMeta.name);

    dispatch(openUploadPipeline(fileMeta));

    // Step 1: Request Presigned URL & Direct Upload to S3
    dispatch(updatePipelineStep({ step: 1, status: "active", progress: 0 }));
    const presigned = await getPresignedUrlApi(fileMeta);

    await uploadToS3Api(presigned.upload_url, fileMeta, (progress) => {
      dispatch(updatePipelineStep({ step: 1, status: "active", progress }));
    });
    dispatch(updatePipelineStep({ step: 1, status: "done", progress: 100 }));

    // Step 2: Rekognition Safety Gatekeeper
    await new Promise((r) => setTimeout(r, 600));
    dispatch(updatePipelineStep({ step: 2, status: "active" }));

    if (isViolation) {
      await new Promise((r) => setTimeout(r, 800));
      const alertMsg = "Explicit content detected by AWS Rekognition. Upload quarantined into private isolation bucket.";
      dispatch(setPipelineViolation(alertMsg));
      dispatch(setToast({ type: "error", message: `Quarantined: ${fileMeta.name} flagged by safety gatekeeper.` }));

      dispatch(
        addQuarantinedFile({
          id: `quarantine-${Date.now()}`,
          name: fileMeta.name,
          reason: "Explicit Content (Rekognition score: 98.7%)",
          date: "Just now",
          quarantineBucket: "s3://omnidrive-quarantine-vault-us-east-1",
        })
      );
      return;
    }

    dispatch(updatePipelineStep({ step: 2, status: "done" }));

    // Step 3: Multimodal Worker Execution
    dispatch(updatePipelineStep({ step: 3, status: "active" }));
    await new Promise((r) => setTimeout(r, 1000));
    dispatch(updatePipelineStep({ step: 3, status: "done" }));

    // Step 4: DynamoDB Sync
    dispatch(updatePipelineStep({ step: 4, status: "active" }));
    await pollJobStatusApi(presigned.file_id);
    dispatch(updatePipelineStep({ step: 4, status: "done" }));

    // Create completed file record
    let newFileRecord = {
      id: presigned.file_id,
      name: fileMeta.name,
      type: fileMeta.type,
      size: fileMeta.size,
      date: "Just now",
      status: "COMPLETED",
      moderationPassed: true,
    };

    if (fileMeta.type === "video") {
      newFileRecord = {
        ...newFileRecord,
        duration: "03:40",
        hlsQualities: ["1080p", "720p", "480p"],
        activeQuality: "1080p",
        transcoderInfo: "AWS ECS Fargate ARM64 • FFmpeg HLS",
        thumbnail: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80",
        previewSnippet: "Multi-bitrate HLS (.m3u8) ready for adaptive streaming.",
      };
    } else if (fileMeta.type === "image") {
      newFileRecord = {
        ...newFileRecord,
        labels: [
          { name: "Landscape", confidence: 99.1 },
          { name: "Nature", confidence: 97.4 },
          { name: "Tourism", confidence: 91.2 },
        ],
        exif: {
          camera: "Sony Alpha 7 IV",
          lens: "35mm F1.4 GM",
          iso: "200",
          aperture: "f/4.0",
          shutter: "1/800s",
        },
        thumbnail: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=600&q=80",
        previewSnippet: "Detected 3 labels with 99.1% peak confidence.",
      };
    } else {
      newFileRecord = {
        ...newFileRecord,
        pages: 8,
        summary: {
          executive: "Automated Bedrock Claude 3 document extraction completed. High confidence OCR vectorization achieved.",
          takeaways: [
            "All pipeline metrics within sub-second thresholds.",
            "Textract OCR extracted 8 pages cleanly.",
          ],
          model: "Amazon Bedrock (Claude 3 Haiku)",
          pages: 8,
        },
        previewSnippet: "Bedrock summary generated with 2 key action takeaways.",
      };
    }

    dispatch(addFile(newFileRecord));
    dispatch(setToast({ type: "success", message: `File "${fileMeta.name}" processed and ready in Dashboard!` }));
  };

  // Filter & Search Logic
  const filteredFiles = files.filter((f) => {
    const matchesSearch =
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.labels && f.labels.some((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))) ||
      (f.summary && f.summary.executive.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    // Filter by type
    if (filterType !== "all" && f.type !== filterType) {
      return false;
    }

    // Filter by smart views
    if (activeTab === "videos") return f.type === "video";
    if (activeTab === "documents") return f.type === "pdf";
    if (activeTab === "photos") return f.type === "image";

    return true;
  });

  return {
    files: filteredFiles,
    totalFilesCount: files.length,
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
    simulateUpload,
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
