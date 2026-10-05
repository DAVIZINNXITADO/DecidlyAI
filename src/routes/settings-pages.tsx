import { Check, Contrast, Moon, SlidersHorizontal, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { LanguageSelector } from "../components/LanguageSelector";
import { InnerPage, SettingsNav } from "../components/InnerPage";
import { isLanguage, type Language } from "../lib/i18n";
import { useLanguageContext } from "../lib/LanguageProvider";
import { tx } from "../lib/localeText";
import { supabase } from "../lib/supabase";
import {
  applyThemePreference,
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  type UserPreferences,
} from "../lib/user-preferences";

function AccountPage() {
  const { language } = useLanguageContext();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email || "");
      const metadata = user.user_metadata as { name?: string; display_name?: string } | undefined;
      setName(metadata?.name || metadata?.display_name || "");
    });
  }, []);
  const save = async () => {
    setError("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setError(language === "pt-BR" ? "Entre novamente para salvar." : "Sign in again to save.");
      return;
    }
    const preferredName = name.trim();
    const { error: updateError } = await supabase.auth.updateUser({ data: { name: preferredName, display_name: preferredName } });
    if (updateError) {
      setError(language === "pt-BR" ? "Não foi possível salvar o nome." : "Could not save your name.");
      return;
    }
    await supabase.from("profiles").update({ full_name: preferredName }).eq("id", auth.user.id);
    try { localStorage.setItem("decidly-preferred-name", preferredName); } catch { /* armazenamento local opcional */ }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1500);
  };
  return (
    <InnerPage eyebrow={tx(language, "settings")} title={tx(language, "account")} description={tx(language, "accountDescription")}>
      <SettingsNav active="account" />
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
        <UserRound aria-hidden="true" className="text-violet-300" />
        <label className="mt-6 block text-sm text-white/75" htmlFor="preferred-name">{language === "pt-BR" ? "Nome de preferência" : "Preferred name"}<input id="preferred-name" value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none focus:border-violet-300/50" /></label>
        <label className="mt-4 block text-sm text-white/75" htmlFor="account-email">Email<input id="account-email" value={email} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/40" /></label>
        <p className="mt-4 text-xs text-white/45">{language === "pt-BR" ? "E-mail e senha não podem ser alterados nesta área." : "Email and password cannot be changed here."}</p>
        {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
        <button type="button" onClick={() => void save()} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200">{saved ? <Check size={16} aria-hidden="true" /> : null}{saved ? (language === "pt-BR" ? "Salvo" : "Saved") : (language === "pt-BR" ? "Salvar nome" : "Save name")}</button>
      </div>
    </InnerPage>
  );
}

function AppearancePage() {
  const { language } = useLanguageContext();
  const [theme, setTheme] = useState<UserPreferences["tema"]>("violet");
  const [error, setError] = useState("");
  const options = [
    { value: "violet" as const, title: language === "pt-BR" ? "Violeta padrão" : "Violet default", detail: language === "pt-BR" ? "Modo escuro e identidade violeta." : "Dark mode and violet identity." },
    { value: "high_contrast" as const, title: language === "pt-BR" ? "Alto contraste" : "High contrast", detail: language === "pt-BR" ? "Realça textos e contornos sem mudar o tema escuro." : "Emphasizes text and outlines while keeping dark mode." },
    { value: "compact" as const, title: language === "pt-BR" ? "Compacto" : "Compact", detail: language === "pt-BR" ? "Reduz espaçamentos preservando controles." : "Reduces spacing while keeping controls." },
  ];
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data, error: loadError } = await supabase.from("user_preferences").select("tema").eq("user_id", auth.user.id).maybeSingle();
      if (!active) return;
      if (loadError) setError(language === "pt-BR" ? "Não foi possível carregar o tema salvo." : "Could not load your saved theme.");
      const next = normalizeUserPreferences(data).tema;
      setTheme(next);
      applyThemePreference(next);
    })();
    return () => { active = false; };
  }, [language]);
  const choose = async (next: UserPreferences["tema"]) => {
    setError("");
    setTheme(next);
    applyThemePreference(next);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error: saveError } = await supabase.from("user_preferences").upsert({ user_id: auth.user.id, tema: next }, { onConflict: "user_id" });
    if (saveError) setError(language === "pt-BR" ? "O tema foi aplicado, mas não pôde ser salvo na conta." : "The theme was applied but could not be saved to your account.");
  };
  return (
    <InnerPage eyebrow={tx(language, "settings")} title={tx(language, "appearance")} description={tx(language, "appearanceDescription")}>
      <SettingsNav active="appearance" />
      <div className="grid gap-3 sm:grid-cols-3">{options.map((option) => <button key={option.value} type="button" aria-pressed={theme === option.value} onClick={() => void choose(option.value)} className={`min-h-36 rounded-3xl border p-5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 ${theme === option.value ? "border-violet-300/50 bg-violet-400/[0.1]" : "border-white/10 bg-white/[0.035] hover:bg-white/[0.07]"}`}>{option.value === "high_contrast" ? <Contrast aria-hidden="true" className="text-violet-200" /> : option.value === "compact" ? <SlidersHorizontal aria-hidden="true" className="text-violet-200" /> : <Moon aria-hidden="true" className="text-violet-300" />}<b className="mt-4 block">{option.title}</b><small className="mt-1 block leading-5 text-white/50">{option.detail}</small></button>)}</div>
      {error && <p role="alert" className="mt-4 text-sm text-red-200">{error}</p>}
    </InnerPage>
  );
}

