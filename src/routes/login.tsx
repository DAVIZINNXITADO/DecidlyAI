import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Mail,
  User,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "../lib/supabase";

const searchSchema = z.object({
  modo: z
    .enum(["entrar", "cadastro"])
    .optional()
    .catch("entrar"),
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
          "Entre ou crie sua conta no DecidlyIA para tomar decisões com mais clareza.",
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
      .max(
        40,
        "O nome pode ter no máximo 40 caracteres",
      ),

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
    (value) =>
      value.password === value.confirm,
    {
      message:
        "As senhas não são iguais",
      path: ["confirm"],
    },
  );

function LoginPage() {
  const { modo } =
    Route.useSearch();

  const navigate =
    useNavigate();

  const isSignUp =
    modo === "cadastro";

  const [
    loading,
    setLoading,
  ] = useState(false);

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

  const [
    form,
    setForm,
  ] = useState({
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

  async function handleSignUp() {
    const parsed =
      signUpSchema.safeParse(form);

    if (!parsed.success) {
      toast.error(
        parsed.error.issues[0]
          ?.message ??
          "Verifique os dados informados.",
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
          email:
            parsed.data.email
              .trim()
              .toLowerCase(),

          password:
            parsed.data.password,

          options: {
            data: {
              name:
                parsed.data.name,

              username:
                parsed.data.username
                  .trim()
                  .toLowerCase(),
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

      /*
       * Se você possuir uma tabela profiles,
       * o perfil será criado aqui.
       *
       * Caso ainda não tenha criado essa tabela,
       * pode remover este bloco.
       */

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
                  parsed.data.username
                    .trim()
                    .toLowerCase(),
              },
              {
                onConflict: "id",
              },
            );

        if (
          profileError &&
          !profileError.message.includes(
            'relation "profiles" does not exist',
          )
        ) {
          console.error(
            "Erro ao criar perfil:",
            profileError,
          );
        }
      }

      /*
       * Com "Confirm email" DESATIVADO
       * no Supabase, data.session deve existir.
       */

      if (!data.session) {
        toast.error(
          "A conta foi criada, mas a sessão não foi iniciada. Verifique as configurações de autenticação.",
        );

        return;
      }

      toast.success(
        "Conta criada com sucesso! Bem-vindo ao DecidlyIA.",
      );

      navigate({
        to: "/",
      });
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível criar sua conta. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSignIn() {
    const email =
      form.email
        .trim()
        .toLowerCase();

    if (!email) {
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

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword(
          {
            email,
            password:
              form.password,
          },
        );

      if (error) {
        toast.error(
          "E-mail ou senha incorretos.",
        );

        return;
      }

      toast.success(
        "Login realizado com sucesso!",
      );

      navigate({
        to: "/",
      });
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível entrar na sua conta.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithOAuth(
          {
            provider:
              "google",

            options: {
              redirectTo:
                window.location.origin,
            },
          },
        );

      if (error) {
        toast.error(
          error.message,
        );

        setGoogleLoading(false);
      }
    } catch (error) {
      console.error(error);

      toast.error(
        "Não foi possível continuar com o Google.",
      );

      setGoogleLoading(false);
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

  /*
   * TELA DE RECUPERAÇÃO
   */

  if (showRecovery) {
    return (
      <main className="min-h-screen bg-[#0c0718] text-white">

        <div className="pointer-events-none fixed inset-0 overflow-hidden">

          <div className="absolute -left-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-violet-600/15 blur-[140px]" />

          <div className="absolute -bottom-40 -right-40 h-[32rem] w-[32rem] rounded-full bg-purple-700/15 blur-[140px]" />

        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5 py-10">

          <div className="w-full max-w-md">

            {/* LOGO */}

            <Link
              to="/"
              className="mb-10 flex w-fit items-center gap-3 transition-opacity hover:opacity-80"
            >
              <div className="flex size-12 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/15 shadow-lg shadow-violet-950/30">

                <div className="text-xl font-black text-violet-300">
                  D
                </div>

              </div>

              <span className="text-2xl font-bold tracking-tight">

                Decidly
                <span className="text-violet-400">
                  IA
                </span>

              </span>

            </Link>

            {/* CARD */}

            <div className="rounded-[28px] border border-white/10 bg-[#151020]/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-9">

              <button
                type="button"
                onClick={() =>
                  setShowRecovery(false)
                }
                className="mb-7 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
              >

                <ArrowLeft className="size-4" />

                Voltar para entrar

              </button>

              <div className="flex items-start gap-4">

                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15">

                  <KeyRound className="size-5 text-violet-400" />

                </div>

                <div>

                  <h1 className="text-2xl font-bold tracking-tight">

                    Recuperar senha

                  </h1>

                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">

                    Enviaremos um link seguro para
                    você criar uma nova senha.

                  </p>

                </div>

              </div>

              <form
                className="mt-8 space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();

                  void handlePasswordRecovery();
                }}
              >

                <div>

                  <label
                    htmlFor="recovery-email"
                    className="mb-2 block text-sm font-medium text-zinc-200"
                  >

                    E-mail da conta

                  </label>

                  <div className="relative">

                    <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                    <input
                      id="recovery-email"
                      type="email"
                      value={
                        recoveryEmail
                      }
                      onChange={(
                        event,
                      ) =>
                        setRecoveryEmail(
                          event.target.value,
                        )
                      }
                      placeholder="seuemail@exemplo.com"
                      autoComplete="email"
                      maxLength={160}
                      className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                    />

                  </div>

                </div>

                <button
                  type="submit"
                  disabled={
                    recoveryLoading
                  }
                  className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                >

                  {recoveryLoading ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />

                      Enviando...
                    </>
                  ) : (
                    <>
                      <Mail className="size-5" />

                      Enviar link de recuperação
                    </>
                  )}

                </button>

              </form>

            </div>

          </div>

        </div>

      </main>
    );
  }

  /*
   * LOGIN / CADASTRO
   */

  return (
    <main className="min-h-screen bg-[#0c0718] text-white">

      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">

        <div className="absolute left-1/2 top-0 h-[35rem] w-[35rem] -translate-x-1/2 rounded-full bg-violet-700/10 blur-[150px]" />

        <div className="absolute -left-40 bottom-0 h-[30rem] w-[30rem] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -right-40 top-1/3 h-[25rem] w-[25rem] rounded-full bg-violet-500/10 blur-[140px]" />

      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-5 py-10">

        {/* LOGO */}

        <Link
          to="/"
          className="mb-10 flex items-center gap-3 transition-opacity hover:opacity-80"
        >

          <div className="flex size-14 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/15 shadow-lg shadow-violet-950/30">

            <div className="text-2xl font-black text-violet-300">
              D
            </div>

          </div>

          <span className="text-3xl font-bold tracking-tight">

            Decidly
            <span className="text-violet-400">
              IA
            </span>

          </span>

        </Link>

        {/* AUTH CARD */}

        <section className="w-full max-w-lg rounded-[30px] border border-white/10 bg-[#151020]/90 p-7 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-10">

          {/* HEADER */}

          <div>

            <p className="text-xs font-bold tracking-[0.22em] text-violet-400">

              DECIDLYIA

            </p>

            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">

              {isSignUp
                ? "Criar conta"
                : "Entrar"}

            </h1>

            <p className="mt-3 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">

              {isSignUp
                ? "Crie sua conta e comece a tomar decisões com mais clareza."
                : "Bem-vindo de volta! Acesse sua conta para continuar."}

            </p>

          </div>

          {/* GOOGLE */}

          <button
            type="button"
            onClick={() =>
              void handleGoogleLogin()
            }
            disabled={
              googleLoading
            }
            className="mt-8 flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] font-medium text-zinc-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
          >

            {googleLoading ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <div className="flex size-6 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
                G
              </div>
            )}

            Continuar com Google

          </button>

          {/* DIVIDER */}

          <div className="my-8 flex items-center gap-4">

            <div className="h-px flex-1 bg-white/10" />

            <span className="text-[10px] font-semibold tracking-[0.15em] text-zinc-500">

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

            {/* NAME */}

            {isSignUp ? (
              <div>

                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >

                  Nome

                </label>

                <div className="relative">

                  <User className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      update(
                        "name",
                        event.target.value,
                      )
                    }
                    placeholder="Como podemos te chamar?"
                    autoComplete="given-name"
                    maxLength={40}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                  />

                </div>

              </div>
            ) : null}

            {/* USERNAME */}

            {isSignUp ? (
              <div>

                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >

                  Nome de usuário

                </label>

                <div className="relative">

                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="username"
                    type="text"
                    value={
                      form.username
                    }
                    onChange={(event) =>
                      update(
                        "username",
                        event.target.value,
                      )
                    }
                    placeholder="Escolha seu nome de usuário"
                    autoComplete="username"
                    maxLength={24}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                  />

                </div>

                <p className="mt-2 text-xs text-zinc-500">

                  Use letras, números, ponto, hífen ou underline.

                </p>

              </div>
            ) : null}

            {/* EMAIL */}

            <div>

              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-zinc-200"
              >

                E-mail

              </label>

              <div className="relative">

                <Mail className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                <input
                  id="email"
                  type="email"
                  value={
                    form.email
                  }
                  onChange={(event) =>
                    update(
                      "email",
                      event.target.value,
                    )
                  }
                  placeholder="seuemail@exemplo.com"
                  autoComplete="email"
                  maxLength={160}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-4 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                />

              </div>

              {!isSignUp ? (
                <p className="mt-2 text-xs text-zinc-500">

                  Use o e-mail cadastrado na sua conta.

                </p>
              ) : null}

            </div>

            {/* PASSWORD */}

            <div>

              <div className="mb-2 flex items-center justify-between gap-4">

                <label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-200"
                >

                  Senha

                </label>

                {!isSignUp ? (
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
                ) : null}

              </div>

              <div className="relative">

                <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    form.password
                  }
                  onChange={(event) =>
                    update(
                      "password",
                      event.target.value,
                    )
                  }
                  placeholder="Digite sua senha"
                  autoComplete={
                    isSignUp
                      ? "new-password"
                      : "current-password"
                  }
                  maxLength={1000}
                  className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-14 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous,
                    )
                  }
                  className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center text-zinc-500 transition hover:text-white"
                  aria-label={
                    showPassword
                      ? "Ocultar senha"
                      : "Mostrar senha"
                  }
                >

                  {showPassword ? (
                    <EyeOff className="size-5" />
                  ) : (
                    <Eye className="size-5" />
                  )}

                </button>

              </div>

              <p className="mt-2 text-xs text-zinc-500">

                {isSignUp
                  ? "Sua senha deve ter pelo menos 6 caracteres."
                  : "Digite a senha usada na sua conta."}

              </p>

            </div>

            {/* CONFIRM PASSWORD */}

            {isSignUp ? (
              <div>

                <label
                  htmlFor="confirm"
                  className="mb-2 block text-sm font-medium text-zinc-200"
                >

                  Confirmar senha

                </label>

                <div className="relative">

                  <KeyRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-zinc-500" />

                  <input
                    id="confirm"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={
                      form.confirm
                    }
                    onChange={(event) =>
                      update(
                        "confirm",
                        event.target.value,
                      )
                    }
                    placeholder="Digite novamente sua senha"
                    autoComplete="new-password"
                    maxLength={1000}
                    className="h-14 w-full rounded-2xl border border-white/10 bg-[#0f0a19] pl-12 pr-14 text-base text-white outline-none transition placeholder:text-zinc-600 focus:border-violet-500/60 focus:ring-4 focus:ring-violet-500/10"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword(
                        (
                          previous,
                        ) =>
                          !previous,
                      )
                    }
                    className="absolute right-0 top-0 flex h-14 w-14 items-center justify-center text-zinc-500 transition hover:text-white"
                    aria-label={
                      showConfirmPassword
                        ? "Ocultar senha"
                        : "Mostrar senha"
                    }
                  >

                    {showConfirmPassword ? (
                      <EyeOff className="size-5" />
                    ) : (
                      <Eye className="size-5" />
                    )}

                  </button>

                </div>

              </div>
            ) : null}

            {/* SUBMIT */}

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 text-base font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
            >

              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />

                  Aguarde...
                </>
              ) : isSignUp ? (
                "Criar minha conta"
              ) : (
                "Entrar na minha conta"
              )}

            </button>

          </form>

          {/* SWITCH */}

          <div className="mt-8 border-t border-white/10 pt-7 text-center">

            <p className="text-sm text-zinc-400">

              {isSignUp
                ? "Já possui uma conta?"
                : "Ainda não possui uma conta?"}

              {" "}

              <Link
                to="/login"
                search={{
                  modo: isSignUp
                    ? "entrar"
                    : "cadastro",
                }}
                className="font-semibold text-violet-400 transition hover:text-violet-300"
              >

                {isSignUp
                  ? "Entrar"
                  : "Criar conta"}

              </Link>

            </p>

          </div>

        </section>

        {/* FOOTER */}

        <p className="mt-8 text-center text-xs text-zinc-600">

          © 2026 DecidlyIA · Decision Intelligence

        </p>

      </div>

    </main>
  );
}