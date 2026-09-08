import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/ai-test")({
  component: AiTest,
});

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Subscription = {
  plan: string | null;
  status: string | null;
  expires_at: string | null;
};

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
): string {
  const message = (backendMessage || "").toLowerCase();

  // Créditos insuficientes.
  if (
    status === 402 ||
    message.includes("crédito") ||
    message.includes("credit")
  ) {
    return "Desculpe pelo inconveniente, mas no momento você não possui créditos disponíveis para continuar usando a DecidlyAI. Pedimos desculpas pelo transtorno. Quando houver créditos disponíveis novamente, tente enviar sua mensagem outra vez.";
  }

  // Limite de requisições / rate limit.
  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite de requisições")
  ) {
    return "Opa, nosso serviço atingiu temporariamente o limite de requisições para esta IA. Pedimos desculpas pelo inconveniente e agradecemos pela sua paciência. Por favor, tente novamente mais tarde.";
  }

  // Problemas de autenticação.
  if (
    status === 401 ||
    status === 403 ||
    message.includes("authentication") ||
    message.includes("unauthorized")
  ) {
    return "Desculpe pelo inconveniente. No momento não consegui confirmar sua sessão corretamente. Por favor, tente entrar novamente e depois envie sua mensagem mais uma vez.";
  }

  // Servidor temporariamente indisponível.
  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return "Desculpe pelo inconveniente. Estou enfrentando uma dificuldade temporária no nosso serviço e não consegui processar sua mensagem agora. Por favor, tente novamente mais tarde.";
  }

  // Timeout.
  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("tempo limite")
  ) {
    return "Desculpe pelo inconveniente. Demorei mais do que o esperado para processar sua mensagem e não consegui concluir a resposta desta vez. Por favor, tente novamente mais tarde.";
  }

  // Problemas de conexão.
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("conectar")
  ) {
    return "Desculpe pelo inconveniente. No momento estou com uma dificuldade temporária para me conectar ao nosso serviço. Por favor, tente novamente mais tarde.";
  }

  // Erro desconhecido.
  return "Desculpe pelo inconveniente. Ocorreu uma dificuldade temporária enquanto eu processava sua mensagem. Nossa equipe ou sistemas podem estar passando por uma instabilidade momentânea. Por favor, tente novamente mais tarde.";
}

