import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const sseHeaders = { ...corsHeaders, "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: corsHeaders });
const event = (data: unknown, name?: string) => `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
const clean = (text: string) => text.replace(/\s*\[DONE\]\s*$/gi, "").trimEnd();

type Body = { message?: unknown; history?: unknown; language?: unknown; attachments?: unknown; stream?: boolean };
type Image = { mimeType: string; data: string };
type OpenAIPart = { type: "text" | "image_url"; text?: string; image_url?: { url: string } };

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map((part) => {
    if (typeof part === "string") return part;
    if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") return (part as { text: string }).text;
    return "";
  }).join("");
}

function imagesFrom(value: unknown): Image[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const data = item as { name?: unknown; mimeType?: unknown; dataUrl?: unknown };
    const name = String(data.name || "arquivo");
    const mimeType = String(data.mimeType || (name.toLowerCase().endsWith(".png") ? "image/png" : /\.jpe?g$/i.test(name) ? "image/jpeg" : name.toLowerCase().endsWith(".webp") ? "image/webp" : ""));
    const dataUrl = typeof data.dataUrl === "string" ? data.dataUrl : "";
    const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
    return mimeType.startsWith("image/") && match && dataUrl.length <= 6_000_000 ? { mimeType: match[1] || mimeType, data: match[2] } : null;
  }).filter((item): item is Image => Boolean(item)).slice(0, 3);
}

async function callGroq(apiKey: string, message: string, history: { role: "user" | "assistant"; content: string }[], images: Image[], language: string) {
  const current: string | OpenAIPart[] = images.length ? [{ type: "text", text: `Analise visualmente a imagem anexada e responda diretamente ao pedido em ${language}. Não responda apenas com o nome do arquivo.\n\n${message}` }, ...images.map((image) => ({ type: "image_url" as const, image_url: { url: `data:${image.mimeType};base64,${image.data}` } }))] : message;
  let lastError = "";
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "qwen/qwen3.8-27b", messages: [{ role: "system", content: `Você é o DecidlyAI VIP. Ajude com análise profunda, clareza e honestidade. Responda em ${language}. Quando houver imagem, interprete o conteúdo visual real e não invente detalhes.` }, ...history, { role: "user", content: current }], temperature: 0.7, max_completion_tokens: 4096 }),
    });
  if (response.ok) { const data = await response.json() as { choices?: { text?: unknown; message?: { content?: unknown; reasoning_content?: unknown } }[] }; const choice = data.choices?.[0]; const answer = clean(contentText(choice?.message?.content) || contentText(choice?.message?.reasoning_content) || contentText(choice?.text)); if (answer) return { answer, provider: "groq-qwen/qwen3.8-27b" }; }
  else lastError = (await response.text()).slice(0, 500);
  throw new Error(`Groq VIP indisponível: ${lastError}`);
}

async function callOpenAI(apiKey: string, message: string, history: { role: "user" | "assistant"; content: string }[], images: Image[], language: string) {
  const models = ["gpt-4.1", "gpt-4o", "gpt-4o-mini"];
  const current: string | OpenAIPart[] = images.length ? [{ type: "text", text: `Analise visualmente a imagem anexada e responda diretamente ao pedido em ${language}.\n\n${message}` }, ...images.map((image) => ({ type: "image_url" as const, image_url: { url: `data:${image.mimeType};base64,${image.data}` } }))] : message;
  let lastError = "";
  for (const model of models) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, messages: [{ role: "system", content: `Você é o DecidlyAI VIP. Responda em ${language}. Analise imagens visualmente quando existirem.` }, ...history, { role: "user", content: current }], temperature: 0.7, max_tokens: 4096 }) });
    if (response.ok) {
      const data = await response.json() as { choices?: { message?: { content?: string } }[] };
      const answer = clean(data.choices?.[0]?.message?.content || "");
      if (answer) return { answer, provider: `openai-${model}` };
    } else { lastError = (await response.text()).slice(0, 500); if (response.status === 401 || response.status === 403) break; }
  }
  throw new Error(`OpenAI indisponível: ${lastError}`);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey) return json({ error: "Sessão ou configuração inválida." }, 401);
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
    const { data: creditRow, error: creditError } = await admin.from("ai_credits").select("free_credits,purchased_credits,total_credits,total_tokens_used,total_input_tokens,total_output_tokens").eq("user_id", userData.user.id).maybeSingle();
    if (creditError) throw new Error("Não foi possível verificar seus créditos.");
    const available = Number(creditRow?.free_credits || 0) + Number(creditRow?.purchased_credits || 0) + Number(creditRow?.total_credits || 0);
    if (available <= 0) return json({ error: "Você não possui créditos suficientes para usar o DecidlyAI VIP." }, 402);
    const language = typeof body.language === "string" ? body.language : "pt-BR";
    const images = imagesFrom(body.attachments);
    const history = Array.isArray(body.history) ? body.history.filter((item) => item && typeof item === "object" && typeof (item as { content?: unknown }).content === "string").slice(-20).map((item) => ({ role: String((item as { role?: unknown }).role) === "assistant" ? "assistant" as const : "user" as const, content: String((item as { content?: unknown }).content) })) : [];
    let result: { answer: string; provider: string };
    try {
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (!groqKey) throw new Error("GROQ_API_KEY não configurada.");
      result = await callGroq(groqKey, message, history, images, language);
    } catch (groqError) {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiKey) throw groqError;
      result = await callOpenAI(openAiKey, message, history, images, language);
    }
    const inputTokens = Math.max(1, Math.ceil(JSON.stringify(body).length / 4));
    const outputTokens = Math.max(1, Math.ceil(result.answer.length / 4));
    const used = (inputTokens + outputTokens) / 3000;
    const free = Number(creditRow?.free_credits || 0);
    const purchased = Number(creditRow?.purchased_credits || 0);
    const nextFree = Math.max(0, free - Math.min(free, used));
    const nextPurchased = Math.max(0, purchased - Math.max(0, used - free));
    await admin.from("ai_credits").update({ free_credits: nextFree, purchased_credits: nextPurchased, total_credits: nextFree + nextPurchased, total_tokens_used: Number(creditRow?.total_tokens_used || 0) + inputTokens + outputTokens, total_input_tokens: Number(creditRow?.total_input_tokens || 0) + inputTokens, total_output_tokens: Number(creditRow?.total_output_tokens || 0) + outputTokens }).eq("user_id", userData.user.id);
    // O frontend legado do workspace já trata respostas JSON e o envelope
    // evita que um proxy SSE antigo transforme uma resposta válida em EMPTY_RESPONSE.
    return json({ response: result.answer, provider: result.provider });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 503);
  }
});
