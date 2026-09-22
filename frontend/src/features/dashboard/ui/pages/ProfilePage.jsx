import React, { useState } from "react";
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
} from "lucide-react";
import useAuth from "../../../auth/hooks/useAuth.jsx";
import { setToast } from "../../../../shared/state/uiSlice.jsx";
import { useDispatch } from "react-redux";
import { PLANS, getPlanDetails } from "../../../../shared/config/plans.jsx";
import useTheme from "../../../../shared/hooks/useTheme.jsx";

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
  const { theme, isDark, changeTheme, toggleTheme } = useTheme();

  const [activeTab, setActiveTab] = useState("general");
  const [formData, setFormData] = useState({
    fullName: user?.name || "Alex Gope",
    email: user?.email || "alex.gope@omnidrive.ai",
    title: user?.role || "Lead Cloud Architect",
    organization: "Acme Engineering & Cloud Platforms",
    timezone: "America/New_York (EST, UTC-5)",
    language: "English (United States)",
    dateFormat: "YYYY-MM-DD (ISO)",
    theme: "Dark",
  });

  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleSave = (e) => {
    e.preventDefault();
    dispatch(setToast({ type: "success", message: "Profile settings saved successfully!" }));
  };

  const handleRevokeSessions = () => {
    dispatch(setToast({ type: "info", message: "All other active sessions have been revoked." }));
  };

  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    if (!passwordState.newPassword) {
      dispatch(setToast({ type: "error", message: "Please enter a new password." }));
      return;
    }
    if (passwordState.newPassword !== passwordState.confirmPassword) {
      dispatch(setToast({ type: "error", message: "New passwords do not match." }));
      return;
    }
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
                  {planDetails.isUnlimitedStorage
                    ? "Unlimited VPC Storage"
                    : `${planDetails.storageTotalGB} GB Storage Tier`}
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
              onClick={handleSave}
              className="px-6 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
            >
              Save Changes
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

                {/* 3 Tier Switcher Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        <span className="block text-center py-2 px-3 rounded-xl bg-[#1a73e8] text-white text-xs font-bold shadow-xs">
                          Active Plan
                        </span>
                      ) : (
                        <button
                          onClick={() => handleUpdatePlan("pro")}
                          className="w-full py-2 px-3 rounded-xl bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-xs transition-all"
                        >
                          Switch to Pro Cloud
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Enterprise Dedicated VPC */}
                  <div
                    className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                      plan === "enterprise"
                        ? "border-purple-500 bg-purple-50/40 dark:bg-purple-950/20 ring-2 ring-purple-500/20"
                        : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40"
                    }`}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Enterprise VPC</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300">
                          Custom Billing
                        </span>
                      </div>
                      <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 pt-1">
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Unlimited S3 (Customer VPC)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Customer BYOK KMS Keys</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                          <span>Zero Model Retention Endpoints</span>
                        </li>
                      </ul>
                      <div className="p-2 rounded-xl bg-purple-50/80 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/50 text-[10px] text-purple-700 dark:text-purple-300">
                        ⚡ <strong>Contact Required:</strong> Enterprise VPCs require dedicated AWS architecture consultation.
                      </div>
                    </div>

                    <div className="pt-4">
                      {plan === "enterprise" ? (
                        <div className="space-y-2">
                          <span className="block text-center py-2 px-3 rounded-xl bg-purple-700 text-white text-xs font-bold shadow-xs">
                            Active Dedicated VPC
                          </span>
                          <button
                            onClick={handleOpenEnterpriseContact}
                            className="w-full text-center text-[11px] font-semibold text-purple-600 dark:text-purple-400 hover:underline"
                          >
                            Contact Assigned Architect
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleOpenEnterpriseContact}
                          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#1a73e8] to-purple-600 hover:from-[#1557bf] hover:to-purple-700 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Contact Enterprise Sales</span>
                        </button>
                      )}
                    </div>
                  </div>
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
                    Password last changed 30 days ago. Manage your enterprise sign-in credentials.
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
                    className="px-5 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    Update Password
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
                    onClick={handleRevokeSessions}
                    className="text-xs font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 hover:underline"
                  >
                    Revoke All Other Sessions
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
                          Chrome on macOS Sonoma (Current Session)
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          IP: 198.51.100.24 • New York, United States
                        </span>
                      </div>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Active now</span>
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="font-semibold block text-slate-900 dark:text-white">
                          Chrome on Windows 11
                        </span>
                        <span className="text-slate-500 text-[11px]">
                          IP: 203.0.113.88 • Seattle, United States
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">Active 2 hours ago</span>
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
                    {planDetails.storageUsedPercentage}% {planDetails.isUnlimitedStorage ? "Provisioned" : "Consumed"}
                  </span>
                </div>

                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <span className="text-xl font-bold text-slate-900 dark:text-white">
                      {plan === "enterprise"
                        ? `${planDetails.storageUsedGB.toLocaleString()} GB (1.84 TB) consumed`
                        : `${planDetails.storageUsedGB} GB consumed`}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {planDetails.isUnlimitedStorage
                        ? "of Unlimited (Customer VPC S3)"
                        : `of ${planDetails.storageTotalGB.toLocaleString()} GB Quota`}
                    </span>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex">
                    <div
                      className="h-full bg-[#1a73e8]"
                      style={{
                        width: plan === "enterprise" ? "12%" : plan === "pro" ? "4.2%" : "5.5%",
                      }}
                      title="Videos"
                    />
                    <div
                      className="h-full bg-emerald-500"
                      style={{
                        width: plan === "enterprise" ? "4%" : plan === "pro" ? "1.2%" : "1.8%",
                      }}
                      title="Images"
                    />
                    <div
                      className="h-full bg-purple-500"
                      style={{
                        width: plan === "enterprise" ? "2%" : plan === "pro" ? "0.6%" : "0.7%",
                      }}
                      title="Documents"
                    />
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
                      {plan === "enterprise" ? "1.2 TB" : plan === "pro" ? "85.0 GB" : "850 MB"}
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
                      {plan === "enterprise" ? "420 GB" : plan === "pro" ? "28.0 GB" : "250 MB"}
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
                      {plan === "enterprise" ? "220 GB" : plan === "pro" ? "11.5 GB" : "100 MB"}
                    </span>
                    <span className="block text-[11px] text-slate-400 mt-0.5">
                      {plan === "enterprise" ? "Customer KMS Vector Store" : "Textract OCR & Claude 3"}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-wrap items-center gap-3">
                  {plan === "free" && (
                    <>
                      <button
                        onClick={() => handleUpdatePlan("pro")}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                      >
                        <span>Upgrade to Pro Cloud ($19/mo)</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleOpenEnterpriseContact}
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-xs font-semibold transition-all"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Contact Enterprise Sales (Contact First)</span>
                      </button>
                    </>
                  )}

                  {plan === "pro" && (
                    <button
                      onClick={handleOpenEnterpriseContact}
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-[#1a73e8] to-purple-600 hover:from-[#1557bf] hover:to-purple-700 text-white text-xs font-semibold shadow-md hover:shadow-lg transition-all"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Contact Enterprise Sales for Dedicated VPC</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}

                  {plan === "enterprise" && (
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800">
                        ⚡ Dedicated AWS VPC Active (vpc-0a89d71c89f2a4e1)
                      </span>
                      <button
                        onClick={handleOpenEnterpriseContact}
                        className="text-xs font-semibold text-[#1a73e8] hover:underline"
                      >
                        Contact Solutions Architect for Cluster Scaling
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Processing Quotas */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4 shadow-xs">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    AI Pipeline Inference Quotas ({planDetails.name})
                  </h3>
                  <span className="text-xs font-mono text-slate-500">
                    Max Docs: {planDetails.bedrockMonthlyDocs.toLocaleString()}/mo
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-white">
                        Amazon Bedrock (Claude 3 Haiku)
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {plan === "enterprise"
                          ? "Zero model retention dedicated VPC endpoint"
                          : plan === "pro"
                          ? "High-throughput provisioned channel for document synthesis"
                          : "Monthly token allowance for executive document synthesis"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-purple-600">
                      {planDetails.bedrockTokensUsed.toLocaleString()} / {planDetails.bedrockTokensTotal.toLocaleString()} Tokens ({Math.round((planDetails.bedrockTokensUsed / planDetails.bedrockTokensTotal) * 100)}%)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-white">
                        Amazon Rekognition Moderation Gate
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {plan === "enterprise"
                          ? "Custom confidence thresholds & real-time webhook quarantine"
                          : "Automated toxicity & explicit image scan checks"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-emerald-600">
                      {planDetails.rekognitionScansUsed.toLocaleString()} / {planDetails.rekognitionMonthlyScans.toLocaleString()} Scans ({Math.round((planDetails.rekognitionScansUsed / planDetails.rekognitionMonthlyScans) * 100)}%)
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block text-slate-900 dark:text-white">
                        AWS ECS Fargate ARM64 FFmpeg
                      </span>
                      <span className="text-slate-500 text-[11px]">
                        {planDetails.maxVideoQuality} • {plan === "enterprise" ? "Dedicated task cluster" : "Spot worker execution"}
                      </span>
                    </div>
                    <span className="font-mono font-bold text-blue-600">
                      {planDetails.fargateComputeUsedMins} / {planDetails.fargateComputeMonthlyMins} Transcode Mins ({Math.round((planDetails.fargateComputeUsedMins / planDetails.fargateComputeMonthlyMins) * 100)}%)
                    </span>
                  </div>
                </div>
              </div>
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
      </main>
    </div>
  );
};

export default ProfilePage;
