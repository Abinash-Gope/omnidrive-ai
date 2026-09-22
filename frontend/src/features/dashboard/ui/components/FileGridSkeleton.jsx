import React from "react";
import { Skeleton, SkeletonCircle } from "../../../../shared/ui/components/Skeleton.jsx";

/**
 * FileGridSkeleton: Shimmer placeholder for file grids and lists
 * Matches the geometry of FileCard to eliminate layout shift upon data arrival.
 */
export const FileGridSkeleton = ({ viewMode = "grid", count = 8 }) => {
  if (viewMode === "list") {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Table Header Placeholder */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="flex-1">Name</span>
          <span className="hidden sm:inline px-4 w-36 text-left">Status</span>
          <span className="w-16 text-right">Size</span>
          <span className="w-20 text-right hidden md:inline">Modified</span>
          <span className="w-8"></span>
        </div>

        {/* Shimmer Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-slate-900 text-sm"
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <SkeletonCircle size="w-9 h-9" className="rounded-xl" />
                <div className="space-y-1.5 min-w-0 flex-1 max-w-sm">
                  <Skeleton className="h-4 w-3/4 rounded-md" />
                  <Skeleton className="h-3 w-1/2 rounded-md" />
                </div>
              </div>

              <div className="hidden sm:flex items-center px-4 shrink-0">
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <Skeleton className="h-3.5 w-14 rounded-md" />
                <Skeleton className="h-3.5 w-16 rounded-md hidden md:inline" />
                <SkeletonCircle size="w-6 h-6" className="rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Grid View Skeleton Cards
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs flex flex-col"
        >
          {/* Aspect Video Thumbnail Shimmer Box */}
          <div className="aspect-video w-full bg-slate-100 dark:bg-slate-800/80 relative overflow-hidden">
            <Skeleton className="w-full h-full rounded-none" />
            <div className="absolute top-3 left-3">
              <Skeleton className="h-5 w-14 rounded-full bg-white/60 dark:bg-slate-900/60" />
            </div>
          </div>

          {/* Card Body */}
          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SkeletonCircle size="w-6 h-6" className="rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </div>
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
              <Skeleton className="h-3.5 w-12 rounded-md" />
              <Skeleton className="h-3 w-16 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default FileGridSkeleton;
