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

/**
 * Layer 4: DashboardPage (Presentation Component)
 * Mounts all components of the Google Drive-style AI workspace.
 */
const DashboardPage = () => {
  const {
    files,
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
  } = useDashboard();

  const [isDirectUploadModalOpen, setIsDirectUploadModalOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);

  // Dynamic header titles and subtitles per sidebar tab
  const getHeaderInfo = () => {
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
        />

        {/* Center/Right Content Area - Ultra Clean Layout */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
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
          />
        </main>
      </div>

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
