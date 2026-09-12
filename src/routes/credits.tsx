import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Coins, Copy, Gift, Play, ShoppingBag } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/credits")({ component: Credits });

type Wallet = { free_credits: number; purchased_credits: number; total_credits: number };

const packages = [
  { id: "starter", credits: 10, price: "R$ 4,90" },
  { id: "plus", credits: 30, price: "R$ 9,90" },
  { id: "pro", credits: 100, price: "R$ 24,90" },
];

function Credits() {
  const [wallet, setWallet] = useState<Wallet>({ free_credits: 0, purchased_credits: 0, total_credits: 0 });
  const [inviteCode, setInviteCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return;
    const [{ data: credits }, { data: code }] = await Promise.all([
      supabase.from("ai_credits").select("free_credits,purchased_credits,total_credits").eq("user_id", user.id).maybeSingle(),
      supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle(),
    ]);
    if (credits) setWallet({ free_credits: Number(credits.free_credits ?? 0), purchased_credits: Number(credits.purchased_credits ?? 0), total_credits: Number(credits.total_credits ?? 0) });
    if (code?.code) setInviteCode(code.code);
    else {
      const generated = `DECIDLY-${user.id.replaceAll("-", "").slice(0, 8).toUpperCase()}`;
      const { data: created } = await supabase.from("referral_codes").upsert({ user_id: user.id, code: generated }, { onConflict: "user_id" }).select("code").maybeSingle();
      if (created?.code) setInviteCode(created.code);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const copyInvite = async () => {
    if (!inviteCode) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/login?ref=${inviteCode}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <main className="min-h-[100dvh] bg-[#0d0912] px-4 py-6 text-white sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link to="/workspace" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><ArrowLeft size={17} /> Voltar ao workspace</Link>
        <div className="mt-10 flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-violet-300">Wallet</p><h1 className="mt-2 text-4xl font-semibold tracking-tight">Credits</h1><p className="mt-3 max-w-xl leading-7 text-white/50">Acompanhe seus créditos grátis e comprados em um só lugar.</p></div><div className="rounded-3xl border border-violet-300/20 bg-violet-400/[0.08] px-6 py-4"><p className="text-xs text-white/50">Total credits</p><p className="mt-1 text-3xl font-semibold text-white">{wallet.total_credits.toFixed(2)}</p></div></div>
        <section className="mt-8 grid gap-4 md:grid-cols-3"><div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"><Coins className="text-violet-300" size={20} /><p className="mt-5 text-sm text-white/50">Free credits</p><p className="mt-1 text-2xl font-semibold">{wallet.free_credits.toFixed(2)}</p><p className="mt-2 text-xs leading-5 text-white/35">Renovação diária, convites e anúncios recompensados.</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"><ShoppingBag className="text-emerald-300" size={20} /><p className="mt-5 text-sm text-white/50">Purchased credits</p><p className="mt-1 text-2xl font-semibold">{wallet.purchased_credits.toFixed(2)}</p><p className="mt-2 text-xs leading-5 text-white/35">Separados da regra de acúmulo dos créditos grátis.</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.045] p-5"><Gift className="text-amber-300" size={20} /><p className="mt-5 text-sm text-white/50">Ways to earn</p><p className="mt-1 text-2xl font-semibold">3</p><p className="mt-2 text-xs leading-5 text-white/35">Daily renewal, referrals and rewarded ads.</p></div></section>
        <section className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_.9fr]"><div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-start gap-4"><Gift className="mt-1 text-violet-300" size={22} /><div><h2 className="text-xl font-semibold">Invite friends</h2><p className="mt-2 text-sm leading-6 text-white/50">Compartilhe seu código. Quando o convite atingir os critérios do programa, a recompensa entra em Free credits.</p></div></div><div className="mt-5 flex items-center gap-2 rounded-2xl bg-black/20 p-2"><code className="min-w-0 flex-1 px-3 text-sm text-violet-200">{inviteCode || "Gerando código…"}</code><button type="button" onClick={() => void copyInvite()} className="flex items-center gap-2 rounded-xl bg-white/[0.08] px-3 py-2 text-xs font-semibold hover:bg-white/[0.13]">{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Copied" : "Copy link"}</button></div><p className="mt-3 text-xs text-white/30">O código é individual e não gera crédito duplicado para a mesma conta.</p></div><div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6"><div className="flex items-start gap-4"><Play className="mt-1 text-amber-300" size={22} /><div><h2 className="text-xl font-semibold">Rewarded ads</h2><p className="mt-2 text-sm leading-6 text-white/50">Assista a um anúncio validado para receber créditos grátis quando o provedor de anúncios estiver conectado.</p></div></div><button type="button" disabled className="mt-6 w-full rounded-2xl bg-white/[0.07] px-4 py-3 text-sm font-semibold text-white/40">Ads provider em breve</button></div></section>
        <section className="mt-8 rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.13] to-white/[0.03] p-6"><div className="flex items-start gap-4"><ShoppingBag className="mt-1 text-emerald-300" size={22} /><div><h2 className="text-xl font-semibold">Buy credits</h2><p className="mt-2 text-sm leading-6 text-white/50">Escolha um pacote. O checkout será ativado assim que a API de pagamento for conectada.</p></div></div><div className="mt-6 grid gap-3 md:grid-cols-3">{packages.map((item) => <button type="button" key={item.id} onClick={() => setNotice(`Pacote de ${item.credits} créditos selecionado. Conecte a API de pagamento para concluir.`)} className="rounded-2xl border border-white/10 bg-black/15 p-4 text-left transition hover:border-violet-300/40 hover:bg-violet-400/[0.08]"><p className="text-2xl font-semibold">{item.credits}</p><p className="mt-1 text-sm text-white/45">credits</p><p className="mt-4 text-sm font-semibold text-violet-200">{item.price}</p></button>)}</div>{notice && <p className="mt-4 rounded-xl bg-white/[0.06] px-4 py-3 text-sm text-violet-100">{notice}</p>}</section>
      </div>
    </main>
  );
}
