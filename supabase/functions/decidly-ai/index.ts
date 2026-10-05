import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const event = (data: unknown, name?: string) => `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
const clean = (text: string) => text.replace(/\s*\[DONE\]\s*$/gi, "").trimEnd();

type Body = { message?: unknown; history?: unknown; language?: unknown; attachments?: unknown; stream?: boolean };
type Part = { type: "text" | "image_url"; text?: string; image_url?: { url: string } };

function attachments(value: unknown): Part[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const data = item as { name?: unknown; mimeType?: unknown; dataUrl?: unknown };
    const name = String(data.name || "arquivo");
    const mime = String(data.mimeType || (name.toLowerCase().endsWith(".png") ? "image/png" : /\.jpe?g$/i.test(name) ? "image/jpeg" : name.toLowerCase().endsWith(".webp") ? "image/webp" : ""));
    return mime.startsWith("image/") && typeof data.dataUrl === "string" && data.dataUrl.length <= 6_000_000
      ? { type: "image_url" as const, image_url: { url: data.dataUrl } }
      : null;
  }).filter((item): item is Part => Boolean(item)).slice(0, 3);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey) return json({ error: "Sessão ou configuração inválida." }, 401);
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada." }, 500);
    const auth = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: userData } = await auth.auth.getUser(authorization.slice(7));
    if (!userData.user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin.from("profiles").select("plan").eq("id", userData.user.id).maybeSingle();
    const plan = String(profile?.plan || "").toLowerCase();
    if (plan !== "vip" && plan !== "premium") return json({ error: "Este endpoint é exclusivo para usuários VIP." }, 403);
    const body = await request.json() as Body;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "Envie uma mensagem válida." }, 400);
    const { data: creditRow, error: creditError } = await admin.from("ai_credits").select("free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at,total_tokens_used,total_input_tokens,total_output_tokens,total_cost_usd").eq("user_id", userData.user.id).maybeSingle();
    if (creditError) throw new Error("Não foi possível verificar seus créditos.");
    const available = Number(creditRow?.free_credits ?? 0) + Number(creditRow?.purchased_credits ?? 0) + Number(creditRow?.total_credits ?? 0);
    if (available <= 0) return json({ error: "Você não possui créditos suficientes para usar o DecidlyAI VIP." }, 402);
    const imageParts = attachments(body.attachments);
    const lang = typeof body.language === "string" ? body.language : "pt-BR";
    const history = Array.isArray(body.history) ? body.history.filter((item) => item && typeof item === "object" && (item as { role?: unknown }).role !== "system" && typeof (item as { content?: unknown }).content === "string").slice(-20).map((item) => ({ role: String((item as { role?: unknown }).role) === "assistant" ? "assistant" : "user", content: String((item as { content?: unknown }).content) })) : [];
    const currentContent: string | Part[] = imageParts.length ? [{ type: "text", text: `Analise visualmente a imagem anexada e responda diretamente ao pedido do usuário em ${lang}. Não diga que recebeu apenas o nome do arquivo.\n\n${message}` }, ...imageParts] : message;
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-4o", messages: [{ role: "system", content: `Você é o DecidlyAI VIP. Ajude o usuário a tomar decisões com análise profunda, clareza e honestidade. Responda em ${lang}. Quando houver imagem, descreva e interprete o conteúdo visual real. Não invente o que não estiver visível.` }, ...history, { role: "user", content: currentContent }], temperature: 0.7, max_tokens: 4096 }) });
    if (!response.ok) return json({ error: `GPT-4 retornou HTTP ${response.status}.`, details: (await response.text()).slice(0, 1000) }, response.status);
    const data = await response.json() as { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } };
    const answer = clean(data.choices?.[0]?.message?.content || "");
    if (!answer) return json({ error: "GPT-4 retornou uma resposta vazia." }, 502);
    const inputTokens = Number(data.usage?.prompt_tokens || Math.ceil(JSON.stringify(body).length / 4));
    const outputTokens = Number(data.usage?.completion_tokens || Math.ceil(answer.length / 4));
    const used = (inputTokens + outputTokens) / 3000;
    const free = Number(creditRow?.free_credits || 0);
    const purchased = Number(creditRow?.purchased_credits || 0);
    const nextFree = Math.max(0, free - Math.min(free, used));
    const nextPurchased = Math.max(0, purchased - Math.max(0, used - free));
    await admin.from("ai_credits").update({ free_credits: nextFree, purchased_credits: nextPurchased, total_credits: nextFree + nextPurchased, total_tokens_used: Number(creditRow?.total_tokens_used || 0) + inputTokens + outputTokens, total_input_tokens: Number(creditRow?.total_input_tokens || 0) + inputTokens, total_output_tokens: Number(creditRow?.total_output_tokens || 0) + outputTokens }).eq("user_id", userData.user.id);
    if (body.stream === false) return json({ response: answer, provider: "openai-gpt-4o" });
    return new Response(event({ delta: answer, accumulated: answer, provider: "openai-gpt-4o" }) + event({ response: answer, complete: true, provider: "openai-gpt-4o" }, "complete") + event("[DONE]"), { headers: sseHeaders });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 500);
  }
});
