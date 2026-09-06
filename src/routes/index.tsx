import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  Brain,
  Check,
  CircleHelp,
  Clock3,
  Layers3,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Footer } from "../components/Footer";
import { Navbar } from "../components/Navbar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DecidlyAI — Decisões com mais clareza" },
      {
        name: "description",
        content:
          "Organize possibilidades, compare caminhos e tome decisões com mais clareza usando o DecidlyAI.",
      },
      {
        property: "og:title",
        content: "DecidlyAI — Decisões com mais clareza",
      },
      {
        property: "og:description",
        content:
          "Organize possibilidades, compare caminhos e tome decisões com mais clareza usando o DecidlyAI.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="relative">
        <Navbar />

        <section className="relative border-b border-slate-800/80">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
          <div className="mx-auto grid max-w-6xl items-center gap-16 px-6 pb-24 pt-16 lg:grid-cols-[0.9fr_1.1fr] lg:pb-28 lg:pt-24">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
                <Sparkles className="h-4 w-4" />
                Inteligência para decisões mais claras
              </div>

              <h1 className="mt-7 text-5xl font-bold leading-[1.05] md:text-7xl">
                Decida melhor,
                <span className="mt-2 block text-violet-400">
                  sem pensar sozinho.
                </span>
              </h1>

              <p className="mx-auto mt-7 max-w-xl text-lg leading-relaxed text-slate-400 md:text-xl lg:mx-0">
                Organize possibilidades, compare o que realmente importa e
                transforme dúvidas complexas em próximos passos mais claros.
              </p>

              <div className="mt-9 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
                <Link
                  to="/login"
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-7 py-4 font-semibold text-white shadow-lg shadow-violet-950/40 transition hover:bg-violet-500"
                >
                  Começar gratuitamente
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <a
                  href="#planos"
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/50 px-7 py-4 font-semibold text-slate-200 transition hover:border-violet-500/60 hover:text-white"
                >
                  Ver planos
                  <ArrowDown className="h-5 w-5" />
                </a>
              </div>

              <div className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-slate-400 lg:justify-start">
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" /> Sem custo para
                  começar
                </span>
                <span className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-violet-400" /> Sem decisões no
                  impulso
                </span>
              </div>
            </div>

            <DecisionPreview />
          </div>
        </section>

        <section
          id="como-funciona"
          className="scroll-mt-24 border-b border-slate-800 bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <SectionHeading
              eyebrow="COMO FUNCIONA"
              title="Da dúvida a uma decisão estruturada."
              description="Um processo simples para tirar as opções da cabeça, enxergar os critérios e seguir com confiança."
            />

            <div className="relative mt-16 grid gap-6 md:grid-cols-3">
              <div className="absolute left-[16.6%] right-[16.6%] top-8 hidden h-px bg-slate-700 md:block" />
              <Step
                number="01"
                title="Conte sua decisão"
                description="Explique o que precisa decidir e adicione o contexto importante para você."
              />
              <Step
                number="02"
                title="Compare os caminhos"
                description="Organize possibilidades, benefícios, riscos e prioridades em uma visão clara."
              />
              <Step
                number="03"
                title="Escolha com consciência"
                description="Use a análise para entender os impactos e definir seu próximo passo."
              />
            </div>
          </div>
        </section>

        <section id="recursos" className="scroll-mt-24">
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <SectionHeading
              eyebrow="RECURSOS"
              title="Clareza em cada parte da escolha."
              description="Mais do que uma resposta rápida: uma forma organizada de pensar sobre decisões que importam."
            />

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              <Feature
                icon={<Brain className="h-6 w-6" />}
                title="Análise inteligente"
                description="Transforme contexto e alternativas em uma análise fácil de entender."
              />
              <Feature
                icon={<Layers3 className="h-6 w-6" />}
                title="Comparação organizada"
                description="Visualize pontos positivos, desafios e prioridades de cada possibilidade."
              />
              <Feature
                icon={<TrendingUp className="h-6 w-6" />}
                title="Histórico de decisões"
                description="Retome escolhas anteriores e aprenda com a forma como você decidiu."
              />
            </div>
          </div>
        </section>

        <section
          id="planos"
          className="scroll-mt-24 border-y border-slate-800 bg-slate-900/40"
        >
          <div className="mx-auto max-w-6xl px-6 py-24 md:py-32">
            <SectionHeading
              eyebrow="PLANOS"
              title="Comece agora. Evolua quando precisar."
              description="O plano gratuito já está disponível. Uma experiência mais completa está sendo preparada para o futuro."
            />

            <div className="mx-auto mt-14 grid max-w-4xl gap-6 lg:grid-cols-2">
              <article className="flex flex-col rounded-2xl border border-violet-500/50 bg-slate-950 p-7 shadow-2xl shadow-violet-950/20 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-violet-400">
                      DISPONÍVEL AGORA
                    </p>
                    <h3 className="mt-2 text-3xl font-bold">Gratuito</h3>
                  </div>
                  <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-300">
                    Para começar
                  </span>
                </div>

                <p className="mt-5 leading-relaxed text-slate-400">
                  Para organizar suas ideias e experimentar uma forma mais
                  consciente de decidir.
                </p>

                <div className="mt-7 flex-1 border-t border-slate-800 pt-7">
                  <PlanItem>Criação e organização de decisões</PlanItem>
                  <PlanItem>Comparação de possibilidades</PlanItem>
                  <PlanItem>Análises para ganhar clareza</PlanItem>
                  <PlanItem>Histórico das suas escolhas</PlanItem>
                </div>

                <Link
                  to="/login"
                  className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-4 font-semibold text-white transition hover:bg-violet-500"
                >
                  Começar gratuitamente
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </article>

              <article className="flex flex-col rounded-2xl border border-slate-700 bg-slate-900/70 p-7 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-400">
                      MAIS POSSIBILIDADES
                    </p>
                    <h3 className="mt-2 text-3xl font-bold">Premium / Pro</h3>
                  </div>
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-semibold text-slate-300">
                    <Clock3 className="h-3.5 w-3.5" /> Em breve
                  </span>
                </div>

                <p className="mt-5 leading-relaxed text-slate-400">
                  Para quem quiser aprofundar análises e acompanhar escolhas
                  com ainda mais recursos.
                </p>

                <div className="mt-7 flex-1 border-t border-slate-700 pt-7">
                  <PlanItem muted>Tudo do plano Gratuito</PlanItem>
                  <PlanItem muted>Análises mais aprofundadas</PlanItem>
                  <PlanItem muted>Mais formas de comparar cenários</PlanItem>
                  <PlanItem muted>Novos recursos de acompanhamento</PlanItem>
                </div>

                <div className="mt-8 flex min-h-14 w-full items-center justify-center rounded-xl border border-slate-700 bg-slate-800/70 px-6 font-semibold text-slate-400">
                  Em breve
                </div>
              </article>
            </div>

            <div className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
              <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] border-b border-slate-800 px-5 py-4 text-sm font-semibold text-slate-400 md:px-7">
                <span>Comparação</span>
                <span className="text-center text-violet-300">Gratuito</span>
                <span className="text-center">Pro</span>
              </div>
              <ComparisonRow label="Organizar decisões" free pro />
              <ComparisonRow label="Comparar possibilidades" free pro />
              <ComparisonRow label="Análises avançadas" pro />
              <ComparisonRow label="Recursos futuros" pro />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/30 bg-slate-900 px-6 py-16 text-center shadow-2xl md:px-12 md:py-20">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400 to-transparent" />
            <div className="relative">
              <p className="text-sm font-semibold text-violet-400">
                SUA PRÓXIMA ESCOLHA
              </p>
              <h2 className="mx-auto mt-4 max-w-2xl text-4xl font-bold md:text-5xl">
                Dê um próximo passo com mais clareza.
              </h2>
              <p className="mx-auto mt-5 max-w-xl leading-relaxed text-slate-400">
                Comece gratuitamente e transforme sua dúvida em uma decisão
                mais organizada e consciente.
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

        <Footer />
      </div>
    </main>
  );
}

function DecisionPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <div className="absolute -inset-3 rounded-2xl border border-violet-500/10" />
      <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-violet-950/30">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4 md:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Análise da decisão</p>
              <p className="text-xs text-slate-500">Visão geral</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
            Concluída
          </span>
        </div>

        <div className="p-5 md:p-7">
          <p className="text-xs font-semibold text-slate-500">SUA DECISÃO</p>
          <h2 className="mt-2 text-xl font-semibold md:text-2xl">
            Devo aceitar uma nova oportunidade profissional?
          </h2>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <PreviewMetric label="Crescimento" value="Alto" active />
            <PreviewMetric label="Estabilidade" value="Médio" />
            <PreviewMetric label="Momento" value="Favorável" active />
          </div>

          <div className="mt-6 rounded-xl border border-violet-500/30 bg-violet-500/10 p-5">
            <div className="flex items-center gap-2 text-violet-300">
              <TrendingUp className="h-5 w-5" />
              <span className="font-semibold">Caminho mais alinhado</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-300 md:text-base">
              A oportunidade combina com sua prioridade de crescimento. Antes
              de decidir, valide a mudança de rotina e sua reserva financeira.
            </p>
          </div>

          <div className="mt-5 flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4 text-left">
            <CircleHelp className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
            <p className="text-sm leading-relaxed text-slate-400">
              Próximo passo: compare o impacto nos próximos 6 meses antes de
              confirmar a escolha.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  active = false,
}: {
  label: string;
  value: string;
  active?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={active ? "mt-1 font-semibold text-violet-300" : "mt-1 font-semibold text-slate-300"}>
        {value}
      </p>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-sm font-semibold text-violet-400">{eyebrow}</p>
      <h2 className="mt-4 text-4xl font-bold md:text-5xl">{title}</h2>
      <p className="mt-5 leading-relaxed text-slate-400">{description}</p>
    </div>
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
    <article className="relative border-t border-slate-700 pt-7 md:border-t-0 md:pt-0">
      <span className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/30 bg-slate-950 text-sm font-bold text-violet-400">
        {number}
      </span>
      <h3 className="mt-6 text-xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-slate-400">{description}</p>
    </article>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-7 transition hover:-translate-y-1 hover:border-violet-500/30">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/15 text-violet-400">
        {icon}
      </div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-3 leading-relaxed text-slate-400">{description}</p>
    </article>
  );
}

function PlanItem({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <div className="mb-4 flex items-start gap-3 text-slate-300 last:mb-0">
      <Check
        className={muted ? "mt-0.5 h-5 w-5 shrink-0 text-slate-500" : "mt-0.5 h-5 w-5 shrink-0 text-violet-400"}
      />
      <span>{children}</span>
    </div>
  );
}

function ComparisonRow({
  label,
  free = false,
  pro = false,
}: {
  label: string;
  free?: boolean;
  pro?: boolean;
}) {
  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr] items-center border-b border-slate-800 px-5 py-4 text-sm last:border-b-0 md:px-7">
      <span className="text-slate-300">{label}</span>
      <span className="flex justify-center">
        {free ? (
          <Check className="h-5 w-5 text-violet-400" aria-label="Incluído" />
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </span>
      <span className="flex justify-center">
        {pro ? (
          <Clock3 className="h-4 w-4 text-slate-500" aria-label="Em breve" />
        ) : (
          <span className="text-slate-700">—</span>
        )}
      </span>
    </div>
  );
}