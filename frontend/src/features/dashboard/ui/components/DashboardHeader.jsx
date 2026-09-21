import React from "react";
import { Link } from "react-router-dom";
import { Cloud, Search, LayoutGrid, List, LogOut, X, Bell, ShieldCheck } from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";

const DashboardHeader = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  onResetFilter,
}) => {
  const { user, handleLogout } = useAuth();

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] sticky top-0 z-30 transition-colors">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3 w-60 shrink-0 cursor-pointer" onClick={onResetFilter}>
        <div className="w-9 h-9 rounded-full bg-[#d8e2ff] dark:bg-blue-950 text-[#005bbf] dark:text-blue-300 flex items-center justify-center shadow-xs">
          <Cloud className="w-5 h-5 fill-current" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            OmniDrive<span className="text-[#1a73e8]">AI</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] border border-blue-200 dark:border-blue-800">
            DASHBOARD
          </span>
        </div>
      </div>

      {/* Center: Expansive Google Drive Search Input */}
      <div className="flex-1 max-w-2xl mx-4 hidden md:block">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search files, AI labels (e.g. Urban), OCR text, or Bedrock summaries..."
            className="w-full pl-10 pr-10 py-2 rounded-full bg-[#f1f5f9] dark:bg-slate-800/80 hover:bg-[#e2e8f0] dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1a73e8] border border-transparent focus:border-transparent text-sm text-slate-900 dark:text-white transition-colors placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Right: Actions & User Avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* View Switcher */}
        <button
          onClick={onToggleViewMode}
          title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          {viewMode === "grid" ? <List className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
        </button>

        {/* AWS Region Badge */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>us-east-1 Active</span>
        </div>

        {/* Notification Bell */}
        <button
          title="Notifications"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors relative"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1a73e8]" />
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>

        {/* User Profile Avatar */}
        <div
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1a73e8] to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs border-2 border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 cursor-default"
          title={user ? `${user.name} (${user.email})` : "Alex Gope"}
        >
          {user?.avatar || "AG"}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
