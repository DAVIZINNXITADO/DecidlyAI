import { useState } from "react";
import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  ArrowRight,
  BrainCircuit,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  Sparkles,
  User,
  Languages,
} from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Language = "pt" | "en";
type Mode = "login" | "signup";

const translations = {
  pt: {
    back: "Voltar",

    welcome: "Bem-vindo de volta",
    loginSubtitle: "Entre na sua conta para continuar.",

    createAccount: "Crie sua conta",
    signupSubtitle: "Comece a tomar decisões com mais clareza.",

    google: "Continuar com Google",
    or: "OU CONTINUE COM EMAIL",

    name: "Nome",
    namePlaceholder: "Como podemos te chamar?",

    email: "Email",
    emailPlaceholder: "voce@email.com",

    password: "Senha",
    passwordPlaceholder: "Digite sua senha",

    confirmPassword: "Confirmar senha",
    confirmPasswordPlaceholder: "Digite sua senha novamente",

    forgotPassword: "Esqueci minha senha",

    signIn: "Entrar",
    signUp: "Criar conta",

    noAccount: "Ainda não tem uma conta?",
    alreadyAccount: "Já tem uma conta?",

    signupLink: "Criar conta",
    signinLink: "Entrar",

    loading: "Aguarde...",

    passwordsDontMatch: "As senhas não coincidem.",

    connectionError:
      "Não foi possível conectar ao servidor. Tente novamente.",

    signupSuccess:
      "Conta criada com sucesso! Verifique seu email para confirmar sua conta.",

    forgotPasswordMessage:
      "Digite seu email e enviaremos instruções para redefinir sua senha.",

    resetSent:
      "Enviamos um email com instruções para redefinir sua senha.",

    terms:
      "Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.",

    brandText: "Menos dúvidas. Melhores decisões.",

    brandDescription:
      "Organize possibilidades, analise consequências e tome decisões com mais clareza.",

    feature1: "Organize seus pensamentos",
    feature2: "Compare diferentes possibilidades",
    feature3: "Decida com mais clareza",
  },

  en: {
    back: "Back",

    welcome: "Welcome back",
    loginSubtitle: "Sign in to your account to continue.",

    createAccount: "Create your account",
    signupSubtitle: "Start making clearer decisions.",

    google: "Continue with Google",
    or: "OR CONTINUE WITH EMAIL",

    name: "Name",
    namePlaceholder: "What should we call you?",

    email: "Email",
    emailPlaceholder: "you@email.com",

    password: "Password",
    passwordPlaceholder: "Enter your password",

    confirmPassword: "Confirm password",
    confirmPasswordPlaceholder: "Enter your password again",

    forgotPassword: "Forgot password?",

    signIn: "Sign in",
    signUp: "Create account",

    noAccount: "Don't have an account?",
    alreadyAccount: "Already have an account?",

    signupLink: "Sign up",
    signinLink: "Sign in",

    loading: "Please wait...",

    passwordsDontMatch: "Passwords do not match.",

    connectionError:
      "Unable to connect to the server. Please try again.",

    signupSuccess:
      "Account created successfully! Please check your email to confirm your account.",

    forgotPasswordMessage:
      "Enter your email and we'll send you instructions to reset your password.",

    resetSent:
      "We sent you an email with instructions to reset your password.",

    terms:
      "By continuing, you agree to our Terms of Service and Privacy Policy.",

    brandText: "Less doubt. Better decisions.",

    brandDescription:
      "Organize possibilities, analyze consequences and make clearer decisions.",

    feature1: "Organize your thoughts",
    feature2: "Compare different possibilities",
    feature3: "Make clearer decisions",
  },
};

