import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" };
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const event = (data: unknown, name?: string) => `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
const estimateTokens = (text: string) => Math.max(1, Math.ceil(text.length / 4));
const cleanDoneMarker = (text: string) => text.replace(/\s*\[DONE\]\s*$/gi, "").trimEnd();

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: jsonHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey) return new Response(JSON.stringify({ error: "Sessão ou configuração inválida." }), { status: 401, headers: jsonHeaders });

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData } = await authClient.auth.getUser(authorization.replace("Bearer ", ""));
    if (!userData.user) return new Response(JSON.stringify({ error: "Sessão inválida. Faça login novamente." }), { status: 401, headers: jsonHeaders });

    const admin = createClient(supabaseUrl, serviceKey);
    const body = await request.json() as { message?: unknown; history?: unknown };
    if (typeof body.message !== "string" || !body.message.trim()) return new Response(JSON.stringify({ error: "Envie uma mensagem válida." }), { status: 400, headers: jsonHeaders });

    const { data: creditRow, error: creditError } = await admin.from("ai_credits").select("free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at,total_tokens_used,total_input_tokens,total_output_tokens,total_cost_usd").eq("user_id", userData.user.id).maybeSingle();
    if (creditError) throw new Error("Não foi possível verificar seus créditos.");
    const plan = String((await admin.from("profiles").select("plan").eq("id", userData.user.id).maybeSingle()).data?.plan ?? "free").toLowerCase();
    const planLimit = plan === "premium" ? 999999999 : plan === "vip" ? 100 : 10;
    const resetNeeded = !creditRow?.daily_credits_reset_at || String(creditRow.daily_credits_reset_at) < new Date().toISOString().slice(0, 10);
    const dailyUsed = resetNeeded ? 0 : Number(creditRow?.daily_credits_used ?? 0);
    const dailyLimit = planLimit;
    const freeCredits = Number(creditRow?.free_credits ?? creditRow?.total_credits ?? 0);
    const purchasedCredits = Number(creditRow?.purchased_credits ?? 0);
    const credits = Math.max(0, dailyLimit - dailyUsed) + freeCredits + purchasedCredits;
    if (credits <= 0) return new Response(JSON.stringify({ error: "Você não possui créditos suficientes para usar o DecidlyAI." }), { status: 402, headers: jsonHeaders });

    const upstream = await fetch(`${supabaseUrl}/functions/v1/free-ai-router`, {
      method: "POST",
      headers: { Authorization: authorization, apikey: anonKey, "Content-Type": "application/json", Accept: "text/event-stream" },
      body: JSON.stringify({ message: body.message.trim(), history: Array.isArray(body.history) ? body.history.slice(-20) : [], stream: true }),
    });
    if (!upstream.ok || !upstream.body) return new Response(await upstream.text(), { status: upstream.status || 502, headers: jsonHeaders });

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";
    let fullText = "";
    let provider = "unknown";
    let streamError = "";
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: unknown, name?: string) => controller.enqueue(encoder.encode(event(data, name)));
        const consume = (block: string) => {
          const raw = block.replaceAll("\r\n", "\n").split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
          if (!raw || raw === "[DONE]") return;
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>;
            if (typeof parsed.error === "string") {
              streamError = parsed.details ? `${parsed.error} — ${String(parsed.details)}` : parsed.error;
              return;
            }
            if (typeof parsed.provider === "string") provider = parsed.provider;
            if (parsed.complete === true) {
              if (typeof parsed.response === "string" && !fullText) {
                fullText = cleanDoneMarker(parsed.response);
                send({ delta: fullText, accumulated: fullText, provider });
              }
              return;
            }
            if (typeof parsed.delta === "string") { fullText = cleanDoneMarker(fullText + parsed.delta); send({ delta: cleanDoneMarker(parsed.delta), accumulated: fullText, provider }); }
          } catch (error) { if (error instanceof Error && error.message) send({ error: error.message }, "error"); }
        };
        try {
          while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); const blocks = buffer.split("\n\n"); buffer = blocks.pop() ?? ""; for (const block of blocks) consume(block); }
          buffer += decoder.decode(); if (buffer.trim()) consume(buffer);
          if (streamError) { send({ error: streamError, provider }, "error"); controller.close(); return; }
          if (!fullText.trim()) { send({ error: `${provider} não retornou conteúdo.` }, "error"); controller.close(); return; }
          const inputTokens = estimateTokens(`${JSON.stringify(body.history ?? [])}\n${body.message}`);
          const outputTokens = estimateTokens(fullText);
          const totalTokens = inputTokens + outputTokens;
          const used = totalTokens / 3000;
          const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);
          const dailyUsedNow = Math.min(dailyRemaining, used);
          const freeUsed = Math.min(freeCredits, Math.max(0, used - dailyUsedNow));
          const purchasedUsed = Math.max(0, used - dailyUsedNow - freeUsed);
          const nextFree = Math.max(0, freeCredits - freeUsed);
          const nextPurchased = Math.max(0, purchasedCredits - purchasedUsed);
          const remaining = nextFree + nextPurchased;
          await admin.from("ai_credits").update({ free_credits: nextFree, purchased_credits: nextPurchased, total_credits: remaining, daily_credits_used: dailyUsed + dailyUsedNow, daily_credits_limit: dailyLimit, daily_credits_reset_at: new Date().toISOString().slice(0, 10), total_tokens_used: Number(creditRow?.total_tokens_used ?? 0) + totalTokens, total_input_tokens: Number(creditRow?.total_input_tokens ?? 0) + inputTokens, total_output_tokens: Number(creditRow?.total_output_tokens ?? 0) + outputTokens }).eq("user_id", userData.user.id);
          await admin.from("ai_usage").insert({ user_id: userData.user.id, model: provider, input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, credits_used: used });
          await admin.from("credit_events").insert({ user_id: userData.user.id, event_type: "usage", amount: -used, balance_type: dailyUsedNow > 0 || freeUsed > 0 ? "free" : "purchased", description: `Uso da IA via ${provider}` });
          await admin.rpc("qualify_referral_for_user", { target_user: userData.user.id });
          send({ response: fullText, complete: true, provider, credits: { daily_used: dailyUsed + dailyUsedNow, daily_limit: dailyLimit, free_credits: nextFree, purchased_credits: nextPurchased, total_credits: remaining } }, "complete");
          send("[DONE]");
          controller.close();
        } catch (error) { send({ error: error instanceof Error ? error.message : "Erro no streaming." }, "error"); controller.close(); }
        finally { reader.releaseLock(); }
      },
    });
    return new Response(stream, { headers: sseHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado." }), { status: 500, headers: jsonHeaders });
  }
});
