import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ArrowUp,
  Check,
  ChevronRight,
  Copy,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Sparkles,
  X,
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

const SIDEBAR_WIDTH = 320

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
) {
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
) {
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
      .eq(
        "user_id",
        data.user.id,
      )
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

  const valid =
    !subscription?.expires_at ||
    new Date(
      subscription.expires_at,
    ).getTime() > Date.now()

  if (
    plan === "vip" &&
    active &&
    valid
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

  const [copiedId, setCopiedId] =
    useState<string | null>(null)

  const [error, setError] =
    useState<string | null>(null)

  /*
   * Sidebar
   */

  const sidebarRef =
    useRef<HTMLElement | null>(null)

  const backdropRef =
    useRef<HTMLDivElement | null>(null)

  const sidebarProgress =
    useRef(0)

  const dragStartX =
    useRef(0)

  const startProgress =
    useRef(0)

  const dragging =
    useRef(false)

  const raf =
    useRef<number | null>(null)

  const messagesEndRef =
    useRef<HTMLDivElement | null>(null)

  /*
   * Evita mandar a mesma mensagem
   * duas vezes.
   */

  const processingInitialMessage =
    useRef(false)

  const setSidebarVisual = (
    progress: number,
  ) => {
    sidebarProgress.current =
      progress

    if (raf.current !== null) {
      cancelAnimationFrame(
        raf.current,
      )
    }

    raf.current =
      requestAnimationFrame(() => {
        if (sidebarRef.current) {
          sidebarRef.current.style.transform =
            `translate3d(${
              -SIDEBAR_WIDTH +
              SIDEBAR_WIDTH *
                progress
            }px, 0, 0)`
        }

        if (backdropRef.current) {
          backdropRef.current.style.opacity =
            String(progress * 0.75)

          backdropRef.current.style.pointerEvents =
            progress > 0.01
              ? "auto"
              : "none"
        }
      })
  }

  const finishSidebar = (
    open: boolean,
  ) => {
    dragging.current = false

    const target = open ? 1 : 0

    sidebarProgress.current =
      target

    if (sidebarRef.current) {
      sidebarRef.current.style.transition =
        "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)"

      sidebarRef.current.style.transform =
        `translate3d(${
          -SIDEBAR_WIDTH +
          SIDEBAR_WIDTH *
            target
        }px, 0, 0)`
    }

    if (backdropRef.current) {
      backdropRef.current.style.transition =
        "opacity 260ms ease"

      backdropRef.current.style.opacity =
        String(target * 0.75)

      backdropRef.current.style.pointerEvents =
        target
          ? "auto"
          : "none"
    }

    window.setTimeout(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transition =
          "none"
      }

      if (backdropRef.current) {
        backdropRef.current.style.transition =
          "none"
      }
    }, 280)
  }

  const openSidebar = () => {
    finishSidebar(true)
  }

  const closeSidebar = () => {
    finishSidebar(false)
  }

  const startSidebarDrag = (
    clientX: number,
  ) => {
    dragging.current = true

    dragStartX.current =
      clientX

    startProgress.current =
      sidebarProgress.current

    if (sidebarRef.current) {
      sidebarRef.current.style.transition =
        "none"
    }

    if (backdropRef.current) {
      backdropRef.current.style.transition =
        "none"
    }
  }

  const moveSidebarDrag = (
    clientX: number,
  ) => {
    if (!dragging.current) return

    const delta =
      clientX -
      dragStartX.current

    let progress =
      startProgress.current +
      delta / SIDEBAR_WIDTH

    progress = Math.max(
      0,
      Math.min(1, progress),
    )

    setSidebarVisual(progress)
  }

  const endSidebarDrag = () => {
    if (!dragging.current) return

    const progress =
      sidebarProgress.current

    /*
     * 51% ou mais = abre.
     * 50% ou menos = fecha.
     */
    finishSidebar(
      progress > 0.5,
    )
  }

  /*
   * Carrega conversa.
   */

  const loadConversation =
    async () => {
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

      const uid =
        authData.user.id

      setUserId(uid)

      /*
       * Primeiro coloca a mensagem
       * pendente na tela imediatamente.
       */

      let pendingMessage: string | null =
        null

      try {
        pendingMessage =
          sessionStorage.getItem(
            `decidly-pending-${conversationId}`,
          )
      } catch {
        pendingMessage = null
      }

      if (
        pendingMessage &&
        pendingMessage.trim()
      ) {
        const instantMessage: Message =
          {
            id: `instant-${Date.now()}`,
            conversation_id:
              conversationId,
            user_id: uid,
            role: "user",
            content:
              pendingMessage,
            created_at:
              new Date().toISOString(),
          }

        setMessages([
          instantMessage,
        ])

        /*
         * Remove da sessionStorage para
         * não aparecer novamente em
         * um refresh.
         */
        try {
          sessionStorage.removeItem(
            `decidly-pending-${conversationId}`,
          )
        } catch {
          // Ignora
        }

        /*
         * A IA começa imediatamente.
         */
        if (
          !processingInitialMessage.current
        ) {
          processingInitialMessage.current =
            true

          void processMessage(
            uid,
            pendingMessage,
            [],
          )
        }
      }

      const [
        conversationResult,
        conversationsResult,
        messagesResult,
      ] = await Promise.all([
        supabase
          .from("conversations")
          .select("*")
          .eq(
            "id",
            conversationId,
          )
          .eq(
            "user_id",
            uid,
          )
          .maybeSingle(),

        supabase
          .from("conversations")
          .select("*")
          .eq(
            "user_id",
            uid,
          )
          .order(
            "updated_at",
            {
              ascending: false,
            },
          ),

        supabase
          .from("messages")
          .select("*")
          .eq(
            "conversation_id",
            conversationId,
          )
          .eq(
            "user_id",
            uid,
          )
          .order(
            "created_at",
            {
              ascending: true,
            },
          ),
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

      /*
       * Se existe mensagem pendente,
       * não sobrescreve a mensagem
       * instantânea.
       */
      if (
        !pendingMessage
      ) {
        setMessages(
          (messagesResult.data ??
            []) as Message[],
        )
      } else if (
        messagesResult.data
      ) {
        const databaseMessages =
          messagesResult.data as Message[]

        setMessages(
          databaseMessages.length
            ? databaseMessages
            : [
                {
                  id: `instant-${Date.now()}`,
                  conversation_id:
                    conversationId,
                  user_id: uid,
                  role: "user",
                  content:
                    pendingMessage,
                  created_at:
                    new Date().toISOString(),
                },
              ],
        )
      }

      setLoading(false)
    }

  useEffect(() => {
    loadConversation()
  }, [conversationId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    )
  }, [messages, sending])

  /*
   * Envio da IA.
   */

  const processMessage =
    async (
      uid: string,
      text: string,
      history: {
        role:
          | "user"
          | "assistant"
        content: string
      }[],
    ) => {
      setSending(true)

      try {
        const functionName =
          await getAiFunction(
            setModelLabel,
          )

        const {
          data,
          error:
            functionError,
        } =
          await supabase.functions.invoke(
            functionName,
            {
              body: {
                message: text,
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
            status:
              data.status,
            message:
              data.error,
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

        const answer =
          data.response.trim()

        /*
         * Salva a mensagem do usuário.
         */
        await supabase
          .from("messages")
          .insert({
            conversation_id:
              conversationId,
            user_id: uid,
            role: "user",
            content: text,
          })

        /*
         * Salva a resposta.
         */
        await supabase
          .from("messages")
          .insert({
            conversation_id:
              conversationId,
            user_id: uid,
            role: "assistant",
            content: answer,
          })

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
            uid,
          )

        const assistantMessage: Message =
          {
            id: crypto.randomUUID(),
            conversation_id:
              conversationId,
            user_id: uid,
            role: "assistant",
            content: answer,
            created_at:
              new Date().toISOString(),
          }

        /*
         * Remove qualquer mensagem
         * temporária/duplicada do usuário
         * com o mesmo conteúdo e garante
         * uma única mensagem visível.
         */
        setMessages(
          (current) => {
            const withoutDuplicates =
              current.filter(
                (message) =>
                  !(
                    message.role ===
                      "user" &&
                    message.content ===
                      text &&
                    message.id.startsWith(
                      "instant-",
                    )
                  ),
              )

            return [
              ...withoutDuplicates,
              {
                id: crypto.randomUUID(),
                conversation_id:
                  conversationId,
                user_id: uid,
                role: "user",
                content: text,
                created_at:
                  new Date().toISOString(),
              },
              assistantMessage,
            ]
          },
        )
      } catch (caught) {
        const typed =
          caught as {
            status?: number
            message?: string
          }

        setMessages(
          (current) => [
            ...current,
            {
              id: crypto.randomUUID(),
              conversation_id:
                conversationId,
              user_id: uid,
              role: "assistant",
              content:
                getFriendlyAiError(
                  typed.status,
                  typed.message,
                ),
              created_at:
                new Date().toISOString(),
            },
          ],
        )
      } finally {
        setSending(false)
        processingInitialMessage.current =
          false
      }
    }

  /*
   * Mensagem enviada dentro de uma
   * conversa já existente.
   */

  const sendMessage = async () => {
    const text =
      input.trim()

    if (
      !text ||
      sending ||
      !userId
    ) {
      return
    }

    setInput("")

    const instantMessage: Message =
      {
        id: `instant-${Date.now()}`,
        conversation_id:
          conversationId,
        user_id: userId,
        role: "user",
        content: text,
        created_at:
          new Date().toISOString(),
      }

    /*
     * Aparece na mesma hora.
     */
    setMessages(
      (current) => [
        ...current,
        instantMessage,
      ],
    )

    const history =
      messages
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content:
            message.content,
        }))

    void processMessage(
      userId,
      text,
      history,
    )
  }

  const copyMessage = async (
    message: Message,
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      )

      setCopiedId(message.id)

      window.setTimeout(() => {
        setCopiedId(null)
      }, 1500)
    } catch {
      // Ignora
    }
  }

  const createConversation =
    async () => {
      if (!userId) return

      const id =
        crypto.randomUUID()

      const { error: insertError } =
        await supabase
          .from("conversations")
          .insert({
            id,
            user_id: userId,
            title:
              "Nova decisão",
          })

      if (insertError) {
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

  const filtered =
    useMemo(() => {
      const term =
        search
          .trim()
          .toLowerCase()

      if (!term) {
        return conversations
      }

      return conversations.filter(
        (item) =>
          item.title
            .toLowerCase()
            .includes(term),
      )
    }, [
      conversations,
      search,
    ])

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#090611] text-white">

      {/* =====================================================
          BACKDROP
      ====================================================== */}

      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
        style={{
          opacity: 0,
          pointerEvents: "none",
        }}
        onClick={closeSidebar}
      />

      {/* =====================================================
          SIDEBAR
      ====================================================== */}

      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/[0.08] bg-[#0c0816] shadow-[20px_0_70px_rgba(0,0,0,0.45)]"
        style={{
          width: SIDEBAR_WIDTH,
          transform: `translate3d(-${SIDEBAR_WIDTH}px,0,0)`,
          transition: "none",
          willChange: "transform",
          touchAction: "pan-y",
        }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(
            event.pointerId,
          )

          startSidebarDrag(
            event.clientX,
          )
        }}
        onPointerMove={(event) => {
          if (!dragging.current)
            return

          moveSidebarDrag(
            event.clientX,
          )
        }}
        onPointerUp={() => {
          endSidebarDrag()
        }}
        onPointerCancel={() => {
          endSidebarDrag()
        }}
      >

        {/* HEADER */}

        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <Link
            to="/workspace"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
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
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={closeSidebar}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/[0.06] hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* NOVA DECISÃO */}

        <div className="p-4">
          <button
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={createConversation}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-purple-950/30 transition active:scale-[0.98]"
          >
            <Plus size={17} />
            Nova decisão
          </button>
        </div>

        {/* SEARCH */}

        <div
          className="px-4 pb-4"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
        >
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
              placeholder="Pesquisar decisões"
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-500/40"
            />
          </div>
        </div>

        {/* HISTÓRICO */}

        <div
          className="min-h-0 flex-1 overflow-y-auto px-3"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
        >
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
            Suas decisões
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-white/25">
              Nenhuma decisão encontrada.
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map(
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
                        className="text-white/15"
                      />
                    </button>
                  )
                },
              )}
            </div>
          )}
        </div>

        {/* CONTA */}

        <div
          className="shrink-0 border-t border-white/[0.06] p-3"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
        >
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

            <div>
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

      {/* =====================================================
          BORDA PARA COMEÇAR O SWIPE
      ====================================================== */}

      <div
        className="fixed left-0 top-0 z-30 h-full w-7 touch-none"
        onPointerDown={(event) => {
          if (
            sidebarProgress.current !== 0
          ) {
            return
          }

          event.currentTarget.setPointerCapture(
            event.pointerId,
          )

          dragging.current = true
          dragStartX.current =
            event.clientX
          startProgress.current = 0

          if (sidebarRef.current) {
            sidebarRef.current.style.transition =
              "none"
          }
        }}
        onPointerMove={(event) => {
          if (!dragging.current)
            return

          moveSidebarDrag(
            event.clientX,
          )
        }}
        onPointerUp={() => {
          endSidebarDrag()
        }}
        onPointerCancel={() => {
          endSidebarDrag()
        }}
      />

      {/* =====================================================
          CHAT
      ====================================================== */}

      <main className="flex h-full w-full flex-col">

        {/* HEADER */}

        <header className="flex h-[72px] shrink-0 items-center gap-3 px-4 sm:px-6">
          <button
            onClick={openSidebar}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/60 transition hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            <Menu size={19} />
          </button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-white/80">
              {conversation?.title ??
                "Nova decisão"}
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

        {/* ===================================================
            MENSAGENS
        ==================================================== */}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-32 sm:px-8">
          <div className="mx-auto max-w-3xl pt-5">

            {loading &&
            messages.length === 0 ? (
              <div className="flex min-h-[55vh] items-center justify-center">
                <div className="flex items-center gap-3 text-sm text-white/30">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/10 border-t-violet-400" />
                  Abrindo decisão...
                </div>
              </div>
            ) : error ? (
              <div className="flex min-h-[50vh] items-center justify-center">
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
                        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-violet-600/90 px-4 py-3 text-sm leading-6 shadow-lg shadow-violet-950/20 sm:max-w-[80%]">
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

                            <div className="prose prose-invert prose-sm max-w-none prose-p:leading-7 prose-p:text-white/65 prose-headings:text-white prose-strong:text-white prose-li:text-white/65">
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

                            <div className="mt-5 border-t border-white/[0.06] pt-3">
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

                {/* DIGITANDO */}

                {sending && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
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

                <div
                  ref={
                    messagesEndRef
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            INPUT
        ==================================================== */}

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
                  <ArrowUp size={17} />
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