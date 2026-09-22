import React from "react";
import { Skeleton, SkeletonCircle, SkeletonText } from "../../../../shared/ui/components/Skeleton.jsx";

/**
 * ProfileSkeleton: High-fidelity shimmer skeleton for ProfilePage
 */
export const ProfileSkeleton = () => {
  return (
    <div className="space-y-8 animate-fade-in max-w-5xl mx-auto w-full">
      {/* Profile Header Identity Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <SkeletonCircle size="w-20 h-20 sm:w-24 sm:h-24" className="ring-4 ring-slate-100 dark:ring-slate-800" />
          <div className="space-y-2.5">
            <Skeleton className="h-7 w-52 rounded-xl" />
            <Skeleton className="h-4 w-72 rounded-md" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-32 rounded-full hidden sm:inline-block" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-center">
          <Skeleton className="h-10 w-24 rounded-full" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      {/* Tabs Navigation Skeleton */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200/80 dark:border-slate-800/80">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full shrink-0" />
        ))}
      </div>

      {/* Cloud Storage Allocation Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-64 rounded-lg" />
            <Skeleton className="h-3.5 w-80 rounded-md" />
          </div>
          <Skeleton className="h-6 w-28 rounded-full" />
        </div>

        <div className="space-y-2 pt-2">
          <div className="flex items-baseline justify-between">
            <Skeleton className="h-8 w-48 rounded-xl" />
            <Skeleton className="h-4 w-28 rounded-md" />
          </div>
          <Skeleton className="h-3 w-full rounded-full" />
        </div>

        {/* 3 Asset Category Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-2"
            >
              <div className="flex items-center gap-2">
                <SkeletonCircle size="w-2.5 h-2.5" />
                <Skeleton className="h-4 w-24 rounded-md" />
              </div>
              <Skeleton className="h-6 w-16 rounded-md" />
              <Skeleton className="h-3 w-32 rounded-md" />
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center gap-3">
          <Skeleton className="h-9 w-44 rounded-full" />
          <Skeleton className="h-9 w-36 rounded-full" />
        </div>
      </div>

      {/* AI Inference Quotas Card Skeleton */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-56 rounded-lg" />
          <Skeleton className="h-4 w-32 rounded-md" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-48 rounded-md" />
                <Skeleton className="h-3 w-72 rounded-md" />
              </div>
              <Skeleton className="h-4 w-32 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfileSkeleton;
