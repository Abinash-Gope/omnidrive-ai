import React from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, ArrowLeft } from "lucide-react";

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-[#faf8ff] dark:bg-[#0b1329] text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] flex items-center justify-center mb-4 shadow-sm">
        <Cloud className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">404 - Page Not Found</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
        The workspace file, view, or link you requested does not exist or has been moved.
      </p>
      <button
        onClick={() => navigate("/")}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-medium text-sm transition-all shadow-md hover:shadow-lg"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Overview</span>
      </button>
    </div>
  );
};

export default NotFoundPage;
