import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { MonetagVignetteTest } from "../components/AdsterraAds";

export const Route = createFileRoute("/anuncio")({ component: AnuncioPage });

function AnuncioPage() {
  return (
    <main className="min-h-[100dvh] bg-[#070711] px-4 py-8 text-white sm:px-6 sm:py-12">
      <MonetagVignetteTest />
      <div className="mx-auto max-w-5xl">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"><ArrowLeft size={16} /> Voltar</Link>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30">Publicidade</span>
        </div>
        <section className="mt-6 overflow-hidden rounded-[2rem] border border-violet-300/15 bg-[#11101f] shadow-2xl shadow-violet-950/20">
          <div className="relative aspect-square w-full sm:aspect-[16/9]">
            <img src="/decidlyai-vip-fallback.png" alt="DecidlyAI VIP" className="h-full w-full object-cover" />
          </div>
          <div className="flex flex-col gap-3 border-t border-white/10 p-5 text-sm text-white/50 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <span className="inline-flex items-center gap-2"><ShieldCheck size={15} className="text-violet-300" /> O anúncio externo pode demorar alguns segundos para carregar.</span>
            <a href="/login" className="inline-flex items-center gap-2 font-semibold text-violet-200 hover:text-white">Conhecer o VIP <ExternalLink size={15} /></a>
          </div>
        </section>
      </div>
    </main>
  );
}
