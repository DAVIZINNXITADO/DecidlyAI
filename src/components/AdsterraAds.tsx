import { useEffect, useRef, useState } from "react";
import { COOKIE_CONSENT_CHANGED_EVENT, hasAdsConsent } from "../lib/ad-consent";

const SOCIAL_BAR_SRC = "https://cheflobesofficer.com/47/22/20/4722201050555ac91066f4314c7f7b0f.js";
const ADSTERRA_BANNER_ZONES = {
  mobile: { key: "22b5e40106fd1d27fef246e09217fecc", width: 320, height: 50 },
  rectangle: { key: "0aca9c0b2c938bb6bb53743898fe773e", width: 300, height: 250 },
  leaderboard: { key: "7b7ec6d58978edec94d9c1b5beaae9e4", width: 468, height: 60 },
  verticalCompact: { key: "c7472a11c92c4f0f46847786e98bb26a", width: 160, height: 300 },
  verticalTall: { key: "39622a664c5a3450388606e74ac02d84", width: 160, height: 600 },
  desktop: { key: "96c171164990377ba9d624d04a3b4661", width: 728, height: 90 },
} as const;
type AdsterraBannerZone = (typeof ADSTERRA_BANNER_ZONES)[keyof typeof ADSTERRA_BANNER_ZONES];
type AdsterraBannerPlacement =
  | "standard"
  | "top-right"
  | "in-content"
  | "native-300x250"
  | "rail-160x300"
  | "rail-160x600";
const SOCIAL_BAR_INITIAL_DELAY_MS = 2_000;
const SOCIAL_BAR_SESSION_KEY = "decidly-socialbar-loaded-v2";

function useAdsConsent() {
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    const syncConsent = () => setConsent(hasAdsConsent());
    syncConsent();
    window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
    return () => window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, syncConsent);
  }, []);

  return consent;
}

type AdsterraBannerRequest = {
  slot: HTMLDivElement;
  zone: AdsterraBannerZone;
  isActive: () => boolean;
  updateCreative: () => void;
  cancelled?: boolean;
  optionsScript?: HTMLScriptElement;
  script?: HTMLScriptElement;
};

const adsterraBannerQueue: AdsterraBannerRequest[] = [];
let adsterraBannerQueueBusy = false;

function processAdsterraBannerQueue() {
  if (adsterraBannerQueueBusy) return;

  let request = adsterraBannerQueue.shift();
  while (request && (request.cancelled || !request.isActive() || !request.slot.isConnected)) {
    request = adsterraBannerQueue.shift();
  }
  if (!request) return;

  const existingScript = document.querySelector(
    `script[data-decidly-adsterra="native-banner"][data-decidly-adsterra-key="${request.zone.key}"]`,
  );
  if (existingScript) {
    request.updateCreative();
    processAdsterraBannerQueue();
    return;
  }

  adsterraBannerQueueBusy = true;
  let completed = false;
  const finish = () => {
    if (completed) return;
    completed = true;
    adsterraBannerQueueBusy = false;
    processAdsterraBannerQueue();
  };

  const optionsScript = document.createElement("script");
  optionsScript.textContent = `window.atOptions = ${JSON.stringify({
    key: request.zone.key,
    format: "iframe",
    height: request.zone.height,
    width: request.zone.width,
    params: {},
  })};`;

  const script = document.createElement("script");
  script.src = `https://cheflobesofficer.com/${request.zone.key}/invoke.js`;
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.dataset["decidlyAdsterra"] = "native-banner";
  script.dataset["decidlyAdsterraKey"] = request.zone.key;
  script.addEventListener(
    "load",
    () => {
      request.updateCreative();
      finish();
    },
    { once: true },
  );
  script.addEventListener("error", finish, { once: true });
  window.setTimeout(() => {
    request.updateCreative();
    finish();
  }, 15_000);

  request.optionsScript = optionsScript;
  request.script = script;
  request.slot.append(optionsScript, script);
  request.updateCreative();
}

function enqueueAdsterraBanner(request: Omit<AdsterraBannerRequest, "cancelled">) {
  const queuedRequest: AdsterraBannerRequest = { ...request };
  adsterraBannerQueue.push(queuedRequest);
  processAdsterraBannerQueue();

  return () => {
    queuedRequest.cancelled = true;
    const queuedIndex = adsterraBannerQueue.indexOf(queuedRequest);
    if (queuedIndex >= 0) adsterraBannerQueue.splice(queuedIndex, 1);
    queuedRequest.optionsScript?.remove();
    queuedRequest.script?.remove();
  };
}

