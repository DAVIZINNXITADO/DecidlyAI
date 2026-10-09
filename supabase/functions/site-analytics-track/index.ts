import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const events = new Set(["page_view", "auth_success", "chat_topic"]);
const topics = new Set([
  "work_and_study",
  "business_and_technology",
  "decision_and_planning",
  "creative_and_media",
  "sports",
  "other",
]);
const sourceCategories = new Set([
  "direct",
  "google",
  "bing",
  "yahoo",
  "duckduckgo",
  "facebook",
  "instagram",
  "reddit",
  "linkedin",
  "youtube",
  "tiktok",
  "whatsapp",
  "other_referrer",
]);
const paths = new Set([
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

const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { windowStartedAt: number; count: number }>();

function rateLimitKey(request: Request, userId: string | null): string {
  if (userId) return `user:${userId}`;
  const ip =
    request.headers.get("cf-connecting-ip")?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return `ip:${ip}`;
}

function consumeRateLimit(key: string, eventName: string, limit: number): boolean {
  const now = Date.now();
  const windowStartedAt = Math.floor(now / RATE_WINDOW_MS) * RATE_WINDOW_MS;
  const bucketKey = `${key}:${eventName}:${windowStartedAt}`;
  const bucket = rateBuckets.get(bucketKey);
  if (bucket && bucket.count >= limit) return false;
  rateBuckets.set(bucketKey, { windowStartedAt, count: (bucket?.count ?? 0) + 1 });

  if (rateBuckets.size > 5000) {
    for (const [storedKey, storedBucket] of rateBuckets) {
      if (now - storedBucket.windowStartedAt >= RATE_WINDOW_MS) rateBuckets.delete(storedKey);
      if (rateBuckets.size <= 4000) break;
    }
  }
  return true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = request.headers.get("apikey") || "";
    const knownPublicKeys = [Deno.env.get("SUPABASE_PUBLISHABLE_KEY"), anonKey].filter(
      (value): value is string => Boolean(value),
    );
    // A chave publicável é pública: ela é apenas um marcador de contexto do projeto.
    // Eventos além de page_view ainda exigem uma sessão Supabase validada abaixo.
    const isPublicProjectKey =
      knownPublicKeys.includes(apiKey) || apiKey.startsWith("sb_publishable_");
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey || !isPublicProjectKey)
      return json({ error: "Solicitação inválida." }, 401);

    const rawBody = await request.text();
    if (rawBody.length > 4096) return json({ error: "Payload muito grande." }, 413);
    let body: {
      event_name?: unknown;
      page_path?: unknown;
      source_category?: unknown;
      topic?: unknown;
    };
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        return json({ error: "Payload inválido." }, 400);
      body = parsed as typeof body;
    } catch {
      return json({ error: "Payload inválido." }, 400);
    }
    const eventName = typeof body.event_name === "string" ? body.event_name : "";
    if (!events.has(eventName)) return json({ error: "Evento não permitido." }, 400);

    const authorization = request.headers.get("Authorization");
    let userId: string | null = null;
    if (authorization) {
      if (!authorization.startsWith("Bearer ")) return json({ error: "Sessão inválida." }, 401);
      const token = authorization.slice(7);
      const isPublicBearer = token === anonKey || token.startsWith("sb_publishable_");
      if (!isPublicBearer) {
        const authClient = createClient(supabaseUrl, anonKey, {
          global: { headers: { Authorization: authorization } },
        });
        const { data } = await authClient.auth.getUser(token);
        if (!data.user) return json({ error: "Sessão inválida." }, 401);
        userId = data.user.id;
      }
    }

    if (eventName !== "page_view" && !userId)
      return json({ error: "Este evento exige uma sessão autenticada." }, 403);

    const limit = eventName === "auth_success" ? 12 : eventName === "chat_topic" ? 60 : 120;
    if (!consumeRateLimit(rateLimitKey(request, userId), eventName, limit))
      return json({ error: "Limite temporário de registros atingido." }, 429);

    const pagePath =
      eventName === "page_view" && typeof body.page_path === "string" && paths.has(body.page_path)
        ? body.page_path
        : "";
    const sourceCategory =
      eventName === "page_view" &&
      typeof body.source_category === "string" &&
      sourceCategories.has(body.source_category)
        ? body.source_category
        : "";
    if (eventName === "page_view" && (!pagePath || !sourceCategory))
      return json({ error: "Rota ou origem não permitida." }, 400);
    const topic =
      eventName === "chat_topic" && typeof body.topic === "string" && topics.has(body.topic)
        ? body.topic
        : "";
    if (eventName === "chat_topic" && !topic)
      return json({ error: "Categoria não permitida." }, 400);

    const admin = createClient(supabaseUrl, serviceKey);
    const { error } = await admin.rpc("record_site_analytics_event", {
      p_event_name: eventName,
      p_page_path: pagePath,
      p_source_category: sourceCategory,
      p_topic: topic,
    });
    if (error) return json({ error: "Não foi possível registrar a métrica." }, 503);
    return json({ ok: true });
  } catch {
    return json({ error: "Não foi possível registrar a métrica." }, 503);
  }
});
