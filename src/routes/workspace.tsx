import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import {
  Menu,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Subscription = {
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

const SIDEBAR_MAX_WIDTH = 320;
const SIDEBAR_EDGE_SIZE = 28;

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProgress, setSidebarProgress] = useState(0);

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const sidebarRef = useRef<HTMLElement | null>(null);
  const chatRef = useRef<HTMLElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const dragState = useRef({
    active: false,
    startX: 0,
    startProgress: 0,
  });

  /*
   * ---------------------------------------------------------
   * SIDEBAR
   * ---------------------------------------------------------
   */

  const getSidebarWidth = useCallback(() => {
    if (sidebarRef.current) {
      return sidebarRef.current.getBoundingClientRect().width;
    }

    return Math.min(
      SIDEBAR_MAX_WIDTH,
      window.innerWidth * 0.9,
    );
  }, []);

  const paintSidebar = useCallback(
    (progress: number, animate = false) => {
      const safeProgress = Math.max(0, Math.min(1, progress));

      setSidebarProgress(safeProgress);

      if (sidebarRef.current) {
        sidebarRef.current.style.transition = animate
          ? "transform 220ms cubic-bezier(.2,.8,.2,1)"
          : "none";

        sidebarRef.current.style.transform = `translate3d(${
          -100 + safeProgress * 100
        }%, 0, 0)`;
      }
    },
    [],
  );

  const settleSidebar = useCallback(
    (open: boolean) => {
      setSidebarOpen(open);
      paintSidebar(open ? 1 : 0, true);
    },
    [paintSidebar],
  );

  const startSidebarDrag = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    const width = getSidebarWidth();

    dragState.current = {
      active: true,
      startX: event.clientX,
      startProgress: sidebarOpen
        ? 1
        : sidebarProgress || 0,
    };

    event.currentTarget.setPointerCapture(event.pointerId);

    if (width > 0) {
      paintSidebar(
        dragState.current.startProgress,
        false,
      );
    }
  };

  const moveSidebarDrag = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!dragState.current.active) {
      return;
    }

    const width = getSidebarWidth();

    if (width <= 0) {
      return;
    }

    const delta = event.clientX - dragState.current.startX;
    const progress =
      dragState.current.startProgress +
      delta / width;

    paintSidebar(progress, false);
  };

  const endSidebarDrag = () => {
    if (!dragState.current.active) {
      return;
    }

    dragState.current.active = false;

    const shouldOpen = sidebarProgress >= 0.45;

    settleSidebar(shouldOpen);
  };

  useEffect(() => {
    if (!sidebarOpen) {
      paintSidebar(0, false);
    } else {
      paintSidebar(1, false);
    }
  }, [sidebarOpen, paintSidebar]);

  /*
   * ---------------------------------------------------------
   * MOBILE KEYBOARD
   *
   * O composer fica preso ao visual viewport.
   * Quando o teclado abre, o bottom sobe automaticamente.
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) {
      return;
    }

    let frame = 0;

    const updateKeyboardPosition = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        const viewportBottom =
          window.innerHeight -
          (viewport.height + viewport.offsetTop);

        const nextOffset = Math.max(
          0,
          Math.round(viewportBottom),
        );

        setKeyboardOffset(nextOffset);

        if (nextOffset > 0) {
          requestAnimationFrame(() => {
            const chat = chatRef.current;

            if (chat) {
              chat.scrollTop = chat.scrollHeight;
            }
          });
        }
      });
    };

    viewport.addEventListener(
      "resize",
      updateKeyboardPosition,
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboardPosition,
    );

    window.addEventListener(
      "resize",
      updateKeyboardPosition,
    );

    updateKeyboardPosition();

    return () => {
      cancelAnimationFrame(frame);

      viewport.removeEventListener(
        "resize",
        updateKeyboardPosition,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboardPosition,
      );

      window.removeEventListener(
        "resize",
        updateKeyboardPosition,
      );
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * AUTO SCROLL DO CHAT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const chat = chatRef.current;

    if (!chat) {
      return;
    }

    requestAnimationFrame(() => {
      chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, isLoading]);

  /*
   * ---------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------
   */

  const getAuthenticatedUser = useCallback(
    async () => {
      const {
        data,
        error,
      } = await supabase.auth.getUser();

      if (error || !data.user) {
        return null;
      }

      return data.user;
    },
    [],
  );

  /*
   * ---------------------------------------------------------
   * HISTÓRICO
   * ---------------------------------------------------------
   */

  const loadConversations = useCallback(
    async (currentUserId: string) => {
      const { data } = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at",
        )
        .eq("user_id", currentUserId)
        .order("updated_at", {
          ascending: false,
        })
        .limit(30);

      if (!data) {
        return;
      }

      setConversations(
        data as Conversation[],
      );
    },
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const initializeWorkspace = async () => {
      const user =
        await getAuthenticatedUser();

      if (cancelled || !user) {
        return;
      }

      setUserId(user.id);

      await loadConversations(user.id);
    };

    void initializeWorkspace();

    return () => {
      cancelled = true;
    };
  }, [
    getAuthenticatedUser,
    loadConversations,
  ]);

  /*
   * ---------------------------------------------------------
   * NOVA CONVERSA
   * ---------------------------------------------------------
   */

  const startNewConversation = () => {
    setMessages([]);
    setInput("");
    setErrorMessage("");
    setSidebarOpen(false);
    setSidebarProgress(0);

    if (sidebarRef.current) {
      sidebarRef.current.style.transform =
        "translate3d(-100%, 0, 0)";
    }

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /*
   * ---------------------------------------------------------
   * CRIA HISTÓRICO
   *
   * O histórico é salvo somente para o usuário autenticado.
   * O ID nunca é exibido na interface.
   * ---------------------------------------------------------
   */

  const saveConversationTitle = async (
    firstMessage: string,
  ) => {
    if (!userId) {
      return;
    }

    const title =
      firstMessage.length > 70
        ? `${firstMessage.slice(0, 67)}...`
        : firstMessage;

    const { data } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title,
      })
      .select(
        "id,title,created_at,updated_at",
      )
      .single();

    if (!data) {
      return;
    }

    const conversation =
      data as Conversation;

    setConversations((current) => [
      conversation,
      ...current.filter(
        (item) =>
          item.id !== conversation.id,
      ),
    ]);
  };

  /*
   * ---------------------------------------------------------
   * IA
   *
   * Mesma lógica do /ai-test:
   * VIP ativo -> decidly-ai
   * demais -> decidly-ai-free
   * ---------------------------------------------------------
   */

  const getAiFunction = async (
    currentUserId: string,
  ) => {
    const {
      data,
      error,
    } = await supabase
      .from("subscription")
      .select(
        "plan,status,expires_at",
      )
      .eq("user_id", currentUserId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return "decidly-ai-free";
    }

    const subscription =
      data as Subscription;

    const isVip =
      subscription.plan === "vip" ||
      subscription.plan === "VIP";

    const isActive =
      subscription.status === "active" ||
      subscription.status === "ACTIVE";

    const notExpired =
      !subscription.expires_at ||
      new Date(
        subscription.expires_at,
      ).getTime() > Date.now();

    if (
      isVip &&
      isActive &&
      notExpired
    ) {
      return "decidly-ai";
    }

    return "decidly-ai-free";
  };

  const getFriendlyAiError = (
    status?: number,
  ) => {
    if (status === 402) {
      return "Seu acesso atingiu o limite atual. Tente novamente mais tarde.";
    }

    if (status === 429) {
      return "A IA está recebendo muitas solicitações agora. Tente novamente em alguns segundos.";
    }

    if (
      status === 401 ||
      status === 403
    ) {
      return "Sua sessão precisa ser atualizada. Recarregue a página e tente novamente.";
    }

    if (
      status &&
      status >= 500
    ) {
      return "A IA está temporariamente indisponível. Tente novamente em instantes.";
    }

    return "Não consegui processar sua mensagem agora. Tente novamente.";
  };

  /*
   * ---------------------------------------------------------
   * ENVIO
   * ---------------------------------------------------------
   */

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    setInput("");
    setErrorMessage("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "58px";
    }

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);
    setIsLoading(true);

    try {
      const user =
        await getAuthenticatedUser();

      if (!user) {
        setErrorMessage(
          "Sua sessão expirou. Recarregue a página e tente novamente.",
        );

        return;
      }

      setUserId(user.id);

      const functionName =
        await getAiFunction(user.id);

      const history = nextMessages
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const {
        data,
        error,
      } = await supabase.functions.invoke(
        functionName,
        {
          body: {
            message: text,
            history,
          },
        },
      );

      if (error) {
        const context =
          (
            error as {
              context?: Response;
            }
          ).context;

        let status:
          | number
          | undefined;

        if (context) {
          status = context.status;
        }

        setErrorMessage(
          getFriendlyAiError(status),
        );

        return;
      }

      const responseData =
        data as {
          response?: unknown;
          answer?: unknown;
        } | null;

      const response =
        typeof responseData?.response ===
        "string"
          ? responseData.response
          : typeof responseData?.answer ===
              "string"
            ? responseData.answer
            : "";

      if (!response.trim()) {
        setErrorMessage(
          "A IA não retornou uma resposta. Tente novamente.",
        );

        return;
      }

      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: response,
        },
      ]);

      /*
       * O histórico é secundário.
       * Se o banco estiver indisponível, a resposta da IA
       * continua funcionando normalmente.
       */
      if (messages.length === 0) {
        void saveConversationTitle(text);
      }
    } catch {
      setErrorMessage(
        "Não consegui conectar à IA agora. Tente novamente em instantes.",
      );
    } finally {
      setIsLoading(false);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();

        const chat = chatRef.current;

        if (chat) {
          chat.scrollTop =
            chat.scrollHeight;
        }
      });
    }
  };

  const handleSubmit = (
    event: FormEvent,
  ) => {
    event.preventDefault();
    void sendMessage();
  };

  /*
   * ---------------------------------------------------------
   * TEXTAREA
   * ---------------------------------------------------------
   */

  const resizeTextarea = (
    element: HTMLTextAreaElement,
  ) => {
    element.style.height = "0px";

    const nextHeight = Math.min(
      Math.max(element.scrollHeight, 58),
      140,
    );

    element.style.height = `${nextHeight}px`;
  };

  const handleInput = (
    value: string,
    element: HTMLTextAreaElement,
  ) => {
    setInput(value);
    resizeTextarea(element);
  };

  const handleTextareaKeyDown = (
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleTextareaFocus = () => {
    requestAnimationFrame(() => {
      textareaRef.current?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
      });

      const chat = chatRef.current;

      if (chat) {
        chat.scrollTop =
          chat.scrollHeight;
      }
    });
  };

  /*
   * ---------------------------------------------------------
   * FILTRO
   * ---------------------------------------------------------
   */

  const filteredConversations =
    conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <AppShell>
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white">
        {/* =================================================
            SIDEBAR FIXA
            ================================================= */}

        <aside
          ref={sidebarRef}
          onPointerDown={startSidebarDrag}
          onPointerMove={moveSidebarDrag}
          onPointerUp={endSidebarDrag}
          onPointerCancel={endSidebarDrag}
          className="fixed inset-y-0 left-0 z-[100] flex w-[min(90vw,320px)] touch-pan-y flex-col bg-[#110c17] shadow-[20px_0_60px_rgba(0,0,0,0.35)]"
          style={{
            transform:
              "translate3d(-100%, 0, 0)",
            willChange: "transform",
          }}
        >
          {/* Sidebar header */}
          <div
            className="flex shrink-0 items-center justify-between px-4 py-4"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1b1225]">
                <Sparkles
                  size={17}
                  className="text-purple-300"
                />
              </div>

              <div>
                <p className="text-sm font-semibold">
                  Decidly
                </p>
                <p className="text-[11px] text-white/35">
                  Workspace
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                settleSidebar(false)
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/[0.05] hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          {/* Nova decisão */}
          <div
            className="px-3"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={startNewConversation}
              className="flex w-full items-center gap-3 rounded-xl bg-purple-600/90 px-4 py-3 text-sm font-medium transition hover:bg-purple-600 active:scale-[0.99]"
            >
              <Plus size={18} />
              Nova decisão
            </button>
          </div>

          {/* Busca */}
          <div
            className="px-3 pt-4"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.035] px-3 py-2.5">
              <Search
                size={16}
                className="shrink-0 text-white/30"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Buscar decisões..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          {/* Histórico */}
          <div
            className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <p className="mb-3 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
              Histórico
            </p>

            {filteredConversations.length ===
            0 ? (
              <div className="px-2 py-8 text-center text-xs text-white/25">
                Nenhuma decisão encontrada.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map(
                  (conversation) => (
                    <div
                      key={conversation.id}
                      className="rounded-xl px-3 py-3 text-sm text-white/55 transition hover:bg-white/[0.035] hover:text-white/80"
                    >
                      <p className="line-clamp-2 leading-5">
                        {conversation.title}
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Sidebar footer */}
          <div
            className="shrink-0 px-4 py-4"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="rounded-xl bg-white/[0.025] px-3 py-3 text-[11px] leading-5 text-white/25">
              Suas decisões ficam vinculadas à sua
              conta.
            </div>
          </div>
        </aside>

        {/* =================================================
            ÁREA PRINCIPAL
            ================================================= */}

        <main className="relative min-h-[100dvh]">
          {/* Backdrop somente atrás do sidebar */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() =>
              settleSidebar(false)
            }
            className={`fixed inset-0 z-[90] bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ${
              sidebarOpen
                ? "pointer-events-auto opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          />

          {/* =================================================
              TOPBAR
              ================================================= */}

          <header className="fixed inset-x-0 top-0 z-40 h-16 bg-[#0d0912]/90 backdrop-blur-xl">
            <div className="flex h-full items-center px-4">
              <button
                type="button"
                onClick={() =>
                  settleSidebar(true)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>

              <div className="ml-2 flex items-center gap-2">
                <img
                  src="/appicon.png"
                  alt="Decidly"
                  className="h-8 w-8 rounded-lg"
                />

                <div>
                  <p className="text-sm font-semibold tracking-tight">
                    Workspace
                  </p>
                  <p className="text-[10px] text-white/30">
                    Seu espaço de decisões
                  </p>
                </div>
              </div>
            </div>
          </header>

          {/* =================================================
              CHAT
              ================================================= */}

          <section
            ref={chatRef}
            className="h-[100dvh] overflow-y-auto overscroll-contain px-4 pt-24 pb-[180px]"
          >
            <div className="mx-auto w-full max-w-3xl">
              {/* Welcome */}
              {messages.length === 0 && (
                <div className="flex min-h-[calc(100dvh-300px)] flex-col items-center justify-center px-4 pb-8 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#191020] shadow-[0_0_50px_rgba(139,92,246,0.08)]">
                    <img
                      src="/appicon.png"
                      alt=""
                      className="h-11 w-11 rounded-xl"
                    />
                  </div>

                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    O que você está decidindo?
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-6 text-white/35">
                    Explique a situação, as opções que
                    você tem e o que está te deixando
                    em dúvida.
                  </p>
                </div>
              )}

              {/* Mensagens */}
              <div className="space-y-4">
                {messages.map(
                  (message, index) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role ===
                      "user" ? (
                        <div className="max-w-[85%] rounded-[20px] bg-purple-600/90 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-purple-950/20">
                          {message.content}
                        </div>
                      ) : (
                        <div className="max-w-[90%] rounded-[20px] bg-white/[0.045] px-4 py-3 text-sm leading-6 text-white/85">
                          <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:mb-2 prose-headings:mt-4 prose-ul:my-2 prose-ol:my-2 prose-li:my-0">
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                              ]}
                            >
                              {
                                message.content
                              }
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                )}

                {/* Loading */}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-[20px] bg-white/[0.045] px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/45" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/45 [animation-delay:150ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/45 [animation-delay:300ms]" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Erro amigável */}
                {errorMessage && (
                  <div className="mx-auto max-w-lg rounded-2xl bg-red-500/[0.07] px-4 py-3 text-center text-xs leading-5 text-red-200/75">
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* =================================================
              COMPOSER
              
              SEM BORDA.
              SEM OUTLINE.
              SEM RING.
              SEM BORDA AZUL.
              ================================================= */}

          <div
            className="fixed inset-x-0 z-50 px-3 sm:px-4"
            style={{
              bottom: keyboardOffset,
              paddingBottom:
                "calc(env(safe-area-inset-bottom) + 10px)",
            }}
          >
            <form
              onSubmit={handleSubmit}
              className="mx-auto w-full max-w-3xl"
            >
              <div className="rounded-[22px] bg-[#15101d]/95 p-2 shadow-[0_16px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) =>
                      handleInput(
                        event.target.value,
                        event.target,
                      )
                    }
                    onKeyDown={
                      handleTextareaKeyDown
                    }
                    onFocus={
                      handleTextareaFocus
                    }
                    disabled={isLoading}
                    rows={1}
                    placeholder="Escreva sua decisão..."
                    className="block min-h-[58px] max-h-[140px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-4 text-[15px] leading-6 text-white caret-purple-300 placeholder:text-white/25 focus:border-transparent focus:outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      border: "none",
                      outline: "none",
                      boxShadow: "none",
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      !input.trim() ||
                      isLoading
                    }
                    className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-[15px] bg-purple-600 text-white shadow-lg shadow-purple-950/25 transition hover:bg-purple-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-25"
                    aria-label="Enviar mensagem"
                  >
                    <Send
                      size={17}
                      strokeWidth={2.2}
                    />
                  </button>
                </div>
              </div>

              <p className="mt-2 text-center text-[10px] text-white/20">
                Ctrl + Enter para enviar
              </p>
            </form>
          </div>
        </main>

        {/* =================================================
            EDGE SWIPE
            ================================================= */}

        {!sidebarOpen && (
          <div
            className="fixed inset-y-0 left-0 z-[80] w-7 touch-pan-y"
            onPointerDown={
              startSidebarDrag
            }
            onPointerMove={
              moveSidebarDrag
            }
            onPointerUp={endSidebarDrag}
            onPointerCancel={
              endSidebarDrag
            }
            aria-hidden="true"
          />
        )}
      </div>
    </AppShell>
  );
}