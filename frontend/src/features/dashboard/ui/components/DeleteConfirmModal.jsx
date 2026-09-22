import React from "react";
import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";

/**
 * Modern Confirmation Modal for File Deletion
 * Supports single file deletion and offline file removal with confirmation.
 */
const DeleteConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  file,
  isDeleting = false,
}) => {
  if (!file) return null;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={() => {
        if (!isDeleting) onClose();
      }}
      maxWidth="max-w-md"
      padding="p-6"
    >
      <div className="space-y-4">
        {/* Warning Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-xs">
          <AlertTriangle className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Heading & Details */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Delete file?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Are you sure you want to remove <span className="font-semibold text-slate-800 dark:text-slate-200">"{file.name}"</span>?
          </p>
        </div>

        {/* File Snapshot Box */}
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
          <div className="flex justify-between text-slate-500">
            <span>Size:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300">{file.size || "Unknown"}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Type:</span>
            <span className="capitalize text-slate-700 dark:text-slate-300">{file.type || "file"}</span>
          </div>
          {file.isOffline && (
            <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
              <span>Storage mode:</span>
              <span>Offline / Local Cache</span>
            </div>
          )}
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500">
          This action will remove the record from your workspace and delete the object from cloud storage.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm(file)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Removing...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete</span>
              </>
            )}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default DeleteConfirmModal;
