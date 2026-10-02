export const COOKIE_CONSENT_STORAGE_KEY = "decidlyai-cookie-consent-v2";
export const COOKIE_CONSENT_CHANGED_EVENT = "decidlyai:cookie-consent-changed";

export function hasAdsConsent(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY) === "accepted";
  } catch {
    return false;
  }
}

export function notifyCookieConsentChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(COOKIE_CONSENT_CHANGED_EVENT));
}
