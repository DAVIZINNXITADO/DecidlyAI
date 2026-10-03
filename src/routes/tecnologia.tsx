import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Navbar } from "../components/Navbar";
import { AdsterraNativeBanner } from "../components/AdsterraAds";

export const Route = createFileRoute("/tecnologia")({
  component: Tecnologia,
});

function Tecnologia() {
  return (
    <AppShell>
      <main className="min-h-screen bg-[#070711] text-white">
        <Navbar />
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar para o início
          </Link>

          <div className="mt-14 max-w-3xl">
            <div className="eyebrow inline-flex">
              <Sparkles className="h-4 w-4" /> Por trás do DecidlyAI
            </div>
            <h1 className="mt-7 text-5xl font-semibold leading-tight tracking-tight md:text-6xl">
              Tecnologia de IA multimodelo e privacidade para suas decisões
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-400">
              O DecidlyAI trabalha com uma camada de inteligência que escolhe automaticamente a
              melhor rota disponível para manter suas análises fluindo, sem transformar a tecnologia
              em mais uma preocupação para você.
            </p>
            <p className="mt-4 max-w-3xl leading-7 text-slate-400">
              Evite inserir informações sensíveis ou confidenciais. Para conhecer as informações
              publicadas sobre dados e segurança, consulte a{" "}
              <Link to="/privacy" className="text-violet-300 underline underline-offset-4">
                Política de Privacidade
              </Link>
              .
            </p>
          </div>

          <div className="mt-4 grid gap-5 md:grid-cols-3">
            <TechnologyCard
              step="01"
              title="Uma única experiência"
              description="Você conversa com o DecidlyAI pela mesma interface. A experiência permanece consistente enquanto a plataforma administra a infraestrutura por trás dela."
            />
            <TechnologyCard
              step="02"
              title="Rotas de disponibilidade"
              description="Quando um serviço está temporariamente limitado, o sistema pode direcionar a solicitação para outra rota compatível, reduzindo interrupções."
            />
            <TechnologyCard
              step="03"
              title="Uso responsável"
              description="O consumo é estimado pelo volume de contexto enviado e de resposta gerada; não é uma medição exata de tokens reportada pelo provedor."
            />
          </div>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.025] p-7 md:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-300">
              ROTA DO PLANO FREE
            </p>
            <h2 className="mt-4 text-2xl font-semibold">
              Roteamento automático, sem escolha manual de modelo.
            </h2>
            <p className="mt-3 max-w-3xl leading-7 text-slate-400">
              O chat passa por um roteador que usa as funções de IA disponíveis no ambiente. O
              código prevê tentativas alternativas quando uma rota falha, mas a disponibilidade de
              cada alternativa depende da configuração implantada. Provedores e modelos podem mudar;
              não anunciamos uma sequência fixa nem oferecemos seleção manual no plano Free.
            </p>
          </section>

          <section className="mt-20 rounded-3xl border border-violet-300/20 bg-violet-400/[0.07] p-7 md:p-10">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 h-6 w-6 shrink-0 text-violet-300" />
              <div>
                <h2 className="text-2xl font-semibold">A tecnologia apoia. Você decide.</h2>
                <p className="mt-3 leading-7 text-slate-300">
                  As respostas servem para organizar perspectivas, levantar perguntas e ajudar você
                  a pensar com mais clareza. Elas não substituem seu julgamento, sua experiência ou
                  aconselhamento profissional quando necessário.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-20 border-t border-white/10 pt-12">
            <h2 className="text-3xl font-semibold">O que você encontra no plano Free</h2>
            <ul className="mt-7 grid gap-4 text-slate-300 md:grid-cols-2">
              <ListItem>Rota automática de inteligência</ListItem>
              <ListItem>Consumo estimado pelo volume de texto</ListItem>
              <ListItem>Experiência simples, sem configuração técnica</ListItem>
              <ListItem>Roteamento mantido pela plataforma</ListItem>
            </ul>
            <div className="my-10">
              <AdsterraNativeBanner placement="standard" />
            </div>
            <Link
              to="/login"
              className="interactive-lift mt-9 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-4 font-semibold hover:bg-violet-400"
            >
              Começar gratuitamente <ArrowRight className="h-5 w-5" />
            </Link>
          </section>
        </div>
      </main>
    </AppShell>
  );
}

function TechnologyCard({
  step,
  title,
  description,
}: {
  step: string;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-6">
      <span className="text-xs font-bold tracking-[0.2em] text-violet-300">{step}</span>
      <h2 className="mt-8 text-xl font-semibold">{title}</h2>
      <p className="mt-3 leading-7 text-slate-400">{description}</p>
    </article>
  );
}

function ListItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <Check className="h-5 w-5 text-violet-300" />
      {children}
    </li>
  );
}
