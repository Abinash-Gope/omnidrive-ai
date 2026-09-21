import React from "react";

/**
 * OmniDriveLogo: High-tech AI Cloud Storage brand emblem
 * Integrates Google Drive tri-facet geometry with AWS cloud contour and neural sparkle.
 */
export const OmniDriveLogo = ({
  size = "md",
  showText = false,
  textClassName = "",
  className = "",
  animate = false,
}) => {
  const sizeMap = {
    xs: "w-6 h-6",
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-11 h-11",
    xl: "w-14 h-14",
  };

  const iconSize = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* Emblem SVG */}
      <div
        className={`relative shrink-0 ${iconSize} rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-emerald-500/10 dark:from-blue-500/20 dark:via-indigo-500/20 dark:to-emerald-500/20 p-1 flex items-center justify-center transition-transform ${
          animate ? "hover:scale-105 hover:rotate-1" : ""
        }`}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            <linearGradient id="compLogoBlue" x1="10" y1="10" x2="90" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="50%" stopColor="#1a73e8" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
            <linearGradient id="compLogoPurple" x1="15" y1="20" x2="60" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#1a73e8" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#7c3aed" />
            </linearGradient>
            <linearGradient id="compLogoEmerald" x1="85" y1="25" x2="45" y2="90" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00d2ff" />
              <stop offset="50%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <radialGradient id="compSpark" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="40%" stopColor="#93c5fd" />
              <stop offset="100%" stopColor="#1a73e8" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Cloud Ribbon */}
          <path
            d="M32 38 C25 38, 18 44, 18 53 C18 62, 25 68, 33 68 L68 68 C77 68, 84 61, 84 52 C84 44, 78 37, 70 36 C68 26, 59 18, 48 18 C39 18, 32 23, 29 30"
            fill="none"
            stroke="url(#compLogoBlue)"
            strokeWidth="5.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Facets */}
          <path d="M32 30 L50 62 L38 62 L24 40 Z" fill="url(#compLogoPurple)" />
          <path d="M68 30 L50 62 L60 80 L76 46 Z" fill="url(#compLogoEmerald)" />
          <path d="M38 62 L64 62 L50 84 Z" fill="url(#compLogoBlue)" />

          {/* Central AI Spark Core */}
          <circle cx="50" cy="50" r="11" fill="url(#compSpark)" />
          <circle cx="50" cy="50" r="4" fill="#ffffff" />

          {/* Neural Orbits */}
          <circle cx="28" cy="50" r="2.2" fill="#60a5fa" />
          <circle cx="72" cy="50" r="2.2" fill="#34d399" />
          <circle cx="50" cy="26" r="2.2" fill="#a78bfa" />
        </svg>
      </div>

      {/* Optional Typography */}
      {showText && (
        <span
          className={`font-bold tracking-tight text-slate-900 dark:text-white ${textClassName || "text-xl"}`}
        >
          OmniDrive<span className="text-[#1a73e8] dark:text-[#60a5fa]">AI</span>
        </span>
      )}
    </div>
  );
};

export default OmniDriveLogo;
