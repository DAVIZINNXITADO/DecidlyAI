import { AlertCircle, Check, CheckCircle2, Copy, Gift, History, Loader2, RefreshCw, ShoppingBag } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AdsterraNativeBanner } from "../components/AdsterraAds";
import { CreditNav, InnerPage } from "../components/InnerPage";
import { dailyCreditsBalance, normalizeCreditWallet, type CreditWallet } from "../lib/credits";
import { supabase } from "../lib/supabase";

type Event = {
  id: string;
  event_type: string;
  amount: number;
  description: string | null;
  created_at: string;
};
type Wallet = CreditWallet;

const packages = [
  { credits: 10, price: "R$ 1,90", abacate: true },
  { credits: 30, price: "R$ 4,90", abacate: false },
  { credits: 100, price: "R$ 12,90", abacate: false },
];

const eventLabel = (event: Event) =>
  event.event_type === "usage"
    ? "AI usage"
    : event.event_type === "daily_free"
      ? "Daily credits"
      : event.event_type === "referral"
        ? "Referral reward"
        : event.description || "Credit adjustment";

function useCreditData() {
  const [wallet, setWallet] = useState<Wallet>(normalizeCreditWallet({ daily_credits_limit: 5 }));
  const [events, setEvents] = useState<Event[]>([]);
  const [code, setCode] = useState("");

  const load = useCallback(async (): Promise<boolean> => {
    const { data: auth } = await supabase.auth.getUser();
    const user = auth.user;
    if (!user) return false;

    const [{ data: credits }, { data: history }, { data: referral }] = await Promise.all([
      supabase
        .from("ai_credits")
        .select(
          "free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at",
        )
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("credit_events")
        .select("id,event_type,amount,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle(),
    ]);

    if (!credits) return false;
    setWallet(normalizeCreditWallet(credits));
    setEvents((history || []) as Event[]);
    if (referral?.code) setCode(referral.code);
    return true;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { wallet, events, code, dailyBalance: dailyCreditsBalance(wallet), reload: load };
}

export function HistoryPage() {
  const { events } = useCreditData();

  return (
    <InnerPage
      eyebrow="Credits"
      title="History"
      description="Veja todos os ganhos e gastos da sua carteira."
    >
      <CreditNav active="history" />
      <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5">
        {events.length ? (
          events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 border-b border-white/[0.06] py-4 last:border-0"
            >
              <span
                className={`font-semibold ${event.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}
              >
                {event.amount >= 0 ? "+" : ""}
                {Number(event.amount).toFixed(2)}
              </span>
              <span className="flex-1 text-sm text-white/70">{eventLabel(event)}</span>
              <time className="text-xs text-white/30">
                {new Date(event.created_at).toLocaleDateString("pt-BR")}
              </time>
            </div>
          ))
        ) : (
          <p className="text-sm text-white/45">Nenhuma movimentação ainda.</p>
        )}
      </div>
      <div className="mt-8">
        <AdsterraNativeBanner placement="in-content" />
      </div>
    </InnerPage>
  );
}

export function FreePage() {
  const { wallet, code, dailyBalance } = useCreditData();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(`${window.location.origin}/login?ref=${code}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <InnerPage
      eyebrow="Credits"
      title="Free Credits"
      description="Ganhe créditos sem pagar, de forma clara e segura."
    >
      <CreditNav active="freeCredits" />
      <div className="space-y-4">
        <div className="rounded-3xl border border-violet-300/15 bg-violet-400/[0.07] p-6">
          <div className="flex items-center gap-3">
            <Gift className="text-violet-300" />
            <div>
              <p className="text-sm text-white/45">Seu saldo gratuito</p>
              <p className="text-3xl font-semibold">{wallet.free_credits.toFixed(2)}</p>
            </div>
          </div>
          <p className="mt-5 text-sm text-white/50">
            Créditos diários: {dailyBalance.toFixed(2)}/
            {wallet.daily_credits_limit >= 9999 ? "♾" : wallet.daily_credits_limit}
          </p>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-6">
          <h2 className="text-xl font-semibold">Referral program</h2>
          <p className="mt-2 text-sm leading-6 text-white/50">
            Crie uma conta pelo seu link. Quando uma pessoa nova ou inativa criar a conta e enviar a
            primeira mensagem, vocês dois recebem <b className="text-white">25 free credits</b>.
          </p>
          <div className="mt-4 flex gap-2 rounded-2xl bg-black/20 p-2">
            <code className="flex-1 px-2 py-2 text-sm text-violet-200">
              {code || "Gerando código…"}
            </code>
            <button
              type="button"
              onClick={() => void copy()}
              className="rounded-xl bg-white/[0.08] px-3"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <p className="mt-3 text-xs text-white/35">
            Você não pode convidar a si mesmo. Contas já ativas não participam; apenas contas novas
            ou inativas podem se qualificar.
          </p>
        </div>
        <AdsterraNativeBanner placement="native-300x250" />
      </div>
    </InnerPage>
  );
}

export function BuyPage() {
  const { wallet, reload } = useCreditData();
  const [notice, setNotice] = useState("");
  const [paymentNotice, setPaymentNotice] = useState("");
  const [paymentKind, setPaymentKind] = useState<"success" | "pending" | "cancelled" | "confirmed" | "error" | "">("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get("payment");
    const paymentRef = params.get("payment_ref");
    if (payment === "cancelled") {
      setPaymentKind("cancelled");
      setPaymentNotice("Pagamento cancelado. Nenhum crédito foi adicionado. Você pode tentar novamente quando quiser.");
      return;
    }
    if (payment === "pending") {
      setPaymentKind("pending");
      setPaymentNotice("Retorno do checkout recebido. A confirmação do pagamento pode levar alguns instantes; seus créditos só serão liberados após a confirmação segura da AbacatePay.");
      return;
    }
    if (payment !== "success") return;
    if (!paymentRef) {
      setPaymentKind("pending");
      setPaymentNotice("Pagamento em verificação. A confirmação segura da AbacatePay é necessária antes da liberação dos créditos.");
      return;
    }

    let cancelled = false;
    let inFlight = false;
    const deadline = Date.now() + 60_000;
    setPaymentKind("success");
    setPaymentNotice("Pagamento confirmado. Seus créditos estão sendo atualizados.");

    const verify = async () => {
      if (cancelled || inFlight) return false;
      inFlight = true;
      try {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user || !paymentRef) return false;
        const { data: paymentRow, error: paymentError } = await supabase
          .from("abacatepay_payments")
          .select("id,status,credits")
          .eq("user_id", auth.user.id)
          .eq("external_id", paymentRef)
          .eq("status", "paid")
          .eq("credits", 10)
          .maybeSingle();
        if (paymentError || !paymentRow) return false;
        setPaymentNotice("Pagamento confirmado. Seus créditos estão sendo atualizados.");
        const { data: creditEvent, error: eventError } = await supabase
          .from("credit_events")
          .select("id,amount")
          .eq("user_id", auth.user.id)
          .eq("event_type", "purchase")
          .eq("reference_id", String(paymentRow.id))
          .eq("amount", 10)
          .maybeSingle();
        if (eventError || !creditEvent) return false;
        if (!(await reload())) return false;
        if (!cancelled) {
          setPaymentKind("confirmed");
          setPaymentNotice("10 créditos adicionados à sua conta.");
        }
        return true;
      } catch {
        return false;
      } finally {
        inFlight = false;
      }
    };

    const poll = async () => {
      await reload();
      while (!cancelled && Date.now() < deadline) {
        if (await verify()) return;
        await new Promise((resolve) => window.setTimeout(resolve, 2500));
        await reload();
      }
      if (!cancelled) {
        setPaymentKind("pending");
        setPaymentNotice("O pagamento ainda está em verificação. Não feche esta página se quiser acompanhar; você também pode atualizar o saldo mais tarde. Nenhum crédito foi liberado antes da confirmação da AbacatePay.");
      }
    };
    void poll();
    return () => { cancelled = true; };
  }, [reload]);

  const startCheckout = async () => {
    setNotice("");
    setLoading(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) {
        setNotice("Entre na sua conta para comprar créditos.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("abacate-create-checkout", { body: {} });
      const checkoutUrl = data?.checkoutUrl || data?.url;
      let validHostedUrl = false;
      try {
        const parsed = new URL(checkoutUrl);
        validHostedUrl = parsed.protocol === "https:" && parsed.hostname === "app.abacatepay.com";
      } catch {
        validHostedUrl = false;
      }
      if (error || !validHostedUrl || data?.success !== true) {
        throw new Error(typeof data?.error === "string" ? data.error : "Não foi possível iniciar o checkout Pix agora. Tente novamente em instantes.");
      }
      window.location.assign(checkoutUrl);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível iniciar o checkout Pix. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const refreshBalance = async () => {
    setRefreshing(true);
    try { await reload(); }
    finally { setRefreshing(false); }
  };

  return (
    <InnerPage
      eyebrow="Créditos"
      title="Comprar créditos"
      description="Compre créditos com Pix no checkout hospedado e acompanhe a confirmação nesta página."
    >
      <CreditNav active="buyCredits" />
      <section aria-label="Saldo de créditos" className={`mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4 ${paymentKind === "confirmed" ? "border-emerald-300/30 bg-emerald-400/[0.08]" : "border-violet-300/15 bg-violet-400/[0.06]"}`}>
        <div><p className="text-xs text-white/50">Saldo disponível</p><p aria-live="polite" className="mt-1 text-2xl font-semibold text-white">{wallet.total_credits.toFixed(2)} <span className="text-sm font-normal text-white/50">créditos</span></p></div>
        <button type="button" onClick={() => void refreshBalance()} disabled={refreshing} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-sm text-white/75 hover:bg-white/[0.06] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"><RefreshCw size={16} aria-hidden="true" className={refreshing ? "animate-spin" : ""} />Atualizar saldo</button>
      </section>
      {paymentNotice && <div role="status" aria-live="polite" className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 text-sm leading-6 ${paymentKind === "confirmed" ? "border-emerald-300/25 bg-emerald-400/[0.08] text-emerald-100" : paymentKind === "cancelled" || paymentKind === "error" ? "border-red-300/20 bg-red-400/[0.06] text-red-100" : "border-amber-300/20 bg-amber-300/[0.06] text-amber-100"}`}>{paymentKind === "confirmed" ? <CheckCircle2 className="mt-1 shrink-0" size={18} aria-hidden="true" /> : <AlertCircle className="mt-1 shrink-0" size={18} aria-hidden="true" />}<p>{paymentNotice}</p></div>}
      <div className="grid gap-3 sm:grid-cols-3">
        {packages.map((item) => (
          <button
            key={item.credits}
            type="button"
            onClick={() => {
              if (item.abacate) {
                void startCheckout();
                return;
              }
              setNotice(`O pacote de ${item.credits} créditos ainda não está disponível para pagamento.`);
            }}
            disabled={loading}
            aria-busy={item.abacate && loading}
            aria-label={item.abacate ? `Comprar 10 créditos por R$ 1,90 via Pix` : `Pacote de ${item.credits} créditos, disponível em breve`}
            className={`min-h-52 rounded-3xl border border-white/10 bg-white/[0.04] p-5 text-left transition hover:border-violet-300/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200 ${loading && item.abacate ? "border-violet-300/50 bg-violet-500/[0.09]" : ""}`}
          >
            <ShoppingBag className="text-emerald-300" size={19} />
            <p className="mt-6 text-3xl font-semibold">{item.credits}</p>
            <p className="text-sm text-white/50">créditos</p>
            <p className="mt-5 font-semibold text-violet-200">{item.price}</p>
            <p className="mt-3 text-xs text-white/40">
              {item.abacate ? (loading ? <span className="inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" aria-hidden="true" />Abrindo checkout seguro…</span> : "Pagar com Pix no checkout seguro") : "Disponível em breve"}
            </p>
          </button>
        ))}
      </div>
      <p className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/75">
        Os créditos são adicionados automaticamente somente após a confirmação segura do pagamento pela AbacatePay. O retorno do checkout, por si só, não libera créditos.
      </p>
      {notice && (
        <div role="alert" className="mt-5 rounded-xl bg-red-400/[0.07] p-4 text-sm text-red-100">{notice}{notice.includes("Entre na sua conta") && <Link to="/login" className="ml-2 underline underline-offset-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-200">Entrar</Link>}</div>
      )}
    </InnerPage>
  );
}
