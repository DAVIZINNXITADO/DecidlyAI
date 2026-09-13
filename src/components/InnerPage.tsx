import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function InnerPage({ eyebrow, title, description, children }: { eyebrow: string; title: string; description?: string; children: ReactNode }) {
  return <main className="min-h-[100dvh] bg-[#0d0912] px-4 py-6 text-white sm:px-8"><div className="mx-auto max-w-3xl"><Link to="/workspace" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><ArrowLeft size={17} /> Back to workspace</Link><header className="mt-10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">{eyebrow}</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">{title}</h1>{description && <p className="mt-3 leading-7 text-white/50">{description}</p>}</header><div className="mt-8">{children}</div></div></main>;
}

export function SettingsNav({ active }: { active: string }) {
  const items = [["Account", "/settings/account"], ["Appearance", "/settings/appearance"], ["Language", "/settings/language"]] as const;
  return <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2">{items.map(([label, to]) => <Link key={to} to={to} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm ${active === label ? "bg-violet-500 text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}>{label}</Link>)}</nav>;
}

export function CreditNav({ active }: { active: string }) {
  const items = [["Overview", "/credits"], ["History", "/credits/history"], ["Free Credits", "/credits/free"], ["Buy Credits", "/credits/buy"]] as const;
  return <nav className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.035] p-2">{items.map(([label, to]) => <Link key={to} to={to} className={`whitespace-nowrap rounded-xl px-3 py-2 text-sm ${active === label ? "bg-violet-500 text-white" : "text-white/55 hover:bg-white/[0.06] hover:text-white"}`}>{label}</Link>)}</nav>;
}
