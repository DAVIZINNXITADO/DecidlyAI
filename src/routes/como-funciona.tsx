import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Brain, FileText, Gift, Link2, MessageCircleQuestion, ShieldCheck, Sparkles, Users, Wrench } from "lucide-react";
import { InnerPage } from "../components/InnerPage";

export const Route = createFileRoute("/como-funciona")({ component: ComoFuncionaPage });

const steps = [
  { icon: Brain, title: "Organize o dilema", text: "Explique o que está acontecendo, quais caminhos existem e o que importa para você." },
  { icon: Sparkles, title: "Explore possibilidades", text: "A IA estrutura contexto, critérios, prós, riscos e cenários para reduzir o ruído mental." },
  { icon: ShieldCheck, title: "Decida com autonomia", text: "Você recebe clareza para pensar melhor. A escolha continua sendo sempre sua." },
];

function ComoFuncionaPage() {
  return <InnerPage eyebrow="DecidlyAI" title="Como funciona" description="Uma forma mais clara e consciente de organizar decisões importantes.">
    <div className="space-y-4">
      {steps.map(({ icon: Icon, title, text }, index) => <article key={title} className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300"><Icon size={21} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Passo {index + 1}</p><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-2 leading-7 text-white/50">{text}</p></div></div></article>)}
      <section className="rounded-3xl border border-amber-300/15 bg-amber-300/[0.06] p-6"><div className="flex items-start gap-4"><Gift className="mt-1 text-amber-300" size={22} /><div><h2 className="text-xl font-semibold">Convide e ganhe</h2><p className="mt-2 leading-7 text-white/55">Compartilhe seu convite com alguém. Quando uma nova conta for criada pelo seu link, a campanha atual libera 30 créditos para cada pessoa elegível.</p><Link to="/referral-history" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-amber-200 hover:text-amber-100">Ver histórico de convites <ArrowRight size={16} /></Link></div></div></section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-start gap-4"><Users className="mt-1 text-violet-300" size={22} /><div><h2 className="text-xl font-semibold">Privacidade em primeiro lugar</h2><p className="mt-2 leading-7 text-white/50">O histórico mostra apenas informações resumidas, sem expor e-mails, nomes completos ou dados de outras pessoas.</p></div></div></section>
      <section className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.06] p-6"><div className="flex items-start gap-4"><Wrench className="mt-1 text-violet-300" size={22} /><div><h2 className="text-xl font-semibold">Ferramentas quando você precisar</h2><p className="mt-2 leading-7 text-white/55">No botão “+”, você encontra Pesquisa avançada, criação de imagem, PDF, texto e arquivo, além de anexar arquivos. A IA também pode sugerir uma ferramenta, mas ações como criação pedem sua autorização antes de começar.</p></div></div></section>
      <section className="grid gap-4 md:grid-cols-2"><InfoCard icon={<MessageCircleQuestion />} title="Perguntas inteligentes" text="Se faltar uma informação importante, a IA pergunta acima da caixa de mensagem sem bloquear sua conversa. Você pode responder ou ignorar." /><InfoCard icon={<FileText />} title="Respostas visuais" text="A IA pode destacar vantagens, desvantagens e atenção, criar blocos copiáveis, resumos, etapas e comparações quando isso melhorar a compreensão." /><InfoCard icon={<Link2 />} title="Links com contexto" text="Links aparecem como cartões clicáveis e identificados como sites externos, para você saber quando está saindo do DecidlyAI." /><InfoCard icon={<ShieldCheck />} title="Você continua no controle" text="A IA pode analisar, organizar e sugerir. Ela não executa uma ação externa ou cria um arquivo sem pedir autorização antes." /></section>
    </div>
  </InnerPage>;
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-400/10 text-violet-300">{icon}</div><h2 className="mt-4 text-lg font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-white/50">{text}</p></article>;
}
