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

const MAX_NEWCLICK_BANNER_ATTEMPTS = 8;
const NEWCLICK_IMAGE_TIMEOUT_MS = 4_000;

function preloadNewClickImage(imageUrl: string, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    let settled = false;
    const finish = (loaded: boolean) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      signal.removeEventListener("abort", abort);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    const abort = () => finish(false);
    const timeout = window.setTimeout(() => finish(false), NEWCLICK_IMAGE_TIMEOUT_MS);

    if (signal.aborted) {
      finish(false);
      return;
    }

    signal.addEventListener("abort", abort, { once: true });
    image.onload = () => finish(image.naturalWidth > 0);
    image.onerror = () => finish(false);
    image.src = imageUrl;
  });
}

function NewClickNativePlacement() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [banner, setBanner] = useState<NewClickBanner | null>(null);
  const [retry, setRetry] = useState(0);
  const attemptsRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    const loadUsableBanner = async () => {
      while (active && attemptsRef.current < MAX_NEWCLICK_BANNER_ATTEMPTS) {
        attemptsRef.current += 1;
        try {
          const response = await fetch(
            `${NEWCLICK_API_BASE}/serve.php?id=${encodeURIComponent(NEWCLICK_WEBSITE_ID)}`,
            { signal: controller.signal },
          );
          if (!response.ok) continue;

          const payload = await response.json();
          const nextBanner =
            payload?.success && payload.banner?.type === "image"
              ? (payload.banner as NewClickBanner)
              : null;
          if (!nextBanner?.image_url || !nextBanner.click_url) continue;

          const imageUrl = new URL(nextBanner.image_url, NEWCLICK_API_BASE).toString();
          if (await preloadNewClickImage(imageUrl, controller.signal)) {
            if (active) setBanner(nextBanner);
            return;
          }
        } catch {
          if (controller.signal.aborted) return;
        }
      }
    };

    void loadUsableBanner();

    return () => {
      active = false;
      controller.abort();
    };
  }, [retry]);

  useEffect(() => {
    if (!banner || !containerRef.current) return;
    const image = containerRef.current.querySelector("img[data-newclick-rendered]");
    image?.setAttribute("data-newclick-loaded", "true");
  }, [banner]);

  const clickUrl = banner?.click_url
    ? new URL(banner.click_url, NEWCLICK_API_BASE).toString()
    : "#";
  const width = banner?.width || 468;
  const height = banner?.height || 60;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-2xl bg-[#11101f]"
    >
      <img
        src="/decidlyai-vip-fallback.png"
        alt="Conheça o plano VIP do DecidlyAI"
        className={`absolute inset-0 h-full w-full object-contain transition-opacity ${banner ? "opacity-0" : "opacity-100"}`}
      />
      {banner && (
        <a
          href={clickUrl}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl bg-[#11101f]"
          aria-label={banner.alt_text || "Publicidade NewClick"}
        >
          <img
            data-newclick-rendered
            src={new URL(banner.image_url || "", NEWCLICK_API_BASE).toString()}
            alt={banner.alt_text || "Publicidade"}
            width={width}
            height={height}
            onError={() => {
              setBanner(null);
              if (attemptsRef.current < MAX_NEWCLICK_BANNER_ATTEMPTS)
                setRetry((current) => current + 1);
            }}
            className="h-auto max-h-full w-auto max-w-full object-contain"
          />
        </a>
      )}
    </div>
  );
}

/** NewClick is the only native provider; VIP is shown only while it has no banner response. */
export function AdsterraNativeBanner() {
  return (
    <section
      className="rounded-3xl border border-white/10 bg-white/[0.025] p-3"
      aria-label="Publicidade"
    >
      <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">
        Publicidade
      </p>
      <NewClickNativePlacement />
    </section>
  );
}
