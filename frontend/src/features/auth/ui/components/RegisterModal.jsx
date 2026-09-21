import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Cloud, Lock, Mail, User, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";
import { openModal, closeModal } from "../../../../shared/state/uiSlice.jsx";
import useAuth from "../../hooks/useAuth.jsx";

const RegisterModal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const {
    isAuthenticated,
    activeModal,
    isLoading,
    error,
    registerForm,
    handleRegister,
    handleGoogleSSO,
  } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = registerForm;

  const isOpen = activeModal === "register" && !isAuthenticated;

  const handleClose = () => {
    dispatch(closeModal());
    if (window.location.pathname === "/login" || window.location.pathname === "/register") {
      navigate("/");
    }
  };

  const handleSwitchToLogin = () => {
    dispatch(openModal("auth"));
  };

  const onFormSubmit = (data) => {
    handleRegister(data);
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-md" padding="p-4 sm:p-5">
      {/* Brand Header */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl bg-[#d8e2ff] dark:bg-blue-950 text-[#005bbf] dark:text-blue-300 flex items-center justify-center shadow-xs">
            <Cloud className="w-4 h-4 fill-current" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Create Enterprise Workspace
          </h2>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          14-day enterprise trial • Zero credit card required
        </p>
      </div>

      {/* Google Workspace SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSSO}
        disabled={isLoading}
        className="w-full py-2 px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-xs hover:shadow transition-all active:scale-95 mb-2"
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
      <div className="flex items-center my-2">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
        <span className="px-2.5 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
          or register with work email
        </span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700" />
      </div>

      {error && (
        <div className="mb-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-2.5">
        {/* Full Name & Work Email in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
              Full Name
            </label>
            <div className="relative">
              <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                {...register("fullName", { required: "Full Name is required" })}
                className="w-full pl-9 pr-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                placeholder="Alex Chen"
              />
            </div>
            {errors.fullName && (
              <p className="text-red-500 text-[10px] mt-0.5">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-0.5">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                {...register("email", { required: "Work Email is required" })}
                className="w-full pl-9 pr-2.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
                placeholder="alex@company.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-[10px] mt-0.5">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300">
              Password
            </label>
            <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
              <div className="flex gap-0.5">
                <span className="w-3 h-1 rounded-full bg-emerald-500" />
                <span className="w-3 h-1 rounded-full bg-emerald-500" />
                <span className="w-3 h-1 rounded-full bg-emerald-500" />
                <span className="w-3 h-1 rounded-full bg-emerald-500" />
              </div>
              <span>Strong</span>
            </div>
          </div>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-[#1a73e8]"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-[10px] mt-0.5">{errors.password.message}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-start gap-2 cursor-pointer text-[11px] text-slate-600 dark:text-slate-400 pt-0.5">
          <input
            type="checkbox"
            {...register("termsAccepted", { required: true })}
            className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] mt-0.5 shrink-0"
          />
          <span>I agree to the Enterprise Service Agreement & Data Security Policy</span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1557bf] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all active:scale-95"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <span>Launch Workspace</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      </form>

      {/* Security & Trust Footer */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-around gap-1 font-mono">
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
      <div className="mt-2 text-center text-[11px] text-slate-500">
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
