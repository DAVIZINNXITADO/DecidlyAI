const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "@cf/meta/llama-3.1-8b-instruct";
const MAX_HISTORY_MESSAGES = 12;
const MAX_OUTPUT_TOKENS = 800;

const DECIDLYAI_CORE = `
Você é o DecidlyAI.

Seu principal objetivo é ajudar o usuário a tomar decisões. Responda com clareza; seja breve em perguntas simples, sem reduzir pedidos explícitos de conteúdo completo a resumos.

Sempre que o usuário apresentar uma escolha, dúvida,
comparação, problema ou indecisão, ajude-o a analisar
as opções e dê uma recomendação clara quando possível.

Considere quando relevante:

- opções disponíveis;
- vantagens;
- desvantagens;
- riscos;
- consequências;
- prioridades do usuário.

Não transforme perguntas simples em análises
desnecessárias.

Quando a pessoa pedir uma obra textual completa (por exemplo, fábula, conto, redação ou carta), escreva a obra com começo, desenvolvimento e conclusão, em vez de apenas repetir, rotular ou resumir o pedido. Para uma fábula, inclua personagens, conflito, desfecho e moral. Respeite a extensão explícita solicitada.

Fale de forma amigável, natural e objetiva.
`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RequestBody = {
  message?: unknown;
  history?: unknown;
  language?: unknown;
  tone?: unknown;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return json({ error: "Método não permitido." }, 405);
  }

  try {
    const accountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");
    const apiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");

    if (!accountId || !apiToken) {
      throw new Error("Configuração da Cloudflare não encontrada.");
    }

    const body = (await request.json()) as RequestBody;
    if (typeof body.message !== "string" || !body.message.trim()) {
      return json({ error: "Envie uma mensagem válida." }, 400);
    }

    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history
          .filter((item): item is ChatMessage => {
            if (!item || typeof item !== "object") return false;
            const candidate = item as Partial<ChatMessage>;
            return (
              (candidate.role === "user" || candidate.role === "assistant") &&
              typeof candidate.content === "string" &&
              candidate.content.trim().length > 0
            );
          })
          .slice(-MAX_HISTORY_MESSAGES)
          .map((item) => ({
            role: item.role,
            content: item.content.trim(),
          }))
      : [];

    const language = body.language === "en-US" ? "English (US)" : "Português do Brasil";
    const toneInstruction = body.tone === "direct"
      ? "Prefira respostas diretas e concisas, preservando o contexto essencial."
      : body.tone === "detailed"
        ? "Ofereça explicações detalhadas e organizadas, sem inventar dados nem ser redundante."
        : "Mantenha equilíbrio entre concisão e contexto útil.";
    const messages = [
      { role: "system", content: `${DECIDLYAI_CORE}\nResponda em ${language}, salvo se o usuário pedir outro idioma. ${toneInstruction}` },
      ...history,
      { role: "user", content: body.message.trim() },
    ];

    const cloudflareUrl =
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${MODEL}`;
    const cloudflareResponse = await fetch(cloudflareUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, max_tokens: MAX_OUTPUT_TOKENS }),
    });

    const responseText = await cloudflareResponse.text();
    if (!cloudflareResponse.ok) {
      console.error("Erro Cloudflare:", responseText);
      return json(
        {
          error: "Cloudflare indisponível.",
          details: responseText,
        },
        cloudflareResponse.status,
      );
    }

    const cloudflareData = JSON.parse(responseText);
    const aiResponse = cloudflareData?.result?.response;
    if (typeof aiResponse !== "string" || !aiResponse.trim()) {
      console.error("Resposta Cloudflare inválida.");
      throw new Error("Cloudflare retornou uma resposta vazia.");
    }

    return json({
      response: aiResponse.trim(),
      provider: "cloudflare",
      model: MODEL,
    });
  } catch (error) {
    console.error("Erro no cloudflare-free:", error);
    return json(
      {
        error:
          error instanceof Error ? error.message : "Erro inesperado.",
      },
      500,
    );
  }
});
