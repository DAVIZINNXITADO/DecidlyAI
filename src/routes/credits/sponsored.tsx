import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Check, Gift, Loader2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { InnerPage } from "../../components/InnerPage";
import { supabase } from "../../lib/supabase";

export const Route = createFileRoute("/credits/sponsored")({ component: SponsoredRewardPage });

const AD_SCRIPT_URL = "https://pl31554061.profitableratecpmnetwork.com/0808b976d18733b256b1229ba2178907/invoke.js";
const AD_CONTAINER_ID = "container-0808b976d18733b256b1229ba2178907";
const WAIT_SECONDS = 15;

export function SponsoredRewardPage() {
  const navigate = useNavigate();
  const adContainerRef = useRef<HTMLDivElement>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(WAIT_SECONDS);
  const [status, setStatus] = useState("Prepare sua visita patrocinada.");
  const [starting, setStarting] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (!sessionId || !adContainerRef.current) return;
    const container = adContainerRef.current;
    container.replaceChildren();
    const nativeContainer = document.createElement("div");
    nativeContainer.id = AD_CONTAINER_ID;
    nativeContainer.className = "flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-xl";
    container.appendChild(nativeContainer);
    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = AD_SCRIPT_URL;
    script.onload = () => setStatus("Oferta patrocinada carregada. Aguarde o contador terminar.");
    script.onerror = () => setStatus("A oferta não carregou, mas você pode fechar esta página.");
    nativeContainer.appendChild(script);
    return () => container.replaceChildren();
  }, [sessionId]);

  const claim = async () => {
    if (!sessionId || claiming || claimed || closed) return;
    setClaiming(true);
    const { data, error } = await supabase.rpc("claim_sponsored_reward", { session_id: sessionId });
    setClaiming(false);
    if (error || data?.error) {
      setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Limite diário atingido." : "Não foi possível confirmar a recompensa.");
      return;
    }
    setClaimed(true);
    setStatus("Recompensa concedida: +1,25 crédito.");
  };

  useEffect(() => {
    if (!sessionId || seconds <= 0 || closed) return;
    const timer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, seconds, closed]);

  useEffect(() => {
    if (sessionId && seconds === 0 && !claimed && !claiming && !closed) void claim();
  }, [sessionId, seconds, claimed, claiming, closed]);

  const start = async () => {
    if (starting || sessionId) return;
    setStarting(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setStarting(false);
      setStatus("Entre na sua conta para receber créditos.");
      await navigate({ to: "/login" });
      return;
    }
    const { data, error } = await supabase.rpc("start_sponsored_reward");
    setStarting(false);
    if (error || typeof data !== "string") {
      setStatus(error?.message.includes("DAILY_SPONSORED_LIMIT") ? "Você já atingiu o limite de 2 recompensas hoje." : "Não foi possível iniciar a recompensa.");
      return;
    }
    setSessionId(data);
    setStatus("Carregando a oferta patrocinada...");
  };

  const close = () => {
    setClosed(true);
    setStatus("Visita encerrada sem resgate.");
  };

  if (closed) return <InnerPage eyebrow="Créditos" title="Visita encerrada" description="Nenhuma recompensa foi concedida porque a oferta foi fechada antes do fim."><div className="flex justify-center"><Link to="/credits/free" className="rounded-xl bg-white/[0.08] px-4 py-3 text-sm text-white/75 hover:bg-white/[0.14]">Voltar aos créditos</Link></div></InnerPage>;

  return <InnerPage eyebrow="Conteúdo patrocinado" title="Oferta patrocinada" description="Esta página ajuda a manter o DecidlyAI gratuito."><div className="mx-auto max-w-xl"><section className="relative overflow-hidden rounded-[2rem] border border-amber-300/25 bg-[#17131b] p-4 shadow-2xl shadow-black/30 sm:p-6"><button type="button" onClick={close} aria-label="Fechar oferta patrocinada" className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-black/40 p-2 text-white/65 transition hover:bg-white/15 hover:text-white"><X size={18} /></button><div className="pr-10"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-200/70"><Gift size={15} />Oferta patrocinada</div><h2 className="mt-3 text-2xl font-semibold text-white">Ganhe 1,25 crédito</h2><p className="mt-2 text-sm leading-6 text-white/55">Permaneça nesta página até o fim do contador para receber sua recompensa.</p></div>{sessionId ? <div ref={adContainerRef} className="mt-6 flex min-h-[250px] w-full items-center justify-center rounded-2xl border border-white/10 bg-black/25 p-3 text-center text-xs text-white/35">Carregando anúncio...</div> : <div className="mt-6 flex min-h-[250px] items-center justify-center rounded-2xl border border-dashed border-white/15 bg-black/20 p-6 text-center text-sm text-white/40">Toque no botão abaixo para carregar o anúncio.</div>}<div className="mt-5 rounded-2xl bg-black/30 p-4 text-center"><p className="text-xs uppercase tracking-[0.16em] text-white/35">{claimed ? "Recompensa concedida" : sessionId ? "Aguarde nesta página" : "Limite de 2 recompensas por dia"}</p><p className="mt-2 text-4xl font-semibold text-amber-200">{claimed ? <Check className="mx-auto" size={34} /> : sessionId ? `${seconds}s` : "1,25"}</p><p className="mt-2 text-sm text-white/50">{status}</p></div>{!sessionId ? <button type="button" onClick={() => void start()} disabled={starting} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:opacity-50">{starting && <Loader2 size={17} className="animate-spin" />}Abrir anúncio e ganhar crédito</button> : claimed ? <Link to="/credits/free" className="mt-4 block w-full rounded-xl bg-emerald-400 px-4 py-3 text-center font-semibold text-black">Voltar aos créditos</Link> : <p className="mt-4 text-center text-xs text-white/35">O crédito será concedido automaticamente ao terminar o contador.</p>}</section><p className="mt-4 text-center text-xs leading-5 text-white/35">Anúncio fornecido pela rede de publicidade. Não é necessário clicar no anúncio. Fechar a página cancela esta visita.</p></div></InnerPage>;
}
