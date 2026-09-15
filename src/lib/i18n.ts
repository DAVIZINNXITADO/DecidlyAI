export type Language =
  | "pt-BR"
  | "en-US"
  | "es-ES"
  | "fr-FR"
  | "de-DE"
  | "it-IT"
  | "ja-JP"
  | "ko-KR"
  | "zh-CN"
  | "hi-IN"
  | "ar-SA"
  | "ru-RU";

export const LANGUAGES: Record<Language, string> = {
  "pt-BR": "Português (Brasil)",
  "en-US": "English (US)",
  "es-ES": "Español (España)",
  "fr-FR": "Français",
  "de-DE": "Deutsch",
  "it-IT": "Italiano",
  "ja-JP": "日本語",
  "ko-KR": "한국어",
  "zh-CN": "简体中文",
  "hi-IN": "हिन्दी",
  "ar-SA": "العربية",
  "ru-RU": "Русский",
};

const coreTranslations = {
  "pt-BR": {
    nav: { workspace: "Workspace", settings: "Configurações", credits: "Créditos", logout: "Sair", howItWorks: "Como funciona", resources: "Recursos", plans: "Planos", signIn: "Entrar", start: "Começar", openMenu: "Abrir menu", closeMenu: "Fechar menu" },
    legal: { links: "Links legais", terms: "Termos de Uso", privacy: "Política de Privacidade", cookies: "Política de Cookies" },
    cookies: { title: "Cookies", subtitle: "Sua privacidade é importante.", description: "Utilizamos cookies e tecnologias semelhantes para manter o funcionamento do DecidlyAI, manter sua sessão e melhorar sua experiência na plataforma.", optional: "Você pode aceitar ou recusar o uso de cookies não essenciais.", readPolicy: "Ler a Política de Cookies", reject: "Recusar", accept: "Aceitar", close: "Fechar aviso de cookies" },
    settings: { title: "Configurações", language: "Idioma", languageLabel: "Idioma da interface", saved: "Sua preferência fica salva neste dispositivo e na sua sessão.", progressive: "Os textos da interface são traduzidos progressivamente." },
  },
  "en-US": {
    nav: { workspace: "Workspace", settings: "Settings", credits: "Credits", logout: "Log out", howItWorks: "How it works", resources: "Resources", plans: "Plans", signIn: "Sign in", start: "Get started", openMenu: "Open menu", closeMenu: "Close menu" },
    legal: { links: "Legal links", terms: "Terms of Use", privacy: "Privacy Policy", cookies: "Cookie Policy" },
    cookies: { title: "Cookies", subtitle: "Your privacy matters.", description: "We use cookies and similar technologies to keep DecidlyAI working, maintain your session, and improve your experience.", optional: "You can accept or refuse non-essential cookies.", readPolicy: "Read Cookie Policy", reject: "Reject", accept: "Accept", close: "Close cookie notice" },
    settings: { title: "Settings", language: "Language", languageLabel: "Interface language", saved: "Your preference is saved on this device and in your session.", progressive: "Interface text is translated progressively." },
  },
  "es-ES": {
    nav: { workspace: "Espacio de trabajo", settings: "Configuración", credits: "Créditos", logout: "Cerrar sesión", howItWorks: "Cómo funciona", resources: "Recursos", plans: "Planes", signIn: "Iniciar sesión", start: "Comenzar", openMenu: "Abrir menú", closeMenu: "Cerrar menú" },
    legal: { links: "Enlaces legales", terms: "Términos de uso", privacy: "Política de privacidad", cookies: "Política de cookies" },
    cookies: { title: "Cookies", subtitle: "Tu privacidad importa.", description: "Usamos cookies y tecnologías similares para mantener DecidlyAI funcionando, mantener tu sesión y mejorar tu experiencia.", optional: "Puedes aceptar o rechazar las cookies no esenciales.", readPolicy: "Leer la política de cookies", reject: "Rechazar", accept: "Aceptar", close: "Cerrar aviso de cookies" },
    settings: { title: "Configuración", language: "Idioma", languageLabel: "Idioma de la interfaz", saved: "Tu preferencia se guarda en este dispositivo y en tu sesión.", progressive: "El texto de la interfaz se traduce progresivamente." },
  },
} as const;

type TranslationTree = (typeof coreTranslations)["pt-BR"];
export const translations: Record<Language, TranslationTree> = Object.fromEntries(
  (Object.keys(LANGUAGES) as Language[]).map((language) => [language, coreTranslations[language as keyof typeof coreTranslations] || coreTranslations["en-US"]]),
) as Record<Language, TranslationTree>;

export function detectBrowserLanguage(): Language {
  if (typeof navigator === "undefined") return "pt-BR";
  const language = navigator.language.toLowerCase();
  const exact = (Object.keys(LANGUAGES) as Language[]).find((item) => item.toLowerCase() === language);
  if (exact) return exact;
  const prefix = language.split("-")[0];
  return (Object.keys(LANGUAGES) as Language[]).find((item) => item.toLowerCase().startsWith(prefix)) || "pt-BR";
}

export function isLanguage(value: string | null): value is Language {
  return Boolean(value && value in LANGUAGES);
}

export function t(language: Language, path: string): string {
  const value = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return key in current ? (current as Record<string, unknown>)[key] : undefined;
  }, translations[language]);
  if (typeof value === "string") return value;
  const fallback = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") return undefined;
    return key in current ? (current as Record<string, unknown>)[key] : undefined;
  }, translations["en-US"]);
  return typeof fallback === "string" ? fallback : path;
}

export function useLanguage(): Language {
  if (typeof window === "undefined") return "pt-BR";
  const stored = window.localStorage.getItem("decidly-language");
  return isLanguage(stored) ? stored : detectBrowserLanguage();
}

export function setLanguage(language: Language): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("decidly-language", language);
  document.documentElement.lang = language;
}
