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
    title: "IA para empreendedores e decisões claras | DecidlyAI",
    description:
      "Use a IA para comparar decisões de negócio, vida e carreira. Organize dúvidas, critérios e riscos com o DecidlyAI, mantendo a escolha final em suas mãos.",
    keywords:
      "DecidlyAI, IA para empreendedores, tomada de decisão, escolhas conscientes, inteligência artificial",
    faqs: HOME_FAQS,
  },
  "/blog": {
    title: "Blog: ideias e métodos para decidir melhor | DecidlyAI",
    description:
      "Guias práticos para organizar dilemas, comparar opções e escolher com clareza. Aprenda métodos úteis sem entregar sua autonomia à inteligência artificial.",
    keywords:
      "DecidlyAI, decisões difíceis, clareza mental, método de decisão, escolhas conscientes, inteligência artificial",
    ogType: "article",
  },
  "/como-funciona": {
    title: "Como funciona a IA para tomar decisões | DecidlyAI",
    description:
      "Veja como organizar o contexto, definir critérios, comparar alternativas e avaliar riscos com o apoio de uma IA reflexiva. A decisão final continua sendo sua.",
    keywords:
      "DecidlyAI, como tomar decisões difíceis, método de decisão, critérios, análise de riscos, inteligência artificial",
    ogType: "article",
  },
  "/tecnologia": {
    title: "Tecnologia de IA para decisões melhores | DecidlyAI",
    description:
      "Conheça a tecnologia do DecidlyAI, como a conversa preserva contexto e como os recursos de IA apoiam análises transparentes sem executar escolhas no seu lugar.",
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
    title: "IA para empreendedores: decisões com clareza | DecidlyAI",
    description:
      "Use IA para avaliar ideias, contratações e recursos. Compare alternativas e riscos com critérios práticos, sem terceirizar as decisões do negócio.",
    keywords:
      "IA para empreendedores, inteligência artificial nos negócios, validação de ideias, decisões empresariais, alocação de recursos, DecidlyAI",
    ogType: "article",
    faqs: SEO_FAQS["/ia-para-empreendedores"],
  },
  "/como-tomar-decisoes-dificeis": {
    title: "Como tomar decisões difíceis com apoio da IA | DecidlyAI",
    description:
      "Aprenda a definir o dilema, comparar caminhos, reconhecer riscos e escolher próximos passos. Use IA para estruturar a reflexão, sem decidir por você.",
    keywords:
      "como tomar decisões difíceis, tomada de decisão, paralisia por análise, critérios de escolha, riscos, DecidlyAI",
    ogType: "article",
    faqs: SEO_FAQS["/como-tomar-decisoes-dificeis"],
  },
  "/ajuda-para-escolher-faculdade": {
    title: "Ajuda para escolher faculdade e carreira | DecidlyAI",
    description:
      "Compare cursos, rotina, custos e caminhos profissionais com perguntas estruturadas. Obtenha ajuda para escolher faculdade sem tratar um teste como destino.",
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
