import React from "react";
import { Outlet } from "react-router-dom";
import Toast from "../../shared/ui/components/Toast.jsx";
import AuthModal from "../../features/auth/ui/components/AuthModal.jsx";
import RegisterModal from "../../features/auth/ui/components/RegisterModal.jsx";
import EnterpriseContactModal from "../../features/auth/ui/components/EnterpriseContactModal.jsx";

const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] dark:bg-[#060b19] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#1a73e8]">
      <Outlet />
      <Toast />
      <AuthModal />
      <RegisterModal />
      <EnterpriseContactModal />
    </div>
  );
};

export default AppLayout;
