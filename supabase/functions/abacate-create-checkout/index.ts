import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const SITE_URL = "https://decidlyai.lovable.app";
const PRODUCT_ID = "prod_Sy00DekE56ayMWQcQSJFL632";
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ success: false, error: "Use POST para criar o checkout." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
      return json({ success: false, error: "Sua sessão expirou. Entre novamente para comprar créditos." }, 401);
    }
    if (!apiKey) {
      console.error("AbacatePay checkout configuration missing", { secretName: "ABACATEPAY_API_KEY" });
      return json({ success: false, error: "O pagamento está temporariamente indisponível. Tente novamente mais tarde." }, 503);
    }

    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: auth, error: authError } = await client.auth.getUser(authorization.slice(7));
    if (authError || !auth.user) {
      return json({ success: false, error: "Faça login para comprar créditos." }, 401);
    }

    const externalId = `decidly-${crypto.randomUUID()}`;
    const returnUrl = new URL(`${SITE_URL}/credits/buy`);
    returnUrl.searchParams.set("payment", "pending");
    returnUrl.searchParams.set("payment_ref", externalId);
    const completionUrl = new URL(`${SITE_URL}/credits/buy`);
    completionUrl.searchParams.set("payment", "success");
    completionUrl.searchParams.set("payment_ref", externalId);
    const providerBody = {
      items: [{ id: PRODUCT_ID, quantity: 1 }],
      methods: ["PIX"],
      externalId,
      returnUrl: returnUrl.toString(),
      completionUrl: completionUrl.toString(),
      metadata: { userId: auth.user.id, credits: "10", package: "credits-10" },
    };
    const upstream = await fetch("https://api.abacatepay.com/v2/checkouts/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(providerBody),
      signal: AbortSignal.timeout(25000),
    });
    const raw = await upstream.text();
    let provider: Record<string, unknown> = {};
    try {
      provider = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // Uma resposta não JSON do provedor é tratada como falha transitória.
    }
    const data = provider.data && typeof provider.data === "object"
      ? provider.data as Record<string, unknown>
      : {};
    const checkoutUrl = typeof data.url === "string"
      ? data.url
      : typeof provider.checkoutUrl === "string"
        ? provider.checkoutUrl
        : null;
    let hostedUrl = false;
    try {
      hostedUrl = Boolean(checkoutUrl && new URL(checkoutUrl).protocol === "https:" && new URL(checkoutUrl).hostname === "app.abacatepay.com");
    } catch {
      hostedUrl = false;
    }

    if (!upstream.ok || provider.success === false || !hostedUrl) {
      const providerCode = typeof provider.code === "string" ? provider.code.slice(0, 80) : undefined;
      console.error("AbacatePay checkout rejected", { status: upstream.status, providerCode });
      return json({
        success: false,
        error: "Não foi possível iniciar o checkout Pix agora. Verifique sua conexão e tente novamente.",
      }, 502);
    }

    return json({ success: true, checkoutUrl, url: checkoutUrl, externalId });
  } catch (error) {
    console.error("AbacatePay checkout exception", {
      name: error instanceof Error ? error.name : "unknown",
    });
    return json({
      success: false,
      error: "Não foi possível iniciar o checkout Pix agora. Tente novamente em instantes.",
    }, 502);
  }
});
