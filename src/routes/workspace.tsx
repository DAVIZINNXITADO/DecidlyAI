import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  LogOut,
  Menu,
  MessageSquare,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Subscription = {
  plan: string | null;
  status: string | null;
  expires_at: string | null;
};

function getFriendlyAiError(status?: number, backendMessage?: string) {
  const message = String(backendMessage || "").toLowerCase();

  if (
    status === 402 ||
    message.includes("credit") ||
    message.includes("crédito")
  ) {
    return "Sua conta não possui créditos disponíveis para usar a IA no momento.";
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite")
  ) {
    return "A IA está recebendo muitas solicitações agora. Tente novamente em alguns instantes.";
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("auth")
  ) {
    return "Sua sessão precisa ser atualizada. Faça login novamente.";
  }

  if ([500, 502, 503, 504].includes(status || 0)) {
    return "A IA está temporariamente indisponível. Tente novamente em alguns instantes.";
  }

  if (message.includes("timeout")) {
    return "A resposta demorou mais que o esperado. Tente novamente.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return "Não foi possível conectar à IA. Verifique sua conexão e tente novamente.";
  }

  return "Não foi possível obter uma resposta da IA agora. Tente novamente.";
}

async function getAiFunction(
  setModelLabel: (label: string) => void,
): Promise<string> {
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    throw {
      status: 401,
      message: "Usuário não autenticado",
    };
  }

  const { data: subscription, error } = await supabase
    .from("subscription")
    .select("plan,status,expires_at")
    .eq("user_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();

  if (error) {
    setModelLabel("Free");
    return "decidly-ai-free";
  }

  const plan = String(subscription?.plan || "").toLowerCase();
  const status = String(subscription?.status || "").toLowerCase();

  const activeStatus =
    status === "active" ||
    status === "ativo" ||
    status === "";

  const notExpired =
    !subscription?.expires_at ||
    new Date(subscription.expires_at).getTime() > Date.now();

  if (plan === "vip" && activeStatus && notExpired) {
    setModelLabel("VIP");
    return "decidly-ai";
  }

  setModelLabel("Free");
  return "decidly-ai-free";
}

function makeConversationTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();

  if (!clean) {
    return "Nova decisão";
  }

  if (clean.length <= 48) {
    return clean;
  }

  return `${clean.slice(0, 48).trim()}…`;
}

