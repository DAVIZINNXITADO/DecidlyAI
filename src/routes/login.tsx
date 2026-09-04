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
} from "lucide-react";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

type Language = "pt" | "en";
type Mode = "login" | "signup";

/*
  O idioma continua preparado aqui.

  No futuro, o valor de "language" pode vir das
  configurações do usuário dentro do aplicativo.

  Exemplo futuro:
  const language = userSettings.language;
*/

const translations = {
  pt: {
    back: "Voltar",

    welcome: "Entrar",
    loginSubtitle:
      "Bem-vindo de volta! Acesse sua conta para continuar.",

    createAccount: "Criar conta",
    signupSubtitle:
      "Crie sua conta e comece a tomar decisões com mais clareza.",

    google: "Continuar com Google",
    or: "OU CONTINUE COM EMAIL",

    name: "Nome",
    namePlaceholder: "Como podemos te chamar?",

    email: "E-mail",
    emailPlaceholder: "seuemail@exemplo.com",
    emailHint:
      "Use um e-mail ao qual você tenha acesso.",

    password: "Senha",
    passwordPlaceholder: "Digite sua senha",
    passwordHint:
      "Digite a senha usada na sua conta.",

    confirmPassword: "Confirmar senha",
    confirmPasswordPlaceholder:
      "Digite sua senha novamente",

    forgotPassword: "Esqueci minha senha",

    signIn: "Entrar na minha conta",
    signUp: "Criar minha conta",

    noAccount:
      "Ainda não possui uma conta?",

    alreadyAccount:
      "Já possui uma conta?",

    signupLink: "Criar conta",
    signinLink: "Entrar",

    loading: "Aguarde...",

    passwordsDontMatch:
      "As senhas não coincidem.",

    loginError:
      "Não foi possível fazer login. Verifique seus dados.",

    connectionError:
      "Não foi possível conectar ao servidor. Tente novamente.",

    signupSuccess:
      "Conta criada com sucesso! Verifique seu e-mail para confirmar sua conta.",

    forgotPasswordMessage:
      "Digite seu e-mail primeiro para receber as instruções de recuperação.",

    resetSent:
      "Enviamos um e-mail com instruções para redefinir sua senha.",

    terms:
      "Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.",

    brandTag:
      "AI DECISION INTELLIGENCE",

    brandText:
      "Menos dúvidas. Melhores decisões.",

    brandDescription:
      "Organize possibilidades, analise consequências e tome decisões com mais clareza.",

    feature1:
      "Organize seus pensamentos",

    feature2:
      "Compare diferentes possibilidades",

    feature3:
      "Decida com mais clareza",
  },

  en: {
    back: "Back",

    welcome: "Sign in",
    loginSubtitle:
      "Welcome back! Access your account to continue.",

    createAccount: "Create account",
    signupSubtitle:
      "Create your account and start making clearer decisions.",

    google: "Continue with Google",
    or: "OR CONTINUE WITH EMAIL",

    name: "Name",
    namePlaceholder:
      "What should we call you?",

    email: "Email",
    emailPlaceholder:
      "you@example.com",

    emailHint:
      "Use an email address you have access to.",

    password: "Password",
    passwordPlaceholder:
      "Enter your password",

    passwordHint:
      "Enter the password used for your account.",

    confirmPassword:
      "Confirm password",

    confirmPasswordPlaceholder:
      "Enter your password again",

    forgotPassword:
      "Forgot password?",

    signIn:
      "Sign in to my account",

    signUp:
      "Create my account",

    noAccount:
      "Don't have an account?",

    alreadyAccount:
      "Already have an account?",

    signupLink:
      "Create account",

    signinLink:
      "Sign in",

    loading:
      "Please wait...",

    passwordsDontMatch:
      "Passwords do not match.",

    loginError:
      "Unable to sign in. Please check your details.",

    connectionError:
      "Unable to connect to the server. Please try again.",

    signupSuccess:
      "Account created successfully! Please check your email to confirm your account.",

    forgotPasswordMessage:
      "Enter your email first to receive password recovery instructions.",

    resetSent:
      "We sent you an email with instructions to reset your password.",

    terms:
      "By continuing, you agree to our Terms of Service and Privacy Policy.",

    brandTag:
      "AI DECISION INTELLIGENCE",

    brandText:
      "Less doubt. Better decisions.",

    brandDescription:
      "Organize possibilities, analyze consequences and make clearer decisions.",

    feature1:
      "Organize your thoughts",

    feature2:
      "Compare different possibilities",

    feature3:
      "Make clearer decisions",
  },
};

