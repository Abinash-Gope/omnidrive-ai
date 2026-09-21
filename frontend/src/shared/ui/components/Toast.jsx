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
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  if (!toast) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-600" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-600" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600" />,
    info: <Info className="w-5 h-5 text-blue-600" />,
  };

  const bgStyles = {
    success: "bg-emerald-50 border-emerald-200 text-emerald-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
    error: "bg-rose-50 border-rose-200 text-rose-900",
    info: "bg-blue-50 border-blue-200 text-blue-900",
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm animate-bounce-in">
      <div
        className={`flex items-start gap-3 p-4 rounded-2xl border shadow-lg backdrop-blur-md ${
          bgStyles[toast.type] || bgStyles.info
        }`}
      >
        <div className="flex-shrink-0 mt-0.5">{icons[toast.type] || icons.info}</div>
        <div className="flex-1 text-xs font-medium leading-relaxed">{toast.message}</div>
        <button
          onClick={() => dispatch(clearToast())}
          className="text-gray-400 hover:text-gray-700 p-1 rounded-full transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
