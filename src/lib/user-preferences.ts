import type { Language } from "./i18n";

export type UserPreferences = {
  idioma_preferido: Language;
  tema: "violet" | "high_contrast" | "compact";
  densidade_do_chat: "comfortable" | "compact";
  tom_da_ia: "direct" | "balanced" | "detailed";
  modelo_preferido: "auto" | "gpt-4o" | "gpt-4o-mini" | null;
  notificacoes_de_credito: boolean;
  rolagem_apos_resposta: "near_bottom" | "always" | "never";
  mostrar_indicadores_credito: boolean;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  idioma_preferido: "pt-BR",
  tema: "violet",
  densidade_do_chat: "comfortable",
  tom_da_ia: "balanced",
  modelo_preferido: "auto",
  notificacoes_de_credito: true,
  rolagem_apos_resposta: "near_bottom",
  mostrar_indicadores_credito: true,
};

export function normalizeUserPreferences(value: unknown): UserPreferences {
  const row = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    idioma_preferido: row.idioma_preferido === "en-US" ? "en-US" : "pt-BR",
    tema: row.tema === "high_contrast" || row.tema === "compact" ? row.tema : "violet",
    densidade_do_chat: row.densidade_do_chat === "compact" ? "compact" : "comfortable",
    tom_da_ia:
      row.tom_da_ia === "direct" || row.tom_da_ia === "detailed" ? row.tom_da_ia : "balanced",
    modelo_preferido:
      row.modelo_preferido === "gpt-4o" || row.modelo_preferido === "gpt-4o-mini"
        ? row.modelo_preferido
        : "auto",
    notificacoes_de_credito: row.notificacoes_de_credito !== false,
    rolagem_apos_resposta:
      row.rolagem_apos_resposta === "always" || row.rolagem_apos_resposta === "never"
        ? row.rolagem_apos_resposta
        : "near_bottom",
    mostrar_indicadores_credito: row.mostrar_indicadores_credito !== false,
  };
}

export function applyThemePreference(theme: UserPreferences["tema"]): void {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.add("dark");
  document.body.dataset.theme = theme;
  try {
    window.localStorage.setItem("decidly-theme", theme);
  } catch {
    // Preferências do navegador podem estar desativadas; o estado da página continua aplicado.
  }
}
