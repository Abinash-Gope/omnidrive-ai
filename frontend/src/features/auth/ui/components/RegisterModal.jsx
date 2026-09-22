import React, { useState, useEffect, useMemo } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import { openModal, closeModal } from "../../../../shared/state/uiSlice.jsx";
import useAuth from "../../hooks/useAuth.jsx";

const getPasswordStrength = (pwd = "") => {
  if (!pwd || pwd.length === 0) {
    return {
      level: 0,
      label: "",
      colorClass: "bg-slate-200 dark:bg-slate-700",
      textClass: "text-slate-400 dark:text-slate-500",
    };
  }

  const hasLower = /[a-z]/.test(pwd);
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /\d/.test(pwd);
  const hasSpecial = /[^A-Za-z0-9]/.test(pwd);
  const varietyCount = [hasLower, hasUpper, hasNumber, hasSpecial].filter(Boolean).length;

  if (pwd.length < 6 || varietyCount <= 1) {
    return {
      level: 1,
      label: "Weak",
      colorClass: "bg-rose-500",
      textClass: "text-rose-600 dark:text-rose-400",
    };
  }

  if (pwd.length < 8 || varietyCount === 2) {
    return {
      level: 2,
      label: "Fair",
      colorClass: "bg-amber-500",
      textClass: "text-amber-600 dark:text-amber-400",
    };
  }

  if (pwd.length >= 8 && varietyCount >= 3) {
    return {
      level: 3,
      label: "Strong",
      colorClass: "bg-emerald-500",
      textClass: "text-emerald-600 dark:text-emerald-400",
    };
  }

  return {
    level: 2,
    label: "Fair",
    colorClass: "bg-amber-500",
    textClass: "text-amber-600 dark:text-amber-400",
  };
};

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
  const [localError, setLocalError] = useState(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = registerForm;

  const passwordValue = watch("password", "");
  const passwordStrength = useMemo(() => getPasswordStrength(passwordValue), [passwordValue]);

  const isOpen = activeModal === "register" && !isAuthenticated;

  useEffect(() => {
    if (!isOpen) {
      setLocalError(null);
    }
  }, [isOpen]);

  const handleClose = () => {
    setLocalError(null);
    dispatch(closeModal());
    if (window.location.pathname === "/login" || window.location.pathname === "/register") {
      navigate("/");
    }
  };

  const handleSwitchToLogin = () => {
    setLocalError(null);
    dispatch(openModal("auth"));
  };

  const onFormSubmit = async (data) => {
    setLocalError(null);
    try {
      await handleRegister(data);
    } catch (err) {
      setLocalError(err.message || "Registration failed. Please check your details.");
    }
  };

  const displayError = localError || error;

  return (
    <ModalWrapper
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="max-w-xl md:max-w-2xl"
      padding="p-5 sm:p-6 md:p-7"
    >
      {/* Ambient Top Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-24 bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="text-center mb-3 sm:mb-4 relative">
        <div className="inline-flex items-center justify-center gap-2 mb-1">
          <div className="p-1 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 shadow-xs">
            <OmniDriveLogo size="sm" animate={true} />
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create Workspace
          </h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          14-day trial • Zero credit card required
        </p>
      </div>

      {/* Google SSO Button */}
      <button
        type="button"
        onClick={handleGoogleSSO}
        disabled={isLoading}
        className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-100 text-xs sm:text-sm font-semibold flex items-center justify-center gap-2.5 shadow-xs hover:shadow transition-all active:scale-[0.99] group cursor-pointer"
      >
        <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-105" viewBox="0 0 24 24">
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
        <span>Sign up with Google</span>
      </button>

      {/* Divider */}
      <div className="flex items-center my-3">
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700/80" />
        <span className="px-3 text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-semibold select-none">
          or register with work email
        </span>
        <div className="flex-1 border-t border-slate-200 dark:border-slate-700/80" />
      </div>

      {displayError && (
        <div className="mb-3.5 p-3 rounded-xl bg-rose-500/10 dark:bg-rose-950/60 border border-rose-500/30 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-start gap-2.5 animate-fade-in shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium leading-relaxed">{displayError}</div>
        </div>
      )}

      {/* Registration Form */}
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-3">
        {/* Full Name & Work Email in 2 Columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                {...register("fullName", { required: "Full Name is required" })}
                className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="Alex Chen"
              />
            </div>
            {errors.fullName && (
              <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.fullName.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1">
              Work Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                {...register("email", { required: "Work Email is required" })}
                className="w-full pl-9 pr-3 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                placeholder="alex@company.com"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.email.message}</p>
            )}
          </div>
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200">
              Password
            </label>
            <div className="flex items-center gap-1.5 text-[11px] font-medium transition-colors">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((step) => (
                  <span
                    key={step}
                    className={`w-3.5 h-1 rounded-full transition-all duration-200 ${
                      step <= passwordStrength.level
                        ? passwordStrength.colorClass
                        : "bg-slate-200 dark:bg-slate-700"
                    }`}
                  />
                ))}
              </div>
              {passwordStrength.label && (
                <span className={passwordStrength.textClass}>{passwordStrength.label}</span>
              )}
            </div>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type={showPassword ? "text" : "password"}
              {...register("password", { required: "Password is required" })}
              className="w-full pl-9 pr-9 py-2 sm:py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 focus:bg-white dark:focus:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="At least 8 characters with numbers & symbols"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-500 text-[10px] mt-0.5 font-medium">{errors.password.message}</p>
          )}
        </div>

        {/* Terms Checkbox */}
        <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600 dark:text-slate-300 pt-0.5 select-none">
          <input
            type="checkbox"
            {...register("termsAccepted", { required: true })}
            className="w-3.5 h-3.5 rounded text-[#1a73e8] focus:ring-[#1a73e8] border-slate-300 dark:border-slate-600 dark:bg-slate-800 shrink-0 cursor-pointer"
          />
          <span className="leading-tight">
            I agree to the{" "}
            <span className="text-[#1a73e8] hover:underline font-medium">Terms of Service</span> &amp;{" "}
            <span className="text-[#1a73e8] hover:underline font-medium">Privacy Policy</span>
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#1a73e8] via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all active:scale-[0.99] disabled:opacity-60 cursor-pointer"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <span>Create Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        <span>Already have an account? </span>
        <button
          onClick={handleSwitchToLogin}
          className="font-semibold text-[#1a73e8] hover:text-blue-500 hover:underline transition-colors cursor-pointer"
        >
          Log In
        </button>
      </div>
    </ModalWrapper>
  );
};

export default RegisterModal;
