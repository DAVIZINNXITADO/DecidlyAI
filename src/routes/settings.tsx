import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ChevronRight, Globe2, Moon, SlidersHorizontal, UserRound } from "lucide-react";
import { InnerPage, SettingsNav } from "../components/InnerPage";
import { useLanguageContext } from "../lib/LanguageProvider";
import { tx } from "../lib/localeText";
export const Route = createFileRoute("/settings")({ component: Settings });
function Settings() {
  const location = useLocation();
  const { language } = useLanguageContext();
  if (location.pathname !== "/settings") return <Outlet />;
  return (
    <InnerPage eyebrow={tx(language, "settings")} title={tx(language, "settings")} description={tx(language, "settingsDescription")}>
      <SettingsNav active="" />
      <div className="space-y-3">
        <SettingCard to="/settings/account" icon={<UserRound className="text-violet-300" />} title={tx(language, "account")} description={tx(language, "accountDescription")} />
        <SettingCard to="/settings/appearance" icon={<Moon className="text-violet-300" />} title={tx(language, "appearance")} description={tx(language, "appearanceDescription")} />
        <SettingCard to="/settings/language" icon={<Globe2 className="text-violet-300" />} title={tx(language, "language")} description={tx(language, "languageDescription")} />
        <SettingCard to="/settings/preferences" icon={<SlidersHorizontal className="text-violet-300" />} title={language === "pt-BR" ? "Preferências do workspace" : "Workspace preferences"} description={language === "pt-BR" ? "Idioma, chat, tom da IA, modelo e notificações." : "Language, chat, AI tone, model, and notifications."} />
      </div>
    </InnerPage>
  );
}
function SettingCard({ to, icon, title, description }: { to: "/settings/account" | "/settings/appearance" | "/settings/language" | "/settings/preferences"; icon: ReactNode; title: string; description: string }) {
  return <Link to={to} className="flex min-h-16 items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"><span aria-hidden="true">{icon}</span><span className="flex-1"><b className="block">{title}</b><small className="text-white/50">{description}</small></span><ChevronRight size={18} aria-hidden="true" /></Link>;
}
