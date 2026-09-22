import React from "react";
import { Link } from "react-router-dom";
import { Search, LayoutGrid, List, LogOut, X, Bell, Sun, Moon, Laptop } from "lucide-react";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import useTheme from "../../../../shared/hooks/useTheme.jsx";

const DashboardHeader = ({
  searchQuery,
  onSearchChange,
  viewMode,
  onToggleViewMode,
  onResetFilter,
}) => {
  const { user, plan, planDetails, handleLogout } = useAuth();
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] sticky top-0 z-30 transition-colors">
      {/* Left: Brand Identity */}
      <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={onResetFilter}>
        <OmniDriveLogo size="sm" animate={true} />
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
            OmniDrive<span className="text-[#1a73e8]">AI</span>
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] border border-blue-200 dark:border-blue-800">
            DASHBOARD
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${planDetails?.badgeClass || "bg-slate-100 text-slate-700 border-slate-200"}`}>
            {planDetails?.badge || "FREE TIER"}
          </span>
          {plan === "enterprise" && (
            <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              VPC: vpc-0a89d71c
            </span>
          )}
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

        {/* Quick Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
        >
          {isDark ? (
            <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
          ) : (
            <Moon className="w-5 h-5 text-slate-600 hover:-rotate-12 transition-transform duration-300" />
          )}
        </button>

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
        <Link
          to="/profile"
          className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1a73e8] to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs border-2 border-white dark:border-slate-800 ring-1 ring-slate-200 dark:ring-slate-700 hover:ring-2 hover:ring-[#1a73e8] transition-all cursor-pointer"
          title={user ? `Profile: ${user.name} (${user.email})` : "Profile: Alex Gope"}
        >
          {user?.avatar || "AG"}
        </Link>
      </div>
    </header>
  );
};

export default DashboardHeader;
