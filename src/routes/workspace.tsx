import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Send, Sparkles, Menu } from "lucide-react";

import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

function Workspace() {
  const navigate = Route.useNavigate();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function startConversation() {
    const trimmed = message.trim();

    if (!trimmed || sending) return;

    setSending(true);

    try {
      // 1. Verifica o usuário
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        await navigate({
          to: "/login",
        });
        return;
      }

      // 2. Cria o título baseado na primeira mensagem
      const title =
        trimmed.replace(/\s+/g, " ").slice(0, 60) ||
        "Nova conversa";

      // 3. Cria a conversa
      const {
        data: conversation,
        error: conversationError,
      } = await supabase
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

      // 4. Salva a mensagem do usuário
      const { error: messageError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: trimmed,
        });

      if (messageError) {
        console.error(messageError);

        // Se falhar ao salvar a mensagem, tenta remover
        // a conversa recém-criada.
        await supabase
          .from("conversations")
          .delete()
          .eq("id", conversation.id);

        throw new Error("Não foi possível salvar sua mensagem.");
      }

      // 5. ABRE O CHAT IMEDIATAMENTE.
      //
      // Não esperamos a IA aqui.
      // A rota /workspace/:conversationId vai carregar
      // a mensagem e iniciar a resposta da IA.
      await navigate({
        to: "/workspace/$conversationId",
        params: {
          conversationId: conversation.id,
        },
      });
    } catch (error) {
      console.error(error);

      const text =
        error instanceof Error
          ? error.message
          : "Não foi possível iniciar a conversa.";

      window.alert(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void startConversation();
    }
  }

  return (
    <div className="min-h-screen overflow-hidden bg-[#0d0a11] text-white">
      {/* Fundo */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_-10%,rgba(118,81,232,0.16),transparent_42%)]" />

      {/* Topbar */}
      <header className="relative z-10 flex h-[68px] items-center border-b border-white/[0.06] px-4">
        <button
          type="button"
          onClick={() => {
            // A sidebar será adicionada na rota da conversa.
          }}
          className="flex h-10 w-10 items-center justify-center rounded-xl text-white/70 transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Menu"
        >
          <Menu size={21} />
        </button>

        <div className="ml-3 flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#7651e8]">
            <Sparkles size={17} />
          </div>

          <span className="text-[15px] font-semibold tracking-tight">
            DecidlyAI
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs text-white/40">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Workspace
        </div>
      </header>

      {/* Conteúdo */}
      <main className="relative flex min-h-[calc(100vh-68px)] flex-col">
        <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col items-center justify-center px-5 pb-40 pt-10">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#141019] shadow-2xl shadow-black/20">
            <Sparkles
              size={25}
              strokeWidth={1.7}
              className="text-[#9275ed]"
            />
          </div>

          <h1 className="text-center text-[26px] font-semibold tracking-tight sm:text-[30px]">
            Como posso ajudar?
          </h1>

          <p className="mt-3 max-w-[500px] text-center text-sm leading-6 text-white/45">
            Converse com a DecidlyAI, faça perguntas, organize ideias,
            estude e descubra novas possibilidades.
          </p>
        </div>

        {/* Composer */}
        <div className="fixed inset-x-0 bottom-0 z-20 px-4 pb-5">
          <div className="mx-auto max-w-[720px]">
            <div className="rounded-2xl border border-white/[0.10] bg-[#141019]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  rows={1}
                  placeholder="Envie uma mensagem..."
                  className="max-h-40 min-h-[46px] flex-1 resize-none bg-transparent px-3 py-3 text-[15px] leading-6 text-white outline-none placeholder:text-white/30 disabled:opacity-50"
                />

                <button
                  type="button"
                  onClick={() => void startConversation()}
                  disabled={!message.trim() || sending}
                  className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7651e8] text-white transition hover:bg-[#8564ed] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>

            <p className="mt-2 px-2 text-center text-[10px] leading-4 text-white/25">
              DecidlyAI é um agente de AI que pode cometer erros, olhe duas
              vezes a resposta dela antes de usar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}