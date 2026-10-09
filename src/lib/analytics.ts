import { hasAdsConsent } from "./ad-consent";
import { supabase } from "./supabase";
import type { AnalyticsTopic } from "./chat-enrichment";

const ENTRY_SEEN_KEY = "decidly-analytics-entry-seen-v1";
let lastTrackedPath = "";
let lastTrackedAt = 0;
const REFERRER_PLATFORMS: Record<string, string[]> = {
  google: ["google.com", "google.com.br", "google.pt"],
  bing: ["bing.com"],
  yahoo: ["yahoo.com"],
  duckduckgo: ["duckduckgo.com"],
  facebook: ["facebook.com", "fb.com"],
  instagram: ["instagram.com"],
  reddit: ["reddit.com"],
  linkedin: ["linkedin.com"],
  youtube: ["youtube.com", "youtu.be"],
  tiktok: ["tiktok.com"],
  whatsapp: ["whatsapp.com", "wa.me"],
};
const KNOWN_PATHS = new Set([
  "/",
  "/workspace",
  "/login",
  "/reset-password",
  "/credits",
  "/credits/buy",
  "/credits/free",
  "/credits/history",
  "/auth/confirm",
  "/settings",
  "/settings/account",
  "/settings/appearance",
  "/settings/language",
  "/settings/preferences",
  "/blog",
  "/como-funciona",
  "/como-tomar-decisoes-dificeis",
  "/ia-para-empreendedores",
  "/ajuda-para-escolher-faculdade",
  "/tecnologia",
  "/privacy",
  "/cookies",
  "/terms",
  "/promo",
  "/vip",
  "/referral-history",
  "/analytics",
  "/ai-test",
  "/pt-br/credits",
  "/pt-br/login",
  "/pt-br/settings",
  "/pt-br/workspace",
]);

function normalizedPath(path: string): string {
  return KNOWN_PATHS.has(path) ? path : "/other";
}

function safeReferrerCategory(): string {
  try {
    const referrer = document.referrer;
    if (!referrer) return "direct";
    const parsed = new URL(referrer);
    if (parsed.host === window.location.host) return "direct";
    const hostname = parsed.hostname.toLowerCase();
    for (const [platform, domains] of Object.entries(REFERRER_PLATFORMS)) {
      if (domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)))
        return platform;
    }
    return "other_referrer";
  } catch {
    return "direct";
  }
}

type AnalyticsEvent = {
  event_name: "page_view" | "auth_success" | "chat_topic";
  page_path?: string;
  source_category?: string;
  topic?: AnalyticsTopic;
};

async function record(event: AnalyticsEvent): Promise<void> {
  if (typeof window === "undefined" || !hasAdsConsent()) return;
  try {
    await supabase.functions.invoke("site-analytics-track", { body: event });
  } catch {
    // Telemetria é opcional e nunca deve interromper o produto.
  }
}

export function trackPageView(path: string): void {
  if (typeof window === "undefined" || !hasAdsConsent()) return;
  const pagePath = normalizedPath(path);
  const now = Date.now();
  if (pagePath === lastTrackedPath && now - lastTrackedAt < 1000) return;
  lastTrackedPath = pagePath;
  lastTrackedAt = now;
  let isEntry = false;
  try {
    isEntry = window.sessionStorage.getItem(ENTRY_SEEN_KEY) !== "1";
    if (isEntry) window.sessionStorage.setItem(ENTRY_SEEN_KEY, "1");
  } catch {
    isEntry = false;
  }
  void record({
    event_name: "page_view",
    page_path: pagePath,
    source_category: isEntry ? safeReferrerCategory() : "",
  });
}

export function trackAuthSuccess(): void {
  void record({ event_name: "auth_success" });
}

export function trackChatTopic(topic: AnalyticsTopic): void {
  void record({ event_name: "chat_topic", topic });
}
