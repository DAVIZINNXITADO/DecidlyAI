import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
} from "lucide-react";
import {
  useState,
  type FormEvent,
} from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Mode =
  | "login"
  | "signup"
  | "recover";

type Feedback = {
  type: "success" | "error";
  message: string;
} | null;

function LoginPage() {
  const navigate = useNavigate();

  const [mode, setMode] =
    useState<Mode>("login");

  const [name, setName] =
    useState("");

  const [username, setUsername] =
    useState("");

  const [email, setEmail] =
    useState("");

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

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    verifyEmail,
    setVerifyEmail,
  ] = useState("");

  const [
    verifyLoading,
    setVerifyLoading,
  ] = useState(false);

  const [feedback, setFeedback] =
    useState<Feedback>(null);

  const isSignUp =
    mode === "signup";

  const isRecover =
    mode === "recover";

  function clearFeedback() {
    setFeedback(null);
  }

  function changeMode(
    newMode: Mode,
  ) {
    setMode(newMode);

    clearFeedback();

    setPassword("");
    setConfirmPassword("");
  }

  function updateUsername(
    value: string,
  ) {
    const sanitized =
      value.replace(
        /[^a-zA-Z0-9._-]/g,
        "",
      );

    setUsername(sanitized);
  }

  function showError(
    message: string,
  ) {
    setFeedback({
      type: "error",
      message,
    });
  }

  function showSuccess(
    message: string,
  ) {
    setFeedback({
      type: "success",
      message,
    });
  }

  /*
   * LOGIN COM GOOGLE
   *
   * Em vez de carregar o botão externo do Google
   * após a página abrir, usamos um botão próprio
   * que chama diretamente o OAuth do Supabase.
   *
   * Isso elimina o atraso visual do botão e permite
   * que o design seja totalmente consistente com
   * o DecidlyAI.
   */

  async function handleGoogleLogin() {
    clearFeedback();

    setGoogleLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo:
              window.location.origin,
          },
        });

      if (error) {
        const errorMessage =
          error.message.toLowerCase();

        if (
          errorMessage.includes(
            "provider is not enabled",
          )
        ) {
          showError(
            "O login com o Google ainda não está ativado no Supabase.",
          );
        } else {
          showError(
            error.message,
          );
        }

        return;
      }

      /*
       * O Supabase normalmente redireciona o usuário
       * imediatamente para o Google.
       *
       * Esta verificação evita deixar o botão preso
       * em loading caso o redirecionamento não aconteça.
       */
      if (!data.url) {
        setGoogleLoading(false);

        showError(
          "Não foi possível iniciar o login com o Google.",
        );
      }
    } catch {
      setGoogleLoading(false);

      showError(
        "Não foi possível conectar ao Google. Tente novamente.",
      );
    }
  }

  async function handleSignIn() {
    clearFeedback();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (!cleanEmail) {
      showError(
        "Informe seu e-mail.",
      );

      return;
    }

    if (
      !cleanEmail.includes("@")
    ) {
      showError(
        "Informe um e-mail válido.",
      );

      return;
    }

    if (!password) {
      showError(
        "Informe sua senha.",
      );

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        const errorMessage =
          error.message.toLowerCase();

        if (
          errorMessage.includes(
            "invalid login credentials",
          ) ||
          errorMessage.includes(
            "invalid credentials",
          )
        ) {
          showError(
            "E-mail ou senha incorretos.",
          );

          return;
        }

        if (
          errorMessage.includes(
            "email not confirmed",
          ) ||
          errorMessage.includes(
            "email_not_confirmed",
          )
        ) {
          showError(
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar.",
          );

          return;
        }

        showError(
          error.message,
        );

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

    const cleanName =
      name.trim();

    const cleanUsername =
      username
        .trim()
        .toLowerCase();

    const cleanEmail =
      email
        .trim()
        .toLowerCase();

    if (
      cleanName.length < 2
    ) {
      showError(
        "Informe seu nome.",
      );

      return;
    }

    if (
      cleanName.length > 24
    ) {
      showError(
        "O nome pode ter no máximo 24 caracteres.",
      );

      return;
    }

    if (
      cleanUsername.length < 3
    ) {
      showError(
        "O nome de usuário precisa ter pelo menos 3 caracteres.",
      );

      return;
    }

    if (
      cleanUsername.length > 24
    ) {
      showError(
        "O nome de usuário pode ter no máximo 24 caracteres.",
      );

      return;
    }

    if (
      !/^[a-zA-Z0-9._-]+$/.test(
        cleanUsername,
      )
    ) {
      showError(
        "O nome de usuário pode usar apenas letras, números, ponto, hífen ou underline.",
      );

      return;
    }

    if (!cleanEmail) {
      showError(
        "Informe seu e-mail.",
      );

      return;
    }

    if (
      !cleanEmail.includes("@")
    ) {
      showError(
        "Informe um e-mail válido.",
      );

      return;
    }

    if (
      password.length < 6
    ) {
      showError(
        "Sua senha precisa ter pelo menos 6 caracteres.",
      );

      return;
    }

    if (
      password !== confirmPassword
    ) {
      showError(
        "As senhas não são iguais.",
      );

      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo:
              `${window.location.origin}/login`,
            data: {
              name: cleanName,
              username:
                cleanUsername,
            },
          },
        });

      if (error) {
        const errorMessage =
          error.message.toLowerCase();

        if (
          errorMessage.includes(
            "already registered",
          ) ||
          errorMessage.includes(
            "already been registered",
          )
        ) {
          showError(
            "Este e-mail já possui uma conta. Tente entrar.",
          );

          return;
        }

        showError(
          error.message,
        );

        return;
      }

      if (!data.user) {
        showError(
          "Não foi possível concluir a criação da conta. Tente novamente.",
        );

        return;
      }

      if (!data.session) {
        showSuccess(
          "Conta criada com sucesso! Verifique seu e-mail e confirme sua conta antes de entrar.",
        );

        setPassword("");
        setConfirmPassword("");

        setMode("login");

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

  async function handleRecoverySubmit() {
    clearFeedback();

    const cleanEmail =
      verifyEmail
        .trim()
        .toLowerCase();

    if (
      !cleanEmail ||
      !cleanEmail.includes("@")
    ) {
      showError(
        "Informe um e-mail válido.",
      );

      return;
    }

    setVerifyLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          },
        );

      if (error) {
        const errorMessage =
          error.message.toLowerCase();

        if (
          errorMessage.includes(
            "rate limit",
          )
        ) {
          showError(
            "Muitas tentativas seguidas. Aguarde alguns minutos e tente novamente.",
          );

          return;
        }

        showError(
          error.message,
        );

        return;
      }

      showSuccess(
        "Pronto! Se existir uma conta com este e-mail, enviaremos um link para criar uma nova senha.",
      );
    } catch {
      showError(
        "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setVerifyLoading(false);
    }
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (isSignUp) {
      void handleSignUp();

      return;
    }

    void handleSignIn();
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 md:px-8">
      {/* FUNDO LEVE */}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(
              circle 600px at 50% 0%,
              rgba(124, 58, 237, 0.10),
              transparent 72%
            ),
            radial-gradient(
              circle 450px at 0% 100%,
              rgba(109, 40, 217, 0.08),
              transparent 72%
            ),
            radial-gradient(
              circle 450px at 100% 100%,
              rgba(139, 92, 246, 0.08),
              transparent 72%
            )
          `,
        }}
      />

      {/* VOLTAR */}

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <Link
          to="/"
          className="interactive-lift inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />

          Voltar para o início
        </Link>
      </div>

      {/* ÁREA CENTRAL */}

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center py-10">
        {/* LOGO */}

        <Link
          to="/"
          className="interactive-scale group mb-10 flex items-center justify-center gap-3 rounded-2xl"
        >
          <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-lg shadow-black/20 transition-transform duration-200 group-hover:scale-105">
            <img
              src="/favicon.ico"
              alt="DecidlyAI"
              className="h-full w-full object-cover"
            />
          </div>

          <span className="text-3xl font-bold leading-none tracking-tight sm:text-4xl">
            <span className="text-white">
              Decidly
            </span>

            <span className="text-violet-400">
              AI
            </span>
          </span>
        </Link>

        {/* CARD */}

        <section className="w-full rounded-[2rem] border border-slate-800 bg-slate-900/70 p-7 shadow-2xl backdrop-blur-xl sm:p-10">
          {isRecover ? (
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Recuperar senha
              </h1>

              <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
                Digite seu e-mail e enviaremos um
                link para você criar uma nova senha.
              </p>

              {feedback ? (
                <FeedbackBox
                  feedback={feedback}
                />
              ) : null}

              <form
                className="mt-8 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();

                  void handleRecoverySubmit();
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
                        setVerifyEmail(
                          event.target.value,
                        )
                      }
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      maxLength={160}
                      className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading}
                  className="interactive-lift group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {verifyLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />

                      Enviando...
                    </>
                  ) : (
                    <>
                      Enviar link

                      <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <button
                type="button"
                onClick={() =>
                  changeMode("login")
                }
                className="mt-7 w-full rounded-xl py-2 text-center text-sm font-medium text-violet-400 transition hover:text-violet-300"
              >
                Voltar para o login
              </button>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  {isSignUp
                    ? "Criar conta"
                    : "Entrar"}
                </h1>

                <p className="mt-4 text-base leading-relaxed text-slate-400 sm:text-lg">
                  {isSignUp
                    ? "Crie sua conta e comece a tomar decisões com mais clareza."
                    : "Bem-vindo de volta! Acesse sua conta para continuar."}
                </p>
              </div>

              {/* GOOGLE */}

              <div className="mt-9">
                <button
                  type="button"
                  onClick={() =>
                    void handleGoogleLogin()
                  }
                  disabled={
                    googleLoading ||
                    loading
                  }
                  className="interactive-lift group flex h-16 w-full items-center justify-center gap-4 rounded-2xl border border-slate-700 bg-white px-6 text-base font-semibold text-slate-800 shadow-lg shadow-black/10 transition hover:border-violet-300 hover:bg-slate-100 hover:shadow-xl hover:shadow-violet-950/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin text-violet-600" />

                      <span>
                        Abrindo Google...
                      </span>
                    </>
                  ) : (
                    <>
                      <GoogleIcon />

                      <span>
                        {isSignUp
                          ? "Continuar com Google"
                          : "Continuar com Google"}
                      </span>

                      <ArrowRight className="ml-auto h-5 w-5 text-slate-400 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </div>

              {/* DIVISOR */}

              <div className="my-9 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-800" />

                <span className="whitespace-nowrap text-[11px] font-medium tracking-wider text-slate-500">
                  OU CONTINUE COM E-MAIL
                </span>

                <div className="h-px flex-1 bg-slate-800" />
              </div>

              {feedback ? (
                <div className="mb-7">
                  <FeedbackBox
                    feedback={feedback}
                  />
                </div>
              ) : null}

              <form
                className="space-y-6"
                onSubmit={handleSubmit}
              >
                {isSignUp ? (
                  <InputField
                    id="name"
                    label="Nome"
                    value={name}
                    onChange={setName}
                    placeholder="Como podemos te chamar?"
                    icon={
                      <User className="h-5 w-5" />
                    }
                  />
                ) : null}

                {isSignUp ? (
                  <InputField
                    id="username"
                    label="Nome de usuário"
                    value={username}
                    onChange={updateUsername}
                    placeholder="Escolha seu nome de usuário"
                    icon={
                      <User className="h-5 w-5" />
                    }
                  />
                ) : null}

                <InputField
                  id="email"
                  label="E-mail"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="seuemail@exemplo.com"
                  icon={
                    <Mail className="h-5 w-5" />
                  }
                />

                <PasswordField
                  id="password"
                  label="Senha"
                  value={password}
                  onChange={setPassword}
                  show={showPassword}
                  setShow={setShowPassword}
                  autoComplete={
                    isSignUp
                      ? "new-password"
                      : "current-password"
                  }
                />

                {!isSignUp ? (
                  <button
                    type="button"
                    onClick={() => {
                      setVerifyEmail(email);

                      changeMode(
                        "recover",
                      );
                    }}
                    className="rounded-lg py-1 text-sm font-medium text-violet-400 transition hover:text-violet-300"
                  >
                    Esqueci minha senha
                  </button>
                ) : null}

                {isSignUp ? (
                  <PasswordField
                    id="confirm-password"
                    label="Confirmar senha"
                    value={
                      confirmPassword
                    }
                    onChange={
                      setConfirmPassword
                    }
                    show={
                      showConfirmPassword
                    }
                    setShow={
                      setShowConfirmPassword
                    }
                    autoComplete="new-password"
                  />
                ) : null}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    googleLoading
                  }
                  className="interactive-lift group flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 hover:shadow-violet-950/50 disabled:cursor-not-allowed disabled:opacity-60"
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

                      <ArrowRight className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-8 text-center text-sm text-slate-400">
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
                  className="rounded-lg py-1 font-semibold text-violet-400 transition hover:text-violet-300"
                >
                  {isSignUp
                    ? "Entrar"
                    : "Criar conta"}
                </button>
              </p>

              {/* AVISO LEGAL */}

              <p className="mt-7 text-center text-xs leading-relaxed text-slate-500">
                Ao continuar, você concorda com os{" "}

                <Link
                  to="/terms"
                  className="text-slate-400 underline underline-offset-2 transition hover:text-violet-300"
                >
                  Termos de Uso
                </Link>

                {" "}e reconhece nossa{" "}

                <Link
                  to="/privacy"
                  className="text-slate-400 underline underline-offset-2 transition hover:text-violet-300"
                >
                  Política de Privacidade
                </Link>

                {" "}e{" "}

                <Link
                  to="/cookies"
                  className="text-slate-400 underline underline-offset-2 transition hover:text-violet-300"
                >
                  Política de Cookies
                </Link>

                .
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function FeedbackBox({
  feedback,
}: {
  feedback: Exclude<
    Feedback,
    null
  >;
}) {
  return (
    <div
      className={`mt-7 rounded-2xl border p-5 text-sm leading-relaxed ${
        feedback.type === "error"
          ? "border-red-500/30 bg-red-500/10 text-red-300"
          : "border-violet-500/30 bg-violet-500/10 text-violet-200"
      }`}
    >
      {feedback.message}
    </div>
  );
}

function InputField({
  id,
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  icon,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  placeholder: string;
  icon: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
          {icon}
        </div>

        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder={placeholder}
          maxLength={160}
          className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 pl-12 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  setShow,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  show: boolean;
  setShow: (
    value:
      | boolean
      | ((
          current: boolean,
        ) => boolean),
  ) => void;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-sm font-medium text-slate-200"
      >
        {label}
      </label>

      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />

        <input
          id={id}
          type={
            show
              ? "text"
              : "password"
          }
          value={value}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          placeholder="Digite sua senha"
          autoComplete={autoComplete}
          maxLength={1000}
          className="h-14 w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 pl-12 pr-14 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />

        <button
          type="button"
          onClick={() =>
            setShow(
              (current) =>
                !current,
            )
          }
          aria-label={
            show
              ? "Ocultar senha"
              : "Mostrar senha"
          }
          className="interactive-scale absolute right-0 top-0 flex h-14 w-14 items-center justify-center text-slate-500 transition hover:text-white"
        >
          {show ? (
            <EyeOff className="h-5 w-5" />
          ) : (
            <Eye className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="h-6 w-6 shrink-0"
    >
      <path
        fill="#4285F4"
        d="M21.35 12.24c0-.79-.07-1.55-.2-2.28H12v4.32h5.23a4.47 4.47 0 0 1-1.94 2.93v2.8h3.14c1.84-1.69 2.92-4.18 2.92-7.17Z"
      />

      <path
        fill="#34A853"
        d="M12 21.7c2.62 0 4.82-.87 6.43-2.35l-3.14-2.8c-.87.58-1.99.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.89A9.7 9.7 0 0 0 12 21.7Z"
      />

      <path
        fill="#FBBC05"
        d="M6.56 13.46A5.83 5.83 0 0 1 6.25 12c0-.51.09-1 .31-1.46V7.65H3.32A9.7 9.7 0 0 0 2.3 12c0 1.56.37 3.03 1.02 4.35l3.24-2.89Z"
      />

      <path
        fill="#EA4335"
        d="M12 6.53c1.43 0 2.72.49 3.73 1.45l2.8-2.8C16.81 3.57 14.62 2.3 12 2.3a9.7 9.7 0 0 0-8.68 5.35l3.24 2.89C7.33 8.24 9.47 6.53 12 6.53Z"
      />
    </svg>
  );
}