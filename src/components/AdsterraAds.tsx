import { Link } from "@tanstack/react-router";
import { Crown, Info, RotateCw, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_BANNER_SRC =
  "https://cheflobesofficer.com/0808b976d18733b256b1229ba2178907/invoke.js";
const ADSTERRA_BANNER_CONTAINER_ID = "container-0808b976d18733b256b1229ba2178907";
const SOCIAL_BAR_DELAY_MS = 90_000;
const AD_CREATIVE_TIMEOUT_MS = 12_000;
const MAX_MANUAL_REROLLS_PER_VIEW = 1;
const SOCIAL_BAR_SESSION_KEY = "decidly-socialbar-loaded";

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
        script.dataset.decidlyAdsterra = "social-bar";
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
  const [nearViewport, setNearViewport] = useState(false);
  const [slotIsViewable, setSlotIsViewable] = useState(false);
  const [hasCreative, setHasCreative] = useState(false);
  const [destinationUrl, setDestinationUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [manualRerolls, setManualRerolls] = useState(0);
  const [refreshGeneration, setRefreshGeneration] = useState(0);

  useEffect(() => {
    const frame = frameRef.current;
    const slot = slotRef.current;
    if (!frame || !slot) return;

    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      setSlotIsViewable(true);
      return;
    }

    const preloadObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearViewport(true);
          preloadObserver.disconnect();
        }
      },
      { rootMargin: "160px 0px", threshold: 0 },
    );
    const viewabilityObserver = new IntersectionObserver(
      ([entry]) => {
        setSlotIsViewable(entry.isIntersecting && entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5] },
    );

    preloadObserver.observe(frame);
    viewabilityObserver.observe(slot);

    return () => {
      preloadObserver.disconnect();
      viewabilityObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!nearViewport) return;
    const slot = slotRef.current;
    if (!slot) return;
    const parent = slot.parentElement;
    if (!parent) return;

    setIsLoading(true);
    setHasCreative(false);
    setDestinationUrl(null);

    let loadTimeoutId: number | undefined;
    const stopWaiting = () => {
      if (loadTimeoutId !== undefined) {
        window.clearTimeout(loadTimeoutId);
        loadTimeoutId = undefined;
      }
      setIsLoading(false);
    };
    const updateCreative = () => {
      const creative = slot.querySelector("iframe, img, video, canvas, object, embed, a[href]");
      const loaded = Boolean(creative);
      setHasCreative(loaded);
      setDestinationUrl(getExposedDestination(slot));
      if (loaded) stopWaiting();
    };

    const observer = new MutationObserver(updateCreative);
    observer.observe(slot, { childList: true, subtree: true });

    const script = document.createElement("script");
    const onScriptError = () => stopWaiting();
    script.src = ADSTERRA_BANNER_SRC;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.dataset.decidlyAdsterra = "native-banner";
    script.addEventListener("error", onScriptError);

    loadTimeoutId = window.setTimeout(stopWaiting, AD_CREATIVE_TIMEOUT_MS);
    parent.insertBefore(script, slot);
    updateCreative();

    return () => {
      if (loadTimeoutId !== undefined) window.clearTimeout(loadTimeoutId);
      observer.disconnect();
      script.removeEventListener("error", onScriptError);
      script.remove();
      slot.replaceChildren();
    };
  }, [nearViewport, refreshGeneration]);

  useEffect(() => {
    if (!infoOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setInfoOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [infoOpen]);

  const requestAnotherCreative = () => {
    if (isLoading || !slotIsViewable || manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW) {
      return;
    }
    setManualRerolls((count) => count + 1);
    setRefreshGeneration((generation) => generation + 1);
  };

  const refreshDisabled =
    isLoading || !nearViewport || !slotIsViewable || manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW;
  const refreshLabel = isLoading
    ? "Carregando"
    : manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW
      ? "Troca usada"
      : hasCreative
        ? "Outro anúncio"
        : "Tentar outro";

  return (
    <section className="w-full" aria-label="Anúncio do provedor Adsterra">
      <div ref={frameRef} className={`adsterra-banner-frame${hasCreative ? " has-ad" : ""}`}>
        <div className="pointer-events-none absolute right-1 top-1 z-20">
          <div className="pointer-events-auto flex items-center gap-0.5 rounded-lg bg-black/60 px-1 py-0.5 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setInfoOpen((open) => !open)}
              aria-label="Informações do anúncio"
              aria-controls="adsterra-banner-details"
              aria-expanded={infoOpen}
              title="Informações do anúncio"
              className="inline-flex min-h-6 items-center gap-1 rounded px-1.5 text-[10px] text-white/70 transition hover:bg-white/15 hover:text-white sm:text-xs"
            >
              <Info size={13} />
              <span>Adsterra</span>
            </button>
            <button
              type="button"
              onClick={requestAnotherCreative}
              disabled={refreshDisabled}
              title={
                !slotIsViewable
                  ? "Role até o anúncio para solicitar outra opção."
                  : manualRerolls >= MAX_MANUAL_REROLLS_PER_VIEW
                    ? "Já foi solicitada outra opção neste espaço."
                    : "Solicitar outro criativo da Adsterra."
              }
              className="inline-flex min-h-6 items-center gap-1 rounded px-1.5 text-[10px] text-white/70 transition hover:bg-white/15 hover:text-white disabled:cursor-not-allowed disabled:opacity-35 sm:text-xs"
            >
              <RotateCw size={12} className={isLoading ? "animate-spin" : ""} />
              <span>{refreshLabel === "Outro anúncio" ? "Outro" : refreshLabel}</span>
            </button>
            <Link
              to="/vip"
              title="Plano VIP sem anúncios — em breve"
              className="inline-flex min-h-6 items-center gap-1 rounded px-1.5 text-[10px] text-white/70 transition hover:bg-white/15 hover:text-white sm:text-xs"
            >
              <Crown size={12} className="text-violet-300/80" />
              <span>Remover anúncios</span>
            </Link>
          </div>
        </div>

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
        <div id={ADSTERRA_BANNER_CONTAINER_ID} ref={slotRef} className="adsterra-banner-slot" />
      </div>
    </section>
  );
}
