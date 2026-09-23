import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  FolderPlus,
  Folder,
  Check,
  Plus,
  Trash2,
  FolderCheck,
  Edit2,
} from "lucide-react";
import {
  createFolder,
  addFilesToFolder,
  deleteFolder,
  renameFolder,
  clearSelection,
} from "../../state/dashboardSlice.jsx";
import { recordLocalActivity } from "../../services/activitySyncService.jsx";
import DeleteFolderModal from "./DeleteFolderModal.jsx";

const FOLDER_COLORS = [
  { id: "blue", hex: "#1a73e8", label: "Blue", bgClass: "bg-blue-500", lightBg: "bg-blue-500/10", textClass: "text-[#1a73e8] dark:text-blue-400" },
  { id: "indigo", hex: "#6366f1", label: "Indigo", bgClass: "bg-indigo-500", lightBg: "bg-indigo-500/10", textClass: "text-indigo-600 dark:text-indigo-400" },
  { id: "emerald", hex: "#10b981", label: "Emerald", bgClass: "bg-emerald-500", lightBg: "bg-emerald-500/10", textClass: "text-emerald-600 dark:text-emerald-400" },
  { id: "amber", hex: "#f59e0b", label: "Amber", bgClass: "bg-amber-500", lightBg: "bg-amber-500/10", textClass: "text-amber-600 dark:text-amber-400" },
  { id: "rose", hex: "#f43f5e", label: "Rose", bgClass: "bg-rose-500", lightBg: "bg-rose-500/10", textClass: "text-rose-600 dark:text-rose-400" },
  { id: "purple", hex: "#8b5cf6", label: "Purple", bgClass: "bg-purple-500", lightBg: "bg-purple-500/10", textClass: "text-purple-600 dark:text-purple-400" },
];

