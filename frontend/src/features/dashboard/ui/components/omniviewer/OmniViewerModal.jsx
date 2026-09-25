import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import PhotoStudioViewport from "./PhotoStudioViewport.jsx";
import VideoStudioViewport from "./VideoStudioViewport.jsx";
import PdfStudioViewport from "./PdfStudioViewport.jsx";
import CodeStudioViewport from "./CodeStudioViewport.jsx";
import CsvDataStudioViewport from "./CsvDataStudioViewport.jsx";
import MarkdownStudioViewport from "./MarkdownStudioViewport.jsx";
import AudioStudioViewport from "./AudioStudioViewport.jsx";
import BinaryFileViewport from "./BinaryFileViewport.jsx";
import OmniViewerFilmstrip from "./OmniViewerFilmstrip.jsx";

/**
 * Detect file category to mount appropriate polymorphic viewport
 */
const getFileCategory = (file) => {
  if (!file) return "binary";
  const name = (file.name || "").toLowerCase();
  const type = (file.type || "").toLowerCase();

  if (type === "video" || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(name)) {
    return "video";
  }
  if (type === "pdf" || name.endsWith(".pdf")) {
    return "pdf";
  }
  if (type === "image" || /\.(jpe?g|png|webp|gif|svg|bmp|ico|heic|tiff?)$/i.test(name)) {
    return "image";
  }
  if (/\.(csv|tsv)$/i.test(name)) {
    return "csv";
  }
  if (/\.(md|markdown|txt|log)$/i.test(name)) {
    return "markdown";
  }
  if (
    /\.(js|jsx|ts|tsx|py|json|html|css|sql|sh|bash|yml|yaml|env|xml|c|cpp|h|java|rs|go|php)$/i.test(
      name
    )
  ) {
    return "code";
  }
  if (/\.(mp3|wav|aac|ogg|flac|m4a|wma)$/i.test(name) || type === "audio") {
    return "audio";
  }
  return "binary";
};

const OmniViewerModal = ({
  file,
  isOpen,
  onClose,
  files = [],
  onSelectFile,
}) => {
  const [activeFile, setActiveFile] = useState(file);
  const [isFilmstripCollapsed, setIsFilmstripCollapsed] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // Sync active file with prop
  useEffect(() => {
    if (file) {
      setActiveFile(file);
    }
  }, [file]);

  const currentFile = activeFile || file;

  // Find index in files array for sequential navigation
  const currentIndex = useMemo(() => {
    if (!currentFile || !files || files.length === 0) return -1;
    return files.findIndex(
      (f) =>
        (f.id && currentFile.id && f.id === currentFile.id) ||
        f.name === currentFile.name
    );
  }, [currentFile, files]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < files.length - 1;

  const handlePrev = useCallback(() => {
    if (hasPrev && files[currentIndex - 1]) {
      const prevFile = files[currentIndex - 1];
      setActiveFile(prevFile);
      if (onSelectFile) onSelectFile(prevFile);
    }
  }, [hasPrev, files, currentIndex, onSelectFile]);

  const handleNext = useCallback(() => {
    if (hasNext && files[currentIndex + 1]) {
      const nextFile = files[currentIndex + 1];
      setActiveFile(nextFile);
      if (onSelectFile) onSelectFile(nextFile);
    }
  }, [hasNext, files, currentIndex, onSelectFile]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleShare = () => {
    const url = currentFile?.downloadUrl || currentFile?.download_url || window.location.href;
    navigator.clipboard.writeText(url);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  // Keyboard navigation shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key.toLowerCase() === "f" && !e.ctrlKey && !e.metaKey) {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handlePrev, handleNext, onClose]);

  if (!isOpen || !currentFile) return null;

  const category = getFileCategory(currentFile);
  const downloadLink = currentFile.downloadUrl || currentFile.download_url || null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-950/90 backdrop-blur-2xl select-none animate-in fade-in duration-200">
      {/* Center Dynamic Cinema Viewport Stage */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden flex items-center justify-center p-2 sm:p-5">
        {/* Previous Navigation Floating Arrow */}
        {hasPrev && (
          <button
            onClick={handlePrev}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-slate-900/85 hover:bg-[#1a73e8] border border-white/15 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group"
            title="Previous File (←)"
          >
            <ChevronLeft className="w-6 h-6 group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Dynamic Polymorphic Viewport Container with Smooth Cross-Fade */}
        <div
          key={currentFile.id || currentFile.file_id || currentFile.name}
          className="w-full h-full max-w-5xl flex items-center justify-center animate-in fade-in duration-200"
        >
          {category === "video" && (
            <VideoStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "pdf" && (
            <PdfStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "image" && (
            <PhotoStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "code" && (
            <CodeStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "csv" && (
            <CsvDataStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "markdown" && (
            <MarkdownStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "audio" && (
            <AudioStudioViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
          {category === "binary" && (
            <BinaryFileViewport
              file={currentFile}
              onClose={onClose}
              onShare={handleShare}
              downloadLink={downloadLink}
            />
          )}
        </div>

        {/* Next Navigation Floating Arrow */}
        {hasNext && (
          <button
            onClick={handleNext}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 w-11 h-11 rounded-full bg-slate-900/85 hover:bg-[#1a73e8] border border-white/15 text-white flex items-center justify-center backdrop-blur-md shadow-2xl transition-all hover:scale-110 active:scale-95 group"
            title="Next File (→)"
          >
            <ChevronRight className="w-6 h-6 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}
      </div>

      {/* Bottom Filmstrip Carousel */}
      {files && files.length > 1 && (
        <OmniViewerFilmstrip
          files={files}
          activeFile={currentFile}
          onSelectFile={(f) => {
            setActiveFile(f);
            if (onSelectFile) onSelectFile(f);
          }}
          isCollapsed={isFilmstripCollapsed}
          onToggleCollapse={() => setIsFilmstripCollapsed(!isFilmstripCollapsed)}
        />
      )}
    </div>
  );
};

export default OmniViewerModal;
