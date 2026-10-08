import { useEffect, useState } from "react";
import { COOKIE_CONSENT_CHANGED_EVENT, hasAdsConsent } from "../lib/ad-consent";

const ADSTERRA_REFERRAL_URL = "https://beta.publishers.adsterra.com/referral/x6d9mBbDWJ";
const ADSTERRA_REFERRAL_BANNER_URL =
  "https://landings-cdn.adsterratech.com/referralBanners/png/300%20x%20250%20px.png";

function useAdsConsent() {
  const [adsConsent, setAdsConsent] = useState(false);

  useEffect(() => {
    const syncConsent = () => setAdsConsent(hasAdsConsent());
    syncConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
  }, []);

  return adsConsent;
}

export function AdsterraReferralBanner() {
  const adsConsent = useAdsConsent();

  if (!adsConsent) return null;

  return (
    <aside
      aria-label="Publicidade: link de indicação da Adsterra"
      className="mx-auto w-full max-w-[300px]"
    >
      <a
        href={ADSTERRA_REFERRAL_URL}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        aria-label="Conheça a Adsterra pelo nosso link de indicação (abre em nova aba)"
        className="block overflow-hidden rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-300"
      >
        <img
          src={ADSTERRA_REFERRAL_BANNER_URL}
          alt="Banner oficial de indicação da Adsterra para publishers, tamanho 300 por 250 pixels"
          width={300}
          height={250}
          loading="lazy"
          decoding="async"
          className="block h-auto w-full"
        />
      </a>
      <p className="mt-2 text-center text-[10px] text-white/40">Publicidade · link de indicação</p>
    </aside>
  );
}
