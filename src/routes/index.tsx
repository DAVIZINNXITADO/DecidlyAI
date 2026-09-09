import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  CircleHelp,
  Coins,
  Gauge,
  Layers3,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Navbar } from "../components/Navbar";

export const Route = createFileRoute("/")({
  component: Index,
});

function scrollToSection(sectionId: string) {
  const target = document.getElementById(sectionId);
  if (!target) return;

  window.scrollTo({
    top: target.getBoundingClientRect().top + window.scrollY,
    behavior: "smooth",
  });
}

function Index() {
  return (
    <AppShell>
      <main className="relative overflow-x-hidden bg-[#070711] text-white">
        <div aria-hidden="true" className="landing-orb landing-orb-one" />
        <div aria-hidden="true" className="landing-orb landing-orb-two" />
        <div className="relative z-10">
          <Navbar />

          <section className="mx-auto grid max-w-7xl items-center gap-16 px-6 pb-24 pt-20 md:grid-cols-[1.02fr_.98fr] md:px-8 md:pb-32 md:pt-28">
            <div>
              <div className="eyebrow mb-7 inline-flex">
                <Sparkles className="h-4 w-4" />
                Clareza para as decisões que importam
              </div>

              <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-[-0.04em] md:text-7xl">
                Pare de girar em círculos.
                <span className="mt-3 block text-violet-300">Comece a decidir.</span>
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300 md:text-xl">
                O DecidlyAI transforma dúvidas em caminhos claros. Organize o contexto,
                compare possibilidades e use a inteligência certa para pensar melhor —
                sem decidir por você.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/login"
                  className="interactive-lift group inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-6 py-4 font-semibold text-white shadow-[0_12px_40px_rgba(139,92,246,.25)] hover:bg-violet-400"
                >
                  Começar gratuitamente
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
                <button
                  type="button"
                  onClick={() => scrollToSection("como-funciona")}
                  className="interactive-lift inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/[0.03] px-6 py-4 font-semibold text-slate-200 hover:border-violet-300/50 hover:bg-white/[0.06]"
                >
                  Ver como funciona
                </button>
              </div>

            </div>

            <DecisionPreview />
          </section>

          <section className="border-y border-white/[0.08] bg-white/[0.025]">
            <div className="mx-auto grid max-w-7xl gap-4 px-6 py-7 text-sm text-slate-400 md:grid-cols-3 md:px-8">
              <TrustItem icon={<ShieldCheck className="h-5 w-5" />} text="A IA apoia sua reflexão. A decisão é sempre sua." />
              <TrustItem icon={<Gauge className="h-5 w-5" />} text="O consumo é calculado pelo uso real de tokens." />
              <TrustItem icon={<Lock className="h-5 w-5" />} text="Seus pensamentos merecem um espaço organizado." />
            </div>
          </section>

          <section id="como-funciona" className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32">
            <SectionHeading eyebrow="COMO FUNCIONA" title="Uma conversa que coloca ordem no que você sente." description="Você traz a dúvida. O DecidlyAI ajuda a separar fatos, prioridades, riscos e possibilidades para que a sua próxima escolha seja mais consciente." />
            <div className="mt-14 grid gap-5 md:grid-cols-3">
              <Step number="01" icon={<MessageCircle />} title="Conte o contexto" description="Explique o que está acontecendo, o que importa para você e qual decisão precisa tomar." />
              <Step number="02" icon={<Layers3 />} title="Explore os caminhos" description="Compare opções, organize prós e contras e enxergue pontos que podem estar passando despercebidos." />
              <Step number="03" icon={<BrainCircuit />} title="Decida com clareza" description="Use a análise como ponto de partida para agir com mais segurança — no seu ritmo e do seu jeito." />
            </div>
          </section>

          <section id="recursos" className="border-y border-white/[0.08] bg-white/[0.025]">
            <div className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32">
              <SectionHeading eyebrow="POR QUE DECIDLYAI" title="Menos ruído. Mais perspectiva." description="Tudo o que você precisa para transformar uma decisão confusa em uma conversa útil e organizada." />
              <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                <Feature icon={<BrainCircuit />} title="Análise com contexto" description="A resposta considera o cenário que você compartilhou, não apenas uma pergunta solta." />
                <Feature icon={<Zap />} title="Modelos em fallback" description="A plataforma tenta o modelo disponível mais adequado e mantém a conversa fluindo quando um limite é atingido." />
                <Feature icon={<Coins />} title="Créditos transparentes" description="O consumo acompanha os tokens usados, deixando mais claro como cada análise utiliza seus créditos." />
                <Feature icon={<CircleHelp />} title="Histórico de decisões" description="Revisite suas reflexões e acompanhe como suas escolhas foram construídas ao longo do tempo." />
              </div>
            </div>
          </section>

          <section id="planos" className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32">
            <SectionHeading eyebrow="PLANO FREE" title="Comece sem pagar. Entenda antes de avançar." description="Você recebe créditos gratuitos diariamente para experimentar o DecidlyAI de verdade — sem cartão e sem promessa escondida." />
            <div className="mx-auto mt-14 grid max-w-5xl gap-5 lg:grid-cols-[1fr_.82fr]">
              <div className="relative overflow-hidden rounded-3xl border border-violet-300/30 bg-gradient-to-br from-violet-500/15 via-[#111125] to-[#0b0b18] p-7 shadow-[0_20px_80px_rgba(124,58,237,.13)] md:p-9">
                <div className="absolute right-0 top-0 rounded-bl-2xl bg-violet-300 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#171326]">Disponível agora</div>
                <div className="flex items-start justify-between gap-6">
                  <div><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">Free</p><h3 className="mt-3 text-4xl font-semibold tracking-tight">R$ 0<span className="text-lg font-normal text-slate-400"> / sempre</span></h3></div>
                  <Coins className="h-8 w-8 text-violet-300" />
                </div>
                <p className="mt-5 max-w-md leading-7 text-slate-300">Um espaço para começar a organizar suas decisões e descobrir se pensar com mais clareza pode mudar o seu próximo passo.</p>
                <div className="my-7 h-px bg-white/10" />
                <ul className="grid gap-4 text-sm text-slate-200 sm:grid-cols-2">
                  <PlanItem>5 créditos gratuitos por dia</PlanItem>
                  <PlanItem>Acúmulo máximo de 10 créditos gratuitos</PlanItem>
                  <PlanItem>Créditos calculados pelo uso de tokens</PlanItem>
                  <PlanItem>Modelos em fallback automático</PlanItem>
                  <PlanItem>Sem escolha manual de modelo</PlanItem>
                  <PlanItem>Fila de processamento normal</PlanItem>
                  <PlanItem>Sem exportação para PDF</PlanItem>
                  <PlanItem>Créditos comprados não expiram pelo limite de acúmulo</PlanItem>
                </ul>
                <Link to="/login" className="interactive-lift mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 font-semibold text-[#151322] hover:bg-violet-100">Criar minha conta grátis <ArrowRight className="h-5 w-5" /></Link>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-7 md:p-9">
                <div><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">VIP</p><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">Em breve</span></div><h3 className="mt-5 text-3xl font-semibold">Mais espaço para pensar.</h3><p className="mt-4 leading-7 text-slate-400">Quando o plano pago chegar, você terá mais liberdade para usar o produto sem perder a clareza sobre seus créditos.</p><div className="mt-8 space-y-4 text-sm text-slate-300"><PlanItem>10 créditos gratuitos por dia</PlanItem><PlanItem>Acúmulo de até 100 créditos gratuitos</PlanItem><PlanItem>Créditos comprados separados da regra de acúmulo</PlanItem></div></div>
                <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">Os detalhes finais, preço e recursos extras do VIP serão anunciados em breve.</div>
              </div>
            </div>
          </section>

          <FaqSection />

          <section className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32"><div className="relative overflow-hidden rounded-[2rem] border border-violet-300/25 bg-gradient-to-br from-violet-500/20 via-[#17132b] to-[#0e0d1c] px-6 py-16 text-center md:px-12 md:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(196,181,253,.18),transparent_55%)]" /><div className="relative"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">A próxima decisão começa aqui</p><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Você não precisa ter todas as respostas para começar.</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">Dê forma à sua dúvida. O DecidlyAI ajuda você a encontrar clareza no caminho.</p><Link to="/login" className="interactive-lift mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 font-semibold text-[#151322] hover:bg-violet-100">Começar gratuitamente <ArrowRight className="h-5 w-5" /></Link></div></div></section>
        </div>
      </main>
    </AppShell>
  );
}

function DecisionPreview() {
  return <div className="relative mx-auto w-full max-w-xl"><div className="absolute -inset-8 rounded-full bg-violet-500/10 blur-3xl" /><div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#10101d]/90 p-5 shadow-2xl backdrop-blur-xl md:p-7"><div className="flex items-center justify-between border-b border-white/10 pb-5"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300"><BrainCircuit /></div><div><p className="font-semibold">Nova decisão</p><p className="text-xs text-slate-500">Análise em andamento</p></div></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Pronto para explorar</span></div><p className="mt-7 text-xs uppercase tracking-[0.16em] text-slate-500">Sua pergunta</p><h2 className="mt-3 text-2xl font-semibold leading-tight md:text-3xl">Devo aceitar esta nova oportunidade?</h2><div className="mt-7 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-violet-300/30 bg-violet-400/10 p-4"><div className="flex items-center gap-2 text-sm font-semibold text-violet-200"><Sparkles className="h-4 w-4" /> Primeira perspectiva</div><p className="mt-3 text-sm leading-6 text-slate-300">Considere o impacto no seu crescimento, rotina e prioridades atuais.</p></div><div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"><div className="flex items-center gap-2 text-sm font-semibold text-slate-200"><CircleHelp className="h-4 w-4" /> Para refletir</div><p className="mt-3 text-sm leading-6 text-slate-400">Quais condições tornariam essa escolha sustentável para você?</p></div></div><div className="mt-5 flex items-center justify-between rounded-xl bg-black/20 px-4 py-3 text-xs text-slate-500"><span>Uso estimado de tokens</span><span className="text-violet-200">Calculado por análise</span></div></div></div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="max-w-3xl"><p className="text-sm font-semibold tracking-[0.18em] text-violet-300">{eyebrow}</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">{description}</p></div>; }
function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3">{<span className="text-violet-300">{icon}</span>}<span>{text}</span></div>; }
function Step({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 transition duration-200 hover:-translate-y-1 hover:border-violet-300/30"><div className="flex items-center justify-between"><span className="text-sm font-bold tracking-[0.2em] text-violet-300">{number}</span><span className="text-violet-300">{icon}</span></div><h3 className="mt-12 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-slate-400">{description}</p></div>; }
function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) { return <div className="rounded-2xl border border-white/10 bg-[#10101d] p-6 transition duration-200 hover:-translate-y-1 hover:border-violet-300/30"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">{icon}</div><h3 className="mt-6 font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p></div>; }
function PlanItem({ children }: { children: React.ReactNode }) { return <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{children}</li>; }
function FaqSection() {
  const [open, setOpen] = useState<number | null>(0);
  const items = [
    ["Como os créditos são consumidos?", "O consumo é calculado com base na quantidade de tokens usada pela IA. Por isso, uma análise mais longa ou complexa pode consumir uma quantidade diferente de créditos."],
    ["Os créditos gratuitos acumulam?", "Sim. No plano Free, os créditos gratuitos são renovados diariamente e podem acumular até o limite de 10 créditos. Créditos comprados são separados dessa regra de acúmulo."],
    ["Quando o plano VIP estará disponível?", "O plano pago chega em breve. A previsão é oferecer 10 créditos gratuitos diários, acúmulo de até 100 créditos gratuitos e benefícios adicionais que serão anunciados."],
  ];
  return <section className="mx-auto max-w-4xl px-6 py-24 md:px-8 md:py-32"><div className="text-center"><p className="text-sm font-semibold tracking-[0.18em] text-violet-300">DÚVIDAS FREQUENTES</p><h2 className="mt-5 text-4xl font-semibold tracking-tight md:text-5xl">Transparência antes de começar.</h2></div><div className="mt-12 divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/[0.025] px-6">{items.map(([question, answer], index) => <div key={question}><button type="button" aria-expanded={open === index} onClick={() => setOpen(open === index ? null : index)} className="flex w-full items-center justify-between gap-5 py-5 text-left font-medium text-slate-100"><span>{question}</span><ChevronDown className={`h-5 w-5 shrink-0 text-violet-300 transition-transform ${open === index ? "rotate-180" : ""}`} /></button>{open === index && <p className="max-w-3xl pb-5 pr-8 text-sm leading-7 text-slate-400">{answer}</p>}</div>)}</div></section>;
}

export default Index;
