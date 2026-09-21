import React from "react";

const FileStatusBadge = ({ file }) => {
  if (file.status === "QUARANTINED") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        Quarantined
      </span>
    );
  }

  if (file.type === "video") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        1080p HLS
      </span>
    );
  }

  if (file.type === "image") {
    const topLabel =
      file.labels && file.labels[0]
        ? `${file.labels[0].name} ${Math.round(file.labels[0].confidence)}%`
        : "Vision AI";
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
        {topLabel}
      </span>
    );
  }

  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
      Claude 3 Ready
    </span>
  );
};

export default FileStatusBadge;
