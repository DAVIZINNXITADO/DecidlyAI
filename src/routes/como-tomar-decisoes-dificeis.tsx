import { createFileRoute } from "@tanstack/react-router";
import { SeoArticlePage, type SeoArticleSection } from "../components/SeoArticlePage";
import { SEO_FAQS } from "../lib/seo";

export const Route = createFileRoute("/como-tomar-decisoes-dificeis")({
  component: ComoTomarDecisoesDificeisPage,
});

const sections: SeoArticleSection[] = [
  {
    heading: "Por que algumas escolhas parecem tão difíceis?",
    paragraphs: [
      "Uma decisão fica pesada quando envolve valores importantes, consequências duradouras, informação incompleta ou pessoas de quem gostamos. Às vezes, a dificuldade aumenta porque tentamos resolver tudo de uma vez: o medo de errar, a opinião dos outros, o custo de cada opção e a imagem de um futuro que ainda não existe. Perguntar como tomar decisões difíceis não significa buscar uma resposta infalível; significa encontrar uma forma mais clara de pensar apesar da incerteza.",
      "A inteligência artificial pode servir como interlocutora para organizar o raciocínio. No DecidlyAI, você descreve o dilema e pede ajuda para separar fatos, prioridades, hipóteses, riscos e próximos passos. A ferramenta não conhece toda a sua história nem deve substituir seu julgamento. O valor está em melhorar as perguntas e tornar as escolhas comparáveis, não em obedecer a uma recomendação automática.",
    ],
  },
  {
    heading: "Um método em seis passos para sair da paralisia",
    paragraphs: [
      "Use o roteiro abaixo como ponto de partida. Ajuste-o à importância e à urgência da escolha: uma decisão reversível do cotidiano não precisa de uma análise extensa, enquanto uma mudança de carreira ou uma decisão que afeta outras pessoas pode exigir tempo, conversa e informação especializada.",
    ],
    points: [
      "Defina a pergunta: escreva o que precisa ser escolhido e até quando, sem misturar várias decisões em uma só.",
      "Liste opções reais: inclua adiar por um prazo definido, testar em pequena escala ou combinar caminhos quando isso for possível.",
      "Separe fatos e suposições: marque o que você sabe, o que acredita e o que poderia confirmar antes de agir.",
      "Escolha critérios: considere valores, custos, saúde, tempo, relações, risco e o que seria difícil desfazer.",
      "Compare consequências: imagine um cenário provável, um cenário favorável e um desfavorável para cada alternativa.",
      "Defina o próximo passo: decida o que fazer, qual sinal acompanhar e quando revisar a escolha.",
    ],
  },
  {
    heading: "Como comparar caminhos sem transformar tudo em uma planilha",
    paragraphs: [
      "Uma matriz simples pode ajudar: coloque as opções nas colunas e os critérios nas linhas, depois descreva como cada caminho atende ao que importa. Use pesos apenas se eles realmente representarem suas prioridades; um número não torna objetivo um julgamento subjetivo. Se duas opções parecem empatadas, pergunte qual delas preserva mais alternativas ou gera aprendizado com menor custo.",
      "Também vale fazer o exercício de olhar para trás. Imagine que passou um ano e a escolha não funcionou como esperado: o que provavelmente contribuiu? Em seguida, imagine o resultado positivo e identifique quais condições o tornaram possível. Esse contraste ajuda a descobrir riscos que podem ser prevenidos e expectativas que precisam de evidência.",
    ],
  },
  {
    heading: "Quando a decisão está pronta o bastante?",
    paragraphs: [
      "Nem toda incerteza pode ser eliminada. Uma escolha pode estar pronta quando você entende os principais custos e benefícios, sabe quais fatos continuam desconhecidos, consultou as pessoas necessárias e tem um plano razoável para lidar com um resultado diferente do esperado. “Pronta o bastante” não é certeza; é um nível de compreensão compatível com o risco e com o prazo disponíveis.",
      "Se a informação que falta puder alterar muito o resultado, procure-a antes de se comprometer. Se a espera tiver custo alto, identifique uma ação reversível que reduza a incerteza. Se houver questões legais, médicas ou financeiras relevantes, leve a análise para um profissional habilitado. Em situações de violência ou risco imediato, priorize apoio humano e serviços de emergência da sua região.",
    ],
  },
  {
    heading: "Use a IA como apoio, não como autoridade",
    paragraphs: [
      "Para obter uma análise melhor, conte qual é a pergunta, explique seus limites e peça à IA que apresente argumentos a favor e contra cada opção, indique lacunas e faça perguntas quando faltar contexto. Corrija qualquer dado inventado ou interpretação que não combine com a realidade. Uma boa resposta deve deixar claro o que é hipótese e facilitar seu julgamento; ela não precisa escolher por você.",
    ],
  },
];

function ComoTomarDecisoesDificeisPage() {
  return (
    <SeoArticlePage
      eyebrow="MÉTODO DE DECISÃO"
      title="Como tomar decisões difíceis com apoio da IA"
      description="Um roteiro para definir o dilema, comparar alternativas e escolher o próximo passo sem exigir certeza absoluta."
      sections={sections}
      faqs={SEO_FAQS["/como-tomar-decisoes-dificeis"]!}
    />
  );
}
