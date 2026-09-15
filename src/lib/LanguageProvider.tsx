import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Language, useLanguage, setLanguage as setLanguageLib } from "./i18n";
import { supabase } from "./supabase";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const originalText = new WeakMap<Text, string>();

function translatableNodes() {
  if (typeof document === "undefined") return [] as Text[];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    const parent = node.parentElement;
    const value = node.textContent?.trim() || "";
    if (!parent || !value || parent.closest("[data-no-translate], script, style, code, pre, input, textarea, select, option")) continue;
    if (/^https?:\/\//i.test(value) || /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) continue;
    nodes.push(node);
  }
  return nodes;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt-BR");
  const translating = useRef(false);
  const lastTranslationAt = useRef(0);

  useEffect(() => {
    const detectedLang = useLanguage();
    setLanguageState(detectedLang);
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setLanguageLib(lang);
  }, []);

  const translatePage = useCallback(async () => {
    if (translating.current) return;
    translating.current = true;
    const nodes = translatableNodes();
    nodes.forEach((node) => { if (!originalText.has(node)) originalText.set(node, node.textContent?.trim() || ""); });
    if (language === "pt-BR") {
      nodes.forEach((node) => { const value = originalText.get(node); if (value && node.isConnected) node.textContent = value; });
      lastTranslationAt.current = Date.now();
      translating.current = false;
      return;
    }
    const originals = nodes.map((node) => originalText.get(node) || "");
    const { data, error } = await supabase.functions.invoke("decidly-translate", { body: { texts: originals.filter(Boolean), source: "pt", target: "en" } });
    if (!error && Array.isArray(data?.translations)) {
      let index = 0;
      nodes.forEach((node) => { const value = originalText.get(node); if (value && node.isConnected) node.textContent = typeof data.translations[index] === "string" ? data.translations[index] : value; index += value ? 1 : 0; });
    }
    lastTranslationAt.current = Date.now();
    translating.current = false;
  }, [language]);

  useEffect(() => {
    void translatePage();
    const observer = new MutationObserver(() => { if (!translating.current && language === "en-US" && Date.now() - lastTranslationAt.current > 250) window.setTimeout(() => void translatePage(), 40); });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [language, translatePage]);

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
