import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff, KeyRound, Mail, User } from "lucide-react";
import { useState, type ElementType } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  modo: z.enum(["entrar", "cadastro"]).optional().catch("entrar"),
});

export const Route = createFileRoute("/login")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar | DecidlyIA" },
      {
        name: "description",
        content:
          "Entre ou crie sua conta no DecidlyIA para tomar decisões com mais clareza.",
      },
    ],
  }),
  component: LoginPage,
});

const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome").max(50, "O nome pode ter no máximo 50 caracteres"),
    username: z
      .string()
      .trim()
      .min(3, "O nome de usuário precisa ter pelo menos 3 caracteres")
      .max(24, "O nome de usuário pode ter no máximo 24 caracteres")
      .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou underline"),
    email: z.string().trim().email("Informe um e-mail válido").max(160, "O e-mail pode ter no máximo 160 caracteres"),
    password: z.string().min(6, "A senha precisa ter pelo menos 6 caracteres").max(1000, "A senha pode ter no máximo 1.000 caracteres"),
    confirm: z.string().max(1000, "A confirmação pode ter no máximo 1.000 caracteres"),
  })
  .refine((data) => data.password === data.confirm, {
    message: "As senhas não são iguais",
    path: ["confirm"],
  });

function LoginPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const isSignUp = modo === "cadastro";

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirm: "",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((previous) => ({ ...previous, [key]: value }));
  }

  async function handleSignUp() {
    const parsed = signUpSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Verifique os dados informados");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          data: {
            name: parsed.data.name,
            username: parsed.data.username.toLowerCase(),
          },
        },
      });

      if (error) {
        toast.error(
          error.message.includes("already registered")
            ? "Este e-mail já possui uma conta. Tente entrar."
            : error.message,
        );
        return;
      }

      if (data.user) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.user.id,
            name: parsed.data.name,
            username: parsed.data.username.toLowerCase(),
          },
          { onConflict: "id" },
        );
        if (profileError) {
          console.error("Erro ao criar perfil:", profileError);
        }
      }

      if (data.session) {
        toast.success("Conta criada com sucesso!");
        navigate({ to: "/" });
        return;
      }

      toast.success("Conta criada com sucesso! Agora você pode entrar.");
      navigate({ to: "/login", search: { modo: "entrar" } });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível criar sua conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    const email = form.email.trim().toLowerCase();
    if (!email) {
      toast.error("Informe seu e-mail");
      return;
    }
    if (!form.password) {
      toast.error("Informe sua senha");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (error) {
        toast.error("E-mail ou senha incorretos");
        return;
      }
      toast.success("Login realizado com sucesso!");
      navigate({ to: "/" });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível entrar na sua conta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível continuar com o Google.");
      setGoogleLoading(false);
    }
  }

  async function handlePasswordRecovery() {
    const email = recoveryEmail.trim().toLowerCase();
    if (!email) {
      toast.error("Informe o e-mail da sua conta.");
      return;
    }
    if (!email.includes("@")) {
      toast.error("Informe um e-mail válido.");
      return;
    }

    setRecoveryLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;

      toast.success("Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.");
      setRecoveryEmail("");
      setShowRecovery(false);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível enviar o e-mail de recuperação.");
    } finally {
      setRecoveryLoading(false);
    }
  }

  if (showRecovery) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#12071f] px-5 py-10 text-white">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-[-15rem] top-[-15rem] h-[35rem] w-[35rem] rounded-full bg-purple-700/20 blur-[120px]" />
          <div className="absolute bottom-[-20rem] right-[-15rem] h-[40rem] w-[40rem] rounded-full bg-violet-600/15 blur-[140px]" />
        </div>

        <div className="relative w-full max-w-md">
          <Link to="/" className="mb-10 flex items-center justify-center gap-3 transition-opacity hover:opacity-80">
            <img src="/favicon.ico" alt="DecidlyIA" className="size-11 rounded-xl object-contain" />
            <span className="text-2xl font-semibold tracking-tight">
              Decidly<span className="text-purple-400">IA</span>
            </span>
          </Link>

          <div className="rounded-3xl border border-white/10 bg-[#1b0d2b]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
            <div className="flex items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-purple-500/15">
                <KeyRound className="size-5 text-purple-400" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
                <p className="mt-2 text-sm leading-relaxed text-white/55">
                  Informe o e-mail da sua conta e enviaremos um link seguro para criar uma nova senha.
                </p>
              </div>
            </div>

            <form
              className="mt-8 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                void handlePasswordRecovery();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="recovery-email" className="text-white/80">
                  E-mail da conta
                </Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
                  <Input
                    id="recovery-email"
                    type="email"
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    maxLength={160}
                    className="h-12 border-white/10 bg-white/[0.04] pl-11 text-white placeholder:text-white/30 focus-visible:ring-purple-500"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={recoveryLoading}
                className="h-12 w-full rounded-xl bg-purple-600 font-medium text-white hover:bg-purple-500"
              >
                {recoveryLoading ? "Enviando..." : "Enviar link de recuperação"}
              </Button>
            </form>
          </div>

          <button
            type="button"
            onClick={() => setShowRecovery(false)}
            className="mx-auto mt-7 block text-sm font-medium text-purple-300 transition hover:text-purple-200"
          >
            ← Voltar para entrar
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#12071f] px-5 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-15rem] top-[-15rem] h-[35rem] w-[35rem] rounded-full bg-purple-700/20 blur-[120px]" />
        <div className="absolute bottom-[-20rem] right-[-15rem] h-[40rem] w-[40rem] rounded-full bg-violet-600/15 blur-[140px]" />
        <div className="absolute left-1/2 top-1/2 h-[30rem] w-[30rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-500/[0.03] blur-[100px]" />
      </div>

      <div className="relative w-full max-w-md">
        <Link to="/" className="mb-10 flex items-center justify-center gap-3 transition-opacity hover:opacity-80">
          <img src="/favicon.ico" alt="DecidlyIA" className="size-11 rounded-xl object-contain" />
          <span className="text-2xl font-semibold tracking-tight">
            Decidly<span className="text-purple-400">IA</span>
          </span>
        </Link>

        <div className="rounded-3xl border border-white/10 bg-[#1b0d2b]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-9">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {isSignUp ? "Criar sua conta" : "Bem-vindo de volta"}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/55">
              {isSignUp
                ? "Crie sua conta para começar a tomar decisões com mais clareza."
                : "Entre na sua conta para continuar usando o DecidlyIA."}
            </p>
          </div>

          <button
            type="button"
            onClick={() => void handleGoogleLogin()}
            disabled={googleLoading}
            className="mt-8 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-4 text-sm font-medium text-[#3c4043] shadow-sm transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="#4285F4" d="M21.35 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h5.23a4.47 4.47 0 0 1-1.94 2.94v2.78h3.14c1.84-1.69 2.92-4.18 2.92-7.75Z" />
              <path fill="#34A853" d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.78c-.87.58-1.99.92-3.29.92-2.53 0-4.67-1.71-5.44-4.01H3.32v2.87A9.72 9.72 0 0 0 12 21.75Z" />
              <path fill="#FBBC05" d="M6.56 13.52A5.85 5.85 0 0 1 6.25 12c0-.53.09-1.04.31-1.52V7.61H3.32A9.75 9.75 0 0 0 2.25 12c0 1.57.38 3.05 1.07 4.39l3.24-2.87Z" />
              <path fill="#EA4335" d="M12 6.47c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.81 3.54 14.61 2.25 12 2.25a9.72 9.72 0 0 0-8.68 5.36l3.24 2.87C7.33 8.18 9.47 6.47 12 6.47Z" />
            </svg>
            {googleLoading ? "Conectando..." : "Continuar com o Google"}
          </button>

          <div className="my-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[11px] font-medium tracking-[0.15em] text-white/35">OU</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              void (isSignUp ? handleSignUp() : handleSignIn());
            }}
          >
            {isSignUp && (
              <>
                <Field id="name" label="Nome" value={form.name} onChange={(value) => update("name", value)} placeholder="Como devemos chamar você?" autoComplete="given-name" maxLength={50} icon={User} />
                <Field id="username" label="Nome de usuário" value={form.username} onChange={(value) => update("username", value)} placeholder="Escolha seu nome de usuário" autoComplete="username" maxLength={24} icon={User} />
              </>
            )}

            <Field id="email" label="E-mail" type="email" value={form.email} onChange={(value) => update("email", value)} placeholder="seuemail@exemplo.com" autoComplete="email" maxLength={160} icon={Mail} />

            <PasswordField
              id="password"
              label="Senha"
              value={form.password}
              onChange={(value) => update("password", value)}
              placeholder="Digite sua senha"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              showPassword={showPassword}
              onToggleVisibility={() => setShowPassword((previous) => !previous)}
            />

            {!isSignUp && (
              <div className="-mt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(form.email);
                    setShowRecovery(true);
                  }}
                  className="text-sm font-medium text-purple-300 transition hover:text-purple-200 hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
            )}

            {isSignUp && (
              <PasswordField
                id="confirm"
                label="Confirmar senha"
                value={form.confirm}
                onChange={(value) => update("confirm", value)}
                placeholder="Digite sua senha novamente"
                autoComplete="new-password"
                showPassword={showConfirmPassword}
                onToggleVisibility={() => setShowConfirmPassword((previous) => !previous)}
              />
            )}

            <Button
              type="submit"
              disabled={loading}
              className="mt-2 h-12 w-full rounded-xl bg-purple-600 font-medium text-white shadow-lg shadow-purple-900/30 transition hover:bg-purple-500"
            >
              {loading ? "Aguarde..." : isSignUp ? "Criar minha conta" : "Entrar na minha conta"}
            </Button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-7 text-center text-sm text-white/50">
            {isSignUp ? "Já possui uma conta? " : "Ainda não possui uma conta? "}
            <Link to="/login" search={{ modo: isSignUp ? "entrar" : "cadastro" }} className="font-medium text-purple-300 transition hover:text-purple-200 hover:underline">
              {isSignUp ? "Entrar" : "Criar conta"}
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-white/25">© 2026 DecidlyIA</p>
      </div>
    </main>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  showPassword,
  onToggleVisibility,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-white/80">
        {label}
      </Label>
      <div className="relative">
        <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />
        <Input
          id={id}
          type={showPassword ? "text" : "password"}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={1000}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 border-white/10 bg-white/[0.04] pl-11 pr-12 text-white placeholder:text-white/30 focus-visible:ring-purple-500"
        />
        <button
          type="button"
          onClick={onToggleVisibility}
          aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-white/40 transition hover:text-white"
        >
          {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  autoComplete,
  maxLength,
  icon: Icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  icon?: ElementType;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-sm font-medium text-white/80">
        {label}
      </Label>
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />}
        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onChange={(event) => onChange(event.target.value)}
          className={`h-12 border-white/10 bg-white/[0.04] text-white placeholder:text-white/30 focus-visible:ring-purple-500 ${Icon ? "pl-11" : ""}`}
        />
      </div>
    </div>
  );
}