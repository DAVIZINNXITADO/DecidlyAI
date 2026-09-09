import {
  createFileRoute,
} from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
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

function Workspace() {
  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [sidebarProgress, setSidebarProgress] =
    useState(0);

  const [search, setSearch] = useState("");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [messages, setMessages] =
    useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const [userId, setUserId] =
    useState<string | null>(null);

  /*
   * Altura real ocupada pelo teclado.
   *
   * IMPORTANTE:
   * Não usamos isso para criar espaço no chat.
   * Usamos somente para mover o composer.
   */
  const [keyboardOffset, setKeyboardOffset] =
    useState(0);

  const sidebarRef =
    useRef<HTMLElement | null>(null);

  const chatRef =
    useRef<HTMLElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const dragState = useRef({
    active: false,
    startX: 0,
    startProgress: 0,
  });

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const getSidebarWidth = useCallback(() => {
    if (sidebarRef.current) {
      return sidebarRef.current.getBoundingClientRect()
        .width;
    }

    return Math.min(
      SIDEBAR_MAX_WIDTH,
      window.innerWidth * 0.9,
    );
  }, []);

  const paintSidebar = useCallback(
    (
      progress: number,
      animate = false,
    ) => {
      const safeProgress = Math.max(
        0,
        Math.min(1, progress),
      );

      setSidebarProgress(
        safeProgress,
      );

      if (sidebarRef.current) {
        sidebarRef.current.style.transition =
          animate
            ? "transform 220ms cubic-bezier(.2,.8,.2,1)"
            : "none";

        sidebarRef.current.style.transform =
          `translate3d(${
            -100 + safeProgress * 100
          }%, 0, 0)`;
      }
    },
    [],
  );

  const settleSidebar = useCallback(
    (open: boolean) => {
      setSidebarOpen(open);

      paintSidebar(
        open ? 1 : 0,
        true,
      );
    },
    [paintSidebar],
  );

  const startSidebarDrag = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    dragState.current = {
      active: true,
      startX: event.clientX,
      startProgress: sidebarOpen
        ? 1
        : sidebarProgress,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  };

  const moveSidebarDrag = (
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (!dragState.current.active) {
      return;
    }

    const width = getSidebarWidth();

    if (!width) {
      return;
    }

    const delta =
      event.clientX -
      dragState.current.startX;

    const progress =
      dragState.current.startProgress +
      delta / width;

    paintSidebar(
      progress,
      false,
    );
  };

  const endSidebarDrag = () => {
    if (!dragState.current.active) {
      return;
    }

    dragState.current.active = false;

    const shouldOpen =
      sidebarProgress >= 0.45;

    setSidebarOpen(shouldOpen);

    paintSidebar(
      shouldOpen ? 1 : 0,
      true,
    );
  };

  useEffect(() => {
    paintSidebar(
      sidebarOpen ? 1 : 0,
      false,
    );
  }, [
    sidebarOpen,
    paintSidebar,
  ]);

  /*
   * ============================================================
   * TECLADO MOBILE
   *
   * O composer é deslocado por TRANSFORM.
   *
   * Isso evita:
   * - rodapé gigante
   * - espaço vazio
   * - alteração da altura do chat
   * - composer ficando atrás do teclado
   * ============================================================
   */

  useEffect(() => {
    const viewport =
      window.visualViewport;

    if (!viewport) {
      return;
    }

    let frame = 0;

    const updateKeyboard = () => {
      cancelAnimationFrame(frame);

      frame =
        requestAnimationFrame(() => {
          /*
           * O visualViewport diminui quando o teclado
           * aparece.
           */
          const keyboardHeight =
            Math.max(
              0,
              Math.round(
                window.innerHeight -
                  viewport.height -
                  viewport.offsetTop,
              ),
            );

          setKeyboardOffset(
            keyboardHeight,
          );

          /*
           * Quando o teclado aparece, mantém o final
           * do chat visível.
           */
          if (keyboardHeight > 0) {
            const chat =
              chatRef.current;

            if (chat) {
              chat.scrollTop =
                chat.scrollHeight;
            }
          }
        });
    };

    viewport.addEventListener(
      "resize",
      updateKeyboard,
      { passive: true },
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboard,
      { passive: true },
    );

    window.addEventListener(
      "resize",
      updateKeyboard,
      { passive: true },
    );

    updateKeyboard();

    return () => {
      cancelAnimationFrame(frame);

      viewport.removeEventListener(
        "resize",
        updateKeyboard,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboard,
      );

      window.removeEventListener(
        "resize",
        updateKeyboard,
      );
    };
  }, []);

  /*
   * ============================================================
   * AUTO SCROLL
   * ============================================================
   */

  useEffect(() => {
    const chat =
      chatRef.current;

    if (!chat) {
      return;
    }

    requestAnimationFrame(() => {
      chat.scrollTo({
        top: chat.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [
    messages,
    isLoading,
  ]);

  /*
   * ============================================================
   * AUTH
   * ============================================================
   */

  const getAuthenticatedUser =
    useCallback(async () => {
      const {
        data,
        error,
      } =
        await supabase.auth.getUser();

      if (
        error ||
        !data.user
      ) {
        return null;
      }

      return data.user;
    }, []);

  /*
   * ============================================================
   * HISTÓRICO
   * ============================================================
   */

  const loadConversations =
    useCallback(
      async (
        currentUserId: string,
      ) => {
        const { data } =
          await supabase
            .from("conversations")
            .select(
              "id,title,created_at,updated_at",
            )
            .eq(
              "user_id",
              currentUserId,
            )
            .order(
              "updated_at",
              {
                ascending: false,
              },
            )
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

    const initialize =
      async () => {
        const user =
          await getAuthenticatedUser();

        if (
          !user ||
          cancelled
        ) {
          return;
        }

        setUserId(user.id);

        await loadConversations(
          user.id,
        );
      };

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [
    getAuthenticatedUser,
    loadConversations,
  ]);

  /*
   * ============================================================
   * NOVA DECISÃO
   * ============================================================
   */

  const startNewConversation =
    () => {
      setMessages([]);
      setInput("");
      setErrorMessage("");

      settleSidebar(false);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    };

  /*
   * ============================================================
   * SALVAR CONVERSA
   * ============================================================
   */

  const saveConversationTitle =
    async (
      firstMessage: string,
    ) => {
      if (!userId) {
        return;
      }

      const title =
        firstMessage.length > 70
          ? `${firstMessage.slice(
              0,
              67,
            )}...`
          : firstMessage;

      const { data } =
        await supabase
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

      setConversations(
        (current) => [
          conversation,
          ...current.filter(
            (item) =>
              item.id !==
              conversation.id,
          ),
        ],
      );
    };

  /*
   * ============================================================
   * IA
   *
   * MESMA LÓGICA DO AI-TEST
   * ============================================================
   */

  const getAiFunction =
    async (
      currentUserId: string,
    ) => {
      const {
        data,
        error,
      } =
        await supabase
          .from("subscription")
          .select(
            "plan,status,expires_at",
          )
          .eq(
            "user_id",
            currentUserId,
          )
          .order(
            "created_at",
            {
              ascending: false,
            },
          )
          .limit(1)
          .maybeSingle();

      if (
        error ||
        !data
      ) {
        return "decidly-ai-free";
      }

      const subscription =
        data as Subscription;

      const isVip =
        subscription.plan ===
          "vip" ||
        subscription.plan ===
          "VIP";

      const isActive =
        subscription.status ===
          "active" ||
        subscription.status ===
          "ACTIVE";

      const notExpired =
        !subscription.expires_at ||
        new Date(
          subscription.expires_at,
        ).getTime() >
          Date.now();

      if (
        isVip &&
        isActive &&
        notExpired
      ) {
        return "decidly-ai";
      }

      return "decidly-ai-free";
    };

  /*
   * ============================================================
   * ERROS AMIGÁVEIS
   * ============================================================
   */

  const getFriendlyAiError = (
    status?: number,
  ) => {
    if (status === 402) {
      return "Seu acesso atingiu o limite atual. Tente novamente mais tarde.";
    }

    if (status === 429) {
      return "A DecidlyAI está recebendo muitas solicitações agora. Tente novamente em alguns segundos.";
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
      return "A DecidlyAI está temporariamente indisponível. Tente novamente em instantes.";
    }

    return "Não consegui processar sua mensagem agora. Tente novamente.";
  };

  /*
   * ============================================================
   * ENVIAR MENSAGEM
   * ============================================================
   */

  const sendMessage =
    async () => {
      const text =
        input.trim();

      if (
        !text ||
        isLoading
      ) {
        return;
      }

      setInput("");
      setErrorMessage("");

      if (
        textareaRef.current
      ) {
        textareaRef.current.style.height =
          "58px";
      }

      const userMessage: ChatMessage =
        {
          role: "user",
          content: text,
        };

      const nextMessages = [
        ...messages,
        userMessage,
      ];

      setMessages(
        nextMessages,
      );

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
          await getAiFunction(
            user.id,
          );

        const history =
          nextMessages
            .slice(-12)
            .map(
              (message) => ({
                role:
                  message.role,
                content:
                  message.content,
              }),
            );

        const {
          data,
          error,
        } =
          await supabase.functions.invoke(
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

          setErrorMessage(
            getFriendlyAiError(
              context?.status,
            ),
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

        if (
          !response.trim()
        ) {
          setErrorMessage(
            "A DecidlyAI não retornou uma resposta. Tente novamente.",
          );

          return;
        }

        setMessages(
          (current) => [
            ...current,
            {
              role: "assistant",
              content:
                response,
            },
          ],
        );

        if (
          messages.length === 0
        ) {
          void saveConversationTitle(
            text,
          );
        }
      } catch {
        setErrorMessage(
          "Não consegui conectar à DecidlyAI agora. Tente novamente em instantes.",
        );
      } finally {
        setIsLoading(false);

        requestAnimationFrame(() => {
          textareaRef.current?.focus();

          const chat =
            chatRef.current;

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
   * ============================================================
   * TEXTAREA
   * ============================================================
   */

  const resizeTextarea =
    (
      element: HTMLTextAreaElement,
    ) => {
      element.style.height =
        "0px";

      const nextHeight =
        Math.min(
          Math.max(
            element.scrollHeight,
            58,
          ),
          140,
        );

      element.style.height =
        `${nextHeight}px`;
    };

  const handleInput = (
    value: string,
    element: HTMLTextAreaElement,
  ) => {
    setInput(value);

    resizeTextarea(
      element,
    );
  };

  const handleTextareaKeyDown =
    (
      event: KeyboardEvent<HTMLTextAreaElement>,
    ) => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey ||
          event.metaKey)
      ) {
        event.preventDefault();

        void sendMessage();
      }
    };

  /*
   * Quando o usuário toca no textbox,
   * garantimos que ele fique visível.
   */
  const handleTextareaFocus =
    () => {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView(
          {
            block: "nearest",
            inline: "nearest",
          },
        );

        const chat =
          chatRef.current;

        if (chat) {
          chat.scrollTop =
            chat.scrollHeight;
        }
      }, 50);
    };

  const filteredConversations =
    conversations.filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          ),
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <AppShell>
      <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white">
        {/* ======================================================
            SIDEBAR FIXO
            ====================================================== */}

        <aside
          ref={sidebarRef}
          onPointerDown={
            startSidebarDrag
          }
          onPointerMove={
            moveSidebarDrag
          }
          onPointerUp={
            endSidebarDrag
          }
          onPointerCancel={
            endSidebarDrag
          }
          className="fixed inset-y-0 left-0 z-[100] flex w-[min(90vw,320px)] touch-pan-y flex-col bg-[#110c17] shadow-[20px_0_60px_rgba(0,0,0,0.35)]"
          style={{
            transform:
              "translate3d(-100%,0,0)",
            willChange:
              "transform",
          }}
        >
          <div
            className="flex shrink-0 items-center justify-between px-4 py-4"
            onPointerDown={(
              event,
            ) =>
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
                  DecidlyAI
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                settleSidebar(
                  false,
                )
              }
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 transition hover:bg-white/[0.05] hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="px-3"
            onPointerDown={(
              event,
            ) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              onClick={
                startNewConversation
              }
              className="flex w-full items-center gap-3 rounded-xl bg-purple-600/90 px-4 py-3 text-sm font-medium transition hover:bg-purple-600"
            >
              <Plus size={18} />
              Nova decisão
            </button>
          </div>

          <div
            className="px-3 pt-4"
            onPointerDown={(
              event,
            ) =>
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
                onChange={(
                  event,
                ) =>
                  setSearch(
                    event.target
                      .value,
                  )
                }
                placeholder="Buscar decisões..."
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/25"
              />
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto px-3 py-5"
            onPointerDown={(
              event,
            ) =>
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
                  (
                    conversation,
                  ) => (
                    <div
                      key={
                        conversation.id
                      }
                      className="rounded-xl px-3 py-3 text-sm text-white/55 transition hover:bg-white/[0.035] hover:text-white/80"
                    >
                      <p className="line-clamp-2 leading-5">
                        {
                          conversation.title
                        }
                      </p>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        </aside>

        {/* ======================================================
            BACKDROP
            ====================================================== */}

        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() =>
            settleSidebar(
              false,
            )
          }
          className={`fixed inset-0 z-[90] bg-black/45 backdrop-blur-[1px] transition-opacity duration-200 ${
            sidebarOpen
              ? "pointer-events-auto opacity-100"
              : "pointer-events-none opacity-0"
          }`}
        />

        {/* ======================================================
            ÁREA PRINCIPAL
            ====================================================== */}

        <main className="relative min-h-[100dvh]">
          {/* TOPBAR */}

          <header className="fixed inset-x-0 top-0 z-40 h-16 bg-[#0d0912]/90 backdrop-blur-xl">
            <div className="flex h-full items-center px-4">
              <button
                type="button"
                onClick={() =>
                  settleSidebar(
                    true,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/65 transition hover:bg-white/[0.05] hover:text-white"
                aria-label="Abrir menu"
              >
                <Menu size={20} />
              </button>

              <div className="ml-2 flex items-center gap-2">
                <img
                  src="/appicon.png"
                  alt="DecidlyAI"
                  className="h-8 w-8 rounded-lg"
                />

                <p className="text-sm font-semibold tracking-tight">
                  DecidlyAI
                </p>
              </div>
            </div>
          </header>

          {/* ====================================================
              CHAT

              NÃO TEM PB-[180px]
              NÃO TEM RODAPÉ ARTIFICIAL
              ==================================================== */}

          <section
            ref={chatRef}
            className="h-[100dvh] overflow-y-auto overscroll-contain px-4 pt-24 pb-28"
          >
            <div className="mx-auto w-full max-w-3xl">
              {/* WELCOME */}

              {messages.length ===
                0 && (
                <div className="flex min-h-[calc(100dvh-260px)] flex-col items-center justify-center px-4 pb-8 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#191020] shadow-[0_0_50px_rgba(139,92,246,0.08)]">
                    <img
                      src="/appicon.png"
                      alt=""
                      className="h-11 w-11 rounded-xl"
                    />
                  </div>

                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    O que você está
                    decidindo?
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-6 text-white/35">
                    Explique a situação,
                    as opções que você
                    tem e o que está te
                    deixando em dúvida.
                  </p>
                </div>
              )}

              {/* MENSAGENS */}

              <div className="space-y-4">
                {messages.map(
                  (
                    message,
                    index,
                  ) => (
                    <div
                      key={`${message.role}-${index}`}
                      className={`flex ${
                        message.role ===
                        "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      {message.role ===
                      "user" ? (
                        <div className="max-w-[85%] rounded-[20px] bg-purple-600/90 px-4 py-3 text-sm leading-6 text-white shadow-lg shadow-purple-950/20">
                          {
                            message.content
                          }
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

                {/* ==================================================
                    LOADING
                    ================================================== */}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="rounded-[20px] bg-white/[0.045] px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Sparkles
                          size={14}
                          className="text-purple-300"
                        />

                        <span className="text-xs text-white/45">
                          DecidlyAI está
                          pensando...
                        </span>

                        <div className="ml-1 flex gap-1">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40" />

                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40 [animation-delay:150ms]" />

                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/40 [animation-delay:300ms]" />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="mx-auto max-w-lg rounded-2xl bg-red-500/[0.07] px-4 py-3 text-center text-xs leading-5 text-red-200/75">
                    {
                      errorMessage
                    }
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* ====================================================
              COMPOSER

              AQUI ESTÁ A CORREÇÃO PRINCIPAL.

              O composer não usa bottom para acompanhar
              o teclado.

              Ele fica em bottom: 0 e é levantado pelo
              translate3d.

              SEM BORDA.
              ==================================================== */}

          <div
            className="fixed inset-x-0 bottom-0 z-50 px-3 sm:px-4"
            style={{
              transform: `translate3d(0, -${keyboardOffset}px, 0)`,
              willChange:
                "transform",
              paddingBottom:
                "10px",
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
                    onChange={(
                      event,
                    ) =>
                      handleInput(
                        event.target
                          .value,
                        event.target,
                      )
                    }
                    onKeyDown={
                      handleTextareaKeyDown
                    }
                    onFocus={
                      handleTextareaFocus
                    }
                    disabled={
                      isLoading
                    }
                    rows={1}
                    placeholder="Escreva sua decisão..."
                    className="block min-h-[58px] max-h-[140px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-4 text-[15px] leading-6 text-white caret-purple-300 placeholder:text-white/25 disabled:cursor-not-allowed disabled:opacity-50"
                    style={{
                      border:
                        "none",
                      outline:
                        "none",
                      boxShadow:
                        "none",
                      WebkitAppearance:
                        "none",
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

              {/* AVISO ORIGINAL */}

              <p className="mt-2 text-center text-[10px] text-white/20">
                A DecidlyAI pode cometer
                erros. Verifique informações
                importantes.
              </p>
            </form>
          </div>
        </main>

        {/* ======================================================
            SWIPE EDGE
            ====================================================== */}

        {!sidebarOpen && (
          <div
            className="fixed inset-y-0 left-0 z-[80] w-7 touch-pan-y"
            onPointerDown={
              startSidebarDrag
            }
            onPointerMove={
              moveSidebarDrag
            }
            onPointerUp={
              endSidebarDrag
            }
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