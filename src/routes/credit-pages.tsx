import { Link } from "@tanstack/react-router";
import { Check, Copy, Gift, History, Play, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { CreditNav, InnerPage } from "../components/InnerPage";
import { dailyCreditsBalance, normalizeCreditWallet, type CreditWallet } from "../lib/credits";

type Event = { id: string; event_type: string; amount: number; description: string | null; created_at: string };
type Wallet = CreditWallet;
const packages = [{ credits: 10, price: "R$ 1,90" }, { credits: 30, price: "R$ 4,90" }, { credits: 100, price: "R$ 12,90" }];
const eventLabel = (event: Event) => event.event_type === "usage" ? "AI usage" : event.event_type === "daily_free" ? "Daily credits" : event.event_type === "referral" ? "Referral reward" : event.event_type === "rewarded_ad" ? "Rewarded ad" : event.description || "Credit adjustment";

function useCreditData() {
  const [wallet, setWallet] = useState<Wallet>(normalizeCreditWallet({ daily_credits_limit: 10 }));
  const [events, setEvents] = useState<Event[]>([]); const [code, setCode] = useState("");
  const load = useCallback(async () => { const { data: auth } = await supabase.auth.getUser(); const user = auth.user; if (!user) return; const [{ data: credits }, { data: history }, { data: referral }] = await Promise.all([supabase.from("ai_credits").select("free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at").eq("user_id", user.id).maybeSingle(), supabase.from("credit_events").select("id,event_type,amount,description,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100), supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle()]); if (credits) setWallet(normalizeCreditWallet(credits)); setEvents((history || []) as Event[]); if (referral?.code) setCode(referral.code); }, []);
  useEffect(() => { void load(); const timer = window.setInterval(() => void load(), 1000); return () => window.clearInterval(timer); }, [load]); return { wallet, events, code, dailyBalance: dailyCreditsBalance(wallet) };
}

export function HistoryPage() {
  const { events } = useCreditData();
  return <InnerPage eyebrow="Credits" title="History" description="Veja todos os ganhos e gastos da sua carteira."><CreditNav active="History" /><div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">{events.length ? events.map((event) => <div key={event.id} className="flex items-center gap-3 border-b border-white/[0.06] py-4 last:border-0"><span className={`font-semibold ${event.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}>{event.amount >= 0 ? "+" : ""}{Number(event.amount).toFixed(2)}</span><span className="flex-1 text-sm text-white/70">{eventLabel(event)}</span><time className="text-xs text-white/30">{new Date(event.created_at).toLocaleDateString("pt-BR")}</time></div>) : <p className="text-sm text-white/45">Nenhuma movimentação ainda.</p>}</div></InnerPage>;
}

export function FreePage() {
  const { wallet, code, dailyBalance } = useCreditData();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/login?ref=${code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return <InnerPage eyebrow="Credits" title="Free Credits" description="Ganhe créditos sem pagar, de forma clara e segura."><CreditNav active="Free Credits" /><div className="space-y-4"><div className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.07] p-6"><div className="flex items-center gap-3"><Gift className="text-violet-300" /><div><p className="text-sm text-white/45">Seu saldo gratuito</p><p className="text-3xl font-semibold">{wallet.free_credits.toFixed(2)}</p></div></div><p className="mt-5 text-sm text-white/50">Créditos diários: {dailyBalance.toFixed(0)}/{wallet.daily_credits_limit >= 9999 ? "♾" : wallet.daily_credits_limit}</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><h2 className="text-xl font-semibold">Referral program</h2><p className="mt-2 text-sm leading-6 text-white/50">Crie uma conta pelo seu link. Quando uma pessoa nova ou inativa criar a conta e enviar a primeira mensagem, vocês dois recebem <b className="text-white">25 free credits</b>.</p><div className="mt-4 flex gap-2 rounded-2xl bg-black/20 p-2"><code className="flex-1 px-2 py-2 text-sm text-violet-200">{code || "Gerando código…"}</code><button type="button" onClick={() => void copy()} className="rounded-xl bg-white/[0.08] px-3"><>{copied ? <Check size={16} /> : <Copy size={16} />}</></button></div><p className="mt-3 text-xs text-white/35">Você não pode convidar a si mesmo. Contas já ativas não participam; apenas contas novas ou inativas pode se qualificar.</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex gap-3"><Play className="text-amber-300" /><div><h2 className="font-semibold">AdShield Rewards</h2><p className="mt-1 text-sm leading-6 text-white/45">Assista a um anúncio verificado e receba +5 free credits. O programa será ativado com um provedor anti-fraude.</p></div></div><button disabled className="mt-5 w-full rounded-xl bg-white/[0.07] px-4 py-3 text-sm text-white/40">AdShield Rewards coming soon</button></div></div></InnerPage>;
}

export function BuyPage() {
  const [notice, setNotice] = useState("");
  return <InnerPage eyebrow="Credits" title="Buy Credits" description="Escolha um pacote. Os créditos comprados não expiram com o limite diário gratuito."><CreditNav active="Buy Credits" /><div className="grid gap-3 sm:grid-cols-3">{packages.map((item) => <button key={item.credits} type="button" onClick={() => setNotice(`Pacote de ${item.credits} créditos selecionado. O checkout será ligado ao provedor de pagamento.`)} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left hover:border-violet-300/40"><ShoppingBag className="text-emerald-300" size={19} /><p className="mt-6 text-3xl font-semibold">{item.credits}</p><p className="text-sm text-white/40">credits</p><p className="mt-5 font-semibold text-violet-200">{item.price}</p></button>)}</div>{notice && <p className="mt-5 rounded-xl bg-violet-400/[0.08] p-4 text-sm text-violet-100">{notice}</p>}</InnerPage>;
}
