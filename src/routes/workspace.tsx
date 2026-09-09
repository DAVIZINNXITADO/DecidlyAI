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

function Workspace() {
  const navigate = useNavigate()

  const [userId, setUserId] = useState<string | null>(null)
  const [input, setInput] = useState("")
  const [creating, setCreating] = useState(false)

  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarProgress, setSidebarProgress] = useState(0)

  const [search, setSearch] = useState("")
  const [conversations, setConversations] = useState<Conversation[]>([])

  const [dragging, setDragging] = useState(false)

  const dragStartX = useRef(0)
  const startProgress = useRef(0)

  const SIDEBAR_WIDTH = 300

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.auth.getUser()

      if (!data.user) {
        navigate({
          to: "/login",
        })
        return
      }

      setUserId(data.user.id)

      const { data: conversationsData } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", data.user.id)
        .order("updated_at", {
          ascending: false,
        })

      if (conversationsData) {
        setConversations(
          conversationsData as Conversation[],
        )
      }
    }

    load()
  }, [navigate])

  const openSidebar = () => {
    setSidebarOpen(true)
    setSidebarProgress(1)
  }

  const closeSidebar = () => {
    setSidebarOpen(false)
    setSidebarProgress(0)
  }

  const handlePointerDown = (
    event: React.PointerEvent,
  ) => {
    const target = event.currentTarget

    target.setPointerCapture(event.pointerId)

    dragStartX.current = event.clientX
    startProgress.current = sidebarProgress

    setDragging(true)
  }

  const handlePointerMove = (
    event: React.PointerEvent,
  ) => {
    if (!dragging) return

    const difference =
      event.clientX - dragStartX.current

    let nextProgress =
      startProgress.current +
      difference / SIDEBAR_WIDTH

    nextProgress = Math.max(
      0,
      Math.min(1, nextProgress),
    )

    setSidebarProgress(nextProgress)
  }

  const handlePointerUp = (
    event: React.PointerEvent,
  ) => {
    if (!dragging) return

    const target = event.currentTarget

    try {
      target.releasePointerCapture(event.pointerId)
    } catch {
      // Ignora caso o pointer já tenha sido liberado
    }

    setDragging(false)

    if (sidebarProgress >= 0.45) {
      openSidebar()
    } else {
      closeSidebar()
    }
  }

  const createConversation = async () => {
    if (!userId || creating) return

    setCreating(true)

    const id = crypto.randomUUID()

    const { error } = await supabase
      .from("conversations")
      .insert({
        id,
        user_id: userId,
        title: "Nova decisão",
      })

    setCreating(false)

    if (error) {
      return
    }

    navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: id,
      },
    })
  }

  const filteredConversations =
    conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.toLowerCase()),
    )

  const handleSend = async () => {
    const value = input.trim()

    if (!value || !userId || creating) return

    setCreating(true)

    const id = crypto.randomUUID()

    const { error } = await supabase
      .from("conversations")
      .insert({
        id,
        user_id: userId,
        title:
          value.length > 45
            ? `${value.slice(0, 45)}...`
            : value,
      })

    if (error) {
      setCreating(false)
      return
    }

    navigate({
      to: "/workspace/$conversationId",
      params: {
        conversationId: id,
      },
      search: {},
    })

    setInput("")
    setCreating(false)
  }

  return (
    <div
      className="relative h-screen w-full overflow-hidden bg-[#090611] text-white"
      onPointerMove={(event) => {
        if (!dragging) return
        handlePointerMove(event)
      }}
    >
      {/* BACKDROP */}
      <div
        className={`pointer-events-none fixed inset-0 z-30 bg-black/60 backdrop-blur-[2px] transition-opacity ${
          dragging
            ? "duration-0"
            : "duration-300"
        }`}
        style={{
          opacity: sidebarProgress * 0.8,
        }}
        onClick={closeSidebar}
      />

      {/* SIDEBAR */}
      <aside
        className="fixed left-0 top-0 z-50 flex h-full flex-col border-r border-white/[0.08] bg-[#0d0918] shadow-2xl shadow-black/50 select-none"
        style={{
          width: SIDEBAR_WIDTH,
          transform: `translateX(${
            -SIDEBAR_WIDTH +
            SIDEBAR_WIDTH * sidebarProgress
          }px)`,
          transition: dragging
            ? "none"
            : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* HEADER */}
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
                setSearch(event.target.value)
              }
              placeholder="Pesquisar decisões"
              onPointerDown={(event) =>
                event.stopPropagation()
              }
              className="h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.035] pl-9 pr-3 text-xs text-white outline-none placeholder:text-white/25 focus:border-violet-500/40"
            />
          </div>
        </div>

        {/* LIST */}
        <div className="min-h-0 flex-1 overflow-y-auto px-3">
          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">
            Decisões
          </div>

          {filteredConversations.length === 0 ? (
            <div className="px-3 py-8 text-center text-xs text-white/25">
              Nenhuma decisão encontrada.
            </div>
          ) : (
            <div className="space-y-1">
              {filteredConversations.map(
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
                      className="text-white/0 transition group-hover:text-white/25"
                    />
                  </button>
                ),
              )}
            </div>
          )}
        </div>

        {/* ACCOUNT */}
        <div className="shrink-0 border-t border-white/[0.06] p-3">
          <button
            onClick={() => {
              navigate({
                to: "/",
              })

              closeSidebar()
            }}
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

      {/* EDGE SWIPE AREA */}
      <div
        className="fixed left-0 top-0 z-40 h-full w-5 touch-none"
        onPointerDown={(event) => {
          if (sidebarProgress === 0) {
            dragStartX.current = event.clientX
            startProgress.current = 0
            setDragging(true)

            event.currentTarget.setPointerCapture(
              event.pointerId,
            )
          }
        }}
        onPointerMove={(event) => {
          if (!dragging) return

          const difference =
            event.clientX - dragStartX.current

          let progress =
            startProgress.current +
            difference / SIDEBAR_WIDTH

          progress = Math.max(
            0,
            Math.min(1, progress),
          )

          setSidebarProgress(progress)
        }}
        onPointerUp={(event) => {
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
        }}
      />

      {/* MAIN CONTENT */}
      <main className="relative flex h-full w-full flex-col">
        {/* TOP BAR */}
        <header className="flex h-[72px] shrink-0 items-center px-4 sm:px-6">
          <button
            onClick={openSidebar}
            className="group flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.035] text-white/60 shadow-lg shadow-black/10 transition hover:border-violet-400/20 hover:bg-white/[0.06] hover:text-white active:scale-95"
            aria-label="Abrir menu"
          >
            <Menu
              size={19}
              className="transition-transform duration-200 group-hover:scale-105"
            />
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1.5 text-[10px] font-medium text-white/35">
              DecidlyAI
            </div>
          </div>
        </header>

        {/* EMPTY STATE */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-700/20 ring-1 ring-violet-400/10">
              <Sparkles
                size={25}
                className="text-violet-300"
              />
            </div>

            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Qual decisão você precisa analisar?
            </h1>

            <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/35">
              Descreva sua situação e o DecidlyAI
              ajudará você a analisar as opções,
              riscos e próximos passos.
            </p>
          </div>

          {/* INPUT */}
          <div className="w-full max-w-2xl">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl transition focus-within:border-violet-400/25 focus-within:bg-white/[0.045]">
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
                placeholder="Conte o que está acontecendo..."
                rows={3}
                className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/25"
              />

              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[10px] text-white/20">
                  Ctrl + Enter para analisar
                </span>

                <button
                  onClick={handleSend}
                  disabled={
                    !input.trim() || creating
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-25"
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="pb-5 text-center text-[10px] text-white/15">
          O DecidlyAI pode cometer erros. Revise
          informações importantes.
        </div>
      </main>
    </div>
  )
}

export default Workspace