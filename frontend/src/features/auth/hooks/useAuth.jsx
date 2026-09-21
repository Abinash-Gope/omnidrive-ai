import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { updatePlan } from "../state/authSlice.jsx";
import { closeModal, openModal, setToast } from "../../../shared/state/uiSlice.jsx";
import { registerApi } from "../api/authApi.jsx";
import { getPlanDetails } from "../../../shared/config/plans.jsx";
import { useAuthContext } from "../context/AuthContext.jsx";

/**
 * Unified useAuth custom hook
 * Integrates React AuthContext with Redux state, UI modals, forms, and plan management.
 */
export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Consume core Cognito Authentication Context
  const authContext = useAuthContext();
  const {
    isAuthenticated,
    user,
    idToken,
    isLoading,
    error,
    loginWithGoogle,
    loginWithEmail,
    logout,
    getIdToken,
  } = authContext;

  const { activeModal } = useSelector((state) => state.ui || {});

  // Clean form state without hardcoded demo credentials
  const loginForm = useForm({
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const registerForm = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      termsAccepted: false,
    },
  });

  /**
   * Handle Email + Password Submit via Cognito SRP
   */
  const handleLogin = async (formData) => {
    try {
      const data = await loginWithEmail(formData.email, formData.password);
      dispatch(closeModal());
      dispatch(
        setToast({
          type: "success",
          message: `Welcome back, ${data.user.name}!`,
        })
      );
      navigate("/dashboard");
      return data;
    } catch (err) {
      dispatch(
        setToast({
          type: "error",
          message: err.message || "Invalid credentials. Please try again.",
        })
      );
      throw err;
    }
  };

  /**
   * Handle Google SSO Redirect via Cognito Hosted UI
   */
  const handleGoogleSSO = () => {
    dispatch(closeModal());
    loginWithGoogle();
  };

  /**
   * Handle User Registration
   */
  const handleRegister = async (formData) => {
    try {
      const data = await registerApi(formData);
      dispatch(closeModal());
      dispatch(
        setToast({
          type: "success",
          message: data.userConfirmed
            ? `Workspace created! Welcome, ${data.user?.name || "Architect"}.`
            : "Registration complete! Please check your email for verification.",
        })
      );
      if (data.token) {
        navigate("/dashboard");
      } else {
        dispatch(openModal("auth"));
      }
      return data;
    } catch (err) {
      dispatch(
        setToast({
          type: "error",
          message: err.message || "Registration failed. Please check your details.",
        })
      );
      throw err;
    }
  };

  /**
   * Handle Logout across Cognito and Application State
   */
  const handleLogout = async () => {
    await logout();
    dispatch(setToast({ type: "info", message: "Signed out successfully." }));
  };

  /**
   * Plan Upgrade & Consultation Logic
   */
  const handleUpdatePlan = (newPlan) => {
    if (newPlan === "enterprise") {
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
    token: idToken,
    idToken,
    isAuthenticated,
    isLoading,
    error,
    activeModal,
    loginForm,
    registerForm,
    loginWithGoogle,
    loginWithEmail,
    logout,
    getIdToken,
    handleLogin,
    handleGoogleSSO,
    handleRegister,
    handleLogout,
    handleUpdatePlan,
    handleOpenEnterpriseContact,
  };
};

export default useAuth;
