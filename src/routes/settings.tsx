import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Globe2, Moon, Save, Sun, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/settings")({ component: Settings });

function Settings() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("pt-BR");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? "");
      const metadata = user.user_metadata as { name?: string; full_name?: string; display_name?: string } | undefined;
      setName(metadata?.name ?? metadata?.full_name ?? metadata?.display_name ?? "");
    });
    setTheme(window.localStorage.getItem("decidly-theme") || "dark");
    setLanguage(window.localStorage.getItem("decidly-language") || "pt-BR");
  }, []);

  const save = async () => {
    await supabase.auth.updateUser({ data: { name: name.trim(), display_name: name.trim() } });
    window.localStorage.setItem("decidly-preferred-name", name.trim());
    window.localStorage.setItem("decidly-theme", theme);
    window.localStorage.setItem("decidly-language", language);
    document.documentElement.dataset.theme = theme;
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <main className="min-h-[100dvh] bg-[#0d0912] px-4 py-6 text-white sm:px-8"><div className="mx-auto max-w-3xl"><Link to="/workspace" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><ArrowLeft size={17} /> Back to workspace</Link><div className="mt-10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Preferences</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Settings</h1><p className="mt-3 leading-7 text-white/50">Personalize sua conta e a forma como você usa o DecidlyAI.</p></div><div className="mt-8 space-y-5"><section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center gap-3"><UserRound className="text-violet-300" size={21} /><div><h2 className="text-xl font-semibold">Account</h2><p className="text-sm text-white/40">Como devemos chamar você?</p></div></div><label className="mt-6 block text-sm text-white/55">Preferred name<input value={name} onChange={(event) => setName(event.target.value)} className="mt-2 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-white outline-none transition focus:border-violet-300/50" placeholder="Seu nome" /></label><label className="mt-4 block text-sm text-white/55">Email<input value={email} readOnly className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white/45 outline-none" /></label></section><section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center gap-3"><Moon className="text-violet-300" size={21} /><div><h2 className="text-xl font-semibold">Appearance</h2><p className="text-sm text-white/40">Escolha a aparência do aplicativo.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setTheme("dark")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${theme === "dark" ? "border-violet-300/50 bg-violet-400/[0.10]" : "border-white/10 bg-black/10"}`}><Moon size={18} /><span><b className="block">Dark</b><small className="text-white/40">A experiência atual do DecidlyAI</small></span></button><button type="button" onClick={() => setTheme("light")} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${theme === "light" ? "border-violet-300/50 bg-violet-400/[0.10]" : "border-white/10 bg-black/10"}`}><Sun size={18} /><span><b className="block">Light</b><small className="text-white/40">Disponível para personalização futura</small></span></button></div></section><section className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-center gap-3"><Globe2 className="text-violet-300" size={21} /><div><h2 className="text-xl font-semibold">Language</h2><p className="text-sm text-white/40">Defina seu idioma preferido.</p></div></div><select value={language} onChange={(event) => setLanguage(event.target.value)} className="mt-6 w-full rounded-2xl border border-white/10 bg-[#17101f] px-4 py-3 text-white outline-none"><option value="pt-BR">Português (Brasil)</option><option value="en-US">English (US)</option><option value="es-ES">Español</option></select><p className="mt-3 text-xs text-white/35">A interface principal será traduzida gradualmente. A preferência já fica salva na sua conta local.</p></section><button type="button" onClick={() => void save()} className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-5 py-4 font-semibold transition hover:bg-violet-400">{saved ? <Check size={18} /> : <Save size={18} />}{saved ? "Saved" : "Save changes"}</button></div></div></main>
  );
}
