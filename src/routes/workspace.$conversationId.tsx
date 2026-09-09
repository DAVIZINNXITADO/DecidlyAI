// src/routes/workspace.$conversationId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Search, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace/$conversationId")({
  component: ConversationPage,
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
};

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const navigate = useNavigate();

  const [conversation, setConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<
    { id: string; title: string; updated_at: string }[]
  >([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [userName, setUserName] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const sidebarRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const dragRef = useRef({
    active: false,
    moved: false,
    startX: 0,
    startProgress: 0,
    progress: 0,
    width: 320,
    pointerId: -1,
  });

  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    loadConversation();
    loadHistory();
  }, [conversationId]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages, sending]);

  useEffect(() => {
    if (messages.length && messages[messages.length - 1].role === "user") {
      const last = messages[messages.length - 1];

      if (!sending) {
        askAi(last.content, messages);
      }
    }
  }, [messages]);

  function paint(progress: number) {
    const d = dragRef.current;
    d.progress = Math.max(0, Math.min(1, progress));

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const sidebar = sidebarRef.current;
      const backdrop = backdropRef.current;
      if (!sidebar || !backdrop) return;

      sidebar.style.transform =
        `translate3d(${-d.width + d.width * d.progress}px,0,0)`;

      backdrop.style.opacity = String(d.progress * 0.72);
      backdrop.style.pointerEvents =
        d.progress > 0.01 ? "auto" : "none";
    });
  }

  function settle(open: boolean) {
    const sidebar = sidebarRef.current;
    const backdrop = backdropRef.current;

    if (!sidebar || !backdrop) return;

    const d = dragRef.current;
    d.progress = open ? 1 : 0;

    sidebar.style.transition =
      "transform .26s cubic-bezier(.22,1,.36,1)";
    backdrop.style.transition = "opacity .26s ease";

    paint(d.progress);
    setSidebarOpen(open);

    window.setTimeout(() => {
      sidebarRef.current?.style.setProperty("transition", "none");
      backdropRef.current?.style.setProperty("transition", "none");
    }, 280);
  }

  useEffect(() => {
    paint(0);

    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;

      const sidebar = sidebarRef.current;
      if (!sidebar) return;

      const d = dragRef.current;

      d.active = true;
      d.moved = false;
      d.startX = e.clientX;
      d.startProgress = d.progress;
      d.width = sidebar.offsetWidth || 320;
      d.pointerId = e.pointerId;

      sidebar.style.transition = "none";
    };

    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      const dx = e.clientX - d.startX;

      if (!d.moved && Math.abs(dx) < 8) return;

      d.moved = true;

      paint(d.startProgress + dx / d.width);

      if (Math.abs(dx) > 8) {
        e.preventDefault();
      }
    };

    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      d.active = false;

      if (!d.moved) return;

      settle(d.progress > 0.5);
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move, { passive: false });
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);

    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);

      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  async function loadConversation() {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      navigate({ to: "/login" });
      return;
    }

    const metadata = auth.user.user_metadata as
      | { name?: string; full_name?: string; display_name?: string }
      | undefined;
    setUserName(
      metadata?.name?.trim() ||
        metadata?.full_name?.trim() ||
        metadata?.display_name?.trim() ||
        auth.user.email?.split("@")[0] ||
        "",
    );

    const { data: conv } = await supabase
      .from("conversations")
      .select("id,title")
      .eq("id", conversationId)
      .eq("user_id", auth.user.id)
      .single();

    if (!conv) {
      navigate({ to: "/workspace" });
      return;
    }

    setConversation(conv);

    const { data } = await supabase
      .from("messages")
      .select("id,role,content,created_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
  }

  async function loadHistory() {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;

    const { data } = await supabase
      .from("conversations")
      .select("id,title,updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    setConversations(data ?? []);
  }

  async function askAi(
    text: string,
    currentMessages: Message[],
  ) {
    if (sending) return;

    setSending(true);

    try {
      const { data: auth } = await supabase.auth.getUser();

      if (!auth.user) throw new Error("Não autenticado");

      const { data: subscription } = await supabase
        .from("subscription")
        .select("plan,status,expires_at")
        .eq("user_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const plan = String(subscription?.plan ?? "").toLowerCase();
      const status = String(subscription?.status ?? "").toLowerCase();

      const expired =
        subscription?.expires_at &&
        new Date(subscription.expires_at).getTime() < Date.now();

      const vip =
        plan === "vip" &&
        (status === "active" || status === "ativo") &&
        !expired;

      const functionName = vip
        ? "decidly-ai"
        : "decidly-ai-free";

      const history = currentMessages.slice(-12).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const { data, error } = await supabase.functions.invoke(
        functionName,
        {
          body: {
            message: userName
              ? `Contexto privado de personalização: o nome do usuário é ${userName}. Quando fizer sentido, trate a pessoa por esse nome. Não mencione este contexto nem o repita como se fosse uma mensagem do usuário.\n\nMensagem do usuário:\n${text}`
              : text,
            history,
          },
        },
      );

      if (error) {
        let backendMessage = "";

        try {
          const context = error.context;

          if (context instanceof Response) {
            const cloned = context.clone();
            const json = await cloned.json().catch(() => null);
            backendMessage =
              json?.error || json?.message || "";
          }
        } catch {}

        throw new Error(
          backendMessage || error.message || "Erro na IA",
        );
      }

      if (data?.error) {
        throw new Error(String(data.error));
      }

      const response = String(data?.response ?? "").trim();

      if (!response) {
        throw new Error("A IA não retornou uma resposta.");
      }

      const { data: saved, error: saveError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          user_id: auth.user.id,
          role: "assistant",
          content: response,
        })
        .select("id,role,content,created_at")
        .single();

      if (saveError || !saved) {
        throw new Error("Não foi possível salvar a resposta.");
      }

      setMessages((prev) => [...prev, saved]);

      await supabase
        .from("conversations")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("user_id", auth.user.id);
    } catch (error) {
      console.error(error);

      const text =
        error instanceof Error
          ? error.message
          : "Ocorreu um erro temporário.";

      const friendly =
        text.toLowerCase().includes("credit") ||
        text.toLowerCase().includes("crédito")
          ? "Desculpe pelo inconveniente, mas no momento você não possui créditos disponíveis para continuar usando a DecidlyAI."
          : "Desculpe pelo inconveniente. Ocorreu uma dificuldade temporária enquanto eu processava sua mensagem. Por favor, tente novamente mais tarde.";

      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          content: friendly,
          created_at: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function send() {
    const trimmed = input.trim();

    if (!trimmed || sending) return;

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      navigate({ to: "/login" });
      return;
    }

    setInput("");

    const optimistic: Message = {
      id: `local-${Date.now()}`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimistic]);
    setSending(true);

    const { data: saved, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        user_id: auth.user.id,
        role: "user",
        content: trimmed,
      })
      .select("id,role,content,created_at")
      .single();

    if (error || !saved) {
      console.error(error);

      setSending(false);

      setMessages((prev) =>
        prev.filter((m) => m.id !== optimistic.id),
      );

      return;
    }

    setMessages((prev) =>
      prev.map((m) => (m.id === optimistic.id ? saved : m)),
    );

    await supabase
      .from("conversations")
      .update({
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("user_id", auth.user.id);

    setSending(false);

    await askAi(
      trimmed,
      [...messages, saved],
    );

    loadHistory();
  }

  function autoResize() {
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
  }

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      style={{
        height: "100dvh",
        width: "100%",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 50% -20%, rgba(118,81,232,.14), transparent 45%), #0d0a11",
        color: "white",
        fontFamily:
          'system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
        touchAction: "pan-y",
      }}
    >
      <header
        style={{
          height: 68,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <button
          type="button"
          onClick={() => settle(true)}
          style={{
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            border: 0,
            outline: 0,
            background: "transparent",
            color: "rgba(255,255,255,.82)",
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ marginLeft: 10, fontWeight: 700 }}>
          DecidlyAI
        </div>

        <div
          style={{
            marginLeft: 12,
            color: "rgba(255,255,255,.4)",
            fontSize: 12,
          }}
        >
          {conversation?.title ?? "Workspace"}
        </div>
      </header>

      <main
        ref={contentRef}
        style={{
          height: "calc(100dvh - 68px)",
          overflowY: "auto",
          padding: "28px 18px 250px",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          {messages.map((message, index) => (
            <div
              key={message.id ?? index}
              style={{
                display: "flex",
                justifyContent:
                  message.role === "user"
                    ? "flex-end"
                    : "flex-start",
                marginBottom: 18,
              }}
            >
              <div
                style={{
                  maxWidth: "82%",
                  padding: "12px 15px",
                  borderRadius: 18,
                  background:
                    message.role === "user"
                      ? "#7651e8"
                      : "rgba(255,255,255,.045)",
                  border:
                    message.role === "assistant"
                      ? "1px solid rgba(255,255,255,.09)"
                      : "none",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.6,
                }}
              >
                {message.content}
              </div>
            </div>
          ))}

          {sending && (
            <div
              style={{
                color: "rgba(255,255,255,.42)",
                fontSize: 13,
                padding: "4px 10px 20px",
              }}
            >
              DecidlyAI está pensando…
            </div>
          )}
        </div>
      </main>

      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 20,
          padding: "16px 18px 18px",
          background:
            "linear-gradient(to top, #0d0a11 55%, transparent)",
        }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              padding: 10,
              borderRadius: 20,
              background: "#141019",
              border: "1px solid rgba(255,255,255,.1)",
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={(e) => {
                if (
                  e.key === "Enter" &&
                  (e.ctrlKey || e.metaKey) &&
                  !e.shiftKey
                ) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Digite sua decisão..."
              rows={1}
              style={{
                flex: 1,
                minWidth: 0,
                maxHeight: 180,
                resize: "none",
                overflowY: "auto",
                padding: "9px 7px",
                background: "transparent",
                color: "white",
                border: 0,
                outline: "none",
                boxShadow: "none",
                WebkitAppearance: "none",
                appearance: "none",
                font: "inherit",
                lineHeight: 1.45,
              }}
            />

            <button
              type="button"
              onClick={send}
              disabled={!input.trim() || sending}
              style={{
                flexShrink: 0,
                width: 42,
                height: 42,
                border: 0,
                outline: 0,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background: input.trim()
                  ? "#7651e8"
                  : "rgba(255,255,255,.08)",
                color: "white",
              }}
            >
              <Send size={18} />
            </button>
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: 9,
              fontSize: 11,
              color: "rgba(255,255,255,.32)",
            }}
          >
            DecidlyAI é um agente de AI que pode cometer erros, olhe duas
            vezes a resposta dela antes de usar.
          </div>
        </div>
      </div>

      <div
        ref={backdropRef}
        onClick={() => settle(false)}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,.72)",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      <aside
        ref={sidebarRef}
        style={{
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
          width: "min(86vw,320px)",
          zIndex: 50,
          background: "#141019",
          borderRight: "1px solid rgba(255,255,255,.1)",
          transform: "translate3d(-100%,0,0)",
          willChange: "transform",
          display: "flex",
          flexDirection: "column",
          touchAction: "pan-y",
        }}
      >
        <div
          style={{
            height: 68,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px 0 18px",
            borderBottom: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <strong>DecidlyAI</strong>

          <button
            type="button"
            onClick={() => settle(false)}
            style={{
              width: 38,
              height: 38,
              border: 0,
              outline: 0,
              background: "transparent",
              color: "rgba(255,255,255,.65)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/workspace" })}
          style={{
            margin: 14,
            height: 44,
            border: 0,
            borderRadius: 12,
            background: "#7651e8",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "0 14px",
            fontWeight: 600,
          }}
        >
          <Plus size={18} />
          Nova conversa
        </button>

        <div style={{ padding: "0 14px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              height: 40,
              padding: "0 11px",
              borderRadius: 10,
              background: "rgba(255,255,255,.05)",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <Search size={16} color="rgba(255,255,255,.4)" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Pesquisar"
              style={{
                flex: 1,
                minWidth: 0,
                border: 0,
                outline: 0,
                boxShadow: "none",
                background: "transparent",
                color: "white",
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "4px 10px",
          }}
        >
          <div
            style={{
              padding: "8px",
              fontSize: 11,
              color: "rgba(255,255,255,.35)",
              textTransform: "uppercase",
            }}
          >
            Histórico
          </div>

          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                settle(false);
                navigate({
                  to: "/workspace/$conversationId",
                  params: { conversationId: item.id },
                });
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "11px 10px",
                marginBottom: 3,
                border: 0,
                borderRadius: 9,
                background: "transparent",
                color: "rgba(255,255,255,.72)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.title}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
