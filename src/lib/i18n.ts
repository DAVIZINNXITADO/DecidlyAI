// Tipos de linguagem suportadas
export type Language = 'pt-BR' | 'en-US' | 'es-ES';

// Dicionário completo de traduções
export const translations = {
  'pt-BR': {
    nav: {
      workspace: 'Workspace',
      settings: 'Configurações',
      credits: 'Créditos',
      logout: 'Sair',
    },
    settings: {
      title: 'Configurações',
      account: 'Conta',
      appearance: 'Aparência',
      language: 'Idioma',
      preferredName: 'Nome de Preferência',
      email: 'Email',
      signOut: 'Sair da Conta',
      backToWorkspace: 'Voltar ao Workspace',
    },
    credits: {
      title: 'Créditos',
      overview: 'Visão Geral',
      history: 'Histórico',
      freeCredits: 'Créditos Grátis',
      buyCredits: 'Comprar Créditos',
      total: 'Total',
      daily: 'Diário',
      free: 'Grátis',
      purchased: 'Comprados',
      wallet: 'Carteira',
      yourCredits: 'Seus créditos',
    },
    workspace: {
      title: 'Workspace',
      newChat: 'Nova conversa',
      search: 'Pesquisar',
      noChats: 'Nenhuma conversa encontrada.',
      renameChat: 'Renomear chat',
      deleteChat: 'Deletar chat',
      cancel: 'Cancelar',
      delete: 'Deletar',
      save: 'Salvar',
    },
    login: {
      title: 'Bem-vindo ao DecidlyAI',
      email: 'Email',
      password: 'Senha',
      signIn: 'Entrar',
      signUp: 'Criar conta',
    },
  },
  'en-US': {
    nav: {
      workspace: 'Workspace',
      settings: 'Settings',
      credits: 'Credits',
      logout: 'Logout',
    },
    settings: {
      title: 'Settings',
      account: 'Account',
      appearance: 'Appearance',
      language: 'Language',
      preferredName: 'Preferred Name',
      email: 'Email',
      signOut: 'Sign Out',
      backToWorkspace: 'Back to Workspace',
    },
    credits: {
      title: 'Credits',
      overview: 'Overview',
      history: 'History',
      freeCredits: 'Free Credits',
      buyCredits: 'Buy Credits',
      total: 'Total',
      daily: 'Daily',
      free: 'Free',
      purchased: 'Purchased',
      wallet: 'Wallet',
      yourCredits: 'Your credits',
    },
    workspace: {
      title: 'Workspace',
      newChat: 'New conversation',
      search: 'Search',
      noChats: 'No conversations found.',
      renameChat: 'Rename chat',
      deleteChat: 'Delete chat',
      cancel: 'Cancel',
      delete: 'Delete',
      save: 'Save',
    },
    login: {
      title: 'Welcome to DecidlyAI',
      email: 'Email',
      password: 'Password',
      signIn: 'Sign In',
      signUp: 'Create Account',
    },
  },
  'es-ES': {
    nav: {
      workspace: 'Espacio de trabajo',
      settings: 'Configuración',
      credits: 'Créditos',
      logout: 'Cerrar sesión',
    },
    settings: {
      title: 'Configuración',
      account: 'Cuenta',
      appearance: 'Apariencia',
      language: 'Idioma',
      preferredName: 'Nombre Preferido',
      email: 'Correo electrónico',
      signOut: 'Cerrar sesión',
      backToWorkspace: 'Volver al Espacio de trabajo',
    },
    credits: {
      title: 'Créditos',
      overview: 'Resumen',
      history: 'Historial',
      freeCredits: 'Créditos Gratis',
      buyCredits: 'Comprar Créditos',
      total: 'Total',
      daily: 'Diario',
      free: 'Gratis',
      purchased: 'Comprados',
      wallet: 'Billetera',
      yourCredits: 'Tus créditos',
    },
    workspace: {
      title: 'Espacio de trabajo',
      newChat: 'Nueva conversación',
      search: 'Buscar',
      noChats: 'No se encontraron conversaciones.',
      renameChat: 'Renombrar chat',
      deleteChat: 'Eliminar chat',
      cancel: 'Cancelar',
      delete: 'Eliminar',
      save: 'Guardar',
    },
    login: {
      title: 'Bienvenido a DecidlyAI',
      email: 'Correo electrónico',
      password: 'Contraseña',
      signIn: 'Iniciar sesión',
      signUp: 'Crear cuenta',
    },
  },
} as const;

export function detectBrowserLanguage(): Language {
  if (typeof navigator === 'undefined') return 'pt-BR';
  const lang = navigator.language || (navigator as any).userLanguage;
  if (lang.startsWith('pt')) return 'pt-BR';
  if (lang.startsWith('es')) return 'es-ES';
  if (lang.startsWith('en')) return 'en-US';
  return 'pt-BR';
}

export function t(language: Language, path: string): string {
  const keys = path.split('.');
  let current: any = translations[language];
  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      return path;
    }
  }
  return typeof current === 'string' ? current : path;
}

export function useLanguage(): Language {
  if (typeof window === 'undefined') return 'pt-BR';
  return (window.localStorage.getItem('decidly-language') as Language) || detectBrowserLanguage();
}

export function setLanguage(lang: Language) {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('decidly-language', lang);
    document.documentElement.lang = lang;
  }
}
