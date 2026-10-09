import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const photoQueries: Record<string, string> = {
  running: "running track athlete training",
  travel: "Brazil travel destination city landscape",
  nature: "Brazil nature landscape waterfall forest",
  food: "Brazilian food cooking recipe ingredients",
  architecture: "modern architecture home interior design",
};

const requestWindows = new Map<string, { startedAt: number; count: number }>();
function allowUserRequest(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60_000;
  const bucket = requestWindows.get(userId);
  if (!bucket || now - bucket.startedAt >= windowMs) {
    requestWindows.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (bucket.count >= 8) return false;
  bucket.count += 1;
  if (requestWindows.size > 5000) {
    for (const [key, value] of requestWindows) {
      if (now - value.startedAt >= windowMs) requestWindows.delete(key);
      if (requestWindows.size <= 4000) break;
    }
  }
  return true;
}

function safePhotoUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "images.unsplash.com" ? value : "";
  } catch {
    return "";
  }
}

function safeProfileUrl(value: unknown): string {
  if (typeof value !== "string") return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !["unsplash.com", "www.unsplash.com"].includes(url.hostname))
      return "";
    url.searchParams.set("utm_source", "decidlyai");
    url.searchParams.set("utm_medium", "referral");
    return url.toString();
  } catch {
    return "";
  }
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey)
      return json({ error: "Sessão inválida." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData } = await authClient.auth.getUser(authorization.slice(7));
    if (!userData.user) return json({ error: "Entre na sua conta para usar a conversa." }, 401);
    if (!allowUserRequest(userData.user.id)) return json({ photo: null, limited: true }, 429);

    const rawBody = await request.text();
    if (rawBody.length > 4096) return json({ error: "Payload muito grande." }, 413);
    let body: { topic?: unknown; conversation_id?: unknown };
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return json({ error: "Payload inválido." }, 400);
      body = parsed as typeof body;
    } catch {
      return json({ error: "Payload inválido." }, 400);
    }
    if (
      typeof body.topic !== "string" ||
      !Object.prototype.hasOwnProperty.call(photoQueries, body.topic)
    )
      return json({ error: "Categoria visual não disponível." }, 400);
    if (typeof body.conversation_id !== "string" || !UUID_PATTERN.test(body.conversation_id))
      return json({ error: "Conversa inválida." }, 400);

    const accessKey = Deno.env.get("UNSPLASH_ACCESS_KEY");
    if (!accessKey) return json({ photo: null });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: claimed, error: claimError } = await admin.rpc("claim_contextual_media_use", {
      p_user_id: userData.user.id,
      p_conversation_id: body.conversation_id,
    });
    if (claimError || claimed !== true) return json({ photo: null });

    const searchUrl = new URL("https://api.unsplash.com/search/photos");
    searchUrl.searchParams.set("query", photoQueries[body.topic]);
    searchUrl.searchParams.set("orientation", "landscape");
    searchUrl.searchParams.set("content_filter", "high");
    searchUrl.searchParams.set("per_page", "1");
    const searchResponse = await fetch(searchUrl, {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(7000),
    });
    if (!searchResponse.ok) return json({ photo: null });

    const search = (await searchResponse.json()) as {
      results?: Array<{
        id?: unknown;
        alt_description?: unknown;
        description?: unknown;
        urls?: { regular?: unknown };
        links?: { download_location?: unknown };
        user?: { name?: unknown; links?: { html?: unknown } };
      }>;
    };
    const photo = search.results?.[0];
    if (!photo) return json({ photo: null });

    const id = typeof photo.id === "string" ? photo.id : "";
    const imageUrl = safePhotoUrl(photo.urls?.regular);
    const profileUrl = safeProfileUrl(photo.user?.links?.html);
    const downloadLocation =
      typeof photo.links?.download_location === "string" ? photo.links.download_location : "";
    if (!id || !imageUrl || !profileUrl) return json({ photo: null });

    let trackingUrl: URL;
    try {
      trackingUrl = new URL(downloadLocation);
      if (
        trackingUrl.protocol !== "https:" ||
        trackingUrl.hostname !== "api.unsplash.com" ||
        trackingUrl.pathname !== `/photos/${id}/download`
      )
        return json({ photo: null });
    } catch {
      return json({ photo: null });
    }

    const tracked = await fetch(trackingUrl, {
      headers: { Authorization: `Client-ID ${accessKey}`, "Accept-Version": "v1" },
      signal: AbortSignal.timeout(5000),
    });
    if (!tracked.ok) return json({ photo: null });

    const alt = String(
      photo.alt_description || photo.description || "Imagem relacionada ao tema da conversa",
    ).slice(0, 240);
    const photographer = String(photo.user?.name || "Fotógrafo do Unsplash").slice(0, 120);
    return json({ photo: { url: imageUrl, alt, photographer, photographerProfile: profileUrl } });
  } catch {
    return json({ photo: null });
  }
});
