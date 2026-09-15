import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  try {
    const libreUrl = Deno.env.get("LIBRETRANSLATE_URL");
    const apiKey = Deno.env.get("LIBRETRANSLATE_API_KEY");
    if (!libreUrl) return new Response(JSON.stringify({ error: "LIBRETRANSLATE_NOT_CONFIGURED", translations: [] }), { status: 503, headers: jsonHeaders });
    const body = await request.json() as { texts?: unknown; source?: unknown; target?: unknown };
    const texts = Array.isArray(body.texts) ? body.texts.filter((text): text is string => typeof text === "string" && text.trim()).slice(0, 100) : [];
    const source = typeof body.source === "string" ? body.source : "pt";
    const target = typeof body.target === "string" ? body.target : "en";
    if (!texts.length || !["pt", "en"].includes(source) || !["pt", "en"].includes(target)) return new Response(JSON.stringify({ error: "Invalid translation request" }), { status: 400, headers: jsonHeaders });
    if (source === target) return new Response(JSON.stringify({ translations: texts }), { headers: jsonHeaders });
    const translations: string[] = [];
    for (const text of texts) {
      const response = await fetch(`${libreUrl.replace(/\/$/, "")}/translate`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ q: text, source, target, format: "text", ...(apiKey ? { api_key: apiKey } : {}) }) });
      if (!response.ok) throw new Error(`LibreTranslate HTTP ${response.status}`);
      const result = await response.json() as { translatedText?: unknown };
      translations.push(typeof result.translatedText === "string" ? result.translatedText : text);
    }
    return new Response(JSON.stringify({ translations, provider: "libretranslate" }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed", translations: [] }), { status: 502, headers: jsonHeaders });
  }
});