function LanguagePage() {
  const { language: currentLanguage, setLanguage: setGlobalLanguage } = useLanguageContext();
  const [language, setLanguage] = useState<Language>(currentLanguage);
  const [error, setError] = useState("");
  useEffect(() => setLanguage(currentLanguage), [currentLanguage]);
  const choose = async (next: string) => {
    if (!isLanguage(next)) return;
    setError("");
    setLanguage(next);
    setGlobalLanguage(next);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    const { error: saveError } = await supabase.from("user_preferences").upsert({ user_id: auth.user.id, idioma_preferido: next }, { onConflict: "user_id" });
    if (saveError) setError(next === "pt-BR" ? "O idioma foi aplicado, mas não pôde ser salvo na conta." : "The language was applied but could not be saved to your account.");
  };
  return (
    <InnerPage eyebrow={tx(language, "settings")} title={tx(language, "language")} description={tx(language, "languageDescription")}>
      <SettingsNav active="language" />
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-white/70">{tx(language, "languageLabel")}</p><p className="mt-1 text-sm text-white/45">{language === "pt-BR" ? "Idioma da interface e das respostas da IA." : "Interface and AI response language."}</p></div><LanguageSelector onChange={(next) => void choose(next)} /></div><p className="mt-4 text-xs text-white/45">{language === "pt-BR" ? "Salvo na sua conta; o histórico não é traduzido automaticamente." : "Saved to your account; history is not translated automatically."}</p>{error && <p role="alert" className="mt-3 text-sm text-red-200">{error}</p>}</div>
    </InnerPage>
  );
}

