import { Link } from "@tanstack/react-router";
import { Crown, Info, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_BANNER_ZONES = {
  mobile: { key: "22b5e40106fd1d27fef246e09217fecc", width: 320, height: 50 },
  rectangle: { key: "0aca9c0b2c938bb6bb53743898fe773e", width: 300, height: 250 },
  desktop: { key: "96c171164990377ba9d624d04a3b4661", width: 728, height: 90 },
} as const;
type AdsterraBannerZone = (typeof ADSTERRA_BANNER_ZONES)[keyof typeof ADSTERRA_BANNER_ZONES];
const SOCIAL_BAR_DELAY_MS = 90_000;
const AD_CREATIVE_TIMEOUT_MS = 12_000;
const MAX_MANUAL_REROLLS_PER_VIEW = 1;
const SOCIAL_BAR_SESSION_KEY = "decidly-socialbar-loaded";

function selectAdsterraBannerZone(
  frameWidth: number,
  viewportWidth: number,
): AdsterraBannerZone | null {
  const availableWidth = frameWidth >= 300 ? frameWidth : Math.min(viewportWidth, 320);
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

export function AdsterraNativeBanner() {
  const frameRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<AdsterraBannerZone | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [bannerIsViewable, setBannerIsViewable] = useState(false);
  const [hasCreative, setHasCreative] = useState(false);
  const [creativeWidth, setCreativeWidth] = useState(0);
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [manualRerolls, setManualRerolls] = useState(0);
  const [refreshGeneration, setRefreshGeneration] = useState(0);
  const [rerollStatus, setRerollStatus] = useState<"idle" | "loading" | "loaded" | "unavailable">(
    "idle",
  );

  useEffect(() => {
    const frame = frameRef.current;
    if (!frame) return;
    setZone(selectAdsterraBannerZone(frame.getBoundingClientRect().width, window.innerWidth));
  }, []);

  useEffect(() => {
    const frame = frameRef.current;
    const slot = slotRef.current;
    if (!frame || !slot) return;

    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      setBannerIsViewable(true);
      return;
    }

    const preloadObserver = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        setNearViewport(true);
        preloadObserver.disconnect();
      },
      { rootMargin: "160px 0px", threshold: 0 },
    );
    const viewabilityObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        setBannerIsViewable(Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5));
      },
      { threshold: [0, 0.5] },
    );

    preloadObserver.observe(frame);
    viewabilityObserver.observe(frame);

    return () => {
      preloadObserver.disconnect();
      viewabilityObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!nearViewport || !zone) return;
    const slot = slotRef.current;
    if (!slot) return;
    const parent = slot.parentElement;
    if (!parent) return;

    setIsLoading(true);
    setHasCreative(false);
    setCreativeWidth(0);
    setDestinationUrl(null);
    setRerollStatus(refreshGeneration > 0 ? "loading" : "idle");

    let loadTimeoutId: number | undefined;
    let active = true;
    let observedCreative: Element | null = null;
    let resizeObserver: ResizeObserver | undefined;
    const stopWaiting = (result: "loaded" | "unavailable") => {
      if (!active) return;
      if (loadTimeoutId !== undefined) {
        window.clearTimeout(loadTimeoutId);
        loadTimeoutId = undefined;
      }
      setIsLoading(false);
      if (refreshGeneration > 0) setRerollStatus(result);
    };
    const updateCreative = () => {
      const creative = slot.querySelector<HTMLElement>(
        "iframe, img, video, canvas, object, embed, a[href]",
      );
      const loaded = Boolean(creative);
      setHasCreative(loaded);
      setDestinationUrl(getExposedDestination(slot));
      if (!creative) return;

      if (creative !== observedCreative) {
        resizeObserver?.disconnect();
        observedCreative = creative;
        if (typeof ResizeObserver !== "undefined") {
          resizeObserver = new ResizeObserver(() => updateCreative());
          resizeObserver.observe(creative);
        }
      }

      const renderedWidth = creative.getBoundingClientRect().width;
      const declaredWidth = Number(creative.getAttribute("width")) || 0;
      const measuredWidth = Math.round(renderedWidth || declaredWidth);
      if (measuredWidth > 0) {
        setCreativeWidth((current) => (current === measuredWidth ? current : measuredWidth));
      }
      stopWaiting("loaded");
    };

    const observer = new MutationObserver(updateCreative);
    observer.observe(slot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["height", "style", "width"],
    });

    const optionsScript = document.createElement("script");
    optionsScript.textContent = `window.atOptions = ${JSON.stringify({
      key: zone.key,
      format: "iframe",
      height: zone.height,
      width: zone.width,
      params: {},
    })};`;

    const script = document.createElement("script");
    const onScriptError = () => stopWaiting("unavailable");
    script.src = `https://cheflobesofficer.com/${zone.key}/invoke.js`;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.dataset["decidlyAdsterra"] = "native-banner";
    script.dataset["decidlyAdsterraKey"] = zone.key;
    script.addEventListener("error", onScriptError);

    loadTimeoutId = window.setTimeout(() => stopWaiting("unavailable"), AD_CREATIVE_TIMEOUT_MS);
    parent.insertBefore(optionsScript, slot);
    parent.insertBefore(script, slot);
    updateCreative();

    return () => {
      active = false;
      if (loadTimeoutId !== undefined) window.clearTimeout(loadTimeoutId);
      observer.disconnect();
      resizeObserver?.disconnect();
      optionsScript.remove();
      script.removeEventListener("error", onScriptError);
      script.remove();
      slot.replaceChildren();
    };
  }, [nearViewport, refreshGeneration, zone]);

  useEffect(() => {
    if (!infoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [infoOpen]);

  const requestAnotherCreative = () => {
    if (!zone || isLoading || !bannerIsViewable || manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW) {
      return;
    }
    setRerollStatus("loading");
    setManualRerolls((count) => count + 1);
    setRefreshGeneration((generation) => generation + 1);
  };

  const refreshDisabled =
    !zone ||
    isLoading ||
    !nearViewport ||
    !bannerIsViewable ||
    manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW;
  const refreshTitle = !zone
    ? "Não há um formato Adsterra disponível para esta largura."
    : !nearViewport || !bannerIsViewable
      ? "Role até deixar pelo menos metade do espaço do anúncio visível."
      : isLoading
        ? manualRerolls > 0
          ? "Solicitando outra opção à Adsterra."
          : "Carregando o anúncio da Adsterra."
        : rerollStatus === "unavailable"
          ? "A Adsterra não retornou outro anúncio nesta tentativa."
          : manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW
            ? "A única tentativa manual deste espaço já foi usada."
            : hasCreative
              ? "Tentar outro anúncio uma vez."
              : "Tentar carregar um anúncio uma vez.";

  return (
    <section className="w-full" aria-label="Anúncio do provedor Adsterra">
      <div
        ref={frameRef}
        data-zone-size={zone ? `${zone.width}x${zone.height}` : "unselected"}
        data-control-mode={creativeWidth >= 520 ? "wide" : "compact"}
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
              <Info size={14} />
              <span className="adsterra-banner-control-label">Info</span>
            </button>
            <button
              type="button"
              onClick={requestAnotherCreative}
              disabled={refreshDisabled}
              aria-label={refreshTitle}
              aria-busy={isLoading}
              title={refreshTitle}
              className="adsterra-banner-control"
            >
              <RotateCw size={14} className={isLoading ? "animate-spin" : ""} />
              <span className="adsterra-banner-control-label">Trocar</span>
            </button>
          </div>
        </div>

        <Link
          to="/vip"
          aria-label="Remover anúncios com o plano VIP — em breve"
          title="Plano VIP sem anúncios — em breve"
          className="adsterra-banner-vip"
        >
          <Crown size={14} className="text-violet-300/90" />
          <span className="adsterra-banner-vip-label">VIP</span>
        </Link>

        {infoOpen && (
          <div
            id="adsterra-banner-details"
            role="region"
            aria-label="Detalhes do anúncio"
            className="absolute left-1 right-1 top-8 z-30 rounded-xl bg-black/90 p-3 text-[11px] leading-5 text-white/70 shadow-xl sm:left-auto sm:w-80"
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
              A troca, quando disponível, é manual e limitada a uma solicitação por espaço. Não há
              atualização automática do banner.
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
      {rerollStatus === "unavailable" && manualRerolls > 0 && (
        <p className="adsterra-banner-reroll-status" role="status">
          A Adsterra não retornou outro anúncio nesta tentativa.
        </p>
      )}
    </section>
  );
}
