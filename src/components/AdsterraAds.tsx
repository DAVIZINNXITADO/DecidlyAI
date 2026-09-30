import { useEffect, useRef } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const NATIVE_BANNER_SRC = "https://cheflobesofficer.com/0808b976d18733b256b1229ba2178907/invoke.js";
const NATIVE_CONTAINER_ID = "container-0808b976d18733b256b1229ba2178907";

/** Loads the Adsterra Social Bar once, only while the workspace is mounted. */
export function AdsterraSocialBar() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) return;

    const script = document.createElement("script");
    script.src = SOCIAL_BAR_SRC;
    script.async = true;
    script.dataset.decidlyAdsterra = "social-bar";
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll("[id^=adsterra-socialbar], iframe[src*='cheflobesofficer.com']").forEach((node) => node.remove());
    };
  }, []);

  return null;
}

/** A contained 1:1 native placement for the credits overview, not the chat. */
export function AdsterraNativeBanner() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || container.querySelector(`script[src="${NATIVE_BANNER_SRC}"]`)) return;

    const slot = document.createElement("div");
    slot.id = NATIVE_CONTAINER_ID;
    slot.className = "flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-2xl";
    container.appendChild(slot);

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = NATIVE_BANNER_SRC;
    slot.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, []);

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-3" aria-label="Publicidade">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Publicidade</p>
      <div ref={containerRef} className="min-h-[250px] w-full" />
    </section>
  );
}