function selectAdsterraBannerZone(
  frameWidth: number,
  viewportWidth: number,
  placement: AdsterraBannerPlacement,
): AdsterraBannerZone | null {
  const availableWidth = Math.min(
    Math.max(frameWidth, Math.min(viewportWidth, ADSTERRA_BANNER_ZONES.mobile.width)),
    viewportWidth,
  );

  if (placement === "rail-160x300" || placement === "rail-160x600") {
    if (viewportWidth < 768 || frameWidth < 160) return null;
    return placement === "rail-160x300"
      ? ADSTERRA_BANNER_ZONES.verticalCompact
      : ADSTERRA_BANNER_ZONES.verticalTall;
  }

  if (placement === "native-300x250") {
    return availableWidth >= ADSTERRA_BANNER_ZONES.rectangle.width
      ? ADSTERRA_BANNER_ZONES.rectangle
      : null;
  }

  if (placement === "in-content" && viewportWidth >= 768) {
    if (availableWidth >= ADSTERRA_BANNER_ZONES.desktop.width) return ADSTERRA_BANNER_ZONES.desktop;
    if (availableWidth >= ADSTERRA_BANNER_ZONES.leaderboard.width) {
      return ADSTERRA_BANNER_ZONES.leaderboard;
    }
    if (availableWidth >= ADSTERRA_BANNER_ZONES.rectangle.width) return ADSTERRA_BANNER_ZONES.rectangle;
    return null;
  }

  if (availableWidth >= ADSTERRA_BANNER_ZONES.desktop.width) return ADSTERRA_BANNER_ZONES.desktop;
  if (availableWidth >= ADSTERRA_BANNER_ZONES.leaderboard.width) {
    return ADSTERRA_BANNER_ZONES.leaderboard;
  }
  if (availableWidth >= ADSTERRA_BANNER_ZONES.mobile.width) return ADSTERRA_BANNER_ZONES.mobile;
  if (availableWidth >= ADSTERRA_BANNER_ZONES.rectangle.width) return ADSTERRA_BANNER_ZONES.rectangle;
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

/** Loads the Social Bar once per tab session after a short Workspace entry delay; never polls or refreshes. */
export function AdsterraSocialBar() {
  const adsConsent = useAdsConsent();

  useEffect(() => {
    if (!adsConsent || hasSocialBarBeenAttempted()) return;

    let timerId: number | undefined;
    let waitingForFocusOut = false;

    const schedule = () => {
      if (timerId !== undefined) {
        window.clearTimeout(timerId);
        timerId = undefined;
      }
      if (document.visibilityState !== "visible" || hasSocialBarBeenAttempted()) {
        return;
      }

      timerId = window.setTimeout(() => {
        timerId = undefined;
        if (document.visibilityState !== "visible" || hasSocialBarBeenAttempted()) return;
        if (isTextEntryFocused()) {
          if (!waitingForFocusOut) {
            waitingForFocusOut = true;
            document.addEventListener("focusout", onFocusOut);
          }
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
        script.addEventListener(
          "error",
          () => {
            try {
              window.sessionStorage.removeItem(SOCIAL_BAR_SESSION_KEY);
            } catch {
              // A later Workspace entry can retry; there is no automatic retry loop.
            }
            script.remove();
          },
          { once: true },
        );
        document.body.appendChild(script);
      }, SOCIAL_BAR_INITIAL_DELAY_MS);
    };

    const onFocusOut = () => {
      if (isTextEntryFocused()) return;
      waitingForFocusOut = false;
      document.removeEventListener("focusout", onFocusOut);
      schedule();
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
      if (waitingForFocusOut) document.removeEventListener("focusout", onFocusOut);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [adsConsent]);

  return null;
}

export function AdsterraNativeBanner({
  placement = "standard",
}: { placement?: AdsterraBannerPlacement } = {}) {
  const adsConsent = useAdsConsent();
  const frameRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [zone, setZone] = useState<AdsterraBannerZone | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [hasCreative, setHasCreative] = useState(false);
  const [noFill, setNoFill] = useState(false);

  useEffect(() => {
    if (!adsConsent) {
      setZone(null);
      return;
    }
    const frame = frameRef.current;
    if (!frame) return;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const frameWidth = frame.getBoundingClientRect().width;
    const zone = selectAdsterraBannerZone(frameWidth, viewportWidth, placement);
    setZone(zone);
  }, [adsConsent, placement]);

  useEffect(() => {
    if (!adsConsent) return;
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
  }, [adsConsent]);

  useEffect(() => {
    if (!adsConsent || !nearViewport || !zone) return;
    const slot = slotRef.current;
    const frame = frameRef.current;
    if (!slot || !frame) return;

    let active = true;
    let scaledElement: Element | null = null;
    let appliedScale = 1;
    setHasCreative(false);
    setNoFill(false);
    const clearMobileScale = () => {
      scaledElement?.removeAttribute("data-decidly-mobile-scaled");
      scaledElement = null;
      appliedScale = 1;
      frame.style.removeProperty("--adsterra-mobile-scale");
      frame.style.setProperty("--adsterra-creative-half-width", `${zone.width / 2}px`);
    };
    const noFillTimer = window.setTimeout(() => {
      if (!active) return;
      const creative = slot.querySelector("iframe, img, video, canvas, object, embed, a[href]");
      if (!creative) setNoFill(true);
    }, 8_000);
    const updateCreative = () => {
      if (!active) return;
      const creative = slot.querySelector("iframe, img, video, canvas, object, embed, a[href]");
      const media = slot.querySelector<HTMLElement>("iframe, img, video, canvas, object, embed");
      const link = slot.querySelector<HTMLElement>("a[href]");
      const mediaWidth = media?.getBoundingClientRect().width ?? 0;
      const linkWidth = link?.getBoundingClientRect().width ?? 0;
      const scaleTarget =
        media && link && Math.abs(mediaWidth - linkWidth) <= 2 ? link : media || link;
      const unscaledWidth =
        scaleTarget && scaleTarget === scaledElement
          ? scaleTarget.getBoundingClientRect().width / appliedScale
          : (scaleTarget?.getBoundingClientRect().width ?? 0);
      if (scaledElement && scaledElement !== scaleTarget) {
        scaledElement.removeAttribute("data-decidly-mobile-scaled");
        scaledElement = null;
        appliedScale = 1;
      }

      const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
      const slotWidth = slot.getBoundingClientRect().width;
      if (
        scaleTarget &&
        zone.width === ADSTERRA_BANNER_ZONES.mobile.width &&
        viewportWidth < 640 &&
        unscaledWidth > 0 &&
        slotWidth > unscaledWidth
      ) {
        appliedScale = Math.min(1.25, slotWidth / unscaledWidth);
        if (appliedScale > 1.01) {
          frame.style.setProperty("--adsterra-mobile-scale", String(appliedScale));
          frame.style.setProperty(
            "--adsterra-creative-half-width",
            `${(zone.width * appliedScale) / 2}px`,
          );
          scaleTarget.setAttribute("data-decidly-mobile-scaled", "true");
          scaledElement = scaleTarget;
        } else {
          clearMobileScale();
        }
      } else {
        clearMobileScale();
      }

      const hasAd = Boolean(creative);
      setHasCreative(hasAd);
      if (hasAd) setNoFill(false);
    };
    const observer = new MutationObserver(updateCreative);
    observer.observe(slot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["height", "style", "width"],
    });
    window.addEventListener("resize", updateCreative);
    window.visualViewport?.addEventListener("resize", updateCreative);

    // Serialize units because Adsterra's invoke.js reads shared window.atOptions.
    const cancelQueuedInjection = enqueueAdsterraBanner({
      slot,
      zone,
      isActive: () => active,
      updateCreative,
    });

    return () => {
      active = false;
      window.clearTimeout(noFillTimer);
      observer.disconnect();
      window.removeEventListener("resize", updateCreative);
      window.visualViewport?.removeEventListener("resize", updateCreative);
      clearMobileScale();
      cancelQueuedInjection();
      slot.replaceChildren();
    };
  }, [adsConsent, nearViewport, zone]);

  if (!adsConsent) return null;

  return (
    <section className="w-full" aria-label="Anúncio do provedor Adsterra">
      <div
        ref={frameRef}
        data-zone-size={zone ? `${zone.width}x${zone.height}` : "unselected"}
        data-placement={placement}
        data-ad-state={hasCreative ? "filled" : noFill ? "empty" : "loading"}
        className={`adsterra-banner-frame${hasCreative ? " has-ad" : ""}`}
        style={{ minHeight: `${zone?.height ?? 250}px` }}
      >
        <div
          id={zone ? `container-${zone.key}` : undefined}
          ref={slotRef}
          className="adsterra-banner-slot"
        />
        {hasCreative && (
          <span className="adsterra-banner-label" aria-label="Publicidade" role="note">
            AD
          </span>
        )}
      </div>
    </section>
  );
}
