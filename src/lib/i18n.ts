export type Language = "pt-BR" | "en-US" | "es-ES";

export const LANGUAGES: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español (España)",
};

export const translations = {
  "pt-BR": {
    nav: { workspace: "Workspace", settings: "Configurações", credits: "Créditos", logout: "Sair" },
    settings: {
      title: "Configurações",
      account: "Conta",
      appearance: "Aparência",
      language: "Idioma",
      preferredName: "Nome de preferência",
      email: "E-mail",
      signOut: "Sair da conta",
      backToWorkspace: "Voltar ao workspace",
    },
    credits: {
      title: "Créditos",
      overview: "Visão geral",
      history: "Histórico",
      freeCredits: "Créditos grátis",
      buyCredits: "Comprar créditos",
      total: "Total",
      daily: "Diário",
      free: "Grátis",
      purchased: "Comprados",
      wallet: "Carteira",
      yourCredits: "Seus créditos",
    },
    workspace: {
      title: "Workspace",
      newChat: "Nova conversa",
      search: "Pesquisar",
      noChats: "Nenhuma conversa encontrada.",
      renameChat: "Renomear chat",
      deleteChat: "Deletar chat",
      cancel: "Cancelar",
      delete: "Deletar",
      save: "Salvar",
    },
    login: {
      title: "Bem-vindo ao DecidlyAI",
      email: "E-mail",
      password: "Senha",
      signIn: "Entrar",
      signUp: "Criar conta",
    },
  },
  "en-US": {
    nav: { workspace: "Workspace", settings: "Settings", credits: "Credits", logout: "Log out" },
    settings: {
      title: "Settings",
      account: "Account",
      appearance: "Appearance",
      language: "Language",
      preferredName: "Preferred name",
      email: "Email",
      signOut: "Sign out",
      backToWorkspace: "Back to workspace",
    },
    credits: {
      title: "Credits",
      overview: "Overview",
      history: "History",
      freeCredits: "Free credits",
      buyCredits: "Buy credits",
      total: "Total",
      daily: "Daily",
      free: "Free",
      purchased: "Purchased",
      wallet: "Wallet",
      yourCredits: "Your credits",
    },
    workspace: {
      title: "Workspace",
      newChat: "New conversation",
      search: "Search",
      noChats: "No conversations found.",
      renameChat: "Rename chat",
      deleteChat: "Delete chat",
      cancel: "Cancel",
      delete: "Delete",
      save: "Save",
    },
    login: {
      title: "Welcome to DecidlyAI",
      email: "Email",
      password: "Password",
      signIn: "Sign in",
      signUp: "Create account",
    },
  },
  "es-ES": {
    nav: {
      workspace: "Espacio de trabajo",
      settings: "Configuración",
      credits: "Créditos",
      logout: "Cerrar sesión",
    },
    settings: {
      title: "Configuración",
      account: "Cuenta",
      appearance: "Apariencia",
      language: "Idioma",
      preferredName: "Nombre preferido",
      email: "Correo electrónico",
      signOut: "Cerrar sesión",
      backToWorkspace: "Volver al espacio de trabajo",
    },
    credits: {
      title: "Créditos",
      overview: "Resumen",
      history: "Historial",
      freeCredits: "Créditos gratis",
      buyCredits: "Comprar créditos",
      total: "Total",
      daily: "Diario",
      free: "Gratis",
      purchased: "Comprados",
      wallet: "Billetera",
      yourCredits: "Tus créditos",
    },
    workspace: {
      title: "Espacio de trabajo",
      newChat: "Nueva conversación",
      search: "Buscar",
      noChats: "No se encontraron conversaciones.",
      renameChat: "Renombrar chat",
      deleteChat: "Eliminar chat",
      cancel: "Cancelar",
      delete: "Eliminar",
      save: "Guardar",
    },
    login: {
      title: "Bienvenido a DecidlyAI",
      email: "Correo electrónico",
      password: "Contraseña",
      signIn: "Iniciar sesión",
      signUp: "Crear cuenta",
    },
  },
} as const;

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "pt-BR";
  const language = navigator.language.toLowerCase();
  if (language.startsWith("pt")) return "pt-BR";
  if (language.startsWith("es")) return "es-ES";
  if (language.startsWith("en")) return "en-US";
  return "pt-BR";
}

export function t(language: Language, path: string): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return key in current ? (current as Record<string, unknown>)[key] : undefined;
  }, translations[language]);
  return typeof value === "string" ? value : path;
}

export function useLanguage(): Language {
  if (typeof window === "undefined") return "pt-BR";
  const stored = window.localStorage.getItem("decidly-language");
  return stored === "pt-BR" || stored === "en-US" || stored === "es-ES"
    ? stored
    : detectBrowserLanguage();
}

export function setLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("decidly-language", language);
  document.documentElement.lang = language;
}
