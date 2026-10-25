import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import km from "./locales/km.json";

const savedLanguage = localStorage.getItem("elms_language") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    km: { translation: km },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export const changeLanguage = (lang: "en" | "km") => {
  localStorage.setItem("elms_language", lang);
  i18n.changeLanguage(lang);
  if (lang === "km") {
    document.documentElement.classList.add("font-khmer");
  } else {
    document.documentElement.classList.remove("font-khmer");
  }
};

// Initial font setup
if (savedLanguage === "km") {
  document.documentElement.classList.add("font-khmer");
}

export default i18n;
