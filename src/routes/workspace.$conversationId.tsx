import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
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
  id: string;
  conversation_id?: string;
  user_id?: string;
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

export const Route = createFileRoute(
  "/workspace/$conversationId",
)({
  component: ConversationPage,
});

function friendlyError(status?: number, message?: string) {
  const text = String(message || "").toLowerCase();

  if (
    status === 402 ||
    text.includes("crédito") ||
    text.includes("credit")
  ) {
    return "Desculpe pelo inconveniente, mas no momento você não possui créditos disponíveis para continuar usando a DecidlyAI. Pedimos desculpas pelo transtorno. Quando houver créditos disponíveis novamente, tente enviar sua mensagem outra vez.";
  }

  if (
    status === 429 ||
    text.includes("quota") ||
    text.includes("rate limit") ||
    text.includes("resource_exhausted")
  ) {
    return "Opa, nosso serviço atingiu temporariamente o limite de requisições para esta IA. Pedimos desculpas pelo inconveniente e agradecemos pela sua paciência. Por favor, tente novamente mais tarde.";
  }

  if (status === 401 || status === 403) {
    return "Desculpe pelo inconveniente. No momento não consegui confirmar sua sessão corretamente. Por favor, tente entrar novamente e depois envie sua mensagem mais uma vez.";
  }

  if ([500, 502, 503, 504].includes(status || 0)) {
    return "Desculpe pelo inconveniente. Estou enfrentando uma dificuldade temporária no nosso serviço e não consegui processar sua mensagem agora. Por favor, tente novamente mais tarde.";
  }

  return "Desculpe pelo inconveniente. Ocorreu uma dificuldade temporária enquanto eu processava sua mensagem. Por favor, tente novamente mais tarde.";
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

  const { data, error } = await supabase
    .from("subscriptions")
    .select("plan,status,expires_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  if (error) {
    console.error(error);
    return "decidly-ai-free";
  }

  const plan = String(data?.plan || "").toLowerCase();
  const status = String(data?.status || "").toLowerCase();

  const expired =
    data?.expires_at &&
    new Date(data.expires_at).getTime() <= Date.now();

  const vip =
    plan === "vip" &&
    (status === "active" || status === "ativo") &&
    !expired;

  return vip ? "decidly-ai" : "decidly-ai-free";
}

