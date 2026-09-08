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

function AiTest() {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [modelLabel, setModelLabel] = useState<
    "Free" | "VIP" | null
  >(null);

  async function getAiFunction() {
    // -----------------------------------------------------
    // PEGA USUÁRIO LOGADO
    // -----------------------------------------------------

    const {
      data: {
        user,
      },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error(
        "Você precisa estar autenticado para usar o DecidlyAI.",
      );
    }

    // -----------------------------------------------------
    // BUSCA ASSINATURA
    // -----------------------------------------------------

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

    if (subscriptionError) {
      console.error(
        "Erro ao buscar assinatura:",
        subscriptionError,
      );

      // Por segurança, se der erro ao buscar o plano,
      // não libera VIP.
      setModelLabel("Free");

      return "decidly-ai-free";
    }

    // -----------------------------------------------------
    // VERIFICA VIP
    // -----------------------------------------------------

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

    // -----------------------------------------------------
    // ESCOLHE A FUNÇÃO
    // -----------------------------------------------------

    if (isVip) {
      setModelLabel("VIP");

      return "decidly-ai";
    }

    setModelLabel("Free");

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

    setError("");

    const updatedMessages: Message[] =
      [
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
      // ---------------------------------------------------
      // DESCOBRE FREE OU VIP
      // ---------------------------------------------------

      const functionName =
        await getAiFunction();

      // ---------------------------------------------------
      // ECONOMIA DE CONTEXTO
      //
      // Mantém apenas as últimas mensagens.
      // ---------------------------------------------------

      const history =
        updatedMessages.slice(-12);

      // ---------------------------------------------------
      // CHAMA A EDGE FUNCTION
      // ---------------------------------------------------

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

      if (functionError) {
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
              data.response,
          },
        ],
      );

    } catch (err) {

      const errorMessage =
        err instanceof Error
          ? err.message
          : "Ocorreu um erro inesperado.";

      setError(
        errorMessage,
      );

      // Remove a mensagem do usuário se a IA
      // não conseguiu responder.
      setMessages(
        (current) =>
          current.slice(
            0,
            -1,
          ),
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

          {/* CABEÇALHO */}

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

          {/* CHAT */}

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

            {/* INPUT */}

            <div className="border-t border-slate-800 bg-slate-950/70 p-4 md:p-5">

              {error && (
                <div className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">

                  {error}

                </div>
              )}

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