import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, ArrowRight, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
import ModalWrapper from "../../../../shared/ui/components/ModalWrapper.jsx";
import { closeModal, openModal, setToast } from "../../../../shared/state/uiSlice.jsx";
import { confirmSignUpApi, resendConfirmationCodeApi } from "../../api/authApi.jsx";
import { clearPendingVerification } from "../../state/authSlice.jsx";
import useAuth from "../../hooks/useAuth.jsx";

const VerificationModal = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { activeModal } = useSelector((state) => state.ui || {});
  const { pendingVerification } = useSelector((state) => state.auth || {});
  const { loginWithEmail } = useAuth();

  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(30);
  const [error, setError] = useState(null);

  const isOpen = activeModal === "verification";
  const email = pendingVerification?.email || "";
  const password = pendingVerification?.password || "";
  const fullName = pendingVerification?.fullName || "";

  // Cooldown countdown timer for code resend
  useEffect(() => {
    let timer;
    if (isOpen && cooldown > 0) {
      timer = setInterval(() => setCooldown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isOpen, cooldown]);

  const handleClose = () => {
    dispatch(closeModal());
    dispatch(clearPendingVerification());
  };

  const handleSwitchToLogin = () => {
    dispatch(openModal("auth"));
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    if (!code || code.trim().length < 4) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Confirm signup in AWS Cognito
      await confirmSignUpApi({ email, code: code.trim() });

      dispatch(
        setToast({
          type: "success",
          message: "Email verified successfully! Setting up your workspace...",
        })
      );

      // 2. Auto-authenticate if password was saved during signup
      if (email && password) {
        try {
          await loginWithEmail(email, password);
          dispatch(closeModal());
          dispatch(clearPendingVerification());
          navigate("/dashboard");
          return;
        } catch {
          // If auto-login fails, switch to login modal
          dispatch(openModal("auth"));
        }
      } else {
        dispatch(openModal("auth"));
      }
    } catch (err) {
      setError(err.message || "Invalid or expired verification code. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    setIsResending(true);
    setError(null);

    try {
      await resendConfirmationCodeApi(email);
      setCooldown(45);
      dispatch(
        setToast({
          type: "info",
          message: `New verification code dispatched to ${email}`,
        })
      );
    } catch (err) {
      setError(err.message || "Failed to resend confirmation code.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={handleClose} maxWidth="max-w-lg" padding="p-5 sm:p-6 md:p-7">
      {/* Ambient Top Glow */}
      <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-80 h-24 bg-gradient-to-b from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="text-center mb-4 relative">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-[#1a73e8] dark:text-blue-400 flex items-center justify-center mx-auto mb-2.5 shadow-sm ring-4 ring-blue-50/50 dark:ring-blue-900/20">
          <Mail className="w-6 h-6" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Verify Your Email
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          We sent a 6-digit confirmation code to{" "}
          <span className="font-semibold text-slate-700 dark:text-slate-200">
            {email || "your registered email"}
          </span>
        </p>
      </div>

      {error && (
        <div className="mb-3 p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs">
          {error}
        </div>
      )}

      {/* Code Input Form */}
      <form onSubmit={handleVerify} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 text-center uppercase tracking-wider">
            6-Digit Verification Code
          </label>
          <div className="relative max-w-xs mx-auto">
            <input
              type="text"
              autoFocus
              maxLength={6}
              value={code}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "");
                setCode(val);
                if (val.length === 6) {
                  setError(null);
                }
              }}
              className="w-full text-center tracking-[0.5em] text-2xl font-mono font-bold py-2.5 px-4 rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:border-[#1a73e8]"
              placeholder="••••••"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={isSubmitting || code.length < 4}
          className="w-full py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-[#1a73e8] via-blue-600 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all active:scale-[0.99] cursor-pointer"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <span>Verify & Launch Workspace</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </form>

      {/* Resend Code Section */}
      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-center text-xs text-slate-500">
        <span>Didn't receive the email? </span>
        {cooldown > 0 ? (
          <span className="text-slate-400 font-medium">Resend code in {cooldown}s</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-semibold text-[#1a73e8] hover:underline inline-flex items-center gap-1"
          >
            {isResending && <RefreshCw className="w-3 h-3 animate-spin" />}
            <span>Resend Code</span>
          </button>
        )}
      </div>

      {/* Security Footer */}
      <div className="mt-3 text-center">
        <button
          type="button"
          onClick={handleSwitchToLogin}
          className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline"
        >
          ← Return to Sign In
        </button>
      </div>
    </ModalWrapper>
  );
};

export default VerificationModal;
