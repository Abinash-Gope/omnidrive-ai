import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Folder,
  Clock,
  Star,
  Users,
  Trash2,
  Cloud,
  ArrowRight,
  Lock,
  ShieldCheck,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";

const DashboardSidebar = ({
  activeTab,
  onSelectTab,
  onUploadFile,
  totalFilesCount = 3,
  storage: propStorage,
}) => {
  const fileInputRef = useRef(null);
  const { plan, planDetails, handleOpenEnterpriseContact } = useAuth();

  const effectiveStorage = {
    usedGB: planDetails?.storageUsedGB ?? propStorage?.usedGB ?? 1.2,
    totalGB: planDetails?.storageTotalGB ?? propStorage?.totalGB ?? 15.0,
    usedPercentage: planDetails?.storageUsedPercentage ?? propStorage?.usedPercentage ?? 8,
    isUnlimited: planDetails?.isUnlimitedStorage ?? false,
  };

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

  return (
    <aside className="w-64 shrink-0 bg-[#faf8ff] dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between h-[calc(100vh-4rem)] overflow-hidden select-none sticky top-16">
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
            <span>New Upload</span>
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
      </div>

      {/* Bottom AWS Storage Meter Card */}
      <div className="bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 space-y-3 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-[#1a73e8]" />
            <span className="text-xs font-semibold text-slate-900 dark:text-white">
              {plan === "enterprise"
                ? "VPC Dedicated S3"
                : plan === "pro"
                ? "Pro Cloud S3"
                : "Cloud Storage"}
            </span>
          </div>
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {effectiveStorage.usedPercentage}% {effectiveStorage.isUnlimited ? "alloc" : "used"}
          </span>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {plan === "enterprise"
                ? `${effectiveStorage.usedGB.toLocaleString()} GB (1.84 TB)`
                : `${effectiveStorage.usedGB} GB`}
            </span>
            <span className="text-xs text-slate-500">
              {effectiveStorage.isUnlimited
                ? "of Unlimited VPC"
                : `of ${effectiveStorage.totalGB.toLocaleString()} GB`}
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                plan === "enterprise" ? "bg-purple-600" : "bg-[#1a73e8]"
              }`}
              style={{ width: `${effectiveStorage.usedPercentage}%` }}
            />
          </div>
        </div>

        {plan === "enterprise" ? (
          <button
            onClick={handleOpenEnterpriseContact}
            className="w-full pt-1 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center justify-center gap-1 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Dedicated VPC Active</span>
          </button>
        ) : plan === "pro" ? (
          <button
            onClick={handleOpenEnterpriseContact}
            className="w-full pt-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557bf] flex items-center justify-center gap-1 transition-colors"
          >
            <Lock className="w-3 h-3 text-purple-600" />
            <span>Contact for Enterprise VPC</span>
          </button>
        ) : (
          <Link
            to="/pricing"
            className="w-full pt-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557bf] flex items-center justify-center gap-1 transition-colors"
          >
            <span>Upgrade to Pro Cloud</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>
    </aside>
  );
};

export default DashboardSidebar;
