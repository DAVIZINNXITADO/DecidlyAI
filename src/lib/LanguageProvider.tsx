import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Language, useLanguage, setLanguage as setLanguageLib } from "./i18n";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt-BR");

  useEffect(() => {
    const detectedLang = useLanguage();
    setLanguageState(detectedLang);
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setLanguageLib(lang);
  }, []);

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguageContext() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguageContext must be used within LanguageProvider");
  }
  return context;
}
