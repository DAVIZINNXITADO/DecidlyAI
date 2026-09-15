import { useEffect, useState } from "react";

declare global {
  interface Window {
    translate?: {
      language: { setLocal: (language: string) => void };
      setDocuments: (documents: Element | Element[]) => void;
      changeLanguage: (language: string) => void;
      execute: (documents?: Element | Element[]) => void;
      listener: { start: () => void };
    };
    __decidlyTranslateReady?: boolean;
    __decidlyTranslateInitialized?: boolean;
  }
}

const SCRIPT_ID = "decidly-translate-js";

export default function CustomLanguageSelector() {
  const [currentLang, setCurrentLang] = useState("portuguese");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCurrentLang(localStorage.getItem("decidly-translate-language") || "portuguese");
    const initialize = () => {
      const api = window.translate;
      if (!api || !document.body) return;
      window.__decidlyTranslateReady = true;
      api.language.setLocal("portuguese");
      api.setDocuments(document.body);
      if (!window.__decidlyTranslateInitialized) {
        window.__decidlyTranslateInitialized = true;
        api.execute(document.body);
        api.listener.start();
      }
      setReady(true);
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/translate.js/3.5.0/translate.js";
      script.async = true;
      script.onload = initialize;
      document.head.appendChild(script);
    } else {
      const timer = window.setInterval(() => { if (window.translate) { initialize(); window.clearInterval(timer); } }, 100);
      return () => window.clearInterval(timer);
    }
    return undefined;
  }, []);

  const changeLanguage = (language: "portuguese" | "english") => {
    if (!window.translate) return;
    window.translate.changeLanguage(language);
    localStorage.setItem("decidly-translate-language", language);
    setCurrentLang(language);
  };

  return <div className="flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 p-1" aria-label="Select language"><button type="button" disabled={!ready} onClick={() => changeLanguage("portuguese")} className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 ${currentLang === "portuguese" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇧🇷 PT</button><button type="button" disabled={!ready} onClick={() => changeLanguage("english")} className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 ${currentLang === "english" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇺🇸 EN</button></div>;
}
