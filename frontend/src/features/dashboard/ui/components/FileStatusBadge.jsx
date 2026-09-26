import React from "react";
import useAuth from "../../../auth/hooks/useAuth.jsx";

const FileStatusBadge = ({ file }) => {
  const { plan } = useAuth();

  if (file.status === "QUARANTINED") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        Quarantined
      </span>
    );
  }

  if (file.type === "image") {
    const topLabel =
      file.labels && file.labels[0]
        ? `${file.labels[0].name} ${Math.round(file.labels[0].confidence || 95)}%`
        : "Vision AI 98%";
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {topLabel}
      </span>
    );
  }

  if (file.status === "PROCESSING" || file.status === "PENDING") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
        </span>
        Processing
      </span>
    );
  }

  if (file.type === "video") {
    const quality = file.activeQuality || (plan === "free" ? "720p" : "1080p");
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300 border border-sky-200 dark:border-sky-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
        {file.hlsUrl ? `${quality} HLS` : "Video"}
      </span>
    );
  }

  if (file.type === "pdf") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
        {file.summary ? "Summary Ready" : "Document"}
      </span>
    );
  }

  const ext = (file.name || "").split(".").pop().toUpperCase();
  if (file.type === "document" || /\.(docx?|pptx?|xlsx?|odt|ods|odp|rtf)$/i.test(file.name || "")) {
    const isPpt = /\.(pptx?|potx?|ppsx?|pptm|key)$/i.test(file.name || "");
    const isWord = /\.(docx?|dotx?|docm|odt|rtf|pages)$/i.test(file.name || "");
    const isExcel = /\.(xlsx?|xltx?|xlsm|ods|numbers)$/i.test(file.name || "");

    if (isWord) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 select-none shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          Word ({ext})
        </span>
      );
    }
    if (isPpt) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800/60 flex items-center gap-1.5 select-none shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          Slide ({ext})
        </span>
      );
    }
    if (isExcel) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1.5 select-none shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Sheet ({ext})
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        Doc ({ext})
      </span>
    );
  }

  if (file.type === "csv") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
        CSV Data
      </span>
    );
  }

  if (file.type === "code") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        Code
      </span>
    );
  }

  if (file.type === "audio") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
        Audio
      </span>
    );
  }

  if (file.type === "archive") {
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 flex items-center gap-1.5 select-none shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        Archive
      </span>
    );
  }

  return (
    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 select-none shrink-0">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      {file.type?.toUpperCase() || "File"}
    </span>
  );
};

export default FileStatusBadge;
