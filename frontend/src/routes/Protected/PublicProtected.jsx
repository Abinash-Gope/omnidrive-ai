import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "../../features/auth/context/AuthContext.jsx";

const PublicProtected = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default PublicProtected;
