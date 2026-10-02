export const SITE_URL = "https://decidlyai.lovable.app";

const INDEXABLE_PAGES: Record<string, { title: string; description: string }> = {
  "/": {
    title: "DecidlyAI | IA para tomar decisões com clareza",
    description:
      "Organize dilemas, compare cenários e tome decisões conscientes com inteligência artificial reflexiva. Reduza o ruído mental sem terceirizar sua escolha.",
  },
  "/blog": {
    title: "Blog DecidlyAI | Ideias para decidir melhor",
    description:
      "Conteúdos práticos sobre clareza, reflexão e escolhas conscientes — sem prometer respostas mágicas.",
  },
  "/como-funciona": {
    title: "Como funciona o DecidlyAI | Decisões com clareza",
    description:
      "Entenda como o DecidlyAI organiza contexto, critérios, riscos e caminhos para ajudar você a refletir e decidir com autonomia.",
  },
  "/tecnologia": {
    title: "Tecnologia DecidlyAI | IA que acompanha seu contexto",
    description:
      "Conheça como a tecnologia do DecidlyAI escolhe automaticamente rotas de IA para manter suas análises fluindo com contexto e menos interrupções.",
  },
  "/terms": {
    title: "Termos de Uso | DecidlyAI",
    description:
      "Leia os Termos de Uso do DecidlyAI e conheça as regras e condições para utilizar a plataforma.",
  },
  "/privacy": {
    title: "Política de Privacidade | DecidlyAI",
    description:
      "Saiba como o DecidlyAI coleta, utiliza e protege informações pessoais durante o uso da plataforma.",
  },
  "/cookies": {
    title: "Política de Cookies | DecidlyAI",
    description:
      "Entenda como o DecidlyAI utiliza cookies e tecnologias semelhantes para fornecer e melhorar a plataforma.",
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
    canonical: undefined,
    robots: "noindex, nofollow",
  };
}
