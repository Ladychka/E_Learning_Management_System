import React, { createContext, useContext, useEffect, useState } from "react";
import { changeLanguage } from "@/i18n";

type ThemeMode = "light" | "dark" | "system";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  setTheme: (mode: ThemeMode) => void;
  language: "en" | "km";
  setLanguage: (lang: "en" | "km") => void;
  dataSaver: boolean;
  setDataSaver: (enabled: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem("elms_theme") as ThemeMode) || "system";
  });

  const [language, setLanguageState] = useState<"en" | "km">(() => {
    return (localStorage.getItem("elms_language") as "en" | "km") || "en";
  });

  const [dataSaver, setDataSaverState] = useState<boolean>(() => {
    return localStorage.getItem("elms_datasaver") === "true";
  });

  const [isDark, setIsDark] = useState<boolean>(false);

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const applyTheme = () => {
      const activeDark =
        theme === "dark" || (theme === "system" && mediaQuery.matches);
      setIsDark(activeDark);
      if (activeDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    };

    applyTheme();
    mediaQuery.addEventListener("change", applyTheme);
    return () => mediaQuery.removeEventListener("change", applyTheme);
  }, [theme]);

  const setTheme = (mode: ThemeMode) => {
    localStorage.setItem("elms_theme", mode);
    setThemeState(mode);
  };

  const setLanguage = (lang: "en" | "km") => {
    setLanguageState(lang);
    changeLanguage(lang);
  };

  const setDataSaver = (enabled: boolean) => {
    localStorage.setItem("elms_datasaver", String(enabled));
    setDataSaverState(enabled);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        setTheme,
        language,
        setLanguage,
        dataSaver,
        setDataSaver,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
