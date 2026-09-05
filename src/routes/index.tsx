import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  Menu,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { useState } from "react";
import { Footer } from "../components/Footer";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      {/* BACKGROUND */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-[140px]" />

        <div className="absolute -left-40 top-[700px] h-[500px] w-[500px] rounded-full bg-purple-700/10 blur-[140px]" />

        <div className="absolute -right-40 top-[1000px] h-[500px] w-[500px] rounded-full bg-violet-500/10 blur-[140px]" />
      </div>

      <div className="relative">
        {/* NAVBAR */}

        <nav className="sticky top-0 z-50 border-b border-slate-800/70 bg-slate-950/80 backdrop-blur-xl">
          <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-6">
            {/* LOGO COM CÉREBRO */}

            <Link
              to="/"
              className="flex items-center gap-3 transition-opacity hover:opacity-80"
              onClick={closeMobileMenu}
            >
              <img
                src="/favicon.ico"
                alt="DecidlyAI"
                className="h-10 w-10 shrink-0 object-contain"
              />

              <span className="text-2xl font-bold leading-none tracking-tight">
                <span className="text-white">
                  Decidly
                </span>

                <span className="text-violet-400">
                  AI
                </span>
              </span>
            </Link>

            {/* MENU DESKTOP */}

            <div className="hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
              <a
                href="#como-funciona"
                className="transition hover:text-white"
              >
                Como funciona
              </a>

              <a
                href="#recursos"
                className="transition hover:text-white"
              >
                Recursos
              </a>

              <a
                href="#planos"
                className="transition hover:text-white"
              >
                Planos
              </a>
            </div>

            {/* BOTÕES DESKTOP */}

            <div className="hidden items-center gap-3 md:flex">
              <Link
                to="/login"
                className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
              >
                Entrar
              </Link>

              <Link
                to="/login"
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Começar
              </Link>
            </div>

            {/* BOTÃO MOBILE */}

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  (current) => !current,
                )
              }
              aria-label={
                mobileMenuOpen
                  ? "Fechar menu"
                  : "Abrir menu"
              }
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-800 text-slate-300 transition hover:border-violet-500 hover:text-white md:hidden"
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* MENU MOBILE */}

          {mobileMenuOpen ? (
            <div className="border-t border-slate-800 bg-slate-950 px-6 py-5 md:hidden">
              <div className="mx-auto flex max-w-6xl flex-col gap-2">
                <a
                  href="#como-funciona"
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  Como funciona
                </a>

                <a
                  href="#recursos"
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  Recursos
                </a>

                <a
                  href="#planos"
                  onClick={closeMobileMenu}
                  className="rounded-xl px-4 py-3 text-sm font-medium text-slate-300 transition hover:bg-slate-900 hover:text-white"
                >
                  Planos
                </a>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center rounded-xl border border-slate-700 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-violet-500 hover:text-white"
                  >
                    Entrar
                  </Link>

                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="flex items-center justify-center rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-500"
                  >
                    Começar
                  </Link>
                </div>
              </div>
            </div>
          ) : null}
        </nav>

        {/* HERO */}

        <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 text-center md:pb-32 md:pt-28">
          <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
            <Sparkles className="h-4 w-4" />

            Inteligência para decisões mais claras
          </div>

          <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
            Tome decisões melhores.

            <span className="mt-2 block text-violet-400">
              Com mais clareza.
            </span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
            O DecidlyAI ajuda você a organizar
            possibilidades, analisar opções e tomar
            decisões com mais confiança.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
            >
              Começar gratuitamente

              <ArrowRight className="h-5 w-5" />
            </Link>

            <a
              href="#como-funciona"
              className="flex items-center justify-center rounded-xl border border-slate-700 px-7 py-4 font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Ver como funciona
            </a>
          </div>

          {/* EXEMPLO */}

          <div className="mx-auto mt-20 max-w-3xl rounded-[2rem] border border-slate-800 bg-slate-900/60 p-6 text-left shadow-2xl backdrop-blur-xl md:p-10">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
                <Brain className="h-6 w-6" />
              </div>

              <div>
                <p className="font-semibold">
                  Nova decisão
                </p>

                <p className="text-sm text-slate-400">
                  Análise inteligente
                </p>
              </div>
            </div>

            <div className="mt-7">
              <p className="text-sm text-slate-400">
                O que você precisa decidir?
              </p>

              <h2 className="mt-2 text-2xl font-semibold md:text-3xl">
                Devo começar a estudar programação?
              </h2>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5">
                  <div className="flex items-center gap-2 text-violet-300">
                    <TrendingUp className="h-5 w-5" />

                    <span className="font-semibold">
                      Recomendação
                    </span>
                  </div>

                  <p className="mt-3 leading-relaxed text-slate-300">
                    Sim, considerando seus objetivos
                    e o impacto que essa habilidade pode
                    ter no seu futuro.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-5">
                  <div className="flex items-center gap-2 text-slate-200">
                    <CircleHelp className="h-5 w-5" />

                    <span className="font-semibold">
                      Análise
                    </span>
                  </div>

                  <p className="mt-3 leading-relaxed text-slate-400">
                    Compare seu tempo disponível,
                    objetivos e os benefícios dessa
                    escolha.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* COMO FUNCIONA */}

        <section
          id="como-funciona"
          className="scroll-mt-24 border-y border-slate-800 bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-violet-400">
                COMO FUNCIONA
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Menos confusão.

                <span className="block text-violet-400">
                  Mais clareza.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl leading-relaxed text-slate-400">
                Organize o que você está pensando,
                explore possibilidades e entenda melhor
                suas opções antes de decidir.
              </p>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-3">
              <Step
                number="01"
                title="Conte sua decisão"
                description="Explique o que você precisa decidir e adicione o contexto que considera importante."
              />

              <Step
                number="02"
                title="Analise possibilidades"
                description="Organize diferentes caminhos, pontos positivos, desafios e prioridades."
              />

              <Step
                number="03"
                title="Decida com clareza"
                description="Use a análise para entender melhor suas opções e tomar uma decisão mais consciente."
              />
            </div>
          </div>
        </section>

        {/* RECURSOS */}

        <section
          id="recursos"
          className="scroll-mt-24"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-violet-400">
                RECURSOS
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Não escolha no escuro.
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-400">
                Transforme dúvidas em decisões mais
                claras, organizadas e conscientes.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              <Feature
                icon={
                  <Brain className="h-6 w-6" />
                }
                title="Análise inteligente"
                description="Analise diferentes opções e organize os pontos positivos e negativos de cada caminho."
              />

              <Feature
                icon={
                  <TrendingUp className="h-6 w-6" />
                }
                title="Aprenda com decisões"
                description="Acompanhe decisões antigas e construa um histórico das escolhas que você tomou."
              />

              <Feature
                icon={
                  <Check className="h-6 w-6" />
                }
                title="Decida com confiança"
                description="Organize suas prioridades e tenha mais clareza antes de tomar decisões importantes."
              />
            </div>
          </div>
        </section>

        {/* PLANOS */}

        <section
          id="planos"
          className="scroll-mt-24 border-y border-slate-800 bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-violet-400">
                PLANOS
              </p>

              <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
                Comece gratuitamente.
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-400">
                Crie sua conta e comece a explorar uma
                nova forma de organizar suas decisões.
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-md">
              <div className="rounded-[2rem] border border-violet-500/30 bg-slate-950/70 p-8 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-bold">
                    Gratuito
                  </h3>

                  <span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    Para começar
                  </span>
                </div>

                <p className="mt-4 leading-relaxed text-slate-400">
                  Comece a organizar suas ideias e
                  explorar suas decisões.
                </p>

                <div className="mt-7 border-t border-slate-800 pt-7">
                  <div className="flex items-center gap-3 text-slate-300">
                    <Check className="h-5 w-5 text-violet-400" />
                    Criação de decisões
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-slate-300">
                    <Check className="h-5 w-5 text-violet-400" />
                    Organização de possibilidades
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-slate-300">
                    <Check className="h-5 w-5 text-violet-400" />
                    Análises para mais clareza
                  </div>
                </div>

                <Link
                  to="/login"
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-4 font-semibold text-white transition hover:bg-violet-500"
                >
                  Criar conta gratuitamente

                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}

        <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="relative overflow-hidden rounded-[2rem] border border-violet-500/30 bg-violet-600/10 px-6 py-16 text-center shadow-2xl md:px-12 md:py-20">
            <div className="pointer-events-none absolute inset-0">
              <div className="absolute left-1/2 top-1/2 h-[350px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-500/10 blur-[100px]" />
            </div>

            <div className="relative">
              <h2 className="text-4xl font-bold tracking-tight md:text-5xl">
                Sua próxima decisão

                <span className="block text-violet-400">
                  começa agora.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-300">
                Comece gratuitamente e tenha mais
                clareza para analisar suas escolhas.
              </p>

              <Link
                to="/login"
                className="mx-auto mt-8 flex w-fit items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
              >
                Criar minha primeira decisão

                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </section>

        {/* FOOTER GLOBAL */}

        <Footer />
      </div>
    </main>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="relative rounded-2xl border border-slate-800 bg-slate-950/70 p-7">
      <span className="text-sm font-bold tracking-wider text-violet-400">
        {number}
      </span>

      <h3 className="mt-5 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7 transition hover:-translate-y-1 hover:border-violet-500/30">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
        {icon}
      </div>

      <h3 className="text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}