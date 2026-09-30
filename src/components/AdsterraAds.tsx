import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_NATIVE_SRC = "https://cheflobesofficer.com/0808b976d18733b256b1229ba2178907/invoke.js";
const ADSTERRA_NATIVE_CONTAINER_ID = "container-0808b976d18733b256b1229ba2178907";
const MONETAG_VIGNETTE_SRC = "https://n6wxm.com/vignette.min.js";
const MONETAG_VIGNETTE_ZONE = "11926416";
const NEWCLICK_SCRIPT_SRC = "https://www.newclick.com/widget.js";
const NEWCLICK_WEBSITE_ID = import.meta.env["VITE_NEWCLICK_WEBSITE_ID"] || "13525";
const ROTATION_KEY = "decidly-native-ad-rotation";
const SOCIAL_BAR_DELAY_MS = 8_000;

/** Loads the Adsterra Social Bar once, only while the workspace is mounted. */
export function AdsterraSocialBar() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let script: HTMLScriptElement | null = null;
    const timer = window.setTimeout(() => {
      if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) return;

      script = document.createElement("script");
      script.src = SOCIAL_BAR_SRC;
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.dataset.decidlyAdsterra = "social-bar";
      document.body.appendChild(script);
    }, SOCIAL_BAR_DELAY_MS);

    return () => {
      window.clearTimeout(timer);
      script?.remove();
      document.querySelectorAll("[id^=adsterra-socialbar], iframe[src*='cheflobesofficer.com']").forEach((node) => node.remove());
    };
  }, []);

  return null;
}

/** Loads the Monetag Vignette only on the dedicated ad-test page. */
export function MonetagVignetteTest() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.querySelector('script[data-decidly-monetag="vignette"]')) return;

    const script = document.createElement("script");
    script.dataset.zone = MONETAG_VIGNETTE_ZONE;
    script.dataset.decidlyMonetag = "vignette";
    script.src = MONETAG_VIGNETTE_SRC;
    script.async = true;
    document.body.appendChild(script);

    return () => {
      script.remove();
      document.querySelectorAll("[data-decidly-monetag-vignette]").forEach((node) => node.remove());
    };
  }, []);

  return null;
}

function nextNativeProvider(): "adsterra" | "newclick" {
  if (!NEWCLICK_WEBSITE_ID || typeof window === "undefined") return "adsterra";
  const current = Number(window.localStorage.getItem(ROTATION_KEY) || "0");
  const next = current + 1;
  window.localStorage.setItem(ROTATION_KEY, String(next));
  return next % 2 === 0 ? "newclick" : "adsterra";
}

function AdsterraNativePlacement() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const slot = document.createElement("div");
    slot.id = ADSTERRA_NATIVE_CONTAINER_ID;
    slot.className = "flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-2xl";
    container.appendChild(slot);

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = ADSTERRA_NATIVE_SRC;
    slot.appendChild(script);

    return () => container.replaceChildren();
  }, []);

  return <div ref={containerRef} className="min-h-[250px] w-full" />;
}

function NewClickNativePlacement() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !NEWCLICK_WEBSITE_ID) return;
    const slot = document.createElement("div");
    slot.id = "newclick-banner";
    slot.className = "flex min-h-[250px] w-full items-center justify-center overflow-hidden rounded-2xl";
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

  return <div ref={containerRef} className="min-h-[250px] w-full" />;
}

/** Alternates one contained native placement per visit; without a NewClick ID it safely uses Adsterra. */
export function AdsterraNativeBanner() {
  const [provider] = useState<"adsterra" | "newclick">(() => nextNativeProvider());

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.025] p-3" aria-label="Publicidade">
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">Publicidade</p>
      {provider === "newclick" ? <NewClickNativePlacement /> : <AdsterraNativePlacement />}
    </section>
  );
}
