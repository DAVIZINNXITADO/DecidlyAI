import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { InnerPage } from "../components/InnerPage";

export const Route = createFileRoute("/blog")({ component: BlogPage });

const posts = [
  { tag: "Clareza mental", title: "Como parar de girar em círculos antes de decidir", excerpt: "Um método simples para separar fatos, medos e hipóteses quando tudo parece urgente.", time: "5 min de leitura" },
  { tag: "Decisões", title: "Prós e contras não bastam: compare critérios", excerpt: "Aprenda a avaliar opções pelo que realmente importa para a sua vida, não apenas pela quantidade de argumentos.", time: "6 min de leitura" },
  { tag: "Autonomia", title: "Como usar IA sem terceirizar suas escolhas", excerpt: "A tecnologia pode organizar o pensamento sem substituir seus valores, contexto e responsabilidade.", time: "4 min de leitura" },
];

function BlogPage() {
  return <InnerPage eyebrow="Blog DecidlyAI" title="Ideias para decidir melhor" description="Conteúdos práticos sobre clareza, reflexão e escolhas conscientes — sem prometer respostas mágicas.">
    <div className="mb-6 flex items-center gap-3 rounded-3xl border border-violet-300/15 bg-violet-400/[0.07] p-5"><BookOpen className="text-violet-300" size={23} /><p className="text-sm leading-6 text-white/60">Leia no seu ritmo. O objetivo não é decidir por você, mas ajudar a enxergar melhor o caminho.</p></div>
    <div className="space-y-4">{posts.map((post) => <article key={post.title} className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-violet-300/30 hover:bg-white/[0.05]"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">{post.tag}</p><h2 className="mt-3 text-xl font-semibold leading-snug">{post.title}</h2><p className="mt-3 leading-7 text-white/50">{post.excerpt}</p><div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/35"><span className="inline-flex items-center gap-2"><Clock3 size={14} /> {post.time}</span><Link to="/como-funciona" className="inline-flex items-center gap-2 font-semibold text-violet-200 transition group-hover:text-white">Explorar <ArrowRight size={15} /></Link></div></article>)}</div>
  </InnerPage>;
}
