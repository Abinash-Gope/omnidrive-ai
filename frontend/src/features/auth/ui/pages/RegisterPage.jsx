import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import { openModal } from "../../../../shared/state/uiSlice.jsx";

const RegisterPage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(openModal("register"));
  }, [dispatch]);

  return (
    <div className="min-h-screen w-full overflow-hidden relative flex flex-col items-center justify-between p-6 bg-gradient-to-br from-slate-950 via-[#0a1226] to-slate-950">
      {/* Ambient background glow effects */}
      <div className="absolute top-1/4 right-1/4 translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Brand Nav */}
      <div className="w-full max-w-7xl flex items-center justify-between z-10 pt-2">
        <Link to="/" className="flex items-center gap-3 text-white group">
          <OmniDriveLogo size="md" animate={true} />
          <span className="font-bold text-2xl tracking-tight">
            OmniDrive<span className="text-[#60a5fa]">AI</span>
          </span>
        </Link>
        <Link
          to="/"
          className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
        >
          ← Return to Overview
        </Link>
      </div>

      {/* Center Spacer */}
      <div className="my-auto" />

      {/* Bottom Footer Info */}
      <div className="w-full text-center text-xs text-slate-500 py-4 z-10">
        <span>© 2026 OmniDrive AI Inc. Enterprise Cloud Storage &amp; Automated Intelligence.</span>
      </div>
    </div>
  );
};

export default RegisterPage;
