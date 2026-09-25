import React from "react";
import useAuth from "../../../auth/hooks/useAuth.jsx";

const FileStatusBadge = ({ file }) => {
  const { plan } = useAuth();

  if (file.status === "QUARANTINED") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        Quarantined
      </span>
    );
  }

  if (file.status === "PROCESSING" || file.status === "PENDING") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
        Processing
      </span>
    );
  }

  if (file.type === "video") {
    const quality = file.activeQuality || (plan === "free" ? "720p" : "1080p");
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
        {file.hlsUrl ? `${quality} HLS` : "Video"}
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

  if (file.type === "pdf") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
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
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
          Word ({ext})
        </span>
      );
    }
    if (isPpt) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
          Slide ({ext})
        </span>
      );
    }
    if (isExcel) {
      return (
        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          Sheet ({ext})
        </span>
      );
    }
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        Doc ({ext})
      </span>
    );
  }

  if (file.type === "csv") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
        CSV Data
      </span>
    );
  }

  if (file.type === "code") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
        Code
      </span>
    );
  }

  if (file.type === "audio") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
        Audio
      </span>
    );
  }

  if (file.type === "archive") {
    return (
      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
        Archive
      </span>
    );
  }

  return (
    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
      {file.type?.toUpperCase() || "File"}
    </span>
  );
};

export default FileStatusBadge;
