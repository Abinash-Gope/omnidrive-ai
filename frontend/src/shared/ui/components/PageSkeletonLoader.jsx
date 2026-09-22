import React from "react";
import { Skeleton, SkeletonCircle, SkeletonText } from "./Skeleton.jsx";

/**
 * PageSkeletonLoader: High-performance fallback for React.Suspense
 * Displays a glowing top progress bar and a graceful page structure with shimmer.
 */
export const PageSkeletonLoader = ({ variant = "page" }) => {
  return (
    <div className="min-h-screen w-full bg-[#f8fafd] dark:bg-[#060b19] flex flex-col relative overflow-hidden transition-colors">
      {/* Top Indeterminate Progress Bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-blue-100/50 dark:bg-blue-950/40 z-50 overflow-hidden">
        <div className="h-full w-full bg-gradient-to-r from-[#1a73e8] via-indigo-500 to-[#8b5cf6] animate-progress-indeterminate shadow-sm shadow-blue-500/50" />
      </div>

      {/* Top Header Placeholder */}
      <header className="h-16 px-6 sm:px-8 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-md sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SkeletonCircle size="w-8 h-8" />
          <Skeleton className="h-5 w-32 rounded-lg" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24 rounded-full hidden sm:block" />
          <SkeletonCircle size="w-9 h-9" />
        </div>
      </header>

      {/* Main Page Skeleton Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 sm:p-8 space-y-8 animate-fade-in">
        {/* Breadcrumb / Section Tag */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-20 rounded-md" />
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>

        {/* Hero Banner Skeleton */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
          <Skeleton className="h-8 sm:h-10 w-2/3 max-w-lg rounded-xl" />
          <SkeletonText lines={2} className="max-w-xl" />
          <div className="flex items-center gap-3 pt-2">
            <Skeleton className="h-10 w-36 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>

        {/* 3-Column Responsive Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4"
            >
              <div className="flex items-center justify-between">
                <SkeletonCircle size="w-10 h-10" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-6 w-3/4 rounded-lg" />
              <SkeletonText lines={3} />
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <Skeleton className="h-4 w-20 rounded-md" />
                <Skeleton className="h-4 w-12 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default PageSkeletonLoader;