async function askAi(
  functionName: string,
  message: string,
  history: Message[],
) {
  const { data, error } = await supabase.functions.invoke(
    functionName,
    {
      body: {
        message,
        history: history.slice(-12).map((item) => ({
          role: item.role,
          content: item.content,
        })),
      },
    },
  );

  if (error) {
    const status = (error as any)?.context?.status;

    throw {
      status,
      message: error.message,
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
  const [history, setHistory] = useState<Conversation[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sidebarRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const progressRef = useRef(0);
  const draggingRef = useRef(false);
  const startXRef = useRef(0);
  const startProgressRef = useRef(0);
  const lastXRef = useRef(0);
  const frameRef = useRef<number | null>(null);

  const autoReplyRef = useRef(false);

  const paint = useCallback((value: number) => {
    const sidebar = sidebarRef.current;
    const backdrop = backdropRef.current;

    if (!sidebar || !backdrop) return;

    const progress = Math.max(0, Math.min(1, value));

    progressRef.current = progress;

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }

    frameRef.current = requestAnimationFrame(() => {
      const width = sidebar.offsetWidth;

      sidebar.style.transform =
        `translate3d(${-width + width * progress}px,0,0)`;

      backdrop.style.opacity = String(progress * 0.72);
      backdrop.style.pointerEvents =
        progress > 0.01 ? "auto" : "none";
    });
  }, []);

  const settle = useCallback(
    (open: boolean) => {
      const sidebar = sidebarRef.current;
      const backdrop = backdropRef.current;

      if (!sidebar || !backdrop) return;

      sidebar.style.transition =
        "transform .26s cubic-bezier(.22,1,.36,1)";

      backdrop.style.transition = "opacity .26s ease";

      paint(open ? 1 : 0);

      setSidebarOpen(open);

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

  /*
   * GESTO GLOBAL:
   * direita = abre
   * esquerda = fecha
   */
  useEffect(() => {
    function down(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      draggingRef.current = true;
      startXRef.current = event.clientX;
      lastXRef.current = event.clientX;
      startProgressRef.current = progressRef.current;

      if (sidebarRef.current) {
        sidebarRef.current.style.transition = "none";
      }
    }

    function move(event: PointerEvent) {
      if (!draggingRef.current) return;

      lastXRef.current = event.clientX;

      const sidebar = sidebarRef.current;

      if (!sidebar) return;

      const delta = event.clientX - startXRef.current;
      const width = sidebar.offsetWidth;

      paint(
        startProgressRef.current +
          delta / width,
      );
    }

    function up() {
      if (!draggingRef.current) return;

      draggingRef.current = false;

      const delta =
        lastXRef.current - startXRef.current;

      if (Math.abs(delta) > 35) {
        settle(delta > 0);
      } else {
        settle(progressRef.current > 0.5);
      }
    }

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [paint, settle]);

  useEffect(() => {
    const sidebar = sidebarRef.current;

    if (!sidebar) return;

    sidebar.style.transform =
      `translate3d(-${sidebar.offsetWidth}px,0,0)`;
  }, []);

  async function loadConversation() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id,title")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(50);

      setHistory(
        (conversations || []) as Conversation[],
      );

      const { data: current, error } = await supabase
        .from("conversations")
        .select("id,title")
        .eq("id", conversationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error || !current) {
        await navigate({ to: "/workspace" });
        return;
      }

      setConversation(current as Conversation);

      const { data: rows, error: messageError } =
        await supabase
          .from("messages")
          .select(
            "id,conversation_id,user_id,role,content,created_at",
          )
          .eq("conversation_id", conversationId)
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

      if (messageError) {
        throw messageError;
      }

      const loaded = (rows || []) as Message[];

      setMessages(loaded);

      const last = loaded.at(-1);

      if (
        last?.role === "user" &&
        !autoReplyRef.current
      ) {
        autoReplyRef.current = true;
        void respond(last.content, loaded);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    autoReplyRef.current = false;
    void loadConversation();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    const element = contentRef.current;

    if (!element) return;

    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
    });
  }, [messages, aiLoading]);

  async function respond(
    text: string,
    currentMessages: Message[],
  ) {
    if (aiLoading) return;

    setAiLoading(true);

    const temporaryId = `temporary-${Date.now()}`;

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

      const response = await askAi(
        functionName,
        text,
        currentMessages,
      );

      /*
       * Exibição progressiva.
       *
       * Quando a Edge Function passar a enviar
       * streaming real, essa parte pode consumir
       * os chunks diretamente.
       */
      let visible = "";

      const pieces = response.split(/(\s+)/);

      for (const piece of pieces) {
        visible += piece;

        setMessages((current) =>
          current.map((message) =>
            message.id === temporaryId
              ? {
                  ...message,
                  content: visible,
                }
              : message,
          ),
        );

        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => resolve()),
        );
      }

      const {
        data: saved,
        error: saveError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: (
            await supabase.auth.getUser()
          ).data.user?.id,
          role: "assistant",
          content: response,
        })
        .select(
          "id,conversation_id,user_id,role,content,created_at",
        )
        .single();

      if (saveError || !saved) {
        throw saveError || new Error("Falha salvando resposta.");
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryId
            ? (saved as Message)
            : message,
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

      const friendly = friendlyError(
        error?.status,
        error?.message,
      );

      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryId
            ? {
                ...message,
                content: friendly,
              }
            : message,
        ),
      );

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase.from("messages").insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: friendly,
        });
      }
    } finally {
      setAiLoading(false);
    }
  }

  async function sendMessage() {
    const trimmed = input.trim();

    if (!trimmed || aiLoading) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      await navigate({ to: "/login" });
      return;
    }

    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const localMessage: Message = {
      id: `local-${Date.now()}`,
      conversation_id: conversationId,
      user_id: user.id,
      role: "user",
      content: trimmed,
    };

    const nextMessages = [
      ...messages,
      localMessage,
    ];

    setMessages(nextMessages);

    const { data: saved, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: user.id,
        role: "user",
        content: trimmed,
      })
      .select(
        "id,conversation_id,user_id,role,content,created_at",
      )
      .single();

    if (error) {
      console.error(error);

      setMessages(messages);
      setInput(trimmed);
      return;
    }

    setMessages((current) =>
      current.map((item) =>
        item.id === localMessage.id
          ? (saved as Message)
          : item,
      ),
    );

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId);

    void respond(
      trimmed,
      nextMessages,
    );
  }

  async function deleteConversation(id: string) {
    if (!window.confirm("Excluir esta conversa?")) return;

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

  if (loading && !conversation) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[#0d0a11] text-white/30">
        Carregando...
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#0d0a11] text-white">
      {/* BACKDROP */}
      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black"
        style={{
          opacity: 0,
          pointerEvents: "none",
        }}
        onClick={() => settle(false)}
      />

      {/* SIDEBAR */}
      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-50 flex h-[100dvh] w-[min(86vw,320px)] flex-col border-r border-white/[0.07] bg-[#141019] shadow-2xl shadow-black/50"
        style={{
          transform: "translate3d(-100%,0,0)",
          willChange: "transform",
          touchAction: "none",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-[68px] shrink-0 items-center justify-between px-4">
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
            onClick={() => settle(false)}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 hover:bg-white/[0.06] hover:text-white"
          >
            <X size={19} />
          </button>
        </div>

        <div className="px-3">
          <button
            type="button"
            onClick={() =>
              void navigate({ to: "/workspace" })
            }
            className="flex w-full items-center gap-2 rounded-xl bg-[#7651e8] px-3.5 py-3 text-sm font-medium hover:bg-[#8564ed]"
          >
            <Plus size={18} />
            Nova decisão
          </button>
        </div>

        <div className="p-3">
          <div className="flex items-center gap-2 rounded-xl bg-white/[0.04] px-3 py-2.5">
            <Search
              size={16}
              className="text-white/25"
            />

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
          <p className="px-3 py-2 text-[10px] uppercase tracking-wider text-white/25">
            Histórico
          </p>

          {filteredHistory.map((item) => (
            <div
              key={item.id}
              className="group flex rounded-xl hover:bg-white/[0.04]"
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

                  settle(false);
                }}
                className="min-w-0 flex-1 truncate px-3 py-3 text-left text-sm text-white/60"
              >
                {item.title}
              </button>

              <button
                type="button"
                onClick={() =>
                  void deleteConversation(item.id)
                }
                className="mr-1 hidden h-8 w-8 self-center items-center justify-center rounded-lg text-white/20 hover:bg-red-500/10 hover:text-red-300 group-hover:flex"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
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

      {/* CHAT */}
      <div className="flex h-full min-w-0 flex-col">
        <header className="flex h-[68px] shrink-0 items-center px-4">
          <button
            type="button"
            onClick={() => settle(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 hover:bg-white/[0.06] hover:text-white"
          >
            <Menu size={21} />
          </button>

          <div className="ml-2 min-w-0">
            <div className="truncate text-sm font-medium">
              {conversation?.title}
            </div>
            <div className="text-[10px] text-white/25">
              DecidlyAI
            </div>
          </div>
        </header>

        <div
          ref={contentRef}
          className="min-h-0 flex-1 overflow-y-auto px-4"
        >
          <div className="mx-auto max-w-[720px] pb-[205px] pt-5">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`mb-7 flex ${
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
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      <div className="flex gap-1 py-2">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:100ms]" />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/40 [animation-delay:200ms]" />
                      </div>
                    )
                  ) : (
                    message.content
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* COMPOSER */}
        <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto max-w-[720px]">
            <div className="flex items-end gap-2 rounded-2xl bg-[#141019] px-2 py-2 shadow-[0_10px_40px_rgba(0,0,0,.4)]">
              <textarea
                ref={textareaRef}
                value={input}
                rows={1}
                placeholder="Continue uma decisão..."
                className="max-h-[180px] min-h-[44px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-3 py-2.5 text-[15px] leading-6 text-white outline-none ring-0 focus:border-0 focus:outline-none focus:ring-0 focus-visible:border-0 focus-visible:outline-none focus-visible:ring-0 placeholder:text-white/25"
                onChange={(event) => {
                  setInput(event.target.value);

                  event.currentTarget.style.height = "auto";
                  event.currentTarget.style.height =
                    `${Math.min(event.currentTarget.scrollHeight, 180)}px`;
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
              />

              <button
                type="button"
                disabled={!input.trim() || aiLoading}
                onClick={() => void sendMessage()}
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7651e8] text-white hover:bg-[#8564ed] disabled:opacity-25"
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
      </div>
    </div>
  );
}