import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, Gift, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { InnerPage } from "../../components/InnerPage";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/credits/sponsored")({ component: SponsoredRewardPage });

const ADSTERRA_LINK = "https://www.profitableratecpmnetwork.com/gkzxy1pm?key=a82971907b704a012d52b90c74403a38";
const WAIT_SECONDS = 15;

function SponsoredRewardPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const [status, setStatus] = useState("Abra a oferta para iniciar.");
  const [starting, setStarting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!sessionId || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, seconds]);

  const start = async () => {
    if (starting || sessionId) return;
    setStarting(true);
    const popup = window.open(ADSTERRA_LINK, "_blank", "noopener,noreferrer");
    const { data, error } = await supabase.rpc("start_sponsored_reward");
    setStarting(false);
    if (error || typeof data !== "string") {
      popup?.close();
      setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Você já atingiu o limite de 2 recompensas hoje." : "Não foi possível iniciar a recompensa. Tente novamente.");
      return;
    }
    setSessionId(data);
    setStatus("A oferta foi aberta em outra aba. Aguarde 15 segundos e volte para resgatar.");
  };

  const claim = async () => {
    if (!sessionId || seconds > 0 || claiming || claimed) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_sponsored_reward", { session_id: sessionId });
    setClaiming(false);
    if (error || data?.error) {
      setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Limite diário atingido." : "Não foi possível confirmar agora. Tente novamente.");
      return;
    }
    setClaimed(true);
    setStatus("+1,25 crédito adicionado ao seu saldo.");
  };

  return <InnerPage eyebrow="Créditos" title="Oferta patrocinada" description="Apoie o DecidlyAI e receba uma pequena recompensa por visita."><div className="space-y-4"><section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-6"><div className="flex items-start gap-3"><Gift className="mt-1 shrink-0 text-amber-300" size={22} /><div><h2 className="text-xl font-semibold">Ganhe 1,25 crédito</h2><p className="mt-2 text-sm leading-6 text-white/60">Você pode concluir até 2 visitas patrocinadas por dia, totalizando no máximo 2,5 créditos.</p></div></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/60"><p className="font-semibold text-white/80">Como funciona</p><p className="mt-1">Toque no botão para abrir a oferta patrocinada em outra aba. Não é necessário clicar no anúncio. Aguarde o contador terminar e volte para resgatar.</p></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-black/20 p-4"><span className="text-sm text-white/55">{status}</span><span className="text-2xl font-semibold text-amber-200">{sessionId && seconds > 0 ? `${seconds}s` : sessionId ? <Check size={24} /> : "—"}</span></div>{!sessionId ? <button type="button" onClick={() => void start()} disabled={starting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-45">{starting ? <Loader2 size={16} className="animate-spin" /> : <ExternalLink size={16} />}Abrir oferta e iniciar</button> : <button type="button" onClick={() => void claim()} disabled={seconds > 0 || claiming || claimed} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45">{claiming ? <Loader2 size={16} className="animate-spin" /> : claimed ? <Check size={16} /> : null}{claimed ? "Recompensa resgatada" : "Resgatar 1,25 crédito"}</button>}</section><p className="text-center text-xs leading-5 text-white/35">Conteúdo patrocinado. Limite de duas recompensas por usuário por dia. A oferta abre em uma nova aba.</p><div className="flex justify-center"><Link to="/credits/free" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:bg-white/10 hover:text-white"><ArrowLeft size={14} />Voltar</Link></div></div></InnerPage>;
}
