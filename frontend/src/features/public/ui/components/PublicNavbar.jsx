import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  Menu,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  LayoutDashboard,
  Sun,
  Moon,
} from "lucide-react";
import OmniDriveLogo from "../../../../shared/ui/components/OmniDriveLogo.jsx";
import { usePublicPages } from "../../hooks/usePublicPages.jsx";
import { useAuthContext } from "../../../auth/context/AuthContext.jsx";
import useTheme from "../../../../shared/hooks/useTheme.jsx";

const navItems = [
  { label: "Overview", path: "/" },
  { label: "Features", path: "/features" },
  { label: "How It Works", path: "/how-it-works" },
  { label: "Pricing", path: "/pricing" },
  { label: "Safety & Ethics", path: "/safety" },
];

const PublicNavbar = () => {
  const { isAuthenticated, handleOpenLogin, handleOpenRegister } = usePublicPages();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-white/85 dark:bg-[#0f172a]/85 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800 shadow-[0_1px_8px_rgba(0,0,0,0.03)] transition-all">
      <div className="max-w-7xl mx-auto h-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Brand Identity */}
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <OmniDriveLogo size="md" animate={true} />
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              OmniDrive<span className="text-[#1a73e8]">AI</span>
            </span>
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
          {/* Quick Theme Toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? "Switch to Light theme" : "Switch to Dark theme"}
            aria-label="Toggle visual theme"
            className="p-2 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-amber-400 hover:rotate-45 transition-transform duration-300" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600 hover:-rotate-12 transition-transform duration-300" />
            )}
          </button>

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
                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-[#1a73e8] dark:hover:text-white bg-slate-100/90 hover:bg-slate-200/90 dark:bg-slate-800/90 dark:hover:bg-slate-700/90 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs"
              >
                Log In
              </button>
              <button
                onClick={handleOpenRegister}
                className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full bg-[#1a73e8] hover:bg-[#1557bf] text-white text-sm font-semibold shadow-sm hover:shadow-[0_4px_14px_rgba(26,115,232,0.35)] transition-all active:scale-95 group cursor-pointer"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
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
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2 py-1">
            <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Theme</span>
            <button
              type="button"
              onClick={toggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
              <span>{isDark ? "Dark" : "Light"}</span>
            </button>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2">
            {!isAuthenticated ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenRegister();
                  }}
                  className="w-full text-center py-2.5 px-4 rounded-xl bg-[#1a73e8] hover:bg-[#1557bf] text-white text-sm font-semibold shadow-sm transition-colors cursor-pointer"
                >
                  Get Started Free
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleOpenLogin();
                  }}
                  className="w-full text-center py-2.5 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-[#1a73e8] font-semibold text-sm transition-colors cursor-pointer"
                >
                  Log In to Account
                </button>
              </>
            ) : (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 rounded-xl bg-[#1a73e8] text-white text-sm font-semibold shadow-sm"
              >
                Open Dashboard
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PublicNavbar;
