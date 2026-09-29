import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Gift, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InnerPage } from "../../components/InnerPage";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/credits/sponsored")({ component: SponsoredRewardPage });

const AD_SCRIPT_URL = "https://pl31556591.profitableratecpmnetwork.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const WAIT_SECONDS = 15;

function SponsoredRewardPage() {
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const [status, setStatus] = useState("Toque no botão para carregar a oferta patrocinada.");
  const [starting, setStarting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    if (!sessionId || !adContainerRef.current) return;
    const container = adContainerRef.current;
    container.replaceChildren();
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = AD_SCRIPT_URL;
    script.onload = () => setStatus("Oferta carregada. Aguarde 15 segundos e depois resgate sua recompensa.");
    script.onerror = () => setStatus("A oferta não carregou. Aguarde o contador e tente novamente.");
    container.appendChild(script);
    return () => container.replaceChildren();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, seconds]);

  const start = async () => {
    if (starting || sessionId) return;
    setStarting(true);
    const { data, error } = await supabase.rpc("start_sponsored_reward");
    setStarting(false);
    if (error || typeof data !== "string") {
      setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Você já atingiu o limite de 2 recompensas hoje." : "Não foi possível iniciar a recompensa. Tente novamente.");
      return;
    }
    setSessionId(data);
    setStatus("Carregando a oferta patrocinada...");
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

  return <InnerPage eyebrow="Créditos" title="Oferta patrocinada" description="Apoie o DecidlyAI e receba uma pequena recompensa por visita."><div className="space-y-4"><section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-6"><div className="flex items-start gap-3"><Gift className="mt-1 shrink-0 text-amber-300" size={22} /><div><h2 className="text-xl font-semibold">Ganhe 1,25 crédito</h2><p className="mt-2 text-sm leading-6 text-white/60">Você pode concluir até 2 visitas patrocinadas por dia, totalizando no máximo 2,5 créditos.</p></div></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/60"><p className="font-semibold text-white/80">Como funciona</p><p className="mt-1">Toque no botão para carregar a oferta patrocinada nesta página. Aguarde o contador de 15 segundos e volte para resgatar. Não é necessário clicar no anúncio.</p></div>{sessionId && <div ref={adContainerRef} className="mt-5 min-h-24 rounded-2xl border border-white/10 bg-black/20 p-4 text-center text-xs text-white/40">Carregando oferta patrocinada...</div>}<div className="mt-5 flex items-center justify-between rounded-2xl bg-black/20 p-4"><span className="text-sm text-white/55">{status}</span><span className="text-2xl font-semibold text-amber-200">{sessionId && seconds > 0 ? `${seconds}s` : sessionId ? <Check size={24} /> : "—"}</span></div>{!sessionId ? <button type="button" onClick={() => void start()} disabled={starting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:opacity-45">{starting ? <Loader2 size={16} className="animate-spin" /> : null}Carregar oferta e iniciar</button> : <button type="button" onClick={() => void claim()} disabled={seconds > 0 || claiming || claimed} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45">{claiming ? <Loader2 size={16} className="animate-spin" /> : claimed ? <Check size={16} /> : null}{claimed ? "Recompensa resgatada" : "Resgatar 1,25 crédito"}</button>}</section><p className="text-center text-xs leading-5 text-white/35">Conteúdo patrocinado. Limite de duas recompensas por usuário por dia.</p><div className="flex justify-center"><Link to="/credits/free" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:bg-white/10 hover:text-white"><ArrowLeft size={14} />Voltar</Link></div></div></InnerPage>;
}
