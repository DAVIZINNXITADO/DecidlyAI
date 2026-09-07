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

type TemporaryMemory = {
  facts: string[];
};

type AiResponse = {
  response?: string;
  error?: string;
};

const MAX_CONTEXT_MESSAGES = 8;

function AiTest() {
  const [message, setMessage] = useState("");

  const [messages, setMessages] = useState<Message[]>([]);

  const [temporaryMemory, setTemporaryMemory] =
    useState<TemporaryMemory>({
      facts: [],
    });

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState("");

  function getRecentHistory(
    currentMessages: Message[],
  ) {
    return currentMessages.slice(
      -MAX_CONTEXT_MESSAGES,
    );
  }

  /*
   * Esta função NÃO salva nada permanentemente.
   *
   * Ela apenas mantém algumas informações simples
   * enquanto esta página estiver aberta.
   *
   * O ideal é que o index.ts também possa devolver
   * informações relevantes para atualizar essa memória.
   */
  function updateTemporaryMemory(
    newFacts: string[],
  ) {
    if (
      !Array.isArray(newFacts) ||
      newFacts.length === 0
    ) {
      return;
    }

    setTemporaryMemory((current) => {
      const mergedFacts = [
        ...current.facts,
        ...newFacts,
      ];

      const uniqueFacts = [
        ...new Set(
          mergedFacts
            .map((fact) => fact.trim())
            .filter(
              (fact) =>
                fact.length > 0,
            ),
        ),
      ];

      /*
       * Limite para impedir que a própria memória
       * cresça infinitamente e comece a gastar tokens.
       */
      const limitedFacts =
        uniqueFacts.slice(-12);

      return {
        facts: limitedFacts,
      };
    });
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

    setError("");

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: trimmedMessage,
      },
    ];

    setMessages(
      updatedMessages,
    );

    setMessage("");

    setIsLoading(true);

    try {
      /*
       * Verifica se existe uma sessão.
       *
       * Não enviamos ID manualmente.
       * O Supabase Functions Invoke usa
       * a sessão autenticada.
       */
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          "Não foi possível verificar sua sessão.",
        );
      }

      if (!sessionData.session) {
        throw new Error(
          "Você precisa estar logado para usar o DecidlyAI.",
        );
      }

      /*
       * Economia de tokens:
       *
       * A tela mantém todas as mensagens,
       * mas a IA recebe apenas as últimas.
       */
      const recentHistory =
        getRecentHistory(
          updatedMessages,
        );

      console.log(
        "Histórico recente enviado:",
        recentHistory,
      );

      console.log(
        "Memória temporária enviada:",
        temporaryMemory,
      );

      const {
        data,
        error: functionError,
      } =
        await supabase.functions.invoke<AiResponse>(
          "decidly-ai-personality",
          {
            body: {
              message:
                trimmedMessage,

              history:
                recentHistory,

              temporaryMemory:
                temporaryMemory,
            },
          },
        );

      console.log(
        "Resposta completa do DecidlyAI:",
        data,
      );

      if (functionError) {
        console.error(
          "Erro completo da Edge Function:",
          functionError,
        );

        throw new Error(
          functionError.message ||
            "Não foi possível conectar ao DecidlyAI.",
        );
      }

      if (data?.error) {
        throw new Error(
          data.error,
        );
      }

      if (
        typeof data?.response !==
          "string" ||
        data.response.trim().length === 0
      ) {
        console.error(
          "Resposta inválida:",
          data,
        );

        throw new Error(
          "O DecidlyAI não retornou uma resposta válida.",
        );
      }

      setMessages(
        (current) => [
          ...current,
          {
            role: "assistant",
            content:
              data.response!,
          },
        ],
      );

      /*
       * Caso futuramente o index.ts devolva:
       *
       * temporaryMemory: {
       *   facts: [...]
       * }
       *
       * o frontend pode atualizar a memória
       * temporária sem usar banco de dados.
       */

      const responseWithMemory =
        data as AiResponse & {
          temporaryMemory?: {
            facts?: string[];
          };
        };

      const newFacts =
        responseWithMemory
          ?.temporaryMemory
          ?.facts;

      if (
        Array.isArray(
          newFacts,
        )
      ) {
        updateTemporaryMemory(
          newFacts,
        );
      }

    } catch (err) {
      console.error(
        "Erro ao enviar mensagem:",
        err,
      );

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado.";

      setError(
        errorMessage,
      );

    } finally {
      setIsLoading(
        false,
      );
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
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
            </div>

            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl">
              Teste do{" "}

              <span className="text-violet-400">
                DecidlyAI
              </span>
            </h1>

            <p className="mx-auto mt-4 max-w-xl leading-relaxed text-slate-400">
              Envie uma mensagem e teste
              o cérebro do DecidlyAI.
            </p>

          </div>

          <div className="mt-12 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/50 shadow-2xl shadow-black/20">

            <div className="min-h-[400px] space-y-5 p-5 md:p-8">

              {messages.length === 0 &&
                !isLoading && (

                <div className="flex min-h-[350px] items-center justify-center">

                  <p className="max-w-md text-center leading-relaxed text-slate-500">
                    😄 Comece enviando uma dúvida,
                    uma decisão ou qualquer mensagem
                    para testar o DecidlyAI.
                  </p>

                </div>
              )}

              {messages.map(
                (
                  chatMessage,
                  index,
                ) => (

                  <div
                    key={`${chatMessage.role}-${index}`}
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
                          : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-800 bg-slate-950 px-5 py-4 leading-relaxed text-slate-300"
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

              {error && (

                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">

                <textarea
                  value={message}

                  onChange={(event) =>
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