import React from "react";
import { Folder, Trash2, ShieldCheck, FolderX } from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";

/**
 * Enterprise-grade Confirmation Modal for Folder Deletion
 * Replaces crude browser popups with a polished, glassmorphic UI.
 */
const DeleteFolderModal = ({
  isOpen,
  onClose,
  onConfirm,
  folder,
  isDeleting = false,
}) => {
  if (!folder) return null;

  const count = (folder.fileIds || []).length;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-md"
      padding="p-6"
    >
      <div className="space-y-4 select-none">
        {/* Top Warning Badge */}
        <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-100 dark:border-rose-900/50 shadow-xs">
          <FolderX className="w-6 h-6 stroke-[2]" />
        </div>

        {/* Heading & Details */}
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Delete folder?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
            Are you sure you want to delete <span className="font-semibold text-slate-800 dark:text-slate-200">"{folder.name}"</span>?
          </p>
        </div>

        {/* Folder Details Box */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Folder:</span>
            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
              <Folder className="w-3.5 h-3.5 text-blue-500" />
              <span>{folder.name}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-slate-400">Files inside:</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
              {count} {count === 1 ? "item" : "items"}
            </span>
          </div>
        </div>

        {/* Enterprise Safety Guarantee Notice */}
        <div className="p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/40 flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
          <ShieldCheck className="w-4 h-4 text-[#1a73e8] dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Your files are safe.</strong> Deleting this folder only removes the folder grouping. All files inside will remain securely in your workspace.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onClose}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={() => onConfirm(folder)}
            className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Folder</span>
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};

export default DeleteFolderModal;