function LoginPage() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<Language>("pt");
  const [mode, setMode] = useState<Mode>("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] =
    useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] =
    useState("");

  const isSignup = mode === "signup";
  const t = translations[language];

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function changeMode(newMode: Mode) {
    setMode(newMode);

    clearMessages();

    setPassword("");
    setConfirmPassword("");
  }

  function changeLanguage() {
    setLanguage((current) =>
      current === "pt" ? "en" : "pt"
    );
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    clearMessages();

    if (isSignup && password !== confirmPassword) {
      setErrorMessage(
        t.passwordsDontMatch
      );

      return;
    }

    setLoading(true);

    try {
      if (isSignup) {
        const { error } =
          await supabase.auth.signUp({
            email,
            password,

            options: {
              data: {
                name,
              },
            },
          });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        setMessage(t.signupSuccess);
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        navigate({
          to: "/",
        });
      }
    } catch {
      setErrorMessage(
        t.connectionError
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    clearMessages();

    setGoogleLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithOAuth({
          provider: "google",

          options: {
            redirectTo:
              window.location.origin,
          },
        });

      if (error) {
        setErrorMessage(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setErrorMessage(
        t.connectionError
      );

      setGoogleLoading(false);
    }
  }

  async function handleForgotPassword() {
    clearMessages();

    if (!email.trim()) {
      setMessage(
        t.forgotPasswordMessage
      );

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email.trim(),
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setMessage(t.resetSent);
    } catch {
      setErrorMessage(
        t.connectionError
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">

      {/* BACKGROUND */}

      <div className="pointer-events-none absolute inset-0 overflow-hidden">

        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />

      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl">

        {/* LEFT SIDE */}

        <section className="hidden w-1/2 flex-col justify-between border-r p-12 lg:flex">

          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />

            {t.back}
          </Link>

          <div className="max-w-lg">

            <div className="mb-10 flex items-center gap-3">

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">

                <BrainCircuit className="h-6 w-6" />

              </div>

              <span className="text-2xl font-bold tracking-tight">

                Decidly
                <span className="text-primary">
                  IA
                </span>

              </span>

            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">

              <Sparkles className="h-4 w-4 text-primary" />

              AI Decision Intelligence

            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight">

              {t.brandText}

            </h1>

            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">

              {t.brandDescription}

            </p>

            <div className="mt-10 space-y-4">

              {[
                t.feature1,
                t.feature2,
                t.feature3,
              ].map((feature) => (

                <div
                  key={feature}
                  className="flex items-center gap-3"
                >

                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">

                    ✓

                  </div>

                  <span className="text-sm text-muted-foreground">

                    {feature}

                  </span>

                </div>

              ))}

            </div>

          </div>

          <p className="text-sm text-muted-foreground">

            © 2026 DecidlyIA

          </p>

        </section>

        {/* RIGHT SIDE */}

        <section className="flex flex-1 items-center justify-center p-6 sm:p-10">

          <div className="w-full max-w-md">

            {/* TOP BAR */}

            <div className="mb-10 flex items-center justify-between">

              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground lg:hidden"
              >

                <ArrowLeft className="h-4 w-4" />

                {t.back}

              </Link>

              <div className="flex items-center gap-3 lg:hidden">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">

                  <BrainCircuit className="h-5 w-5" />

                </div>

                <span className="font-bold">

                  Decidly
                  <span className="text-primary">
                    IA
                  </span>

                </span>

              </div>

              {/* LANGUAGE */}

              <button
                type="button"
                onClick={changeLanguage}
                className="ml-auto flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
              >

                <Languages className="h-4 w-4" />

                {language === "pt"
                  ? "EN"
                  : "PT"}

              </button>

            </div>

            {/* TITLE */}

            <div>

              <p className="text-xs font-bold tracking-[0.2em] text-primary">

                DECIDLYIA

              </p>

              <h2 className="mt-3 text-3xl font-bold tracking-tight">

                {isSignup
                  ? t.createAccount
                  : t.welcome}

              </h2>

              <p className="mt-3 text-muted-foreground">

                {isSignup
                  ? t.signupSubtitle
                  : t.loginSubtitle}

              </p>

            </div>

            {/* GOOGLE */}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl border bg-card px-4 py-3.5 font-semibold transition hover:bg-muted disabled:opacity-60"
            >

              {googleLoading ? (

                <Loader2 className="h-5 w-5 animate-spin" />

              ) : (

                <span className="flex h-6 w-6 items-center justify-center rounded-full border text-sm font-bold">

                  G

                </span>

              )}

              {t.google}

            </button>

            {/* DIVIDER */}

            <div className="my-8 flex items-center gap-4">

              <div className="h-px flex-1 bg-border" />

              <span className="text-xs font-semibold tracking-wider text-muted-foreground">

                {t.or}

              </span>

              <div className="h-px flex-1 bg-border" />

            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* NAME */}

              {isSignup && (

                <div>

                  <label className="mb-2 block text-sm font-medium">

                    {t.name}

                  </label>

                  <div className="relative">

                    <User className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) =>
                        setName(e.target.value)
                      }
                      placeholder={
                        t.namePlaceholder
                      }
                      className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-primary"
                    />

                  </div>

                </div>

              )}

              {/* EMAIL */}

              <div>

                <label className="mb-2 block text-sm font-medium">

                  {t.email}

                </label>

                <div className="relative">

                  <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) =>
                      setEmail(e.target.value)
                    }
                    placeholder={
                      t.emailPlaceholder
                    }
                    className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-4 outline-none transition focus:ring-2 focus:ring-primary"
                  />

                </div>

              </div>

              {/* PASSWORD */}

              <div>

                <div className="mb-2 flex items-center justify-between">

                  <label className="text-sm font-medium">

                    {t.password}

                  </label>

                  {!isSignup && (

                    <button
                      type="button"
                      onClick={
                        handleForgotPassword
                      }
                      disabled={loading}
                      className="text-sm font-semibold text-primary transition hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60"
                    >

                      {t.forgotPassword}

                    </button>

                  )}

                </div>

                <div className="relative">

                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                  <input
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) =>
                      setPassword(
                        e.target.value
                      )
                    }
                    placeholder={
                      t.passwordPlaceholder
                    }
                    className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-12 outline-none transition focus:ring-2 focus:ring-primary"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowPassword(
                        !showPassword
                      )
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >

                    {showPassword ? (

                      <EyeOff className="h-5 w-5" />

                    ) : (

                      <Eye className="h-5 w-5" />

                    )}

                  </button>

                </div>

              </div>

              {/* CONFIRM PASSWORD */}

              {isSignup && (

                <div>

                  <label className="mb-2 block text-sm font-medium">

                    {t.confirmPassword}

                  </label>

                  <div className="relative">

                    <input
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) =>
                        setConfirmPassword(
                          e.target.value
                        )
                      }
                      placeholder={
                        t.confirmPasswordPlaceholder
                      }
                      className="w-full rounded-xl border bg-background px-4 py-3.5 pr-12 outline-none transition focus:ring-2 focus:ring-primary"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          !showConfirmPassword
                        )
                      }
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >

                      {showConfirmPassword ? (

                        <EyeOff className="h-5 w-5" />

                      ) : (

                        <Eye className="h-5 w-5" />

                      )}

                    </button>

                  </div>

                </div>

              )}

              {/* ERROR */}

              {errorMessage && (

                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">

                  {errorMessage}

                </div>

              )}

              {/* SUCCESS */}

              {message && (

                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm">

                  {message}

                </div>

              )}

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {loading ? (

                  <>

                    <Loader2 className="h-5 w-5 animate-spin" />

                    {t.loading}

                  </>

                ) : (

                  <>

                    {isSignup
                      ? t.signUp
                      : t.signIn}

                    <ArrowRight className="h-5 w-5" />

                  </>

                )}

              </button>

            </form>

            {/* SIGNUP / LOGIN SWITCH */}

            <div className="mt-7 text-center text-sm text-muted-foreground">

              {isSignup ? (

                <>

                  {t.alreadyAccount}{" "}

                  <button
                    type="button"
                    onClick={() =>
                      changeMode("login")
                    }
                    className="font-semibold text-primary transition hover:opacity-80"
                  >

                    {t.signinLink}

                  </button>

                </>

              ) : (

                <>

                  {t.noAccount}{" "}

                  <button
                    type="button"
                    onClick={() =>
                      changeMode("signup")
                    }
                    className="font-semibold text-primary transition hover:opacity-80"
                  >

                    {t.signupLink}

                  </button>

                </>

              )}

            </div>

            {/* TERMS */}

            <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">

              {t.terms}

            </p>

          </div>

        </section>

      </div>

    </main>
  );
}