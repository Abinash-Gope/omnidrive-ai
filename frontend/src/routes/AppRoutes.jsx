import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "../app/layout/AppLayout.jsx";
import PublicLayout from "../app/layout/PublicLayout.jsx";
import MainProtected from "./Protected/MainProtected.jsx";
import PublicProtected from "./Protected/PublicProtected.jsx";
import PageSkeletonLoader from "../shared/ui/components/PageSkeletonLoader.jsx";

// Public Marketing Pages (Code-Split with React.lazy)
const OverviewPage = lazy(() => import("../features/public/ui/pages/OverviewPage.jsx"));
const FeaturesPage = lazy(() => import("../features/public/ui/pages/FeaturesPage.jsx"));
const HowItWorksPage = lazy(() => import("../features/public/ui/pages/HowItWorksPage.jsx"));
const SafetyPage = lazy(() => import("../features/public/ui/pages/SafetyPage.jsx"));
const PricingPage = lazy(() => import("../features/public/ui/pages/PricingPage.jsx"));

// Auth Pages (Code-Split with React.lazy)
const LoginPage = lazy(() => import("../features/auth/ui/pages/LoginPage.jsx"));
const RegisterPage = lazy(() => import("../features/auth/ui/pages/RegisterPage.jsx"));

// Authenticated Dashboard & Profile Pages (Code-Split with React.lazy)
const DashboardPage = lazy(() => import("../features/dashboard/ui/pages/DashboardPage.jsx"));
const ProfilePage = lazy(() => import("../features/dashboard/ui/pages/ProfilePage.jsx"));

// Fallback Page
const NotFoundPage = lazy(() => import("../shared/ui/pages/NotFoundPage.jsx"));

const AppRoutes = () => {
  return (
    <Suspense fallback={<PageSkeletonLoader />}>
      <Routes>
        <Route element={<AppLayout />}>
          {/* Public Marketing Presentation Site */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<OverviewPage />} />
            {/* Alias redirects — /overview and /architecture → home */}
            <Route path="/overview" element={<Navigate to="/" replace />} />
            <Route path="/architecture" element={<Navigate to="/how-it-works" replace />} />
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
    </Suspense>
  );
};

export default AppRoutes;
