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
    const mustReload = consent === "accepted" && status === "rejected";
    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, status);
    notifyCookieConsentChanged();
    setConsent(status);
    setIsVisible(false);
    if (mustReload) window.setTimeout(() => window.location.reload(), 0);
  }

  const isPortuguese = language === "pt-BR";

  return (
    <>
      {consent !== null && !isVisible && (
        <button
          type="button"
          onClick={() => setIsVisible(true)}
          aria-label={isPortuguese ? "Abrir preferências de cookies" : "Open cookie preferences"}
          className="fixed bottom-20 right-3 z-[90] inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-slate-950/90 px-3 text-xs font-semibold text-slate-300 shadow-lg backdrop-blur hover:border-violet-300/35 hover:text-white sm:bottom-4 sm:right-4"
        >
          <Cookie className="h-3.5 w-3.5 text-violet-300" aria-hidden="true" />
          {isPortuguese ? "Cookies" : "Cookies"}
        </button>
      )}

      {isVisible && (
        <div
          className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
          role="dialog"
          aria-modal="false"
          aria-label={t(language, "cookies.title")}
        >
          <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-slate-700/80 bg-slate-950/95 p-4 shadow-2xl shadow-black/30 backdrop-blur-xl sm:flex-row sm:items-center sm:gap-6 sm:p-5">
            <div className="flex min-w-0 items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                <Cookie className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {isPortuguese ? "Sua privacidade importa" : "Your privacy matters"}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-400">
                  {isPortuguese
                    ? "Métricas agregadas, fotos contextuais e anúncios só são ativados com sua escolha. Você pode alterá-la a qualquer momento."
                    : "Aggregate metrics, contextual photos and ads load only with your choice. You can change it at any time."}
                </p>
                {consent === "accepted" && (
                  <p className="mt-1 text-xs leading-5 text-amber-200/80">
                    {isPortuguese
                      ? "Ao revogar, a página será atualizada para encerrar scripts externos já carregados."
                      : "Revoking refreshes the page to stop external scripts already loaded."}
                  </p>
                )}
                <Link
                  to="/cookies"
                  className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-violet-300 hover:text-violet-200"
                >
                  <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
                  {isPortuguese ? "Detalhes dos cookies" : "Cookie details"}
                </Link>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <button
                type="button"
                onClick={() => saveConsent("rejected")}
                className="rounded-xl border border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-slate-500 hover:text-white"
              >
                {isPortuguese
                  ? consent === "accepted"
                    ? "Revogar e atualizar"
                    : "Recusar não essenciais"
                  : consent === "accepted"
                    ? "Revoke and refresh"
                    : "Reject non-essential"}
              </button>
              <button
                type="button"
                onClick={() => saveConsent("accepted")}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500"
              >
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                {isPortuguese ? "Aceitar" : "Accept"}
              </button>
              {consent !== null && (
                <button
                  type="button"
                  onClick={() => setIsVisible(false)}
                  className="rounded-xl px-3 py-2.5 text-xs font-medium text-slate-400 hover:text-white"
                >
                  {isPortuguese ? "Fechar" : "Close"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
