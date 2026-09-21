import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { openModal } from "../../../shared/state/uiSlice.jsx";
import { setTelemetry, setActivePricingTier, toggleFaq } from "../state/publicSlice.jsx";
import { getTelemetryStats } from "../api/publicApi.jsx";

export const usePublicPages = () => {
  const dispatch = useDispatch();
  const { telemetry, activePricingTier, activeFaqIndex } = useSelector((state) => state.public);
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    // Simulated subtle live telemetry jitter
    const interval = setInterval(async () => {
      try {
        const stats = await getTelemetryStats();
        dispatch(setTelemetry(stats));
      } catch (err) {
        // Silently fail telemetry poll
      }
    }, 4000);

    return () => clearInterval(interval);
  }, [dispatch]);

  const handleOpenLogin = () => {
    dispatch(openModal("auth"));
  };

  const handleOpenRegister = () => {
    dispatch(openModal("register"));
  };

  const handleOpenEnterpriseContact = () => {
    dispatch(openModal("enterpriseContact"));
  };

  const handleSelectTier = (tierId) => {
    dispatch(setActivePricingTier(tierId));
  };

  const handleToggleFaq = (index) => {
    dispatch(toggleFaq(index));
  };

  return {
    telemetry,
    activePricingTier,
    activeFaqIndex,
    isAuthenticated,
    handleOpenLogin,
    handleOpenRegister,
    handleOpenEnterpriseContact,
    handleSelectTier,
    handleToggleFaq,
  };
};

export default usePublicPages;
