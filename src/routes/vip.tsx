import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Crown } from "lucide-react";
import { InnerPage } from "../components/InnerPage";

export const Route = createFileRoute("/vip")({ component: VipComingSoonPage });

function VipComingSoonPage() {
  return (
    <InnerPage
      eyebrow="Plano VIP"
      title="Plano VIP em preparação"
      description="Ainda não existe uma oferta ativa do plano VIP."
    >
      <section className="overflow-hidden rounded-3xl border border-violet-300/15 bg-gradient-to-br from-violet-500/[0.12] via-white/[0.035] to-white/[0.02] p-6 sm:p-8">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-300/15 bg-violet-400/10 text-violet-200">
          <Crown size={22} />
        </div>
        <p className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-violet-200/75">
          Em breve
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Detalhes do VIP ainda não definidos</h2>
        <p className="mt-3 max-w-xl leading-7 text-white/55">
          A página de compra ainda está sendo preparada. Os recursos, o preço e as condições do
          plano ainda não foram definidos e serão informados antes de qualquer venda.
        </p>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/45">
          Nenhum pagamento ou cadastro VIP está disponível por enquanto.
        </p>
        <Link
          to="/workspace"
          className="mt-6 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/[0.08] hover:text-white"
        >
          Voltar ao workspace <ArrowRight size={16} />
        </Link>
      </section>
    </InnerPage>
  );
}
