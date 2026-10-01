import { Link } from "@tanstack/react-router";
import { Crown, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_BANNER_ZONES = {
  mobile: { key: "22b5e40106fd1d27fef246e09217fecc", width: 320, height: 50 },
  rectangle: { key: "0aca9c0b2c938bb6bb53743898fe773e", width: 300, height: 250 },
  desktop: { key: "96c171164990377ba9d624d04a3b4661", width: 728, height: 90 },
} as const;
type AdsterraBannerZone = (typeof ADSTERRA_BANNER_ZONES)[keyof typeof ADSTERRA_BANNER_ZONES];
type AdsterraBannerPlacement = "standard" | "top-right";
const SOCIAL_BAR_DELAY_MS = 90_000;
const SOCIAL_BAR_SESSION_KEY = "decidly-socialbar-loaded";

function selectAdsterraBannerZone(
  frameWidth: number,
  viewportWidth: number,
): AdsterraBannerZone | null {
  const availableWidth = Math.min(
    Math.max(frameWidth, Math.min(viewportWidth, ADSTERRA_BANNER_ZONES.mobile.width)),
    viewportWidth,
  );
  if (availableWidth >= ADSTERRA_BANNER_ZONES.desktop.width) return ADSTERRA_BANNER_ZONES.desktop;
  if (availableWidth >= 468 || (availableWidth >= 300 && availableWidth < 320)) {
    return ADSTERRA_BANNER_ZONES.rectangle;
  }
  if (availableWidth >= ADSTERRA_BANNER_ZONES.mobile.width) return ADSTERRA_BANNER_ZONES.mobile;
  return null;
}

function hasSocialBarBeenAttempted() {
  try {
    return window.sessionStorage.getItem(SOCIAL_BAR_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markSocialBarAttempted() {
  try {
    window.sessionStorage.setItem(SOCIAL_BAR_SESSION_KEY, "1");
  } catch {
    // The DOM guard below still prevents duplicate injections in this document.
  }
}

function isTextEntryFocused() {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return false;
  return (
    activeElement.isContentEditable || activeElement.matches("input, textarea, [role='textbox']")
  );
}

/** Loads the Social Bar once per tab session, after the workspace has been quiet and visible. */
export function AdsterraSocialBar() {
  useEffect(() => {
    if (hasSocialBarBeenAttempted()) return;

    let timerId: number | undefined;

    const schedule = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timerId = undefined;
      }
      if (document.visibilityState !== "visible" || hasSocialBarBeenAttempted()) return;

      timerId = window.setTimeout(() => {
        timerId = undefined;
        if (document.visibilityState !== "visible" || isTextEntryFocused()) {
          schedule();
          return;
        }
        if (document.querySelector('script[data-decidly-adsterra="social-bar"]')) {
          markSocialBarAttempted();
          return;
        }

        markSocialBarAttempted();
        const script = document.createElement("script");
        script.src = SOCIAL_BAR_SRC;
        script.async = true;
        script.setAttribute("data-cfasync", "false");
        script.dataset["decidlyAdsterra"] = "social-bar";
        document.body.appendChild(script);
      }, SOCIAL_BAR_DELAY_MS);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        if (timerId !== undefined) window.clearTimeout(timerId);
        timerId = undefined;
        return;
      }
      schedule();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    schedule();

    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}

function getExposedDestination(slot: HTMLDivElement) {
  const href = slot.querySelector<HTMLAnchorElement>("a[href]")?.getAttribute("href");
  if (!href) return null;

  try {
    const destination = new URL(href, window.location.href);
    return destination.protocol === "https:" || destination.protocol === "http:"
      ? destination.href
      : null;
  } catch {
    return null;
  }
}

export function AdsterraNativeBanner({
  placement = "standard",
}: { placement?: AdsterraBannerPlacement } = {}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<AdsterraBannerZone | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [hasCreative, setHasCreative] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const frameWidth = frame.getBoundingClientRect().width;
    const zone =
      placement === "top-right"
        ? viewportWidth >= 768 && frameWidth >= ADSTERRA_BANNER_ZONES.desktop.width
          ? ADSTERRA_BANNER_ZONES.desktop
          : viewportWidth >= ADSTERRA_BANNER_ZONES.mobile.width &&
              frameWidth >= ADSTERRA_BANNER_ZONES.mobile.width
            ? ADSTERRA_BANNER_ZONES.mobile
            : null
        : selectAdsterraBannerZone(frameWidth, viewportWidth);
    setZone(zone);
  }, [placement]);

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;

    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setNearViewport(true);
        observer.disconnect();
      },
      { rootMargin: "160px 0px", threshold: 0 },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!nearViewport || !zone) return;
    const slot = slotRef.current;
    if (!slot) return;

    let active = true;
    let optionsScript: HTMLScriptElement | null = null;
    let script: HTMLScriptElement | null = null;
    const updateCreative = () => {
      if (!active) return;
      const creative = slot.querySelector("iframe, img, video, canvas, object, embed, a[href]");
      setHasCreative(Boolean(creative));
      setDestinationUrl(getExposedDestination(slot));
    };
    const observer = new MutationObserver(updateCreative);
    observer.observe(slot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["height", "style", "width"],
    });

    // Defer insertion so React StrictMode's setup/cleanup cycle cannot request the ad twice.
    const injectTimer = window.setTimeout(() => {
      if (!active) return;
      if (document.querySelector('script[data-decidly-adsterra="native-banner"]')) return;

      optionsScript = document.createElement("script");
      optionsScript.textContent = `window.atOptions = ${JSON.stringify({
        key: zone.key,
        format: "iframe",
        height: zone.height,
        width: zone.width,
        params: {},
      })};`;

      script = document.createElement("script");
      script.src = `https://cheflobesofficer.com/${zone.key}/invoke.js`;
      script.async = true;
      script.setAttribute("data-cfasync", "false");
      script.dataset["decidlyAdsterra"] = "native-banner";
      script.dataset["decidlyAdsterraKey"] = zone.key;
      slot.append(optionsScript, script);
      updateCreative();
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(injectTimer);
      observer.disconnect();
      optionsScript?.remove();
      script?.remove();
      slot.replaceChildren();
    };
  }, [nearViewport, zone]);

  useEffect(() => {
    if (!infoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [infoOpen]);

  return (
    <section className="w-full" aria-label="Anúncio do provedor Adsterra">
      <div
        ref={frameRef}
        data-zone-size={zone ? `${zone.width}x${zone.height}` : "unselected"}
        data-placement={placement}
        className={`adsterra-banner-frame${hasCreative ? " has-ad" : ""}`}
        style={{ minHeight: `${zone?.height ?? 250}px` }}
      >
        <div className="adsterra-banner-controls">
          <div className="adsterra-banner-control-group">
            <button
              type="button"
              onClick={() => setInfoOpen((open) => !open)}
              aria-label="Informações do anúncio"
              aria-controls="adsterra-banner-details"
              aria-expanded={infoOpen}
              title="Informações do anúncio"
              className="adsterra-banner-control"
            >
              <Info size={11} />
            </button>
          </div>
        </div>

        <Link
          to="/vip"
          aria-label="Remover anúncios com o plano VIP — em breve"
          title="Plano VIP sem anúncios — em breve"
          className="adsterra-banner-vip"
        >
          <Crown size={11} className="text-violet-300/90" />
        </Link>

        {infoOpen && (
          <div
            id="adsterra-banner-details"
            role="region"
            aria-label="Detalhes do anúncio"
            className="absolute left-1 right-1 top-7 z-30 rounded-xl bg-black/90 p-3 text-[11px] leading-5 text-white/70 shadow-xl sm:left-auto sm:w-80"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-white/85">Sobre este anúncio</p>
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                aria-label="Fechar detalhes do anúncio"
                className="rounded px-1 text-white/45 transition hover:bg-white/10 hover:text-white"
              >
                <X size={14} />
              </button>
            </div>
            <p className="mt-2">
              Provedor: <strong className="font-semibold text-white/85">Adsterra</strong>
            </p>
            <p className="mt-1">
              Formato: {zone ? `${zone.width} × ${zone.height}` : "indisponível nesta largura"}
            </p>
            <p className="mt-1">URL do destino:</p>
            {destinationUrl ? (
              <p className="break-all rounded-lg bg-white/[0.06] p-2 font-mono text-[10px] text-violet-200">
                {destinationUrl}
              </p>
            ) : (
              <p className="mt-1 text-white/45">
                {hasCreative
                  ? "O criativo está isolado no formato do provedor, que não expõe o destino à página. Não mostramos o endereço do script como se fosse o destino do anúncio."
                  : "Ainda não há um destino disponível. O endereço aparece aqui somente se o próprio criativo o expuser à página."}
              </p>
            )}
            <p className="mt-2 text-white/40">
              A troca manual está desativada enquanto não houver um método seguro da Adsterra;
              repetir o script pode duplicar anúncios.
            </p>
          </div>
        )}

        {!hasCreative && (
          <img
            src="/decidlyai-vip-fallback.png"
            alt="Conheça o plano VIP do DecidlyAI"
            className="adsterra-banner-fallback"
          />
        )}
        {hasCreative && <p className="adsterra-banner-label">Anúncio</p>}
        <div
          id={zone ? `container-${zone.key}` : undefined}
          ref={slotRef}
          className="adsterra-banner-slot"
        />
      </div>
    </section>
  );
}
