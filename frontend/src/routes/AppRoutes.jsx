import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../app/layout/AppLayout.jsx";
import PublicLayout from "../app/layout/PublicLayout.jsx";
import MainProtected from "./Protected/MainProtected.jsx";
import PublicProtected from "./Protected/PublicProtected.jsx";

// Public Marketing Pages
import OverviewPage from "../features/public/ui/pages/OverviewPage.jsx";
import FeaturesPage from "../features/public/ui/pages/FeaturesPage.jsx";
import HowItWorksPage from "../features/public/ui/pages/HowItWorksPage.jsx";
import SafetyPage from "../features/public/ui/pages/SafetyPage.jsx";
import PricingPage from "../features/public/ui/pages/PricingPage.jsx";

// Auth Pages
import LoginPage from "../features/auth/ui/pages/LoginPage.jsx";
import RegisterPage from "../features/auth/ui/pages/RegisterPage.jsx";

// Authenticated Dashboard & Profile Pages
import DashboardPage from "../features/dashboard/ui/pages/DashboardPage.jsx";
import ProfilePage from "../features/dashboard/ui/pages/ProfilePage.jsx";

// Fallback Page
import NotFoundPage from "../shared/ui/pages/NotFoundPage.jsx";

const AppRoutes = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* Public Marketing Presentation Site */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<OverviewPage />} />
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/safety" element={<SafetyPage />} />
          <Route path="/pricing" element={<PricingPage />} />
        </Route>

        {/* Auth Direct Routes (Redirects to /dashboard if already signed in) */}
        <Route element={<PublicProtected />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        {/* Authenticated Cloud Workspace */}
        <Route element={<MainProtected />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          {/* Legacy redirect for any bookmarks */}
          <Route path="/drive" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* 404 Catch-All */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