export const FolderModal = ({ isOpen, onClose, targetFileIds = [] }) => {
  const dispatch = useDispatch();
  const folders = useSelector((state) => state.dashboard.folders || []);
  const [newFolderName, setNewFolderName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [isCreatingInline, setIsCreatingInline] = useState(true);
  const [successMessage, setSuccessMessage] = useState("");
  const [renamingFolderId, setRenamingFolderId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [folderToDelete, setFolderToDelete] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setNewFolderName("");
      setSelectedColor("blue");
      setSuccessMessage("");
      setRenamingFolderId(null);
      setRenameValue("");
      setFolderToDelete(null);
      setIsCreatingInline(targetFileIds.length === 0);
    }
  }, [isOpen, targetFileIds.length]);

  if (!isOpen) return null;

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

    const newFolder = {
      id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: trimmed,
      color: selectedColor,
      fileIds: [...targetFileIds],
      createdAt: new Date().toISOString(),
    };

    dispatch(createFolder(newFolder));
    const updatedFolders = [...folders, newFolder];
    recordLocalActivity("create_folder", { folderId: newFolder.id, name: trimmed }, { folders: updatedFolders });

    setNewFolderName("");
    setSuccessMessage(`Created folder "${trimmed}"${targetFileIds.length > 0 ? ` and added ${targetFileIds.length} items` : ""}`);

    setTimeout(() => {
      setSuccessMessage("");
      if (targetFileIds.length > 0) {
        dispatch(clearSelection());
        onClose();
      } else {
        onClose();
      }
    }, 700);
  };

  const handleAddFiles = (folder) => {
    if (targetFileIds.length === 0) return;
    dispatch(addFilesToFolder({ folderId: folder.id, fileIds: targetFileIds }));
    const updatedFolders = folders.map((f) =>
      f.id === folder.id
        ? { ...f, fileIds: Array.from(new Set([...(f.fileIds || []), ...targetFileIds])) }
        : f
    );
    recordLocalActivity("add_to_folder", { folderId: folder.id, count: targetFileIds.length }, { folders: updatedFolders });

    setSuccessMessage(`Added ${targetFileIds.length} item${targetFileIds.length === 1 ? "" : "s"} to "${folder.name}"`);
    setTimeout(() => {
      setSuccessMessage("");
      dispatch(clearSelection());
      onClose();
    }, 900);
  };

  const handleDeleteFolder = (folder, e) => {
    e.stopPropagation();
    setFolderToDelete(folder);
  };

  const handleConfirmDelete = (folder) => {
    if (!folder?.id) return;
    dispatch(deleteFolder(folder.id));
    const updatedFolders = folders.filter((f) => f.id !== folder.id);
    recordLocalActivity("delete_folder", { folderId: folder.id, name: folder.name }, { folders: updatedFolders });
    setFolderToDelete(null);
  };

  const handleStartRename = (folder, e) => {
    e.stopPropagation();
    setRenamingFolderId(folder.id);
    setRenameValue(folder.name);
  };

  const handleSaveRename = (folderId, e) => {
    e.preventDefault();
    if (renameValue.trim()) {
      dispatch(renameFolder({ folderId, newName: renameValue.trim() }));
      const updatedFolders = folders.map((f) =>
        f.id === folderId ? { ...f, name: renameValue.trim() } : f
      );
      recordLocalActivity("rename_folder", { folderId, name: renameValue.trim() }, { folders: updatedFolders });
    }
    setRenamingFolderId(null);
    setRenameValue("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {targetFileIds.length > 0
                  ? `Organize ${targetFileIds.length} item${targetFileIds.length === 1 ? "" : "s"} into Folder`
                  : "New Folder"}
              </h3>
              <p className="text-xs text-slate-500">
                Organize videos, photos, and documents together
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {successMessage && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in">
              <FolderCheck className="w-4 h-4 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Create New Folder Form / Toggle */}
          {(isCreatingInline || targetFileIds.length === 0) ? (
            <form onSubmit={handleCreateFolder} className="space-y-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Work Documents, Vacation, Invoices"
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                />
              </div>

              {/* Color Preset Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Folder Color Tag
                </label>
                <div className="flex items-center gap-2.5">
                  {FOLDER_COLORS.map((col) => {
                    const isPicked = selectedColor === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        onClick={() => setSelectedColor(col.id)}
                        className={`w-7 h-7 rounded-full ${col.bgClass} flex items-center justify-center transition-all ${
                          isPicked ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white dark:ring-offset-slate-900 scale-110" : "opacity-75 hover:opacity-100"
                        }`}
                        title={col.label}
                      >
                        {isPicked && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {targetFileIds.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setIsCreatingInline(false)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Back to folders
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!newFolderName.trim()}
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-blue-600 disabled:opacity-50 text-white shadow-xs transition-all active:scale-95"
                >
                  Create Folder
                </button>
              </div>
            </form>
          ) : targetFileIds.length > 0 ? (
            <button
              type="button"
              onClick={() => setIsCreatingInline(true)}
              className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-semibold text-[#1a73e8] dark:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>+ Create New Folder</span>
            </button>
          ) : null}

          {/* Existing Folders List */}
          {targetFileIds.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-1">
                Select Destination Folder
              </div>
              {folders.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800">
                  No folders yet. Create your first folder above!
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto custom-scrollbar pr-1">
                  {folders.map((folder) => {
                    const colorItem = FOLDER_COLORS.find((c) => c.id === folder.color) || FOLDER_COLORS[0];
                    const count = (folder.fileIds || []).length;
                    const isRenaming = renamingFolderId === folder.id;

                    return (
                      <div
                        key={folder.id}
                        className="group flex items-center justify-between p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800/80 hover:border-blue-400 dark:hover:border-blue-500 bg-white dark:bg-slate-800/80 hover:bg-blue-50/30 dark:hover:bg-blue-950/20 transition-all cursor-pointer"
                        onClick={() => handleAddFiles(folder)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-8 h-8 rounded-xl ${colorItem.lightBg || "bg-blue-500/10"} flex items-center justify-center shrink-0`}>
                            <Folder className={`w-4 h-4 ${colorItem.textClass} fill-current/20`} />
                          </div>

                          {isRenaming ? (
                            <form
                              onSubmit={(e) => handleSaveRename(folder.id, e)}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 flex-1"
                            >
                              <input
                                type="text"
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                autoFocus
                                className="px-2 py-1 text-xs rounded-lg border border-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full"
                              />
                              <button
                                type="submit"
                                className="p-1 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded"
                              >
                                Save
                              </button>
                            </form>
                          ) : (
                            <div className="min-w-0 truncate">
                              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                {folder.name}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {count} {count === 1 ? "item" : "items"}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(folder, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Rename folder"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolder(folder, e)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            className="ml-1 px-3 py-1 rounded-xl text-xs font-semibold bg-[#1a73e8] hover:bg-blue-600 text-white shadow-xs transition-colors"
                          >
                            Add
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Folder Modal */}
      <DeleteFolderModal
        isOpen={Boolean(folderToDelete)}
        folder={folderToDelete}
        onClose={() => setFolderToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default FolderModal;
