import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [isRegister, setIsRegister] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");

    if (isRegister && password !== confirmPassword) {
      setMessage("As senhas não coincidem.");
      return;
    }

    setLoading(true);

    if (isRegister) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage(
          "Conta criada com sucesso! Verifique seu email para confirmar sua conta."
        );
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setMessage(error.message);
      } else {
        setMessage("Login realizado com sucesso!");
      }
    }

    setLoading(false);
  }

  function changeMode(register: boolean) {
    setIsRegister(register);
    setMessage("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
      <section className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-xl">

        <Link
          to="/"
          className="text-sm text-muted-foreground transition hover:text-primary"
        >
          ← Voltar para o início
        </Link>

        <div className="mt-8">
          <h1 className="text-3xl font-bold">
            {isRegister ? "Criar conta" : "Entrar na sua conta"}
          </h1>

          <p className="mt-2 text-muted-foreground">
            {isRegister
              ? "Comece a tomar decisões com mais clareza."
              : "Continue sua jornada com o DecidlyIA."}
          </p>
        </div>

        {/* Alternador */}
        <div className="mt-6 grid grid-cols-2 rounded-xl bg-muted p-1">
          <button
            type="button"
            onClick={() => changeMode(false)}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              !isRegister
                ? "bg-background shadow"
                : "text-muted-foreground"
            }`}
          >
            Entrar
          </button>

          <button
            type="button"
            onClick={() => changeMode(true)}
            className={`rounded-lg py-2 text-sm font-medium transition ${
              isRegister
                ? "bg-background shadow"
                : "text-muted-foreground"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">

          {isRegister && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Seu nome
              </label>

              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@email.com"
              className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Senha
            </label>

            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {isRegister && (
            <div>
              <label className="mb-2 block text-sm font-medium">
                Confirmar senha
              </label>

              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border bg-background px-4 py-3 outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          )}

          {message && (
            <div className="rounded-xl border p-3 text-sm text-muted-foreground">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Aguarde..."
              : isRegister
                ? "Criar minha conta"
                : "Entrar"}
          </button>
        </form>

      </section>
    </main>
  );
}