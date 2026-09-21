import { useDispatch, useSelector } from "react-redux";

import { openModal } from "../../../shared/state/uiSlice.jsx";
import { setActivePricingTier, toggleFaq } from "../state/publicSlice.jsx";

export const usePublicPages = () => {
  const dispatch = useDispatch();
  const { activePricingTier, activeFaqIndex } = useSelector((state) => state.public);
  const { isAuthenticated } = useSelector((state) => state.auth);


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
