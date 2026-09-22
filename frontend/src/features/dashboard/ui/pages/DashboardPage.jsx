import React, { useState } from "react";
import useDashboard from "../../hooks/useDashboard.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import FileUploadDropzone from "../components/FileUploadDropzone.jsx";
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
          totalFilesCount={totalFilesCount}
          storage={storage}
        />

        {/* Center/Right Content Area */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
          {/* Welcome / Active Folder Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight capitalize">
                {activeTab.replace("-", " ")}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Enterprise Cloud Storage with intelligent media processing & document AI pipelines
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone with Direct Modal Trigger */}
          <div className="relative">
            <FileUploadDropzone onUploadFile={handleUploadFile} />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsDirectUploadModalOpen(true)}
                className="text-xs text-[#1a73e8] hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium inline-flex items-center gap-1 transition-colors"
              >
                <span>Need real-time S3 progress tracking? Open Upload Modal</span>
                <span>&rarr;</span>
              </button>
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
            onDeleteFile={(file) => setFileToDelete(file)}
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
