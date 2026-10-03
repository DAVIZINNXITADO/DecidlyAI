import { createFileRoute } from "@tanstack/react-router";
import { SeoArticlePage, type SeoArticleSection } from "../components/SeoArticlePage";
import { SEO_FAQS } from "../lib/seo";

export const Route = createFileRoute("/ia-para-empreendedores")({
  component: IaParaEmpreendedoresPage,
});

const sections: SeoArticleSection[] = [
  {
    heading: "O que significa usar IA para empreendedores?",
    paragraphs: [
      "Empreender envolve escolhas sob incerteza: lançar ou revisar uma ideia, contratar agora ou esperar, concentrar recursos em um canal ou testar outro. IA para empreendedores pode ser uma forma de estruturar essas perguntas, organizar o contexto e enxergar alternativas que merecem investigação. O DecidlyAI é um espaço de conversa para colocar a situação em palavras e refletir sobre opções; ele não administra a empresa nem decide no lugar de quem conhece o negócio.",
      "A utilidade começa quando você fornece informações concretas: objetivo, prazo, orçamento disponível, pessoas afetadas e o que já foi tentado. Com esse contexto, a conversa pode separar fatos de suposições, indicar critérios de comparação e revelar quais dados ainda faltam. A resposta é um apoio para raciocinar, não uma previsão de mercado nem uma garantia de resultado.",
    ],
  },
  {
    heading: "Decisões de negócio que podem ser organizadas",
    paragraphs: [
      "Na validação de uma ideia, por exemplo, você pode descrever quem teria o problema, qual alternativa existe hoje e o que precisaria ser verdade para a proposta fazer sentido. A IA pode ajudar a transformar isso em hipóteses verificáveis e perguntas para entrevistas, sem afirmar que existe demanda antes de você conversar com clientes ou examinar evidências.",
      "Na contratação, a reflexão pode comparar o trabalho que está ficando descoberto, o custo total, a urgência e alternativas temporárias. Para alocação de recursos, você pode colocar lado a lado projetos, dependências, cenários de retorno e consequências de adiar cada um. Em todos esses casos, resultados financeiros, obrigações trabalhistas e dados do setor precisam ser conferidos em fontes adequadas.",
    ],
    points: [
      "Validar uma ideia: explicitar público, problema, hipótese e menor teste possível.",
      "Planejar uma contratação: registrar necessidade, orçamento, impacto e alternativas.",
      "Alocar recursos: comparar prioridade, custo de oportunidade, risco e reversibilidade.",
      "Escolher um próximo passo: definir responsável, prazo e sinal que indicaria aprendizado.",
    ],
  },
  {
    heading: "Um processo simples para decidir com mais clareza",
    paragraphs: [
      "Comece formulando uma pergunta específica, como “qual experimento cabe no orçamento deste mês?” em vez de “minha empresa vai dar certo?”. Depois, liste as opções reais — inclusive manter a situação por um período ou fazer um teste menor. Defina de três a cinco critérios importantes, como custo, tempo, impacto no cliente, esforço da equipe e possibilidade de voltar atrás.",
      "Peça uma comparação explícita por critério e solicite que a análise marque o que é informação fornecida, inferência ou dado ainda desconhecido. Isso evita confundir uma resposta bem escrita com prova. Se as opções dependerem de números, inclua valores e premissas verificáveis; caso contrário, deixe claro que a conclusão é qualitativa.",
      "Por fim, escolha uma ação proporcional ao risco. Um piloto com prazo e métrica definidos costuma ensinar mais do que uma grande aposta baseada em uma conversa. Registre o que esperava observar, quando vai rever a hipótese e quais resultados fariam você continuar, mudar ou encerrar o teste.",
    ],
  },
  {
    heading: "Benefícios e limites: a decisão continua humana",
    paragraphs: [
      "Uma estrutura pode reduzir a sensação de estar pensando em círculos, dar visibilidade a critérios que estavam misturados e facilitar a comunicação com sócios ou equipe. Também ajuda a perceber quando duas pessoas discordam porque valorizam resultados diferentes, e não porque uma delas está sendo irracional. Esses benefícios dependem da qualidade do contexto e da revisão crítica de quem usa a ferramenta.",
      "Não envie segredos comerciais, dados pessoais de clientes ou informações confidenciais de colaboradores sem avaliar as regras aplicáveis e as configurações disponíveis. Não use uma resposta automática como aconselhamento contábil, jurídico, financeiro ou de recursos humanos. Para decisões de alto impacto, valide os fatos, consulte profissionais qualificados e ouça as pessoas diretamente afetadas.",
    ],
  },
];

function IaParaEmpreendedoresPage() {
  return (
    <SeoArticlePage
      eyebrow="DECISÕES PARA NEGÓCIOS"
      title="IA para empreendedores: estruture decisões de negócio com clareza e método"
      description="Organize hipóteses, critérios e riscos de negócio com apoio de inteligência artificial — sem terceirizar a decisão que pertence a você."
      sections={sections}
      faqs={SEO_FAQS["/ia-para-empreendedores"]!}
    />
  );
}
