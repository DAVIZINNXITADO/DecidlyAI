import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });
const clean = (text: string) => text.replace(/\s*\[DONE\]\s*$/gi, "").trimEnd();
const base64ByteLength = (encoded: string): number | null => {
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded) || encoded.length % 4 !== 0) return null;
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;
  return (encoded.length / 4) * 3 - padding;
};

type Body = {
  message?: unknown;
  history?: unknown;
  language?: unknown;
  attachments?: unknown;
  stream?: boolean;
  mode?: unknown;
};
type Image = { mimeType: string; data: string };
type OpenAIPart = { type: "text" | "image_url"; text?: string; image_url?: { url: string } };
type HistoryMessage = { role: "user" | "assistant"; content: string };
type ModelPreference = "auto" | "gpt-4o" | "gpt-4o-mini";
type Tone = "balanced" | "direct" | "detailed";

function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value
    .map((part) => {
      if (typeof part === "string") return part;
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string")
        return (part as { text: string }).text;
      return "";
    })
    .join("");
}

function imagesFrom(value: unknown): Image[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const data = item as { name?: unknown; mimeType?: unknown; dataUrl?: unknown };
      const name = String(data.name || "arquivo");
      const mimeType = String(
        data.mimeType ||
          (name.toLowerCase().endsWith(".png")
            ? "image/png"
            : /\.jpe?g$/i.test(name)
              ? "image/jpeg"
              : name.toLowerCase().endsWith(".webp")
                ? "image/webp"
                : ""),
      );
      const dataUrl = typeof data.dataUrl === "string" ? data.dataUrl : "";
      const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/s);
      return mimeType.startsWith("image/") &&
        match &&
        match[1].startsWith("image/") &&
        base64ByteLength(match[2]) !== null &&
        base64ByteLength(match[2])! <= 4 * 1024 * 1024
        ? { mimeType: match[1], data: match[2] }
        : null;
    })
    .filter((item): item is Image => Boolean(item));
}

function toneInstruction(tone: Tone): string {
  if (tone === "direct")
    return "Prefira respostas diretas e concisas, preservando o contexto essencial e a honestidade.";
  if (tone === "detailed")
    return "Ofereça explicações mais detalhadas e bem organizadas, sem inventar dados nem repetir ideias.";
  return "Mantenha equilíbrio entre concisão e contexto útil.";
}

async function callGroq(
  apiKey: string,
  message: string,
  history: HistoryMessage[],
  images: Image[],
  language: string,
  tone: Tone,
) {
  const current: string | OpenAIPart[] = images.length
    ? [
        {
          type: "text",
          text: `Analise visualmente a imagem anexada e responda diretamente ao pedido em ${language}. Não responda apenas com o nome do arquivo.\n\n${message}`,
        },
        ...images.map((image) => ({
          type: "image_url" as const,
          image_url: { url: `data:${image.mimeType};base64,${image.data}` },
        })),
      ]
    : message;
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "qwen/qwen3.8-27b",
      messages: [
        {
          role: "system",
          content: `Você é o DecidlyAI VIP. Ajude com análise profunda, clareza e honestidade. Responda em ${language}, salvo se o usuário pedir explicitamente outro idioma. Quando houver imagem, interprete o conteúdo visual real e não invente detalhes. ${toneInstruction(tone)}`,
        },
        ...history,
        { role: "user", content: current },
      ],
      temperature: 0.7,
      max_completion_tokens: 4096,
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error("O provedor VIP principal está temporariamente indisponível.");
  const data = (await response.json()) as {
    choices?: { text?: unknown; message?: { content?: unknown; reasoning_content?: unknown } }[];
  };
  const choice = data.choices?.[0];
  const answer = clean(
    contentText(choice?.message?.content) ||
      contentText(choice?.message?.reasoning_content) ||
      contentText(choice?.text),
  );
  if (!answer) throw new Error("O modelo VIP não retornou uma resposta. Tente novamente.");
  return { answer, provider: "groq-qwen/qwen3.8-27b" };
}

