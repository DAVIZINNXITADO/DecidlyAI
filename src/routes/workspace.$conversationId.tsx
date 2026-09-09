import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
  ChevronLeft,
  Menu,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { supabase } from "@/lib/supabase";

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
  created_at?: string;
};

type Conversation = {
  id: string;
  title: string;
};

type Subscription = {
  plan: string | null;
  status: string | null;
  expires_at: string | null;
};

export const Route = createFileRoute("/workspace/$conversationId")({
  component: ConversationPage,
});

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
) {
  const message = String(backendMessage || "").toLowerCase();

  if (
    status === 402 ||
    message.includes("crédito") ||
    message.includes("credit")
  ) {
    return "Desculpe pelo inconveniente, mas no momento você não possui créditos disponíveis para continuar usando a DecidlyAI. Pedimos desculpas pelo transtorno. Quando houver créditos disponíveis novamente, tente enviar sua mensagem outra vez.";
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite de requisições")
  ) {
    return "Opa, nosso serviço atingiu temporariamente o limite de requisições para esta IA. Pedimos desculpas pelo inconveniente e agradecemos pela sua paciência. Por favor, tente novamente mais tarde.";
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("authentication") ||
    message.includes("unauthorized")
  ) {
    return "Desculpe pelo inconveniente. No momento não consegui confirmar sua sessão corretamente. Por favor, tente entrar novamente e depois envie sua mensagem mais uma vez.";
  }

  if ([500, 502, 503, 504].includes(status || 0)) {
    return "Desculpe pelo inconveniente. Estou enfrentando uma dificuldade temporária no nosso serviço e não consegui processar sua mensagem agora. Por favor, tente novamente mais tarde.";
  }

  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("tempo limite")
  ) {
    return "Desculpe pelo inconveniente. Demorei mais do que o esperado para processar sua mensagem e não consegui concluir a resposta desta vez. Por favor, tente novamente mais tarde.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("conectar")
  ) {
    return "Desculpe pelo inconveniente. No momento estou com uma dificuldade temporária para me conectar ao nosso serviço. Por favor, tente novamente mais tarde.";
  }

  return "Desculpe pelo inconveniente. Ocorreu uma dificuldade temporária enquanto eu processava sua mensagem. Nossa equipe ou sistemas podem estar passando por uma instabilidade momentânea. Por favor, tente novamente mais tarde.";
}

async function getAiFunction() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw {
      status: 401,
      message: "Usuário não autenticado",
    };
  }

  const { data: subscription, error } = await supabase
    .from("subscription")
    .select("plan,status,expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  if (error) {
    console.error("Erro ao buscar assinatura:", error);
    return "decidly-ai-free";
  }

  const plan = String(subscription?.plan || "").toLowerCase();
  const status = String(subscription?.status || "").toLowerCase();

  const expired =
    subscription?.expires_at &&
    new Date(subscription.expires_at).getTime() <= Date.now();

  const vip =
    plan === "vip" &&
    (status === "active" || status === "ativo") &&
    !expired;

  return vip ? "decidly-ai" : "decidly-ai-free";
}