function LoginPage() {
  const navigate = useNavigate();

  /*
    Preparado para o futuro.

    Depois esse idioma pode vir das configurações
    globais do usuário.
  */
  const [language] =
    useState<Language>("pt");

  const [mode, setMode] =
    useState<Mode>("login");

  const [name, setName] =
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

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const isSignup =
    mode === "signup";

  const t =
    translations[language];

  function clearMessages() {
    setMessage("");
    setErrorMessage("");
  }

  function changeMode(
    newMode: Mode
  ) {
    setMode(newMode);

    clearMessages();

    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    clearMessages();

    if (
      isSignup &&
      password !== confirmPassword
    ) {
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
          setErrorMessage(
            error.message
          );

          return;
        }

        setMessage(
          t.signupSuccess
        );

        setPassword("");
        setConfirmPassword("");
      } else {
        const { error } =
          await supabase.auth.signInWithPassword({
            email,
            password,
          });

        if (error) {
          setErrorMessage(
            error.message ||
              t.loginError
          );

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
        setErrorMessage(
          error.message
        );

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

    if (!email) {
      setMessage(
        t.forgotPasswordMessage
      );

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          }
        );

      if (error) {
        setErrorMessage(
          error.message
        );
      } else {
        setMessage(
          t.resetSent
        );
      }
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

        <div className="absolute -left-48 -top-48 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute -bottom-48 -right-48 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />

        <div className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl">

        {/* DESKTOP BRAND PANEL */}

        <section className="hidden w-1/2 flex-col justify-between border-r border-border/60 px-12 py-10 lg:flex xl:px-16">

          {/* BACK */}

          <Link
            to="/"
            className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />

            {t.back}
          </Link>

          {/* BRAND CONTENT */}

          <div className="max-w-xl">

            {/* LOGO */}

            <div className="mb-12 flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">

                <BrainCircuit className="h-7 w-7" />

              </div>

              <span className="text-3xl font-bold tracking-tight">

                Decidly
                <span className="text-primary">
                  IA
                </span>

              </span>

            </div>

            {/* TAG */}

            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-xs font-semibold tracking-wider text-primary">

              <Sparkles className="h-4 w-4" />

              {t.brandTag}

            </div>

            {/* TITLE */}

            <h1 className="max-w-lg text-5xl font-bold leading-[1.1] tracking-tight xl:text-6xl">

              {t.brandText}

            </h1>

            {/* DESCRIPTION */}

            <p className="mt-7 max-w-lg text-lg leading-relaxed text-muted-foreground">

              {t.brandDescription}

            </p>

            {/* FEATURES */}

            <div className="mt-12 space-y-5">

              {[
                t.feature1,
                t.feature2,
                t.feature3,
              ].map((feature) => (

                <div
                  key={feature}
                  className="flex items-center gap-4"
                >

                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">

                    <span className="text-sm font-bold">
                      ✓
                    </span>

                  </div>

                  <span className="text-base text-muted-foreground">

                    {feature}

                  </span>

                </div>

              ))}

            </div>

          </div>

          {/* FOOTER */}

          <p className="text-sm text-muted-foreground">

            © 2026 DecidlyIA

          </p>

        </section>

        {/* AUTH SIDE */}

        <section className="flex min-h-screen flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-12 lg:px-12">

          <div className="w-full max-w-md">

            {/* MOBILE HEADER */}

            <div className="mb-10 flex items-center justify-between lg:hidden">

              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
              >

                <ArrowLeft className="h-4 w-4" />

                {t.back}

              </Link>

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">

                  <BrainCircuit className="h-5 w-5" />

                </div>

                <span className="text-lg font-bold tracking-tight">

                  Decidly
                  <span className="text-primary">
                    IA
                  </span>

                </span>

              </div>

            </div>

            {/* AUTH CARD */}

            <div className="rounded-3xl border border-border/70 bg-card/80 p-6 shadow-2xl backdrop-blur-xl sm:p-9">

              {/* HEADER */}

              <div>

                <p className="text-xs font-bold tracking-[0.22em] text-primary">

                  DECIDLYIA

                </p>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">

                  {isSignup
                    ? t.createAccount
                    : t.welcome}

                </h1>

                <p className="mt-4 text-base leading-relaxed text-muted-foreground">

                  {isSignup
                    ? t.signupSubtitle
                    : t.loginSubtitle}

                </p>

              </div>

              {/* GOOGLE */}

              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={
                  googleLoading ||
                  loading
                }
                className="mt-8 flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border border-border bg-background px-5 py-4 font-semibold transition hover:bg-muted/70 disabled:cursor-not-allowed disabled:opacity-60"
              >

                {googleLoading ? (

                  <Loader2 className="h-5 w-5 animate-spin" />

                ) : (

                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-sm font-bold text-black">

                    G

                  </span>

                )}

                <span>

                  {t.google}

                </span>

              </button>

              {/* DIVIDER */}

              <div className="my-8 flex items-center gap-4">

                <div className="h-px flex-1 bg-border" />

                <span className="whitespace-nowrap text-[10px] font-bold tracking-[0.14em] text-muted-foreground">

                  {t.or}

                </span>

                <div className="h-px flex-1 bg-border" />

              </div>

              {/* FORM */}

              <form
                onSubmit={handleSubmit}
                className="space-y-6"
              >

                {/* NAME */}

                {isSignup && (

                  <div>

                    <label className="mb-3 block text-sm font-semibold">

                      {t.name}

                    </label>

                    <div className="relative">

                      <User className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) =>
                          setName(
                            e.target.value
                          )
                        }
                        placeholder={
                          t.namePlaceholder
                        }
                        className="min-h-14 w-full rounded-2xl border border-border bg-background px-5 py-4 pl-13 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />

                    </div>

                  </div>

                )}

                {/* EMAIL */}

                <div>

                  <label className="mb-3 block text-sm font-semibold">

                    {t.email}

                  </label>

                  <div className="relative">

                    <Mail className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) =>
                        setEmail(
                          e.target.value
                        )
                      }
                      placeholder={
                        t.emailPlaceholder
                      }
                      className="min-h-14 w-full rounded-2xl border border-border bg-background px-5 py-4 pl-13 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />

                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">

                    {t.emailHint}

                  </p>

                </div>

                {/* PASSWORD */}

                <div>

                  <div className="mb-3 flex items-center justify-between gap-4">

                    <label className="text-sm font-semibold">

                      {t.password}

                    </label>

                    {!isSignup && (

                      <button
                        type="button"
                        onClick={
                          handleForgotPassword
                        }
                        disabled={loading}
                        className="shrink-0 text-sm font-semibold text-primary transition hover:opacity-80 disabled:opacity-60"
                      >

                        {t.forgotPassword}

                      </button>

                    )}

                  </div>

                  <div className="relative">

                    <KeyRound className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                    <input
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      required
                      minLength={6}
                      autoComplete={
                        isSignup
                          ? "new-password"
                          : "current-password"
                      }
                      value={password}
                      onChange={(e) =>
                        setPassword(
                          e.target.value
                        )
                      }
                      placeholder={
                        t.passwordPlaceholder
                      }
                      className="min-h-14 w-full rounded-2xl border border-border bg-background px-5 py-4 pl-13 pr-14 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (current) =>
                            !current
                        )
                      }
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                      aria-label={
                        showPassword
                          ? "Ocultar senha"
                          : "Mostrar senha"
                      }
                    >

                      {showPassword ? (

                        <EyeOff className="h-5 w-5" />

                      ) : (

                        <Eye className="h-5 w-5" />

                      )}

                    </button>

                  </div>

                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">

                    {t.passwordHint}

                  </p>

                </div>

                {/* CONFIRM PASSWORD */}

                {isSignup && (

                  <div>

                    <label className="mb-3 block text-sm font-semibold">

                      {t.confirmPassword}

                    </label>

                    <div className="relative">

                      <KeyRound className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />

                      <input
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
                        onChange={(e) =>
                          setConfirmPassword(
                            e.target.value
                          )
                        }
                        placeholder={
                          t.confirmPasswordPlaceholder
                        }
                        className="min-h-14 w-full rounded-2xl border border-border bg-background px-5 py-4 pl-13 pr-14 text-base outline-none transition placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            (current) =>
                              !current
                          )
                        }
                        className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                        aria-label={
                          showConfirmPassword
                            ? "Ocultar senha"
                            : "Mostrar senha"
                        }
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

                {/* ERROR MESSAGE */}

                {errorMessage && (

                  <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm leading-relaxed text-destructive">

                    {errorMessage}

                  </div>

                )}

                {/* SUCCESS MESSAGE */}

                {message && (

                  <div className="rounded-2xl border border-primary/20 bg-primary/10 px-5 py-4 text-sm leading-relaxed text-foreground">

                    {message}

                  </div>

                )}

                {/* SUBMIT */}

                <button
                  type="submit"
                  disabled={
                    loading ||
                    googleLoading
                  }
                  className="flex min-h-15 w-full items-center justify-center gap-3 rounded-2xl bg-primary px-6 py-4 text-base font-semibold text-primary-foreground shadow-xl shadow-primary/20 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
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

              {/* MODE SWITCH */}

              <div className="mt-8 border-t border-border/60 pt-7 text-center text-base text-muted-foreground">

                {isSignup ? (

                  <>

                    {t.alreadyAccount}{" "}

                    <button
                      type="button"
                      onClick={() =>
                        changeMode(
                          "login"
                        )
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
                        changeMode(
                          "signup"
                        )
                      }
                      className="font-semibold text-primary transition hover:opacity-80"
                    >

                      {t.signupLink}

                    </button>

                  </>

                )}

              </div>

            </div>

            {/* TERMS */}

            <p className="mx-auto mt-7 max-w-sm text-center text-xs leading-relaxed text-muted-foreground">

              {t.terms}

            </p>

          </div>

        </section>

      </div>

    </main>
  );
}