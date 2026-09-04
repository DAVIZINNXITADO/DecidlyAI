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
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Languages,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

type Language = "pt" | "en";

const translations = {
  pt: {
    back: "Voltar",
    title: "Crie uma nova senha",
    subtitle: "Escolha uma senha segura para recuperar o acesso à sua conta.",
    password: "Nova senha",
    passwordPlaceholder: "Digite sua nova senha",
    confirmPassword: "Confirmar nova senha",
    confirmPasswordPlaceholder: "Digite sua nova senha novamente",
    savePassword: "Salvar nova senha",
    saving: "Salvando...",
    passwordsDontMatch: "As senhas não coincidem.",
    passwordTooShort: "Sua senha deve ter pelo menos 6 caracteres.",
    successTitle: "Senha atualizada!",
    successMessage: "Sua senha foi alterada com sucesso. Agora você pode entrar na sua conta.",
    goToLogin: "Ir para o login",
    connectionError: "Não foi possível atualizar sua senha. Tente novamente.",
    checkingTitle: "Verificando acesso...",
    checkingMessage: "Estamos verificando a autorização para redefinir sua senha.",
    invalidTokenTitle: "Token de Autenticação Não Informado",
    invalidTokenMessage: "Por Favor Feche Essa Página Imediatamente",
    invalidTokenDescription: "Esta página de recuperação só pode ser acessada através de um link válido enviado para o seu email.",
    goBackToLogin: "Voltar para o login",
    brandText: "Sua segurança também importa.",
    brandDescription: "Proteja sua conta e continue tomando decisões com mais clareza.",
    feature1: "Recuperação segura",
    feature2: "Sua conta protegida",
    feature3: "Acesso rápido novamente",
  },
  en: {
    back: "Back",
    title: "Create a new password",
    subtitle: "Choose a secure password to regain access to your account.",
    password: "New password",
    passwordPlaceholder: "Enter your new password",
    confirmPassword: "Confirm new password",
    confirmPasswordPlaceholder: "Enter your new password again",
    savePassword: "Save new password",
    saving: "Saving...",
    passwordsDontMatch: "Passwords do not match.",
    passwordTooShort: "Your password must be at least 6 characters long.",
    successTitle: "Password updated!",
    successMessage: "Your password has been changed successfully. You can now sign in to your account.",
    goToLogin: "Go to login",
    connectionError: "Unable to update your password. Please try again.",
    checkingTitle: "Verifying access...",
    checkingMessage: "We're verifying your authorization to reset your password.",
    invalidTokenTitle: "Authentication Token Not Provided",
    invalidTokenMessage: "Please Close This Page Immediately",
    invalidTokenDescription: "This recovery page can only be accessed through a valid link sent to your email.",
    goBackToLogin: "Back to login",
    brandText: "Your security matters too.",
    brandDescription: "Protect your account and continue making decisions with more clarity.",
    feature1: "Secure recovery",
    feature2: "Protected account",
    feature3: "Quick access again",
  },
};

