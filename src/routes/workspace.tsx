import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { useEffect, useRef, useState } from "react"
import {
  ArrowUp,
  ChevronRight,
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

export const Route = createFileRoute("/workspace")({
  component: Workspace,
})

type Conversation = {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

const SIDEBAR_WIDTH = 320

function Workspace() {
  const navigate = useNavigate()

  const [userId, setUserId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const sidebarRef = useRef<HTMLElement | null>(null)
  const backdropRef = useRef<HTMLDivElement | null>(null)

  const sidebarProgress = useRef(0)
  const dragStartX = useRef(0)
  const startProgress = useRef(0)
  const dragging = useRef(false)
  const raf = useRef<number | null>(null)

  const setSidebarVisual = (progress: number) => {
    sidebarProgress.current = progress

    if (raf.current !== null) {
      cancelAnimationFrame(raf.current)
    }

    raf.current = requestAnimationFrame(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transform =
          `translate3d(${
            -SIDEBAR_WIDTH +
            SIDEBAR_WIDTH * progress
          }px, 0, 0)`
      }

      if (backdropRef.current) {
        backdropRef.current.style.opacity =
          String(progress * 0.75)

        backdropRef.current.style.pointerEvents =
          progress > 0.01 ? "auto" : "none"
      }
    })
  }

  const finishSidebar = (open: boolean) => {
    dragging.current = false

    const target = open ? 1 : 0

    sidebarProgress.current = target

    if (sidebarRef.current) {
      sidebarRef.current.style.transition =
        "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)"

      sidebarRef.current.style.transform =
        `translate3d(${
          -SIDEBAR_WIDTH +
          SIDEBAR_WIDTH * target
        }px, 0, 0)`
    }

    if (backdropRef.current) {
      backdropRef.current.style.transition =
        "opacity 260ms ease"

      backdropRef.current.style.opacity =
        String(target * 0.75)

      backdropRef.current.style.pointerEvents =
        target ? "auto" : "none"
    }

    window.setTimeout(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = "none"
      }

      if (backdropRef.current) {
        backdropRef.current.style.transition = "none"
      }
    }, 280)
  }

  const openSidebar = () => {
    finishSidebar(true)
  }

  const closeSidebar = () => {
    finishSidebar(false)
  }

  const startDrag = (
    clientX: number,
    pointerTarget?: HTMLElement,
  ) => {
    if (pointerTarget) {
      try {
        pointerTarget.setPointerCapture(
          Number((pointerTarget as any).__pointerId),
        )
      } catch {
        // Ignora
      }
    }

    dragging.current = true
    dragStartX.current = clientX
    startProgress.current =
      sidebarProgress.current

    if (sidebarRef.current) {
      sidebarRef.current.style.transition = "none"
    }

    if (backdropRef.current) {
      backdropRef.current.style.transition = "none"
    }
  }

  const moveDrag = (clientX: number) => {
    if (!dragging.current) return

    const delta =
      clientX - dragStartX.current

    let progress =
      startProgress.current +
      delta / SIDEBAR_WIDTH

    progress = Math.max(
      0,
      Math.min(1, progress),
    )

    setSidebarVisual(progress)
  }

  const endDrag = () => {
    if (!dragging.current) return

    const progress =
      sidebarProgress.current

    finishSidebar(progress > 0.5)
  }

  useEffect(() => {
    const load = async () => {
      const { data } =
        await supabase.auth.getUser()

      if (!data.user) {
        navigate({
          to: "/login",
        })
        return
      }

      setUserId(data.user.id)

      const { data: list } =
        await supabase
          .from("conversations")
          .select("*")
          .eq("user_id", data.user.id)
          .order("updated_at", {
            ascending: false,
          })

      if (list) {
        setConversations(
          list as Conversation[],
        )
      }
    }

    load()
  }, [navigate])

  const createConversation = async (
    firstMessage?: string,
  ) => {
    if (!userId || creating) return

    const message = firstMessage?.trim() ?? ""

    setCreating(true)

    const id = crypto.randomUUID()

    const title = message
      ? message.length > 55
        ? `${message.slice(0, 55)}...`
        : message
      : "Nova decisão"

    const { error } =
      await supabase
        .from("conversations")
        .insert({
          id,
          user_id: userId,
          title,
        })

    if (error) {
      setCreating(false)
      return
    }

    if (message) {
      sessionStorage.setItem(
        `decidly-pending-${id}`,
        message,
      )
    }

    navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: id,
      },
    })

    setInput("")
    setCreating(false)
  }

  const handleSend = () => {
    const message = input.trim()

    if (!message || creating) return

    createConversation(message)
  }

  const filtered =
    conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.toLowerCase()),
    )

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#090611] text-white">

      {/* =========================================================
          BACKDROP
      ========================================================== */}

      <div
        ref={backdropRef}
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px]"
        style={{
          opacity: 0,
          pointerEvents: "none",
        }}
        onClick={closeSidebar}
      />

      {/* =========================================================
          SIDEBAR
      ========================================================== */}

      <aside
        ref={sidebarRef}
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/[0.08] bg-[#0c0816] shadow-[20px_0_70px_rgba(0,0,0,0.45)]"
        style={{
          width: SIDEBAR_WIDTH,
          transform: `translate3d(-${SIDEBAR_WIDTH}px,0,0)`,
          transition: "none",
          touchAction: "pan-y",
          willChange: "transform",
        }}
        onPointerDown={(event) => {
          ;(
            event.currentTarget as any
          ).__pointerId = event.pointerId

          startDrag(
            event.clientX,
            event.currentTarget,
          )
        }}
        onPointerMove={(event) => {
          if (!dragging.current) return

          moveDrag(event.clientX)
        }}
        onPointerUp={() => {
          endDrag()
        }}
        onPointerCancel={() => {
          endDrag()
        }}
      >
        {/* LOGO */}

        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/[0.06] px-5">
          <div className="flex items-center gap-3">
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
          </div>

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
            onClick={() =>
              createConversation()
            }
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-purple-950/30 transition active:scale-[0.98]"
          >
            <Plus size={17} />
            Nova decisão
          </button>
        </div>

        {/* BUSCA */}

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
                setSearch(event.target.value)
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
                (conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => {
                      navigate({
                        to: "/workspace/$conversationId",
                        params: {
                          conversationId:
                            conversation.id,
                        },
                      })

                      closeSidebar()
                    }}
                    className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-white/[0.05]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05]">
                      <Sparkles
                        size={14}
                        className="text-violet-300/70"
                      />
                    </div>

                    <span className="min-w-0 flex-1 truncate text-xs text-white/65">
                      {conversation.title}
                    </span>

                    <ChevronRight
                      size={14}
                      className="text-white/15"
                    />
                  </button>
                ),
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

      {/* =========================================================
          ÁREA DE GESTO PELA BORDA
      ========================================================== */}

      <div
        className="fixed left-0 top-0 z-30 h-full w-5 touch-none"
        onPointerDown={(event) => {
          if (sidebarProgress.current > 0) {
            return
          }

          ;(
            event.currentTarget as any
          ).__pointerId = event.pointerId

          try {
            event.currentTarget.setPointerCapture(
              event.pointerId,
            )
          } catch {
            // Ignora
          }

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
          if (!dragging.current) return

          moveDrag(event.clientX)
        }}
        onPointerUp={() => {
          endDrag()
        }}
        onPointerCancel={() => {
          endDrag()
        }}
      />

      {/* =========================================================
          CHAT
      ========================================================== */}

      <main className="flex h-full w-full flex-col">

        {/* HEADER */}

        <header className="flex h-[72px] shrink-0 items-center justify-between px-4 sm:px-6">
          <button
            onClick={openSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/60 transition hover:bg-white/[0.06] hover:text-white active:scale-95"
          >
            <Menu size={19} />
          </button>

          <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-white/30">
            DecidlyAI
          </div>
        </header>

        {/* CENTRO */}

        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">

          <div className="mb-8 text-center">

            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-violet-600/25 to-purple-700/20 ring-1 ring-violet-400/10">
              <Sparkles
                size={27}
                className="text-violet-300"
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Qual decisão você precisa analisar?
            </h1>

            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/35">
              Descreva sua situação e o DecidlyAI
              ajudará você a analisar as opções,
              riscos e próximos passos.
            </p>
          </div>

          {/* INPUT */}

          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2 shadow-2xl shadow-black/30 backdrop-blur-xl focus-within:border-violet-400/25">

              <textarea
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey ||
                      event.metaKey)
                  ) {
                    event.preventDefault()
                    handleSend()
                  }
                }}
                rows={3}
                placeholder="Conte o que está acontecendo..."
                className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/25"
              />

              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] text-white/20">
                  Ctrl + Enter para analisar
                </span>

                <button
                  onClick={handleSend}
                  disabled={
                    !input.trim() ||
                    creating
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-5 text-center text-[9px] text-white/15">
          O DecidlyAI pode cometer erros. Revise informações importantes.
        </div>
      </main>
    </div>
  )
}

export default Workspace