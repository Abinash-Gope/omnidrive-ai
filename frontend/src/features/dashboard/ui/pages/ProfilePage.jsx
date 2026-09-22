import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import {
  Cloud,
  ArrowLeft,
  Camera,
  Check,
  ShieldCheck,
  Laptop,
  Smartphone,
  Sparkles,
  ArrowRight,
  Bell,
  LogOut,
  Lock,
  Server,
  Database,
  Cpu,
  Radio,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  HardDrive,
  Plus,
  X,
  Zap,
  Loader2,
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import { setToast } from "../../../../shared/state/uiSlice.jsx";
import { useDispatch, useSelector } from "react-redux";
import { PLANS, getPlanDetails } from "../../../../shared/config/plans.jsx";
import useTheme from "../../../../shared/hooks/useTheme.jsx";
import { setFiles } from "../../state/dashboardSlice.jsx";
import { getFilesApi } from "../../api/dashboardApi.jsx";
import ProfileSkeleton from "../components/ProfileSkeleton.jsx";

const ProfilePage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {
    user,
    plan,
    planDetails,
    handleLogout,
    handleUpdatePlan,
    handleOpenEnterpriseContact,
  } = useAuth();
  const { files = [] } = useSelector((state) => state.dashboard || {});
  const { theme, isDark, changeTheme, toggleTheme } = useTheme();

  // Fetch actual user files if not already loaded into Redux store
  useEffect(() => {
    if (!files || files.length === 0) {
      getFilesApi()
        .then((data) => {
          if (data && data.length > 0) {
            dispatch(setFiles(data));
          }
        })
        .catch(() => {});
    }
  }, []);

  // Compute real dynamic storage usage from user uploaded files
  const getFileBytes = (file) => {
    if (typeof file.sizeBytes === "number" && file.sizeBytes > 0) return file.sizeBytes;
    if (typeof file.fileSize === "number" && file.fileSize > 0) return file.fileSize;
    if (typeof file.rawSizeBytes === "number" && file.rawSizeBytes > 0) return file.rawSizeBytes;
    if (typeof file.size === "string") {
      const match = file.size.match(/([\d.]+)\s*(MB|KB|GB|B)/i);
      if (match) {
        const val = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        if (unit === "GB") return val * 1024 * 1024 * 1024;
        if (unit === "MB") return val * 1024 * 1024;
        if (unit === "KB") return val * 1024;
        return val;
      }
    }
    return 0;
  };

  const videoBytes = (files || [])
    .filter((f) => f.type === "video")
    .reduce((acc, f) => acc + getFileBytes(f), 0);
  const imageBytes = (files || [])
    .filter((f) => f.type === "image")
    .reduce((acc, f) => acc + getFileBytes(f), 0);
  const docBytes = (files || [])
    .filter((f) => f.type === "pdf" || f.type === "document" || f.type === "other")
    .reduce((acc, f) => acc + getFileBytes(f), 0);
  const totalUsedBytes = videoBytes + imageBytes + docBytes;

  // Pro Cloud Add-ons & Quota Expansion State
  const [proAddons, setProAddons] = useState(() => {
    try {
      const saved = localStorage.getItem("omni_pro_addons");
      return saved
        ? JSON.parse(saved)
        : {
            extraStorageGB: 0,
            extraBedrockTokens: 0,
            extraRekognitionScans: 0,
            extraFargateMins: 0,
            activePacks: [],
          };
    } catch {
      return {
        extraStorageGB: 0,
        extraBedrockTokens: 0,
        extraRekognitionScans: 0,
        extraFargateMins: 0,
        activePacks: [],
      };
    }
  });

  const [addonModal, setAddonModal] = useState({ isOpen: false, tab: "all" });

  const saveProAddons = (newAddons) => {
    setProAddons(newAddons);
    try {
      localStorage.setItem("omni_pro_addons", JSON.stringify(newAddons));
    } catch {}
  };

  const availableStoragePacks = [
    {
      id: "storage_1tb",
      name: "+1 TB High-Speed S3",
      category: "storage",
      extraGB: 1024,
      price: "$10/mo",
      description: "Direct AWS S3 multi-region bucket expansion with sub-50ms regional egress.",
      tag: "Popular",
    },
    {
      id: "storage_2tb",
      name: "+2 TB High-Speed S3",
      category: "storage",
      extraGB: 2048,
      price: "$18/mo",
      description: "Doubles workspace capacity to 4 TB with dedicated S3 cross-region replication.",
      tag: "Best Value",
    },
    {
      id: "storage_4tb",
      name: "+4 TB High-Speed S3",
      category: "storage",
      extraGB: 4096,
      price: "$32/mo",
      description: "Massive 6 TB storage vault for multi-camera 4K video production teams.",
      tag: "Studio",
    },
  ];

  const availableAiPacks = [
    {
      id: "ai_tokens_500k",
      name: "+500K Bedrock AI Tokens",
      category: "ai",
      extraTokens: 500000,
      extraDocs: 2500,
      price: "$12/mo",
      description: "High-throughput neural token allowance for document OCR and executive synthesis.",
      tag: "AI Starter",
    },
    {
      id: "ai_scans_5k",
      name: "+5,000 Rekognition Scans",
      category: "ai",
      extraScans: 5000,
      price: "$8/mo",
      description: "Automated content moderation, explicit frame detection & visual metadata.",
      tag: "Moderation",
    },
    {
      id: "ai_fargate_120m",
      name: "+120 Mins Fargate Transcode",
      category: "ai",
      extraFargate: 120,
      price: "$10/mo",
      description: "Dedicated ARM64 Graviton3 compute minutes for 4K & 1080p HLS rendering.",
      tag: "Compute",
    },
    {
      id: "ai_mega_booster",
      name: "Pro AI Mega Booster",
      category: "ai",
      extraTokens: 1000000,
      extraDocs: 5000,
      extraScans: 10000,
      extraFargate: 240,
      price: "$24/mo",
      description: "Full-pipeline 2x capacity: 1M Tokens, 10K Vision Scans & 240 Transcode Mins.",
      tag: "Recommended",
    },
  ];

  const handleTogglePack = (pack) => {
    const isCurrentlyActive = proAddons.activePacks.includes(pack.id);
    let newPacks = [];
    let newStorage = proAddons.extraStorageGB;
    let newTokens = proAddons.extraBedrockTokens;
    let newScans = proAddons.extraRekognitionScans;
    let newFargate = proAddons.extraFargateMins;

    if (isCurrentlyActive) {
      newPacks = proAddons.activePacks.filter((p) => p !== pack.id);
      if (pack.extraGB) newStorage = Math.max(0, newStorage - pack.extraGB);
      if (pack.extraTokens) newTokens = Math.max(0, newTokens - pack.extraTokens);
      if (pack.extraScans) newScans = Math.max(0, newScans - pack.extraScans);
      if (pack.extraFargate) newFargate = Math.max(0, newFargate - pack.extraFargate);
      dispatch(setToast({ type: "info", message: `Removed ${pack.name} from your subscription.` }));
    } else {
      newPacks = [...proAddons.activePacks, pack.id];
      if (pack.extraGB) newStorage += pack.extraGB;
      if (pack.extraTokens) newTokens += pack.extraTokens;
      if (pack.extraScans) newScans += pack.extraScans;
      if (pack.extraFargate) newFargate += pack.extraFargate;
      dispatch(setToast({ type: "success", message: `Activated ${pack.name}! Quotas updated instantly.` }));
    }

    saveProAddons({
      extraStorageGB: newStorage,
      extraBedrockTokens: newTokens,
      extraRekognitionScans: newScans,
      extraFargateMins: newFargate,
      activePacks: newPacks,
    });
  };

  // Quotas calculations incorporating active Pro Add-ons
  const effectiveExtraStorageGB = plan === "pro" ? (proAddons.extraStorageGB || 0) : 0;
  const effectiveExtraTokens = plan === "pro" ? (proAddons.extraBedrockTokens || 0) : 0;
  const effectiveExtraScans = plan === "pro" ? (proAddons.extraRekognitionScans || 0) : 0;
  const effectiveExtraFargate = plan === "pro" ? (proAddons.extraFargateMins || 0) : 0;

  const totalQuotaGB = (planDetails?.storageTotalGB || 15.0) + effectiveExtraStorageGB;
  const totalQuotaBytes = totalQuotaGB * 1024 * 1024 * 1024;

  const formattedQuota = planDetails?.isUnlimitedStorage
    ? "Unlimited (Customer VPC S3)"
    : totalQuotaGB >= 1024
    ? `${(totalQuotaGB / 1024).toFixed(0)} TB`
    : `${totalQuotaGB} GB`;

  const tierBadgeStorage = planDetails?.isUnlimitedStorage
    ? "Unlimited VPC Storage"
    : totalQuotaGB >= 1024
    ? `${(totalQuotaGB / 1024).toFixed(0)} TB Storage Tier`
    : `${totalQuotaGB} GB Storage Tier`;

  const effectiveTokensTotal = (planDetails?.bedrockTokensTotal || 50000) + effectiveExtraTokens;
  const effectiveScansTotal = (planDetails?.rekognitionMonthlyScans || 500) + effectiveExtraScans;
  const effectiveFargateTotal = (planDetails?.fargateComputeMonthlyMins || 30) + effectiveExtraFargate;
  const effectiveMonthlyDocs = (planDetails?.bedrockMonthlyDocs || 50) + (effectiveExtraTokens > 0 ? Math.round(effectiveExtraTokens / 200) : 0);

  const formatSize = (bytes) => {
    if (!bytes || bytes <= 0) return "0 MB";
    if (bytes >= 1024 * 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
    }
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    if (bytes >= 1024 * 1024) {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / 1024).toFixed(0)} KB`;
  };

  const videoPercentage = totalQuotaBytes > 0 && videoBytes > 0
    ? Math.max(0.5, ((videoBytes / totalQuotaBytes) * 100)).toFixed(2)
    : 0;
  const imagePercentage = totalQuotaBytes > 0 && imageBytes > 0
    ? Math.max(0.5, ((imageBytes / totalQuotaBytes) * 100)).toFixed(2)
    : 0;
  const docPercentage = totalQuotaBytes > 0 && docBytes > 0
    ? Math.max(0.5, ((docBytes / totalQuotaBytes) * 100)).toFixed(2)
    : 0;

  const totalUsedPercentage = totalQuotaBytes > 0 && totalUsedBytes > 0
    ? Math.min(100, Math.round((totalUsedBytes / totalQuotaBytes) * 100))
    : 0;

  const totalUsedDisplay = totalUsedBytes > 0
    ? totalUsedBytes >= 1024 * 1024 * 1024 * 1024
      ? `${(totalUsedBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB consumed`
      : totalUsedBytes >= 1024 * 1024 * 1024
      ? `${(totalUsedBytes / (1024 * 1024 * 1024)).toFixed(2)} GB consumed`
      : `${(totalUsedBytes / (1024 * 1024)).toFixed(1)} MB consumed`
    : "0 GB consumed";

  // Dynamic user client detection
  const getClientSession = () => {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    let browser = "Chrome";
    if (ua.includes("Firefox/")) browser = "Firefox";
    else if (ua.includes("Edg/")) browser = "Edge";
    else if (ua.includes("Safari/") && !ua.includes("Chrome/")) browser = "Safari";

    let os = "Windows";
    if (ua.includes("Mac OS") || ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("Linux")) os = "Linux";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";

    return `${browser} on ${os}`;
  };

  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    fullName: user?.name || "Abinash Gope",
    email: user?.email || "abinash.gope@omnidrive.ai",
    title: user?.role || "Developer",
    organization: "OmniDrive AI Workspace",
    timezone: (typeof Intl !== "undefined" && Intl.DateTimeFormat().resolvedOptions().timeZone) || "America/New_York (EST, UTC-5)",
    language: "English (United States)",
    dateFormat: "YYYY-MM-DD (ISO)",
    theme: "Dark",
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [isPageLoading, setIsPageLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsPageLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 550));
    setIsSaving(false);
    dispatch(setToast({ type: "success", message: "Profile settings saved successfully!" }));
  };

  const handleRevokeSessions = async () => {
    setIsRevoking(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsRevoking(false);
    dispatch(setToast({ type: "info", message: "All other active sessions have been revoked." }));
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (!passwordState.newPassword) {
      dispatch(setToast({ type: "error", message: "Please enter a new password." }));
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      dispatch(setToast({ type: "error", message: "New passwords do not match." }));
      return;
    }
    setIsUpdatingPassword(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsUpdatingPassword(false);
    dispatch(setToast({ type: "success", message: "Password updated successfully!" }));
    setPasswordState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  };

  const tabs = [
    { id: "general", label: "General Profile" },
    { id: "security", label: "Security & MFA" },
    { id: "quotas", label: "Storage & AI Quotas" },
    { id: "aws", label: "Connected AWS Services" },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafd] dark:bg-[#060b19] flex flex-col font-sans transition-colors text-slate-900 dark:text-slate-100">
      {/* Top Fixed Header */}
      <header className="h-16 px-4 sm:px-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] sticky top-0 z-30">
        {/* Left: Brand & Return Navigation */}
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="flex items-center gap-2.5">
            <OmniDriveLogo size="sm" animate={true} />
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white">
                OmniDrive<span className="text-[#1a73e8]">AI</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] border border-blue-200 dark:border-blue-800">
                DASHBOARD
              </span>
            </div>
          </Link>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <Link
            to="/dashboard"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#1a73e8] dark:hover:text-[#1a73e8] flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to My Files</span>
          </Link>
        </div>

        {/* Right: Notification & Actions */}
        <div className="flex items-center gap-3">
          {/* Quick Theme Toggle */}
          <button
            onClick={() => {
              const next = toggleTheme();
              dispatch(setToast({ type: "info", message: `Theme switched to ${next} mode.` }));
            }}
            title={isDark ? "Switch to Light mode" : "Switch to Dark mode"}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

          <button
            title="Notifications"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#1a73e8]" />
          </button>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>

          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#1a73e8] to-indigo-600 text-white font-bold flex items-center justify-center text-sm ring-2 ring-[#1a73e8]">
            {user?.avatar || "AG"}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto w-full p-6 sm:p-8 space-y-6">
        {isPageLoading ? (
          <ProfileSkeleton />
        ) : (
          <>
            {/* User Identity Hero Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Avatar with Camera Overlay */}
            <div className="relative group">
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-[#1a73e8] to-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-md">
                {user?.avatar || "AG"}
              </div>
              <button
                className="absolute bottom-0 right-0 p-1.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shadow-sm hover:text-[#1a73e8] transition-colors"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            {/* Identity Info */}
            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                {formData.fullName}
              </h1>
              <p className="text-sm text-slate-500 flex items-center gap-2">
                <span>{formData.title}</span>
                <span>•</span>
                <span className="font-mono text-xs">{formData.email}</span>
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${planDetails.badgeClass}`}>
                  {planDetails.badge}
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>
                    {plan === "enterprise"
                      ? "Customer BYOK KMS"
                      : plan === "pro"
                      ? "Priority Multi-Region"
                      : "AWS Free Tier"}
                  </span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {tierBadgeStorage}
                </span>
              </div>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => navigate("/dashboard")}
              className="px-5 py-2.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Discard
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-70 active:scale-95"
            >
              {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>{isSaving ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </div>

        {/* Horizontal Settings Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 dark:border-slate-800">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-[#1a73e8] text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Tab Views (Sized accurately per selected view) */}
        <div className="w-full">
          {/* TAB 1: General Profile */}
          {activeTab === "general" && (
            <div className="space-y-6">
              {/* Active Plan & Subscription Tier Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#1a73e8]" />
                      <h3 className="text-base font-bold text-slate-900 dark:text-white">
                        Active Cloud Subscription & Tier
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Your tier governs AWS S3 quotas, Fargate ARM64 transcoding resolutions, and Bedrock AI tokens.
                    </p>
                  </div>
                  <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-bold border ${planDetails.badgeClass}`}>
                    {planDetails.name} ({planDetails.badge})
                  </span>
                </div>

                {/* Tier Switcher Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Free Sandbox */}
                  <div
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      plan === "free"
                        ? "border-[#1a73e8] bg-blue-50/30 dark:bg-blue-950/20 ring-2 ring-[#1a73e8]/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Free Sandbox</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                          $0 / forever
                        </span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>15 GB S3 Cloud Storage</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>720p HLS Transcoding</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>50 Bedrock Docs/mo</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-5">
                      {plan === "free" ? (
                        <span className="block text-center py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold">
                          Active Plan
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpdatePlan("free")}
                          className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all"
                        >
                          Downgrade to Free
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pro Cloud */}
                  <div
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      plan === "pro"
                        ? "border-[#1a73e8] bg-blue-50/40 dark:bg-blue-950/20 ring-2 ring-[#1a73e8]/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Pro Cloud</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-[#1a73e8] dark:text-blue-300">
                          $19 / month
                        </span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>2 TB Dedicated S3 Multi-Region</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>1080p & 4K HLS Transcoding</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>2,500 Bedrock Docs/mo</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-5">
                      {plan === "pro" ? (
                        <div className="space-y-2">
                          <span className="block text-center py-2 px-3 rounded-xl bg-[#1a73e8] text-white text-xs font-bold shadow-xs">
                            Active Plan {effectiveExtraStorageGB > 0 ? `(${formattedQuota})` : ""}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("quotas");
                              setAddonModal({ isOpen: true, tab: "all" });
                            }}
                            className="w-full text-center text-[11px] font-semibold text-[#1a73e8] dark:text-blue-400 hover:underline flex items-center justify-center gap-1 cursor-pointer pt-1"
                          >
                            <Zap className="w-3.5 h-3.5 text-amber-500" />
                            <span>Upgrade Storage &amp; AI Quotas</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleUpdatePlan("pro")}
                          className="w-full py-2 px-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
                        >
                          Switch to Pro Cloud
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Active Enterprise status if user already on Enterprise */}
                  {plan === "enterprise" && (
                    <div className="p-5 rounded-2xl border border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-2 ring-purple-500/20 flex flex-col justify-between md:col-span-2">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">Enterprise VPC</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                            Dedicated
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          Your account is provisioned with Customer BYOK KMS Keys and dedicated VPC isolation.
                        </p>
                      </div>
                      <div className="pt-4">
                        <span className="block text-center py-2 px-3 rounded-xl bg-purple-700 text-white text-xs font-bold shadow-xs">
                          Active Dedicated VPC
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Personal Information Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Personal Information
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update your display name, corporate role, and organization identity.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Corporate Email
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        value={formData.email}
                        readOnly
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-sm text-slate-500 cursor-not-allowed"
                      />
                      <span className="absolute right-3 top-3 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" />
                        <span>SSO Verified</span>
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Organization / Workspace
                    </label>
                    <input
                      type="text"
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Preferred Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    >
                      <option>America/New_York (EST, UTC-5)</option>
                      <option>America/Los_Angeles (PST, UTC-8)</option>
                      <option>Europe/London (GMT, UTC+0)</option>
                      <option>Asia/Tokyo (JST, UTC+9)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Regional & Localization Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Regional & Localization
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Customize your regional language preferences and visual theme.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Language
                    </label>
                    <select
                      value={formData.language}
                      onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    >
                      <option>English (United States)</option>
                      <option>English (UK)</option>
                      <option>German</option>
                      <option>Japanese</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                      Date Format
                    </label>
                    <select
                      value={formData.dateFormat}
                      onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    >
                      <option>YYYY-MM-DD (ISO standard)</option>
                      <option>MM/DD/YYYY</option>
                      <option>DD/MM/YYYY</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Theme & Appearance Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sun className="w-4 h-4 text-amber-500 dark:hidden" />
                      <Moon className="w-4 h-4 text-blue-400 hidden dark:block" />
                      <span>Theme &amp; Appearance</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Select your preferred workspace theme or synchronize automatically with your device.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-blue-400 border border-blue-200/80 dark:border-blue-800 capitalize">
                    Active: {theme}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Light Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      changeTheme("light");
                      dispatch(setToast({ type: "info", message: "Theme switched to Light mode." }));
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      theme === "light"
                        ? "border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#1a73e8]/30 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-200/60 dark:border-amber-800/60">
                          <Sun className="w-5 h-5" />
                        </div>
                        {theme === "light" && (
                          <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Light Mode</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Crisp, bright daytime contrast
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Light</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 border border-slate-300" />
                    </div>
                  </button>

                  {/* Dark Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      changeTheme("dark");
                      dispatch(setToast({ type: "info", message: "Theme switched to Dark mode." }));
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      theme === "dark"
                        ? "border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#1a73e8]/30 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60">
                          <Moon className="w-5 h-5" />
                        </div>
                        {theme === "dark" && (
                          <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Dark Mode</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Sleek low-glare deep navy palette
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Dark</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-[#060b19] border border-slate-700" />
                    </div>
                  </button>

                  {/* System Mode Card */}
                  <button
                    type="button"
                    onClick={() => {
                      changeTheme("system");
                      dispatch(setToast({ type: "info", message: "Theme set to follow System OS preferences." }));
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                      theme === "system"
                        ? "border-[#1a73e8] bg-blue-50/50 dark:bg-blue-950/30 ring-2 ring-[#1a73e8]/30 shadow-xs"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200/60 dark:border-purple-800/60">
                          <Laptop className="w-5 h-5" />
                        </div>
                        {theme === "system" && (
                          <span className="w-5 h-5 rounded-full bg-[#1a73e8] text-white flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">System Default</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Automatically synchronizes with your device OS
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-semibold text-slate-400">
                      <span>Auto-Sync</span>
                      <span className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-amber-400 to-indigo-600" />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Security & MFA */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Password Management */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-5 shadow-xs">
                <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Password & Credentials
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Update and manage your account sign-in credentials.
                  </p>
                </div>

                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Current Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.currentPassword}
                        onChange={(e) =>
                          setPasswordState({ ...passwordState, currentPassword: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.newPassword}
                        onChange={(e) =>
                          setPasswordState({ ...passwordState, newPassword: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                        Confirm New Password
                      </label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={passwordState.confirmPassword}
                        onChange={(e) =>
                          setPasswordState({ ...passwordState, confirmPassword: e.target.value })
                        }
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="px-5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-70 active:scale-95"
                  >
                    {isUpdatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isUpdatingPassword ? "Updating Password..." : "Update Password"}</span>
                  </button>
                </form>
              </div>

              {/* Two-Factor Authentication */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Two-Factor Authentication (2FA)
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Enforce TOTP authenticator protection on all account logins.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    <span>Enabled</span>
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold block text-slate-900 dark:text-white">
                      Authenticator App (TOTP)
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      Google Authenticator / Authy / 1Password active
                    </span>
                  </div>
                  <button className="text-xs font-semibold text-[#1a73e8] hover:underline">
                    Reconfigure
                  </button>
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Active Sessions & Devices
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Devices currently authorized to access your OmniDrive AI workspace.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isRevoking}
                    onClick={handleRevokeSessions}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1.5 cursor-pointer disabled:opacity-70"
                  >
                    {isRevoking && <Loader2 className="w-3 h-3 animate-spin" />}
                    <span>{isRevoking ? "Revoking Sessions..." : "Revoke All Other Sessions"}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950 text-[#1a73e8]">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-white">
                          {getClientSession()} (Current Session)
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          Authorized via AWS Cognito JWT • Session Secure
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active now</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Storage & AI Quotas */}
          {activeTab === "quotas" && (
            <div className="space-y-6">
              {/* Storage Overview */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Cloud Storage Allocation ({planDetails.name})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Direct S3 serverless bucket usage across video, images, and documents.
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800">
                    {totalUsedPercentage}% {planDetails.isUnlimitedStorage ? "Provisioned" : "Consumed"}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {totalUsedDisplay}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {planDetails?.isUnlimitedStorage
                        ? "of Unlimited (Customer VPC S3)"
                        : `of ${formattedQuota} Quota`}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    {Number(videoPercentage) > 0 && (
                      <div
                        className="h-full bg-[#1a73e8]"
                        style={{ width: `${videoPercentage}%` }}
                        title={`Videos: ${formatSize(videoBytes)}`}
                      />
                    )}
                    {Number(imagePercentage) > 0 && (
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${imagePercentage}%` }}
                        title={`Images: ${formatSize(imageBytes)}`}
                      />
                    )}
                    {Number(docPercentage) > 0 && (
                      <div
                        className="h-full bg-purple-500"
                        style={{ width: `${docPercentage}%` }}
                        title={`Documents: ${formatSize(docBytes)}`}
                      />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8]" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Video Assets
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatSize(videoBytes)}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {planDetails.maxVideoQuality}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Image Assets
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatSize(imageBytes)}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {plan === "enterprise" ? "Zero-Retention Rekognition" : "Vision AI & Hardware EXIF"}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Document Data
                      </span>
                    </div>
                    <span className="text-lg font-bold text-slate-900 dark:text-white">
                      {formatSize(docBytes)}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {plan === "enterprise" ? "Customer KMS Vector Store" : "Neural OCR & Document AI"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {plan === "free" && (
                    <button
                      onClick={() => handleUpdatePlan("pro")}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <span>Upgrade to Pro Cloud ($19/mo)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {plan === "pro" && (
                    <div className="flex flex-wrap items-center gap-3 w-full">
                      <span className="text-xs font-bold text-[#1a73e8] px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Pro Cloud Active ({formattedQuota} S3)</span>
                      </span>
                      {effectiveExtraStorageGB > 0 && (
                        <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          +{effectiveExtraStorageGB >= 1024 ? `${(effectiveExtraStorageGB / 1024).toFixed(0)} TB` : `${effectiveExtraStorageGB} GB`} Storage Upgraded
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setAddonModal({ isOpen: true, tab: "storage" })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Buy More Storage</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdatePlan("free")}
                        className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:underline sm:ml-auto cursor-pointer"
                      >
                        Downgrade to Free Tier
                      </button>
                    </div>
                  )}

                  {plan === "enterprise" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                        ⚡ Dedicated AWS VPC Active (vpc-0a89d71c89f2a4e1)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Processing Quotas */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      AI Pipeline Inference Quotas ({planDetails.name})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Max Docs: {effectiveMonthlyDocs.toLocaleString()}/mo
                      {effectiveExtraTokens > 0 && (
                        <span className="ml-1 text-purple-600 dark:text-purple-400 font-medium">
                          (+{Math.round(effectiveExtraTokens / 200).toLocaleString()} boosted docs)
                        </span>
                      )}
                    </p>
                  </div>
                  {plan === "pro" && (
                    <button
                      type="button"
                      onClick={() => setAddonModal({ isOpen: true, tab: "ai" })}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs hover:shadow transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Buy More AI Quotas</span>
                    </button>
                  )}
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          OmniDrive Neural Engine (Document AI)
                        </span>
                        {effectiveExtraTokens > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                            +{effectiveExtraTokens >= 1000000 ? `${(effectiveExtraTokens / 1000000).toFixed(1)}M` : `${(effectiveExtraTokens / 1000).toFixed(0)}K`} Boosted
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {plan === "enterprise"
                          ? "Zero model retention dedicated VPC endpoint"
                          : plan === "pro"
                          ? "High-throughput provisioned channel for document synthesis"
                          : "Monthly token allowance for executive document synthesis"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-purple-600 whitespace-nowrap">
                      {planDetails.bedrockTokensUsed.toLocaleString()} / {effectiveTokensTotal.toLocaleString()} Tokens ({Math.round((planDetails.bedrockTokensUsed / effectiveTokensTotal) * 100)}%)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          Amazon Rekognition Moderation Gate
                        </span>
                        {effectiveExtraScans > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                            +{(effectiveExtraScans / 1000).toFixed(0)}K Boosted
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {plan === "enterprise"
                          ? "Custom confidence thresholds & real-time webhook quarantine"
                          : "Automated toxicity & explicit image scan checks"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600 whitespace-nowrap">
                      {planDetails.rekognitionScansUsed.toLocaleString()} / {effectiveScansTotal.toLocaleString()} Scans ({Math.round((planDetails.rekognitionScansUsed / effectiveScansTotal) * 100)}%)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-white">
                          AWS ECS Fargate ARM64 FFmpeg
                        </span>
                        {effectiveExtraFargate > 0 && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300">
                            +{effectiveExtraFargate}m Boosted
                          </span>
                        )}
                      </div>
                      <span className="text-slate-500 text-[11px] block mt-0.5">
                        {planDetails.maxVideoQuality} • {plan === "enterprise" ? "Dedicated task cluster" : "Spot worker execution"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-blue-600 whitespace-nowrap">
                      {planDetails.fargateComputeUsedMins} / {effectiveFargateTotal} Transcode Mins ({Math.round((planDetails.fargateComputeUsedMins / effectiveFargateTotal) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Pro Cloud Add-ons & Quota Upgrades Section */}
              {plan === "pro" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          Pro Quota Add-ons &amp; Capacity Upgrades
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Scale your cloud storage and AI token allowance on-demand. Upgrades apply immediately to your active workspace.
                      </p>
                    </div>
                    {proAddons.activePacks.length > 0 && (
                      <span className="self-start sm:self-auto text-xs font-semibold px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {proAddons.activePacks.length} Booster{proAddons.activePacks.length > 1 ? "s" : ""} Active
                      </span>
                    )}
                  </div>

                  {/* Storage Upgrades Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <HardDrive className="w-4 h-4 text-[#1a73e8]" />
                        <span>High-Speed AWS S3 Storage Expansion</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Active: +{effectiveExtraStorageGB >= 1024 ? `${(effectiveExtraStorageGB / 1024).toFixed(0)} TB` : `${effectiveExtraStorageGB} GB`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {availableStoragePacks.map((pack) => {
                        const isActive = proAddons.activePacks.includes(pack.id);
                        return (
                          <div
                            key={pack.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isActive
                                ? "bg-blue-50/60 dark:bg-blue-950/30 border-[#1a73e8] dark:border-blue-700 ring-1 ring-[#1a73e8]"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {pack.name}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#1a73e8]/10 text-[#1a73e8] dark:bg-blue-900/60 dark:text-blue-300">
                                  {pack.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {pack.description}
                              </p>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {pack.price}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePack(pack)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                                  isActive
                                    ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                    : "bg-[#1a73e8] hover:bg-[#1557bf] text-white shadow-xs"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Add Pack</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Pipeline Upgrades Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-purple-600" />
                        <span>AI Inference &amp; Compute Boosters</span>
                      </span>
                      <span className="text-xs text-slate-400">
                        Neural AI • Vision AI • Cloud Transcoding
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {availableAiPacks.map((pack) => {
                        const isActive = proAddons.activePacks.includes(pack.id);
                        return (
                          <div
                            key={pack.id}
                            className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                              isActive
                                ? "bg-purple-50/60 dark:bg-purple-950/30 border-purple-600 dark:border-purple-700 ring-1 ring-purple-600"
                                : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-900 dark:text-white">
                                  {pack.name}
                                </span>
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-300">
                                  {pack.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                                {pack.description}
                              </p>
                            </div>

                            <div className="pt-4 mt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between">
                              <span className="text-sm font-bold text-slate-900 dark:text-white">
                                {pack.price}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleTogglePack(pack)}
                                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-95 flex items-center gap-1 cursor-pointer ${
                                  isActive
                                    ? "bg-purple-700 hover:bg-purple-800 text-white shadow-xs"
                                    : "bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                                }`}
                              >
                                {isActive ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Active</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Add Pack</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Connected AWS Services */}
          {activeTab === "aws" && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                      Connected AWS Infrastructure ({planDetails.name})
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {planDetails.infraDesc}
                    </p>
                  </div>
                  <span className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-semibold text-xs border border-emerald-200 dark:border-emerald-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{plan === "enterprise" ? "Dedicated VPC Healthy" : "All Services Operational"}</span>
                  </span>
                </div>

                {/* Plan Architecture Grid */}
                {plan === "enterprise" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-purple-600" />
                        <span>Dedicated S3 Customer Bucket</span>
                      </span>
                      <span className="font-mono text-[11px] text-purple-700 dark:text-purple-300 block truncate">
                        s3://customer-vpc-omnidrive-production
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        Isolated in vpc-0a89d71c89f2a4e1 • Zero Public Ingress
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span>Customer Managed KMS Key (BYOK)</span>
                      </span>
                      <span className="font-mono text-[11px] text-purple-700 dark:text-purple-300 block truncate">
                        arn:aws:kms:us-east-1:590183749102:key/omnidrive-byok
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        Customer Root of Trust • HSM FIPS 140-3 Validated
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-purple-600" />
                        <span>Dedicated ECS Fargate Cluster</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 block">
                        Cluster: omnidrive-enterprise-arm64-cluster
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        AWS Graviton3 Private Subnet • Custom FFmpeg Presets
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-amber-500" />
                        <span>Bedrock PrivateLink (Zero-Retention)</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-600 dark:text-slate-300 block">
                        VPCE: vpce-0f81742a991bce04 (PrivateLink)
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        Zero Customer Data Retention • HIPAA / SOC2 BAA Active
                      </span>
                    </div>
                  </div>
                ) : plan === "pro" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-[#1a73e8]" />
                        <span>Primary S3 Multi-Region Storage</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block truncate">
                        s3://omnidrive-pro-media-us-east-1
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        Cross-Region Replication • High-Throughput Egress
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-rose-500" />
                        <span>S3 Quarantine Vault (Pro)</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block truncate">
                        s3://omnidrive-quarantine-pro-us-east-1
                      </span>
                      <span className="text-[10px] text-rose-600 font-medium block">
                        Automated Rekognition Gate • Webhook Alerts
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-purple-500" />
                        <span>Priority ECS Fargate ARM64 Worker</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block">
                        Task: omnidrive-ffmpeg-priority-transcoder
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        AWS Graviton3 • 1080p & 4K HLS Fast Lane
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-amber-500" />
                        <span>DynamoDB State Index (Global)</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block">
                        Table: OmniDrive-FileMetadata-Pro
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Multi-AZ Global Tables • Sub-millisecond latency
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cloud className="w-4 h-4 text-[#1a73e8]" />
                        <span>Primary S3 Sandbox Storage</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block truncate">
                        s3://omnidrive-shared-sandbox-us-east-1
                      </span>
                      <span className="text-[10px] text-emerald-600 font-medium block">
                        AWS Free Tier S3 • TLS 1.3 Presigned PUT
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-rose-500" />
                        <span>S3 Quarantine Vault</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block truncate">
                        s3://omnidrive-quarantine-shared-us-east-1
                      </span>
                      <span className="text-[10px] text-rose-600 font-medium block">
                        Isolated Private Vault • Rekognition Gate
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Cpu className="w-4 h-4 text-purple-500" />
                        <span>ECS Fargate ARM64 Worker</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block">
                        Task Definition: omnidrive-ffmpeg-transcoder
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        AWS Graviton3 • Shared Spot Worker (720p Max)
                      </span>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 space-y-1">
                      <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Database className="w-4 h-4 text-amber-500" />
                        <span>DynamoDB State Index</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 block">
                        Table: OmniDrive-FileMetadata-Shared
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        Single-Table • Sub-millisecond latency
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
          </>
        )}

        {/* Pro Add-ons & Quota Upgrade Modal */}
        {addonModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-[#0f172a] border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl relative space-y-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span>Pro Cloud Capacity Boosters</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Add high-speed AWS S3 storage and AI compute tokens to your active subscription.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddonModal({ isOpen: false, tab: "all" })}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                {[
                  { id: "all", label: "All Upgrades" },
                  { id: "storage", label: "AWS Storage (+TB)" },
                  { id: "ai", label: "AI Quotas & Tokens" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setAddonModal((prev) => ({ ...prev, tab: tab.id }))}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
                      addonModal.tab === tab.id
                        ? "bg-[#1a73e8] text-white"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Pack List */}
              <div className="space-y-3">
                {[
                  ...(addonModal.tab === "all" || addonModal.tab === "storage" ? availableStoragePacks : []),
                  ...(addonModal.tab === "all" || addonModal.tab === "ai" ? availableAiPacks : []),
                ].map((pack) => {
                  const isActive = proAddons.activePacks.includes(pack.id);
                  return (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        isActive
                          ? "bg-blue-50/60 dark:bg-blue-950/30 border-[#1a73e8] dark:border-blue-700"
                          : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">
                            {pack.name}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {pack.tag}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {pack.description}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {pack.price}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleTogglePack(pack)}
                          className={`px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                            isActive
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                              : "bg-[#1a73e8] hover:bg-[#1557bf] text-white shadow-xs"
                          }`}
                        >
                          {isActive ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" />
                              <span>Buy Upgrade</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer Summary */}
              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <span className="text-slate-500">
                  Active boosters are automatically added to your cloud workspace quotas.
                </span>
                <button
                  type="button"
                  onClick={() => setAddonModal({ isOpen: false, tab: "all" })}
                  className="px-5 py-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default ProfilePage;
