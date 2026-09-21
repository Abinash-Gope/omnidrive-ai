import React, { useState } from "react";
import { NavLink, Link } from "react-router-dom";
import { Cloud, Menu, X, ArrowRight, LayoutDashboard } from "lucide-react";
import usePublicPages from "../../hooks/usePublicPages.jsx";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "AI Features", path: "/features" },
  { label: "How It Works", path: "/how-it-works" },
  { label: "Safety & Privacy", path: "/safety" },
  { label: "Pricing", path: "/pricing" },
];

const PublicNavbar = () => {
  const { isAuthenticated, handleOpenLogin, handleOpenRegister } = usePublicPages();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#0f172a]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-7xl mx-auto h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-full bg-[#d8e2ff] dark:bg-[#1a365d] flex items-center justify-center text-[#005bbf] dark:text-[#adc7ff] transition-transform group-hover:scale-105 shadow-xs">
              <Cloud className="w-5 h-5 fill-current" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
                OmniDrive<span className="text-[#1a73e8]">AI</span>
              </span>
              <span className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Free 15GB
              </span>
            </div>
          </Link>

          {/* Center Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300 shadow-xs"
                      : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Right Action CTAs */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-sm font-medium shadow-sm hover:shadow transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Dashboard</span>
            </Link>
          ) : (
            <>
              <button
                onClick={handleOpenLogin}
                className="hidden sm:inline-flex text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#1a73e8] px-3.5 py-2 rounded-full transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={handleOpenRegister}
                className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-sm font-medium shadow-sm hover:shadow transition-all active:scale-95"
              >
                <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Try Free with Google</span>
              </button>
            </>
          )}

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0f172a] px-4 py-4 space-y-2 shadow-lg">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-base font-medium transition-colors ${
                  isActive
                    ? "bg-[#eaedff] text-[#005bbf] dark:bg-blue-950/60 dark:text-blue-300"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {!isAuthenticated && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleOpenLogin();
                }}
                className="w-full text-center py-2.5 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-[#1a73e8]"
              >
                Sign In to Account
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
