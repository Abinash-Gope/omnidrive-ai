import React from "react";

/**
 * Base Skeleton Component with GPU-accelerated shimmer effect
 * Adapts to dark and light modes cleanly.
 */
export const Skeleton = ({ className = "", ...props }) => {
  return (
    <div
      className={`bg-slate-200/80 dark:bg-slate-800/80 rounded-lg animate-shimmer ${className}`}
      {...props}
    />
  );
};

/**
 * SkeletonText for simulating paragraphs and headings
 */
export const SkeletonText = ({ lines = 1, className = "", lastLineWidth = "w-3/4" }) => {
  if (lines === 1) {
    return <Skeleton className={`h-4 w-full ${className}`} />;
  }

  return (
    <div className={`space-y-2.5 ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-4 ${index === lines - 1 ? lastLineWidth : "w-full"}`}
        />
      ))}
    </div>
  );
};

/**
 * SkeletonCircle for avatars, badges, and round icons
 */
export const SkeletonCircle = ({ size = "w-10 h-10", className = "", ...props }) => {
  return (
    <Skeleton
      className={`${size} rounded-full shrink-0 ${className}`}
      {...props}
    />
  );
};

/**
 * SkeletonButton for action buttons
 */
export const SkeletonButton = ({ className = "w-28 h-9 rounded-full", ...props }) => {
  return <Skeleton className={className} {...props} />;
};

/**
 * SkeletonCard for generic card blocks
 */
export const SkeletonCard = ({ className = "", children }) => {
  return (
    <div
      className={`p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4 ${className}`}
    >
      {children || (
        <>
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/3" />
            <SkeletonCircle size="w-8 h-8" />
          </div>
          <SkeletonText lines={2} />
          <Skeleton className="h-8 w-1/2 rounded-xl" />
        </>
      )}
    </div>
  );
};

export default Skeleton;