async function callOpenAI(
  apiKey: string,
  message: string,
  history: HistoryMessage[],
  images: Image[],
  language: string,
  tone: Tone,
  preference: ModelPreference,
) {
  const models =
    preference === "gpt-4o"
      ? ["gpt-4o"]
      : preference === "gpt-4o-mini"
        ? ["gpt-4o-mini"]
        : ["gpt-4.1", "gpt-4o", "gpt-4o-mini"];
  const current: string | OpenAIPart[] = images.length
    ? [
        {
          type: "text",
          text: `Analise visualmente a imagem anexada e responda diretamente ao pedido em ${language}.\n\n${message}`,
        },
        ...images.map((image) => ({
          type: "image_url" as const,
          image_url: { url: `data:${image.mimeType};base64,${image.data}` },
        })),
      ]
    : message;
  let lastError = "";
  for (const model of models) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: `Você é o DecidlyAI VIP. Responda em ${language}, salvo se o usuário pedir outro idioma. Analise imagens visualmente quando existirem. ${toneInstruction(tone)}`,
          },
          ...history,
          { role: "user", content: current },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (response.ok) {
      const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
      const answer = clean(data.choices?.[0]?.message?.content || "");
      if (answer) return { answer, provider: `openai-${model}` };
    } else {
      lastError = `HTTP ${response.status}`;
      if (response.status === 401 || response.status === 403 || preference !== "auto") break;
    }
  }
  throw new Error(
    preference === "auto"
      ? `OpenAI indisponível (${lastError}).`
      : `O modelo selecionado (${preference}) está temporariamente indisponível.`,
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey)
      return json({ error: "Sessão ou configuração inválida." }, 401);

    const auth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
    });
    const { data: userData } = await auth.auth.getUser(authorization.slice(7));
    if (!userData.user) return json({ error: "Sessão inválida. Faça login novamente." }, 401);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await admin
      .from("profiles")
      .select("plan,developer_mode")
      .eq("id", userData.user.id)
      .maybeSingle();
    const plan = String(profile?.plan || "free").toLowerCase();
    if (plan !== "vip" && plan !== "premium" && plan !== "dev")
      return json({ error: "Este endpoint é exclusivo para usuários VIP." }, 403);

    const body = (await request.json()) as Body;
    if (body.mode !== undefined && body.mode !== "vip" && body.mode !== "free")
      return json({ error: "Comando DEV inválido." }, 400);
    if (plan === "dev" && body.mode !== "vip")
      return json({ error: "No plano DEV, use o comando /vip para acessar este modelo." }, 403);
    if (body.mode === "free" && plan !== "dev" && profile?.developer_mode !== true)
      return json({ error: "O comando /free é reservado ao modo DEV." }, 403);

    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (!message) return json({ error: "Envie uma mensagem válida." }, 400);
    const suppliedAttachments = Array.isArray(body.attachments) ? body.attachments : [];
    if (suppliedAttachments.length > 3)
      return json({ error: "Anexe no máximo 3 arquivos por mensagem." }, 413);
    if (
      suppliedAttachments.some(
        (item) =>
          item &&
          typeof item === "object" &&
          Number((item as { size?: unknown }).size || 0) > 4 * 1024 * 1024,
      )
    )
      return json({ error: "Cada anexo deve ter até 4 MB." }, 413);
    if (
      suppliedAttachments.some(
        (item) =>
          item &&
          typeof item === "object" &&
          typeof (item as { dataUrl?: unknown }).dataUrl === "string" &&
          ((): boolean => {
            const dataUrl = String((item as { dataUrl: string }).dataUrl);
            const match = dataUrl.match(/^data:[^;,]+;base64,([A-Za-z0-9+/]*={0,2})$/);
            return !match || base64ByteLength(match[1]) === null || base64ByteLength(match[1])! > 4 * 1024 * 1024;
          })(),
      )
    )
      return json({ error: "O conteúdo de um anexo excede o limite permitido." }, 413);

    const { data: creditRow, error: creditError } = await admin
      .from("ai_credits")
      .select(
        "free_credits,purchased_credits,total_credits,total_tokens_used,total_input_tokens,total_output_tokens",
      )
      .eq("user_id", userData.user.id)
      .maybeSingle();
    if (creditError) throw new Error("Não foi possível verificar seus créditos.");
    const available =
      creditRow?.total_credits !== null && creditRow?.total_credits !== undefined
        ? Number(creditRow.total_credits)
        : Number(creditRow?.free_credits || 0) + Number(creditRow?.purchased_credits || 0);
    if (available <= 0)
      return json(
        { error: "Você não possui créditos suficientes para usar o DecidlyAI VIP." },
        402,
      );

    const { data: savedPreferences } = await admin
      .from("user_preferences")
      .select("idioma_preferido,tom_da_ia,modelo_preferido")
      .eq("user_id", userData.user.id)
      .maybeSingle();
    const language =
      savedPreferences?.idioma_preferido === "en-US" ? "English (US)" : "Português do Brasil";
    const tone: Tone =
      savedPreferences?.tom_da_ia === "direct"
        ? "direct"
        : savedPreferences?.tom_da_ia === "detailed"
          ? "detailed"
          : "balanced";
    const modelPreference: ModelPreference =
      plan !== "dev" && savedPreferences?.modelo_preferido === "gpt-4o"
        ? "gpt-4o"
        : plan !== "dev" && savedPreferences?.modelo_preferido === "gpt-4o-mini"
          ? "gpt-4o-mini"
          : "auto";
    const images = imagesFrom(suppliedAttachments);
    const history: HistoryMessage[] = Array.isArray(body.history)
      ? body.history
          .filter(
            (item) =>
              item &&
              typeof item === "object" &&
              typeof (item as { content?: unknown }).content === "string",
          )
          .slice(-20)
          .map((item) => ({
            role:
              String((item as { role?: unknown }).role) === "assistant"
                ? ("assistant" as const)
                : ("user" as const),
            content: String((item as { content?: unknown }).content),
          }))
      : [];

    let result: { answer: string; provider: string };
    if (modelPreference !== "auto") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openAiKey)
        return json(
          { error: "O modelo avançado selecionado está temporariamente indisponível." },
          503,
        );
      result = await callOpenAI(
        openAiKey,
        message,
        history,
        images,
        language,
        tone,
        modelPreference,
      );
    } else {
      try {
        const groqKey = Deno.env.get("GROQ_API_KEY");
        if (!groqKey) throw new Error("Provedor principal indisponível.");
        result = await callGroq(groqKey, message, history, images, language, tone);
      } catch (groqError) {
        const openAiKey = Deno.env.get("OPENAI_API_KEY");
        if (!openAiKey) throw groqError;
        result = await callOpenAI(openAiKey, message, history, images, language, tone, "auto");
      }
    }

    const inputTokens = Math.max(1, Math.ceil(JSON.stringify({ ...body, history }).length / 4));
    const outputTokens = Math.max(1, Math.ceil(result.answer.length / 4));
    const used = (inputTokens + outputTokens) / 3000;
    const free = Number(creditRow?.free_credits || 0);
    const purchased = Number(creditRow?.purchased_credits || 0);
    const nextFree = Math.max(0, free - Math.min(free, used));
    const nextPurchased = Math.max(0, purchased - Math.max(0, used - free));
    const { error: updateError } = await admin
      .from("ai_credits")
      .update({
        free_credits: nextFree,
        purchased_credits: nextPurchased,
        total_credits: nextFree + nextPurchased,
        total_tokens_used: Number(creditRow?.total_tokens_used || 0) + inputTokens + outputTokens,
        total_input_tokens: Number(creditRow?.total_input_tokens || 0) + inputTokens,
        total_output_tokens: Number(creditRow?.total_output_tokens || 0) + outputTokens,
      })
      .eq("user_id", userData.user.id);
    if (updateError) throw new Error("Não foi possível atualizar o saldo dos créditos.");
    return json({ response: result.answer, provider: result.provider });
  } catch (error) {
    console.error("DecidlyAI VIP error", error instanceof Error ? error.message : "unexpected");
    return json({ error: error instanceof Error ? error.message : "Erro inesperado." }, 503);
  }
});
