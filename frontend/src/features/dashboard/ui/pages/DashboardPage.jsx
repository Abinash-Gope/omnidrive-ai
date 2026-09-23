import React, { useState, useEffect, useRef } from "react";
import { UploadCloud } from "lucide-react";
import useDashboard from "../../hooks/useDashboard.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import FileGrid from "../components/FileGrid.jsx";
import PipelineDrawer from "../components/PipelineDrawer.jsx";
import VideoPlayerModal from "../components/VideoPlayerModal.jsx";
import ImageAiModal from "../components/ImageAiModal.jsx";
import PdfSummaryModal from "../components/PdfSummaryModal.jsx";
import UploadModal from "../../../../components/UploadModal.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import BulkActionBar from "../components/BulkActionBar.jsx";
import AlbumModal from "../components/AlbumModal.jsx";

/**
 * Layer 4: DashboardPage (Presentation Component)
 * Mounts all components of the Google Drive-style AI workspace.
 */
const DashboardPage = () => {
  const {
    files,
    allFiles,
    totalFilesCount,
    tabCounts,
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
    reloadFiles,
    handleSelectTab,
    handleSelectFilter,
    handleSetSortBy,
    handleSearch,
    handleToggleViewMode,
    handleClosePipeline,
    handleOpenPreview,
    handleClosePreview,
    handleChangeQuality,
    handleToggleSelect,
    handleSelectAll,
    handleClearSelection,
    handleSetPhotoViewMode,
    handleSetPhotoCategory,
    handleSetActiveTagFilter,
    handleSetActiveAlbumId,
    handleCreateAlbum,
    handleDeleteAlbum,
    handleAddFilesToAlbum,
  } = useDashboard();

  const [isDirectUploadModalOpen, setIsDirectUploadModalOpen] = useState(false);
  const [isAlbumModalOpen, setIsAlbumModalOpen] = useState(false);
  const [albumTargetIds, setAlbumTargetIds] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Dashboard-wide drag-and-drop overlay (heartbeat debounce timer pattern)
  const [isDashboardDragOver, setIsDashboardDragOver] = useState(false);
  const [pendingDropFiles, setPendingDropFiles] = useState(null);
  const dragTimeoutRef = useRef(null);

  useEffect(() => {
    const handleDragOver = (e) => {
      const isFileDrag = e.dataTransfer?.types?.includes("Files");
      if (!isFileDrag) return;

      e.preventDefault();

      // Don't show global overlay if the upload modal is open (modal handles its own drop)
      if (isDirectUploadModalOpen) {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        setIsDashboardDragOver(false);
        return;
      }

      setIsDashboardDragOver(true);

      // Auto-expire overlay after 180ms if no dragover event arrives (user dropped or left)
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      dragTimeoutRef.current = setTimeout(() => {
        setIsDashboardDragOver(false);
      }, 180);
    };

    const handleDrop = (e) => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      setIsDashboardDragOver(false);

      const files = Array.from(e.dataTransfer?.files || []);
      if (files.length > 0 && !isDirectUploadModalOpen) {
        e.preventDefault();
        setPendingDropFiles(files);
        setIsDirectUploadModalOpen(true);
      }
    };

    const handleDragEndOrLeave = (e) => {
      if (!e.relatedTarget || (e.clientX <= 0 && e.clientY <= 0)) {
        if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
        setIsDashboardDragOver(false);
      }
    };

    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("drop", handleDrop, true);
    window.addEventListener("dragend", handleDragEndOrLeave, true);
    window.addEventListener("dragleave", handleDragEndOrLeave, true);

    return () => {
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("dragend", handleDragEndOrLeave, true);
      window.removeEventListener("dragleave", handleDragEndOrLeave, true);
    };
  }, [isDirectUploadModalOpen]);

  // Dynamic header titles and subtitles per sidebar tab
  const getHeaderInfo = () => {
    if (activeAlbumId) {
      const activeAlbum = (albums || []).find((a) => a.id === activeAlbumId);
      if (activeAlbum) {
        return {
          title: activeAlbum.name,
          subtitle: `Custom Photo Album • ${files.length} ${files.length === 1 ? "item" : "items"}`,
        };
      }
    }

    if (filterType === "image" && activeTagFilter) {
      return {
        title: `Photos tagged "${activeTagFilter}"`,
        subtitle: `Amazon Rekognition Vision AI tag filter • ${files.length} matching photos`,
      };
    }

    switch (activeTab) {
      case "starred":
        return {
          title: "Starred",
          subtitle: "Priority files and bookmarks for immediate access",
        };
      case "shared":
        return {
          title: "Shared with me",
          subtitle: "Collaborative documents and media shared with your account",
        };
      case "trash":
        return {
          title: "Trash",
          subtitle: "Items in trash are automatically purged after 30 days",
        };
      default:
        return {
          title: "My Files",
          subtitle: "Enterprise Cloud Storage with intelligent media processing & document AI pipelines",
        };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="h-screen w-full overflow-hidden bg-[#f8fafd] dark:bg-[#060b19] flex flex-col font-sans transition-colors">
      {/* Top Fixed Workspace Header */}
      <DashboardHeader
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        viewMode={viewMode}
        onToggleViewMode={handleToggleViewMode}
        onResetFilter={() => {
          handleSelectTab("my-files");
          handleSelectFilter("all");
          handleSearch("");
        }}
      />

      {/* Main Workspace Body: Sidebar + Dynamic Main Pane */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Navigation Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onUploadFile={(files) => {
            const arr = Array.isArray(files) ? files : [files];
            setPendingDropFiles(arr);
            setIsDirectUploadModalOpen(true);
          }}
          onOpenUploadModal={() => setIsDirectUploadModalOpen(true)}
          totalFilesCount={totalFilesCount}
          tabCounts={tabCounts}
          storage={storage}
          albums={albums}
          activeAlbumId={activeAlbumId}
          onSelectAlbum={(id) => {
            handleSetActiveAlbumId(id);
            if (id) {
              handleSelectFilter("image");
            }
          }}
          onOpenCreateAlbum={() => {
            setAlbumTargetIds([]);
            setIsAlbumModalOpen(true);
          }}
        />

        {/* Center/Right Content Area - Ultra Clean Layout */}
        <main
          onClick={(e) => {
            // Only clear selection when clicking on the bare background (not on any child element)
            if (e.target === e.currentTarget && selectedFileIds.length > 0) {
              handleClearSelection();
            }
          }}
          className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6 select-none custom-scrollbar min-h-0"
        >
          {/* Welcome / Active Folder Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {headerInfo.title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {headerInfo.subtitle}
              </p>
            </div>
          </div>

          {/* Files Grid / List View */}
          <FileGrid
            files={files}
            allFiles={allFiles}
            quarantinedFiles={quarantinedFiles}
            activeTab={activeTab}
            filterType={filterType}
            onSelectFilter={handleSelectFilter}
            sortBy={sortBy}
            onSetSortBy={handleSetSortBy}
            searchQuery={searchQuery}
            viewMode={viewMode}
            isLoading={isLoading}
            onOpenPreview={handleOpenPreview}
            onDeleteFile={(file) => {
              if (activeTab === "trash" || file.inTrash) {
                setFileToDelete(file);
              } else {
                handleMoveToTrash(file);
              }
            }}
            onToggleStar={handleToggleStar}
            onMoveToTrash={handleMoveToTrash}
            onRestoreFile={handleRestoreFile}
            onPermanentDelete={(file) => setFileToDelete(file)}
            onEmptyTrash={handleEmptyTrash}
            trashCount={trashCount}
            onResetSearch={() => handleSearch("")}
            selectedFileIds={selectedFileIds}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            photoViewMode={photoViewMode}
            onTogglePhotoViewMode={handleSetPhotoViewMode}
            activePhotoCategory={activePhotoCategory}
            onSelectPhotoCategory={handleSetPhotoCategory}
            activeTagFilter={activeTagFilter}
            onSelectTagFilter={handleSetActiveTagFilter}
            onOpenAddToAlbum={(file) => {
              const ids = file ? [file.id || file.file_id] : selectedFileIds;
              setAlbumTargetIds(ids);
              setIsAlbumModalOpen(true);
            }}
          />
        </main>
      </div>

      {/* Floating Multi-Selection Bulk Action Bar */}
      <BulkActionBar
        allSelectableIds={files.map((f) => f.id || f.file_id)}
        onOpenAddToAlbum={() => {
          setAlbumTargetIds(selectedFileIds);
          setIsAlbumModalOpen(true);
        }}
      />

      {/* Custom Albums Modal */}
      <AlbumModal
        isOpen={isAlbumModalOpen}
        onClose={() => {
          setIsAlbumModalOpen(false);
          setAlbumTargetIds([]);
        }}
        targetFileIds={albumTargetIds}
      />

      {/* Asynchronous Pipeline Execution Docked Drawer */}
      <PipelineDrawer
        pipeline={uploadPipeline}
        onClose={handleClosePipeline}
      />

      {/* Multimodal Preview Modals */}
      <VideoPlayerModal
        file={previewModal?.file}
        isOpen={previewModal?.isOpen && previewModal?.file?.type === "video"}
        onClose={handleClosePreview}
        onChangeQuality={handleChangeQuality}
      />

      <ImageAiModal
        file={previewModal?.file}
        isOpen={previewModal?.isOpen && previewModal?.file?.type === "image"}
        onClose={handleClosePreview}
      />

      <PdfSummaryModal
        file={previewModal?.file}
        isOpen={previewModal?.isOpen && previewModal?.file?.type === "pdf"}
        onClose={handleClosePreview}
      />

      {/* Dashboard-Wide Drag-and-Drop Overlay */}
      {isDashboardDragOver && !isDirectUploadModalOpen && (
        <div className="fixed inset-0 z-[60] pointer-events-none flex items-center justify-center">
          <div className="absolute inset-0 bg-blue-500/10 backdrop-blur-[2px] border-4 border-dashed border-[#1a73e8] rounded-2xl m-4 transition-all" />
          <div className="relative z-10 flex flex-col items-center gap-3 select-none">
            <div className="w-16 h-16 rounded-2xl bg-white/90 dark:bg-slate-900/90 shadow-2xl flex items-center justify-center">
              <UploadCloud className="w-8 h-8 text-[#1a73e8] animate-bounce" />
            </div>
            <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl px-6 py-3 shadow-2xl text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white">Drop files anywhere</p>
              <p className="text-xs text-slate-500 mt-0.5">Upload to OmniDrive AI</p>
            </div>
          </div>
        </div>
      )}

      {/* Phase 3 Direct S3 Upload Pipeline Modal */}
      <UploadModal
        isOpen={isDirectUploadModalOpen}
        onClose={() => {
          setIsDirectUploadModalOpen(false);
          setPendingDropFiles(null);
          setIsDashboardDragOver(false);
        }}
        stagedFiles={pendingDropFiles}
        onClearStagedFiles={() => setPendingDropFiles(null)}
        onUploadComplete={(result) => {
          if (result) {
            handleUploadedFileSuccess(result);
          }
          reloadFiles();
          handleSelectTab("my-files");
        }}
      />

      {/* File Deletion Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={!!fileToDelete}
        file={fileToDelete}
        isDeleting={isDeletingFile}
        onClose={() => setFileToDelete(null)}
        onConfirm={async (file) => {
          try {
            setIsDeletingFile(true);
            await handleDeleteFile(file);
            setFileToDelete(null);
          } finally {
            setIsDeletingFile(false);
          }
        }}
      />
    </div>
  );
};

export default DashboardPage;
