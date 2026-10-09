import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey)
      return json({ error: "Entre na sua conta para continuar." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData } = await authClient.auth.getUser(authorization.slice(7));
    if (!authData.user) return json({ error: "Sua sessão expirou. Entre novamente." }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: access } = await admin
      .from("analytics_admins")
      .select("user_id")
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (!access) return json({ error: "Esta área é restrita ao administrador do DecidlyAI." }, 403);

    const body = (await request.json().catch(() => ({}))) as { days?: unknown };
    const requestedDays = Number(body.days);
    const days = requestedDays === 7 || requestedDays === 90 ? requestedDays : 30;
    const dateParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Sao_Paulo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: string) => dateParts.find((item) => item.type === type)?.value ?? "0";
    const localToday = new Date(
      Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day"))),
    );
    localToday.setUTCDate(localToday.getUTCDate() - (days - 1));
    const since = `${localToday.getUTCFullYear()}-${String(localToday.getUTCMonth() + 1).padStart(2, "0")}-${String(localToday.getUTCDate()).padStart(2, "0")}`;
    const { data, error } = await admin.rpc("get_site_analytics_period", { p_since: since });
    if (error) return json({ error: "Não foi possível carregar o painel de métricas." }, 503);

    const summary = data as { events?: unknown; daily?: unknown } | null;
    return json({
      days,
      events: Array.isArray(summary?.events) ? summary.events : [],
      daily: Array.isArray(summary?.daily) ? summary.daily : [],
    });
  } catch {
    return json({ error: "Não foi possível carregar o painel de métricas." }, 503);
  }
});
