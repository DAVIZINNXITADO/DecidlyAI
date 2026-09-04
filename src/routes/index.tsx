import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* NAVBAR */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600">
            <Brain size={24} />
          </div>

          <span className="text-xl font-bold">
            Decide<span className="text-violet-400">AI</span>
          </span>
        </div>

        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <a href="#como-funciona">Como funciona</a>
          <a href="#recursos">Recursos</a>
          <a href="#planos">Planos</a>
        </div>

        <Link
          to="/"
          className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-medium transition hover:border-violet-500"
        >
          Entrar
        </Link>
      </nav>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
          <Sparkles size={16} />
          Inteligência artificial para melhores decisões
        </div>

        <h1 className="mx-auto max-w-4xl text-5xl font-bold leading-tight md:text-7xl">
          Tome decisões melhores.
          <span className="block text-violet-400">
            Entenda o seu futuro.
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-400 md:text-xl">
          O DecideAI ajuda você a analisar opções, comparar caminhos e aprender
          com as decisões que tomou ao longo da sua vida.
        </p>

        <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
          <button className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold transition hover:bg-violet-500">
            Começar gratuitamente
            <ArrowRight size={19} />
          </button>

          <button className="rounded-xl border border-slate-700 px-7 py-4 font-semibold transition hover:border-slate-500">
            Ver como funciona
          </button>
        </div>

        {/* EXEMPLO DE DECISÃO */}
        <div className="mx-auto mt-20 max-w-3xl rounded-3xl border border-slate-800 bg-slate-900/60 p-6 text-left shadow-2xl md:p-10">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400">
              <Brain size={22} />
            </div>

            <div>
              <p className="font-semibold">Nova decisão</p>
              <p className="text-sm text-slate-400">
                Análise inteligente
              </p>
            </div>
          </div>

          <div className="mt-7">
            <p className="text-sm text-slate-400">
              O que você precisa decidir?
            </p>

            <h2 className="mt-2 text-2xl font-semibold">
              Devo começar a estudar programação?
            </h2>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-violet-500/40 bg-violet-500/10 p-5">
                <div className="flex items-center gap-2 text-violet-300">
                  <TrendingUp size={20} />
                  <span className="font-semibold">Recomendação</span>
                </div>

                <p className="mt-3 text-slate-300">
                  Sim, considerando seus objetivos de longo prazo.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-700 bg-slate-950/40 p-5">
                <div className="flex items-center gap-2 text-slate-200">
                  <CircleHelp size={20} />
                  <span className="font-semibold">Análise</span>
                </div>

                <p className="mt-3 text-slate-400">
                  Compare tempo disponível, objetivos e impacto futuro.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* RECURSOS */}
      <section
        id="recursos"
        className="border-y border-slate-800 bg-slate-900/40"
      >
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="text-center">
            <p className="font-medium text-violet-400">RECURSOS</p>

            <h2 className="mt-4 text-4xl font-bold">
              Não escolha no escuro.
            </h2>

            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Transforme dúvidas em decisões mais claras e organizadas.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Feature
              icon={<Brain size={25} />}
              title="Análise inteligente"
              description="Analise diferentes opções e entenda os pontos positivos e negativos."
            />

            <Feature
              icon={<TrendingUp size={25} />}
              title="Aprenda com decisões"
              description="Acompanhe decisões antigas e descubra quais escolhas funcionaram."
            />

            <Feature
              icon={<Check size={25} />}
              title="Decida com confiança"
              description="Organize suas prioridades antes de tomar decisões importantes."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="rounded-3xl border border-violet-500/30 bg-violet-600/10 px-8 py-16 text-center">
          <h2 className="text-4xl font-bold">
            Sua próxima decisão começa agora.
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-slate-300">
            Comece gratuitamente e construa seu histórico inteligente de
            decisões.
          </p>

          <button className="mt-8 rounded-xl bg-violet-600 px-7 py-4 font-semibold transition hover:bg-violet-500">
            Criar minha primeira decisão
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-slate-500 md:flex-row">
          <span>
            © 2026 DecideAI
          </span>

          <span>
            Decida melhor. Aprenda com suas escolhas.
          </span>
        </div>
      </footer>
    </main>
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
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-7">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
        {icon}
      </div>

      <h3 className="text-xl font-semibold">{title}</h3>

      <p className="mt-3 leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  );
}

#lovable-badge {
  display: none !important;
}