function AiTest() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoading, setIsLoading] = useState(false);

  const [modelLabel, setModelLabel] = useState<
    "Free" | "VIP" | null
  >(null);

  async function getAiFunction() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw {
        status: 401,
        message: "Usuário não autenticado",
      };
    }

    const {
      data: subscription,
      error: subscriptionError,
    } = await supabase
      .from("subscription")
      .select(`
        plan,
        status,
        expires_at
      `)
      .eq("user_id", user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle<Subscription>();

    if (subscriptionError) {
      console.error(
        "Erro ao buscar assinatura:",
        subscriptionError,
      );

      setModelLabel("Free");

      return "decidly-ai-free";
    }

    const now = new Date();

    const plan = subscription?.plan
      ?.trim()
      .toLowerCase();

    const status = subscription?.status
      ?.trim()
      .toLowerCase();

    const expiresAt = subscription?.expires_at
      ? new Date(subscription.expires_at)
      : null;

    const hasExpired =
      expiresAt !== null &&
      expiresAt.getTime() < now.getTime();

    const isVip =
      plan === "vip" &&
      (status === "active" ||
        status === "ativo") &&
      !hasExpired;

    if (isVip) {
      setModelLabel("VIP");

      return "decidly-ai";
    }

    setModelLabel("Free");

    return "decidly-ai-free";
  }

  async function sendMessage() {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || isLoading) {
      return;
    }

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: trimmedMessage,
      },
    ];

    setMessages(updatedMessages);

    setMessage("");

    setIsLoading(true);

    try {
      const functionName =
        await getAiFunction();

      const history =
        updatedMessages.slice(-12);

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          functionName,
          {
            body: {
              message: trimmedMessage,
              history,
            },
          },
        );

      /*
       * Erros HTTP da Edge Function.
       *
       * Tentamos ler o JSON retornado pelo backend,
       * mas nunca mostramos a mensagem técnica ao usuário.
       */
      if (functionError) {
        let status: number | undefined;

        let backendMessage = "";

        try {
          const context =
            (functionError as any).context;

          status = context?.status;

          if (context) {
            const errorBody =
              await context
                .clone()
                .json()
                .catch(() => null);

            if (
              errorBody &&
              typeof errorBody.error ===
                "string"
            ) {
              backendMessage =
                errorBody.error;
            }
          }
        } catch {
          // Não mostramos erros internos.
        }

        throw {
          status,
          message:
            backendMessage ||
            functionError.message ||
            "",
        };
      }

      /*
       * Alguns backends podem retornar
       * HTTP 200 com { error: "..." }.
       *
       * Também transformamos isso em
       * uma mensagem amigável.
       */
      if (data?.error) {
        throw {
          status:
            typeof data.status ===
            "number"
              ? data.status
              : undefined,

          message:
            typeof data.error ===
            "string"
              ? data.error
              : "",
        };
      }

      if (
        typeof data?.response !==
          "string" ||
        data.response
          .trim()
          .length === 0
      ) {
        throw {
          message:
            "Resposta inválida",
        };
      }

      setMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            content:
              data.response,
          },
        ],
      );
    } catch (err) {
      let status: number | undefined;

      let errorMessage = "";

      if (
        err &&
        typeof err === "object"
      ) {
        status =
          (err as any).status;

        errorMessage =
          (err as any).message ||
          "";
      }

      const friendlyMessage =
        getFriendlyAiError(
          status,
          errorMessage,
        );

      /*
       * O usuário nunca vê:
       *
       * 402
       * 429
       * 500
       * RESOURCE_EXHAUSTED
       * Supabase errors
       * API errors
       * detalhes técnicos
       *
       * Tudo aparece como uma
       * mensagem normal da DecidlyAI.
       */
      setMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            content:
              friendlyMessage,
          },
        ],
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<
      HTMLTextAreaElement
    >,
  ) {
    if (
      (event.ctrlKey ||
        event.metaKey) &&
      event.key === "Enter"
    ) {
      event.preventDefault();

      sendMessage();
    }
  }

  return (
    <AppShell>
      <div className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto w-full max-w-4xl px-6 py-16 md:py-24">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
              <Sparkles className="h-4 w-4" />

              Ambiente de teste

              {modelLabel && (
                <span className="ml-1 opacity-80">
                  • {modelLabel}
                </span>
              )}
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
              Teste do{" "}

              <span className="text-violet-400">
                DecidlyAI
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-400">
              Envie uma mensagem e teste o cérebro do
              {" "}
              DecidlyAI.
            </p>
          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 shadow-2xl shadow-black/20">
            <div className="min-h-[400px] space-y-5 p-5 md:p-8">
              {messages.length === 0 &&
                !isLoading && (
                  <div className="flex min-h-[350px] items-center justify-center">
                    <p className="max-w-md text-center leading-relaxed text-slate-500">
                      Comece enviando uma dúvida,
                      decisão ou qualquer mensagem
                      para testar a IA.
                    </p>
                  </div>
                )}

              {messages.map(
                (
                  chatMessage,
                  index,
                ) => (
                  <div
                    key={index}
                    className={
                      chatMessage.role ===
                      "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >
                    <div
                      className={
                        chatMessage.role ===
                        "user"
                          ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-violet-600 px-5 py-4 text-white"
                          : "max-w-[85%] overflow-hidden rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950 px-5 py-4 leading-relaxed text-slate-300"
                      }
                    >
                      {chatMessage.role ===
                      "assistant" ? (
                        <div className="max-w-full overflow-x-auto">
                          <div
                            className="
                              prose
                              prose-invert
                              max-w-none
                              break-words

                              prose-p:my-2
                              prose-p:leading-relaxed

                              prose-headings:mt-4
                              prose-headings:mb-2

                              prose-h1:text-xl
                              prose-h2:text-lg
                              prose-h3:text-base

                              prose-headings:text-slate-100

                              prose-strong:text-white

                              prose-ul:my-2
                              prose-ol:my-2

                              prose-li:my-1

                              prose-table:my-3
                              prose-table:text-sm

                              prose-th:px-3
                              prose-th:py-2
                              prose-th:text-left

                              prose-td:px-3
                              prose-td:py-2

                              prose-hr:border-slate-700
                            "
                          >
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                              ]}
                            >
                              {
                                chatMessage.content
                              }
                            </ReactMarkdown>
                          </div>
                        </div>
                      ) : (
                        chatMessage.content
                      )}
                    </div>
                  </div>
                ),
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950 px-5 py-4 text-slate-400">
                    DecidlyAI está pensando... 😄
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-slate-800 bg-slate-950/70 p-4 md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row">
                <textarea
                  value={message}
                  onChange={(event) =>
                    setMessage(
                      event.target.value,
                    )
                  }
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder="Digite uma mensagem para o DecidlyAI..."
                  rows={3}
                  className="min-h-[96px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={sendMessage}
                  disabled={
                    isLoading ||
                    message.trim()
                      .length === 0
                  }
                  className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-6 py-4 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50 sm:self-end"
                >
                  <Send className="h-4 w-4" />

                  Enviar
                </button>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Ctrl + Enter para enviar
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}