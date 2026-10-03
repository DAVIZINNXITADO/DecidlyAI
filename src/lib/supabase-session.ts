const SESSION_KEY_PREFIX = "sb-";
const SESSION_KEY_SUFFIX = "-auth-token";

/**
 * Supabase persists browser sessions under an `sb-…-auth-token` localStorage
 * key by default. Check for one before dynamically loading its client SDK on
 * public pages; if storage is unavailable, fail open so existing auth checks
 * still run rather than accidentally hiding an active session.
 */
export function hasStoredSupabaseSession(): boolean {
  if (typeof window === "undefined") return false;

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (
        key?.startsWith(SESSION_KEY_PREFIX) &&
        key.endsWith(SESSION_KEY_SUFFIX) &&
        window.localStorage.getItem(key)
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}
