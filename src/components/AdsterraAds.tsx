import { useEffect, useRef } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const NEWCLICK_SCRIPT_SRC = "https://www.newclick.com/widget.js";
const NEWCLICK_WEBSITE_ID = import.meta.env["VITE_NEWCLICK_WEBSITE_ID"] || "13525";
const SOCIAL_BAR_DELAY_MS = 8_000;

/** Loads the Adsterra Social Bar once after each full page load. */
export function AdsterraSocialBar() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) return;

    const timer = window.setTimeout(() => {
      if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) return;
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

function NewClickNativePlacement() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const slot = document.createElement("div");
    slot.id = "newclick-banner";
    slot.className = "absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl";
    container.appendChild(slot);

    const config = document.createElement("script");
    config.text = `var newClickConfig = { websiteId: ${JSON.stringify(NEWCLICK_WEBSITE_ID)} };`;
    container.appendChild(config);

    const script = document.createElement("script");
    script.src = NEWCLICK_SCRIPT_SRC;
    script.async = true;
    container.appendChild(script);

    return () => container.replaceChildren();
  }, []);

  return (
    <div ref={containerRef} className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#11101f]">
      <img src="/decidlyai-vip-fallback.png" alt="Conheça o plano VIP do DecidlyAI" className="absolute inset-0 h-full w-full object-contain" />
    </div>
  );
}

/** NewClick is the only native provider; the VIP image remains visible if it does not load. */
export function AdsterraNativeBanner() {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-3" aria-label="Publicidade">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Publicidade</p>
      <NewClickNativePlacement />
    </section>
  );
}
