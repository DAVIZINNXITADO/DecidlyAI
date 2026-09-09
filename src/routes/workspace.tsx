import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowUp, Menu } from "lucide-react";

import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

const suggestions = [
  "Preciso tomar uma decisão",
  "Compare duas opções para mim",
  "Quais são os prós e contras?",
  "Estou em dúvida entre duas escolhas",
];

function Workspace() {
  const navigate = Route.useNavigate();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function sendMessage(text = message) {
    const trimmed = text.trim();

    if (!trimmed || sending) return;

    setSending(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      const title =
        trimmed.replace(/\s+/g, " ").slice(0, 60) || "Nova decisão";

      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            user_id: user.id,
            title,
          })
          .select("id")
          .single();

      if (conversationError || !conversation) {
        console.error(conversationError);
        throw new Error("Não foi possível criar a conversa.");
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: trimmed,
        });

      if (messageError) {
        console.error(messageError);

        await supabase
          .from("conversations")
          .delete()
          .eq("id", conversation.id);

        throw new Error("Não foi possível salvar a mensagem.");
      }

      setMessage("");

      await navigate({
        to: "/workspace/$conversationId",
        params: {
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error(error);

      window.alert(
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a conversa.",
      );
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0d0a11] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(118,81,232,.18),transparent_45%)]" />

      <header className="relative z-10 flex h-[68px] items-center px-4">
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>

        <div className="ml-2 flex items-center gap-2.5">
          <img
            src="/appicon.png"
            alt="DecidlyAI"
            className="h-8 w-8 rounded-lg object-cover"
            onError={(event) => {
              event.currentTarget.src = "/favicon.ico";
            }}
          />

          <span className="text-[15px] font-semibold tracking-tight">
            DecidlyAI
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Workspace
        </div>
      </header>

      <main className="relative flex min-h-[calc(100dvh-68px)] flex-col">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center px-5 pb-[220px] pt-8">
          <img
            src="/appicon.png"
            alt=""
            className="mb-6 h-16 w-16 rounded-[18px] object-cover shadow-2xl shadow-black/30"
            onError={(event) => {
              event.currentTarget.src = "/favicon.ico";
            }}
          />

          <h1 className="text-center text-[28px] font-semibold tracking-tight">
            O que você está tentando decidir?
          </h1>

          <p className="mt-3 max-w-[500px] text-center text-sm leading-6 text-white/40">
            Conte a situação para a DecidlyAI e analise suas opções,
            consequências e prioridades.
          </p>

          <div className="mt-8 grid w-full max-w-[620px] grid-cols-1 gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={sending}
                onClick={() => void sendMessage(suggestion)}
                className="rounded-2xl border border-white/[0.07] bg-[#141019]/70 px-4 py-3.5 text-left text-sm text-white/65 transition hover:border-white/[0.12] hover:bg-[#19141f] hover:text-white disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <Composer
          value={message}
          onChange={setMessage}
          onSend={() => void sendMessage()}
          onKeyDown={handleKeyDown}
          disabled={sending}
        />
      </main>
    </div>
  );
}

function Composer({
  value,
  onChange,
  onSend,
  onKeyDown,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => void;
  disabled: boolean;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
      <div className="mx-auto max-w-[720px]">
        <div className="flex items-end gap-2 rounded-2xl bg-[#141019] px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,.35)]">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            rows={1}
            placeholder="Conte o que você precisa decidir..."
            className="max-h-[180px] min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
            onInput={(event) => {
              const element = event.currentTarget;
              element.style.height = "auto";
              element.style.height = `${Math.min(
                element.scrollHeight,
                180,
              )}px`;
            }}
          />

          <button
            type="button"
            onClick={onSend}
            disabled={!value.trim() || disabled}
            className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7651e8] text-white transition hover:bg-[#8564ed] disabled:cursor-not-allowed disabled:opacity-25"
            aria-label="Enviar mensagem"
          >
            <ArrowUp size={19} strokeWidth={2.2} />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] leading-4 text-white/20">
          A DecidlyAI pode cometer erros. Analise a resposta antes de tomar
          uma decisão importante.
        </p>
      </div>
    </div>
  );
}