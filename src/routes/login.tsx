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
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { supabase } from "../lib/supabase";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (
            configuration: {
              client_id: string;
              callback: (
                response: GoogleCredentialResponse,
              ) => void;
              auto_select?: boolean;
              cancel_on_tap_outside?: boolean;
            },
          ) => void;

          renderButton: (
            parent: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?:
                | "outline"
                | "filled_blue"
                | "filled_black";
              size?:
                | "large"
                | "medium"
                | "small";
              text?:
                | "signin_with"
                | "signup_with"
                | "continue_with"
                | "signin";
              shape?:
                | "rectangular"
                | "pill"
                | "circle"
                | "square";
              logo_alignment?:
                | "left"
                | "center";
              width?: number;
              locale?: string;
            },
          ) => void;

          prompt: () => void;
        };
      };
    };
  }
}

type GoogleCredentialResponse = {
  credential: string;
  select_by?: string;
};

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

const GOOGLE_CLIENT_ID =
  "895354448430-qs5ilh31kgp5qqlb0c6s6abiag9s8vti.apps.googleusercontent.com";

function LoginPage() {
  const navigate = useNavigate();

  const googleButtonRef =
    useRef<HTMLDivElement>(null);

  const googleInitializedRef =
    useRef(false);

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
    googleReady,
    setGoogleReady,
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
   * GOOGLE IDENTITY SERVICES OFICIAL
   *
   * Mantemos o botão oficial do Google.
   * A largura é calculada conforme o
   * container para funcionar bem em
   * desktop e celular.
   */

  useEffect(() => {
    if (isRecover) {
      return;
    }

    let cancelled = false;
    let resizeObserver:
      | ResizeObserver
      | undefined;

    async function handleGoogleCredential(
      response: GoogleCredentialResponse,
    ) {
      clearFeedback();

      if (!response.credential) {
        showError(
          "Não foi possível receber a credencial do Google.",
        );

        return;
      }

      setGoogleLoading(true);

      try {
        const { error } =
          await supabase.auth.signInWithIdToken({
            provider: "google",
            token: response.credential,
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
              "O login com o Google ainda não está ativado.",
            );
          } else {
            showError(
              error.message,
            );
          }

          return;
        }

        navigate({
          to: "/",
        });
      } catch {
        showError(
          "Não foi possível concluir o login com o Google.",
        );
      } finally {
        setGoogleLoading(false);
      }
    }

    function renderGoogleButton() {
      if (
        cancelled ||
        !window.google ||
        !googleButtonRef.current
      ) {
        return;
      }

      const container =
        googleButtonRef.current;

      const containerWidth =
        Math.floor(
          container.getBoundingClientRect()
            .width,
        );

      if (containerWidth < 200) {
        return;
      }

      /*
       * O Google recomenda valores inteiros.
       * Limitamos a largura para manter o botão
       * proporcional ao card.
       */

      const buttonWidth =
        Math.max(
          200,
          Math.min(
            containerWidth,
            500,
          ),
        );

      try {
        if (
          !googleInitializedRef.current
        ) {
          window.google.accounts.id.initialize({
            client_id:
              GOOGLE_CLIENT_ID,
            callback:
              handleGoogleCredential,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          googleInitializedRef.current =
            true;
        }

        container.innerHTML = "";

        window.google.accounts.id.renderButton(
          container,
          {
            type: "standard",
            theme: "outline",
            size: "large",
            shape: "rectangular",
            text: "continue_with",
            logo_alignment: "left",
            width: buttonWidth,
            locale: "pt-BR",
          },
        );

        if (!cancelled) {
          setGoogleReady(true);
        }
      } catch {
        if (!cancelled) {
          setGoogleReady(false);

          showError(
            "Não foi possível carregar o botão do Google.",
          );
        }
      }
    }

    function loadGoogleScript() {
      const existingScript =
        document.getElementById(
          "google-identity-services",
        );

      if (window.google) {
        requestAnimationFrame(
          renderGoogleButton,
        );

        return;
      }

      if (existingScript) {
        existingScript.addEventListener(
          "load",
          renderGoogleButton,
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
        "google-identity-services";

      script.src =
        "https://accounts.google.com/gsi/client";

      script.async = true;
      script.defer = true;

      script.onload =
        renderGoogleButton;

      script.onerror = () => {
        if (!cancelled) {
          setGoogleReady(false);

          showError(
            "Não foi possível carregar o Google. Verifique sua conexão e tente novamente.",
          );
        }
      };

      document.head.appendChild(
        script,
      );
    }

    loadGoogleScript();

    /*
     * Se o usuário mudar o tamanho da janela,
     * renderizamos novamente para o botão
     * continuar acompanhando o formulário.
     */

    if (
      googleButtonRef.current &&
      typeof ResizeObserver !==
        "undefined"
    ) {
      let resizeTimeout:
        ReturnType<
          typeof setTimeout
        >;

      resizeObserver =
        new ResizeObserver(() => {
          clearTimeout(
            resizeTimeout,
          );

          resizeTimeout =
            setTimeout(() => {
              renderGoogleButton();
            }, 120);
        });

      resizeObserver.observe(
        googleButtonRef.current,
      );
    }

    return () => {
      cancelled = true;

      resizeObserver?.disconnect();
    };
  }, [
    isRecover,
    navigate,
  ]);

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
            "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada.",
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

    if (
      !cleanEmail ||
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
          "Não foi possível concluir a criação da conta.",
        );

        return;
      }

      if (!data.session) {
        showSuccess(
          "Conta criada! Verifique seu e-mail e confirme sua conta antes de entrar.",
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
            "Muitas tentativas seguidas. Aguarde alguns minutos.",
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

      <div className="relative z-10 mx-auto w-full max-w-6xl">
        <Link
          to="/"
          className="interactive-lift inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />

          Voltar para o início
        </Link>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-xl flex-col items-center justify-center py-10">
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
                <InputField
                  id="verify-email"
                  label="E-mail"
                  type="email"
                  value={verifyEmail}
                  onChange={setVerifyEmail}
                  placeholder="seuemail@exemplo.com"
                  icon={
                    <Mail className="h-5 w-5" />
                  }
                />

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

              {/* GOOGLE OFICIAL */}

              <div className="mt-9">
                <div className="relative min-h-[44px] w-full">
                  {!googleReady ? (
                    <div className="absolute inset-0 flex h-[44px] items-center justify-center rounded-lg border border-slate-700 bg-white">
                      <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                    </div>
                  ) : null}

                  <div
                    ref={googleButtonRef}
                    className={`relative z-10 flex w-full justify-center transition-opacity ${
                      googleReady
                        ? "opacity-100"
                        : "opacity-0"
                    } ${
                      googleLoading
                        ? "pointer-events-none opacity-60"
                        : ""
                    }`}
                  />
                </div>

                {googleLoading ? (
                  <p className="mt-3 text-center text-xs text-slate-400">
                    Entrando com Google...
                  </p>
                ) : null}
              </div>

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
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    show={showConfirmPassword}
                    setShow={setShowConfirmPassword}
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
  setShow: React.Dispatch<
    React.SetStateAction<boolean>
  >;
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