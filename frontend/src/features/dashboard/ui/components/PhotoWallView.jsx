import React from "react";
import {
  Calendar,
  Star,
  Sparkles,
  MoreVertical,
  Trash2,
  FolderPlus,
} from "lucide-react";

/**
 * Helper to group photos into chronological timeline buckets
 */
const formatTimelineDate = (dateStr) => {
  if (!dateStr) return "Recently Uploaded";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "Recently Uploaded";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const itemDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((today - itemDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays <= 7) return "Earlier This Week";

  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
};

/**
 * Group an array of photos by date string
 */
const groupPhotosByTimeline = (photos = []) => {
  const groups = {};
  photos.forEach((photo) => {
    const rawDate = photo.created_at || photo.createdAt || photo.date;
    const bucket = formatTimelineDate(rawDate);
    if (!groups[bucket]) {
      groups[bucket] = [];
    }
    groups[bucket].push(photo);
  });

  return Object.entries(groups).map(([dateLabel, items]) => ({
    dateLabel,
    items,
  }));
};

/**
 * Google Photos-Style Timeline & Edge-to-Edge Photo Wall
 */
export const PhotoWallView = ({
  photos = [],
  selectedFileIds = [],
  onToggleSelect,
  onOpenPreview,
  onToggleStar,
  onMoveToTrash,
  onOpenAddToAlbum,
  isSelectionMode = false,
}) => {
  const timelineGroups = React.useMemo(() => groupPhotosByTimeline(photos), [photos]);

  if (photos.length === 0) {
    return null;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {timelineGroups.map(({ dateLabel, items }) => {
        const allGroupSelected = items.every((p) =>
          selectedFileIds.includes(p.id || p.file_id)
        );

        return (
          <div key={dateLabel} className="space-y-3">
            {/* Sticky Date Timeline Header */}
            <div className="flex items-center justify-between sticky top-16 z-20 py-2 bg-slate-50/90 dark:bg-slate-950/90 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  {dateLabel}
                </h3>
                <span className="text-xs font-mono text-slate-400 px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800">
                  {items.length} {items.length === 1 ? "photo" : "photos"}
                </span>
              </div>

              {isSelectionMode && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    items.forEach((p) => {
                      const id = p.id || p.file_id;
                      if (allGroupSelected) {
                        if (selectedFileIds.includes(id)) onToggleSelect(id);
                      } else {
                        if (!selectedFileIds.includes(id)) onToggleSelect(id);
                      }
                    });
                  }}
                  className="text-xs font-medium text-[#1a73e8] dark:text-blue-400 hover:underline flex items-center gap-1.5"
                >
                  {allGroupSelected ? "Deselect Section" : "Select Section"}
                </button>
              )}
            </div>

            {/* Seamless Photography Gallery Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5 sm:gap-3.5">
              {items.map((photo) => {
                const photoId = photo.id || photo.file_id;
                const isSelected = selectedFileIds.includes(photoId);
                const isStarred = Boolean(photo.isStarred);
                const primaryLabel = photo.labels?.[0]?.name;
                const imageSrc =
                  photo.thumbnail ||
                  photo.thumbnail_url ||
                  photo.downloadUrl ||
                  photo.download_url;

                return (
                  <div
                    key={photoId}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.shiftKey) {
                        e.preventDefault();
                        if (onToggleSelect) onToggleSelect(photoId);
                      } else {
                        onOpenPreview(photo);
                      }
                    }}
                    className={`group relative aspect-square rounded-2xl overflow-hidden bg-slate-900 border transition-all duration-300 cursor-pointer select-none ${
                      isSelected
                        ? "ring-2 ring-blue-500 border-blue-500 shadow-[0_0_22px_rgba(59,130,246,0.7)] dark:shadow-[0_0_28px_rgba(59,130,246,0.85)] scale-[0.98] z-10"
                        : "border-slate-200/60 dark:border-slate-800 hover:shadow-xl hover:scale-[1.02] hover:border-blue-500/50"
                    }`}
                  >
                    {/* Background Image */}
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={photo.name}
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-slate-800 text-slate-400 text-xs">
                        <span>{photo.name}</span>
                      </div>
                    )}

                    {/* Dark gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                    {/* Top-Right Star Action Button */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleStar(photo);
                      }}
                      className={`absolute top-2.5 right-2.5 z-10 p-1.5 rounded-full transition-all duration-200 ${
                        isStarred
                          ? "opacity-100 bg-black/60 text-amber-400 shadow-md"
                          : "opacity-0 group-hover:opacity-100 bg-black/50 text-white/80 hover:text-amber-300 hover:scale-110 backdrop-blur-xs"
                      }`}
                      title={isStarred ? "Remove star" : "Star photo"}
                    >
                      <Star className={`w-3.5 h-3.5 ${isStarred ? "fill-amber-400 text-amber-400" : ""}`} />
                    </div>

                    {/* Bottom Info & Tag Pill */}
                    <div className="absolute bottom-2 left-2 right-2 z-10 flex items-end justify-between gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold text-white truncate drop-shadow-sm">
                          {photo.name}
                        </div>
                        {primaryLabel && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-emerald-500/80 backdrop-blur-xs text-white font-medium flex items-center gap-0.5 shadow-xs">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>{primaryLabel}</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default PhotoWallView;
