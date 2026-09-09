import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const WIDTH = 320;

function Workspace() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] =
    useState<string | null>(null);

  const contentRef = useRef<HTMLElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const progress = useRef(0);
  const startX = useRef(0);
  const startProgress = useRef(0);
  const dragging = useRef(false);
  const raf = useRef<number | null>(null);

  /*
   * ------------------------------------------------------------
   * SIDEBAR
   * ------------------------------------------------------------
   */

  const paint = useCallback((value: number) => {
    progress.current = Math.max(0, Math.min(1, value));

    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
    }

    raf.current = requestAnimationFrame(() => {
      const current = progress.current;

      if (sidebarRef.current) {
        sidebarRef.current.style.transform =
          `translate3d(${-WIDTH + WIDTH * current}px,0,0)`;
      }

      if (backdropRef.current) {
        backdropRef.current.style.opacity =
          String(current * 0.72);

        backdropRef.current.style.pointerEvents =
          current > 0.01 ? "auto" : "none";
      }
    });
  }, []);

  const settle = useCallback(
    (shouldOpen: boolean) => {
      setOpen(shouldOpen);

      if (sidebarRef.current) {
        sidebarRef.current.style.transition =
          "transform 260ms cubic-bezier(.22,1,.36,1)";
      }

      if (backdropRef.current) {
        backdropRef.current.style.transition =
          "opacity 260ms ease";
      }

      paint(shouldOpen ? 1 : 0);

      window.setTimeout(() => {
        if (sidebarRef.current) {
          sidebarRef.current.style.transition = "none";
        }

        if (backdropRef.current) {
          backdropRef.current.style.transition = "none";
        }
      }, 280);
    },
    [paint],
  );

  const beginDrag = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragging.current = true;
    startX.current = event.clientX;
    startProgress.current = progress.current;

    if (sidebarRef.current) {
      sidebarRef.current.style.transition = "none";
    }

    if (backdropRef.current) {
      backdropRef.current.style.transition = "none";
    }
  };

  const moveDrag = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (!dragging.current) return;

    const delta =
      (event.clientX - startX.current) / WIDTH;

    paint(startProgress.current + delta);
  };

  const endDrag = () => {
    if (!dragging.current) return;

    dragging.current = false;

    settle(progress.current > 0.5);
  };

  /*
   * ------------------------------------------------------------
   * CARREGAMENTO DO USUÁRIO E CONVERSAS
   * ------------------------------------------------------------
   */

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (authError || !user) {
        await navigate({ to: "/login" });
        return;
      }

      setUserId(user.id);

      const { data, error: conversationsError } =
        await supabase
          .from("conversations")
          .select(
            "id,user_id,title,created_at,updated_at",
          )
          .eq("user_id", user.id)
          .order("updated_at", {
            ascending: false,
          });

      if (!alive) return;

      if (conversationsError) {
        setError(
          "Não foi possível carregar suas decisões.",
        );
        return;
      }

      setItems(
        (data ?? []) as Conversation[],
      );
    };

    void load();

    return () => {
      alive = false;
    };
  }, [navigate]);

  /*
   * ------------------------------------------------------------
   * SCROLL
   * ------------------------------------------------------------
   */

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const element = contentRef.current;

      if (!element) return;

      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    });
  }, []);

  /*
   * ------------------------------------------------------------
   * CARREGAR CONVERSA
   * ------------------------------------------------------------
   *
   * Tudo continua dentro de /workspace.
   */

  const openConversation = async (
    conversation: Conversation,
  ) => {
    if (!userId) return;

    setError(null);
    setActiveConversation(conversation.id);
    settle(false);

    /*
     * Troque "messages" pelos nomes reais da sua tabela
     * caso ela tenha outra estrutura.
     */
    const { data, error: messagesError } =
      await supabase
        .from("messages")
        .select("id,role,content")
        .eq("conversation_id", conversation.id)
        .eq("user_id", userId)
        .order("created_at", {
          ascending: true,
        });

    if (messagesError) {
      /*
       * Caso sua tabela messages ainda não exista,
       * mostramos a conversa vazia em vez de quebrar
       * completamente o workspace.
       */
      setMessages([]);
      setError(
        "Não foi possível carregar as mensagens.",
      );
      return;
    }

    setMessages(
      (data ?? []) as Message[],
    );

    scrollToBottom();
  };

  /*
   * ------------------------------------------------------------
   * NOVA CONVERSA
   * ------------------------------------------------------------
   */

  const newConversation = () => {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setError(null);

    settle(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /*
   * ------------------------------------------------------------
   * CRIAR CONVERSA
   * ------------------------------------------------------------
   */

  const createConversation = async (
    text: string,
  ) => {
    if (!userId) {
      throw new Error("Usuário não autenticado.");
    }

    const id = crypto.randomUUID();

    const title =
      text.length > 70
        ? `${text.slice(0, 70)}…`
        : text;

    const { data, error: insertError } =
      await supabase
        .from("conversations")
        .insert({
          id,
          user_id: userId,
          title,
        })
        .select(
          "id,user_id,title,created_at,updated_at",
        )
        .single();

    if (insertError) {
      throw new Error(
        "Não foi possível criar a conversa.",
      );
    }

    if (data) {
      setItems((current) => [
        data as Conversation,
        ...current,
      ]);
    }

    setActiveConversation(id);

    return id;
  };

  /*
   * ------------------------------------------------------------
   * ENVIAR MENSAGEM
   * ------------------------------------------------------------
   */

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || busy) return;

    setBusy(true);
    setError(null);

    try {
      let conversationId =
        activeConversation;

      /*
       * Se ainda não existe conversa, criamos uma.
       */
      if (!conversationId) {
        conversationId =
          await createConversation(text);
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

      setMessages((current) => [
        ...current,
        userMessage,
      ]);

      setInput("");

      if (textareaRef.current) {
        textareaRef.current.style.height = "61px";
      }

      scrollToBottom();

      /*
       * --------------------------------------------------------
       * AQUI ENTRA SUA CONEXÃO COM A AI
       * --------------------------------------------------------
       *
       * Não coloque uma API key secreta aqui.
       *
       * O ideal é chamar uma Edge Function / API própria,
       * que guarda a chave do provedor de AI no servidor.
       *
       * Exemplo:
       *
       * const { data, error } = await supabase.functions.invoke(
       *   "chat",
       *   {
       *     body: {
       *       conversationId,
       *       message: text,
       *     },
       *   },
       * );
       *
       * Depois, use data.answer.
       */

      const {
        data: aiData,
        error: aiError,
      } =
        await supabase.functions.invoke(
          "chat",
          {
            body: {
              conversationId,
              message: text,
            },
          },
        );

      if (aiError) {
        throw new Error(
          "Não foi possível obter uma resposta da IA.",
        );
      }

      const answer =
        typeof aiData?.answer === "string"
          ? aiData.answer
          : "Não consegui gerar uma resposta agora.";

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      scrollToBottom();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Ocorreu um erro ao enviar sua decisão.",
      );
    } finally {
      setBusy(false);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  /*
   * ------------------------------------------------------------
   * TEXTAREA
   * ------------------------------------------------------------
   */

  const handleInput = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value = event.target.value;

    setInput(value);

    const element = event.currentTarget;

    element.style.height = "auto";

    element.style.height =
      `${Math.min(element.scrollHeight, 150)}px`;
  };

  /*
   * Ctrl + Enter / Cmd + Enter
   */

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      void sendMessage();
    }
  };

  /*
   * ------------------------------------------------------------
   * TECLADO MOBILE
   * ------------------------------------------------------------
   *
   * visualViewport acompanha a área realmente visível
   * quando o teclado virtual aparece.
   */

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const updateKeyboardPosition = () => {
      const keyboardHeight = Math.max(
        0,
        window.innerHeight - viewport.height,
      );

      if (composerRef.current) {
        composerRef.current.style.transform =
          `translateY(-${keyboardHeight}px)`;
      }

      /*
       * Mantém o conteúdo visível acima do composer.
       */
      if (contentRef.current) {
        contentRef.current.style.paddingBottom =
          `${Math.max(250, keyboardHeight + 180)}px`;
      }
    };

    viewport.addEventListener(
      "resize",
      updateKeyboardPosition,
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboardPosition,
    );

    updateKeyboardPosition();

    return () => {
      viewport.removeEventListener(
        "resize",
        updateKeyboardPosition,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboardPosition,
      );
    };
  }, []);

  /*
   * Quando o usuário toca no textarea, garantimos que
   * a posição fique correta depois da abertura do teclado.
   */

  const handleFocus = () => {
    window.setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        block: "nearest",
        behavior: "smooth",
      });
    }, 250);
  };

  /*
   * ------------------------------------------------------------
   * FILTRO DO HISTÓRICO
   * ------------------------------------------------------------
   */

  const filtered = items.filter((item) =>
    item.title
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  /*
   * ------------------------------------------------------------
   * RENDER
   * ------------------------------------------------------------
   */

  return (
    <div className="min-h-screen overflow-hidden bg-[#0d0a11] text-white">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={() => settle(false)}
        className="
          pointer-events-none
          fixed
          inset-0
          z-20
          bg-black
          opacity-0
        "
      />

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="
          fixed
          inset-y-0
          left-0
          z-30
          flex
          w-[min(86vw,320px)]
          flex-col
          border-r
          border-white/10
          bg-[#17111f]
          p-[18px_15px]
          shadow-[20px_0_55px_rgba(0,0,0,.45)]
          will-change-transform
          touch-pan-y
        "
        style={{
          transform:
            `translate3d(-${WIDTH}px,0,0)`,
        }}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between font-semibold">
          <span>DecidlyAI</span>

          <button
            type="button"
            aria-label="Fechar menu"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={() => settle(false)}
            className="
              grid
              h-9
              w-9
              place-items-center
              rounded-[10px]
              bg-white/5
              text-white
              hover:bg-white/10
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* New decision */}
        <button
          type="button"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          onClick={newConversation}
          className="
            mt-[25px]
            rounded-xl
            bg-[#7651e8]
            px-3
            py-3
            text-center
            text-sm
            font-semibold
            transition
            hover:bg-violet-500
          "
        >
          <span className="flex items-center justify-center gap-2">
            <Plus size={17} />
            Nova decisão
          </span>
        </button>

        {/* Search */}
        <label
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          className="
            mt-3.5
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-white/10
            bg-white/[.04]
            px-3
            text-white/40
          "
        >
          <Search size={16} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Pesquisar decisões"
            aria-label="Pesquisar decisões"
            className="
              min-w-0
              flex-1
              bg-transparent
              py-2.5
              text-sm
              text-white
              outline-none
              placeholder:text-white/35
            "
          />
        </label>

        {/* History */}
        <div
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          className="
            mt-[18px]
            flex-1
            space-y-1
            overflow-y-auto
            text-[13px]
          "
        >
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-white/35">
              Nenhuma decisão encontrada.
            </p>
          ) : (
            filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  void openConversation(item);
                }}
                className={`
                  block
                  w-full
                  truncate
                  rounded-[10px]
                  px-2.5
                  py-2.5
                  text-left
                  text-sm
                  transition
                  ${
                    activeConversation === item.id
                      ? "bg-white/[.08] text-white"
                      : "text-white/65 hover:bg-white/[.06]"
                  }
                `}
              >
                {item.title}
              </button>
            ))
          )}
        </div>

        {/* Account */}
        <div
          className="
            border-t
            border-white/10
            pt-[15px]
            text-xs
            text-white/40
          "
        >
          Minha conta
        </div>
      </aside>

      {/* Edge swipe */}
      <div
        className="
          fixed
          left-0
          top-[68px]
          bottom-0
          z-10
          w-5
          touch-none
        "
        onPointerDown={beginDrag}
        onPointerMove={moveDrag}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      />

      {/* Main */}
      <main className="flex min-h-screen flex-col">
        {/* Topbar */}
        <header
          className="
            flex
            h-[68px]
            shrink-0
            items-center
            gap-3.5
            border-b
            border-white/[.07]
            px-[18px]
          "
        >
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => settle(!open)}
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              border
              border-white/10
              bg-white/[.04]
              text-white
              transition
              hover:bg-white/[.08]
            "
          >
            <Menu size={21} />
          </button>

          <strong className="font-semibold tracking-tight">
            DecidlyAI
          </strong>

          <span className="ml-auto text-xs text-white/35">
            Workspace
          </span>
        </header>

        {/* Chat */}
        <section
          ref={contentRef}
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-[18px]
            pb-[250px]
            pt-7
          "
        >
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-[22px]">
            {/* Empty state */}
            {messages.length === 0 && (
              <div className="welcome mt-5 mb-2 text-center text-white/45">
                <div
                  className="
                    mx-auto
                    grid
                    h-[52px]
                    w-[52px]
                    place-items-center
                    overflow-hidden
                    rounded-[17px]
                    bg-violet-600/20
                  "
                >
                  <img
                    src="/appicon.png"
                    alt="DecidlyAI"
                    className="h-full w-full object-cover"
                    draggable={false}
                  />
                </div>

                <h1
                  className="
                    mt-4
                    text-2xl
                    font-semibold
                    tracking-tight
                    text-white
                  "
                >
                  Qual decisão você precisa analisar?
                </h1>

                <p className="mt-2 text-sm">
                  Descreva sua situação e organize suas
                  possibilidades.
                </p>
              </div>
            )}

            {/* Messages */}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`
                  max-w-[82%]
                  whitespace-pre-wrap
                  break-words
                  rounded-[18px]
                  px-4
                  py-[13px]
                  text-sm
                  leading-[1.55]
                  ${
                    message.role === "user"
                      ? `
                        ml-auto
                        rounded-br-[5px]
                        bg-[#7651e8]
                      `
                      : `
                        mr-auto
                        rounded-bl-[5px]
                        border
                        border-white/10
                        bg-white/[.045]
                        text-white/[.78]
                      `
                  }
                `}
              >
                {message.content}
              </div>
            ))}

            {/* AI loading */}
            {busy && (
              <div
                className="
                  mr-auto
                  flex
                  items-center
                  gap-2
                  rounded-[18px]
                  rounded-bl-[5px]
                  border
                  border-white/10
                  bg-white/[.045]
                  px-4
                  py-[13px]
                  text-sm
                  text-white/45
                "
              >
                <Sparkles size={15} />

                <span className="flex gap-1">
                  <span className="animate-pulse">
                    •
                  </span>
                  <span className="animate-pulse [animation-delay:150ms]">
                    •
                  </span>
                  <span className="animate-pulse [animation-delay:300ms]">
                    •
                  </span>
                </span>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                role="alert"
                className="
                  rounded-xl
                  border
                  border-red-400/20
                  bg-red-400/10
                  px-4
                  py-3
                  text-sm
                  text-red-200
                "
              >
                {error}
              </div>
            )}
          </div>
        </section>

        {/* Composer */}
        <div
          ref={composerRef}
          className="
            fixed
            inset-x-0
            bottom-0
            z-10
            px-3
            pt-[9px]
            transition-transform
            duration-75
            sm:px-3.5
          "
          style={{
            paddingBottom:
              "max(12px, env(safe-area-inset-bottom))",
            background:
              "linear-gradient(to top, #0d0a11 72%, transparent)",
          }}
        >
          <div className="mx-auto w-full max-w-[720px]">
            {/*
             * Sem borda no textarea.
             *
             * A única borda fica no container externo,
             * como no preview original.
             */}
            <div
              className="
                rounded-[20px]
                border
                border-white/[.14]
                bg-[#15101d]/95
                p-[9px]
                shadow-[0_-8px_32px_rgba(0,0,0,.25)]
                backdrop-blur-xl
              "
            >
              <textarea
                ref={textareaRef}
                id="workspace-input"
                value={input}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                rows={2}
                disabled={busy}
                placeholder="Mande o que você quer decidir para a DecidlyAI te ajudar"
                className="
                  block
                  min-h-[61px]
                  max-h-[150px]
                  w-full
                  resize-none
                  overflow-y-auto
                  border-0
                  outline-none
                  ring-0
                  bg-transparent
                  px-2
                  py-1.5
                  text-[15px]
                  leading-[1.45]
                  text-white
                  placeholder:text-white/55
                  focus:border-0
                  focus:outline-none
                  focus:ring-0
                "
              />

              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-1
                  pb-0
                "
              >
                <span className="text-[11px] text-white/30">
                  Ctrl + Enter para enviar
                </span>

                <button
                  type="button"
                  aria-label="Enviar"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || busy}
                  className="
                    grid
                    h-9
                    w-9
                    place-items-center
                    rounded-xl
                    bg-[#7651e8]
                    text-[21px]
                    leading-none
                    transition
                    hover:bg-violet-500
                    disabled:cursor-default
                    disabled:opacity-35
                  "
                >
                  {busy ? (
                    <span
                      className="
                        block
                        h-[18px]
                        w-[18px]
                        animate-spin
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                      "
                    />
                  ) : (
                    "↑"
                  )}
                </button>
              </div>
            </div>

            <p
              className="
                mx-1
                mt-2
                text-center
                text-[11px]
                leading-[1.4]
                text-white/[.38]
              "
            >
              DecidlyAI é um agente de AI que pode cometer
              erros, olhe duas vezes a resposta dela antes
              de usar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}