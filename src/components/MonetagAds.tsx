import { useEffect } from "react";

const VIGNETTE_ZONE = "11926416";
const VIGNETTE_SRC = "https://n6wxm.com/vignette.min.js";
const SESSION_KEY = "decidly-monetag-vignette-shown";
export const MONETAG_DIRECT_LINK = "https://omg10.com/4/11926418";

export function MonetagVignette() {
  useEffect(() => {
    if (typeof window === "undefined" || window.sessionStorage.getItem(SESSION_KEY) === "1") return;
    if (document.querySelector('script[data-decidly-monetag="vignette"]')) return;

    const script = document.createElement("script");
    script.async = true;
    script.dataset.zone = VIGNETTE_ZONE;
    script.dataset.decidlyMonetag = "vignette";
    script.src = VIGNETTE_SRC;
    script.onload = () => window.sessionStorage.setItem(SESSION_KEY, "1");
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

export function SponsoredLinkButton() {
  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs text-white/40">Publicidade — link opcional para conhecer um patrocinador.</p>
      <a
        href={MONETAG_DIRECT_LINK}
        target="_blank"
        rel="nofollow sponsored noopener noreferrer"
        className="mt-3 block rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3 text-center text-sm font-medium text-white/70 transition hover:bg-white/[0.1] hover:text-white"
      >
        Conhecer patrocinador
      </a>
    </div>
  );
}
