import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "./supabase";

export type Language = "pt-BR" | "en";
const STORAGE_KEY = "decidly-language";
const normalizeLanguage = (value: string | null | undefined): Language => value === "en" || value === "en-US" ? "en" : "pt-BR";

const dictionary: Record<string, string> = {
  "Como funciona": "How it works", Recursos: "Features", Planos: "Plans", Entrar: "Log in", Começar: "Get started", "Começar gratuitamente": "Get started for free", "Ver como funciona": "See how it works", "Criar conta": "Create account", "Criar minha conta": "Create my account", "Entrar na minha conta": "Log in to my account", "Voltar para o início": "Back to home", "Preferências": "Preferences", Configurações: "Settings", "Salvar alterações": "Save changes", "Créditos": "Credits", Histórico: "History", "Créditos Gratuitos": "Free Credits", "Comprar Créditos": "Buy Credits", "Conta": "Account", Aparência: "Appearance", Idioma: "Language", "Português (Brasil)": "Portuguese (Brazil)", "English (US)": "English (US)", "Nenhuma movimentação ainda.": "No activity yet.", "Todos os direitos reservados.": "All rights reserved.", Privacidade: "Privacy", Termos: "Terms", Suporte: "Support", Cookies: "Cookies", Tecnologia: "Technology", "Ver planos": "View plans", "Seu espaço para decidir melhor": "Your space to make better decisions", "Organize o contexto": "Organize the context", "Compare caminhos": "Compare paths", "Encontre clareza": "Find clarity",
};

const cache = new Map<string, string>(Object.entries(dictionary));
const originalTexts = new WeakMap<Text, string>();

function canTranslate(node: Text) {
  const parent = node.parentElement;
  if (!parent || !node.textContent?.trim()) return false;
  if (parent.closest("[data-no-translate], script, style, code, pre, input, textarea, select, option")) return false;
  const text = node.textContent.trim();
  return !/^https?:\/\//i.test(text) && !/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(text) && !/^[A-Z0-9_-]{8,}$/.test(text);
}

export function collectTranslatableNodes() {
  if (typeof document === "undefined") return [] as Text[];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = []; let current: Node | null;
  while ((current = walker.nextNode())) if (current instanceof Text && canTranslate(current)) nodes.push(current);
  return nodes;
}

export async function translateTexts(texts: string[], target: Language) {
  if (target === "pt-BR") return texts;
  const result = new Map<string, string>(); const missing: string[] = [];
  for (const text of texts) { const value = cache.get(text); if (value) result.set(text, value); else missing.push(text); }
  if (missing.length) {
    const { data, error } = await supabase.functions.invoke("decidly-translate", { body: { texts: missing, source: "pt", target: "en" } });
    if (!error && Array.isArray(data?.translations)) missing.forEach((text, index) => { const translated = typeof data.translations[index] === "string" ? data.translations[index] : text; cache.set(text, translated); result.set(text, translated); });
    else missing.forEach((text) => result.set(text, text));
  }
  return result;
}

type I18nValue = { language: Language; setLanguage: (language: Language) => void; translatePage: () => Promise<void> };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => typeof window !== "undefined" ? normalizeLanguage(window.localStorage.getItem(STORAGE_KEY)) : "pt-BR");
  const translating = useRef(false);
  const translatePage = useCallback(async () => {
    if (translating.current) return;
    translating.current = true;
    const nodes = collectTranslatableNodes();
    if (language === "pt-BR") { nodes.forEach((node) => { const original = originalTexts.get(node); if (original) node.textContent = original; }); translating.current = false; return; }
    nodes.forEach((node) => { if (!originalTexts.has(node)) originalTexts.set(node, node.textContent?.trim() || ""); });
    const originals = nodes.map((node) => originalTexts.get(node) || node.textContent?.trim() || "");
    const translations = await translateTexts(originals, language);
    nodes.forEach((node, index) => { const original = originals[index]; const translated = translations.get(original); if (translated && node.isConnected) node.textContent = translated; });
    translating.current = false;
  }, [language]);
  useEffect(() => { window.localStorage.setItem(STORAGE_KEY, language); document.documentElement.lang = language; void translatePage(); }, [language, translatePage]);
  useEffect(() => { const observer = new MutationObserver(() => { if (language === "en") void translatePage(); }); observer.observe(document.body, { childList: true, subtree: true }); return () => observer.disconnect(); }, [language, translatePage]);
  const value = useMemo(() => ({ language, setLanguage: (next: Language) => setLanguageState(next), translatePage }), [language, translatePage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() { const value = useContext(I18nContext); if (!value) throw new Error("useI18n must be used inside I18nProvider"); return value; }
