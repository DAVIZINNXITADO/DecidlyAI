import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const NEWCLICK_API_BASE = "https://www.newclick.com/api";
const NEWCLICK_WEBSITE_ID = import.meta.env["VITE_NEWCLICK_WEBSITE_ID"] || "13525";
const SOCIAL_BAR_DELAY_MS = 8_000;

/** Loads the Adsterra Social Bar once only when the workspace is mounted. */
export function AdsterraSocialBar() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (window.sessionStorage.getItem("decidly-socialbar-loaded") === "1") return;

    const timer = window.setTimeout(() => {
      if (window.sessionStorage.getItem("decidly-socialbar-loaded") === "1") return;
      if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) return;
      window.sessionStorage.setItem("decidly-socialbar-loaded", "1");

      const script = document.createElement("script");
      script.src = SOCIAL_BAR_SRC;
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.dataset.decidlyAdsterra = "social-bar";
      document.body.appendChild(script);
    }, SOCIAL_BAR_DELAY_MS);

    return () => window.clearTimeout(timer);
  }, []);

  return null;
}

type NewClickBanner = {
  type?: string;
  image_url?: string;
  alt_text?: string;
  width?: number;
  height?: number;
  click_url?: string;
};

function NewClickNativePlacement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<NewClickBanner | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`${NEWCLICK_API_BASE}/serve.php?id=${encodeURIComponent(NEWCLICK_WEBSITE_ID)}`, { signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        const nextBanner = payload?.success && payload.banner?.type === "image" ? payload.banner as NewClickBanner : null;
        if (nextBanner?.image_url && nextBanner.click_url) setBanner(nextBanner);
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!banner || !containerRef.current) return;
    const image = containerRef.current.querySelector("img[data-newclick-rendered]");
    image?.setAttribute("data-newclick-loaded", "true");
  }, [banner]);

  const clickUrl = banner?.click_url ? new URL(banner.click_url, NEWCLICK_API_BASE).toString() : "#";
  const width = banner?.width || 468;
  const height = banner?.height || 60;

  return (
    <div ref={containerRef} className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#11101f]">
      <img src="/decidlyai-vip-fallback.png" alt="Conheça o plano VIP do DecidlyAI" className={`absolute inset-0 h-full w-full object-contain transition-opacity ${banner ? "opacity-0" : "opacity-100"}`} />
      {banner && (
        <a href={clickUrl} target="_blank" rel="sponsored noopener noreferrer" className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl bg-[#11101f]" aria-label={banner.alt_text || "Publicidade NewClick"}>
          <img data-newclick-rendered src={banner.image_url} alt={banner.alt_text || "Publicidade"} width={width} height={height} onError={() => setBanner(null)} className="h-auto max-h-full w-auto max-w-full object-contain" />
        </a>
      )}
    </div>
  );
}

/** NewClick is the only native provider; VIP is shown only while it has no banner response. */
export function AdsterraNativeBanner() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-3" aria-label="Publicidade">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Publicidade</p>
      <NewClickNativePlacement />
    </section>
  );
}
