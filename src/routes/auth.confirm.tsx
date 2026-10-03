import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import decidlyaiMarkUrl from "../assets/decidlyai-mark-160.png";

export const Route = createFileRoute("/auth/confirm")({
  component: AuthConfirmPage,
});

function AuthConfirmPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function confirmEmail() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      let { data, error: sessionError } = await supabase.auth.getSession();

      if (!data.session && code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          if (active) {
            setError("Este link expirou ou já foi utilizado. Solicite uma nova confirmação.");
          }
          return;
        }

        ({ data, error: sessionError } = await supabase.auth.getSession());
      }

      if (sessionError || !data.session) {
        if (active) {
          setError("Não foi possível confirmar sua sessão. Solicite um novo link de confirmação.");
        }
        return;
      }

      const storedChoice = window.localStorage.getItem("decidly-marketing-email-consent");
      if (storedChoice === "accepted" || storedChoice === "declined") {
        await supabase
          .from("profiles")
          .update({
            marketing_email_opt_in: storedChoice === "accepted",
            marketing_email_consent_at: new Date().toISOString(),
            marketing_email_consent_source: "signup",
          })
          .eq("id", data.session.user.id);
        window.localStorage.removeItem("decidly-marketing-email-consent");
      }

      if (active) {
        await navigate({ to: "/workspace", replace: true });
      }
    }

    void confirmEmail();

    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#070711] px-6 text-white">
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-[#111122] p-8 text-center shadow-2xl shadow-violet-950/20 sm:p-10">
        <div className="absolute -right-24 -top-24 h-56 w-56 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />

        <div className="relative">
          <img
            src={decidlyaiMarkUrl}
            alt="DecidlyAI"
            width={64}
            height={64}
            className="mx-auto h-16 w-16 rounded-2xl"
          />

          {error ? (
            <>
              <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-400/10 text-rose-300">
                <MailCheck className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-bold">Não foi possível confirmar</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">{error}</p>
              <a
                href="/login"
                className="mt-7 inline-flex rounded-xl bg-violet-600 px-5 py-3 font-semibold text-white transition hover:bg-violet-500"
              >
                Voltar para entrar
              </a>
            </>
          ) : (
            <>
              <div className="mx-auto mt-7 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h1 className="mt-6 text-2xl font-bold">E-mail confirmado</h1>
              <p className="mt-3 text-sm leading-6 text-slate-400">
                Sua conta foi ativada. Estamos preparando seu espaço de decisões.
              </p>
              <div className="mt-7 flex items-center justify-center gap-2 text-sm text-violet-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Entrando no workspace...
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
