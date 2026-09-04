import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  User,
  AtSign,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { supabase } from "@/integrations/supabase/client";
import { SiteIcon } from "@/components/SiteIcon";
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
      {
        title: "Entrar | DecidlyIA",
      },
      {
        name: "description",
        content:
          "Entre ou crie sua conta no DecidlyIA.",
      },
    ],
  }),

  component: LoginPage,
});

const signUpSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Informe seu nome")
      .max(24, "O nome pode ter no máximo 24 caracteres"),

    username: z
      .string()
      .trim()
      .min(
        3,
        "O nome de usuário precisa ter pelo menos 3 caracteres",
      )
      .max(
        24,
        "O nome de usuário pode ter no máximo 24 caracteres",
      )
      .regex(
        /^[a-zA-Z0-9._-]+$/,
        "Use apenas letras, números, ponto, hífen ou underline",
      ),

    email: z
      .string()
      .trim()
      .email("E-mail inválido")
      .max(
        160,
        "O e-mail pode ter no máximo 160 caracteres",
      ),

    password: z
      .string()
      .min(
        6,
        "A senha precisa ter pelo menos 6 caracteres",
      )
      .max(
        1000,
        "A senha pode ter no máximo 1.000 caracteres",
      ),

    confirm: z
      .string()
      .max(
        1000,
        "A confirmação pode ter no máximo 1.000 caracteres",
      ),
  })
  .refine(
    (value) => value.password === value.confirm,
    {
      message: "As senhas não são iguais",
      path: ["confirm"],
    },
  );

