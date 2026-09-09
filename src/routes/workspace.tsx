import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({ component: Workspace });
type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};
const WIDTH = 320;

function Workspace() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [items, setItems] = useState<Conversation[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const p = useRef(0);
  const start = useRef(0);
  const startP = useRef(0);
  const dragging = useRef(false);
  const raf = useRef<number | null>(null);
  const paint = (value: number) => {
    p.current = Math.max(0, Math.min(1, value));
    if (raf.current !== null) cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      if (sidebar.current)
        sidebar.current.style.transform = `translate3d(${-WIDTH + WIDTH * p.current}px,0,0)`;
      if (backdrop.current) {
        backdrop.current.style.opacity = String(p.current * 0.72);
        backdrop.current.style.pointerEvents = p.current > 0.01 ? "auto" : "none";
      }
    });
  };
  const settle = (value: boolean) => {
    setOpen(value);
    if (sidebar.current)
      sidebar.current.style.transition = "transform 260ms cubic-bezier(.22,1,.36,1)";
    if (backdrop.current) backdrop.current.style.transition = "opacity 260ms ease";
    paint(value ? 1 : 0);
    window.setTimeout(() => {
      if (sidebar.current) sidebar.current.style.transition = "none";
      if (backdrop.current) backdrop.current.style.transition = "none";
    }, 280);
  };
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        await navigate({ to: "/login" });
        return;
      }
      if (!alive) return;
      setUserId(data.user.id);
      const { data: rows } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", data.user.id)
        .order("updated_at", { ascending: false });
      if (alive && rows) setItems(rows as Conversation[]);
    })();
    return () => {
      alive = false;
    };
  }, [navigate]);
  const create = async () => {
    const text = input.trim();
    if (!userId || !text || busy) return;
    setBusy(true);
    const id = crypto.randomUUID();
    const { error } = await supabase
      .from("conversations")
      .insert({ id, user_id: userId, title: text.length > 70 ? `${text.slice(0, 70)}…` : text });
    if (!error) {
      sessionStorage.setItem(`decidly-pending-${id}`, text);
      setInput("");
      await navigate({ to: "/workspace/$conversationId", params: { conversationId: id } });
    }
    setBusy(false);
  };
  const filtered = items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()));
  const begin = (event: React.PointerEvent<HTMLElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = true;
    start.current = event.clientX;
    startP.current = p.current;
    if (sidebar.current) sidebar.current.style.transition = "none";
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    if (dragging.current) paint(startP.current + (event.clientX - start.current) / WIDTH);
  };
  const end = () => {
    if (dragging.current) {
      dragging.current = false;
      settle(p.current > 0.5);
    }
  };
  return (
    <div className="min-h-screen bg-[#0c0912] text-white">
      <div
        ref={backdrop}
        onClick={() => settle(false)}
        className="pointer-events-none fixed inset-0 z-30 bg-black opacity-0"
      />
      <aside
        ref={sidebar}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="fixed inset-y-0 left-0 z-40 flex w-[min(90vw,320px)] touch-pan-y flex-col border-r border-white/10 bg-[#120d1b] p-4 shadow-2xl will-change-transform"
        style={{ transform: `translate3d(-${WIDTH}px,0,0)` }}
      >
        <div className="flex items-center justify-between">
          <strong>DecidlyAI</strong>
          <button
            aria-label="Fechar menu"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => settle(false)}
            className="rounded-lg p-2 text-white/60 hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => navigate({ to: "/workspace" })}
          className="mt-7 flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm font-medium hover:bg-violet-500"
        >
          <Plus size={17} /> Nova decisão
        </button>
        <label
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 text-white/50"
        >
          <Search size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-white/35"
          />
        </label>
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="mt-6 flex-1 space-y-1 overflow-y-auto"
        >
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                void navigate({
                  to: "/workspace/$conversationId",
                  params: { conversationId: item.id },
                });
                settle(false);
              }}
              className="block w-full truncate rounded-xl px-3 py-2.5 text-left text-sm text-white/70 hover:bg-white/[.06]"
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className="border-t border-white/10 pt-4 text-xs text-white/45">Sua conta</div>
      </aside>
      <div
        className="fixed left-0 top-0 z-20 h-full w-5 touch-none"
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />
      <main className="relative flex min-h-screen flex-col">
        <header className="flex items-center gap-3 border-b border-white/[.07] px-5 py-4">
          <button
            aria-label="Abrir menu"
            onClick={() => settle(!open)}
            className="rounded-lg p-2 text-white/65 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <span className="text-sm text-white/65">Nova decisão</span>
        </header>
        <section className="flex flex-1 items-center justify-center px-5 pb-28">
          <div className="w-full max-w-2xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-300">
              <Sparkles size={23} />
            </div>
            <h1 className="text-2xl font-semibold sm:text-3xl">No que você está pensando?</h1>
            <p className="mt-3 text-sm text-white/45">
              Comece uma decisão e organize suas possibilidades com clareza.
            </p>
            <div className="mt-8 rounded-2xl border border-white/10 bg-white/[.04] p-2 text-left">
              <textarea
                autoFocus
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void create();
                  }
                }}
                rows={3}
                placeholder="Estou pensando em…"
                className="w-full resize-none bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/30"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] text-white/30">Ctrl + Enter para enviar</span>
                <button
                  aria-label="Enviar"
                  onClick={() => void create()}
                  disabled={!input.trim() || busy}
                  className="rounded-xl bg-violet-600 p-2.5 text-white disabled:opacity-30"
                >
                  {busy ? (
                    <span className="block h-[18px] w-[18px] animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  ) : (
                    "↑"
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
