import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowUp,
  ChevronDown,
  Menu,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trash2,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace/$conversationId")({
  component: ConversationWorkspace,
});

type Message = {
  id: string;
  conversation_id: string;
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

type AiError = {
  status?: number;
  message?: string;
};

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
): string {
  const message = (backendMessage || "").toLowerCase();

  if (
    status === 402 ||
    message.includes("credit") ||
    message.includes("crédito")
  ) {
    return "Sua conta não possui créditos disponíveis para continuar usando a IA.";
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite")
  ) {
    return "A IA está recebendo muitas solicitações no momento. Tente novamente em alguns instantes.";
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("não autenticado")
  ) {
    return "Sua sessão precisa ser atualizada. Entre novamente na sua conta.";
  }

  if ([500, 502, 503, 504].includes(status || 0)) {
    return "O serviço de IA encontrou uma dificuldade temporária. Tente novamente.";
  }

  if (message.includes("timeout")) {
    return "A resposta demorou demais para chegar. Tente novamente.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return "Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.";
  }

  return "Não consegui concluir essa análise agora. Tente novamente em alguns instantes.";
}

function ConversationWorkspace() {
  const navigate = useNavigate();

  const { conversationId } = Route.useParams();

  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(true);
  const [mobileSidebar, setMobileSidebar] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [modelLabel, setModelLabel] = useState("Free");

  const [editingTitle, setEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const [menuOpen, setMenuOpen] = useState(false);

  /*
   * ============================================================
   * AUTENTICAÇÃO
   * ============================================================
   */

  async function loadUser() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      await navigate({
        to: "/login",
      });

      return null;
    }

    setUserId(data.user.id);

    return data.user;
  }

  /*
   * ============================================================
   * CARREGAR CONVERSAS
   * ============================================================
   */

  async function loadConversations(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("id, title, created_at, updated_at")
      .eq("user_id", id)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar conversas:", error);
      return;
    }

    setConversations((data || []) as Conversation[]);
  }

  /*
   * ============================================================
   * CARREGAR CONVERSA ATUAL
   * ============================================================
   */

  async function loadConversation(currentUserId?: string) {
    const id = currentUserId || userId;

    if (!id || !conversationId) return;

    setLoadingConversation(true);

    try {
      const { data: conversationData, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id, title, created_at, updated_at")
          .eq("id", conversationId)
          .eq("user_id", id)
          .maybeSingle();

      if (conversationError) {
        console.error(
          "Erro ao carregar conversa:",
          conversationError,
        );
        return;
      }

      if (!conversationData) {
        await navigate({
          to: "/workspace",
        });

        return;
      }

      setConversation(conversationData as Conversation);
      setNewTitle(conversationData.title || "Nova decisão");

      const { data: messageData, error: messageError } =
        await supabase
          .from("messages")
          .select(
            "id, conversation_id, role, content, created_at",
          )
          .eq("conversation_id", conversationId)
          .eq("user_id", id)
          .order("created_at", { ascending: true });

      if (messageError) {
        console.error(
          "Erro ao carregar mensagens:",
          messageError,
        );
        return;
      }

      setMessages((messageData || []) as Message[]);
    } finally {
      setLoadingConversation(false);
    }
  }

  /*
   * ============================================================
   * PLANO / MODELO DA IA
   * ============================================================
   */

  async function getAiFunction(): Promise<string> {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data.user) {
      throw {
        status: 401,
        message: "Usuário não autenticado",
      } satisfies AiError;
    }

    const { data: subscription, error: subscriptionError } =
      await supabase
        .from("subscription")
        .select("plan, status, expires_at")
        .eq("user_id", data.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<Subscription>();

    if (subscriptionError) {
      setModelLabel("Free");
      return "decidly-ai-free";
    }

    if (!subscription) {
      setModelLabel("Free");
      return "decidly-ai-free";
    }

    const plan = String(subscription.plan || "").toLowerCase();
    const status = String(subscription.status || "").toLowerCase();

    const activeStatus =
      status === "active" ||
      status === "ativo" ||
      status === "active_subscription";

    const expired =
      subscription.expires_at &&
      new Date(subscription.expires_at).getTime() < Date.now();

    const isVip =
      plan === "vip" &&
      activeStatus &&
      !expired;

    if (isVip) {
      setModelLabel("VIP");
      return "decidly-ai";
    }

    setModelLabel("Free");
    return "decidly-ai-free";
  }

  /*
   * ============================================================
   * ENVIAR MENSAGEM
   * ============================================================
   */

  async function sendMessage() {
    const trimmedMessage = input.trim();

    if (!trimmedMessage || loading || !conversationId || !userId) {
      return;
    }

    setInput("");
    setLoading(true);

    const temporaryUserMessage: Message = {
      id: `temp-user-${Date.now()}`,
      conversation_id: conversationId,
      role: "user",
      content: trimmedMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((current) => [
      ...current,
      temporaryUserMessage,
    ]);

    try {
      /*
       * Salva a mensagem do usuário no banco.
       */

      const { data: savedUserMessage, error: userMessageError } =
        await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "user",
            content: trimmedMessage,
          })
          .select(
            "id, conversation_id, role, content, created_at",
          )
          .single();

      if (userMessageError) {
        throw userMessageError;
      }

      /*
       * Substitui a mensagem temporária pela mensagem real.
       */

      setMessages((current) =>
        current.map((message) =>
          message.id === temporaryUserMessage.id
            ? (savedUserMessage as Message)
            : message,
        ),
      );

      /*
       * Atualiza título automaticamente na primeira mensagem.
       */

      if (
        messages.length === 0 ||
        conversation?.title === "Nova decisão"
      ) {
        const generatedTitle =
          trimmedMessage.length > 45
            ? `${trimmedMessage.slice(0, 45)}...`
            : trimmedMessage;

        await supabase
          .from("conversations")
          .update({
            title: generatedTitle,
            updated_at: new Date().toISOString(),
          })
          .eq("id", conversationId)
          .eq("user_id", userId);

        setConversation((current) =>
          current
            ? {
                ...current,
                title: generatedTitle,
                updated_at: new Date().toISOString(),
              }
            : current,
        );

        setNewTitle(generatedTitle);

        await loadConversations(userId);
      }

      /*
       * Busca a Edge Function correta conforme o plano.
       */

      const functionName = await getAiFunction();

      /*
       * Envia somente as últimas mensagens para a IA.
       */

      const history = [...messages, temporaryUserMessage]
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
            conversation_id: conversationId,
          },
        });

      if (functionError) {
        let backendMessage = functionError.message;

        const context = functionError.context;

        if (context) {
          try {
            const clonedContext =
              typeof context.clone === "function"
                ? context.clone()
                : context;

            const json = await clonedContext.json();

            if (json?.error) {
              backendMessage = String(json.error);
            }

            if (json?.message) {
              backendMessage = String(json.message);
            }
          } catch {
            // Ignora caso o corpo não seja JSON.
          }
        }

        throw {
          status: context?.status,
          message: backendMessage,
        } satisfies AiError;
      }

      if (data?.error) {
        throw {
          status: data.status,
          message: String(data.error),
        } satisfies AiError;
      }

      if (
        !data ||
        typeof data.response !== "string" ||
        !data.response.trim()
      ) {
        throw {
          status: 500,
          message: "Resposta inválida da IA",
        } satisfies AiError;
      }

      const assistantContent = data.response.trim();

      /*
       * Salva resposta da IA no banco.
       */

      const { data: savedAssistantMessage, error: assistantError } =
        await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "assistant",
            content: assistantContent,
          })
          .select(
            "id, conversation_id, role, content, created_at",
          )
          .single();

      if (assistantError) {
        throw assistantError;
      }

      setMessages((current) => [
        ...current,
        savedAssistantMessage as Message,
      ]);

      /*
       * Atualiza updated_at da conversa.
       */

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("user_id", userId);

      await loadConversations(userId);
    } catch (error) {
      console.error("Erro na IA:", error);

      const aiError = error as AiError;

      const friendlyMessage = getFriendlyAiError(
        aiError?.status,
        aiError?.message,
      );

      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        conversation_id: conversationId,
        role: "assistant",
        content: friendlyMessage,
        created_at: new Date().toISOString(),
      };

      setMessages((current) => [
        ...current,
        errorMessage,
      ]);
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================================
   * NOVA CONVERSA
   * ============================================================
   */

  async function createNewConversation() {
    if (!userId) return;

    const { data, error } = await supabase
      .from("conversations")
      .insert({
        user_id: userId,
        title: "Nova decisão",
      })
      .select(
        "id, title, created_at, updated_at",
      )
      .single();

    if (error) {
      console.error(
        "Erro ao criar conversa:",
        error,
      );
      return;
    }

    await loadConversations(userId);

    await navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: data.id,
      },
    });

    setMobileSidebar(false);
  }

  /*
   * ============================================================
   * RENOMEAR
   * ============================================================
   */

  async function saveTitle() {
    if (!userId || !conversationId) return;

    const title = newTitle.trim();

    if (!title) {
      setNewTitle(conversation?.title || "Nova decisão");
      setEditingTitle(false);
      return;
    }

    const { error } = await supabase
      .from("conversations")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Erro ao renomear conversa:",
        error,
      );
      return;
    }

    setConversation((current) =>
      current
        ? {
            ...current,
            title,
          }
        : current,
    );

    await loadConversations(userId);

    setEditingTitle(false);
  }

  /*
   * ============================================================
   * EXCLUIR
   * ============================================================
   */

  async function deleteConversation() {
    if (!userId || !conversationId) return;

    const confirmed = window.confirm(
      "Tem certeza que deseja excluir esta decisão? Essa ação não pode ser desfeita.",
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("user_id", userId);

    if (error) {
      console.error(
        "Erro ao excluir conversa:",
        error,
      );
      return;
    }

    const remaining = conversations.filter(
      (item) => item.id !== conversationId,
    );

    setConversations(remaining);

    if (remaining.length > 0) {
      await navigate({
        to: "/workspace/$conversationId",
        params: {
          conversationId: remaining[0].id,
        },
      });
    } else {
      await navigate({
        to: "/workspace",
      });
    }
  }

  /*
   * ============================================================
   * TECLADO
   * ============================================================
   */

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      sendMessage();
    }
  }

  /*
   * ============================================================
   * INICIALIZAÇÃO
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const user = await loadUser();

      if (!mounted || !user) return;

      await Promise.all([
        loadConversation(user.id),
        loadConversations(user.id),
      ]);
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, [conversationId]);

  /*
   * ============================================================
   * GRUPOS DA SIDEBAR
   * ============================================================
   */

  const groupedConversations = useMemo(() => {
    const now = new Date();

    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const startOfYesterday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 1,
    );

    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const older: Conversation[] = [];

    conversations.forEach((item) => {
      const date = new Date(item.updated_at);

      if (date >= startOfToday) {
        today.push(item);
      } else if (date >= startOfYesterday) {
        yesterday.push(item);
      } else {
        older.push(item);
      }
    });

    return {
      today,
      yesterday,
      older,
    };
  }, [conversations]);

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen bg-[#08050f] text-white">
      <div className="flex min-h-screen overflow-hidden">
        {/* =====================================================
            SIDEBAR DESKTOP
        ====================================================== */}

        <aside
          className={[
            "hidden border-r border-white/[0.07] bg-[#0b0714] transition-all duration-300 md:flex md:flex-col",
            sidebarCollapsed
              ? "w-[76px]"
              : "w-[280px]",
          ].join(" ")}
        >
          {/* Logo */}

          <div
            className={[
              "flex h-[72px] items-center border-b border-white/[0.06]",
              sidebarCollapsed
                ? "justify-center px-3"
                : "px-5",
            ].join(" ")}
          >
            {sidebarCollapsed ? (
              <button
                onClick={() =>
                  setSidebarCollapsed(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/15 text-purple-300 transition hover:bg-purple-500/20"
                title="Abrir menu"
              >
                <Sparkles size={19} />
              </button>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-700 shadow-lg shadow-purple-900/20">
                  <Sparkles
                    size={18}
                    className="text-white"
                  />
                </div>

                <div>
                  <div className="text-[15px] font-semibold tracking-tight">
                    DecidlyAI
                  </div>

                  <div className="text-[10px] uppercase tracking-[0.18em] text-white/35">
                    Decision intelligence
                  </div>
                </div>
              </div>
            )}
          </div>

          {!sidebarCollapsed && (
            <>
              {/* Nova decisão */}

              <div className="px-3 pt-4">
                <button
                  onClick={createNewConversation}
                  className="group flex w-full items-center gap-3 rounded-xl border border-purple-400/20 bg-purple-500/[0.08] px-3 py-3 text-left transition hover:border-purple-400/30 hover:bg-purple-500/[0.13]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                    <Plus size={17} />
                  </div>

                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      Nova decisão
                    </div>

                    <div className="text-[11px] text-white/35">
                      Começar uma nova análise
                    </div>
                  </div>
                </button>
              </div>

              {/* Pesquisa */}

              <div className="px-3 pt-3">
                <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                  <Search
                    size={15}
                    className="text-white/30"
                  />

                  <input
                    placeholder="Pesquisar decisões"
                    className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-white/25"
                  />

                  <span className="rounded border border-white/[0.07] px-1.5 py-0.5 text-[9px] text-white/25">
                    ⌘ K
                  </span>
                </div>
              </div>

              {/* Conversas */}

              <div className="scrollbar-thin mt-5 flex-1 overflow-y-auto px-3 pb-4">
                {groupedConversations.today.length >
                  0 && (
                  <ConversationGroup
                    title="Hoje"
                    conversations={
                      groupedConversations.today
                    }
                    currentId={conversationId}
                    onNavigate={() =>
                      setMobileSidebar(false)
                    }
                  />
                )}

                {groupedConversations.yesterday
                  .length > 0 && (
                  <ConversationGroup
                    title="Ontem"
                    conversations={
                      groupedConversations.yesterday
                    }
                    currentId={conversationId}
                    onNavigate={() =>
                      setMobileSidebar(false)
                    }
                  />
                )}

                {groupedConversations.older.length >
                  0 && (
                  <ConversationGroup
                    title="Anteriores"
                    conversations={
                      groupedConversations.older
                    }
                    currentId={conversationId}
                    onNavigate={() =>
                      setMobileSidebar(false)
                    }
                  />
                )}

                {conversations.length === 0 && (
                  <div className="px-2 py-10 text-center">
                    <div className="text-xs text-white/25">
                      Nenhuma decisão ainda.
                    </div>
                  </div>
                )}
              </div>

              {/* Rodapé sidebar */}

              <div className="border-t border-white/[0.06] p-3">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/[0.07]">
                    <User
                      size={15}
                      className="text-white/50"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-white/80">
                      Minha conta
                    </div>

                    <div className="text-[10px] text-white/30">
                      Plano {modelLabel}
                    </div>
                  </div>

                  <Settings
                    size={15}
                    className="text-white/25"
                  />
                </button>
              </div>
            </>
          )}

          {sidebarCollapsed && (
            <div className="flex flex-1 flex-col items-center gap-3 pt-4">
              <button
                onClick={createNewConversation}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-300 transition hover:bg-purple-500/20"
                title="Nova decisão"
              >
                <Plus size={18} />
              </button>

              <button
                onClick={() =>
                  setSidebarCollapsed(false)
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/35 transition hover:bg-white/[0.05] hover:text-white"
                title="Expandir menu"
              >
                <PanelLeft size={18} />
              </button>

              <div className="mt-auto pb-4">
                <button className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.06] text-white/40">
                  <User size={16} />
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* =====================================================
            SIDEBAR MOBILE
        ====================================================== */}

        {mobileSidebar && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() =>
                setMobileSidebar(false)
              }
            />

            <aside className="relative flex h-full w-[290px] flex-col border-r border-white/[0.08] bg-[#0b0714]">
              <div className="flex h-[72px] items-center justify-between border-b border-white/[0.06] px-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-violet-700">
                    <Sparkles size={18} />
                  </div>

                  <span className="font-semibold">
                    DecidlyAI
                  </span>
                </div>

                <button
                  onClick={() =>
                    setMobileSidebar(false)
                  }
                  className="text-white/40"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="px-3 pt-4">
                <button
                  onClick={createNewConversation}
                  className="flex w-full items-center gap-3 rounded-xl bg-purple-500/10 px-3 py-3"
                >
                  <Plus size={17} />

                  <span className="text-sm">
                    Nova decisão
                  </span>
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto px-3">
                <ConversationGroup
                  title="Conversas"
                  conversations={conversations}
                  currentId={conversationId}
                  onNavigate={() =>
                    setMobileSidebar(false)
                  }
                />
              </div>

              <div className="border-t border-white/[0.06] p-3">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-3">
                  <User size={17} />

                  <span className="text-sm text-white/70">
                    Minha conta
                  </span>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* =====================================================
            ÁREA PRINCIPAL
        ====================================================== */}

        <main className="flex min-w-0 flex-1 flex-col bg-[radial-gradient(circle_at_50%_-10%,rgba(124,58,237,0.12),transparent_38%)]">
          {/* Header */}

          <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#08050f]/80 px-4 backdrop-blur-xl md:px-7">
            <div className="flex min-w-0 items-center gap-3">
              <button
                onClick={() =>
                  setMobileSidebar(true)
                }
                className="flex h-9 w-9 items-center justify-center rounded-lg text-white/50 hover:bg-white/[0.05] md:hidden"
              >
                <Menu size={19} />
              </button>

              {!sidebarCollapsed && (
                <button
                  onClick={() =>
                    setSidebarCollapsed(true)
                  }
                  className="hidden h-9 w-9 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.05] hover:text-white/70 md:flex"
                  title="Recolher menu"
                >
                  <PanelLeft size={18} />
                </button>
              )}

              <div className="min-w-0">
                {editingTitle ? (
                  <input
                    autoFocus
                    value={newTitle}
                    onChange={(event) =>
                      setNewTitle(event.target.value)
                    }
                    onBlur={saveTitle}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        saveTitle();
                      }

                      if (event.key === "Escape") {
                        setNewTitle(
                          conversation?.title ||
                            "Nova decisão",
                        );
                        setEditingTitle(false);
                      }
                    }}
                    className="w-[220px] rounded-lg border border-purple-400/20 bg-white/[0.05] px-2 py-1 text-sm outline-none md:w-[350px]"
                  />
                ) : (
                  <button
                    onClick={() =>
                      setEditingTitle(true)
                    }
                    className="max-w-[240px] truncate text-sm font-medium text-white/85 hover:text-white md:max-w-[450px]"
                    title="Clique para renomear"
                  >
                    {conversation?.title ||
                      "Nova decisão"}
                  </button>
                )}

                <div className="mt-0.5 flex items-center gap-2">
                  <span className="font-mono text-[9px] text-white/20">
                    {conversationId}
                  </span>

                  <span className="h-1 w-1 rounded-full bg-white/20" />

                  <span className="text-[10px] text-white/30">
                    Análise de decisão
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5 sm:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />

                <span className="text-[10px] font-medium text-emerald-300/80">
                  Concluído
                </span>
              </div>

              <div className="relative">
                <button
                  onClick={() =>
                    setMenuOpen((current) => !current)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-white/35 transition hover:bg-white/[0.05] hover:text-white/70"
                >
                  <MoreHorizontal size={19} />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-11 z-30 w-44 overflow-hidden rounded-xl border border-white/[0.08] bg-[#14101e] p-1 shadow-2xl shadow-black/40">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setEditingTitle(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-white/70 hover:bg-white/[0.05] hover:text-white"
                    >
                      <ChevronDown
                        size={14}
                        className="rotate-[-90deg]"
                      />
                      Renomear
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        deleteConversation();
                      }}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs text-red-300/80 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <Trash2 size={14} />
                      Excluir decisão
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Conteúdo */}

          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto w-full max-w-4xl px-4 pb-40 pt-8 md:px-8 md:pt-12">
                {loadingConversation ? (
                  <div className="flex min-h-[400px] items-center justify-center">
                    <div className="flex items-center gap-3 text-sm text-white/35">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-purple-400/20 border-t-purple-400" />
                      Carregando decisão...
                    </div>
                  </div>
                ) : messages.length === 0 ? (
                  <EmptyConversation />
                ) : (
                  <div className="space-y-8">
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                      />
                    ))}

                    {loading && (
                      <div className="flex gap-4">
                        <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 text-purple-300">
                          <Sparkles size={17} />
                        </div>

                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
                            <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-purple-400" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* =================================================
                INPUT
            ================================================== */}

            <div className="pointer-events-none absolute inset-x-0 bottom-0">
              <div className="pointer-events-auto mx-auto w-full max-w-4xl px-4 pb-5 md:px-8 md:pb-7">
                <div className="rounded-2xl border border-white/[0.09] bg-[#110c1b]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl">
                  <div className="flex items-end gap-2">
                    <textarea
                      value={input}
                      onChange={(event) =>
                        setInput(event.target.value)
                      }
                      onKeyDown={handleKeyDown}
                      disabled={loading}
                      rows={1}
                      placeholder="Descreva a decisão que você precisa tomar..."
                      className="max-h-36 min-h-[48px] flex-1 resize-none bg-transparent px-3 py-3 text-sm leading-6 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
                    />

                    <button
                      onClick={sendMessage}
                      disabled={
                        loading || !input.trim()
                      }
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-950/30 transition hover:bg-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ArrowUp size={18} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between px-3 pb-1 pt-1">
                    <span className="text-[10px] text-white/20">
                      DecidlyAI pode cometer erros. Revise decisões importantes.
                    </span>

                    <span className="hidden text-[10px] text-white/20 sm:block">
                      Ctrl + Enter
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/*
 * ================================================================
 * GRUPO DE CONVERSAS
 * ================================================================
 */

function ConversationGroup({
  title,
  conversations,
  currentId,
  onNavigate,
}: {
  title: string;
  conversations: Conversation[];
  currentId: string;
  onNavigate: () => void;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 px-2 text-[10px] font-medium uppercase tracking-[0.14em] text-white/25">
        {title}
      </div>

      <div className="space-y-1">
        {conversations.map((item) => (
          <Link
            key={item.id}
            to="/workspace/$conversationId"
            params={{
              conversationId: item.id,
            }}
            onClick={onNavigate}
            className={[
              "group flex items-center gap-2 rounded-lg px-2.5 py-2.5 transition",
              currentId === item.id
                ? "bg-purple-500/[0.09] text-white"
                : "text-white/45 hover:bg-white/[0.035] hover:text-white/75",
            ].join(" ")}
          >
            <div
              className={[
                "h-1.5 w-1.5 shrink-0 rounded-full",
                currentId === item.id
                  ? "bg-purple-400"
                  : "bg-white/15",
              ].join(" ")}
            />

            <span className="min-w-0 flex-1 truncate text-xs">
              {item.title || "Nova decisão"}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/*
 * ================================================================
 * MENSAGEM
 * ================================================================
 */

function MessageBubble({
  message,
}: {
  message: Message;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md border border-purple-400/10 bg-purple-500/[0.09] px-5 py-4 md:max-w-[75%]">
          <p className="whitespace-pre-wrap text-sm leading-7 text-white/85">
            {message.content}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500/20 to-violet-500/10 text-purple-300">
        <Sparkles size={17} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-white/75">
            DecidlyAI
          </span>

          <span className="text-[9px] uppercase tracking-[0.12em] text-purple-300/40">
            análise
          </span>
        </div>

        <div className="max-w-none text-sm leading-7 text-white/70">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 className="mb-4 mt-6 text-xl font-semibold text-white">
                  {children}
                </h1>
              ),

              h2: ({ children }) => (
                <h2 className="mb-3 mt-6 text-lg font-semibold text-white">
                  {children}
                </h2>
              ),

              h3: ({ children }) => (
                <h3 className="mb-2 mt-5 text-base font-semibold text-white">
                  {children}
                </h3>
              ),

              p: ({ children }) => (
                <p className="mb-4">
                  {children}
                </p>
              ),

              ul: ({ children }) => (
                <ul className="mb-4 ml-5 list-disc space-y-2">
                  {children}
                </ul>
              ),

              ol: ({ children }) => (
                <ol className="mb-4 ml-5 list-decimal space-y-2">
                  {children}
                </ol>
              ),

              li: ({ children }) => (
                <li className="pl-1">
                  {children}
                </li>
              ),

              strong: ({ children }) => (
                <strong className="font-semibold text-white">
                  {children}
                </strong>
              ),

              blockquote: ({ children }) => (
                <blockquote className="my-4 border-l-2 border-purple-400/40 pl-4 text-white/50">
                  {children}
                </blockquote>
              ),

              code: ({ children }) => (
                <code className="rounded-md bg-white/[0.06] px-1.5 py-0.5 font-mono text-[12px] text-purple-200">
                  {children}
                </code>
              ),

              table: ({ children }) => (
                <div className="my-5 overflow-x-auto rounded-xl border border-white/[0.07]">
                  <table className="w-full border-collapse text-left text-xs">
                    {children}
                  </table>
                </div>
              ),

              th: ({ children }) => (
                <th className="border-b border-white/[0.07] bg-white/[0.03] px-3 py-2 font-medium text-white/70">
                  {children}
                </th>
              ),

              td: ({ children }) => (
                <td className="border-b border-white/[0.05] px-3 py-2 text-white/55">
                  {children}
                </td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

/*
 * ================================================================
 * ESTADO VAZIO
 * ================================================================
 */

function EmptyConversation() {
  return (
    <div className="flex min-h-[55vh] items-center justify-center">
      <div className="w-full max-w-xl text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-purple-400/10 bg-purple-500/[0.07] shadow-xl shadow-purple-950/20">
          <Sparkles
            size={27}
            className="text-purple-300"
          />
        </div>

        <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
          Qual decisão você precisa tomar?
        </h1>

        <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/35">
          Conte o contexto, as opções que você está considerando
          e o que é importante para você. O DecidlyAI organiza
          os fatores e ajuda a chegar a uma decisão mais clara.
        </p>

        <div className="mt-8 grid gap-2 text-left sm:grid-cols-2">
          {[
            "Devo escolher A ou B?",
            "Quais são os riscos dessa decisão?",
            "Compare minhas opções",
            "Me ajude a analisar este cenário",
          ].map((suggestion) => (
            <div
              key={suggestion}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-xs text-white/40"
            >
              {suggestion}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}