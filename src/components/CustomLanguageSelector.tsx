import { useEffect, useState } from "react";

declare global {
  interface Window {
    google?: { translate?: { TranslateElement: new (options: { pageLanguage: string; autoDisplay: boolean }, elementId: string) => unknown } };
    googleTranslateElementInit?: () => void;
  }
}

const SCRIPT_ID = "google-translate-script";
const STYLE_ID = "google-translate-hidden-style";

export default function CustomLanguageSelector() {
  const [currentLang, setCurrentLang] = useState("pt");

  useEffect(() => {
    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement("style");
      style.id = STYLE_ID;
      style.textContent = `.goog-te-banner-frame,.goog-te-banner,#goog-gt-tt,.goog-te-balloon-frame,.goog-tooltip,#google_translate_element{display:none!important;visibility:hidden!important}body{top:0!important}.goog-text-highlight{background:transparent!important;box-shadow:none!important}`;
      document.head.appendChild(style);
    }
    window.googleTranslateElementInit = () => {
      if (window.google?.translate?.TranslateElement) {
        new window.google.translate.TranslateElement({ pageLanguage: "pt", autoDisplay: false }, "google_translate_element");
        const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
        if (select?.value) setCurrentLang(select.value);
      }
    };
    if (!document.getElementById(SCRIPT_ID)) {
      const script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit();
    }
    return () => { window.googleTranslateElementInit = undefined; };
  }, []);

  const changeLanguage = (langCode: string) => {
    const select = document.querySelector<HTMLSelectElement>(".goog-te-combo");
    if (!select) return;
    select.value = langCode;
    select.dispatchEvent(new Event("change"));
    setCurrentLang(langCode);
  };

  return <div className="relative flex items-center gap-1 rounded-xl border border-slate-700 bg-slate-900/80 p-1" aria-label="Select language"><div id="google_translate_element" className="hidden" /><button type="button" onClick={() => changeLanguage("pt")} className={`rounded-lg px-2 py-1 text-xs font-medium transition ${currentLang === "pt" || currentLang === "" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇧🇷 PT</button><button type="button" onClick={() => changeLanguage("en")} className={`rounded-lg px-2 py-1 text-xs font-medium transition ${currentLang === "en" ? "bg-violet-600 text-white" : "text-slate-400 hover:text-white"}`}>🇺🇸 EN</button></div>;
}
