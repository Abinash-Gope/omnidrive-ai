import React from "react";
import { Outlet } from "react-router-dom";
import PublicNavbar from "../../features/public/ui/components/PublicNavbar.jsx";
import PublicFooter from "../../features/public/ui/components/PublicFooter.jsx";

const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff] dark:bg-[#0b1329] text-slate-900 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#1a73e8]">
      <PublicNavbar />
      <main className="flex-1 pt-20">
        <Outlet />
      </main>
      <PublicFooter />
    </div>
  );
};

export default PublicLayout;
