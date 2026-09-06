import { Link } from "@tanstack/react-router";
import {
  Check,
  Cookie,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type CookieConsentStatus =
  | "accepted"
  | "rejected"
  | null;

const COOKIE_CONSENT_KEY =
  "decidlyai-cookie-consent";

export function CookieConsent() {
  const [
    consent,
    setConsent,
  ] = useState<CookieConsentStatus>(null);

  const [
    isVisible,
    setIsVisible,
  ] = useState(false);

  useEffect(() => {
    const savedConsent =
      window.localStorage.getItem(
        COOKIE_CONSENT_KEY,
      );

    if (
      savedConsent === "accepted" ||
      savedConsent === "rejected"
    ) {
      setConsent(savedConsent);
      setIsVisible(false);

      return;
    }

    setIsVisible(true);
  }, []);

  function saveConsent(
    status: Exclude<
      CookieConsentStatus,
      null
    >,
  ) {
    window.localStorage.setItem(
      COOKIE_CONSENT_KEY,
      status,
    );

    setConsent(status);
    setIsVisible(false);
  }

  function handleAccept() {
    saveConsent("accepted");
  }

  function handleReject() {
    saveConsent("rejected");
  }

  if (!isVisible || consent !== null) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[100] p-4 sm:p-6"
      role="dialog"
      aria-modal="false"
      aria-label="Aviso sobre cookies"
    >
      <div className="mx-auto max-w-xl">
        <div className="relative overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-950/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-7">
          {/* EFEITO DE FUNDO */}

          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-48 w-48 rounded-full bg-violet-600/10 blur-[70px]" />

            <div className="absolute -bottom-24 -left-16 h-48 w-48 rounded-full bg-purple-600/10 blur-[70px]" />
          </div>

          <div className="relative">
            {/* CABEÇALHO */}

            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                  <Cookie className="h-5 w-5" />
                </div>

                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Cookies
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Sua privacidade é importante.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReject}
                aria-label="Fechar aviso de cookies"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* TEXTO */}

            <p className="mt-6 leading-relaxed text-slate-400">
              Utilizamos cookies e tecnologias
              semelhantes para manter o funcionamento
              do DecidlyAI, manter sua sessão e
              melhorar sua experiência na plataforma.
            </p>

            <p className="mt-4 text-sm leading-relaxed text-slate-500">
              Você pode aceitar ou recusar o uso de
              cookies não essenciais. Algumas
              funcionalidades essenciais podem continuar
              utilizando tecnologias necessárias para o
              funcionamento do serviço.
            </p>

            {/* LINK */}

            <Link
              to="/cookies"
              className="mt-5 inline-flex text-sm font-medium text-violet-400 transition hover:text-violet-300"
            >
              Ler a Política de Cookies
            </Link>

            {/* BOTÕES */}

            <div className="mt-7 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleReject}
                className="flex items-center justify-center rounded-xl border border-slate-700 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-slate-500 hover:bg-slate-900 hover:text-white"
              >
                Recusar
              </button>

              <button
                type="button"
                onClick={handleAccept}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
              >
                <Check className="h-4 w-4" />

                Aceitar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}