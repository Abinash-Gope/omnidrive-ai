import React, { useState, useRef, useEffect } from "react";
import {
  Film,
  FileText,
  Image as ImageIcon,
  Folder,
  FileCode,
  Music,
  Archive,
  Clock,
  Calendar,
  ArrowDownAZ,
  ArrowUpZA,
  HardDrive,
  ArrowUpDown,
  ChevronDown,
  Check,
  Trash2,
} from "lucide-react";

const FILTER_OPTIONS = [
  { id: "all", label: "All Files" },
  { id: "video", label: "Videos (HLS)", icon: Film },
  { id: "image", label: "Images (Vision AI)", icon: ImageIcon },
  { id: "document", label: "Documents (PDF, Office)", icon: FileText },
  { id: "code", label: "Code & Data", icon: FileCode },
  { id: "audio", label: "Audio", icon: Music },
  { id: "archive", label: "Archives", icon: Archive },
];

const SORT_OPTIONS = [
  { id: "recent", label: "Recent (Newest)", icon: Clock, desc: "Latest uploads & activity" },
  { id: "oldest", label: "Oldest First", icon: Calendar, desc: "Earliest uploaded files" },
  { id: "name-asc", label: "Name (A to Z)", icon: ArrowDownAZ, desc: "Alphabetical order" },
  { id: "name-desc", label: "Name (Z to A)", icon: ArrowUpZA, desc: "Reverse alphabetical" },
  { id: "size-desc", label: "Size (Largest)", icon: HardDrive, desc: "Heaviest files first" },
  { id: "size-asc", label: "Size (Smallest)", icon: HardDrive, desc: "Lightest files first" },
];

export const DashboardToolbar = ({
  headerInfo,
  activeFolderId,
  onSetActiveFolderId,
  onRequestDeleteFolder,
  filterType = "all",
  onSelectFilter,
  sortBy = "recent",
  onSetSortBy,
  searchQuery = "",
  onResetSearch,
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

  const currentSortOption =
    SORT_OPTIONS.find((opt) => opt.id === sortBy) || SORT_OPTIONS[0];

  return (
    <div className="shrink-0 px-6 lg:px-8 pt-5 pb-3 border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#060b19]/80 backdrop-blur-md z-20 space-y-3.5 transition-colors">
      {/* Title & Navigation Row */}
      <div className="flex items-center justify-between">
        {headerInfo?.isFolder ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => onSetActiveFolderId?.(null)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>←</span>
                <span>Back to My Files</span>
              </button>
              <div>
                <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                  <span
                    className="hover:text-[#1a73e8] cursor-pointer"
                    onClick={() => onSetActiveFolderId?.(null)}
                  >
                    My Files
                  </span>
                  <span>/</span>
                  <span className="text-slate-700 dark:text-slate-300 font-semibold">
                    {headerInfo.title}
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-0.5">
                  <Folder className="w-5 h-5 sm:w-6 sm:h-6 text-[#1a73e8] fill-[#1a73e8]/20" />
                  <span>{headerInfo.title}</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onRequestDeleteFolder?.(activeFolderId, headerInfo.title)}
                className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/40 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Delete this folder"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Folder</span>
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {headerInfo?.title || "My Files"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {headerInfo?.subtitle || "Enterprise Cloud Storage with intelligent media processing & document AI pipelines"}
            </p>
          </div>
        )}
      </div>

      {/* Filter Category Pills & Sort Control Row */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Category Pills (no ugly Windows scrollbar track) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 max-w-full no-scrollbar scrollbar-none">
          {FILTER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isSelected = filterType === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => onSelectFilter?.(opt.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
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

        {/* Right: Search Info & Sort Dropdown */}
        <div className="flex items-center gap-3 ml-auto shrink-0">
          {searchQuery && (
            <div className="text-xs text-slate-500 flex items-center gap-2">
              <span>
                Results for: <strong className="text-slate-900 dark:text-white">"{searchQuery}"</strong>
              </span>
              <button
                onClick={onResetSearch}
                className="text-[#1a73e8] hover:underline font-semibold cursor-pointer"
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
              className="h-8 px-3 rounded-full text-xs font-medium flex items-center gap-2 transition-all bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs hover:border-slate-300 dark:hover:border-slate-600 focus:outline-none select-none cursor-pointer"
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
                  {SORT_OPTIONS.map((opt) => {
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
                        className={`w-full px-3.5 py-2 text-left text-xs flex items-center justify-between transition-colors cursor-pointer ${
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
    </div>
  );
};

export default DashboardToolbar;
