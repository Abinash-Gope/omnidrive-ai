import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  X,
  FolderPlus,
  Folder,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Images,
} from "lucide-react";
import {
  createAlbum,
  addFilesToAlbum,
  removeFilesFromAlbum,
  deleteAlbum,
  clearSelection,
} from "../../state/dashboardSlice.jsx";
import { recordLocalActivity } from "../../services/activitySyncService.jsx";

export const AlbumModal = ({ isOpen, onClose, targetFileIds = [] }) => {
  const dispatch = useDispatch();
  const albums = useSelector((state) => state.dashboard.albums || []);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  if (!isOpen) return null;

  const handleCreateAlbum = (e) => {
    e.preventDefault();
    const trimmed = newAlbumName.trim();
    if (!trimmed) return;

    const newAlbum = {
      id: `album_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name: trimmed,
      fileIds: [...targetFileIds],
      createdAt: new Date().toISOString(),
    };

    dispatch(createAlbum(newAlbum));
    const updatedAlbums = [...albums, newAlbum];
    recordLocalActivity({ albums: updatedAlbums });

    setNewAlbumName("");
    setIsCreating(false);
    setSuccessMessage(`Created "${trimmed}" and added ${targetFileIds.length} items`);
    setTimeout(() => {
      setSuccessMessage("");
      if (targetFileIds.length > 0) {
        dispatch(clearSelection());
        onClose();
      }
    }, 1200);
  };

  const handleAddFiles = (album) => {
    dispatch(addFilesToAlbum({ albumId: album.id, fileIds: targetFileIds }));
    const updatedAlbums = albums.map((a) =>
      a.id === album.id
        ? { ...a, fileIds: Array.from(new Set([...(a.fileIds || []), ...targetFileIds])) }
        : a
    );
    recordLocalActivity({ albums: updatedAlbums });

    setSuccessMessage(`Added ${targetFileIds.length} items to "${album.name}"`);
    setTimeout(() => {
      setSuccessMessage("");
      dispatch(clearSelection());
      onClose();
    }, 1000);
  };

  const handleDeleteAlbum = (albumId, e) => {
    e.stopPropagation();
    dispatch(deleteAlbum(albumId));
    const updatedAlbums = albums.filter((a) => a.id !== albumId);
    recordLocalActivity({ albums: updatedAlbums });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Images className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {targetFileIds.length > 0
                  ? `Add to Album (${targetFileIds.length} selected)`
                  : "Photo Albums"}
              </h3>
              <p className="text-xs text-slate-500">
                Organize your photos into cloud collections
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in duration-150">
            <Check className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Albums List */}
        <div className="p-6 space-y-3 overflow-y-auto flex-1">
          {albums.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
              <Folder className="w-10 h-10 mx-auto text-slate-400 mb-2 stroke-[1.5]" />
              <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                No Albums Created Yet
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Create your first album below to organize your memories and photos.
              </p>
            </div>
          ) : (
            albums.map((album) => {
              const fileCount = album.fileIds ? album.fileIds.length : 0;
              const hasAllTarget =
                targetFileIds.length > 0 &&
                targetFileIds.every((id) => (album.fileIds || []).includes(id));

              return (
                <div
                  key={album.id}
                  onClick={() => targetFileIds.length > 0 && handleAddFiles(album)}
                  className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between group ${
                    targetFileIds.length > 0
                      ? "cursor-pointer hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  } ${
                    hasAllTarget
                      ? "border-emerald-500/50 bg-emerald-50/30 dark:bg-emerald-950/20"
                      : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-700/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                      <Folder className="w-4 h-4 fill-blue-500/20" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {album.name}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {fileCount} {fileCount === 1 ? "photo" : "photos"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {targetFileIds.length > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-500 text-white group-hover:bg-blue-600 transition-colors">
                        Add
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleDeleteAlbum(album.id, e)}
                      title="Delete Album"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {/* Create New Album Section */}
          <div className="pt-2">
            {isCreating ? (
              <form onSubmit={handleCreateAlbum} className="space-y-3">
                <input
                  type="text"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value)}
                  placeholder="e.g. Vacation 2026, Nature, Receipts..."
                  autoFocus
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setNewAlbumName("");
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!newAlbumName.trim()}
                    className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition-colors"
                  >
                    Create
                  </button>
                </div>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => setIsCreating(true)}
                className="w-full py-2.5 px-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-500 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2 text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Album</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumModal;