function Workspace() {
  const navigate = useNavigate();

  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [modelLabel, setModelLabel] = useState("Free");

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const [menuId, setMenuId] = useState<string | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const { data } = await supabase.auth.getUser();

      if (!mounted) return;

      if (!data.user) {
        navigate({
          to: "/login",
        });
        return;
      }

      setUser(data.user);
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  useEffect(() => {
    if (!user) return;

    loadConversations();
  }, [user]);

  async function loadConversations() {
    setLoadingHistory(true);

    const { data, error } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at")
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data);
    }

    setLoadingHistory(false);
  }

  async function createConversation(firstMessage?: string) {
    if (!user) return null;

    const title = firstMessage
      ? makeConversationTitle(firstMessage)
      : "Nova decisão";

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: user.id,
        title,
      })
      .select("id,title,created_at,updated_at")
      .single();

    if (error || !data) {
      console.error(error);
      return null;
    }

    setConversations((current) => [data, ...current]);

    return data;
  }

  async function startNewConversation() {
    const conversation = await createConversation();

    if (!conversation) return;

    setMessages([]);
    setInput("");
    setMenuId(null);

    await navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: conversation.id,
      },
    });
  }

  async function deleteConversation(id: string) {
    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta conversa? Essa ação não pode ser desfeita.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      return;
    }

    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id),
    );

    setMenuId(null);

    await navigate({
      to: "/workspace",
    });
  }

  function beginRename(conversation: Conversation) {
    setEditingId(conversation.id);
    setEditingTitle(conversation.title);
    setMenuId(null);
  }

  async function saveRename(id: string) {
    const title = editingTitle.trim();

    if (!title) {
      setEditingId(null);
      return;
    }

    const { data, error } = await supabase
      .from("conversations")
      .update({
        title,
      })
      .eq("id", id)
      .select("id,title,created_at,updated_at")
      .single();

    if (!error && data) {
      setConversations((current) =>
        current.map((conversation) =>
          conversation.id === id ? data : conversation,
        ),
      );
    }

    setEditingId(null);
  }

  async function sendMessage() {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || loading || !user) {
      return;
    }

    setLoading(true);
    setInput("");

    let conversationId: string | null = null;

    try {
      const currentPath = window.location.pathname;
      const pathParts = currentPath.split("/").filter(Boolean);

      if (
        pathParts[0] === "workspace" &&
        pathParts[1] &&
        pathParts[1] !== "undefined"
      ) {
        conversationId = pathParts[1];
      }

      if (!conversationId) {
        const conversation = await createConversation(trimmedMessage);

        if (!conversation) {
          throw new Error("Não foi possível criar a conversa.");
        }

        conversationId = conversation.id;

        await navigate({
          to: "/workspace/$conversationId",
          params: {
            conversationId,
          },
        });
      }

      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: trimmedMessage,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [...current, userMessage]);

      const { error: insertUserError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "user",
          content: trimmedMessage,
        });

      if (insertUserError) {
        throw insertUserError;
      }

      const functionName = await getAiFunction(setModelLabel);

      const history = [...messages, userMessage]
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const { data, error: functionError } =
        await supabase.functions.invoke(functionName, {
          body: {
            message: trimmedMessage,
            history,
          },
        });

      if (functionError) {
        let backendMessage = functionError.message;
        let status: number | undefined;

        const context = (functionError as any)?.context;

        if (context?.status) {
          status = context.status;
        }

        if (context?.clone) {
          try {
            const response = await context.clone();

            const body = await response.json();

            backendMessage =
              body?.error ||
              body?.message ||
              backendMessage;
          } catch {
            // mantém mensagem original
          }
        }

        throw {
          status,
          message: backendMessage,
        };
      }

      if (data?.error) {
        throw {
          status: data?.status,
          message: data.error,
        };
      }

      if (
        !data ||
        typeof data.response !== "string" ||
        !data.response.trim()
      ) {
        throw {
          status: 500,
          message: "Resposta inválida da IA.",
        };
      }

      const assistantContent = data.response.trim();

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: assistantContent,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [...current, assistantMessage]);

      const { error: insertAssistantError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: user.id,
          role: "assistant",
          content: assistantContent,
        });

      if (insertAssistantError) {
        console.error(insertAssistantError);
      }

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      await loadConversations();
    } catch (error: any) {
      const friendlyMessage = getFriendlyAiError(
        error?.status,
        error?.message,
      );

      const errorMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: friendlyMessage,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [...current, errorMessage]);
    } finally {
      setLoading(false);
    }
  }

  async function copyMessage(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);

      setCopiedId(message.id);

      window.setTimeout(() => {
        setCopiedId(null);
      }, 1500);
    } catch {
      // clipboard indisponível
    }
  }

  const filteredConversations = conversations.filter((conversation) =>
    conversation.title.toLowerCase().includes(search.toLowerCase()),
  );

  const grouped = groupConversations(filteredConversations);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#090613] text-white">
      {/* SIDEBAR */}

      <aside
        className={`
          relative z-30 flex h-full flex-col border-r border-white/[0.07]
          bg-[#0d0919]
          transition-all duration-300
          ${sidebarOpen ? "w-[290px]" : "w-0 overflow-hidden border-r-0"}
        `}
      >
        <div className="flex h-full min-w-[290px] flex-col">
          {/* LOGO */}

          <div className="flex h-[72px] items-center justify-between px-5">
            <button
              onClick={() => navigate({ to: "/" })}
              className="flex items-center gap-3"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-violet-900/30">
                <Sparkles size={18} />
              </div>

              <span className="text-[17px] font-semibold tracking-tight">
                DecidlyAI
              </span>
            </button>

            <button
              onClick={() => setSidebarOpen(false)}
              className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
            >
              <Menu size={18} />
            </button>
          </div>

          {/* NOVA DECISÃO */}

          <div className="px-4">
            <button
              onClick={startNewConversation}
              className="
                flex w-full items-center gap-3 rounded-xl
                border border-violet-400/20
                bg-violet-500/10
                px-4 py-3
                text-sm font-medium
                text-violet-100
                transition
                hover:border-violet-400/35
                hover:bg-violet-500/15
              "
            >
              <Plus size={18} />
              Nova decisão
            </button>
          </div>

          {/* SEARCH */}

          <div className="px-4 pt-4">
            <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3">
              <Search size={16} className="text-white/30" />

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Pesquisar conversas"
                className="
                  h-10 w-full bg-transparent text-sm
                  text-white outline-none
                  placeholder:text-white/25
                "
              />
            </div>
          </div>

          {/* HISTORY */}

          <div className="mt-5 flex-1 overflow-y-auto px-3 pb-4">
            {loadingHistory ? (
              <div className="px-3 py-4 text-xs text-white/30">
                Carregando conversas…
              </div>
            ) : grouped.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <MessageSquare
                  size={22}
                  className="mx-auto mb-3 text-white/15"
                />

                <p className="text-xs text-white/30">
                  Nenhuma conversa encontrada.
                </p>
              </div>
            ) : (
              grouped.map((group) => (
                <div key={group.label} className="mb-5">
                  <div className="px-3 pb-2 text-[11px] font-medium uppercase tracking-wider text-white/25">
                    {group.label}
                  </div>

                  <div className="space-y-1">
                    {group.items.map((conversation) => (
                      <div
                        key={conversation.id}
                        className="group relative"
                      >
                        {editingId === conversation.id ? (
                          <div className="flex items-center gap-1 rounded-xl border border-violet-400/20 bg-white/[0.04] px-2">
                            <input
                              autoFocus
                              value={editingTitle}
                              onChange={(event) =>
                                setEditingTitle(event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  saveRename(conversation.id);
                                }

                                if (event.key === "Escape") {
                                  setEditingId(null);
                                }
                              }}
                              className="min-w-0 flex-1 bg-transparent px-2 py-2.5 text-sm text-white outline-none"
                            />

                            <button
                              onClick={() =>
                                saveRename(conversation.id)
                              }
                              className="rounded-md p-1.5 text-emerald-400 hover:bg-white/5"
                            >
                              <Check size={15} />
                            </button>

                            <button
                              onClick={() => setEditingId(null)}
                              className="rounded-md p-1.5 text-white/40 hover:bg-white/5"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                navigate({
                                  to: "/workspace/$conversationId",
                                  params: {
                                    conversationId: conversation.id,
                                  },
                                })
                              }
                              className="
                                flex w-full items-center gap-3
                                rounded-xl px-3 py-2.5 pr-10
                                text-left text-sm text-white/65
                                transition
                                hover:bg-white/[0.045]
                                hover:text-white
                              "
                            >
                              <MessageSquare
                                size={15}
                                className="shrink-0 text-white/25"
                              />

                              <span className="truncate">
                                {conversation.title}
                              </span>
                            </button>

                            <button
                              onClick={(event) => {
                                event.stopPropagation();
                                setMenuId(
                                  menuId === conversation.id
                                    ? null
                                    : conversation.id,
                                );
                              }}
                              className="
                                absolute right-1.5 top-1/2
                                -translate-y-1/2 rounded-lg p-1.5
                                text-white/20 opacity-0
                                transition
                                hover:bg-white/10 hover:text-white
                                group-hover:opacity-100
                              "
                            >
                              <MoreHorizontal size={17} />
                            </button>

                            {menuId === conversation.id && (
                              <div className="absolute right-1 top-10 z-50 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#181225] p-1.5 shadow-2xl shadow-black/50">
                                <button
                                  onClick={() =>
                                    beginRename(conversation)
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/5 hover:text-white"
                                >
                                  <Pencil size={14} />
                                  Renomear
                                </button>

                                <button
                                  onClick={() =>
                                    deleteConversation(
                                      conversation.id,
                                    )
                                  }
                                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                                >
                                  <Trash2 size={14} />
                                  Excluir
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* ACCOUNT */}

          <div className="border-t border-white/[0.06] p-3">
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-400 to-purple-700 text-xs font-semibold">
                {user?.email?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white/75">
                  {user?.email || "Conta"}
                </p>

                <p className="text-[11px] text-white/30">
                  Plano {modelLabel}
                </p>
              </div>

              <ChevronDown size={15} className="text-white/25" />
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN */}

      <main className="relative flex min-w-0 flex-1 flex-col">
        {/* HEADER */}

        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg p-2 text-white/40 hover:bg-white/5 hover:text-white"
              >
                <Menu size={19} />
              </button>
            )}

            <div>
              <p className="text-sm font-medium text-white/80">
                DecidlyAI
              </p>

              <p className="text-[11px] text-white/30">
                Seu espaço para decisões
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

              <span className="text-[11px] text-white/45">
                IA {modelLabel}
              </span>
            </div>

            <button
              className="rounded-lg p-2 text-white/35 transition hover:bg-white/5 hover:text-white"
              title="Configurações"
            >
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* CHAT */}

        <section className="relative flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <EmptyState
                onSuggestion={(value) => setInput(value)}
              />
            ) : (
              <div className="mx-auto w-full max-w-4xl px-5 py-10">
                <div className="space-y-9">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={
                        message.role === "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      {message.role === "user" ? (
                        <div className="max-w-[80%]">
                          <div className="rounded-2xl rounded-br-md border border-violet-400/10 bg-violet-500/[0.12] px-5 py-3.5 text-[15px] leading-7 text-white/90">
                            {message.content}
                          </div>
                        </div>
                      ) : (
                        <div className="w-full">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                              <Sparkles size={14} />
                            </div>

                            <span className="text-xs font-medium text-white/50">
                              DecidlyAI
                            </span>
                          </div>

                          <div className="max-w-3xl text-[15px] leading-7 text-white/75">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                h1: ({ children }) => (
                                  <h1 className="mb-4 mt-6 text-2xl font-semibold text-white">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="mb-3 mt-6 text-xl font-semibold text-white">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="mb-2 mt-5 text-lg font-semibold text-white">
                                    {children}
                                  </h3>
                                ),
                                p: ({ children }) => (
                                  <p className="mb-4 last:mb-0">
                                    {children}
                                  </p>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mb-4 list-disc space-y-2 pl-6">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mb-4 list-decimal space-y-2 pl-6">
                                    {children}
                                  </ol>
                                ),
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-white">
                                    {children}
                                  </strong>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="my-4 border-l-2 border-violet-400/50 pl-4 text-white/55">
                                    {children}
                                  </blockquote>
                                ),
                                code: ({ children }) => (
                                  <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-sm text-violet-200">
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>

                          <button
                            onClick={() => copyMessage(message)}
                            className="mt-4 flex items-center gap-1.5 text-[11px] text-white/25 transition hover:text-white/55"
                          >
                            {copiedId === message.id ? (
                              <>
                                <Check size={13} />
                                Copiado
                              </>
                            ) : (
                              <>
                                <Copy size={13} />
                                Copiar
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-start gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                        <Sparkles size={14} />
                      </div>

                      <div className="pt-1.5">
                        <div className="flex gap-1">
                          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400" />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                            style={{ animationDelay: "120ms" }}
                          />
                          <span
                            className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-400"
                            style={{ animationDelay: "240ms" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* INPUT */}

          <div className="shrink-0 px-4 pb-5 pt-3">
            <div className="mx-auto max-w-4xl">
              <div
                className="
                  relative overflow-hidden rounded-2xl
                  border border-white/[0.09]
                  bg-[#120c20]/95
                  shadow-2xl shadow-black/20
                  transition
                  focus-within:border-violet-400/25
                  focus-within:shadow-violet-950/10
                "
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Enter" &&
                      (event.metaKey || event.ctrlKey)
                    ) {
                      event.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Conte o que você está decidindo…"
                  rows={1}
                  disabled={loading}
                  className="
                    max-h-40 min-h-[58px] w-full resize-none
                    bg-transparent px-5 pb-12 pt-4
                    text-[15px] leading-6 text-white
                    outline-none
                    placeholder:text-white/25
                  "
                />

                <div className="absolute bottom-2.5 left-4 text-[10px] text-white/20">
                  Ctrl + Enter para enviar
                </div>

                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || loading}
                  className="
                    absolute bottom-2 right-2
                    flex h-9 w-9 items-center justify-center
                    rounded-xl
                    bg-gradient-to-br from-violet-500 to-purple-700
                    text-white
                    shadow-lg shadow-violet-900/30
                    transition
                    hover:scale-105
                    disabled:cursor-not-allowed
                    disabled:opacity-30
                    disabled:hover:scale-100
                  "
                >
                  <ArrowUp size={18} />
                </button>
              </div>

              <p className="mt-2 text-center text-[10px] text-white/20">
                A DecidlyAI pode cometer erros. Verifique informações
                importantes antes de tomar decisões.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function EmptyState({
  onSuggestion,
}: {
  onSuggestion: (value: string) => void;
}) {
  const suggestions = [
    "Estou pensando em trocar de escola",
    "Devo comprar ou guardar meu dinheiro?",
    "Preciso escolher entre duas opções",
  ];

  return (
    <div className="flex h-full min-h-[500px] items-center justify-center px-5">
      <div className="w-full max-w-2xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/15 to-purple-700/10 shadow-xl shadow-violet-950/10">
          <Sparkles
            size={27}
            className="text-violet-300"
          />
        </div>

        <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          O que você está decidindo?
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/35 sm:text-[15px]">
          Conte o contexto, as opções que você está considerando e o
          que mais importa para você. A DecidlyAI ajuda a organizar
          os pontos antes da decisão.
        </p>

        <div className="mt-8 flex flex-wrap justify-center gap-2.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => onSuggestion(suggestion)}
              className="
                rounded-xl border border-white/[0.07]
                bg-white/[0.025]
                px-4 py-2.5
                text-xs text-white/45
                transition
                hover:border-violet-400/20
                hover:bg-violet-500/[0.06]
                hover:text-white/75
              "
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function groupConversations(conversations: Conversation[]) {
  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  const groups: {
    label: string;
    items: Conversation[];
  }[] = [];

  const todayItems = conversations.filter((conversation) =>
    isSameDay(new Date(conversation.updated_at), today),
  );

  const yesterdayItems = conversations.filter((conversation) =>
    isSameDay(new Date(conversation.updated_at), yesterday),
  );

  const olderItems = conversations.filter((conversation) => {
    const date = new Date(conversation.updated_at);

    return (
      !isSameDay(date, today) &&
      !isSameDay(date, yesterday)
    );
  });

  if (todayItems.length) {
    groups.push({
      label: "Hoje",
      items: todayItems,
    });
  }

  if (yesterdayItems.length) {
    groups.push({
      label: "Ontem",
      items: yesterdayItems,
    });
  }

  if (olderItems.length) {
    groups.push({
      label: "Anteriores",
      items: olderItems,
    });
  }

  return groups;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}