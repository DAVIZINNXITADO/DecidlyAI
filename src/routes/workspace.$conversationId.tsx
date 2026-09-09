import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Menu, Plus, Search, Sparkles, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace/$conversationId")({ component: Conversation });
type ConversationRow = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};
type Message = {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};
type Subscription = { plan: string | null; status: string | null; expires_at: string | null };
const WIDTH = 320;
const errorText = (status?: number, detail?: string) => {
  const m = String(detail ?? "").toLowerCase();
  if (status === 402 || m.includes("credit") || m.includes("crédito"))
    return "Sua conta não possui créditos disponíveis para realizar essa análise.";
  if (
    status === 429 ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("resource_exhausted")
  )
    return "O limite de uso da IA foi atingido. Aguarde um pouco e tente novamente.";
  if (status === 401 || status === 403)
    return "Sua sessão não está autorizada. Faça login novamente.";
  if ([500, 502, 503, 504].includes(status ?? 0))
    return "O serviço de IA está temporariamente indisponível. Tente novamente em alguns instantes.";
  if (m.includes("timeout")) return "A análise demorou mais que o esperado. Tente novamente.";
  if (m.includes("network") || m.includes("fetch") || m.includes("connection"))
    return "Não foi possível conectar ao serviço de IA. Verifique sua conexão e tente novamente.";
  return "Não foi possível concluir a análise agora. Tente novamente.";
};
async function getAiFunction(setLabel: (label: string) => void) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw { status: 401, message: "Usuário não autenticado" };
  const { data: sub } = await supabase
    .from("subscription")
    .select("plan,status,expires_at")
    .eq("user_id", data.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<Subscription>();
  const plan = String(sub?.plan ?? "").toLowerCase();
  const status = String(sub?.status ?? "").toLowerCase();
  const active = status === "active" || status === "ativo";
  const valid = !sub?.expires_at || new Date(sub.expires_at).getTime() > Date.now();
  if (plan === "vip" && active && valid) {
    setLabel("VIP");
    return "decidly-ai";
  }
  setLabel("Free");
  return "decidly-ai-free";
}

