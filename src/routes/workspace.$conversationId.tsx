import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import { useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowUp,
  ChevronRight,
  Copy,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  X,
  Check,
} from "lucide-react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute(
  "/workspace/$conversationId",
)({
  component: ConversationWorkspace,
})

type Conversation = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

type Message = {
  id: string
  conversation_id: string
  user_id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

type Subscription = {
  plan: string | null
  status: string | null
  expires_at: string | null
}

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
): string {
  const message = String(
    backendMessage ?? "",
  ).toLowerCase()

  if (
    status === 402 ||
    message.includes("credit") ||
    message.includes("crédito")
  ) {
    return "Sua conta não possui créditos disponíveis para realizar essa análise."
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite")
  ) {
    return "O limite de uso da IA foi atingido. Aguarde um pouco e tente novamente."
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("unauthorized") ||
    message.includes("authentication") ||
    message.includes("auth")
  ) {
    return "Sua sessão não está autorizada. Faça login novamente."
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes."
  }

  if (message.includes("timeout")) {
    return "A análise demorou mais que o esperado. Tente novamente."
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection")
  ) {
    return "Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente."
  }

  return "Não foi possível concluir a análise agora. Tente novamente."
}

async function getAiFunction(
  setModelLabel: (
    value: string,
  ) => void,
): Promise<string> {
  const { data, error } =
    await supabase.auth.getUser()

  if (error || !data.user) {
    throw {
      status: 401,
      message: "Usuário não autenticado",
    }
  }

  const { data: subscription } =
    await supabase
      .from("subscription")
      .select(
        "plan,status,expires_at",
      )
      .eq("user_id", data.user.id)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle<Subscription>()

  const plan = String(
    subscription?.plan ?? "",
  ).toLowerCase()

  const status = String(
    subscription?.status ?? "",
  ).toLowerCase()

  const active =
    status === "active" ||
    status === "ativo"

  const validDate =
    !subscription?.expires_at ||
    new Date(
      subscription.expires_at,
    ).getTime() > Date.now()

  if (
    plan === "vip" &&
    active &&
    validDate
  ) {
    setModelLabel("VIP")
    return "decidly-ai"
  }

  setModelLabel("Free")
  return "decidly-ai-free"
}

