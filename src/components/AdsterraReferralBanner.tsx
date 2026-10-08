import { ArrowUpRight, Globe2 } from "lucide-react";

const ADSTERRA_REFERRAL_URL = "https://beta.publishers.adsterra.com/referral/x6d9mBbDWJ";

export function AdsterraReferralBanner() {
  return (
    <aside aria-label="Publicidade: indicação da Adsterra" className="mx-auto w-full max-w-[300px]">
      <div className="relative isolate flex aspect-[6/5] min-h-[250px] flex-col justify-between overflow-hidden rounded-3xl border border-emerald-300/20 bg-[#101519] p-5 text-white shadow-xl shadow-black/20">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 -top-12 -z-10 h-40 w-40 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-16 -left-12 -z-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl"
        />

        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-200/75">
            Publicidade · link de indicação
          </p>
          <div className="mt-3 flex items-center gap-2 text-emerald-200">
            <Globe2 size={17} aria-hidden="true" />
            <span className="text-sm font-bold tracking-wide">Adsterra</span>
          </div>
          <h2 className="mt-3 text-2xl font-semibold leading-tight tracking-tight">
            Monetize seu site.
          </h2>
          <p className="mt-2 text-sm leading-5 text-white/65">
            Conheça formatos de anúncios para publishers.
          </p>
        </div>

        <div>
          <a
            href={ADSTERRA_REFERRAL_URL}
            target="_blank"
            rel="nofollow sponsored noopener noreferrer"
            className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-300 px-4 py-3 text-sm font-semibold text-[#101519] transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Conhecer a Adsterra
            <ArrowUpRight size={16} aria-hidden="true" />
          </a>
          <p className="mt-2 text-center text-[10px] text-white/35">
            Ao acessar, você usa nosso link de indicação.
          </p>
        </div>
      </div>
    </aside>
  );
}
