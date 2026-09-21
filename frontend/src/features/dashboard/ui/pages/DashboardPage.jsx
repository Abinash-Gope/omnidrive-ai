import React from "react";
import useDashboard from "../../hooks/useDashboard.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import FileUploadDropzone from "../components/FileUploadDropzone.jsx";
import FileGrid from "../components/FileGrid.jsx";
import PipelineDrawer from "../components/PipelineDrawer.jsx";
import VideoPlayerModal from "../components/VideoPlayerModal.jsx";
import ImageAiModal from "../components/ImageAiModal.jsx";
import PdfSummaryModal from "../components/PdfSummaryModal.jsx";

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
    handleSelectTab,
    handleSelectFilter,
    handleSearch,
    handleToggleViewMode,
    handleClosePipeline,
    handleOpenPreview,
    handleClosePreview,
    handleChangeQuality,
  } = useDashboard();

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
                Enterprise Cloud Storage with asynchronous AWS Rekognition, Fargate HLS, & Bedrock AI pipelines
              </p>
            </div>
          </div>

          {/* Drag & Drop Upload Zone */}
          <FileUploadDropzone onUploadFile={handleUploadFile} />

          {/* Files Grid / List View */}
          <FileGrid
            files={files}
            quarantinedFiles={quarantinedFiles}
            activeTab={activeTab}
            filterType={filterType}
            onSelectFilter={handleSelectFilter}
            searchQuery={searchQuery}
            viewMode={viewMode}
            onOpenPreview={handleOpenPreview}
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
    </div>
  );
};

export default DashboardPage;
