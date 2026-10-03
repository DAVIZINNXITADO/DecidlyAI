import { Link } from "@tanstack/react-router";
import { Check, Cookie, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useLanguageContext } from "../lib/LanguageProvider";
import { t } from "../lib/i18n";
import { COOKIE_CONSENT_STORAGE_KEY, notifyCookieConsentChanged } from "../lib/ad-consent";

type CookieConsentStatus = "accepted" | "rejected" | null;

export function CookieConsent() {
  const { language } = useLanguageContext();
  const [consent, setConsent] = useState<CookieConsentStatus>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const savedConsent = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (savedConsent === "accepted" || savedConsent === "rejected") {
      setConsent(savedConsent);
      return;
    }
    setIsVisible(true);
  }, []);

  function saveConsent(status: Exclude<CookieConsentStatus, null>) {
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
    notifyCookieConsentChanged();
    setConsent(status);
    setIsVisible(false);
  }

  if (!isVisible || consent !== null) return null;

  const isPortuguese = language === "pt-BR";

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
      role="dialog"
      aria-modal="false"
      aria-label={t(language, "cookies.title")}
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
            <Cookie className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">
              {isPortuguese ? "Sua privacidade importa" : "Your privacy matters"}
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-400">
              {isPortuguese
                ? "Usamos cookies essenciais para funcionar. Cookies não essenciais só entram com sua escolha."
                : "We use essential cookies to work. Non-essential cookies load only with your choice."}
            </p>
            <Link
              to="/cookies"
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
            >
              <Settings2 className="h-3.5 w-3.5" />
              {isPortuguese ? "Configurar cookies" : "Configure cookies"}
            </Link>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => saveConsent("rejected")}
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
          >
            {isPortuguese ? "Recusar não essenciais" : "Reject non-essential"}
          </button>
          <button
            type="button"
            onClick={() => saveConsent("accepted")}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500"
          >
            <Check className="h-3.5 w-3.5" />
            {isPortuguese ? "Aceitar" : "Accept"}
          </button>
        </div>
      </div>
    </div>
  );
}
