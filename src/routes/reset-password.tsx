import { useEffect, useState, type FormEvent } from "react";
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
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function Brand() {
  return (
    <Link
      to="/"
      className="flex w-fit items-center gap-3 transition-opacity hover:opacity-80"
    >
      <img
        src="/favicon.ico"
        alt="DecidlyAI"
        className="h-11 w-11 shrink-0 object-contain"
      />

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

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

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
    checkingRecovery,
    setCheckingRecovery,
  ] = useState(true);

  const [recoveryValid, setRecoveryValid] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        setRecoveryValid(!!session);
      } catch {
        if (mounted) {
          setRecoveryValid(false);
        }
      } finally {
        if (mounted) {
          setCheckingRecovery(false);
        }
      }
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) {
          return;
        }

        if (
          event === "PASSWORD_RECOVERY" &&
          session
        ) {
          setRecoveryValid(true);
          setCheckingRecovery(false);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(
    event: FormEvent,
  ) {
    event.preventDefault();

    setErrorMessage("");

    if (!recoveryValid) {
      setErrorMessage(
        "Este link de recuperação não é válido ou expirou.",
      );

      return;
    }

    if (password.length < 6) {
      setErrorMessage(
        "Sua senha deve ter pelo menos 6 caracteres.",
      );

      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(
        "As senhas não coincidem.",
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setRecoveryValid(false);

        setErrorMessage(
          "Sua sessão de recuperação expirou. Solicite um novo link.",
        );

        return;
      }

      const { error } =
        await supabase.auth.updateUser({
          password,
        });

      if (error) {
        setErrorMessage(
          error.message ||
            "Não foi possível atualizar sua senha. Tente novamente.",
        );

        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage(
        "Não foi possível atualizar sua senha. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  /* VERIFICANDO RECUPERAÇÃO */

  if (checkingRecovery) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-xl md:p-10">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>

            <p className="mt-7 text-sm font-semibold tracking-wider text-violet-400">
              DECIDLYAI
            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight">
              Verificando acesso...
            </h1>

            <p className="mt-4 leading-relaxed text-slate-400">
              Estamos verificando a autorização para
              redefinir sua senha.
            </p>
          </div>
        </div>
      </main>
    );
  }

  /* LINK INVÁLIDO */

  if (!recoveryValid) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[140px]" />

          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-slate-800 bg-slate-900/60 shadow-2xl backdrop-blur-xl">
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
                Não foi possível verificar este link
              </h1>

              <p className="mt-4 leading-relaxed text-slate-400">
                Este link de recuperação é inválido ou
                expirou. Solicite um novo link para
                redefinir sua senha.
              </p>

              <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/50 p-5 text-left">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-400" />

                  <p className="text-sm leading-relaxed text-slate-400">
                    Volte para a página de login e
                    solicite um novo link de recuperação
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

            <div className="border-t border-slate-800 px-6 py-5 text-center text-xs text-slate-500">
              © 2026 DecidlyAI
            </div>
          </div>
        </div>
      </main>
    );
  }

  /* SUCESSO */

  if (success) {
    return (
      <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

          <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
        </div>

        <div className="relative flex min-h-screen items-center justify-center px-6">
          <div className="w-full max-w-md rounded-[2rem] border border-slate-800 bg-slate-900/60 p-8 text-center shadow-2xl backdrop-blur-xl md:p-10">
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
              Sua senha foi alterada com sucesso.
              Agora você já pode entrar novamente na
              sua conta.
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
      </main>
    );
  }

  /* PÁGINA PRINCIPAL */

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -left-40 top-[600px] h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -right-40 top-[800px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl">
        {/* PAINEL ESQUERDO */}

        <section className="hidden w-1/2 flex-col justify-between border-r border-slate-800 p-12 lg:flex">
          <div>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />

              Voltar para o login
            </Link>
          </div>

          <div className="max-w-lg">
            <Brand />

            <div className="mt-12 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
              <Sparkles className="h-4 w-4" />

              Segurança da sua conta
            </div>

            <h1 className="mt-6 text-5xl font-bold leading-tight tracking-tight">
              Sua segurança
              <span className="block text-violet-400">
                também importa.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              Crie uma nova senha e recupere o acesso à
              sua conta para continuar tomando decisões
              com mais clareza.
            </p>

            <div className="mt-10 space-y-5">
              <Feature
                icon={
                  <ShieldCheck className="h-5 w-5" />
                }
                text="Recuperação segura da sua conta"
              />

              <Feature
                icon={
                  <KeyRound className="h-5 w-5" />
                }
                text="Escolha uma nova senha protegida"
              />

              <Feature
                icon={
                  <ArrowRight className="h-5 w-5" />
                }
                text="Volte a acessar o DecidlyAI"
              />
            </div>
          </div>

          <p className="text-sm text-slate-500">
            © 2026 DecidlyAI
          </p>
        </section>

        {/* FORMULÁRIO */}

        <section className="flex flex-1 items-center justify-center px-6 py-12 sm:px-10">
          <div className="w-full max-w-md">
            {/* TOPO MOBILE */}

            <div className="mb-10 flex items-center justify-between lg:hidden">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />

                Voltar
              </Link>

              <Brand />
            </div>

            {/* CABEÇALHO */}

            <div>
              <p className="text-sm font-semibold tracking-wider text-violet-400">
                RECUPERAÇÃO DE SENHA
              </p>

              <h1 className="mt-3 text-4xl font-bold tracking-tight">
                Crie uma nova senha
              </h1>

              <p className="mt-4 leading-relaxed text-slate-400">
                Escolha uma senha segura para recuperar
                o acesso à sua conta.
              </p>
            </div>

            {/* SESSÃO VERIFICADA */}

            <div className="mt-7 flex items-start gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <ShieldCheck className="h-5 w-5" />
              </div>

              <div>
                <p className="font-semibold text-white">
                  Recuperação verificada
                </p>

                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  Você pode criar uma nova senha para sua
                  conta.
                </p>
              </div>
            </div>

            {/* FORM */}

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
                    value={password}
                    onChange={(event) =>
                      setPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Digite sua nova senha"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Digite sua nova senha novamente"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 py-3.5 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
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
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
                  {errorMessage}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />

                    Salvando...
                  </>
                ) : (
                  <>
                    Salvar nova senha

                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Feature({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-400">
        {icon}
      </div>

      <span className="text-sm text-slate-400">
        {text}
      </span>
    </div>
  );
}