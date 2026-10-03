import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BrainCircuit,
  Check,
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
import { useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SeoFaqSection } from "../components/SeoArticlePage";
import { Navbar } from "../components/Navbar";
import { HOME_FAQS } from "../lib/seo";
import { supabase } from "../lib/supabase";

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
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        void navigate({ to: "/workspace", replace: true });
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

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
              <TrustItem icon={<Gauge className="h-5 w-5" />} text="O consumo usa uma estimativa baseada no volume de texto enviado e gerado." />
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
                <Feature icon={<Zap />} title="Roteamento automático" description="A plataforma gerencia a rota de IA configurada para o ambiente, sem exigir escolha manual." />
                <Feature icon={<Coins />} title="Créditos transparentes" description="O consumo é estimado pelo volume de contexto e de resposta; conversas mais longas podem usar mais créditos." />
                <Feature icon={<CircleHelp />} title="Histórico de conversas" description="Retome conversas anteriores e releia suas reflexões quando precisar." />
              </div>
            </div>
          </section>

          <section
            id="decisoes-na-pratica"
            className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32"
            aria-label="Guias para suas escolhas"
          >
            <SectionHeading
              eyebrow="GUIAS PARA SUAS ESCOLHAS"
              title="Uma conversa útil para cada tipo de decisão."
              description="Explore orientações práticas para negócios, escolhas complexas e estudos. A IA organiza possibilidades; seus critérios e sua decisão continuam no centro."
            />
            <div className="mt-12 grid gap-5 md:grid-cols-3">
              <article className="rounded-2xl border border-white/10 bg-[#10101d] p-6">
                <h3 className="text-xl font-semibold">IA para empreendedores</h3>
                <p className="mt-3 leading-7 text-slate-400">
                  Estruture hipóteses de negócio, compare contratações e pense na alocação de
                  recursos com critérios explícitos e atenção ao que ainda precisa ser validado.
                </p>
                <Link
                  to="/ia-para-empreendedores"
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-violet-200 hover:text-white"
                >
                  Explorar decisões de negócio <ArrowRight size={16} />
                </Link>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#10101d] p-6">
                <h3 className="text-xl font-semibold">Como tomar decisões difíceis</h3>
                <p className="mt-3 leading-7 text-slate-400">
                  Defina o dilema, separe fatos de suposições e compare caminhos sem exigir uma
                  certeza que talvez não exista.
                </p>
                <Link
                  to="/como-tomar-decisoes-dificeis"
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-violet-200 hover:text-white"
                >
                  Ver um método de decisão <ArrowRight size={16} />
                </Link>
              </article>
              <article className="rounded-2xl border border-white/10 bg-[#10101d] p-6">
                <h3 className="text-xl font-semibold">Ajuda para escolher faculdade</h3>
                <p className="mt-3 leading-7 text-slate-400">
                  Compare cursos, rotina, custos e possibilidades profissionais sem tratar um teste
                  ou uma resposta automática como destino.
                </p>
                <Link
                  to="/ajuda-para-escolher-faculdade"
                  className="mt-5 inline-flex items-center gap-2 font-semibold text-violet-200 hover:text-white"
                >
                  Explorar opções de estudo <ArrowRight size={16} />
                </Link>
              </article>
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
                  <PlanItem>Saldo diário renovável limitado a 5 créditos</PlanItem>
                  <PlanItem>Consumo estimado pelo volume de texto</PlanItem>
                  <PlanItem>Rota de IA gerenciada automaticamente</PlanItem>
                  <PlanItem>Sem escolha manual de modelo</PlanItem>
                  <PlanItem>Histórico de conversas</PlanItem>
                  <PlanItem>Exportação básica de respostas em PDF</PlanItem>
                  <PlanItem>Créditos comprados em saldo separado</PlanItem>
                </ul>
                <Link to="/login" className="interactive-lift mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-4 font-semibold text-[#151322] hover:bg-violet-100">Criar minha conta grátis <ArrowRight className="h-5 w-5" /></Link>
              </div>

              <div className="flex flex-col justify-between rounded-3xl border border-white/10 bg-white/[0.035] p-7 md:p-9">
                <div><div className="flex items-center justify-between"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">VIP</p><span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-400">Em breve</span></div><h3 className="mt-5 text-3xl font-semibold">Uma experiência premium em preparação.</h3><p className="mt-4 leading-7 text-slate-400">O plano ainda não está disponível. Preço, limites e benefícios não estão definidos e serão comunicados antes de qualquer oferta.</p></div>
                <div className="mt-10 rounded-2xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-slate-400">Nenhum pagamento ou cadastro VIP pode ser feito no momento.</div>
              </div>
            </div>
          </section>

          <SeoFaqSection
            items={HOME_FAQS}
            eyebrow="DÚVIDAS FREQUENTES"
            title="Transparência antes de começar."
          />

          <section className="mx-auto max-w-7xl px-6 py-24 md:px-8 md:py-32"><div className="relative overflow-hidden rounded-[2rem] border border-violet-300/25 bg-gradient-to-br from-violet-500/20 via-[#17132b] to-[#0e0d1c] px-6 py-16 text-center md:px-12 md:py-20"><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(196,181,253,.18),transparent_55%)]" /><div className="relative"><p className="text-sm font-semibold uppercase tracking-[0.18em] text-violet-200">A próxima decisão começa aqui</p><h2 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Você não precisa ter todas as respostas para começar.</h2><p className="mx-auto mt-5 max-w-xl leading-7 text-slate-300">Dê forma à sua dúvida. O DecidlyAI ajuda você a encontrar clareza no caminho.</p><Link to="/login" className="interactive-lift mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-4 font-semibold text-[#151322] hover:bg-violet-100">Começar gratuitamente <ArrowRight className="h-5 w-5" /></Link></div></div></section>
        </div>
      </main>
    </AppShell>
  );
}

