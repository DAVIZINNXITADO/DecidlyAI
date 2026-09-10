const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type RequestBody = {
  message?: string;
  history?: ChatMessage[];
  stream?: boolean;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });

const sseHeaders = {
  ...corsHeaders,
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  Connection: "keep-alive",
};

function cleanHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter(
      (item): item is ChatMessage =>
        Boolean(item) &&
        typeof item === "object" &&
        ["user", "assistant", "system"].includes(String((item as ChatMessage).role)) &&
        typeof (item as ChatMessage).content === "string",
    )
    .slice(-20)
    .map((item) => ({
      role: item.role,
      content: item.content.slice(0, 12000),
    }));
}

function extractDelta(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const delta = choice?.delta as Record<string, unknown> | undefined;

  return typeof delta?.content === "string" ? delta.content : "";
}

function extractComplete(payload: Record<string, unknown>): string {
  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const choice = choices[0] as Record<string, unknown> | undefined;
  const message = choice?.message as Record<string, unknown> | undefined;

  if (typeof message?.content === "string") return message.content;
  if (typeof payload.response === "string") return payload.response;
  if (typeof payload.answer === "string") return payload.answer;
  return "";
}

function event(data: unknown, name?: string): string {
  return `${name ? `event: ${name}\n` : ""}data: ${JSON.stringify(data)}\n\n`;
}

async function readCompleteResponse(response: Response): Promise<string> {
  const data = (await response.json()) as Record<string, unknown>;
  return extractComplete(data).trim();
}

async function streamGroq(response: Response): Promise<Response> {
  if (!response.body) {
    const complete = await readCompleteResponse(response);
    return new Response(
      event({ delta: complete, response: complete }, "complete") + event("[DONE]"),
      { headers: sseHeaders },
    );
  }

  const upstream = response.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  let fullText = "";

  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown, name?: string) =>
        controller.enqueue(encoder.encode(event(payload, name)));

      try {
        while (true) {
          const { value, done } = await upstream.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;

            const raw = line.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;

            try {
              const payload = JSON.parse(raw) as Record<string, unknown>;
              const delta = extractDelta(payload);
              if (!delta) continue;

              fullText += delta;
              send({ delta, accumulated: fullText });
            } catch {
              // Ignore incomplete upstream SSE fragments.
            }
          }
        }

        const trailingLines = buffer.split("\n");
        for (const line of trailingLines) {
          if (!line.startsWith("data:")) continue;
          const raw = line.slice(5).trim();
          if (!raw || raw === "[DONE]") continue;

          try {
            const payload = JSON.parse(raw) as Record<string, unknown>;
            const delta = extractDelta(payload);
            if (delta) {
              fullText += delta;
              send({ delta, accumulated: fullText });
            }
          } catch {
            // Ignore a truncated final fragment.
          }
        }

        send({ response: fullText, complete: true }, "complete");
        send("[DONE]");
        controller.close();
      } catch (error) {
        send({ error: error instanceof Error ? error.message : "Erro no streaming" }, "error");
        controller.close();
      } finally {
        upstream.releaseLock();
      }
    },
  });

  return new Response(stream, { headers: sseHeaders });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const body = (await request.json()) as RequestBody;
    const message = body.message?.trim();

    if (!message) {
      return json({ error: "A mensagem é obrigatória." }, 400);
    }

    const apiKey = Deno.env.get("GROQ_API_KEY");
    if (!apiKey) {
      return json({ error: "GROQ_API_KEY não configurada." }, 500);
    }

    const model = Deno.env.get("GROQ_MODEL") || "openai/gpt-oss-120b";
    const wantsStream = body.stream !== false;
    const history = cleanHistory(body.history);

    const messages: ChatMessage[] = [
      {
        role: "system",
        content:
          "Você é o assistente do DecidlyAI. Ajude o usuário a organizar decisões com clareza, apresente possibilidades, riscos e próximos passos. Responda em português do Brasil quando o usuário escrever em português. Seja útil, honesto e não invente informações.",
      },
      ...history,
      { role: "user", content: message },
    ];

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 4096,
        stream: wantsStream,
      }),
    });

    if (!groqResponse.ok) {
      const details = await groqResponse.text().catch(() => "");
      return json(
        {
          error: `Groq retornou HTTP ${groqResponse.status}.`,
          details: details.slice(0, 1000),
        },
        groqResponse.status,
      );
    }

    if (!wantsStream) {
      const response = await groqResponse.json();
      const complete = extractComplete(response as Record<string, unknown>);
      return json({ response: complete, answer: complete });
    }

    return await streamGroq(groqResponse);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Erro inesperado.",
      },
      500,
    );
  }
});
