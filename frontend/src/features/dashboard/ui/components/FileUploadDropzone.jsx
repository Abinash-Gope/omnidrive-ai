import React, { useState, useRef } from "react";
import { UploadCloud, Film, Camera, FileText, Sparkles, ArrowUpRight } from "lucide-react";

const FileUploadDropzone = ({ onUploadFile }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer?.files?.[0];
    if (droppedFile) {
      onUploadFile(droppedFile);
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      onUploadFile(selectedFile);
      e.target.value = "";
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
      className={`relative group rounded-3xl border-2 border-dashed p-6 transition-all duration-300 cursor-pointer overflow-hidden ${
        isDragOver
          ? "border-[#1a73e8] bg-blue-50/70 dark:bg-blue-950/30 scale-[1.01] shadow-lg shadow-blue-500/10"
          : "border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="video/*,image/*,application/pdf"
      />

      <div className="flex flex-col sm:flex-row items-center justify-between gap-5 text-center sm:text-left">
        {/* Left: Icon & Main CTA text */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 text-[#1a73e8] flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform duration-300">
            <UploadCloud className="w-6 h-6 stroke-[1.75]" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-center sm:justify-start">
              <span>Drop files here to trigger AI pipelines</span>
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Direct S3 presigned upload with AWS Rekognition safety, FFmpeg HLS transcoding, and Claude 3 summarization
            </p>
          </div>
        </div>

        {/* Right: Supported format badges */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-[11px] font-medium border border-blue-100 dark:border-blue-900">
            <Film className="w-3 h-3" />
            <span>MP4 / MOV</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 text-[11px] font-medium border border-emerald-100 dark:border-emerald-900">
            <Camera className="w-3 h-3" />
            <span>JPG / PNG</span>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[11px] font-medium border border-purple-100 dark:border-purple-900">
            <FileText className="w-3 h-3" />
            <span>PDF</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileUploadDropzone;
