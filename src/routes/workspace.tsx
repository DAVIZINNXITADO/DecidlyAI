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
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function createConversation(text: string) {
    const trimmed = text.trim();

    if (!trimmed || sending) return;

    setSending(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        await navigate({ to: "/login" });
        return;
      }

      const title =
        trimmed.replace(/\s+/g, " ").slice(0, 60) ||
        "Nova decisão";

      const { data: conversation, error } = await supabase
        .from("conversations")
        .insert({
          user_id: user.id,
          title,
        })
        .select("id")
        .single();

      if (error || !conversation) {
        console.error("Erro criando conversa:", error);
        throw new Error("Não foi possível criar a conversa.");
      }

      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
          role: "user",
          content: trimmed,
        });

      if (messageError) {
        console.error("Erro salvando mensagem:", messageError);

        await supabase
          .from("conversations")
          .delete()
          .eq("id", conversation.id);

        throw new Error("Não foi possível salvar a mensagem.");
      }

      setInput("");

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
      void createConversation(input);
    }
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0d0a11] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-15%,rgba(118,81,232,.18),transparent_45%)]" />

      <header className="relative z-20 flex h-[68px] items-center px-4">
        <button
          type="button"
          onClick={() => {
            // A sidebar é aberta na conversa.
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 hover:bg-white/[0.06] hover:text-white"
          aria-label="Menu"
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

          <span className="text-[15px] font-semibold">
            DecidlyAI
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-white/35">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Workspace
        </div>
      </header>

      <main className="relative flex h-[calc(100dvh-68px)] flex-col">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center px-5 pb-48">
          <img
            src="/appicon.png"
            alt=""
            className="mb-6 h-16 w-16 rounded-[18px] object-cover shadow-2xl"
            onError={(event) => {
              event.currentTarget.src = "/favicon.ico";
            }}
          />

          <h1 className="text-center text-[28px] font-semibold tracking-tight">
            O que você está tentando decidir?
          </h1>

          <p className="mt-3 max-w-[510px] text-center text-sm leading-6 text-white/40">
            Conte a situação para a DecidlyAI e analise suas opções,
            consequências e prioridades.
          </p>

          <div className="mt-8 grid w-full max-w-[620px] gap-2 sm:grid-cols-2">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                disabled={sending}
                onClick={() => void createConversation(suggestion)}
                className="rounded-2xl border border-white/[0.07] bg-[#141019]/70 px-4 py-3.5 text-left text-sm text-white/60 transition hover:bg-[#19141f] hover:text-white disabled:opacity-40"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-[720px]">
            <div className="flex items-end gap-2 rounded-2xl bg-[#141019] px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,.4)]">
              <textarea
                value={input}
                disabled={sending}
                rows={1}
                placeholder="Conte o que você precisa decidir..."
                className="max-h-[180px] min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-white outline-none ring-0 focus:outline-none focus:ring-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-white/25"
                onChange={(event) => {
                  setInput(event.target.value);

                  event.currentTarget.style.height = "auto";
                  event.currentTarget.style.height =
                    `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
                }}
                onKeyDown={handleKeyDown}
              />

              <button
                type="button"
                disabled={!input.trim() || sending}
                onClick={() => void createConversation(input)}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7651e8] text-white transition hover:bg-[#8564ed] disabled:cursor-not-allowed disabled:opacity-25"
              >
                <ArrowUp size={19} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-white/20">
              A DecidlyAI pode cometer erros. Analise a resposta antes
              de tomar uma decisão importante.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}