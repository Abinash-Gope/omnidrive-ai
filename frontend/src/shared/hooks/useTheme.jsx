import { useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setTheme as setReduxTheme } from "../state/uiSlice.jsx";

export const useTheme = () => {
  const dispatch = useDispatch();
  const theme = useSelector((state) => state.ui?.theme || "light");

  const applyTheme = useCallback((targetTheme) => {
    try {
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;

      const isDark = targetTheme === "dark" || (targetTheme === "system" && prefersDark);

      if (isDark) {
        document.documentElement.classList.add("dark");
        if (document.body) document.body.classList.add("dark");
        document.documentElement.style.colorScheme = "dark";
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        if (document.body) document.body.classList.remove("dark");
        document.documentElement.style.colorScheme = "light";
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch (err) {
      console.error("Failed to apply theme", err);
    }
  }, []);

  const changeTheme = useCallback(
    (newTheme) => {
      try {
        localStorage.setItem("omnidrive_theme", newTheme);
      } catch (err) {
        console.error("Failed to persist theme", err);
      }
      dispatch(setReduxTheme(newTheme));
      applyTheme(newTheme);
    },
    [dispatch, applyTheme]
  );

  const isDark = useMemo(() => {
    if (typeof window === "undefined") return false;
    const prefersDark =
      window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    return theme === "dark" || (theme === "system" && prefersDark);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next = isDark ? "light" : "dark";
    changeTheme(next);
    return next;
  }, [isDark, changeTheme]);

  useEffect(() => {
    applyTheme(theme);

    // If system mode, listen for OS color-scheme changes
    if (typeof window !== "undefined" && window.matchMedia) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = () => {
        const currentStored = localStorage.getItem("omnidrive_theme") || "light";
        if (currentStored === "system") {
          applyTheme("system");
        }
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme, applyTheme]);

  return {
    theme,
    isDark,
    changeTheme,
    toggleTheme,
  };
};

export default useTheme;