function DecisionPreview() {
  return (
    <div className="relative mx-auto w-full max-w-xl">
      <div className="absolute -inset-8 rounded-full bg-violet-500/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2rem] border border-white/15 bg-[#10101d]/95 p-4 shadow-2xl backdrop-blur-xl md:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">
              <BrainCircuit />
            </div>
            <div>
              <p className="font-semibold">DecidlyAI</p>
              <p className="text-xs text-slate-500">Uma conversa para pensar melhor</p>
            </div>
          </div>
          <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">Online</span>
        </div>

        <div className="space-y-4 py-5">
          <div className="flex justify-end">
            <div className="max-w-[86%] rounded-2xl rounded-br-md bg-violet-500 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-violet-950/20">
              Recebi uma proposta de emprego melhor, mas teria que me mudar para outra cidade. Como posso decidir?
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-400/15 text-violet-300">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.045] px-4 py-3 text-sm leading-6 text-slate-300">
              Essa decisão parece envolver dois pontos principais: <strong className="text-white">crescimento profissional</strong> e <strong className="text-white">qualidade de vida</strong>.
              <div className="mt-3 space-y-2 border-t border-white/10 pt-3 text-xs leading-5 text-slate-400">
                <p><span className="font-semibold text-violet-200">Considere:</span> salário, custo de vida e oportunidades reais de evolução.</p>
                <p><span className="font-semibold text-violet-200">Reflita:</span> você teria uma rede de apoio e uma saída segura se não desse certo?</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-xs text-slate-500">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
          O DecidlyAI organiza a dúvida. A decisão continua sendo sua.
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) { return <div className="max-w-3xl"><p className="text-sm font-semibold tracking-[0.18em] text-violet-300">{eyebrow}</p><h2 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">{title}</h2><p className="mt-5 max-w-2xl text-lg leading-8 text-slate-400">{description}</p></div>; }
function TrustItem({ icon, text }: { icon: React.ReactNode; text: string }) { return <div className="flex items-center gap-3">{<span className="text-violet-300">{icon}</span>}<span>{text}</span></div>; }
function Step({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-7 transition duration-200 hover:-translate-y-1 hover:border-violet-300/30"><div className="flex items-center justify-between"><span className="text-sm font-bold tracking-[0.2em] text-violet-300">{number}</span><span className="text-violet-300">{icon}</span></div><h3 className="mt-12 text-xl font-semibold">{title}</h3><p className="mt-3 leading-7 text-slate-400">{description}</p></div>; }
function Feature({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) { return <div className="rounded-2xl border border-white/10 bg-[#10101d] p-6 transition duration-200 hover:-translate-y-1 hover:border-violet-300/30"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-400/15 text-violet-300">{icon}</div><h3 className="mt-6 font-semibold">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{description}</p></div>; }
function PlanItem({ children }: { children: React.ReactNode }) { return <li className="flex gap-3"><Check className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />{children}</li>; }
export default Index;
