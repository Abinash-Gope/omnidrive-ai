import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Folder,
  Clock,
  Star,
  Users,
  Trash2,
  PlayCircle,
  FileText,
  Image as ImageIcon,
  Cloud,
  ArrowRight,
  ShieldAlert,
  Zap,
} from "lucide-react";

const DashboardSidebar = ({
  activeTab,
  onSelectTab,
  onUploadFile,
  onSimulateUpload,
  totalFilesCount = 3,
  storage = { usedGB: 1.2, totalGB: 15.0, usedPercentage: 8 },
}) => {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadFile(file);
      e.target.value = "";
    }
  };

  const navItems = [
    { id: "my-files", label: "My Files", icon: Folder, count: totalFilesCount },
    { id: "recent", label: "Recent", icon: Clock },
    { id: "starred", label: "Starred", icon: Star },
    { id: "shared", label: "Shared with me", icon: Users },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  const smartViews = [
    { id: "videos", label: "Videos (Instant Watch)", icon: PlayCircle, color: "text-[#1a73e8]" },
    { id: "documents", label: "Documents & Summaries", icon: FileText, color: "text-purple-600" },
    { id: "photos", label: "Photos & Scans", icon: ImageIcon, color: "text-emerald-600" },
  ];

  return (
    <aside className="w-64 shrink-0 bg-[#faf8ff] dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between h-[calc(100vh-4rem)] overflow-y-auto select-none">
      <div className="space-y-6">
        {/* + New Upload Elevated Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            accept="video/*,image/*,application/pdf"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-12 bg-[#1a73e8] hover:bg-[#1557bf] text-white rounded-full px-5 flex items-center justify-center gap-2.5 shadow-md hover:shadow-lg transition-all active:scale-95 text-sm font-semibold group"
          >
            <Plus className="w-5 h-5 transition-transform group-hover:rotate-90 duration-200" />
            <span>+ New Upload</span>
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-full text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-[#eaedff] text-[#005bbf] dark:bg-blue-950 dark:text-blue-300 font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Smart Views Section */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
            Smart Views
          </div>
          <nav className="space-y-1">
            {smartViews.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center px-3.5 py-2 rounded-full text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#eaedff] text-[#005bbf] dark:bg-blue-950 dark:text-blue-300 font-semibold"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Quick Test Simulators */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2 flex items-center justify-between">
            <span>Pipeline Triggers</span>
            <Zap className="w-3 h-3 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 gap-1.5 px-1">
            <button
              onClick={() => onSimulateUpload("video")}
              className="py-1 px-2 text-[11px] font-medium rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition-colors text-left"
            >
              + Video 1080p
            </button>
            <button
              onClick={() => onSimulateUpload("image")}
              className="py-1 px-2 text-[11px] font-medium rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors text-left"
            >
              + Vision Photo
            </button>
            <button
              onClick={() => onSimulateUpload("pdf")}
              className="py-1 px-2 text-[11px] font-medium rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 hover:bg-purple-100 transition-colors text-left"
            >
              + GenAI PDF
            </button>
            <button
              onClick={() => onSimulateUpload("explicit")}
              className="py-1 px-2 text-[11px] font-medium rounded-lg bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 hover:bg-red-100 transition-colors text-left flex items-center gap-1"
            >
              <ShieldAlert className="w-3 h-3 text-red-500" />
              <span>Quarantine</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom AWS Storage Meter Card */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#1a73e8]" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">Cloud Storage</span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {storage.usedPercentage}% used
          </span>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {storage.usedGB} GB
            </span>
            <span className="text-xs text-slate-500">of {storage.totalGB} GB free</span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
            <div
              className="h-full bg-[#1a73e8] rounded-full transition-all duration-300"
              style={{ width: `${storage.usedPercentage}%` }}
            />
          </div>
        </div>

        <Link
          to="/pricing"
          className="w-full pt-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557bf] flex items-center justify-center gap-1 transition-colors"
        >
          <span>Upgrade storage</span>
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
