import React, { useEffect } from "react";
import { useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { Cloud } from "lucide-react";
import RegisterModal from "../components/RegisterModal.jsx";
import { openModal } from "../../../../shared/state/uiSlice.jsx";

const RegisterPage = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(openModal("register"));
  }, [dispatch]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      <div className="mb-6 flex items-center gap-2.5 text-white">
        <div className="w-10 h-10 rounded-full bg-[#1a73e8] flex items-center justify-center text-white shadow-md">
          <Cloud className="w-6 h-6" />
        </div>
        <span className="font-bold text-2xl tracking-tight">
          OmniDrive<span className="text-[#60a5fa]">AI</span>
        </span>
      </div>

      <div className="w-full max-w-md">
        <RegisterModal />
      </div>

      <p className="mt-8 text-xs text-slate-400">
        <Link to="/" className="text-slate-300 hover:text-white underline">
          ← Return to Public Overview
        </Link>
      </p>
    </div>
  );
};

export default RegisterPage;
