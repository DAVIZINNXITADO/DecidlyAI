import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type RefObject,
} from "react";

import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";

import { supabase } from "../lib/supabase";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          size?: "normal" | "compact";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: (
            errorCode?: string | number,
          ) => void;
        },
      ) => string | number;

      reset: (
        widgetId?: string | number,
      ) => void;

      remove: (
        widgetId?: string | number,
      ) => void;
    };
  }
}

export const Route =
  createFileRoute("/reset-password")({
    component: ResetPasswordPage,
  });

const TURNSTILE_SITE_KEY =
  "0x4AAAAAAErVWNfAdys_3TD5";

type RecoveryStatus =
  | "checking"
  | "valid"
  | "missing-token"
  | "expired";

type CaptchaStatus =
  | "checking"
  | "valid"
  | "error"
  | "expired";

function Brand() {
  return (
    <Link
      to="/"
      className="flex w-fit items-center gap-3 transition-opacity hover:opacity-80"
    >
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-2xl">
        <img
          src="/favicon.ico"
          alt="DecidlyAI"
          className="h-full w-full object-cover"
        />
      </div>

      <span className="flex items-center text-2xl font-bold leading-none tracking-tight">
        <span className="text-white">
          Decidly
        </span>

        <span className="text-violet-400">
          AI
        </span>
      </span>
    </Link>
  );
}

