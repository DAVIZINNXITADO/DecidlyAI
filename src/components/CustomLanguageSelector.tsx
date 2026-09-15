import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: { pageLanguage: string; autoDisplay: boolean }, elementId: string) => unknown } };
    googleTranslateElementInit?: () => void;
    __decidlyGoogleTranslateReady?: boolean;
    __decidlyGoogleTranslateInitialized?: boolean;
  }
}

const SCRIPT_ID = "google-translate-script";
const STYLE_ID = "google-translate-hidden-style";
const WIDGET_ID = "google_translate_element";

function getGoogleSelect() { return document.querySelector<HTMLSelectElement>(".goog-te-combo"); }

export default function CustomLanguageSelector() {
  const [currentLang, setCurrentLang] = useState("pt");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `.goog-te-banner-frame,.goog-te-banner,#goog-gt-tt,.goog-te-balloon-frame,.goog-tooltip{display:none!important;visibility:hidden!important}body{top:0!important}.goog-text-highlight{background:transparent!important;box-shadow:none!important}#${WIDGET_ID}{position:absolute!important;left:-10000px!important;top:0!important;width:1px!important;height:1px!important;overflow:hidden!important}`;
      document.head.appendChild(style);
    }
    const initialize = () => {
      if (window.__decidlyGoogleTranslateInitialized) { setReady(Boolean(getGoogleSelect())); return; }
      if (!window.google?.translate?.TranslateElement) return;
      window.__decidlyGoogleTranslateInitialized = true;
      new window.google.translate.TranslateElement({ pageLanguage: "pt", autoDisplay: false }, WIDGET_ID);
      window.setTimeout(() => { const select = getGoogleSelect(); setReady(Boolean(select)); if (select?.value) setCurrentLang(select.value); }, 500);
    };
    window.googleTranslateElementInit = () => { window.__decidlyGoogleTranslateReady = true; initialize(); };
    const existing = document.getElementById(SCRIPT_ID);
    if (!existing) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.onerror = () => setReady(false);
      document.body.appendChild(script);
    } else {
      initialize();
    }
    const timer = window.setInterval(() => { initialize(); if (getGoogleSelect()) { setReady(true); window.clearInterval(timer); } }, 250);
    return () => window.clearInterval(timer);
  }, []);

  const changeLanguage = (langCode: string) => {
    const select = getGoogleSelect();
    if (!select) return;
    select.value = langCode;
    const event = document.createEvent("HTMLEvents");
    event.initEvent("change", true, true);
    select.dispatchEvent(event);
    setCurrentLang(langCode);
  };

  return <div className="relative flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 p-1" aria-label="Select language"><div id={WIDGET_ID} /><button type="button" disabled={!ready} onClick={() => changeLanguage("pt")} className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 ${currentLang === "pt" || currentLang === "" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇧🇷 PT</button><button type="button" disabled={!ready} onClick={() => changeLanguage("en")} className={`rounded-lg px-2 py-1 text-xs font-medium transition disabled:cursor-wait disabled:opacity-50 ${currentLang === "en" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇺🇸 EN</button></div>;
}
