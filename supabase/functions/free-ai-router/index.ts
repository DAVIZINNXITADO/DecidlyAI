const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ProviderResult = { response: Response; provider: string };

type Body = { message?: unknown; history?: unknown; stream?: boolean };

const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

const event = (data: unknown, name?: string) =>
  `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;

function responseText(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  const value = data as Record<string, unknown>;
  if (typeof value.response === "string") return value.response;
  if (typeof value.answer === "string") return value.answer;
  if (typeof value.content === "string") return value.content;
  const choices = Array.isArray(value.choices) ? value.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const message = choice?.message as Record<string, unknown> | undefined;
  return typeof message?.content === "string" ? message.content : "";
}

async function toSse(providerResponse: Response, provider: string): Promise<Response> {
  const contentType = providerResponse.headers.get("content-type")?.toLowerCase() ?? "";
  const encoder = new TextEncoder();

  if (!contentType.includes("text/event-stream") || !providerResponse.body) {
    const raw = await providerResponse.text();
    let parsed: unknown = raw;
    try { parsed = JSON.parse(raw); } catch { /* plain text */ }
    const complete = responseText(parsed).trim();
    if (!complete) return new Response(event({ error: `${provider} retornou resposta vazia.` }, "error"), { status: 502, headers: sseHeaders });
    return new Response(
      event({ delta: complete, accumulated: complete, provider }) +
        event({ response: complete, complete: true, provider }, "complete") +
        event("[DONE]"),
      { headers: sseHeaders },
    );
  }

  const reader = providerResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";
  const stream = new ReadableStream({
    async start(controller) {
      const send = (value: unknown, name?: string) => controller.enqueue(encoder.encode(event(value, name)));
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          for (const block of blocks) {
            for (const line of block.replaceAll("\r\n", "\n").split("\n")) {
              if (!line.startsWith("data:")) continue;
              const raw = line.slice(5).trim();
              if (!raw || raw === "[DONE]") continue;
              try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                if (parsed.complete === true) continue;
                const delta = responseText(parsed) || responseText((parsed.choices?.[0] as Record<string, unknown> | undefined)?.delta);
                if (delta) { fullText += delta; send({ delta, accumulated: fullText, provider }); }
              } catch { /* aguarda o próximo bloco */ }
            }
          }
        }
        send({ response: fullText, complete: true, provider }, "complete");
        send("[DONE]");
        controller.close();
      } catch (error) {
        send({ error: error instanceof Error ? error.message : "Erro no fallback." }, "error");
        controller.close();
      } finally { reader.releaseLock(); }
    },
  });
  return new Response(stream, { headers: sseHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: jsonHeaders });

  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization?.startsWith("Bearer ")) return new Response(JSON.stringify({ error: "Você precisa estar autenticado." }), { status: 401, headers: jsonHeaders });

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) throw new Error("Configuração do Supabase não encontrada.");

    const body = (await request.json()) as Body;
    if (typeof body.message !== "string" || !body.message.trim()) return new Response(JSON.stringify({ error: "Envie uma mensagem válida." }), { status: 400, headers: jsonHeaders });

    const payload = JSON.stringify({ message: body.message.trim(), history: Array.isArray(body.history) ? body.history.slice(-20) : [], stream: body.stream !== false });
    const providers = ["gemini-free", "groq-free", "cloudflare-free"];
    let lastError = "";

    for (const provider of providers) {
      try {
        const result: ProviderResult = {
          provider,
          response: await fetch(`${supabaseUrl}/functions/v1/${provider}`, {
            method: "POST",
            headers: { Authorization: authorization, apikey: anonKey, "Content-Type": "application/json", Accept: "text/event-stream, application/json" },
            body: payload,
          }),
        };
        if (result.response.ok) return await toSse(result.response, provider);
        lastError = `${provider}: HTTP ${result.response.status}`;
      } catch (error) {
        lastError = `${provider}: ${error instanceof Error ? error.message : "falha"}`;
      }
    }

    return new Response(JSON.stringify({ error: "Nenhum provedor de IA está disponível.", details: lastError }), { status: 503, headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado." }), { status: 500, headers: jsonHeaders });
  }
});
