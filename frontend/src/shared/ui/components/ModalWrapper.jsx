import React, { useEffect } from "react";
import { X } from "lucide-react";

/**
 * Reusable modal dialog wrapper with frosted glassmorphism backdrop blur,
 * keyboard accessibility (Esc key), and responsive sizing.
 */
const ModalWrapper = ({
  isOpen,
  onClose,
  children,
  maxWidth = "max-w-lg",
  showCloseButton = true,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fadeIn"
      aria-modal="true"
      role="dialog"
    >
      {/* Frosted Glassmorphism Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-md transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal Surface */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#1f293d] rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 p-6 sm:p-8 z-10 transform transition-all duration-200 scale-100 max-h-[92vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
