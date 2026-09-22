import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { updatePlan, loginSuccess, setPendingVerification, clearPendingVerification } from "../state/authSlice.jsx";
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
    updateUserPlan,
  } = authContext;

  const { activeModal } = useSelector((state) => state.ui || {});
  const reduxError = useSelector((state) => state.auth?.error);
  const combinedError = error || reduxError;

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
      dispatch(clearPendingVerification());
      dispatch(
        setToast({
          type: "success",
          message: `Welcome back, ${data.user.name}!`,
        })
      );
      navigate("/dashboard");
      return data;
    } catch (err) {
      if (err.code === "UserNotConfirmedException" || err.message?.includes("not confirmed")) {
        dispatch(
          setPendingVerification({
            email: formData.email,
            password: formData.password,
          })
        );
        dispatch(openModal("verification"));
        dispatch(
          setToast({
            type: "info",
            message: "Please enter the verification code sent to your email.",
          })
        );
        return;
      }
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
   * Real Google Sign-In via AWS Cognito Hosted UI / OAuth2
   */
  const handleGoogleSSO = () => {
    dispatch(closeModal());
    loginWithGoogle();
  };

  /**
   * Handle User Registration
   */
  const handleRegister = async (formData) => {
    if (!formData.termsAccepted) {
      const err = new Error("You must agree to the Terms of Service & Privacy Policy to proceed.");
      dispatch(
        setToast({
          type: "error",
          message: err.message,
        })
      );
      throw err;
    }

    try {
      const data = await registerApi(formData);
      dispatch(closeModal());

      if (data.userConfirmed) {
        dispatch(
          setToast({
            type: "success",
            message: `Workspace created! Welcome, ${formData.fullName || "Architect"}.`,
          })
        );
        if (data.token) {
          navigate("/dashboard");
        } else {
          await loginWithEmail(formData.email, formData.password);
          navigate("/dashboard");
        }
      } else {
        // Save pending verification info and open verification modal
        dispatch(
          setPendingVerification({
            email: formData.email,
            password: formData.password,
            fullName: formData.fullName,
          })
        );
        dispatch(openModal("verification"));
        dispatch(
          setToast({
            type: "info",
            message: `Verification code sent to ${formData.email}. Please verify to activate your workspace.`,
          })
        );
      }
      return data;
    } catch (err) {
      if (err.code === "UsernameExistsException") {
        dispatch(openModal("auth"));
        dispatch(
          setToast({
            type: "error",
            message: "An account with this email already exists. Please sign in.",
          })
        );
      } else {
        dispatch(
          setToast({
            type: "error",
            message: err.message || "Registration failed. Please check your details.",
          })
        );
      }
      throw err;
    }
  };

  const establishSessionFromToken = (token, user) => {
    if (authContext.establishSession) {
      authContext.establishSession(token, user);
    } else {
      dispatch(loginSuccess({ token, user }));
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
    // Update both Redux state and AuthContext local user state
    dispatch(updatePlan(newPlan));
    updateUserPlan?.(newPlan);
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
    error: combinedError,
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
    establishSessionFromToken,
  };
};

export default useAuth;
