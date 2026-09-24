import React, { useState, useEffect, useRef } from "react";
import { UploadCloud, Folder, Trash2 } from "lucide-react";
import useDashboard from "../../hooks/useDashboard.jsx";
import { recordLocalActivity } from "../../services/activitySyncService.jsx";
import DashboardHeader from "../components/DashboardHeader.jsx";
import DashboardSidebar from "../components/DashboardSidebar.jsx";
import FileGrid from "../components/FileGrid.jsx";
import PipelineDrawer from "../components/PipelineDrawer.jsx";
import VideoPlayerModal from "../components/VideoPlayerModal.jsx";
import ImageAiModal from "../components/ImageAiModal.jsx";
import PdfSummaryModal from "../components/PdfSummaryModal.jsx";
import UploadModal from "../../../../components/UploadModal.jsx";
import DeleteConfirmModal from "../components/DeleteConfirmModal.jsx";
import DeleteFolderModal from "../components/DeleteFolderModal.jsx";
import BulkActionBar from "../components/BulkActionBar.jsx";
import FolderModal from "../components/FolderModal.jsx";

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
    folders,
    activeFolderId,
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
    handleSetActiveFolderId,
    handleCreateFolder,
    handleDeleteFolder,
    handleAddFilesToFolder,
    handleRemoveFilesFromFolder,
  } = useDashboard();

  const [isDirectUploadModalOpen, setIsDirectUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [folderTargetIds, setFolderTargetIds] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isDeletingFile, setIsDeletingFile] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState(null);

  const handleRequestDeleteFolder = (folderId, folderName = "folder") => {
    if (!folderId) return;
    const target = (folders || []).find((f) => f.id === folderId) || { id: folderId, name: folderName };
    setFolderToDelete(target);
  };

  const handleConfirmDeleteFolder = (folder) => {
    if (!folder?.id) return;
    if (activeFolderId === folder.id) {
      handleSetActiveFolderId(null);
    }
    handleDeleteFolder(folder.id);
    const remainingFolders = (folders || []).filter((f) => f.id !== folder.id);
    recordLocalActivity(
      "delete_folder",
      { folderId: folder.id, name: folder.name },
      { folders: remainingFolders }
    );
    setFolderToDelete(null);
  };

  const handleRemoveFromFolder = (fileIdsOrId) => {
    if (!activeFolderId) return;
    const targetIds = Array.isArray(fileIdsOrId) ? fileIdsOrId : [fileIdsOrId];
    if (targetIds.length === 0) return;

    handleRemoveFilesFromFolder({ folderId: activeFolderId, fileIds: targetIds });
    const updatedFolders = (folders || []).map((f) =>
      f.id === activeFolderId
        ? { ...f, fileIds: (f.fileIds || []).filter((id) => !targetIds.includes(id)) }
        : f
    );
    recordLocalActivity(
      "remove_from_folder",
      { folderId: activeFolderId, fileIds: targetIds },
      { folders: updatedFolders }
    );
    handleClearSelection();
  };

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
    if (activeFolderId) {
      const activeFolder = (folders || []).find((f) => f.id === activeFolderId);
      if (activeFolder) {
        return {
          title: activeFolder.name,
          subtitle: `Folder • ${files.length} ${files.length === 1 ? "item" : "items"}`,
          isFolder: true,
          folder: activeFolder,
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
          folders={folders}
          activeFolderId={activeFolderId}
          onSelectFolder={handleSetActiveFolderId}
          onDeleteFolder={handleRequestDeleteFolder}
          onOpenCreateFolder={() => {
            setFolderTargetIds([]);
            setIsFolderModalOpen(true);
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
            {headerInfo.isFolder ? (
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleSetActiveFolderId(null)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <span>←</span>
                    <span>Back to My Files</span>
                  </button>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                      <span
                        className="hover:text-[#1a73e8] cursor-pointer"
                        onClick={() => handleSetActiveFolderId(null)}
                      >
                        My Files
                      </span>
                      <span>/</span>
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">
                        {headerInfo.title}
                      </span>
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
                      <Folder className="w-6 h-6 text-[#1a73e8] fill-[#1a73e8]/20" />
                      <span>{headerInfo.title}</span>
                    </h1>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleRequestDeleteFolder(activeFolderId, headerInfo.title)}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 shadow-xs"
                    title="Delete this folder"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Folder</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {headerInfo.title}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {headerInfo.subtitle}
                </p>
              </div>
            )}
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
            folders={folders}
            activeFolderId={activeFolderId}
            onSelectFolder={handleSetActiveFolderId}
            onDeleteFolder={handleRequestDeleteFolder}
            onRemoveFromFolder={handleRemoveFromFolder}
            onOpenCreateFolder={() => {
              setFolderTargetIds([]);
              setIsFolderModalOpen(true);
            }}
            onOpenAddToFolder={(file) => {
              const ids = file ? [file.id || file.file_id] : selectedFileIds;
              setFolderTargetIds(ids);
              setIsFolderModalOpen(true);
            }}
            onOpenAddToAlbum={(file) => {
              const ids = file ? [file.id || file.file_id] : selectedFileIds;
              setFolderTargetIds(ids);
              setIsFolderModalOpen(true);
            }}
          />
        </main>
      </div>

      {/* Floating Multi-Selection Bulk Action Bar */}
      <BulkActionBar
        allSelectableIds={files.map((f) => f.id || f.file_id)}
        onOpenAddToAlbum={() => {
          setFolderTargetIds(selectedFileIds);
          setIsFolderModalOpen(true);
        }}
        onOpenAddToFolder={() => {
          setFolderTargetIds(selectedFileIds);
          setIsFolderModalOpen(true);
        }}
        activeFolderId={activeFolderId}
        onRemoveFromFolder={handleRemoveFromFolder}
      />

      {/* Custom Folders Modal */}
      <FolderModal
        isOpen={isFolderModalOpen}
        onClose={() => {
          setIsFolderModalOpen(false);
          setFolderTargetIds([]);
        }}
        targetFileIds={folderTargetIds}
      />

      {/* Asynchronous Pipeline Execution Docked Drawer */}
      <PipelineDrawer
        pipeline={uploadPipeline}
        onClose={handleClosePipeline}
      />

      {/* Multimodal Preview Modals */}
      <VideoPlayerModal
        file={previewModal?.file}
        isOpen={Boolean(
          previewModal?.isOpen &&
            previewModal?.file &&
            (previewModal.file.type === "video" ||
              /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(previewModal.file.name || ""))
        )}
        onClose={handleClosePreview}
        onChangeQuality={handleChangeQuality}
      />

      <ImageAiModal
        file={previewModal?.file}
        isOpen={previewModal?.isOpen && previewModal?.file?.type === "image"}
        onClose={handleClosePreview}
      />

      <PdfSummaryModal
        key={previewModal?.file?.id || previewModal?.file?.file_id || previewModal?.file?.s3Key || previewModal?.file?.name || "pdf-modal"}
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

      {/* Enterprise Folder Deletion Confirmation Modal */}
      <DeleteFolderModal
        isOpen={Boolean(folderToDelete)}
        folder={folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDeleteFolder}
      />
    </div>
  );
};

export default DashboardPage;
