import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  Folder,
  Star,
  Users,
  Trash2,
  Cloud,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Video as VideoIcon,
  FileText,
  HardDrive,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import {
  formatStorageBytes,
  formatStoragePercent,
} from "../../utils/storageHelper.jsx";

const DashboardSidebar = ({
  activeTab,
  onSelectTab,
  onUploadFile,
  onOpenUploadModal,
  totalFilesCount = 0,
  tabCounts = {},
  storage: propStorage,
  folders = [],
  activeFolderId = null,
  onSelectFolder,
  onOpenCreateFolder,
  onDeleteFolder,
  albums = [],
  activeAlbumId = null,
  onSelectAlbum,
  onOpenCreateAlbum,
}) => {
  const fileInputRef = useRef(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const { plan, planDetails, handleOpenEnterpriseContact } = useAuth();

  let extraStorageGB = 0;
  if (plan === "pro") {
    try {
      const saved = localStorage.getItem("omni_pro_addons");
      if (saved) {
        const parsed = JSON.parse(saved);
        extraStorageGB = parsed.extraStorageGB || 0;
      }
    } catch {}
  }

  // Quota totals: default Free Tier is 15.0 GB
  const totalGB = (planDetails?.storageTotalGB || propStorage?.totalGB || 15.0) + extraStorageGB;
  const isUnlimited = planDetails?.isUnlimitedStorage ?? false;
  const totalLimitBytes = totalGB * 1024 * 1024 * 1024;

  // Byte-accurate used storage prioritizing actual file calculations from Redux/DynamoDB
  const usedBytes =
    typeof propStorage?.usedBytes === "number"
      ? propStorage.usedBytes
      : propStorage?.usedGB
      ? Math.round(propStorage.usedGB * 1024 * 1024 * 1024)
      : 0;

  const usedGB = propStorage?.usedGB ?? +(usedBytes / (1024 * 1024 * 1024)).toFixed(3);
  const rawRatio = totalLimitBytes > 0 ? (usedBytes / totalLimitBytes) * 100 : 0;
  const usedPercentage = Math.min(100, Math.round(rawRatio));
  const formattedPercent = propStorage?.formattedPercent || formatStoragePercent(usedBytes, totalLimitBytes);
  const formattedUsed = propStorage?.formattedUsed || formatStorageBytes(usedBytes);
  const formattedTotal = isUnlimited
    ? "Unlimited VPC"
    : totalGB >= 1024
    ? `${(totalGB / 1024).toFixed(0)} TB`
    : `${totalGB} GB`;

  const visualPercentage =
    propStorage?.visualPercentage ??
    (usedBytes > 0 ? Math.max(1.5, Math.min(100, rawRatio)) : 0);

  const breakdown = propStorage?.breakdown || {
    imagesBytes: 0,
    formattedImages: "0 KB",
    videosBytes: 0,
    formattedVideos: "0 KB",
    documentsBytes: 0,
    formattedDocuments: "0 KB",
    otherBytes: 0,
    formattedOther: "0 KB",
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onUploadFile(files);
      e.target.value = "";
    }
  };

  const myCount = tabCounts.myFilesCount ?? totalFilesCount;
  const starCount = tabCounts.starredCount ?? 0;
  const sharedCount = tabCounts.sharedCount ?? 0;
  const trashCount = tabCounts.trashCount ?? 0;

  const navItems = [
    { id: "my-files", label: "My Files", icon: Folder, count: myCount },
    { id: "starred", label: "Starred", icon: Star, count: starCount > 0 ? starCount : undefined },
    { id: "shared", label: "Shared with me", icon: Users, count: sharedCount > 0 ? sharedCount : undefined },
    {
      id: "trash",
      label: "Trash",
      icon: Trash2,
      count: trashCount > 0 ? trashCount : undefined,
      isDanger: trashCount > 0,
    },
  ];

  // Dynamic progress bar color matching quota threshold
  const progressBarColor =
    plan === "enterprise"
      ? "bg-purple-600"
      : usedPercentage > 90
      ? "bg-rose-500"
      : usedPercentage > 75
      ? "bg-amber-500"
      : "bg-[#1a73e8]";

  return (
    <aside className="w-64 shrink-0 bg-[#faf8ff] dark:bg-[#0b1329] border-r border-slate-200 dark:border-slate-800 p-4 flex flex-col justify-between h-full overflow-hidden select-none">
      <div className="space-y-5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
        {/* + New Upload Elevated Button */}
        <div>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
            multiple
          />
          <button
            onClick={() => {
              if (onOpenUploadModal) {
                onOpenUploadModal();
              } else {
                fileInputRef.current?.click();
              }
            }}
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
            const isActive = activeTab === item.id && !activeAlbumId;
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (activeAlbumId && onSelectAlbum) onSelectAlbum(null);
                  onSelectTab(item.id);
                }}
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
                  <span
                    className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-full ${
                      item.isDanger
                        ? "bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400"
                        : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Custom Folders Section */}
        <div className="space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between px-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Folders
            </span>
            {(onOpenCreateFolder || onOpenCreateAlbum) && (
              <button
                type="button"
                onClick={onOpenCreateFolder || onOpenCreateAlbum}
                className="p-1 rounded-md text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                title="Create New Folder"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="space-y-1">
            {((folders && folders.length > 0) ? folders : albums).length === 0 ? (
              <button
                type="button"
                onClick={onOpenCreateFolder || onOpenCreateAlbum}
                className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-blue-500 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 transition-colors flex items-center gap-2 border border-dashed border-slate-200 dark:border-slate-800"
              >
                <Plus className="w-3.5 h-3.5 text-blue-500" />
                <span>Create a folder</span>
              </button>
            ) : (
              ((folders && folders.length > 0) ? folders : albums).map((folder) => {
                const isFolderActive = (activeFolderId || activeAlbumId) === folder.id;
                const count = folder.fileIds ? folder.fileIds.length : 0;
                const colorClass =
                  folder.color === "indigo"
                    ? "text-indigo-500 fill-indigo-500/20"
                    : folder.color === "emerald"
                    ? "text-emerald-500 fill-emerald-500/20"
                    : folder.color === "amber"
                    ? "text-amber-500 fill-amber-500/20"
                    : folder.color === "rose"
                    ? "text-rose-500 fill-rose-500/20"
                    : folder.color === "purple"
                    ? "text-purple-500 fill-purple-500/20"
                    : "text-[#1a73e8] fill-[#1a73e8]/20";

                const handleFolderClick = () => {
                  const selectFn = onSelectFolder || onSelectAlbum;
                  if (selectFn) selectFn(isFolderActive ? null : folder.id);
                };

                return (
                  <div
                    key={folder.id}
                    onClick={handleFolderClick}
                    className={`group w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer select-none ${
                      isFolderActive
                        ? "bg-[#eaedff] text-[#005bbf] dark:bg-blue-950 dark:text-blue-300 font-semibold shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate flex-1 min-w-0">
                      <Folder className={`w-3.5 h-3.5 shrink-0 ${colorClass}`} />
                      <span className="truncate">{folder.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {onDeleteFolder && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id, folder.name);
                          }}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 opacity-0 group-hover:opacity-100 transition-opacity"
                          title={`Delete folder "${folder.name}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500 shrink-0">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
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
          <span
            className={`text-[11px] font-semibold ${
              usedPercentage > 90
                ? "text-rose-600 dark:text-rose-400"
                : usedPercentage > 75
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formattedPercent} {isUnlimited ? "alloc" : "used"}
          </span>
        </div>

        <div>
          <div className="flex justify-between items-baseline mb-1.5">
            <span className="text-base font-bold text-slate-900 dark:text-white">
              {formattedUsed}
            </span>
            <span className="text-xs text-slate-500">
              {isUnlimited ? "of Unlimited VPC" : `of ${formattedTotal}`}
            </span>
          </div>

          {/* Real-time Visual Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden flex">
            <div
              className={`h-full rounded-full transition-all duration-500 ease-out ${progressBarColor}`}
              style={{ width: `${visualPercentage}%` }}
            />
          </div>
        </div>

        {/* Collapsible Storage Breakdown Toggle */}
        <div className="pt-0.5">
          <button
            type="button"
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="w-full text-[11px] font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-between py-1 transition-colors"
          >
            <span className="flex items-center gap-1">
              <HardDrive className="w-3 h-3" />
              <span>Storage Details</span>
            </span>
            {showBreakdown ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showBreakdown && (
            <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-700/60 space-y-1.5 text-xs animate-in fade-in duration-200">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ImageIcon className="w-3 h-3 text-blue-500" />
                  <span>Images</span>
                </span>
                <span className="font-mono text-[11px] font-medium">
                  {breakdown.formattedImages}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <VideoIcon className="w-3 h-3 text-purple-500" />
                  <span>Videos</span>
                </span>
                <span className="font-mono text-[11px] font-medium">
                  {breakdown.formattedVideos}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <FileText className="w-3 h-3 text-amber-500" />
                  <span>Documents</span>
                </span>
                <span className="font-mono text-[11px] font-medium">
                  {breakdown.formattedDocuments}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-400 dark:text-slate-500 pt-1 border-t border-dashed border-slate-200 dark:border-slate-700/50">
                <span className="text-[10px]">Free Space</span>
                <span className="font-mono text-[10px]">
                  {formatStorageBytes(Math.max(0, totalLimitBytes - usedBytes))}
                </span>
              </div>
            </div>
          )}
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
          <Link
            to="/profile"
            className="w-full pt-1 text-xs font-semibold text-[#1a73e8] hover:text-[#1557bf] flex items-center justify-center gap-1 transition-colors hover:underline"
          >
            <span>
              Pro Cloud ({totalGB >= 1024 ? `${(totalGB / 1024).toFixed(0)} TB` : `${totalGB} GB`} Active)
            </span>
            <ArrowRight className="w-3 h-3" />
          </Link>
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
