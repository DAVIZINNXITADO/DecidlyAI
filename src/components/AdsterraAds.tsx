import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_BANNER_SRC =
  "https://cheflobesofficer.com/0808b976d18733b256b1229ba2178907/invoke.js";
const ADSTERRA_BANNER_CONTAINER_ID = "container-0808b976d18733b256b1229ba2178907";
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

function AdsterraBannerPlacement() {
  const slotRef = useRef<HTMLDivElement>(null);
  const [hasCreative, setHasCreative] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;
    const parent = slot.parentElement;
    if (!parent) return;

    const observer = new MutationObserver(() => {
      const creative = slot.querySelector("iframe, img, video, canvas, object, embed, a[href]");
      setHasCreative(Boolean(creative));
    });
    observer.observe(slot, { childList: true, subtree: true });

    const script = document.createElement("script");
    script.src = ADSTERRA_BANNER_SRC;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.dataset.decidlyAdsterra = "native-banner";
    parent.insertBefore(script, slot);

    return () => {
      observer.disconnect();
      script.remove();
      slot.replaceChildren();
    };
  }, []);

  return (
    <div className={`adsterra-banner-frame${hasCreative ? " has-ad" : ""}`}>
      {!hasCreative && (
        <img
          src="/decidlyai-vip-fallback.png"
          alt="Conheça o plano VIP do DecidlyAI"
          className="adsterra-banner-fallback"
        />
      )}
      <div id={ADSTERRA_BANNER_CONTAINER_ID} ref={slotRef} className="adsterra-banner-slot" />
    </div>
  );
}

/** Adsterra banner in public content slots; falls back to the first-party VIP creative. */
export function AdsterraNativeBanner() {
  return (
    <section
      className="rounded-3xl border border-white/10 bg-white/[0.025] p-3"
      aria-label="Publicidade"
    >
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
        Publicidade
      </p>
      <AdsterraBannerPlacement />
    </section>
  );
}