function ConversationWorkspace() {
  const { conversationId } =
    Route.useParams()

  const navigate = useNavigate()

  const [userId, setUserId] =
    useState<string | null>(null)

  const [conversation, setConversation] =
    useState<Conversation | null>(null)

  const [messages, setMessages] =
    useState<Message[]>([])

  const [conversations, setConversations] =
    useState<Conversation[]>([])

  const [input, setInput] =
    useState("")

  const [loading, setLoading] =
    useState(true)

  const [sending, setSending] =
    useState(false)

  const [modelLabel, setModelLabel] =
    useState("Free")

  const [search, setSearch] =
    useState("")

  const [sidebarProgress, setSidebarProgress] =
    useState(0)

  const [dragging, setDragging] =
    useState(false)

  const [copiedId, setCopiedId] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  const dragStartX =
    useRef(0)

  const startProgress =
    useRef(0)

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null)

  const SIDEBAR_WIDTH = 300

  const sidebarOpen =
    sidebarProgress > 0

  const openSidebar = () => {
    setSidebarProgress(1)
  }

  const closeSidebar = () => {
    setSidebarProgress(0)
  }

  const loadData = async () => {
    setLoading(true)
    setError(null)

    const { data: authData } =
      await supabase.auth.getUser()

    if (!authData.user) {
      navigate({
        to: "/login",
      })
      return
    }

    const uid = authData.user.id

    setUserId(uid)

    const [
      conversationResult,
      conversationsResult,
      messagesResult,
    ] = await Promise.all([
      supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", uid)
        .maybeSingle(),

      supabase
        .from("conversations")
        .select("*")
        .eq("user_id", uid)
        .order("updated_at", {
          ascending: false,
        }),

      supabase
        .from("messages")
        .select("*")
        .eq(
          "conversation_id",
          conversationId,
        )
        .eq("user_id", uid)
        .order("created_at", {
          ascending: true,
        }),
    ])

    if (
      conversationResult.error ||
      !conversationResult.data
    ) {
      setError(
        "Esta decisão não existe ou você não tem acesso a ela.",
      )
      setLoading(false)
      return
    }

    setConversation(
      conversationResult.data as Conversation,
    )

    setConversations(
      (conversationsResult.data ??
        []) as Conversation[],
    )

    setMessages(
      (messagesResult.data ??
        []) as Message[],
    )

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    })
  }, [messages, sending])

  const filteredConversations =
    useMemo(() => {
      const term =
        search.trim().toLowerCase()

      if (!term) {
        return conversations
      }

      return conversations.filter(
        (item) =>
          item.title
            .toLowerCase()
            .includes(term),
      )
    }, [conversations, search])

  const createConversation = async () => {
    if (!userId) return

    const id = crypto.randomUUID()

    const { error } =
      await supabase
        .from("conversations")
        .insert({
          id,
          user_id: userId,
          title: "Nova decisão",
        })

    if (error) {
      return
    }

    navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: id,
      },
    })

    closeSidebar()
  }

  const copyMessage = async (
    message: Message,
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      )

      setCopiedId(message.id)

      setTimeout(() => {
        setCopiedId(null)
      }, 1500)
    } catch {
      // Clipboard indisponível
    }
  }

  const sendMessage = async () => {
    const trimmed =
      input.trim()

    if (
      !trimmed ||
      sending ||
      !userId
    ) {
      return
    }

    setInput("")
    setSending(true)
    setError(null)

    const temporaryMessage: Message = {
      id: `temporary-${Date.now()}`,
      conversation_id:
        conversationId,
      user_id: userId,
      role: "user",
      content: trimmed,
      created_at:
        new Date().toISOString(),
    }

    setMessages((current) => [
      ...current,
      temporaryMessage,
    ])

    try {
      const functionName =
        await getAiFunction(
          setModelLabel,
        )

      const history = messages
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        }))

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        functionName,
        {
          body: {
            message: trimmed,
            history,
            conversationId,
          },
        },
      )

      if (functionError) {
        let backendMessage =
          functionError.message

        try {
          if (
            functionError.context
          ) {
            const cloned =
              functionError.context.clone()

            const json =
              await cloned.json()

            backendMessage =
              json?.error ??
              json?.message ??
              backendMessage
          }
        } catch {
          // Mantém mensagem original
        }

        throw {
          status:
            functionError.context
              ?.status,
          message:
            backendMessage,
        }
      }

      if (data?.error) {
        throw {
          status: data.status,
          message: data.error,
        }
      }

      if (
        !data ||
        typeof data.response !==
          "string" ||
        !data.response.trim()
      ) {
        throw {
          status: 500,
          message:
            "Resposta inválida da IA.",
        }
      }

      const assistantMessage: Message =
        {
          id: crypto.randomUUID(),
          conversation_id:
            conversationId,
          user_id: userId,
          role: "assistant",
          content:
            data.response.trim(),
          created_at:
            new Date().toISOString(),
        }

      const { error: userInsertError } =
        await supabase
          .from("messages")
          .insert({
            conversation_id:
              conversationId,
            user_id: userId,
            role: "user",
            content: trimmed,
          })

      if (userInsertError) {
        throw {
          status: 500,
          message:
            userInsertError.message,
        }
      }

      const {
        error: assistantInsertError,
      } = await supabase
        .from("messages")
        .insert({
          conversation_id:
            conversationId,
          user_id: userId,
          role: "assistant",
          content:
            assistantMessage.content,
        })

      if (assistantInsertError) {
        throw {
          status: 500,
          message:
            assistantInsertError.message,
        }
      }

      await supabase
        .from("conversations")
        .update({
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          conversationId,
        )
        .eq(
          "user_id",
          userId,
        )

      setMessages((current) =>
        current
          .filter(
            (message) =>
              message.id !==
              temporaryMessage.id,
          )
          .concat([
            {
              ...temporaryMessage,
              id: crypto.randomUUID(),
            },
            assistantMessage,
          ]),
      )

      setConversations((current) =>
        current.map((item) =>
          item.id ===
          conversationId
            ? {
                ...item,
                updated_at:
                  new Date().toISOString(),
              }
            : item,
        ),
      )
    } catch (caught) {
      const typed =
        caught as {
          status?: number
          message?: string
        }

      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          conversation_id:
            conversationId,
          user_id: userId,
          role: "assistant",
          content:
            getFriendlyAiError(
              typed.status,
              typed.message,
            ),
          created_at:
            new Date().toISOString(),
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handlePointerDown = (
    event: React.PointerEvent,
  ) => {
    event.currentTarget.setPointerCapture(
      event.pointerId,
    )

    dragStartX.current =
      event.clientX

    startProgress.current =
      sidebarProgress

    setDragging(true)
  }

  const handlePointerMove = (
    event: React.PointerEvent,
  ) => {
    if (!dragging) return

    const difference =
      event.clientX -
      dragStartX.current

    let progress =
      startProgress.current +
      difference / SIDEBAR_WIDTH

    progress = Math.max(
      0,
      Math.min(1, progress),
    )

    setSidebarProgress(progress)
  }

  const handlePointerUp = (
    event: React.PointerEvent,
  ) => {
    if (!dragging) return

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      )
    } catch {
      // Ignora
    }

    setDragging(false)

    if (sidebarProgress >= 0.45) {
      openSidebar()
    } else {
      closeSidebar()
    }
  }

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-[#090611] text-white"
      onPointerMove={
        dragging
          ? handlePointerMove
          : undefined
      }
    >
      {/* BACKDROP */}
      <div
        className="fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px]"
        style={{
          opacity:
            sidebarProgress * 0.8,
          pointerEvents:
            sidebarProgress > 0
              ? "auto"
              : "none",
          transition: dragging
            ? "none"
            : "opacity 280ms ease",
        }}
        onClick={closeSidebar}
      />

      {/* SIDEBAR */}
      <aside
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/[0.08] bg-[#0d0918] shadow-2xl shadow-black/60"
        style={{
          width: SIDEBAR_WIDTH,
          transform: `translateX(${
            -SIDEBAR_WIDTH +
            SIDEBAR_WIDTH *
              sidebarProgress
          }px)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerUp
        }
      >
        {/* HEADER */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <Link
            to="/workspace"
            onClick={closeSidebar}
            className="flex items-center gap-3"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-700 shadow-lg shadow-purple-950/40">
              <Sparkles size={17} />
            </div>

            <div>
              <div className="text-[15px] font-semibold">
                DecidlyAI
              </div>

              <div className="text-[9px] uppercase tracking-[0.18em] text-white/30">
                Decision intelligence
              </div>
            </div>
          </Link>

          <button
            onClick={closeSidebar}
            className="rounded-lg p-2 text-white/40 transition hover:bg-white/5 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* NEW */}
        <div className="p-4">
          <button
            onClick={createConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-purple-950/30 transition hover:brightness-110 active:scale-[0.98]"
          >
            <Plus size={17} />
            Nova decisão
          </button>
        </div>

        {/* SEARCH */}
        <div className="px-4 pb-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/25"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              onPointerDown={(event) =>
                event.stopPropagation()
              }
              placeholder="Pesquisar decisões"
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-500/40"
            />
          </div>
        </div>

        {/* HISTORY */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
            Decisões
          </div>

          {filteredConversations.length ===
          0 ? (
            <div className="px-3 py-8 text-center text-xs text-white/25">
              Nenhuma decisão encontrada.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map(
                (item) => {
                  const active =
                    item.id ===
                    conversationId

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        navigate({
                          to: "/workspace/$conversationId",
                          params: {
                            conversationId:
                              item.id,
                          },
                        })

                        closeSidebar()
                      }}
                      className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                        active
                          ? "bg-violet-500/10 text-white"
                          : "text-white/60 hover:bg-white/[0.05]"
                      }`}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          active
                            ? "bg-violet-500/15"
                            : "bg-white/[0.05]"
                        }`}
                      >
                        <MessageSquare
                          size={14}
                          className={
                            active
                              ? "text-violet-300"
                              : "text-white/30"
                          }
                        />
                      </div>

                      <span className="min-w-0 flex-1 truncate text-xs">
                        {item.title}
                      </span>

                      <ChevronRight
                        size={14}
                        className="text-white/20"
                      />
                    </button>
                  )
                },
              )}
            </div>
          )}
        </div>

        {/* ACCOUNT */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button
            onClick={() =>
              navigate({
                to: "/",
              })
            }
            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.04]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-600 text-xs font-bold">
              D
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white/70">
                Minha conta
              </div>

              <div className="text-[10px] text-white/25">
                Configurações
              </div>
            </div>
          </button>
        </div>
      </aside>

      {/* EDGE SWIPE */}
      <div
        className="fixed left-0 top-0 z-40 h-full w-6 touch-none"
        onPointerDown={(event) => {
          if (
            sidebarProgress !== 0
          ) {
            return
          }

          dragStartX.current =
            event.clientX

          startProgress.current = 0

          setDragging(true)

          event.currentTarget.setPointerCapture(
            event.pointerId,
          )
        }}
        onPointerMove={
          dragging
            ? handlePointerMove
            : undefined
        }
        onPointerUp={
          dragging
            ? handlePointerUp
            : undefined
        }
      />

      {/* MAIN */}
      <main className="relative flex h-full w-full flex-col">
        {/* TOP */}
        <header className="flex h-[72px] shrink-0 items-center gap-3 px-4 sm:px-6">
          <button
            onClick={openSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/60 transition hover:border-violet-400/20 hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white/80">
              {conversation?.title ??
                "Decisão"}
            </h1>

            <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/25">
              <span>
                Análise DecidlyAI
              </span>

              <span>•</span>

              <span>
                {modelLabel}
              </span>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] text-white/30 sm:block">
            Análise concluída
          </div>
        </header>

        {/* CONTENT */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 sm:px-8">
          <div className="mx-auto max-w-3xl pt-6">
            {loading ? (
              <div className="flex min-h-[50vh] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-white/30">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
                  Carregando análise...
                </div>
              </div>
            ) : error ? (
              <div className="rounded-2xl border border-red-400/10 bg-red-500/[0.04] p-6 text-center">
                <p className="text-sm text-white/60">
                  {error}
                </p>

                <Link
                  to="/workspace"
                  className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold"
                >
                  Voltar ao workspace
                </Link>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex min-h-[55vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Sparkles
                    size={25}
                    className="text-violet-300"
                  />
                </div>

                <h2 className="text-xl font-semibold">
                  Vamos analisar essa decisão.
                </h2>

                <p className="mt-2 max-w-md text-sm leading-6 text-white/30">
                  Descreva a situação, as opções
                  que você está considerando e o
                  que mais importa para você.
                </p>
              </div>
            ) : (
              <div className="space-y-7">
                {messages.map(
                  (message) => (
                    <div
                      key={message.id}
                      className={
                        message.role ===
                        "user"
                          ? "flex justify-end"
                          : "flex justify-start"
                      }
                    >
                      {message.role ===
                      "user" ? (
                        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-violet-600/90 px-4 py-3 text-sm leading-6 shadow-lg shadow-violet-950/20">
                          {message.content}
                        </div>
                      ) : (
                        <div className="w-full max-w-3xl">
                          <div className="mb-3 flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                              <Sparkles
                                size={13}
                              />
                            </div>

                            <span className="text-xs font-semibold text-white/60">
                              DecidlyAI
                            </span>
                          </div>

                          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-5 shadow-xl shadow-black/10">
                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-headings:text-white prose-p:text-white/65 prose-strong:text-white prose-li:text-white/65">
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

                            <div className="mt-5 flex items-center border-t border-white/[0.06] pt-3">
                              <button
                                onClick={() =>
                                  copyMessage(
                                    message,
                                  )
                                }
                                className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[10px] text-white/25 transition hover:bg-white/5 hover:text-white/60"
                              >
                                {copiedId ===
                                message.id ? (
                                  <>
                                    <Check
                                      size={
                                        13
                                      }
                                    />
                                    Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy
                                      size={
                                        13
                                      }
                                    />
                                    Copiar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                )}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                      <Sparkles
                        size={13}
                      />
                    </div>

                    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] px-5 py-4">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300" />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300"
                          style={{
                            animationDelay:
                              "120ms",
                          }}
                        />
                        <span
                          className="h-1.5 w-1.5 animate-bounce rounded-full bg-violet-300"
                          style={{
                            animationDelay:
                              "240ms",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* INPUT FIXO */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 z-20 px-4 pb-4 sm:px-8">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/[0.08] bg-[#100b1b]/95 p-2 shadow-2xl shadow-black/40 backdrop-blur-xl transition focus-within:border-violet-400/25">
              <textarea
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={(event) => {
                  if (
                    event.key ===
                      "Enter" &&
                    (event.ctrlKey ||
                      event.metaKey)
                  ) {
                    event.preventDefault()
                    sendMessage()
                  }
                }}
                disabled={sending}
                rows={2}
                placeholder="Continue a análise..."
                className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/25 disabled:opacity-50"
              />

              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] text-white/20">
                  Ctrl + Enter para enviar
                </span>

                <button
                  onClick={sendMessage}
                  disabled={
                    !input.trim() ||
                    sending
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ArrowUp
                    size={17}
                  />
                </button>
              </div>
            </div>

            <p className="mt-2 text-center text-[9px] text-white/15">
              O DecidlyAI pode cometer erros.
              Revise informações importantes.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ConversationWorkspace