async function invokeAi(
  functionName: string,
  message: string,
  history: Message[],
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    functionName,
    {
      body: {
        message,
        history: history.slice(-12),
      },
    },
  );

  if (error) {
    const context = (error as any)?.context;

    let backendMessage = error.message;
    let status: number | undefined = context?.status;

    try {
      if (context instanceof Response) {
        status = context.status;

        const clone = context.clone();
        const json = await clone.json();

        if (json?.error) {
          backendMessage = json.error;
        }
      }
    } catch {
      // mantém mensagem original
    }

    throw {
      status,
      message: backendMessage,
    };
  }

  if (data?.error) {
    throw {
      status: data.status,
      message: data.error,
    };
  }

  if (!data?.response) {
    throw {
      status: 500,
      message: "A IA não retornou uma resposta.",
    };
  }

  return String(data.response);
}

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const navigate = Route.useNavigate();

  const [conversation, setConversation] =
    useState<Conversation | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const [pageLoading, setPageLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProgress, setSidebarProgress] = useState(0);

  const [history, setHistory] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");

  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sidebarRef = useRef<HTMLAsideElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const autoResponseRef = useRef(false);

  const paintSidebar = useCallback((value: number) => {
    const sidebar = sidebarRef.current;
    const backdrop = backdropRef.current;

    if (!sidebar || !backdrop) return;

    const progress = Math.max(0, Math.min(1, value));

    progressRef.current = progress;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    animationFrameRef.current = requestAnimationFrame(() => {
      const width = sidebar.offsetWidth;

      sidebar.style.transform = `translate3d(${
        -width + width * progress
      }px,0,0)`;

      backdrop.style.opacity = String(progress * 0.72);
      backdrop.style.pointerEvents =
        progress > 0.01 ? "auto" : "none";

      setSidebarProgress(progress);
    });
  }, []);

  const settleSidebar = useCallback(
    (open: boolean) => {
      const sidebar = sidebarRef.current;
      const backdrop = backdropRef.current;

      if (!sidebar || !backdrop) return;

      sidebar.style.transition =
        "transform .26s cubic-bezier(.22,1,.36,1)";

      backdrop.style.transition = "opacity .26s ease";

      paintSidebar(open ? 1 : 0);

      window.setTimeout(() => {
        if (!sidebarRef.current || !backdropRef.current) return;

        sidebarRef.current.style.transition = "none";
        backdropRef.current.style.transition = "none";
      }, 280);
    },
    [paintSidebar],
  );

  useEffect(() => {
    const sidebar = sidebarRef.current;

    if (!sidebar) return;

    sidebar.style.transform = `translate3d(-${sidebar.offsetWidth}px,0,0)`;
    sidebar.style.transition = "none";
  }, []);

  useEffect(() => {
    const onResize = () => {
      const sidebar = sidebarRef.current;

      if (!sidebar || draggingRef.current) return;

      const progress = progressRef.current;

      sidebar.style.transform = `translate3d(${
        -sidebar.offsetWidth +
        sidebar.offsetWidth * progress
      }px,0,0)`;
    };

    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const handlePointerDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      draggingRef.current = true;
      startXRef.current = event.clientX;
      startProgressRef.current = progressRef.current;

      const sidebar = sidebarRef.current;

      if (sidebar) {
        sidebar.style.transition = "none";
      }
    },
    [],
  );

  const handlePointerMove = useCallback(
    (event: PointerEvent) => {
      if (!draggingRef.current) return;

      const sidebar = sidebarRef.current;

      if (!sidebar) return;

      const delta = event.clientX - startXRef.current;
      const width = sidebar.offsetWidth;

      paintSidebar(
        startProgressRef.current + delta / width,
      );
    },
    [paintSidebar],
  );

  const handlePointerUp = useCallback(() => {
    if (!draggingRef.current) return;

    draggingRef.current = false;

    const delta =
      window.event instanceof PointerEvent
        ? window.event.clientX - startXRef.current
        : 0;

    if (Math.abs(delta) > 40) {
      settleSidebar(delta > 0);
      return;
    }

    settleSidebar(progressRef.current > 0.5);
  }, [settleSidebar]);

  useEffect(() => {
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  ]);

  async function loadHistory(userId: string) {
    const { data } = await supabase
      .from("conversations")
      .select("id,title")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);

    setHistory((data || []) as Conversation[]);
  }

  async function loadConversation() {
    setPageLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      await loadHistory(user.id);

      const { data: conversation, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id,title")
          .eq("id", conversationId)
          .eq("user_id", user.id)
          .maybeSingle();

      if (conversationError || !conversation) {
        await navigate({ to: "/workspace" });
        return;
      }

      setConversation(conversation as Conversation);

      const { data: rows, error: messagesError } =
        await supabase
          .from("messages")
          .select("id,role,content,created_at")
          .eq("conversation_id", conversationId)
          .order("created_at", { ascending: true });

      if (messagesError) {
        throw messagesError;
      }

      const loadedMessages = (rows || []) as Message[];

      setMessages(loadedMessages);

      /*
       * Se a conversa acabou de ser criada pelo workspace,
       * a última mensagem é do usuário.
       *
       * A resposta da IA começa automaticamente.
       */
      const last = loadedMessages.at(-1);

      if (
        last?.role === "user" &&
        !autoResponseRef.current
      ) {
        autoResponseRef.current = true;

        void respondToMessage(
          last.content,
          loadedMessages,
        );
      }
    } catch (error) {
      console.error(error);
    } finally {
      setPageLoading(false);
    }
  }

  useEffect(() => {
    autoResponseRef.current = false;
    void loadConversation();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollTo({
        top: element.scrollHeight,
        behavior: "smooth",
      });
    });
  }, [messages, aiLoading]);

  function resizeTextarea() {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      180,
    )}px`;
  }

  async function respondToMessage(
    text: string,
    currentMessages: Message[],
  ) {
    if (aiLoading) return;

    setAiLoading(true);

    const temporaryId = `ai-${Date.now()}`;

    setMessages((current) => [
      ...current,
      {
        id: temporaryId,
        role: "assistant",
        content: "",
      },
    ]);

    try {
      const functionName = await getAiFunction();

      const response = await invokeAi(
        functionName,
        text,
        currentMessages,
      );

      /*
       * Se a Edge Function ainda retorna a resposta inteira,
       * fazemos uma exibição progressiva no frontend.
       *
       * Quando a Edge Function tiver streaming real,
       * essa parte poderá consumir os chunks diretamente.
       */
      let visible = "";

      const words = response.split(/(\s+)/);

      for (const word of words) {
        visible += word;

        setMessages((current) =>
          current.map((item) =>
            item.id === temporaryId
              ? {
                  ...item,
                  content: visible,
                }
              : item,
          ),
        );

        await new Promise((resolve) =>
          requestAnimationFrame(resolve),
        );
      }

      const { data: savedMessage, error } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: "assistant",
          content: response,
        })
        .select("id,role,content,created_at")
        .single();

      if (error) {
        throw error;
      }

      setMessages((current) =>
        current.map((item) =>
          item.id === temporaryId
            ? (savedMessage as Message)
            : item,
        ),
      );

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } catch (error: any) {
      console.error(error);

      const friendly = getFriendlyAiError(
        error?.status,
        error?.message,
      );

      setMessages((current) =>
        current.map((item) =>
          item.id === temporaryId
            ? {
                ...item,
                content: friendly,
              }
            : item,
        ),
      );

      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: friendly,
      });
    } finally {
      setAiLoading(false);
    }
  }

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed || aiLoading) return;

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: trimmed,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        role: "user",
        content: trimmed,
      });

    if (error) {
      console.error(error);

      setMessages(messages);
      setInput(trimmed);

      return;
    }

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    void respondToMessage(trimmed, nextMessages);
  }

  async function deleteConversation(id: string) {
    const confirmed = window.confirm(
      "Excluir esta conversa?",
    );

    if (!confirmed) return;

    await supabase
      .from("messages")
      .delete()
      .eq("conversation_id", id);

    await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (id === conversationId) {
      await navigate({ to: "/workspace" });
      return;
    }

    setHistory((current) =>
      current.filter((item) => item.id !== id),
    );
  }

  const filteredHistory = history.filter((item) =>
    item.title
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  if (pageLoading && !conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0d0a11] text-white/40">
        <div className="flex items-center gap-2 text-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#7651e8]" />
          Carregando...
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0d0a11] text-white">
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black"
        style={{
          opacity: 0,
          pointerEvents: "none",
        }}
        onClick={() => settleSidebar(false)}
      />

      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(86vw,320px)] flex-col border-r border-white/[0.08] bg-[#141019] shadow-2xl shadow-black/50"
        style={{
          transform: "translate3d(-100%,0,0)",
          willChange: "transform",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <div className="flex items-center gap-2.5">
            <img
              src="/appicon.png"
              alt="DecidlyAI"
              className="h-8 w-8 rounded-lg object-cover"
              onError={(event) => {
                event.currentTarget.src = "/favicon.ico";
              }}
            />

            <span className="font-semibold">
              DecidlyAI
            </span>
          </div>

          <button
            type="button"
            onClick={() => settleSidebar(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-3">
          <button
            type="button"
            onClick={() => {
              void navigate({ to: "/workspace" });
            }}
            className="flex w-full items-center gap-2.5 rounded-xl bg-[#7651e8] px-3.5 py-3 text-sm font-medium transition hover:bg-[#8564ed]"
          >
            <Plus size={18} />
            Nova decisão
          </button>
        </div>

        <div className="px-3 pb-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Search size={16} className="text-white/30" />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Pesquisar conversas"
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/25"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2">
          <p className="px-3 py-2 text-[10px] font-medium uppercase tracking-wider text-white/25">
            Histórico
          </p>

          <div className="space-y-1">
            {filteredHistory.map((item) => (
              <div
                key={item.id}
                className={`group flex items-center rounded-xl transition ${
                  item.id === conversationId
                    ? "bg-white/[0.07]"
                    : "hover:bg-white/[0.04]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    void navigate({
                      to: "/workspace/$conversationId",
                      params: {
                        conversationId: item.id,
                      },
                    });

                    settleSidebar(false);
                  }}
                  className="min-w-0 flex-1 px-3 py-3 text-left text-sm text-white/65"
                >
                  <span className="block truncate">
                    {item.title || "Nova decisão"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void deleteConversation(item.id)
                  }
                  className="mr-1 hidden h-8 w-8 items-center justify-center rounded-lg text-white/25 transition hover:bg-red-500/10 hover:text-red-300 group-hover:flex"
                  aria-label="Excluir conversa"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}

            {filteredHistory.length === 0 && (
              <p className="px-3 py-8 text-center text-xs text-white/25">
                Nenhuma conversa encontrada.
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-white/[0.06] p-4">
          <div className="text-xs text-white/30">
            DecidlyAI
          </div>

          <div className="mt-1 text-xs text-white/20">
            Seu espaço para decisões.
          </div>
        </div>
      </aside>

      {/* APP */}
      <div className="relative flex h-full min-w-0 flex-col">
        <header className="z-30 flex h-[68px] shrink-0 items-center px-4">
          <button
            type="button"
            onClick={() => settleSidebar(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/[0.06] hover:text-white"
            aria-label="Abrir sidebar"
          >
            <Menu size={21} />
          </button>

          <div className="ml-2 min-w-0">
            <div className="truncate text-sm font-medium">
              {conversation?.title || "Nova decisão"}
            </div>

            <div className="text-[10px] text-white/25">
              DecidlyAI
            </div>
          </div>
        </header>

        {/* MENSAGENS */}
        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto px-4"
        >
          <div className="mx-auto w-full max-w-[720px] pb-[210px] pt-4">
            {messages.map((message) => (
              <div
                key={message.id || `${message.role}-${message.content}`}
                className={`mb-6 flex ${
                  message.role === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <img
                    src="/appicon.png"
                    alt="DecidlyAI"
                    className="mr-3 mt-1 h-7 w-7 shrink-0 rounded-lg object-cover"
                    onError={(event) => {
                      event.currentTarget.src =
                        "/favicon.ico";
                    }}
                  />
                )}

                <div
                  className={
                    message.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-[#7651e8] px-4 py-3 text-[15px] leading-6"
                      : "max-w-[88%] text-[15px] leading-7 text-white/80"
                  }
                >
                  {message.role === "assistant" ? (
                    message.content ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => (
                            <p className="mb-3 last:mb-0">
                              {children}
                            </p>
                          ),
                          ul: ({ children }) => (
                            <ul className="mb-3 list-disc space-y-1 pl-5">
                              {children}
                            </ul>
                          ),
                          ol: ({ children }) => (
                            <ol className="mb-3 list-decimal space-y-1 pl-5">
                              {children}
                            </ol>
                          ),
                          code: ({
                            children,
                            className,
                          }) => (
                            <code
                              className={`${className || ""} rounded bg-white/[0.07] px-1.5 py-0.5`}
                            >
                              {children}
                            </code>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <span className="inline-flex gap-1 py-2">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-.2s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-.1s]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                      </span>
                    )
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}

            {aiLoading && messages.at(-1)?.role === "user" && (
              <div className="mb-6 flex justify-start">
                <img
                  src="/appicon.png"
                  alt="DecidlyAI"
                  className="mr-3 mt-1 h-7 w-7 rounded-lg object-cover"
                  onError={(event) => {
                    event.currentTarget.src =
                      "/favicon.ico";
                  }}
                />

                <div className="flex items-center gap-1 py-2">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-.2s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:-.1s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* COMPOSER */}
        <div
          className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3"
          style={{
            bottom:
              "max(0px, env(keyboard-inset-height, 0px))",
          }}
        >
          <div className="mx-auto max-w-[720px]">
            <div className="flex items-end gap-2 rounded-2xl bg-[#141019] px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,.4)]">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeTextarea();
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey
                  ) {
                    event.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder="Continue a decisão..."
                className="max-h-[180px] min-h-[44px] flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 text-white outline-none placeholder:text-white/25"
              />

              <button
                type="button"
                onClick={() => void sendMessage()}
                disabled={!input.trim() || aiLoading}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7651e8] text-white transition hover:bg-[#8564ed] disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Enviar"
              >
                <ArrowUp size={19} strokeWidth={2.2} />
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] leading-4 text-white/20">
              A DecidlyAI pode cometer erros. Analise a resposta antes
              de tomar uma decisão importante.
            </p>
          </div>
        </div>
      </div>

      {/* Pequena área lateral para iniciar o gesto */}
      <div
        className="pointer-events-none fixed left-0 top-[68px] z-20 h-[calc(100dvh-68px)] w-5"
        aria-hidden="true"
      />

      {sidebarProgress > 0 && (
        <button
          type="button"
          className="sr-only"
          onClick={() => settleSidebar(false)}
        >
          Fechar menu
        </button>
      )}
    </div>
  );
}