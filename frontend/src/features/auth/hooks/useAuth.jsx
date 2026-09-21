import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { setLoading, loginSuccess, loginFailure, logout, updatePlan } from "../state/authSlice.jsx";
import { closeModal, openModal, setToast } from "../../../shared/state/uiSlice.jsx";
import { loginApi, logoutApi, googleOAuthApi, registerApi } from "../api/authApi.jsx";
import { getPlanDetails } from "../../../shared/config/plans.jsx";

/**
 * Layer 2: Orchestrator custom hook for authentication
 * Binds UI to API & Redux state, manages forms, modals, and redirects to /dashboard.
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, token, isAuthenticated, isLoading, error } = useSelector(
    (state) => state.auth || {}
  );
  const { activeModal } = useSelector((state) => state.ui || {});

  const loginForm = useForm({
    defaultValues: {
      email: "alex.gope@omnidrive.ai",
      password: "demo-password-123",
      rememberMe: true,
    },
  });

  const registerForm = useForm({
    defaultValues: {
      fullName: "Alex Chen",
      email: "alex@company.com",
      password: "Enterprise#2026!",
      termsAccepted: true,
    },
  });

  const handleLogin = async (formData) => {
    try {
      dispatch(setLoading(true));
      const data = await loginApi(formData);
      dispatch(loginSuccess(data));
      dispatch(closeModal());
      dispatch(setToast({ type: "success", message: `Welcome back, ${data.user.name}!` }));
      navigate("/dashboard");
    } catch (err) {
      dispatch(loginFailure(err.message || "Failed to authenticate."));
      dispatch(setToast({ type: "error", message: err.message || "Authentication failed." }));
    }
  };

  const handleGoogleSSO = async () => {
    try {
      dispatch(setLoading(true));
      const data = await googleOAuthApi();
      dispatch(loginSuccess(data));
      dispatch(closeModal());
      dispatch(setToast({ type: "success", message: `Signed in with Google as ${data.user.name}` }));
      navigate("/dashboard");
    } catch (err) {
      dispatch(loginFailure(err.message || "Google OAuth failed."));
      dispatch(setToast({ type: "error", message: "Google OAuth sign-in failed." }));
    }
  };

  const handleRegister = async (formData) => {
    try {
      dispatch(setLoading(true));
      const data = await registerApi(formData);
      dispatch(loginSuccess(data));
      dispatch(closeModal());
      dispatch(setToast({ type: "success", message: `Enterprise Workspace launched for ${data.user.name}!` }));
      navigate("/dashboard");
    } catch (err) {
      dispatch(loginFailure(err.message || "Registration failed."));
      dispatch(setToast({ type: "error", message: err.message || "Registration failed." }));
    }
  };

  const handleDemoLogin = async () => {
    await handleLogin({ email: "demo.architect@omnidrive.ai", password: "demo" });
  };

  const handleLogout = async () => {
    await logoutApi();
    dispatch(logout());
    dispatch(setToast({ type: "info", message: "Signed out successfully." }));
    navigate("/");
  };

  const handleUpdatePlan = (newPlan) => {
    if (newPlan === "enterprise") {
      // Enterprise requires contacting first
      dispatch(openModal("enterpriseContact"));
      return;
    }
    dispatch(updatePlan(newPlan));
    const details = getPlanDetails(newPlan);
    dispatch(
      setToast({
        type: "success",
        message: `Active subscription updated to ${details.name}!`,
      })
    );
  };

  const handleOpenEnterpriseContact = () => {
    dispatch(openModal("enterpriseContact"));
  };

  const activePlanDetails = getPlanDetails(user?.plan || "free");

  return {
    user,
    plan: user?.plan || "free",
    planDetails: activePlanDetails,
    token,
    isAuthenticated,
    isLoading,
    error,
    activeModal,
    loginForm,
    registerForm,
    handleLogin,
    handleGoogleSSO,
    handleRegister,
    handleDemoLogin,
    handleLogout,
    handleUpdatePlan,
    handleOpenEnterpriseContact,
  };
};

export default useAuth;