function ResetPasswordPage() {
  const navigate = useNavigate();

  const [language, setLanguage] = useState<Language>("pt");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryValid, setRecoveryValid] = useState(false);

  const t = translations[language];

  function changeLanguage() {
    setLanguage((current) => (current === "pt" ? "en" : "pt"));
  }

  useEffect(() => {
    let mounted = true;

    async function checkRecoverySession() {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        setRecoveryValid(!!session);
      } catch {
        if (mounted) setRecoveryValid(false);
      } finally {
        if (mounted) setCheckingRecovery(false);
      }
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === "PASSWORD_RECOVERY" && session) {
        setRecoveryValid(true);
        setCheckingRecovery(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setErrorMessage("");

    if (!recoveryValid) {
      setErrorMessage(t.invalidTokenDescription);
      return;
    }

    if (password.length < 6) {
      setErrorMessage(t.passwordTooShort);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage(t.passwordsDontMatch);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setRecoveryValid(false);
        setErrorMessage(t.invalidTokenDescription);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccess(true);
    } catch {
      setErrorMessage(t.connectionError);
    } finally {
      setLoading(false);
    }
  }

  if (checkingRecovery) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Loader2 className="h-9 w-9 animate-spin" />
          </div>
          <p className="mt-6 text-xs font-bold tracking-[0.2em] text-primary">DECIDLYIA</p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight">{t.checkingTitle}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t.checkingMessage}</p>
        </div>
      </main>
    );
  }

  if (!recoveryValid) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-destructive/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-destructive/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl border bg-card shadow-2xl">
          <div className="h-1.5 w-full bg-destructive" />
          <div className="p-8 text-center sm:p-10">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-destructive/20 bg-destructive/10 text-destructive shadow-sm">
              <ShieldAlert className="h-10 w-10" />
            </div>
            <div className="mt-7 flex justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-4 py-2 text-xs font-bold tracking-wider text-destructive">
                <AlertTriangle className="h-4 w-4" />
                SECURITY WARNING
              </div>
            </div>
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">⚠️ {t.invalidTokenTitle} ⚠️</h1>
            <p className="mt-4 text-lg font-semibold text-destructive">{t.invalidTokenMessage}</p>
            <p className="mt-5 leading-relaxed text-muted-foreground">{t.invalidTokenDescription}</p>
            <div className="my-8 h-px bg-border" />
            <div className="flex items-start gap-3 rounded-2xl border bg-muted/40 p-4 text-left">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm leading-relaxed text-muted-foreground">
                Para redefinir sua senha, solicite um novo link através da página de login e abra o link recebido no seu email.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate({ to: "/login" })}
              className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl border bg-card px-4 py-3.5 font-semibold transition hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
              {t.goBackToLogin}
            </button>
          </div>
          <div className="border-t px-6 py-4 text-center">
            <p className="text-xs text-muted-foreground">© 2026 DecidlyIA · Security protected</p>
          </div>
        </div>
      </main>
    );
  }

  if (success) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6 text-foreground">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
        </div>
        <div className="relative w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-xl sm:p-10">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <p className="mt-6 text-xs font-bold tracking-[0.2em] text-primary">DECIDLYIA</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{t.successTitle}</h1>
          <p className="mt-4 leading-relaxed text-muted-foreground">{t.successMessage}</p>
          <button
            type="button"
            onClick={() => navigate({ to: "/login" })}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90"
          >
            {t.goToLogin}
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl">
        <section className="hidden w-1/2 flex-col justify-between border-r p-12 lg:flex">
          <Link to="/login" className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {t.back}
          </Link>

          <div className="max-w-lg">
            <div className="mb-10 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
                <BrainCircuit className="h-6 w-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight">
                Decidly<span className="text-primary">IA</span>
              </span>
            </div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Decision Intelligence
            </div>

            <h1 className="text-5xl font-bold leading-tight tracking-tight">{t.brandText}</h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{t.brandDescription}</p>

            <div className="mt-10 space-y-4">
              {[
                { icon: ShieldCheck, text: t.feature1 },
                { icon: KeyRound, text: t.feature2 },
                { icon: ArrowRight, text: t.feature3 },
              ].map((feature) => {
                const Icon = feature.icon;
                return (
                  <div key={feature.text} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm text-muted-foreground">{feature.text}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">© 2026 DecidlyIA</p>
        </section>

        <section className="flex flex-1 items-center justify-center p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-10 flex items-center justify-between">
              <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground lg:hidden">
                <ArrowLeft className="h-4 w-4" />
                {t.back}
              </Link>

              <div className="flex items-center gap-3 lg:hidden">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <BrainCircuit className="h-5 w-5" />
                </div>
                <span className="font-bold">
                  Decidly<span className="text-primary">IA</span>
                </span>
              </div>

              <button
                type="button"
                onClick={changeLanguage}
                className="ml-auto flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium transition hover:bg-muted"
              >
                <Languages className="h-4 w-4" />
                {language === "pt" ? "EN" : "PT"}
              </button>
            </div>

            <div>
              <p className="text-xs font-bold tracking-[0.2em] text-primary">DECIDLYIA</p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight">{t.title}</h1>
              <p className="mt-3 leading-relaxed text-muted-foreground">{t.subtitle}</p>
            </div>

            <div className="mt-6 flex items-center gap-3 rounded-2xl border bg-primary/5 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold">Secure password recovery</p>
                <p className="mt-1 text-xs text-muted-foreground">Your recovery session has been verified.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium">{t.password}</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.passwordPlaceholder}
                    className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-12 outline-none transition focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">{t.confirmPassword}</label>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t.confirmPasswordPlaceholder}
                    className="w-full rounded-xl border bg-background py-3.5 pl-12 pr-12 outline-none transition focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 font-semibold text-primary-foreground shadow-lg transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    {t.savePassword}
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