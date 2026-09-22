import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { clearToast } from "../../state/uiSlice.jsx";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

const Toast = () => {
  const dispatch = useDispatch();
  const toast = useSelector((state) => state.ui?.toast);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        dispatch(clearToast());
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-500 shrink-0" />,
  };

  const bgStyles = {
    success: "bg-emerald-50 dark:bg-[#072416] border-emerald-300 dark:border-emerald-700/80 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/10",
    warning: "bg-amber-50 dark:bg-[#2a1705] border-amber-300 dark:border-amber-700/80 text-amber-950 dark:text-amber-100 shadow-amber-500/10",
    error: "bg-rose-50 dark:bg-[#2c0910] border-rose-300 dark:border-rose-700/80 text-rose-950 dark:text-rose-100 shadow-rose-500/10",
    info: "bg-blue-50 dark:bg-[#081a38] border-blue-300 dark:border-blue-700/80 text-blue-950 dark:text-blue-100 shadow-blue-500/10",
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] max-w-sm w-full animate-bounce-in pointer-events-auto">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
          bgStyles[toast.type] || bgStyles.info
        }`}
      >
        <div className="mt-0.5">{icons[toast.type] || icons.info}</div>
        <div className="flex-1 text-xs font-semibold leading-relaxed">
          {toast.message}
        </div>
        <button
          type="button"
          onClick={() => dispatch(clearToast())}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 rounded-full transition-colors cursor-pointer shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
