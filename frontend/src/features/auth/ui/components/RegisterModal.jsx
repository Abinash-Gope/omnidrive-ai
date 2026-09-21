import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Cloud, Lock, Mail, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Check } from "lucide-react";
import ModalWrapper from "../../../shared/ui/components/ModalWrapper.jsx";
import { openModal, closeModal } from "../../../shared/state/uiSlice.jsx";
import useAuth from "../../hooks/useAuth.jsx";

const RegisterModal = () => {
  const dispatch = useDispatch();
  const {
    activeModal,
    isLoading,
    error,
    registerForm,
    handleRegister,
    handleGoogleSSO,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [deploymentTier, setDeploymentTier] = useState("Dedicated AWS VPC");

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = registerForm;

  const isOpen = activeModal === "register";

  const handleClose = () => {
    dispatch(closeModal());
  };

  const handleSwitchToLogin = () => {
    dispatch(openModal("auth"));
  };

  const onFormSubmit = (data) => {
    handleRegister({ ...data, deploymentModel: deploymentTier });
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-[#d8e2ff] dark:bg-blue-950 text-[#005bbf] dark:text-blue-300 flex items-center justify-center mx-auto mb-3 shadow-xs">
          <Cloud className="w-6 h-6 fill-current" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
          Create your Enterprise Workspace
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          14-day enterprise trial • Zero credit card required
        </p>
      </div>

      {/* Google Workspace SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSSO}
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-sm font-semibold flex items-center justify-center gap-3 shadow-xs hover:shadow transition-all active:scale-95 mb-4"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
          />
        </svg>
        <span>Sign up with Google Workspace</span>
      </button>

      {/* Divider */}
      <div className="flex items-center my-4">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        <span className="px-3 text-[11px] uppercase tracking-wider text-slate-400 font-medium">
          or register with work email
        </span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3.5">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Full Name
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              {...register("fullName", { required: "Full Name is required" })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              placeholder="Alex Chen"
            />
          </div>
          {errors.fullName && (
            <p className="text-red-500 text-[11px] mt-1">{errors.fullName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Work Email
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              {...register("email", { required: "Work Email is required" })}
              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              placeholder="alex@company.com"
            />
          </div>
          {errors.email && (
            <p className="text-red-500 text-[11px] mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength meter */}
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
            <div className="flex gap-1 flex-1">
              <span className="h-1 flex-1 rounded-full bg-emerald-500" />
              <span className="h-1 flex-1 rounded-full bg-emerald-500" />
              <span className="h-1 flex-1 rounded-full bg-emerald-500" />
              <span className="h-1 flex-1 rounded-full bg-emerald-500" />
            </div>
            <span>Strong 4/4</span>
          </div>
        </div>

        {/* Deployment Model Pill Switcher */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Deployment Architecture
          </label>
          <div className="p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex gap-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setDeploymentTier("Dedicated AWS VPC")}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                deploymentTier === "Dedicated AWS VPC"
                  ? "bg-white dark:bg-slate-700 text-[#1a73e8] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {deploymentTier === "Dedicated AWS VPC" && <Check className="w-3.5 h-3.5" />}
              <span>Dedicated AWS VPC</span>
            </button>
            <button
              type="button"
              onClick={() => setDeploymentTier("Enterprise Cloud")}
              className={`flex-1 py-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                deploymentTier === "Enterprise Cloud"
                  ? "bg-white dark:bg-slate-700 text-[#1a73e8] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              {deploymentTier === "Enterprise Cloud" && <Check className="w-3.5 h-3.5" />}
              <span>Enterprise Cloud</span>
            </button>
          </div>
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-400 pt-1">
          <input
            type="checkbox"
            {...register("termsAccepted", { required: true })}
            className="w-4 h-4 rounded text-[#1a73e8] focus:ring-[#1a73e8] mt-0.5"
          />
          <span>I agree to the Enterprise Service Agreement & Data Security Policy</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full mt-2 py-3 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Security & Trust Footer */}
      <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-around gap-2 font-mono">
        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          AWS Cognito Verified
        </span>
        <span>•</span>
        <span className="flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-blue-500" />
          RSA-256 JWT
        </span>
        <span>•</span>
        <span>SOC2 Type II</span>
      </div>

      {/* Switch to Login */}
      <div className="mt-4 text-center text-xs text-slate-500">
        <span>Already have an account? </span>
        <button
          onClick={handleSwitchToLogin}
          className="font-semibold text-[#1a73e8] hover:underline"
        >
          Sign In
        </button>
      </div>
    </ModalWrapper>
  );
};

export default RegisterModal;
