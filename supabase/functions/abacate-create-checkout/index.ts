import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    const productId = Deno.env.get("ABACATEPAY_PRODUCT_10_CREDITS_ID");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) return json({ error: "Sessão inválida." }, 401);
    if (!apiKey || !productId) return json({ error: "Pagamento ainda não configurado no servidor." }, 503);
    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: auth } = await client.auth.getUser(authorization.slice(7));
    if (!auth.user) return json({ error: "Faça login para comprar créditos." }, 401);
    const origin = request.headers.get("origin") || "https://decidlyai.com";
    const externalId = `decidly-${auth.user.id}-${crypto.randomUUID()}`;
    const response = await fetch("https://api.abacatepay.com/v2/checkouts/create", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ items: [{ id: productId, quantity: 1 }], methods: ["PIX"], externalId, metadata: { userId: auth.user.id, credits: "10", package: "credits-10" }, returnUrl: `${origin}/credits/buy`, completionUrl: `${origin}/credits/buy?payment=completed` }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result?.success === false || !result?.data?.url) return json({ error: "Não foi possível criar o checkout AbacatePay.", details: result?.error || result?.message || `HTTP ${response.status}` }, 502);
    return json({ url: result.data.url, externalId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
