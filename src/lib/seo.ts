export const SITE_URL = "https://decidlyai.lovable.app";

export type FaqEntry = { question: string; answer: string };
type RouteSeoEntry = {
  title: string;
  description: string;
  keywords: string;
  ogType?: "website" | "article";
  faqs?: FaqEntry[] | undefined;
};

export const HOME_FAQS: FaqEntry[] = [
  {
    question: "Como os créditos são consumidos?",
    answer:
      "O sistema estima o uso pelo volume de texto enviado (incluindo o contexto da conversa) e pela resposta gerada. Conversas mais longas podem consumir mais. É uma estimativa, não a contagem exata reportada pelo provedor.",
  },
  {
    question: "Os créditos gratuitos acumulam?",
    answer:
      "O saldo diário renovável tem limite de 5 créditos. Créditos obtidos por convites e créditos comprados ficam em saldos separados e seguem suas próprias regras.",
  },
  {
    question: "Quando o plano VIP estará disponível?",
    answer:
      "Ainda não há data, preço, limites ou benefícios confirmados. Nenhum pagamento ou cadastro VIP está disponível; as condições serão publicadas antes de qualquer oferta.",
  },
];

export const SEO_FAQS: Record<string, FaqEntry[]> = {
  "/ia-para-empreendedores": [
    {
      question: "A IA decide qual caminho meu negócio deve seguir?",
      answer:
        "Não. O DecidlyAI ajuda a organizar informações, critérios, hipóteses e riscos para apoiar sua reflexão. A decisão e a responsabilidade continuam com você.",
    },
    {
      question: "Posso usar a IA para validar uma ideia de negócio?",
      answer:
        "Sim, como apoio para estruturar perguntas, pressupostos, público, custos e pequenos testes. A análise não substitui pesquisa com clientes, dados confiáveis nem orientação profissional.",
    },
    {
      question: "Como comparar opções quando os dados ainda são incertos?",
      answer:
        "Separe fatos de suposições, indique o que ainda precisa ser confirmado e compare cenários por critérios definidos. Trate qualquer conclusão como provisória até obter evidências.",
    },
  ],
  "/como-tomar-decisoes-dificeis": [
    {
      question: "Qual é o primeiro passo para tomar uma decisão difícil?",
      answer:
        "Escreva qual escolha precisa ser feita, quais opções reais existem, qual é o prazo e o que não pode ser ignorado. Isso transforma uma preocupação ampla em uma pergunta analisável.",
    },
    {
      question: "A IA pode escolher por mim?",
      answer:
        "Ela pode ajudar a organizar contexto, critérios e consequências, mas não conhece todos os seus valores nem deve assumir a escolha. Use a resposta como apoio, não como ordem.",
    },
    {
      question: "E se eu ainda não tiver todas as informações?",
      answer:
        "Registre as lacunas, identifique quais podem mudar a decisão e procure evidências proporcionais ao risco. Quando possível, faça um teste pequeno e reversível antes de se comprometer.",
    },
  ],
  "/ajuda-para-escolher-faculdade": [
    {
      question: "Como saber qual faculdade combina comigo?",
      answer:
        "Compare interesses, atividades do curso, rotina, custos, localização e possibilidades profissionais. Converse com estudantes e profissionais e use qualquer teste apenas como ponto de partida.",
    },
    {
      question: "Um teste vocacional consegue escolher o curso certo?",
      answer:
        "Não existe teste que determine sozinho a escolha ideal. Questionários podem levantar hipóteses, mas a decisão fica mais informada quando você combina reflexão com pesquisa e experiências reais.",
    },
    {
      question: "E se eu estiver entre dois cursos diferentes?",
      answer:
        "Compare a grade curricular e tarefas do cotidiano, converse com pessoas das duas áreas e avalie custos, duração e opções de mudança. Você também pode listar o que ainda precisa descobrir.",
    },
  ],
};

