import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";

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

function formatAiError(errorMessage: string): string {
  const message = errorMessage
    .trim()
    .toLowerCase();

  if (
    message.includes("crédito") ||
    message.includes("credit")
  ) {
    return "⚠️ No momento não consigo responder porque seus créditos acabaram. Quando houver créditos disponíveis novamente, pode me chamar para continuar a conversa.";
  }

  if (
    message.includes("autenticado") ||
    message.includes("sessão") ||
    message.includes("login")
  ) {
    return "⚠️ Parece que não consigo confirmar sua sessão no momento. Faça login novamente e tente falar comigo outra vez.";
  }

  if (
    message.includes("conectar") ||
    message.includes("network") ||
    message.includes("fetch")
  ) {
    return "⚠️ Estou com uma dificuldade temporária para me conectar ao sistema. Tente enviar sua mensagem novamente em alguns instantes.";
  }

  if (
    message.includes("timeout") ||
    message.includes("tempo")
  ) {
    return "⚠️ Demorei mais do que o esperado para processar sua solicitação. Pode tentar enviar a mensagem novamente?";
  }

  if (
    message.includes("não retornou uma resposta válida") ||
    message.includes("resposta vazia")
  ) {
    return "⚠️ Tive uma dificuldade ao gerar minha resposta desta vez. Pode tentar me perguntar novamente?";
  }

  if (
    errorMessage.length > 0 &&
    errorMessage.length < 300
  ) {
    return `⚠️ ${errorMessage}`;
  }

  return "⚠️ Tive um problema temporário para processar sua mensagem. Tente novamente em alguns instantes.";
}

function AiTest() {
  const [message, setMessage] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([]);

  const [isLoading, setIsLoading] =
    useState(false);

  const [modelLabel, setModelLabel] =
    useState<"Free" | "VIP" | null>(
      null,
    );

  async function getAiFunction() {
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      throw new Error(
        "Você precisa estar autenticado para usar o DecidlyAI.",
      );
    }

    const {
      data: subscription,
      error: subscriptionError,
    } =
      await supabase
        .from("subscription")
        .select(`
          plan,
          status,
          expires_at
        `)
        .eq(
          "user_id",
          user.id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle<Subscription>();

    if (
      subscriptionError
    ) {
      console.error(
        "Erro ao buscar assinatura:",
        subscriptionError,
      );

      setModelLabel(
        "Free",
      );

      return "decidly-ai-free";
    }

    const now =
      new Date();

    const plan =
      subscription?.plan
        ?.trim()
        .toLowerCase();

    const status =
      subscription?.status
        ?.trim()
        .toLowerCase();

    const expiresAt =
      subscription?.expires_at
        ? new Date(
            subscription.expires_at,
          )
        : null;

    const hasExpired =
      expiresAt !== null &&
      expiresAt.getTime() <
        now.getTime();

    const isVip =
      plan === "vip" &&
      (
        status === "active" ||
        status === "ativo"
      ) &&
      !hasExpired;

    if (
      isVip
    ) {
      setModelLabel(
        "VIP",
      );

      return "decidly-ai";
    }

    setModelLabel(
      "Free",
    );

    return "decidly-ai-free";
  }

  async function sendMessage() {
    const trimmedMessage =
      message.trim();

    if (
      !trimmedMessage ||
      isLoading
    ) {
      return;
    }

    const updatedMessages: Message[] =
      [
        ...messages,
        {
          role: "user",
          content:
            trimmedMessage,
        },
      ];

    setMessages(
      updatedMessages,
    );

    setMessage("");
    setIsLoading(true);

    try {
      const functionName =
        await getAiFunction();

      const history =
        updatedMessages.slice(
          -12,
        );

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke(
          functionName,
          {
            body: {
              message:
                trimmedMessage,

              history:
                history,
            },
          },
        );

      if (
        functionError
      ) {
        throw new Error(
          functionError.message ||
          "Não foi possível conectar ao DecidlyAI.",
        );
      }

      if (
        data?.error
      ) {
        throw new Error(
          data.error,
        );
      }

      if (
        typeof data?.response !==
          "string" ||
        data.response
          .trim()
          .length === 0
      ) {
        throw new Error(
          "O DecidlyAI não retornou uma resposta válida.",
        );
      }

      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",

            content:
              data.response,
          },
        ],
      );

    } catch (
      err
    ) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado.";

      const aiErrorMessage =
        formatAiError(
          errorMessage,
        );

      // Em vez de popup vermelho,
      // o erro aparece como uma mensagem da IA.
      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",

            content:
              aiErrorMessage,
          },
        ],
      );

    } finally {
      setIsLoading(
        false,
      );
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<
      HTMLTextAreaElement
    >,
  ) {
    if (
      (
        event.ctrlKey ||
        event.metaKey
      ) &&
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

              Envie uma mensagem e teste o cérebro do{" "}

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
                          ? "max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-5 py-4 text-white"
                          : "max-w-[85%] rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950 px-5 py-4 leading-relaxed text-slate-300"
                      }
                    >

                      {chatMessage.content}

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

                  onChange={
                    (event) =>
                      setMessage(
                        event.target.value,
                      )
                  }

                  onKeyDown={
                    handleKeyDown
                  }

                  disabled={
                    isLoading
                  }

                  placeholder="Digite uma mensagem para o DecidlyAI..."

                  rows={3}

                  className="min-h-[96px] flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
                />

                <button
                  type="button"

                  onClick={
                    sendMessage
                  }

                  disabled={
                    isLoading ||
                    message.trim().length === 0
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