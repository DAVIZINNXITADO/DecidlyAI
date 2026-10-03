import { createFileRoute } from "@tanstack/react-router";
import { SeoArticlePage, type SeoArticleSection } from "../components/SeoArticlePage";
import { SEO_FAQS } from "../lib/seo";

export const Route = createFileRoute("/ajuda-para-escolher-faculdade")({
  component: AjudaParaEscolherFaculdadePage,
});

const sections: SeoArticleSection[] = [
  {
    heading: "Escolher um curso é explorar possibilidades, não prever o futuro",
    paragraphs: [
      "Buscar ajuda para escolher faculdade envolve conciliar interesses, aptidões, expectativas familiares, custos, cidade e perspectivas profissionais. Em vez de exigir uma resposta definitiva sobre “o que vou ser”, descubra quais atividades e formas de aprender despertam sua curiosidade.",
      "O DecidlyAI ajuda a organizar a reflexão com perguntas e comparações. Descreva matérias de que gosta, atividades que quer experimentar, limites de orçamento ou distância e cursos em dúvida. A IA não determina seu futuro: use a conversa para levantar caminhos de pesquisa e confirme tudo em fontes confiáveis e experiências reais.",
    ],
  },
  {
    heading: "Critérios para comparar faculdades e áreas",
    paragraphs: [
      "Não compare só o nome do curso. A grade mostra disciplinas; projetos, estágio e laboratórios revelam como se aprende. Consulte páginas oficiais e, quando possível, converse com estudantes, visite o campus e pergunte sobre rotina e apoio acadêmico.",
    ],
    points: [
      "Interesses e tarefas: quais problemas você gosta de resolver e que tipo de atividade quer praticar no dia a dia?",
      "Currículo e ensino: quais matérias, projetos, estágio e experiências práticas fazem parte da formação?",
      "Condições de estudo: considere mensalidade quando houver, materiais, transporte, moradia, horários e bolsas.",
      "Rotina e bem-estar: avalie duração, deslocamento, carga de estudo, acessibilidade e rede de apoio.",
      "Caminhos profissionais: pesquise áreas de atuação e habilidades solicitadas sem presumir emprego ou salário garantido.",
    ],
  },
  {
    heading: "Como montar uma comparação que respeite suas prioridades",
    paragraphs: [
      "Escolha de três a cinco cursos ou instituições. Anote evidências e dúvidas — grade, custo total, distância e atividades práticas. Priorize critérios importantes para sua realidade; uma tabela pode mostrar diferenças, mas não transforma a escolha em uma pontuação objetiva.",
      "Depois, descubra o que falta: converse com alguém da área, assista a uma aula ou pergunte à instituição sobre bolsas e apoio. Esses passos tornam o curso mais concreto e mostram como ele pode se encaixar na sua vida.",
    ],
  },
  {
    heading: "Perguntas para levar a uma conversa com IA ou orientação vocacional",
    paragraphs: [
      "Uma boa pergunta descreve seu contexto sem exigir que a ferramenta escolha por você. Em vez de “qual carreira devo seguir?”, experimente explicar quais matérias aprecia, o que evita, suas condições práticas e quais cursos está comparando. Peça uma lista de pontos a verificar, uma comparação neutra e perguntas para conversar com pessoas que estudam ou trabalham nas áreas.",
      "Se buscar orientação vocacional, pergunte sobre formação, método e limites. Testes podem ampliar o autoconhecimento, mas não preveem mudanças nos seus interesses ou no mercado. A escolha pode mudar conforme você aprende mais.",
    ],
  },
  {
    heading: "Decida o próximo passo, não toda a sua vida de uma vez",
    paragraphs: [
      "Talvez a melhor meta de hoje seja reduzir a lista a duas opções, descobrir se uma bolsa é viável ou visitar um campus. Registre o que precisa acontecer para avançar e uma data para rever suas descobertas. Se perceber que falta uma informação decisiva, procure-a antes de fechar matrícula. Se as alternativas continuarem abertas, avalie qual delas preserva mais possibilidades sem ignorar os custos reais.",
      "Conversar com a família, professores, estudantes e profissionais pode trazer perspectivas diferentes. Tente distinguir conselho de evidência e opinião de requisito objetivo. Ao final, você deve conseguir explicar por que um caminho faz sentido para seus critérios atuais, o que ainda é incerto e como pretende lidar com essa incerteza — sem precisar prometer que nunca mudará de ideia.",
    ],
  },
];

function AjudaParaEscolherFaculdadePage() {
  return (
    <SeoArticlePage
      eyebrow="ESTUDOS E CARREIRA"
      title="Como escolher faculdade e carreira: perguntas para decidir seu futuro"
      description="Compare interesses, currículos, rotina, custos e caminhos profissionais com perguntas estruturadas — sem tratar um teste como destino."
      sections={sections}
      faqs={SEO_FAQS["/ajuda-para-escolher-faculdade"]!}
    />
  );
}