export const INDEXABLE_PAGES: Record<string, RouteSeoEntry> = {
  "/": {
    title: "DecidlyAI | IA para Tomada de Decisão e Clareza Mental",
    description:
      "Organize dilemas, compare caminhos e avalie prós e riscos com apoio de IA reflexiva. Clareza estruturada para você tomar suas decisões com autonomia.",
    keywords:
      "DecidlyAI, IA para tomada de decisão, clareza mental, inteligência artificial reflexiva, decisões conscientes",
    faqs: HOME_FAQS,
  },
  "/blog": {
    title: "Blog DecidlyAI | Guias e Métodos para Tomar Decisões",
    description:
      "Artigos e guias práticos sobre métodos de decisão, clareza mental e uso consciente de inteligência artificial em escolhas pessoais e de carreira.",
    keywords:
      "DecidlyAI, decisões difíceis, clareza mental, método de decisão, escolhas conscientes, inteligência artificial",
    ogType: "article",
  },
  "/como-funciona": {
    title: "Como Funciona o DecidlyAI: Método de Decisão Guiada por IA",
    description:
      "Entenda como organizar dilemas, comparar cenários e analisar prós e riscos em 3 passos com a IA reflexiva do DecidlyAI. A escolha final continua sua.",
    keywords:
      "DecidlyAI, como tomar decisões difíceis, método de decisão, critérios, análise de riscos, inteligência artificial",
    ogType: "article",
  },
  "/tecnologia": {
    title: "Arquitetura e Tecnologia de IA Multimodelo | DecidlyAI",
    description:
      "Conheça o roteamento automático entre serviços de IA e o consumo estimado por texto; consulte as informações de privacidade disponíveis no DecidlyAI.",
    keywords:
      "DecidlyAI, tecnologia de IA, inteligência artificial, decisões, contexto de conversa, privacidade",
    ogType: "article",
  },
  "/terms": {
    title: "Termos de uso e condições da plataforma | DecidlyAI",
    description:
      "Consulte as condições de uso do DecidlyAI, as responsabilidades de cada pessoa e as regras para acessar os recursos da plataforma com clareza e segurança.",
    keywords: "DecidlyAI, termos de uso, condições, regras da plataforma, serviço",
  },
  "/privacy": {
    title: "Política de privacidade e dados pessoais | DecidlyAI",
    description:
      "Entenda quais informações o DecidlyAI utiliza, como elas são tratadas e quais cuidados ajudam a proteger seus dados ao conversar com a plataforma.",
    keywords: "DecidlyAI, política de privacidade, dados pessoais, proteção de dados, informações",
  },
  "/cookies": {
    title: "Política de cookies e preferências online | DecidlyAI",
    description:
      "Saiba como cookies e tecnologias semelhantes podem ser usados pelo DecidlyAI, para quais finalidades servem e como gerenciar suas preferências no navegador.",
    keywords: "DecidlyAI, política de cookies, preferências, navegador, privacidade",
  },
  "/ia-para-empreendedores": {
    title: "IA para Empreendedores: Decisões de Negócio | DecidlyAI",
    description:
      "Avalie hipóteses, contratações e investimentos de negócio com apoio de IA. Estruture critérios, prós e riscos práticos sem terceirizar sua decisão.",
    keywords:
      "IA para empreendedores, inteligência artificial nos negócios, validação de ideias, decisões empresariais, alocação de recursos, DecidlyAI",
    ogType: "article",
    faqs: SEO_FAQS["/ia-para-empreendedores"],
  },
  "/como-tomar-decisoes-dificeis": {
    title: "Como Tomar Decisões Difíceis com Apoio da IA | DecidlyAI",
    description:
      "Guia prático e direto para definir dilemas, comparar caminhos e avaliar riscos reais. Use a IA para organizar a reflexão e sair da paralisia analítica.",
    keywords:
      "como tomar decisões difíceis, tomada de decisão, paralisia por análise, critérios de escolha, riscos, DecidlyAI",
    ogType: "article",
    faqs: SEO_FAQS["/como-tomar-decisoes-dificeis"],
  },
  "/ajuda-para-escolher-faculdade": {
    title: "Como Escolher Faculdade e Carreira com IA | DecidlyAI",
    description:
      "Compare cursos, faculdades e caminhos profissionais com perguntas estruturadas. Avalie prioridades e custos sem tratar testes vocacionais como destino.",
    keywords:
      "ajuda para escolher faculdade, orientação de carreira, escolha de curso, análise vocacional, cursos universitários, DecidlyAI",
    ogType: "article",
    faqs: SEO_FAQS["/ajuda-para-escolher-faculdade"],
  },
};

const NON_INDEXABLE_TITLES: Record<string, string> = {
  "/login": "Entrar ou criar conta | DecidlyAI",
  "/pt-br/login": "Entrar ou criar conta | DecidlyAI",
  "/reset-password": "Redefinir senha | DecidlyAI",
  "/workspace": "Workspace | DecidlyAI",
  "/pt-br/workspace": "Workspace | DecidlyAI",
  "/credits": "Créditos | DecidlyAI",
  "/credits/free": "Créditos grátis | DecidlyAI",
  "/credits/history": "Histórico de créditos | DecidlyAI",
  "/credits/buy": "Comprar créditos | DecidlyAI",
  "/pt-br/credits": "Créditos | DecidlyAI",
  "/settings": "Configurações | DecidlyAI",
  "/settings/account": "Conta | DecidlyAI",
  "/settings/appearance": "Aparência | DecidlyAI",
  "/settings/language": "Idioma | DecidlyAI",
  "/pt-br/settings": "Configurações | DecidlyAI",
  "/referral-history": "Histórico de indicações | DecidlyAI",
  "/ai-test": "Teste de IA | DecidlyAI",
  "/vip": "Acesso VIP | DecidlyAI",
  "/promo": "Promoção | DecidlyAI",
};

export function resolveRouteSeo(pathname: string, isNotFound = false, hasError = false) {
  const normalizedPath = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
  const publicPage = INDEXABLE_PAGES[normalizedPath];

  if (publicPage && !isNotFound && !hasError) {
    return {
      ...publicPage,
      canonical: `${SITE_URL}${normalizedPath === "/" ? "/" : normalizedPath}`,
      robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
    };
  }

  const title = isNotFound
    ? "Página não encontrada | DecidlyAI"
    : hasError
      ? "Erro temporário | DecidlyAI"
      : (NON_INDEXABLE_TITLES[normalizedPath] ?? "Área do usuário | DecidlyAI");

  const description = isNotFound
    ? "A página solicitada não existe ou foi movida. Volte ao início do DecidlyAI."
    : "Acesse o DecidlyAI para organizar suas decisões com mais clareza.";

  return {
    title,
    description,
    keywords: "DecidlyAI, inteligência artificial, decisões, conta, privacidade",
    canonical: undefined,
    robots: "noindex, nofollow",
    ogType: "website" as const,
    faqs: undefined,
  };
}
