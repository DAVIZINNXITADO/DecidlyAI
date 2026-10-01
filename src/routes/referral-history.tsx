import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Clock3, Gift, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { InnerPage } from "../components/InnerPage";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/referral-history")({ component: ReferralHistoryPage });

type Referral = { id: string; reward_credits: number | null; status: string; created_at: string; qualified_at: string | null };

function ReferralHistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let active = true; void (async () => { const { data: auth } = await supabase.auth.getUser(); if (!auth.user) { void navigate({ to: "/login" }); return; } const { data } = await supabase.from("referral_events").select("id,reward_credits,status,created_at,qualified_at").eq("inviter_user_id", auth.user.id).order("created_at", { ascending: false }).limit(50); if (active) { setItems((data || []) as Referral[]); setLoading(false); } })(); return () => { active = false; }; }, [navigate]);
  return <InnerPage eyebrow="Convites" title="Histórico de convites" description="Acompanhe suas recompensas sem revelar nomes, e-mails ou qualquer dado pessoal de convidados.">
    <div className="mb-5 flex items-start gap-3 rounded-3xl border border-emerald-300/15 bg-emerald-300/[0.06] p-5"><ShieldCheck className="mt-0.5 shrink-0 text-emerald-300" size={21} /><p className="text-sm leading-6 text-white/55">Cada registro representa uma conta convidada. Para proteger todo mundo, mostramos apenas o status e os créditos.</p></div>
    <div className="space-y-3">{loading ? <p className="rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-sm text-white/45">Carregando histórico…</p> : items.length === 0 ? <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center"><Gift className="mx-auto text-violet-300" size={28} /><p className="mt-4 font-semibold">Nenhum convite registrado ainda</p><p className="mt-2 text-sm leading-6 text-white/45">Compartilhe seu convite no workspace para começar.</p><Link to="/workspace" className="mt-5 inline-flex rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white">Voltar ao workspace</Link></div> : items.map((item) => { const qualified = item.status === "qualified"; return <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${qualified ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-300"}`}>{qualified ? <CheckCircle2 size={19} /> : <Clock3 size={19} />}</div><div className="min-w-0 flex-1"><p className="font-semibold">{qualified ? "Convite qualificado" : "Convite em análise"}</p><p className="mt-1 text-xs text-white/35">{new Date(item.qualified_at || item.created_at).toLocaleDateString("pt-BR")}</p></div><strong className={qualified ? "text-emerald-300" : "text-white/45"}>{qualified ? `+${Number(item.reward_credits || 0).toFixed(0)}` : "Pendente"}</strong></div>; })}</div>
  </InnerPage>;
}
