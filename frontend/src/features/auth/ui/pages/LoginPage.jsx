import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import { openModal } from "../../../../shared/state/uiSlice.jsx";

const LoginPage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(openModal("auth"));
  }, [dispatch]);

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="mb-4 flex items-center gap-3 text-white">
        <OmniDriveLogo size="lg" animate={true} />
        <span className="font-bold text-2xl tracking-tight">
          OmniDrive<span className="text-[#60a5fa]">AI</span>
        </span>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        <Link to="/" className="text-slate-300 hover:text-white underline">
          ← Return to Public Overview
        </Link>
      </p>
    </div>
  );
};

export default LoginPage;
