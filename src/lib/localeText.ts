import type { Language } from "./i18n";

const text = {
  "pt-BR": { back: "Voltar ao workspace", account: "Conta", appearance: "Aparência", language: "Idioma", overview: "Visão geral", history: "Histórico", freeCredits: "Créditos grátis", buyCredits: "Comprar créditos", wallet: "Carteira", credits: "Créditos", walletDescription: "Aqui estão os créditos da sua conta.", available: "Total disponível", dailyCredits: "Créditos diários", purchased: "Comprados", historyDescription: "Ganhos e gastos da sua conta", freeDescription: "Créditos diários, convites e anúncios", buyDescription: "Pacotes simples e econômicos", settings: "Configurações", settingsDescription: "Personalize sua conta em seções independentes.", accountDescription: "Nome de preferência e dados da conta", appearanceDescription: "Tema claro ou escuro", languageDescription: "Idioma permanente da interface" },
  "en-US": { back: "Back to workspace", account: "Account", appearance: "Appearance", language: "Language", overview: "Overview", history: "History", freeCredits: "Free credits", buyCredits: "Buy credits", wallet: "Wallet", credits: "Credits", walletDescription: "Here are your account credits.", available: "Total available", dailyCredits: "Daily credits", purchased: "Purchased", historyDescription: "Your account earnings and spending", freeDescription: "Daily credits, referrals and ads", buyDescription: "Simple and affordable packages", settings: "Settings", settingsDescription: "Customize your account in separate sections.", accountDescription: "Preferred name and account details", appearanceDescription: "Light or dark theme", languageDescription: "Permanent interface language" }
} satisfies Record<Language, Record<string, string>>;

export function tx(language: Language, key: Key): string {
  return text[language]?.[key] || text["en-US"][key];
}
