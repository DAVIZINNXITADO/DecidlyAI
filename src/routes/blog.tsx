import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BookOpen, Clock3 } from "lucide-react";
import { Fragment } from "react";
import { AdsterraNativeBanner } from "../components/AdsterraAds";
import { InnerPage } from "../components/InnerPage";

export const Route = createFileRoute("/blog")({ component: BlogPage });

const posts = [
  {
    tag: "Clareza mental",
    title: "Como tomar decisões difíceis sem exigir certeza",
    excerpt:
      "Um roteiro para separar fatos, receios e hipóteses quando as opções parecem igualmente importantes.",
    time: "5 min de leitura",
    to: "/como-tomar-decisoes-dificeis",
  },
  {
    tag: "Empreendedorismo",
    title: "IA para empreendedores: compare critérios antes de agir",
    excerpt:
      "Organize hipóteses, recursos e riscos sem confundir uma resposta fluente com evidência de mercado.",
    time: "6 min de leitura",
    to: "/ia-para-empreendedores",
  },
  {
    tag: "Estudos e carreira",
    title: "Ajuda para escolher faculdade e curso",
    excerpt:
      "Compare currículo, rotina, custos e caminhos profissionais sem tratar um teste como destino.",
    time: "4 min de leitura",
    to: "/ajuda-para-escolher-faculdade",
  },
] as const;

function BlogPage() {
  return (
    <InnerPage
      eyebrow="Blog DecidlyAI"
      title="Ideias, guias e métodos para tomar decisões conscientes"
      description="Conteúdos práticos sobre clareza, reflexão e escolhas conscientes — sem prometer respostas mágicas."
      backLinkRel="nofollow"
    >
      <div className="mb-6 flex items-center gap-3 rounded-3xl border border-violet-300/15 bg-violet-400/[0.07] p-5">
        <BookOpen className="text-violet-300" size={23} />
        <p className="text-sm leading-6 text-white/60">
          Leia no seu ritmo. O objetivo não é decidir por você, mas ajudar a enxergar melhor o
          caminho.
        </p>
      </div>
      <div className="space-y-4">
        {posts.map((post, index) => (
          <Fragment key={post.title}>
            <article className="group rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:border-violet-300/30 hover:bg-white/[0.05]">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                {post.tag}
              </p>
              <h2 className="mt-3 text-xl font-semibold leading-snug">{post.title}</h2>
              <p className="mt-3 leading-7 text-white/50">{post.excerpt}</p>
              <div className="mt-5 flex items-center justify-between gap-3 text-xs text-white/35">
                <span className="inline-flex items-center gap-2">
                  <Clock3 size={14} /> {post.time}
                </span>
                <Link
                  to={post.to}
                  className="inline-flex items-center gap-2 font-semibold text-violet-200 transition group-hover:text-white"
                >
                  Explorar <ArrowRight size={15} />
                </Link>
              </div>
            </article>
            {index === 0 && <AdsterraNativeBanner placement="in-content" />}
          </Fragment>
        ))}
      </div>
      <section className="mt-10 space-y-4" aria-labelledby="decision-method-heading">
        <h2 id="decision-method-heading" className="text-2xl font-semibold text-white">
          Um método prático para pensar antes de escolher
        </h2>
        <p className="leading-7 text-white/65">
          Decidir melhor não significa eliminar toda dúvida. Significa tornar explícito o que está
          em jogo, descobrir quais informações podem mudar sua avaliação e escolher um próximo passo
          proporcional ao risco. Comece escrevendo uma pergunta concreta e um prazo realista.
          Depois, liste as alternativas disponíveis, incluindo adiar por um período ou testar uma
          versão menor antes de assumir um compromisso difícil de reverter.
        </p>
        <p className="leading-7 text-white/65">
          Em seguida, defina critérios que representem suas prioridades: custo, tempo, impacto nas
          pessoas, aprendizado, bem-estar ou possibilidade de voltar atrás. Separe o que sabe do que
          está supondo e anote de onde veio cada informação. Quando uma lacuna puder mudar muito o
          resultado, procure uma fonte confiável ou converse com alguém diretamente envolvido antes
          de tratar uma hipótese como fato.
        </p>
        <ol className="list-decimal space-y-2 pl-6 leading-7 text-white/65 marker:text-violet-300">
          <li>Descreva a decisão em uma frase e identifique quem será afetado.</li>
          <li>
            Compare opções usando os mesmos critérios, não apenas uma lista de prós e contras.
          </li>
          <li>Considere cenários favoráveis e desfavoráveis e quais riscos podem ser reduzidos.</li>
          <li>Escolha um próximo passo observável e marque quando vai revisar o que aprendeu.</li>
        </ol>
        <h2 className="pt-3 text-2xl font-semibold text-white">
          Onde a inteligência artificial pode ajudar
        </h2>
        <p className="leading-7 text-white/65">
          Uma IA pode fazer perguntas, reorganizar o contexto, mostrar critérios que ficaram de fora
          e comparar cenários descritos por você. Isso é útil quando a mente está repetindo as
          mesmas possibilidades ou quando você precisa explicar o dilema para outra pessoa. Para
          receber uma análise mais relevante, apresente limites, objetivos e incertezas; peça que a
          resposta diferencie fatos fornecidos, interpretações e perguntas em aberto.
        </p>
        <p className="leading-7 text-white/65">
          A ferramenta não conhece sua vida inteira, não confirma por conta própria se os dados
          estão atualizados e não deve assumir a responsabilidade por sua escolha. Revise nomes,
          números e recomendações; para decisões médicas, jurídicas ou financeiras de alto impacto,
          procure orientação profissional. O papel da tecnologia é ajudar a estruturar a reflexão
          para que você decida com autonomia, não pressionar por uma resposta definitiva.
        </p>
        <h2 className="pt-3 text-2xl font-semibold text-white">
          Escolha o guia que conversa com o seu contexto
        </h2>
        <p className="leading-7 text-white/65">
          Dilemas de trabalho e negócios podem pedir hipóteses e testes pequenos; escolhas de estudo
          podem exigir comparar currículo, rotina e custos; mudanças pessoais podem depender de
          valores, relações e reversibilidade. Explore os guias desta página, adapte as perguntas à
          sua realidade e volte aos seus critérios sempre que surgir uma nova informação. Uma boa
          decisão não precisa ser perfeita: ela precisa ser consciente, informada e revisável quando
          as circunstâncias mudarem.
        </p>
      </section>
    </InnerPage>
  );
}
