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
  padding = "p-5 sm:p-6",
  className = "",
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn"
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
        className={`relative w-full ${maxWidth} bg-white dark:bg-[#1f293d] rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-700/60 ${padding} z-10 transform transition-all duration-200 scale-100 max-h-[96vh] overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 sm:w-9 sm:h-9 rounded-full z-20 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
};

export default ModalWrapper;
