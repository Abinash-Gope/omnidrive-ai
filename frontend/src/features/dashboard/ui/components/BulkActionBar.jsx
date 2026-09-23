import React from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  CheckSquare,
  Square,
  Star,
  Download,
  Trash2,
  FolderPlus,
  FolderMinus,
  X,
  Sparkles,
} from "lucide-react";
import {
  clearSelection,
  selectAllFiles,
  toggleStar,
  moveToTrash,
} from "../../state/dashboardSlice.jsx";
import { recordLocalActivity } from "../../services/activitySyncService.jsx";

/**
 * Floating glassmorphic multi-selection toolbar
 */
export const BulkActionBar = ({
  allSelectableIds = [],
  onOpenAddToFolder,
  onOpenAddToAlbum,
  activeFolderId = null,
  onRemoveFromFolder,
}) => {
  const dispatch = useDispatch();
  const selectedFileIds = useSelector((state) => state.dashboard.selectedFileIds || []);
  const starredIds = useSelector((state) => state.dashboard.starredIds || []);
  const files = useSelector((state) => state.dashboard.files || []);

  if (selectedFileIds.length === 0) return null;

  const count = selectedFileIds.length;
  const isAllSelected = allSelectableIds.length > 0 && count === allSelectableIds.length;

  // Check if all selected files are currently starred
  const areAllStarred = selectedFileIds.every((id) => starredIds.includes(id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      dispatch(clearSelection());
    } else {
      dispatch(selectAllFiles(allSelectableIds));
    }
  };

  const handleBulkStar = () => {
    // If all are starred, unstar them all; otherwise star them
    const newStarred = [...starredIds];
    selectedFileIds.forEach((id) => {
      const idx = newStarred.indexOf(id);
      if (areAllStarred) {
        if (idx >= 0) newStarred.splice(idx, 1);
      } else {
        if (idx < 0) newStarred.push(id);
      }
      dispatch(toggleStar(id));
    });
    recordLocalActivity({ starredIds: newStarred });
  };

  const handleBulkTrash = () => {
    const cloudTrashIds = [];
    selectedFileIds.forEach((id) => {
      dispatch(moveToTrash(id));
      cloudTrashIds.push(id);
    });
    recordLocalActivity({ trashIds: cloudTrashIds });
    dispatch(clearSelection());
  };

  const handleBulkDownload = () => {
    // Download each selected file that has a valid download URL
    selectedFileIds.forEach((id) => {
      const file = files.find((f) => f.id === id || f.file_id === id);
      const url = file?.downloadUrl || file?.download_url || file?.url;
      if (url) {
        const link = document.createElement("a");
        link.href = url;
        link.download = file.name || "download";
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    });
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 sm:gap-3 px-4 sm:px-5 py-2.5 rounded-2xl bg-slate-900/95 dark:bg-slate-950/95 text-white backdrop-blur-xl border border-slate-700/60 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200"
    >
      {/* Selection Count Pill */}
      <div className="flex items-center gap-2 pr-3 border-r border-slate-700/60">
        <button
          type="button"
          onClick={handleToggleSelectAll}
          className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-semibold"
          title={isAllSelected ? "Deselect all" : "Select all"}
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4 text-emerald-400" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">{isAllSelected ? "Deselect" : "All"}</span>
        </button>

        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold border border-emerald-500/30">
          {count} {count === 1 ? "item" : "items"}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-1.5">
        {/* Star / Unstar */}
        <button
          type="button"
          onClick={handleBulkStar}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
            areAllStarred
              ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30"
              : "hover:bg-slate-800 text-slate-200 hover:text-amber-400"
          }`}
          title={areAllStarred ? "Remove from Starred" : "Add to Starred"}
        >
          <Star className={`w-3.5 h-3.5 ${areAllStarred ? "fill-amber-400 text-amber-400" : ""}`} />
          <span className="hidden md:inline">{areAllStarred ? "Unstar" : "Star"}</span>
        </button>

        {/* Add / Move to Folder */}
        {(onOpenAddToFolder || onOpenAddToAlbum) && (
          <button
            type="button"
            onClick={onOpenAddToFolder || onOpenAddToAlbum}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-800 text-slate-200 hover:text-blue-400 transition-all"
            title="Organize into Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Folder</span>
          </button>
        )}

        {/* Remove from Folder (when viewing within a folder) */}
        {activeFolderId && onRemoveFromFolder && (
          <button
            type="button"
            onClick={() => onRemoveFromFolder(selectedFileIds)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition-all border border-rose-500/30"
            title="Remove Selected Items from This Folder"
          >
            <FolderMinus className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Remove from Folder</span>
            <span className="md:hidden">Remove</span>
          </button>
        )}

        {/* Batch Download */}
        <button
          type="button"
          onClick={handleBulkDownload}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-slate-800 text-slate-200 hover:text-emerald-400 transition-all"
          title="Download Selected Files"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Download</span>
        </button>

        {/* Move to Trash */}
        <button
          type="button"
          onClick={handleBulkTrash}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-rose-500/20 text-slate-200 hover:text-rose-400 transition-all"
          title="Move Selected to Trash"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Trash</span>
        </button>
      </div>

      {/* Clear Selection X */}
      <button
        type="button"
        onClick={() => dispatch(clearSelection())}
        className="p-1.5 ml-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default BulkActionBar;
