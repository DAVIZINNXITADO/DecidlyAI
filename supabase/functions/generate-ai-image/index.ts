import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const disabledResponse = {
  error: "A geração de imagens por IA está temporariamente suspensa por segurança. Nenhum crédito foi usado. Você ainda pode usar Imagem de texto.",
  code: "image_generation_temporarily_disabled",
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return Response.json({ error: "Método não permitido." }, { status: 405, headers: jsonHeaders });
  }

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey) {
      return Response.json({ error: "Você precisa estar autenticado." }, { status: 401, headers: jsonHeaders });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData } = await authClient.auth.getUser(authorization.slice("Bearer ".length));
    if (!userData.user) {
      return Response.json({ error: "Sessão inválida. Faça login novamente." }, { status: 401, headers: jsonHeaders });
    }

    // Fail closed: while paused, do not call a generator, reserve credits, or upload an artifact.
    return Response.json(disabledResponse, { status: 503, headers: jsonHeaders });
  } catch {
    return Response.json({ error: "Não foi possível validar a sessão." }, { status: 500, headers: jsonHeaders });
  }
});