function ResetPasswordPage() {
  const navigate = useNavigate();

  const turnstileContainerRef =
    useRef<HTMLDivElement>(null);

  const turnstileWidgetIdRef =
    useRef<string | number | null>(
      null,
    );

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [
    recoveryStatus,
    setRecoveryStatus,
  ] = useState<RecoveryStatus>(
    "checking",
  );

  const [
    captchaStatus,
    setCaptchaStatus,
  ] = useState<CaptchaStatus>(
    "checking",
  );

  const [
    captchaToken,
    setCaptchaToken,
  ] = useState("");

  /*
   * DETECTA SE EXISTE ALGUMA
   * INFORMAÇÃO DE RECUPERAÇÃO
   * NA URL.
   *
   * Isso ajuda a diferenciar:
   *
   * - acesso normal à página
   * - link expirado ou já utilizado
   */

  function hasRecoveryTokenInUrl() {
    const hash =
      window.location.hash;

    const search =
      window.location.search;

    return (
      hash.includes("access_token") ||
      hash.includes("type=recovery") ||
      search.includes("code=") ||
      search.includes("token=") ||
      search.includes("type=recovery")
    );
  }

  /*
   * VALIDAÇÃO DO LINK
   * DE RECUPERAÇÃO DO SUPABASE
   */

  useEffect(() => {
    let mounted = true;

    let recoveryDetected =
      false;

    const {
      data: { subscription },
    } =
      supabase.auth.onAuthStateChange(
        (event, session) => {
          if (!mounted) {
            return;
          }

          if (
            event ===
              "PASSWORD_RECOVERY" &&
            session
          ) {
            recoveryDetected = true;

            setRecoveryStatus(
              "valid",
            );
          }
        },
      );

    const timeout =
      window.setTimeout(() => {
        if (
          !mounted ||
          recoveryDetected
        ) {
          return;
        }

        if (
          hasRecoveryTokenInUrl()
        ) {
          setRecoveryStatus(
            "expired",
          );
        } else {
          setRecoveryStatus(
            "missing-token",
          );
        }
      }, 1800);

    return () => {
      mounted = false;

      window.clearTimeout(
        timeout,
      );

      subscription.unsubscribe();
    };
  }, []);

  /*
   * CLOUDFLARE TURNSTILE
   */

  useEffect(() => {
    let cancelled = false;

    function renderTurnstile() {
      if (
        cancelled ||
        !window.turnstile ||
        !turnstileContainerRef.current
      ) {
        return;
      }

      const container =
        turnstileContainerRef.current;

      container.innerHTML = "";

      setCaptchaStatus(
        "checking",
      );

      setCaptchaToken("");

      try {
        const widgetId =
          window.turnstile.render(
            container,
            {
              sitekey:
                TURNSTILE_SITE_KEY,

              theme: "dark",

              size: "normal",

              callback: (
                token: string,
              ) => {
                if (cancelled) {
                  return;
                }

                setCaptchaToken(
                  token,
                );

                setCaptchaStatus(
                  "valid",
                );
              },

              "expired-callback":
                () => {
                  if (cancelled) {
                    return;
                  }

                  setCaptchaToken(
                    "",
                  );

                  setCaptchaStatus(
                    "expired",
                  );
                },

              "error-callback":
                () => {
                  if (cancelled) {
                    return;
                  }

                  setCaptchaToken(
                    "",
                  );

                  setCaptchaStatus(
                    "error",
                  );
                },
            },
          );

        turnstileWidgetIdRef.current =
          widgetId;
      } catch {
        if (cancelled) {
          return;
        }

        setCaptchaToken("");

        setCaptchaStatus(
          "error",
        );
      }
    }

    function loadTurnstile() {
      if (window.turnstile) {
        renderTurnstile();

        return;
      }

      const existingScript =
        document.getElementById(
          "cloudflare-turnstile-script",
        );

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          renderTurnstile,
          {
            once: true,
          },
        );

        return;
      }

      const script =
        document.createElement(
          "script",
        );

      script.id =
        "cloudflare-turnstile-script";

      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

      script.async = true;

      script.defer = true;

      script.onload =
        renderTurnstile;

      script.onerror = () => {
        if (cancelled) {
          return;
        }

        setCaptchaToken("");

        setCaptchaStatus(
          "error",
        );
      };

      document.head.appendChild(
        script,
      );
    }

    loadTurnstile();

    return () => {
      cancelled = true;

      if (
        window.turnstile &&
        turnstileWidgetIdRef.current !==
          null
      ) {
        try {
          window.turnstile.remove(
            turnstileWidgetIdRef.current,
          );
        } catch {
          // Ignora erros durante
          // a desmontagem.
        }

        turnstileWidgetIdRef.current =
          null;
      }
    };
  }, []);

  function retryCaptcha() {
    setCaptchaToken("");

    setCaptchaStatus(
      "checking",
    );

    if (
      window.turnstile &&
      turnstileWidgetIdRef.current !==
        null
    ) {
      try {
        window.turnstile.reset(
          turnstileWidgetIdRef.current,
        );

        return;
      } catch {
        setCaptchaStatus(
          "error",
        );
      }
    }
  }

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (
      recoveryStatus !== "valid"
    ) {
      setErrorMessage(
        "Não foi possível confirmar a autorização deste link de recuperação.",
      );

      return;
    }

    if (
      captchaStatus !== "valid" ||
      !captchaToken
    ) {
      setErrorMessage(
        "Conclua a verificação de segurança antes de continuar.",
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Sua nova senha deve ter pelo menos 6 caracteres.",
      );

      return;
    }

    if (
      password !==
      confirmPassword
    ) {
      setErrorMessage(
        "As senhas informadas não coincidem. Verifique e tente novamente.",
      );

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        const message =
          error.message.toLowerCase();

        if (
          message.includes(
            "expired",
          ) ||
          message.includes(
            "invalid",
          ) ||
          message.includes(
            "token",
          )
        ) {
          setErrorMessage(
            "Não foi possível concluir a alteração. Este link de recuperação pode ter expirado ou já ter sido utilizado.",
          );

          return;
        }

        setErrorMessage(
          error.message ||
            "Não foi possível atualizar sua senha. Aguarde um momento e tente novamente.",
        );

        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage(
        "Ocorreu um problema ao atualizar sua senha. Tente novamente em alguns instantes.",
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * TELA DE VERIFICAÇÃO
   */

  if (
    recoveryStatus ===
      "checking"
  ) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 shadow-2xl backdrop-blur-xl md:p-10">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>

              <div className="mt-7 text-center">
                <p className="text-sm font-semibold tracking-wider text-violet-400">
                  VERIFICAÇÃO DE SEGURANÇA
                </p>

                <h1 className="mt-3 text-3xl font-bold tracking-tight">
                  Verificando seu acesso
                </h1>

                <p className="mt-4 leading-relaxed text-slate-400">
                  Estamos confirmando
                  a validade do seu
                  link de recuperação e
                  preparando a
                  verificação de
                  segurança.
                </p>
              </div>

              <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
                  <ShieldCheck className="h-4 w-4 text-violet-400" />

                  Verificação de segurança
                </div>

                <div
                  ref={
                    turnstileContainerRef
                  }
                  className="flex min-h-[65px] items-center justify-center"
                />

                {captchaStatus ===
                "checking" ? (
                  <div className="mt-3 flex items-center justify-center gap-2 text-xs text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />

                    Carregando verificação...
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * SEM TOKEN DE AUTENTICAÇÃO
   */

  if (
    recoveryStatus ===
    "missing-token"
  ) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
              <div className="h-1 w-full bg-amber-400" />

              <div className="p-8 text-center md:p-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <ShieldAlert className="h-10 w-10" />
                </div>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-4 py-2 text-xs font-semibold tracking-wider text-amber-200">
                  <AlertTriangle className="h-4 w-4" />

                  VERIFICAÇÃO MALSUCEDEDIDA
                </div>

                <h1 className="mt-6 text-3xl font-bold tracking-tight">
                  Sem token de
                  autenticação
                </h1>

                <p className="mt-4 leading-relaxed text-slate-400">
                  Esta página só pode
                  ser acessada por meio
                  de um link válido de
                  recuperação de senha.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

                    <p className="text-sm leading-relaxed text-slate-400">
                      Solicite um novo
                      link de recuperação
                      pelo login e abra o
                      link recebido no
                      seu e-mail.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/login",
                    })
                  }
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3.5 font-semibold text-slate-200 transition hover:border-violet-500 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />

                  Voltar para o login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * LINK EXPIRADO OU UTILIZADO
   */

  if (
    recoveryStatus ===
    "expired"
  ) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
              <div className="h-1 w-full bg-red-500" />

              <div className="p-8 text-center md:p-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-red-400">
                  <ShieldAlert className="h-10 w-10" />
                </div>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold tracking-wider text-red-300">
                  <AlertTriangle className="h-4 w-4" />

                  LINK INVÁLIDO
                </div>

                <h1 className="mt-6 text-3xl font-bold tracking-tight">
                  Este link já foi
                  utilizado ou expirou
                </h1>

                <p className="mt-4 leading-relaxed text-slate-400">
                  Para proteger sua
                  conta, links de
                  recuperação possuem
                  validade limitada e
                  não podem ser
                  reutilizados.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-left">
                  <div className="flex items-start gap-3">
                    <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

                    <p className="text-sm leading-relaxed text-slate-400">
                      Volte para o login
                      e solicite um novo
                      link de recuperação
                      de senha.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/login",
                    })
                  }
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3.5 font-semibold text-slate-200 transition hover:border-violet-500 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />

                  Voltar para o login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * ERRO DO CAPTCHA
   */

  if (
    captchaStatus ===
    "error"
  ) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
              <div className="h-1 w-full bg-red-500" />

              <div className="p-8 text-center md:p-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-red-500/20 bg-red-500/10 text-red-400">
                  <ShieldAlert className="h-10 w-10" />
                </div>

                <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/10 px-4 py-2 text-xs font-semibold tracking-wider text-red-300">
                  <AlertTriangle className="h-4 w-4" />

                  VERIFICAÇÃO INDISPONÍVEL
                </div>

                <h1 className="mt-6 text-3xl font-bold tracking-tight">
                  Não foi possível
                  concluir a verificação
                  de segurança
                </h1>

                <p className="mt-4 leading-relaxed text-slate-400">
                  O sistema de
                  verificação não pôde
                  ser carregado
                  corretamente. Sua
                  senha não foi alterada.
                </p>

                <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-left">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

                    <p className="text-sm leading-relaxed text-slate-400">
                      Verifique sua
                      conexão com a
                      internet e tente
                      novamente. Caso o
                      problema continue,
                      atualize a página.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={retryCaptcha}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
                >
                  <RefreshCw className="h-5 w-5" />

                  Tentar novamente
                </button>

                <button
                  type="button"
                  onClick={() =>
                    navigate({
                      to: "/login",
                    })
                  }
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 px-5 py-3.5 font-semibold text-slate-200 transition hover:border-violet-500 hover:text-white"
                >
                  <ArrowLeft className="h-5 w-5" />

                  Voltar para o login
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * CAPTCHA EXPIRADO
   */

  if (
    captchaStatus ===
    "expired"
  ) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-xl">
              <div className="h-1 w-full bg-amber-400" />

              <div className="p-8 text-center md:p-10">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-amber-400/20 bg-amber-400/10 text-amber-300">
                  <ShieldAlert className="h-10 w-10" />
                </div>

                <h1 className="mt-6 text-3xl font-bold tracking-tight">
                  A verificação expirou
                </h1>

                <p className="mt-4 leading-relaxed text-slate-400">
                  Por segurança, a
                  verificação precisa ser
                  renovada antes de
                  continuar.
                </p>

                <button
                  type="button"
                  onClick={retryCaptcha}
                  className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
                >
                  <RefreshCw className="h-5 w-5" />

                  Renovar verificação
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * SUCESSO
   */

  if (success) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <Background />

        <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex justify-center">
              <Brand />
            </div>

            <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-8 text-center shadow-2xl backdrop-blur-xl md:p-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/15 text-violet-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>

              <p className="mt-7 text-sm font-semibold tracking-wider text-violet-400">
                SENHA ATUALIZADA
              </p>

              <h1 className="mt-3 text-3xl font-bold tracking-tight">
                Tudo pronto!
              </h1>

              <p className="mt-4 leading-relaxed text-slate-400">
                Sua senha foi alterada
                com sucesso. Agora você
                pode entrar novamente na
                sua conta com sua nova
                senha.
              </p>

              <button
                type="button"
                onClick={() =>
                  navigate({
                    to: "/login",
                  })
                }
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
              >
                Ir para o login

                <ArrowRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  /*
   * FORMULÁRIO
   */

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <Background />

      <div className="relative flex min-h-screen items-center justify-center px-6 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <Brand />
          </div>

          <div className="rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <KeyRound className="h-7 w-7" />
            </div>

            <p className="mt-7 text-sm font-semibold tracking-wider text-violet-400">
              RECUPERAÇÃO DE SENHA
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Crie uma nova senha
            </h1>

            <p className="mt-4 leading-relaxed text-slate-400">
              Sua identidade foi
              verificada. Escolha uma
              nova senha para recuperar
              o acesso à sua conta.
            </p>

            <div className="mt-7 flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />

              <p className="text-sm leading-relaxed text-emerald-100/80">
                Link de recuperação e
                verificação de segurança
                confirmados.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="mt-8 space-y-5"
            >
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Nova senha
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={password}
                    onChange={(
                      event,
                    ) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Digite sua nova senha"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        (current) =>
                          !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Confirmar nova senha
                </label>

                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="confirm-password"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event,
                    ) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Digite sua nova senha novamente"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) =>
                          !current,
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 transition hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage ? (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-relaxed text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={
                  loading ||
                  !captchaToken ||
                  captchaStatus !==
                    "valid"
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    Atualizando senha...
                  </>
                ) : (
                  <>
                    Salvar nova senha

                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <Link
              to="/login"
              className="mt-6 flex items-center justify-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />

              Voltar para o login
            </Link>
          </div>

          <p className="mt-8 text-center text-sm text-slate-500">
            © 2026 DecidlyAI
          </p>
        </div>
      </div>
    </main>
  );
}

function CaptchaContainer({
  containerRef,
}: {
  containerRef: RefObject<
    HTMLDivElement | null
  >;
}) {
  return (
    <div
      ref={containerRef}
      className="flex min-h-[65px] items-center justify-center"
    />
  );
}

function Background() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

      <div className="absolute -left-40 top-[600px] h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[140px]" />

      <div className="absolute -right-40 top-[700px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
    </div>
  );
}