export function WorkspacePreferencesPage() {
  const { language: currentLanguage, setLanguage: setGlobalLanguage } = useLanguageContext();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [plan, setPlan] = useState("free");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [status, setStatus] = useState("");
  useEffect(() => {
    let active = true;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        if (active) { setStatus(currentLanguage === "pt-BR" ? "Entre para editar suas preferências." : "Sign in to edit your preferences."); setLoaded(true); }
        return;
      }
      const [{ data, error: preferenceError }, { data: profile }] = await Promise.all([
        supabase.from("user_preferences").select("idioma_preferido,tema,densidade_do_chat,tom_da_ia,modelo_preferido,notificacoes_de_credito,rolagem_apos_resposta,mostrar_indicadores_credito").eq("user_id", auth.user.id).maybeSingle(),
        supabase.from("profiles").select("plan").eq("id", auth.user.id).maybeSingle(),
      ]);
      if (!active) return;
      if (preferenceError) setStatus(currentLanguage === "pt-BR" ? "Não foi possível carregar as preferências salvas." : "Could not load saved preferences.");
      const normalized = normalizeUserPreferences(data);
      setPreferences(normalized);
      setPlan(String(profile?.plan ?? "free").toLowerCase());
      setGlobalLanguage(normalized.idioma_preferido);
      applyThemePreference(normalized.tema);
      setLoaded(true);
    })();
    return () => { active = false; };
  }, [currentLanguage, setGlobalLanguage]);
  const update = <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    setStatus("");
    if (key === "idioma_preferido") setGlobalLanguage(value as Language);
    if (key === "tema") applyThemePreference(value as UserPreferences["tema"]);
  };
  const save = async () => {
    setSaving(true);
    setStatus("");
    const { data: auth, error: authError } = await supabase.auth.getUser();
    if (authError || !auth.user) {
      setStatus(currentLanguage === "pt-BR" ? "Sua sessão expirou. Entre novamente." : "Your session expired. Sign in again.");
      setSaving(false);
      return;
    }
    const safePreferences = { ...preferences };
    if (plan !== "vip" && plan !== "premium") safePreferences.modelo_preferido = "auto";
    const { error: saveError } = await supabase.from("user_preferences").upsert({ user_id: auth.user.id, ...safePreferences }, { onConflict: "user_id" });
    if (saveError) setStatus(currentLanguage === "pt-BR" ? "Não foi possível salvar. Verifique sua conexão e tente novamente." : "Could not save. Check your connection and try again.");
    else { setPreferences(safePreferences); setStatus(currentLanguage === "pt-BR" ? "Preferências salvas na sua conta." : "Preferences saved to your account."); }
    setSaving(false);
  };
  const pt = currentLanguage === "pt-BR";
  const labelClass = "block text-sm font-medium text-white/75";
  const selectClass = "mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#17101f] px-3 py-2 text-sm text-white outline-none focus:border-violet-300/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-200";
  return (
    <InnerPage eyebrow={tx(currentLanguage, "settings")} title={pt ? "Preferências do workspace" : "Workspace preferences"} description={pt ? "Ajuste idioma, aparência e comportamento. Suas escolhas ficam vinculadas à sua conta." : "Adjust language, appearance, and behavior. Your choices are tied to your account."}>
      <SettingsNav active="preferences" />
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 sm:p-7">
        {!loaded ? <p role="status" className="text-sm text-white/55">{pt ? "Carregando preferências…" : "Loading preferences…"}</p> : (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className={labelClass}>{pt ? "Idioma preferido" : "Preferred language"}<select className={selectClass} value={preferences.idioma_preferido} onChange={(event) => update("idioma_preferido", event.target.value as Language)}><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option></select></label>
            <label className={labelClass}>{pt ? "Tema" : "Theme"}<select className={selectClass} value={preferences.tema} onChange={(event) => update("tema", event.target.value as UserPreferences["tema"])}><option value="violet">{pt ? "Violeta padrão" : "Violet default"}</option><option value="high_contrast">{pt ? "Alto contraste" : "High contrast"}</option><option value="compact">{pt ? "Compacto" : "Compact"}</option></select></label>
            <label className={labelClass}>{pt ? "Densidade do chat" : "Chat density"}<select className={selectClass} value={preferences.densidade_do_chat} onChange={(event) => update("densidade_do_chat", event.target.value as UserPreferences["densidade_do_chat"])}><option value="comfortable">{pt ? "Confortável" : "Comfortable"}</option><option value="compact">{pt ? "Compacta" : "Compact"}</option></select></label>
            <label className={labelClass}>{pt ? "Tom da IA" : "AI tone"}<select className={selectClass} value={preferences.tom_da_ia} onChange={(event) => update("tom_da_ia", event.target.value as UserPreferences["tom_da_ia"])}><option value="direct">{pt ? "Direto" : "Direct"}</option><option value="balanced">{pt ? "Equilibrado" : "Balanced"}</option><option value="detailed">{pt ? "Detalhado" : "Detailed"}</option></select></label>
            <label className={labelClass}>{pt ? "Modelo de IA" : "AI model"}{plan === "vip" || plan === "premium" ? <select className={selectClass} value={preferences.modelo_preferido ?? "auto"} onChange={(event) => update("modelo_preferido", event.target.value as UserPreferences["modelo_preferido"])}><option value="auto">{pt ? "Automático" : "Automatic"}</option><option value="gpt-4o">GPT-4o</option><option value="gpt-4o-mini">GPT-4o mini</option></select> : <span className="mt-2 block min-h-11 rounded-xl border border-white/10 bg-black/20 px-3 py-3 text-sm text-white/50">{plan === "dev" ? (pt ? "DEV — use /free, /vip ou /anexar" : "DEV — use /free, /vip, or /anexar") : (pt ? "Plano Free — modelos gratuitos configurados" : "Free plan — configured free models")}</span>}</label>
            <label className={labelClass}>{pt ? "Rolagem após a resposta" : "Scroll after a response"}<select className={selectClass} value={preferences.rolagem_apos_resposta} onChange={(event) => update("rolagem_apos_resposta", event.target.value as UserPreferences["rolagem_apos_resposta"])}><option value="near_bottom">{pt ? "Manter perto do final" : "Stay near the bottom"}</option><option value="always">{pt ? "Sempre acompanhar" : "Always follow"}</option><option value="never">{pt ? "Não rolar automaticamente" : "Never auto-scroll"}</option></select></label>
            <Toggle label={pt ? "Notificações de créditos" : "Credit notifications"} checked={preferences.notificacoes_de_credito} onChange={(value) => update("notificacoes_de_credito", value)} />
            <Toggle label={pt ? "Mostrar indicadores de créditos no workspace" : "Show credit indicators in workspace"} checked={preferences.mostrar_indicadores_credito} onChange={(value) => update("mostrar_indicadores_credito", value)} />
          </div>
        )}
        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5"><button type="button" disabled={!loaded || saving} onClick={() => void save()} className="min-h-11 rounded-xl bg-violet-500 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200">{saving ? (pt ? "Salvando…" : "Saving…") : (pt ? "Salvar preferências" : "Save preferences")}</button>{status && <p role="status" aria-live="polite" className={`text-sm ${/não foi|Não foi|Could not|expirou/i.test(status) ? "text-red-200" : "text-emerald-200"}`}>{status}</p>}</div>
        <p className="mt-4 text-xs leading-5 text-white/45">{pt ? "Free utiliza apenas modelos gratuitos configurados. O tom altera o estilo, não regras de segurança ou permissões. Créditos e controles essenciais continuam disponíveis." : "Free uses configured free models only. Tone changes style, not safety rules or permissions. Credits and essential controls remain available."}</p>
      </div>
    </InnerPage>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-11 items-center justify-between gap-4 rounded-xl border border-white/10 bg-black/10 px-3 py-3 text-sm text-white/75"><span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-violet-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-200" /></label>;
}

export { AccountPage, AppearancePage, LanguagePage };
