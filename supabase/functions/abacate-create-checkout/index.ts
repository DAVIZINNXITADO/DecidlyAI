import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error: "Use POST para criar o checkout." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) return json({ success: false, error: "Sessão inválida." }, 401);
    if (!apiKey) return json({ success: false, error: "Secret ABACATEPAY_API_KEY não configurado." }, 500);
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: auth } = await client.auth.getUser(authorization.slice(7));
    if (!auth.user) return json({ success: false, error: "Faça login para comprar créditos." }, 401);
    const body = await request.json().catch(() => null) as Record<string, unknown> | null;
    if (!body || !Array.isArray(body.items) || body.items.length === 0 || !Array.isArray(body.methods) || body.methods.length === 0) return json({ success: false, error: "Payload inválido: informe items e methods." }, 400);
    const externalId = `decidly-${auth.user.id}-${crypto.randomUUID()}`;
    const providerBody = { ...body, externalId, metadata: { userId: auth.user.id, credits: "10", package: "credits-10" } };
    const upstream = await fetch("https://api.abacatepay.com/v2/checkouts/create", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(providerBody), signal: AbortSignal.timeout(25000) });
    const raw = await upstream.text();
    const provider = (() => { try { return JSON.parse(raw) as Record<string, unknown>; } catch { return {}; } })();
    const data = provider.data as Record<string, unknown> | undefined;
    const checkoutUrl = typeof data?.url === "string" ? data.url : typeof provider.checkoutUrl === "string" ? provider.checkoutUrl : null;
    if (!upstream.ok || provider.success === false || !checkoutUrl) {
      const providerError = typeof provider.error === "string" ? provider.error : typeof provider.message === "string" ? provider.message : raw.slice(0, 500);
      console.error("AbacatePay checkout rejected", { status: upstream.status, message: providerError });
      return json({ success: false, error: providerError || `AbacatePay HTTP ${upstream.status}`, upstreamStatus: upstream.status }, 200);
    }
    return json({ success: true, checkoutUrl, url: checkoutUrl, externalId });
  } catch (error) {
    console.error("AbacatePay checkout exception", error instanceof Error ? error.message : String(error));
    return json({ success: false, error: error instanceof Error ? error.message : "Erro inesperado." }, 200);
  }
});