function LoginPage() {
  const { modo } = Route.useSearch();

  const navigate = useNavigate();

  const isSignUp =
    modo === "cadastro";

  const [loading, setLoading] =
    useState(false);

  const [
    googleLoading,
    setGoogleLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [
    showRecovery,
    setShowRecovery,
  ] = useState(false);

  const [
    recoveryEmail,
    setRecoveryEmail,
  ] = useState("");

  const [
    recoveryLoading,
    setRecoveryLoading,
  ] = useState(false);

  const [form, setForm] =
    useState({
      name: "",
      username: "",
      email: "",
      password: "",
      confirm: "",
    });

  function update(
    key: keyof typeof form,
    value: string,
  ) {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  }

  async function handleGoogleLogin() {
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
        console.error(error);

        toast.error(
          "Não foi possível iniciar o login com Google.",
        );

        setGoogleLoading(false);
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "Ocorreu um erro ao conectar com o Google.",
      );

      setGoogleLoading(false);
    }
  }

  async function handleSignUp() {
    const parsed =
      signUpSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]?.message ??
          "Verifique os dados informados.",
      );

      return;
    }

    setLoading(true);

    try {
      const { data, error } =
        await supabase.auth.signUp({
          email: parsed.data.email,
          password:
            parsed.data.password,

          options: {
            data: {
              name:
                parsed.data.name,

              username:
                parsed.data.username.toLowerCase(),
            },
          },
        });

      if (error) {
        toast.error(
          error.message.includes(
            "already registered",
          )
            ? "Este e-mail já possui uma conta. Tente entrar."
            : error.message,
        );

        return;
      }

      if (data.user) {
        const {
          error: profileError,
        } =
          await supabase
            .from("profiles")
            .upsert(
              {
                id: data.user.id,

                name:
                  parsed.data.name,

                username:
                  parsed.data.username.toLowerCase(),
              },

              {
                onConflict: "id",
              },
            );

        if (profileError) {
          console.error(
            profileError,
          );
        }
      }

      toast.success(
        "Conta criada com sucesso!",
      );

      navigate({
        to: "/",
      });
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível criar sua conta.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    if (!form.email.trim()) {
      toast.error(
        "Informe seu e-mail.",
      );

      return;
    }

    if (!form.password) {
      toast.error(
        "Informe sua senha.",
      );

      return;
    }

    if (
      form.password.length >
      1000
    ) {
      toast.error(
        "A senha pode ter no máximo 1.000 caracteres.",
      );

      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email:
            form.email
              .trim()
              .toLowerCase(),

          password:
            form.password,
        });

      if (error) {
        toast.error(
          "E-mail ou senha incorretos.",
        );

        return;
      }

      navigate({
        to: "/",
      });
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível entrar.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handlePasswordRecovery() {
    const email =
      recoveryEmail
        .trim()
        .toLowerCase();

    if (!email) {
      toast.error(
        "Informe seu e-mail.",
      );

      return;
    }

    if (!email.includes("@")) {
      toast.error(
        "Informe um e-mail válido.",
      );

      return;
    }

    setRecoveryLoading(true);

    try {
      const { error } =
        await supabase.auth.resetPasswordForEmail(
          email,
          {
            redirectTo:
              `${window.location.origin}/reset-password`,
          },
        );

      if (error) {
        throw error;
      }

      toast.success(
        "Se existir uma conta com este e-mail, enviaremos um link para redefinir sua senha.",
      );

      setRecoveryEmail("");

      setShowRecovery(false);
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível enviar o e-mail de recuperação.",
      );
    } finally {
      setRecoveryLoading(false);
    }
  }

  if (showRecovery) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#0b0618] via-[#120722] to-[#090411] px-5 py-10 text-white">

        <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center">

          {/* LOGO */}

          <Link
            to="/"
            className="mb-10 flex items-center justify-center gap-3"
          >
            <SiteIcon className="size-11 rounded-xl object-contain" />

            <span className="text-2xl font-semibold tracking-tight">
              Decidly
              <span className="text-violet-400">
                IA
              </span>
            </span>
          </Link>

          {/* CARD */}

          <div className="rounded-3xl border border-white/10 bg-[#130b22]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-8">

            <div className="mb-7">

              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-400">

                <KeyRound className="size-6" />

              </div>

              <h1 className="text-2xl font-semibold">

                Recuperar senha

              </h1>

              <p className="mt-2 text-sm leading-relaxed text-white/55">

                Digite o e-mail da sua conta e enviaremos
                um link seguro para criar uma nova senha.

              </p>

            </div>

            <form
              className="space-y-5"
              onSubmit={(event) => {
                event.preventDefault();

                void handlePasswordRecovery();
              }}
            >

              <div className="space-y-2">

                <Label
                  htmlFor="recovery-email"
                  className="text-sm text-white/80"
                >

                  E-mail da conta

                </Label>

                <div className="relative">

                  <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />

                  <Input
                    id="recovery-email"
                    type="email"
                    value={recoveryEmail}
                    onChange={(event) =>
                      setRecoveryEmail(
                        event.target.value,
                      )
                    }
                    placeholder="seuemail@exemplo.com"
                    autoComplete="email"
                    maxLength={160}
                    className="h-12 border-white/10 bg-white/5 pl-11 text-white placeholder:text-white/30 focus-visible:ring-violet-500"
                  />

                </div>

              </div>

              <Button
                type="submit"
                disabled={
                  recoveryLoading
                }
                className="h-12 w-full bg-violet-600 text-white hover:bg-violet-500"
              >

                {recoveryLoading ? (

                  <>

                    <Loader2 className="size-4 animate-spin" />

                    Enviando...

                  </>

                ) : (

                  <>

                    <Mail className="size-4" />

                    Enviar link de recuperação

                  </>

                )}

              </Button>

            </form>

          </div>

          <button
            type="button"
            onClick={() => {
              setShowRecovery(false);
            }}
            className="mt-7 text-center text-sm font-medium text-violet-400 transition hover:text-violet-300"
          >

            ← Voltar para entrar

          </button>

        </div>

      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#090411] via-[#120722] to-[#0b0618] px-5 py-10 text-white">

      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center">

        {/* LOGO */}

        <Link
          to="/"
          className="mb-10 flex items-center justify-center gap-3"
        >

          <SiteIcon className="size-11 rounded-xl object-contain" />

          <span className="text-2xl font-semibold tracking-tight">

            Decidly
            <span className="text-violet-400">
              IA
            </span>

          </span>

        </Link>

        {/* AUTH CARD */}

        <div className="rounded-3xl border border-white/10 bg-[#130b22]/90 p-7 shadow-2xl backdrop-blur-xl sm:p-8">

          <h1 className="text-2xl font-semibold tracking-tight">

            {isSignUp
              ? "Criar conta"
              : "Entrar"}

          </h1>

          <p className="mt-2 text-sm leading-relaxed text-white/55">

            {isSignUp
              ? "Crie sua conta e comece a tomar decisões com mais clareza."
              : "Bem-vindo de volta. Entre para continuar."}

          </p>

          {/* GOOGLE */}

          <button
            type="button"
            onClick={() => {
              void handleGoogleLogin();
            }}
            disabled={googleLoading}
            className="mt-7 flex h-12 w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white text-sm font-medium text-zinc-800 shadow-sm transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
          >

            {googleLoading ? (

              <>

                <Loader2 className="size-4 animate-spin" />

                Conectando...

              </>

            ) : (

              <>

                {/* GOOGLE LOGO */}

                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >

                  <path
                    fill="#4285F4"
                    d="M21.35 12.27c0-.79-.07-1.55-.22-2.27H12v4.3h5.22a4.46 4.46 0 0 1-1.94 2.93v2.78h3.14c1.84-1.7 2.93-4.2 2.93-7.74Z"
                  />

                  <path
                    fill="#34A853"
                    d="M12 21.75c2.61 0 4.8-.86 6.4-2.34l-3.14-2.78c-.87.58-1.99.93-3.26.93-2.51 0-4.64-1.69-5.4-3.97H3.36v2.87A9.75 9.75 0 0 0 12 21.75Z"
                  />

                  <path
                    fill="#FBBC05"
                    d="M6.6 13.59A5.86 5.86 0 0 1 6.3 12c0-.55.1-1.08.3-1.59V7.54H3.36A9.75 9.75 0 0 0 2.25 12c0 1.6.38 3.12 1.11 4.46l3.24-2.87Z"
                  />

                  <path
                    fill="#EA4335"
                    d="M12 6.44c1.42 0 2.7.49 3.7 1.45l2.77-2.77C16.79 3.55 14.61 2.25 12 2.25a9.75 9.75 0 0 0-8.64 5.29L6.6 10.41C7.36 8.13 9.49 6.44 12 6.44Z"
                  />

                </svg>

                Continuar com o Google

              </>

            )}

          </button>

          {/* DIVIDER */}

          <div className="my-7 flex items-center gap-4">

            <div className="h-px flex-1 bg-white/10" />

            <span className="text-[10px] font-medium tracking-[0.18em] text-white/35">

              OU CONTINUE COM E-MAIL

            </span>

            <div className="h-px flex-1 bg-white/10" />

          </div>

          {/* FORM */}

          <form
            className="space-y-5"
            onSubmit={(event) => {

              event.preventDefault();

              void (
                isSignUp
                  ? handleSignUp()
                  : handleSignIn()
              );

            }}
          >

            {isSignUp && (

              <>

                <Field
                  id="name"
                  label="Nome"
                  icon={<User className="size-4" />}
                  value={form.name}
                  onChange={(value) =>
                    update(
                      "name",
                      value,
                    )
                  }
                  placeholder="Como podemos te chamar?"
                  autoComplete="given-name"
                  maxLength={24}
                />

                <Field
                  id="username"
                  label="Nome de usuário"
                  icon={<AtSign className="size-4" />}
                  value={form.username}
                  onChange={(value) =>
                    update(
                      "username",
                      value,
                    )
                  }
                  placeholder="Escolha seu usuário"
                  autoComplete="username"
                  maxLength={24}
                />

              </>

            )}

            <Field
              id="email"
              label="E-mail"
              type="email"
              icon={<Mail className="size-4" />}
              value={form.email}
              onChange={(value) =>
                update(
                  "email",
                  value,
                )
              }
              placeholder="seuemail@exemplo.com"
              autoComplete="email"
              maxLength={160}
            />

            <PasswordField
              id="password"
              label="Senha"
              value={form.password}
              onChange={(value) =>
                update(
                  "password",
                  value,
                )
              }
              placeholder="Digite sua senha"
              autoComplete={
                isSignUp
                  ? "new-password"
                  : "current-password"
              }
              showPassword={showPassword}
              onToggleVisibility={() =>
                setShowPassword(
                  (previous) =>
                    !previous,
                )
              }
            />

            {/* ESQUECI MINHA SENHA */}

            {!isSignUp && (

              <div className="flex justify-start">

                <button
                  type="button"
                  onClick={() => {

                    setRecoveryEmail(
                      form.email,
                    );

                    setShowRecovery(
                      true,
                    );

                  }}
                  className="text-sm font-medium text-violet-400 transition hover:text-violet-300"
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
                onChange={(value) =>
                  update(
                    "confirm",
                    value,
                  )
                }
                placeholder="Digite novamente sua senha"
                autoComplete="new-password"
                showPassword={
                  showConfirmPassword
                }
                onToggleVisibility={() =>
                  setShowConfirmPassword(
                    (previous) =>
                      !previous,
                  )
                }
              />

            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full bg-violet-600 text-white hover:bg-violet-500"
            >

              {loading ? (

                <>

                  <Loader2 className="size-4 animate-spin" />

                  Aguarde...

                </>

              ) : (

                isSignUp
                  ? "Criar minha conta"
                  : "Entrar na minha conta"

              )}

            </Button>

          </form>

          {/* SWITCH */}

          <p className="mt-7 text-center text-sm text-white/50">

            {isSignUp
              ? "Já possui uma conta? "
              : "Ainda não possui uma conta? "}

            <Link
              to="/login"
              search={{
                modo: isSignUp
                  ? "entrar"
                  : "cadastro",
              }}
              className="font-medium text-violet-400 transition hover:text-violet-300"
            >

              {isSignUp
                ? "Entrar"
                : "Criar conta"}

            </Link>

          </p>

        </div>

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
  onChange: (
    value: string,
  ) => void;
  placeholder?: string;
  autoComplete?: string;
  showPassword: boolean;
  onToggleVisibility: () => void;
}) {
  return (
    <div className="space-y-2">

      <Label
        htmlFor={id}
        className="text-sm text-white/80"
      >

        {label}

      </Label>

      <div className="relative">

        <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40" />

        <Input
          id={id}
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={1000}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className="h-12 border-white/10 bg-white/5 pl-11 pr-12 text-white placeholder:text-white/30 focus-visible:ring-violet-500"
        />

        <button
          type="button"
          onClick={
            onToggleVisibility
          }
          className="absolute right-0 top-0 flex h-12 w-12 items-center justify-center text-white/40 transition hover:text-white"
          aria-label={
            showPassword
              ? "Ocultar senha"
              : "Mostrar senha"
          }
        >

          {showPassword ? (

            <EyeOff className="size-4" />

          ) : (

            <Eye className="size-4" />

          )}

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
  icon,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (
    value: string,
  ) => void;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  maxLength?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">

      <Label
        htmlFor={id}
        className="text-sm text-white/80"
      >

        {label}

      </Label>

      <div className="relative">

        {icon && (

          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">

            {icon}

          </span>

        )}

        <Input
          id={id}
          type={type}
          value={value}
          placeholder={placeholder}
          autoComplete={autoComplete}
          maxLength={maxLength}
          onChange={(event) =>
            onChange(
              event.target.value,
            )
          }
          className={
            icon
              ? "h-12 border-white/10 bg-white/5 pl-11 text-white placeholder:text-white/30 focus-visible:ring-violet-500"
              : "h-12 border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:ring-violet-500"
          }
        />

      </div>

    </div>
  );
}