import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../features/auth/context/AuthContext.jsx";
import { Skeleton, SkeletonCircle } from "../../shared/ui/components/Skeleton.jsx";
import FileGridSkeleton from "../../features/dashboard/ui/components/FileGridSkeleton.jsx";

const MainProtected = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] dark:bg-[#060b19] flex flex-col font-sans transition-colors relative overflow-hidden">
        {/* Top Progress Bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-blue-100/50 dark:bg-blue-950/40 z-50 overflow-hidden">
          <div className="h-full w-full bg-gradient-to-r from-[#1a73e8] via-indigo-500 to-[#8b5cf6] animate-progress-indeterminate" />
        </div>

        {/* Workspace Header Skeleton */}
        <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-[#0f172a]/70 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <SkeletonCircle size="w-8 h-8" />
            <Skeleton className="h-5 w-32 rounded-lg" />
          </div>

          <div className="hidden md:block max-w-lg w-full px-6">
            <Skeleton className="h-10 w-full rounded-full" />
          </div>

          <div className="flex items-center gap-3">
            <SkeletonCircle size="w-9 h-9" />
            <SkeletonCircle size="w-9 h-9" />
          </div>
        </header>

        {/* Body: Sidebar + Main Area Skeleton */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar Skeleton */}
          <aside className="w-64 shrink-0 bg-[#faf8ff] dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800 p-4 hidden md:flex flex-col justify-between h-[calc(100vh-4rem)]">
            <div className="space-y-6">
              <Skeleton className="w-full h-12 rounded-full" />
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-9 rounded-full" />
                ))}
              </div>
            </div>

            {/* Storage Meter Card Skeleton */}
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex justify-between items-center">
                <Skeleton className="h-4 w-24 rounded-md" />
                <Skeleton className="h-3 w-10 rounded-md" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
          </aside>

          {/* Main Area Skeleton */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 space-y-6">
            <div className="space-y-2">
              <Skeleton className="h-8 w-44 rounded-xl" />
              <Skeleton className="h-3.5 w-96 max-w-full rounded-md" />
            </div>

            {/* Dropzone Skeleton */}
            <div className="h-36 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <SkeletonCircle size="w-12 h-12" />
                <Skeleton className="h-4 w-48 rounded-md" />
              </div>
            </div>

            {/* File Grid Skeleton */}
            <FileGridSkeleton viewMode="grid" count={8} />
          </main>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default MainProtected;
