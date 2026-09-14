import { translations, Language } from './i18n';

export const LANGUAGES: Record<Language, string> = {
  'pt-BR': 'Português (Brasil)',
  'en-US': 'English (US)',
  'es-ES': 'Español (España)',
};

export { translations, detectBrowserLanguage, t, useLanguage, setLanguage } from './i18n';
export type { Language };
