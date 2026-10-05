import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Language, useLanguage, setLanguage as setLanguageLib } from "./i18n";
import { supabase } from "./supabase";
import { applyThemePreference, normalizeUserPreferences } from "./user-preferences";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);
const originalText = new WeakMap<Text, string>();
const translationCache = new Map<string, string>();

function translatableNodes() {
  if (typeof document === "undefined") return [] as Text[];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  let current: Node | null;
  while ((current = walker.nextNode())) {
    const node = current as Text;
    const parent = node.parentElement;
    const value = node.textContent?.trim() || "";
    if (
      !parent ||
      !value ||
      parent.closest(
        "[data-no-translate], script, style, code, pre, input, textarea, select, option",
      )
    )
      continue;
    if (/^https?:\/\//i.test(value) || /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(value)) continue;
    nodes.push(node);
  }
  return nodes;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const detectedLang = useLanguage();
  const [language, setLanguageState] = useState<Language>("pt-BR");
  const translating = useRef(false);
  const lastTranslationAt = useRef(0);
  const translatedTextNodes = useRef(new Set<Text>());

  useEffect(() => {
    setLanguageState(detectedLang);
  }, [detectedLang]);

  useEffect(() => {
    let active = true;
    const syncPreferences = async (userId: string | undefined) => {
      if (!userId) return;
      const { data } = await supabase
        .from("user_preferences")
        .select("idioma_preferido,tema")
        .eq("user_id", userId)
        .maybeSingle();
      if (!active || !data) return;
      const preferences = normalizeUserPreferences(data);
      setLanguageState(preferences.idioma_preferido);
      setLanguageLib(preferences.idioma_preferido);
      applyThemePreference(preferences.tema);
    };
    void supabase.auth.getUser().then(({ data }) => syncPreferences(data.user?.id));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      void syncPreferences(session?.user.id);
    });
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSetLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    setLanguageLib(lang);
  }, []);

  const translatePage = useCallback(async () => {
    if (translating.current) return;
    translating.current = true;

    if (language === "pt-BR") {
      translatedTextNodes.current.forEach((node) => {
        const value = originalText.get(node);
        if (value && node.isConnected) node.textContent = value;
      });
      translatedTextNodes.current.clear();
      lastTranslationAt.current = Date.now();
      translating.current = false;
      return;
    }

    try {
      const nodes = translatableNodes();
      nodes.forEach((node) => {
        if (!originalText.has(node)) originalText.set(node, node.textContent?.trim() || "");
      });
      const originals = nodes.map((node) => originalText.get(node) || "");
      const missing = originals.filter((value) => value && !translationCache.has(value));
      if (missing.length > 0) {
        const { supabase } = await import("./supabase");
        const { data, error } = await supabase.functions.invoke("decidly-translate", {
          body: { texts: missing, source: "pt", target: "en" },
        });
        if (!error && Array.isArray(data?.translations)) {
          missing.forEach((value, index) => {
            const translated = data.translations[index];
            if (typeof translated === "string") translationCache.set(value, translated);
          });
        }
      }
      nodes.forEach((node) => {
        const value = originalText.get(node);
        const translation = translationCache.get(value || "") || value;
        if (value && translation && node.isConnected) {
          node.textContent = translation;
          if (translation !== value) translatedTextNodes.current.add(node);
        }
      });
    } catch (error) {
      console.warn("Não foi possível traduzir a página.", error);
    } finally {
      lastTranslationAt.current = Date.now();
      translating.current = false;
    }
  }, [language]);

  useEffect(() => {
    void translatePage();
    if (language !== "en-US") return;

    let translationTimer: number | null = null;
    const observer = new MutationObserver(() => {
      if (translating.current || Date.now() - lastTranslationAt.current <= 400) return;
      if (translationTimer !== null) window.clearTimeout(translationTimer);
      translationTimer = window.setTimeout(() => void translatePage(), 220);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      if (translationTimer !== null) window.clearTimeout(translationTimer);
    };
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
