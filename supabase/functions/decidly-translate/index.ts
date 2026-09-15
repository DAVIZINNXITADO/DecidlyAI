import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: jsonHeaders });
  try {
    const apiKey = Deno.env.get("DEEPL_API_KEY");
    if (!apiKey) return new Response(JSON.stringify({ error: "DEEPL_NOT_CONFIGURED", translations: [] }), { status: 503, headers: jsonHeaders });
    const body = await request.json() as { texts?: unknown; source?: unknown; target?: unknown };
    const texts = Array.isArray(body.texts) ? body.texts.filter((text): text is string => typeof text === "string" && text.trim()).map((text) => text.slice(0, 500)).slice(0, 100) : [];
    const source = typeof body.source === "string" ? body.source : "pt";
    const target = typeof body.target === "string" ? body.target : "en";
    if (!texts.length || !["pt", "en"].includes(source) || !["pt", "en"].includes(target)) return new Response(JSON.stringify({ error: "Invalid translation request" }), { status: 400, headers: jsonHeaders });
    if (source === target) return new Response(JSON.stringify({ translations: texts, provider: "deepl" }), { headers: jsonHeaders });
    const form = new URLSearchParams();
    texts.forEach((text) => form.append("text", text));
    form.set("source_lang", "PT");
    form.set("target_lang", "EN-US");
    form.set("preserve_formatting", "1");
    const response = await fetch("https://api-free.deepl.com/v2/translate", { method: "POST", headers: { Authorization: `DeepL-Auth-Key ${apiKey}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() });
    if (!response.ok) throw new Error(`DeepL HTTP ${response.status}`);
    const result = await response.json() as { translations?: Array<{ text?: unknown }> };
    const translations = texts.map((text, index) => typeof result.translations?.[index]?.text === "string" ? result.translations[index].text as string : text);
    return new Response(JSON.stringify({ translations, provider: "deepl" }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Translation failed", translations: [] }), { status: 502, headers: jsonHeaders });
  }
});
