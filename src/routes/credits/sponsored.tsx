import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Check, ExternalLink, Gift, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { InnerPage } from "../../components/InnerPage";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/credits/sponsored")({ component: SponsoredRewardPage });

const ADSTERRA_LINK = "https://www.profitableratecpmnetwork.com/gkzxy1pm?key=a82971907b704a012d52b90c74403a38";

function SponsoredRewardPage() {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(5);
  const [status, setStatus] = useState("Prepare sua visita patrocinada.");
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.rpc("start_sponsored_reward").then(({ data, error }) => {
      if (!active) return;
      if (error || typeof data !== "string") { setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Você já atingiu o limite de 2 recompensas hoje." : "Não foi possível iniciar a recompensa."); return; }
      setSessionId(data);
      window.open(ADSTERRA_LINK, "_blank", "noopener,noreferrer");
      setStatus("A oferta patrocinada foi aberta em outra aba. Permaneça nesta página por 5 segundos.");
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!sessionId || seconds <= 0) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, seconds]);

  const claim = async () => {
    if (!sessionId || seconds > 0 || claiming || claimed) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_sponsored_reward", { session_id: sessionId });
    setClaiming(false);
    if (error || data?.error) { setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Limite diário atingido." : "Não foi possível confirmar agora. Tente novamente."); return; }
    setClaimed(true);
    setStatus("+1,25 crédito adicionado ao seu saldo.");
  };

  return <InnerPage eyebrow="Créditos" title="Oferta patrocinada" description="Uma forma leve de apoiar o DecidlyAI e receber uma pequena recompensa."><div className="space-y-4"><section className="rounded-3xl border border-amber-300/20 bg-amber-300/[0.07] p-6"><div className="flex items-start gap-3"><Gift className="mt-1 shrink-0 text-amber-300" size={22} /><div><h2 className="text-xl font-semibold">Ganhe 1,25 crédito</h2><p className="mt-2 text-sm leading-6 text-white/60">Você pode concluir até 2 visitas patrocinadas por dia. Isso representa no máximo 2,5 créditos diários.</p></div></div><div className="mt-5 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/60"><p className="font-semibold text-white/80">Como funciona</p><p className="mt-1">Uma oferta patrocinada foi aberta em outra aba. Não é necessário clicar no anúncio. Aguarde o contador terminar e volte para resgatar sua recompensa.</p></div><div className="mt-5 flex items-center justify-between rounded-2xl bg-black/20 p-4"><span className="text-sm text-white/55">{status}</span><span className="text-2xl font-semibold text-amber-200">{seconds > 0 ? `${seconds}s` : <Check size={24} />}</span></div><button type="button" onClick={() => void claim()} disabled={!sessionId || seconds > 0 || claiming || claimed} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-45">{claiming ? <Loader2 size={16} className="animate-spin" /> : claimed ? <Check size={16} /> : null}{claimed ? "Recompensa resgatada" : "Resgatar 1,25 crédito"}</button></section><p className="text-center text-xs leading-5 text-white/35">Conteúdo patrocinado. O limite é de duas recompensas por usuário a cada dia. Você não precisa clicar em anúncios.</p><div className="flex justify-center gap-3"><a href={ADSTERRA_LINK} target="_blank" rel="nofollow sponsored noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:bg-white/10 hover:text-white"><ExternalLink size={14} />Abrir oferta novamente</a><Link to="/credits/free" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-white/55 hover:bg-white/10 hover:text-white"><ArrowLeft size={14} />Voltar</Link></div></div></InnerPage>;
}
