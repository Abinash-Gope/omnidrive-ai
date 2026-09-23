import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  Film,
  FileText,
  Image as ImageIcon,
  ShieldAlert,
  Search,
  Sparkles,
  Inbox,
  Lock,
  Trash2,
  Star,
  Clock,
  Users,
  ArrowUpDown,
  ChevronDown,
  Check,
  Calendar,
  ArrowDownAZ,
  ArrowUpZA,
  HardDrive,
  Folder,
} from "lucide-react";
import FileCard from "./FileCard.jsx";
import FileGridSkeleton from "./FileGridSkeleton.jsx";
import { PhotoCategoryBar } from "./PhotoCategoryBar.jsx";
import { PhotoWallView } from "./PhotoWallView.jsx";

const FileGrid = ({
  files = [],
  allFiles = [],
  quarantinedFiles = [],
  activeTab = "my-files",
  filterType = "all",
  onSelectFilter,
  sortBy = "recent",
  onSetSortBy,
  searchQuery = "",
  viewMode = "grid",
  isLoading = false,
  onOpenPreview,
  onDeleteFile,
  onToggleStar,
  onMoveToTrash,
  onRestoreFile,
  onPermanentDelete,
  onEmptyTrash,
  trashCount = 0,
  onResetSearch,
  selectedFileIds = [],
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  photoViewMode = "cards",
  onTogglePhotoViewMode,
  activePhotoCategory = "all",
  onSelectPhotoCategory,
  activeTagFilter = null,
  onSelectTagFilter,
  folders = [],
  activeFolderId = null,
  onSelectFolder,
  onDeleteFolder,
  onRemoveFromFolder,
  onOpenCreateFolder,
  onOpenAddToFolder,
  onOpenAddToAlbum,
}) => {
  const [isSortMenuOpen, setIsSortMenuOpen] = useState(false);
  const sortRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setIsSortMenuOpen(false);
      }
    };
    if (isSortMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSortMenuOpen]);

  const filterOptions = [
    { id: "all", label: "All Files" },
    { id: "video", label: "Videos (HLS)", icon: Film },
    { id: "image", label: "Images (Vision AI)", icon: ImageIcon },
    { id: "pdf", label: "PDFs (GenAI Summary)", icon: FileText },
  ];

  const sortOptions = [
    { id: "recent", label: "Recent (Newest)", icon: Clock, desc: "Latest uploads & activity" },
    { id: "oldest", label: "Oldest First", icon: Calendar, desc: "Earliest uploaded files" },
    { id: "name-asc", label: "Name (A to Z)", icon: ArrowDownAZ, desc: "Alphabetical order" },
    { id: "name-desc", label: "Name (Z to A)", icon: ArrowUpZA, desc: "Reverse alphabetical" },
    { id: "size-desc", label: "Size (Largest)", icon: HardDrive, desc: "Heaviest files first" },
    { id: "size-asc", label: "Size (Smallest)", icon: HardDrive, desc: "Lightest files first" },
  ];

  const currentSortOption =
    sortOptions.find((opt) => opt.id === sortBy) || sortOptions[0];

  // Extract all images for category tag clustering
  const allImages = useMemo(() => {
    const list = allFiles.length > 0 ? allFiles : files;
    return list.filter((f) => f.type === "image");
  }, [allFiles, files]);

  const isSelectionMode = selectedFileIds.length > 0;

  return (
    <div className="space-y-6">
      {/* Quarantined Security Incident Banner */}
      {quarantinedFiles.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex items-start gap-3.5 text-rose-900 dark:text-rose-200 shadow-xs">
          <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-900 text-rose-600 dark:text-rose-300 shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm">Rekognition Gatekeeper Quarantine Alert</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-rose-200 dark:bg-rose-900 font-bold">
                {quarantinedFiles.length} Flagged
              </span>
            </div>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
              Automated safety policy triggered. Uploads violating moderation standards are isolated in private S3 quarantine vaults and prevented from appearing in the user workspace.
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {quarantinedFiles.map((q) => (
                <div
                  key={q.id}
                  className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-rose-900/40 border border-rose-200 dark:border-rose-800 text-xs flex items-center gap-2"
                >
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                  <span className="font-medium">{q.name}</span>
                  <span className="text-[10px] text-rose-500 font-mono">({q.reason})</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trash Top Notice & Bulk Empty Trash Bar */}
      {activeTab === "trash" && (
        <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/60 flex items-center justify-between gap-4 flex-wrap text-amber-900 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-400 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-amber-950 dark:text-amber-100">
                Trash Management
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/90 mt-0.5">
                Items in trash are automatically purged after 30 days. Restored files return directly to My Files.
              </p>
            </div>
          </div>
          {files.length > 0 && (
            <button
              type="button"
              onClick={onEmptyTrash}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-sm hover:shadow transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Empty Trash</span>
            </button>
          )}
        </div>
      )}

      {/* Filter Category Pills & Sort Control */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {filterOptions.map((opt) => {
            const Icon = opt.icon;
            const isSelected = filterType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectFilter(opt.id)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
                  isSelected
                    ? "bg-[#1a73e8] text-white shadow-xs"
                    : "bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right side: Search info & Sort Dropdown */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {searchQuery && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>
                Search results for: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong>
              </span>
              <button
                onClick={onResetSearch}
                className="text-[#1a73e8] hover:underline font-semibold"
              >
                Clear
              </button>
            </div>
          )}

          {/* Sort Menu Dropdown */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => setIsSortMenuOpen((prev) => !prev)}
              className="h-8 px-3 rounded-full text-xs font-medium flex items-center gap-2 transition-all bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none select-none"
              title="Change sort order"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
              <span className="text-slate-500 dark:text-slate-400">Sort:</span>
              <span className="font-semibold text-slate-800 dark:text-slate-100">{currentSortOption.label}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isSortMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Floating Dropdown Card */}
            {isSortMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-60 bg-white/95 dark:bg-[#0f172a]/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3.5 py-1 text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                  Sort Order
                </div>
                <div className="mt-1 space-y-0.5">
                  {sortOptions.map((opt) => {
                    const isSelected = sortBy === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          onSetSortBy?.(opt.id);
                          setIsSortMenuOpen(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors ${
                          isSelected
                            ? "bg-[#1a73e8]/10 text-[#1a73e8] dark:text-blue-400 font-semibold"
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isSelected ? "text-[#1a73e8] dark:text-blue-400" : "text-slate-400"
                            }`}
                          />
                          <div className="truncate">
                            <div>{opt.label}</div>
                            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              {opt.desc}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-[#1a73e8] dark:text-blue-400 shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Pillar 1: Smart AI Category & Rekognition Tag Bar (active when viewing images) */}
      {filterType === "image" && (
        <PhotoCategoryBar
          images={allImages}
          activeCategory={activePhotoCategory}
          onSelectCategory={onSelectPhotoCategory}
          activeTag={activeTagFilter}
          onSelectTag={onSelectTagFilter}
          photoViewMode={photoViewMode}
          onToggleViewMode={() =>
            onTogglePhotoViewMode(photoViewMode === "wall" ? "cards" : "wall")
          }
          isSelectionMode={isSelectionMode}
          selectedCount={selectedFileIds.length}
          onToggleSelectionMode={() => {
            if (isSelectionMode) onClearSelection();
            else if (files.length > 0) onToggleSelect(files[0]);
          }}
        />
      )}

      {/* Google Drive-Style Folders Section in My Files Root */}
      {activeTab === "my-files" && !activeFolderId && filterType === "all" && !searchQuery && folders.length > 0 && (
        <div className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Folders ({folders.length})
            </h2>
            {onOpenCreateFolder && (
              <button
                type="button"
                onClick={onOpenCreateFolder}
                className="text-xs font-semibold text-[#1a73e8] hover:underline flex items-center gap-1"
              >
                <span>+ New Folder</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {folders.map((folder) => {
              const count = folder.fileIds ? folder.fileIds.length : 0;
              const FOLDER_COLOR_STYLES = {
                indigo: {
                  badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
                  hoverBorder: "hover:border-indigo-400 dark:hover:border-indigo-500",
                  textHover: "group-hover:text-indigo-600 dark:group-hover:text-indigo-400",
                },
                emerald: {
                  badge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                  hoverBorder: "hover:border-emerald-400 dark:hover:border-emerald-500",
                  textHover: "group-hover:text-emerald-600 dark:group-hover:text-emerald-400",
                },
                amber: {
                  badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
                  hoverBorder: "hover:border-amber-400 dark:hover:border-amber-500",
                  textHover: "group-hover:text-amber-600 dark:group-hover:text-amber-400",
                },
                rose: {
                  badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
                  hoverBorder: "hover:border-rose-400 dark:hover:border-rose-500",
                  textHover: "group-hover:text-rose-600 dark:group-hover:text-rose-400",
                },
                purple: {
                  badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                  hoverBorder: "hover:border-purple-400 dark:hover:border-purple-500",
                  textHover: "group-hover:text-purple-600 dark:group-hover:text-purple-400",
                },
                blue: {
                  badge: "bg-blue-500/10 text-[#1a73e8] dark:text-blue-400 border-blue-500/20",
                  hoverBorder: "hover:border-blue-400 dark:hover:border-blue-500",
                  textHover: "group-hover:text-[#1a73e8] dark:group-hover:text-blue-400",
                },
              };

              const style = FOLDER_COLOR_STYLES[folder.color] || FOLDER_COLOR_STYLES.blue;

              return (
                <div
                  key={folder.id}
                  onClick={() => onSelectFolder?.(folder.id)}
                  className={`group flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 ${style.hoverBorder} shadow-xs hover:shadow-md transition-all cursor-pointer select-none`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`w-9 h-9 rounded-xl ${style.badge} flex items-center justify-center shrink-0 border group-hover:scale-105 transition-transform`}>
                      <Folder className="w-4 h-4 fill-current/25" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className={`text-xs font-semibold text-slate-800 dark:text-slate-100 truncate ${style.textHover} transition-colors`}>
                        {folder.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {count} {count === 1 ? "item" : "items"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {onDeleteFolder && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteFolder(folder.id, folder.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors opacity-70 group-hover:opacity-100"
                        title={`Delete folder "${folder.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all text-sm font-semibold pl-0.5">
                      →
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Files Display Container */}
      {isLoading ? (
        <FileGridSkeleton viewMode={viewMode} count={8} />
      ) : files.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 bg-slate-50/50 dark:bg-slate-900/30">
          <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] flex items-center justify-center mb-4">
            {activeTab === "starred" ? (
              <Star className="w-8 h-8 stroke-[1.5] text-amber-500 fill-amber-400/20" />
            ) : activeTab === "trash" ? (
              <Trash2 className="w-8 h-8 stroke-[1.5] text-slate-400" />
            ) : activeTab === "shared" ? (
              <Users className="w-8 h-8 stroke-[1.5] text-indigo-500" />
            ) : activeFolderId ? (
              <Folder className="w-8 h-8 stroke-[1.5] text-blue-500 fill-blue-500/20" />
            ) : (
              <Inbox className="w-8 h-8 stroke-[1.5]" />
            )}
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {searchQuery
              ? "No matching files"
              : activeFolderId
              ? "This folder is empty"
              : activeTab === "starred"
              ? "No starred files yet"
              : activeTab === "trash"
              ? "Trash is empty"
              : activeTab === "shared"
              ? "No files shared with you"
              : filterType === "image" && activeTagFilter
              ? `No photos tagged with "${activeTagFilter}"`
              : "No files found"}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            {searchQuery
              ? `No media matches your search term "${searchQuery}". Try searching for labels like "Urban", "Landscape", or file names.`
              : activeFolderId
              ? "Drag and drop files here, or use the multi-selection bar in My Files to organize files into this folder."
              : activeTab === "starred"
              ? "Star files to easily bookmark them and find them here anytime."
              : activeTab === "trash"
              ? "Items moved to trash will be kept here until permanently deleted."
              : activeTab === "shared"
              ? "Files and media shared with your account will appear here."
              : filterType === "image" && activeTagFilter
              ? "Click 'Clear tag filter' above to show all photos."
              : "Your workspace is clean. Click '+ New Upload' in the sidebar to upload files directly to AWS S3 and trigger AI pipelines."}
          </p>
        </div>
      ) : filterType === "image" && photoViewMode === "wall" ? (
        /* Pillar 2: Google Photos-Style Chronological Wall & Edge-to-Edge Grid */
        <PhotoWallView
          photos={files}
          selectedFileIds={selectedFileIds}
          onToggleSelect={onToggleSelect}
          onOpenPreview={onOpenPreview}
          onToggleStar={onToggleStar}
          onMoveToTrash={onMoveToTrash}
          onOpenAddToAlbum={onOpenAddToAlbum}
          isSelectionMode={isSelectionMode}
        />
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {files.map((file) => (
            <FileCard
              key={file.id || file.file_id}
              file={file}
              onOpenPreview={onOpenPreview}
              onDeleteFile={onDeleteFile}
              onToggleStar={onToggleStar}
              onMoveToTrash={onMoveToTrash}
              onRestoreFile={onRestoreFile}
              onPermanentDelete={onPermanentDelete}
              activeTab={activeTab}
              viewMode="grid"
              isSelected={selectedFileIds.includes(file.id || file.file_id)}
              onToggleSelect={onToggleSelect}
              isSelectionMode={isSelectionMode}
              onOpenAddToFolder={onOpenAddToFolder || onOpenAddToAlbum}
              activeFolderId={activeFolderId}
              onRemoveFromFolder={onRemoveFromFolder}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          {/* Table Header */}
          <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            <span className="flex-1">Name</span>
            <span className="hidden sm:inline px-4 w-36 text-left">Status</span>
            <span className="w-16 text-right">Size</span>
            <span className="w-20 text-right hidden md:inline">Modified</span>
            <span className="w-8"></span>
          </div>
          {/* Table Rows */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {files.map((file) => (
              <FileCard
                key={file.id || file.file_id}
                file={file}
                onOpenPreview={onOpenPreview}
                onDeleteFile={onDeleteFile}
                onToggleStar={onToggleStar}
                onMoveToTrash={onMoveToTrash}
                onRestoreFile={onRestoreFile}
                onPermanentDelete={onPermanentDelete}
                activeTab={activeTab}
                viewMode="list"
                isSelected={selectedFileIds.includes(file.id || file.file_id)}
                onToggleSelect={onToggleSelect}
                isSelectionMode={isSelectionMode}
                onOpenAddToFolder={onOpenAddToFolder || onOpenAddToAlbum}
                activeFolderId={activeFolderId}
                onRemoveFromFolder={onRemoveFromFolder}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileGrid;