function Conversation() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationRow | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [items, setItems] = useState<ConversationRow[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [label, setLabel] = useState("Free");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const initial = useRef(false);
  const sidebar = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const p = useRef(0);
  const sx = useRef(0);
  const sp = useRef(0);
  const drag = useRef(false);
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
  const begin = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = true;
    sx.current = e.clientX;
    sp.current = p.current;
    if (sidebar.current) sidebar.current.style.transition = "none";
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    if (drag.current) paint(sp.current + (e.clientX - sx.current) / WIDTH);
  };
  const end = () => {
    if (drag.current) {
      drag.current = false;
      settle(p.current > 0.5);
    }
  };
  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        await navigate({ to: "/login" });
        return;
      }
      const [{ data: conv }, { data: msgs }, { data: list }] = await Promise.all([
        supabase
          .from("conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("user_id", data.user.id)
          .maybeSingle(),
        supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversationId)
          .eq("user_id", data.user.id)
          .order("created_at", { ascending: true }),
        supabase
          .from("conversations")
          .select("*")
          .eq("user_id", data.user.id)
          .order("updated_at", { ascending: false }),
      ]);
      if (!alive) return;
      if (!conv) {
        await navigate({ to: "/workspace" });
        return;
      }
      setUser(data.user.id);
      setConversation(conv as ConversationRow);
      setMessages((msgs ?? []) as Message[]);
      setItems((list ?? []) as ConversationRow[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [conversationId, navigate]);
  const send = async (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || !user || sending) return;
    setInput("");
    setError(null);
    const instant: Message = {
      id: `instant-${Date.now()}`,
      conversation_id: conversationId,
      user_id: user,
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    const history = messages.slice(-12).map((m) => ({ role: m.role, content: m.content }));
    setMessages((current) => [...current, instant]);
    setSending(true);
    try {
      const functionName = await getAiFunction(setLabel);
      const { data, error: invokeError } = await supabase.functions.invoke(functionName, {
        body: { message: text, history },
      });
      if (invokeError) throw invokeError;
      if (!data?.response) throw new Error("Resposta inválida");
      const answer: Message = {
        id: `instant-ai-${Date.now()}`,
        conversation_id: conversationId,
        user_id: user,
        role: "assistant",
        content: String(data.response),
        created_at: new Date().toISOString(),
      };
      setMessages((current) => [...current, answer]);
      await supabase.from("messages").insert([
        { conversation_id: conversationId, user_id: user, role: "user", content: text },
        {
          conversation_id: conversationId,
          user_id: user,
          role: "assistant",
          content: answer.content,
        },
      ]);
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .eq("user_id", user);
    } catch (cause) {
      const e = cause as { status?: number; message?: string };
      setError(errorText(e.status, e.message));
    } finally {
      setSending(false);
    }
  };
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);
  useEffect(() => {
    const pending = sessionStorage.getItem(`decidly-pending-${conversationId}`);
    if (!loading && user && pending && messages.length === 0 && !initial.current) {
      initial.current = true;
      sessionStorage.removeItem(`decidly-pending-${conversationId}`);
      void send(pending);
    }
    // O ref garante que a mensagem inicial só seja enviada uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, conversationId, messages.length]);
  const filtered = useMemo(
    () => items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())),
    [items, query],
  );
  if (loading)
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0c0912] text-white/50">
        <Sparkles className="mr-2 animate-pulse" size={18} /> Carregando conversa…
      </div>
    );
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
          className="mt-7 flex items-center gap-2 rounded-xl bg-violet-600 px-3 py-2.5 text-sm"
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
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm text-white outline-none"
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
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between border-b border-white/[.07] px-5 py-4">
          <button
            onClick={() => settle(!open)}
            className="rounded-lg p-2 text-white/65 hover:bg-white/10"
          >
            <Menu size={20} />
          </button>
          <span className="max-w-[60%] truncate text-sm text-white/60">{conversation?.title}</span>
          <span className="text-[10px] uppercase tracking-wider text-violet-300/60">{label}</span>
        </header>
        <div className="flex-1 overflow-y-auto px-4 pb-56 pt-8 sm:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            {messages.map((m) => (
              <div
                key={m.id}
                className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-2xl rounded-br-md bg-violet-600 px-4 py-3 text-sm leading-6"
                      : "max-w-[85%] rounded-2xl rounded-bl-md border border-white/10 bg-white/[.04] px-4 py-3 text-sm leading-6 text-white/80"
                  }
                >
                  {m.role === "assistant" ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  ) : (
                    m.content
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-white/40">
                <Sparkles size={14} className="animate-pulse text-violet-300" /> Analisando…
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200">
                {error}
              </div>
            )}
            <div ref={endRef} />
          </div>
        </div>
        <div
          className="fixed inset-x-0 bottom-0 z-20 px-3 pt-2 sm:px-8"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/10 bg-[#100b1b]/95 p-2 shadow-2xl backdrop-blur-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                placeholder="Mande o que você quer decidir para a DecidlyAI te ajudar"
                className="max-h-40 min-h-14 w-full resize-none overflow-y-auto bg-transparent px-3 py-2 text-sm leading-6 text-white outline-none placeholder:text-white/35"
              />
              <div className="flex items-center justify-between px-2 pb-1">
                <span className="text-[11px] text-white/30">Ctrl + Enter para enviar</span>
                <button
                  onClick={() => void send()}
                  disabled={!input.trim() || sending}
                  className="rounded-xl bg-violet-600 p-2.5 disabled:opacity-30"
                >
                  ↑
                </button>
              </div>
            </div>
            <p className="px-2 pt-2 text-center text-[11px] leading-4 text-white/35">
              DecidlyAI é um agente de AI que pode cometer erros, olhe duas vezes a resposta dela
              antes de usar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
