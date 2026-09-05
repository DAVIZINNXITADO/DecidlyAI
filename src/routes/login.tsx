import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode = "login" | "signup" | "recover";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);

  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);

  const [feedback, setFeedback] = useState<Feedback>(null);

  const isSignUp = mode === "signup";
  const isVerify = mode === "recover";

  function clearFeedback() {
    setFeedback(null);
  }

  function changeMode(newMode: Mode) {
    setMode(newMode);

    clearFeedback();

    setPassword("");
    setConfirmPassword("");
  }

  function updateUsername(value: string) {
    const sanitized = value.replace(/[^a-zA-Z0-9._-]/g, "");

    setUsername(sanitized);
  }

  function showError(message: string) {
    setFeedback({
      type: "error",
      message,
    });
  }

  function showSuccess(message: string) {
    setFeedback({
      type: "success",
      message,
    });
  }

  async function handleSignIn() {
    clearFeedback();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showError("Informe seu e-mail.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      showError("Informe um e-mail válido.");
      return;
    }

    if (!password) {
      showError("Informe sua senha.");
      return;
    }

    if (password.length > 1000) {
      showError("A senha pode ter no máximo 1.000 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("invalid login credentials") ||
          errorMessage.includes("invalid credentials")
        ) {
          showError("E-mail ou senha incorretos.");
          return;
        }

        if (
          errorMessage.includes("email not confirmed") ||
          errorMessage.includes("email_not_confirmed")
        ) {
          showError(
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.",
          );
          return;
        }

        showError(error.message);
        return;
      }

      navigate({
        to: "/",
      });
    } catch {
      showError(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp() {
    clearFeedback();

    const cleanName = name.trim();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    if (cleanName.length < 2) {
      showError("Informe seu nome.");
      return;
    }

    if (cleanName.length > 24) {
      showError("O nome pode ter no máximo 24 caracteres.");
      return;
    }

    if (cleanUsername.length < 3) {
      showError(
        "O nome de usuário precisa ter pelo menos 3 caracteres.",
      );
      return;
    }

    if (cleanUsername.length > 24) {
      showError(
        "O nome de usuário pode ter no máximo 24 caracteres.",
      );
      return;
    }

    if (!/^[a-zA-Z0-9._-]+$/.test(cleanUsername)) {
      showError(
        "O nome de usuário pode usar apenas letras, números, ponto, hífen ou underline.",
      );
      return;
    }

    if (!cleanEmail) {
      showError("Informe seu e-mail.");
      return;
    }

    if (!cleanEmail.includes("@")) {
      showError("Informe um e-mail válido.");
      return;
    }

    if (password.length < 6) {
      showError(
        "Sua senha precisa ter pelo menos 6 caracteres.",
      );
      return;
    }

    if (password.length > 1000) {
      showError(
        "A senha pode ter no máximo 1.000 caracteres.",
      );
      return;
    }

    if (password !== confirmPassword) {
      showError("As senhas não são iguais.");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/login`,
          data: {
            name: cleanName,
            username: cleanUsername,
          },
        },
      });

      if (error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("already registered") ||
          errorMessage.includes("already been registered")
        ) {
          showError(
            "Este e-mail já possui uma conta. Tente entrar.",
          );
          return;
        }

        if (
          errorMessage.includes("error sending confirmation email")
        ) {
          showError(
            "A conta não pôde ser criada porque o Supabase não conseguiu enviar o e-mail de confirmação. Verifique as configurações de autenticação e SMTP no Supabase.",
          );
          return;
        }

        showError(error.message);
        return;
      }

      /*
       * IMPORTANTE:
       *
       * Não fazemos insert/upsert obrigatório em "profiles".
       *
       * O nome e username já foram salvos em user_metadata
       * durante o signUp.
       *
       * Isso evita que uma tabela inexistente ou mal configurada
       * faça o cadastro parecer que falhou.
       */

      if (!data.user) {
        showError(
          "Não foi possível concluir a criação da conta. Tente novamente.",
        );
        return;
      }

      /*
       * Quando a confirmação de e-mail está ativada no Supabase,
       * data.session pode ser null.
       */
      if (!data.session) {
        showSuccess(
          "Conta criada com sucesso! Verifique seu e-mail e confirme sua conta antes de entrar.",
        );

        setPassword("");
        setConfirmPassword("");

        setMode("login");

        return;
      }

      /*
       * Caso a confirmação de e-mail esteja desativada,
       * o Supabase já retorna uma sessão.
       */
      showSuccess("Conta criada com sucesso!");

      navigate({
        to: "/",
      });
    } catch {
      showError(
        "Não foi possível conectar ao servidor. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    clearFeedback();

    setGoogleLoading(true);

    /*
     * Dentro do preview (iframe) o Google bloqueia o redirect,
     * então abrimos o fluxo em uma nova aba.
     */
    const insideIframe = window.top !== window.self;

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
          skipBrowserRedirect: insideIframe,
          queryParams: {
            prompt: "select_account",
          },
        },
      });

      if (error) {
        showError(error.message);
        setGoogleLoading(false);
        return;
      }

      if (insideIframe && data?.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");

        showSuccess(
          "Abrimos o login do Google em uma nova aba. Conclua por lá e volte para cá.",
        );

        setGoogleLoading(false);
      }

      /*
       * Fora do iframe, o navegador é redirecionado
       * automaticamente para o Google.
       */
    } catch {
      showError(
        "Não foi possível iniciar o login com o Google.",
      );

      setGoogleLoading(false);
    }
  }

  async function handleRecoverySubmit() {
    clearFeedback();

    const cleanEmail = verifyEmail.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes("@")) {
      showError("Informe um e-mail válido.");
      return;
    }

    setVerifyLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (error) {
        const errorMessage = error.message.toLowerCase();

        if (errorMessage.includes("rate limit")) {
          showError(
            "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
          );
          return;
        }

        if (errorMessage.includes("error sending recovery email")) {
          showError(
            "O Supabase não conseguiu enviar o e-mail. Verifique as configurações de e-mail e SMTP do projeto.",
          );
          return;
        }

        showError(error.message);
        return;
      }

      showSuccess(
        "Pronto! Se existir uma conta com este e-mail, enviamos um link para criar uma nova senha.",
      );
    } catch {
      showError(
        "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handlePasswordRecovery() {
    clearFeedback();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      showError(
        "Digite seu e-mail primeiro para recuperar sua senha.",
      );
      return;
    }

    if (!cleanEmail.includes("@")) {
      showError("Informe um e-mail válido.");
      return;
    }

    setRecoveryLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo: `${window.location.origin}/reset-password`,
          },
        );

      if (error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("error sending recovery email")
        ) {
          showError(
            "O Supabase não conseguiu enviar o e-mail de recuperação. Verifique as configurações de e-mail e SMTP do projeto.",
          );
          return;
        }

        showError(error.message);
        return;
      }

      showSuccess(
        "Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.",
      );
    } catch {
      showError(
        "Não foi possível solicitar a recuperação de senha.",
      );
    } finally {
      setRecoveryLoading(false);
    }
  }

  function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSignUp) {
      void handleSignUp();
    } else {
      void handleSignIn();
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-5 py-10 text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
      </div>

      <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col items-center justify-center">
        {/* LOGO */}

        <Link
          to="/"
          className="mb-8 flex items-center gap-3 transition-opacity hover:opacity-80"
        >
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-lg">
            <img
              src="/favicon.ico"
              alt="DecidlyIA"
              className="h-full w-full object-contain"
            />
          </div>

          <span className="text-2xl font-bold tracking-tight">
            Decidly
            <span className="text-violet-400">
              IA
            </span>
          </span>
        </Link>

        {/* CARD */}

        <section className="w-full rounded-[2rem] border border-slate-800 bg-slate-900/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {isVerify ? (
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Verificar e-mail
              </h1>

              <p className="mt-3 text-base leading-relaxed text-slate-400">
                Digite seu e-mail e enviaremos um novo link de
                verificação para confirmar sua conta.
              </p>

              {feedback ? (
                <div
                  className={`mt-6 rounded-xl border p-4 text-sm leading-relaxed ${
                    feedback.type === "error"
                      ? "border-red-500/30 bg-red-500/10 text-red-300"
                      : "border-violet-500/30 bg-violet-500/10 text-violet-200"
                  }`}
                >
                  {feedback.message}
                </div>
              ) : null}

              <form
                className="mt-6 space-y-5"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleResendVerification();
                }}
              >
                <div>
                  <label
                    htmlFor="verify-email"
                    className="mb-2 block text-sm font-medium text-slate-200"
                  >
                    E-mail
                  </label>

                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                    <input
                      id="verify-email"
                      type="email"
                      value={verifyEmail}
                      onChange={(event) =>
                        setVerifyEmail(event.target.value)
                      }
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      maxLength={160}
                      className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar e-mail com link
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() => changeMode("login")}
                className="mt-6 w-full text-center text-sm font-medium text-violet-400 transition hover:text-violet-300"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
          {/* HEADER */}

          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {isSignUp
                ? "Criar conta"
                : "Entrar"}
            </h1>

            <p className="mt-3 text-base leading-relaxed text-slate-400">
              {isSignUp
                ? "Crie sua conta e comece a tomar decisões com mais clareza."
                : "Bem-vindo de volta! Acesse sua conta para continuar."}
            </p>
          </div>

          {/* GOOGLE */}

          <button
            type="button"
            onClick={() => {
              void handleGoogleLogin();
            }}
            disabled={googleLoading || loading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-slate-700 bg-white px-4 font-medium text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {googleLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <GoogleIcon />
            )}

            <span>
              {googleLoading
                ? "Conectando..."
                : "Continuar com o Google"}
            </span>
          </button>

          {/* DIVIDER */}

          <div className="my-7 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-800" />

            <span className="text-[11px] font-medium tracking-wider text-slate-500">
              OU CONTINUE COM E-MAIL
            </span>

            <div className="h-px flex-1 bg-slate-800" />
          </div>

          {/* FEEDBACK */}

          {feedback ? (
            <div
              className={`mb-6 rounded-xl border p-4 text-sm leading-relaxed ${
                feedback.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-violet-500/30 bg-violet-500/10 text-violet-200"
              }`}
            >
              {feedback.message}
            </div>
          ) : null}

          {/* FORM */}

          <form
            className="space-y-5"
            onSubmit={handleSubmit}
          >
            {/* NAME */}

            {isSignUp ? (
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Nome
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(event.target.value)
                    }
                    placeholder="Como podemos te chamar?"
                    autoComplete="given-name"
                    maxLength={24}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Como você gostaria de ser chamado?
                </p>
              </div>
            ) : null}

            {/* USERNAME */}

            {isSignUp ? (
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Nome de usuário
                </label>

                <div className="relative">
                  <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(event) =>
                      updateUsername(event.target.value)
                    }
                    placeholder="Escolha seu nome de usuário"
                    autoComplete="username"
                    maxLength={24}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Use letras, números, ponto, hífen ou underline.
                </p>
              </div>
            ) : null}

            {/* EMAIL */}

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                E-mail
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  maxLength={160}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Use um e-mail que você tenha acesso.
              </p>
            </div>

            {/* PASSWORD */}

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-sm font-medium text-slate-200"
              >
                Senha
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
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="Digite sua senha"
                  autoComplete={
                    isSignUp
                      ? "new-password"
                      : "current-password"
                  }
                  maxLength={1000}
                  className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (current) => !current,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                  className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-500 transition hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {isSignUp
                  ? "Sua senha deve ter pelo menos 6 caracteres."
                  : "Digite a senha usada na sua conta."}
              </p>

              {/* FORGOT PASSWORD - ABAIXO DA SENHA */}

              {!isSignUp ? (
                <button
                  type="button"
                  disabled={recoveryLoading}
                  onClick={() => {
                    void handlePasswordRecovery();
                  }}
                  className="mt-4 text-sm font-medium text-violet-400 transition hover:text-violet-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recoveryLoading
                    ? "Enviando link..."
                    : "Esqueci minha senha"}
                </button>
              ) : null}
            </div>

            {/* CONFIRM PASSWORD */}

            {isSignUp ? (
              <div>
                <label
                  htmlFor="confirm-password"
                  className="mb-2 block text-sm font-medium text-slate-200"
                >
                  Confirmar senha
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
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Repita sua senha"
                    autoComplete="new-password"
                    maxLength={1000}
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 pl-12 pr-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (current) => !current,
                      )
                    }
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                    className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-slate-500 transition hover:text-white"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  Digite novamente a mesma senha.
                </p>
              </div>
            ) : null}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={
                loading ||
                googleLoading ||
                recoveryLoading
              }
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />

                  Aguarde...
                </>
              ) : (
                <>
                  {isSignUp
                    ? "Criar minha conta"
                    : "Entrar na minha conta"}

                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>

          {/* MODE SWITCH */}

          <p className="mt-7 text-center text-sm text-slate-400">
            {isSignUp
              ? "Já possui uma conta? "
              : "Ainda não possui uma conta? "}

            <button
              type="button"
              onClick={() =>
                changeMode(
                  isSignUp
                    ? "login"
                    : "signup",
                )
              }
              className="font-semibold text-violet-400 transition hover:text-violet-300"
            >
              {isSignUp
                ? "Entrar"
                : "Criar conta"}
            </button>
          </p>

          {/* LINK PARA VERIFICAÇÃO DE E-MAIL */}

          <p className="mt-3 text-center text-sm text-slate-500">
            Não recebeu o e-mail de confirmação?{" "}
            <button
              type="button"
              onClick={() => changeMode("verify")}
              className="font-semibold text-violet-400 transition hover:text-violet-300"
            >
              Reenviar verificação
            </button>
          </p>
            </>
          )}
        </section>

        <p className="mt-7 text-center text-xs text-slate-600">
          © 2026 DecidlyIA
        </p>
      </div>
    </main>
  );
}

/*
 * Ícone oficial multicolorido do Google.
 *
 * O login continua sendo feito pelo OAuth do Supabase,
 * que é o fluxo correto para o Google no seu projeto.
 */
function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.94v2.79h3.14c1.84-1.69 2.92-4.18 2.92-7.76Z"
      />

      <path
        fill="#34A853"
        d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.79c-.87.58-1.99.92-3.29.92-2.53 0-4.68-1.71-5.45-4.01H3.31v2.88A9.72 9.72 0 0 0 12 21.75Z"
      />

      <path
        fill="#FBBC05"
        d="M6.55 13.51A5.86 5.86 0 0 1 6.25 12c0-.52.09-1.03.3-1.51V7.61H3.31A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.06 1.06 4.39l3.24-2.88Z"
      />

      <path
        fill="#EA4335"
        d="M12 6.48c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.81 3.55 14.61 2.25 12 2.25a9.72 9.72 0 0 0-8.69 5.36l3.24 2.88C7.32 8.19 9.47 6.48 12 6.48Z"
      />
    </svg>
  );
}