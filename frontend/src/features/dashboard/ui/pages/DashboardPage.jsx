import React, { useState } from "react";
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
      case "recent":
        return {
          title: "Recent",
          subtitle: "Files uploaded or accessed recently in your workspace",
        };
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
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#060b19] flex flex-col font-sans transition-colors">
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
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <DashboardSidebar
          activeTab={activeTab}
          onSelectTab={handleSelectTab}
          onUploadFile={handleUploadFile}
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
          onClick={() => {
            if (selectedFileIds.length > 0) {
              handleClearSelection();
            }
          }}
          className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6"
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

      {/* Phase 3 Direct S3 Upload Pipeline Modal */}
      <UploadModal
        isOpen={isDirectUploadModalOpen}
        onClose={() => setIsDirectUploadModalOpen(false)}
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
