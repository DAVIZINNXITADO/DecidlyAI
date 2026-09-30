import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Gift, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/promo")({ component: PromoPage });

const CAMPAIGN = "ad-25";

function PromoPage() {
  return (
    <main className="min-h-[100dvh] bg-[#070711] px-4 py-8 text-white sm:px-6 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link to="/" className="text-sm text-white/55 transition hover:text-white">← Voltar ao DecidlyAI</Link>
        <section className="mt-8 overflow-hidden rounded-[2rem] border border-violet-300/20 bg-[#11101f] shadow-2xl shadow-violet-950/20">
          <img src="/decidlyai-promo-banner.png" alt="DecidlyAI: seu copiloto de IA para tomar decisões melhores" className="h-auto w-full" />
          <div className="p-6 text-center sm:p-10">
            <div className="mx-auto flex w-fit items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-semibold text-amber-200"><Gift size={15} /> Campanha de boas-vindas</div>
            <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">Comece com 25 créditos extras</h1>
            <p className="mx-auto mt-3 max-w-xl leading-7 text-white/55">Crie sua conta por esta campanha e receba o bônus depois que o cadastro for concluído. O benefício não depende de clicar em anúncios.</p>
            <a href={`/login?campaign=${CAMPAIGN}`} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-violet-500 px-6 py-3.5 font-semibold text-white transition hover:bg-violet-400">Criar minha conta <ArrowRight size={18} /></a>
            <p className="mt-5 inline-flex items-center gap-2 text-xs text-white/35"><ShieldCheck size={14} /> Cadastro seguro. Um bônus por conta elegível.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
