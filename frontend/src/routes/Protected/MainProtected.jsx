import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2, Cloud } from "lucide-react";
import { useAuthContext } from "../../features/auth/context/AuthContext.jsx";

const MainProtected = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#faf8ff] dark:bg-[#060b19] text-slate-900 dark:text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#d8e2ff] dark:bg-blue-950 text-[#005bbf] dark:text-blue-300 flex items-center justify-center shadow-md animate-pulse">
          <Cloud className="w-6 h-6 fill-current" />
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-[#1a73e8]" />
          <span>Verifying secure Cognito session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default MainProtected;
