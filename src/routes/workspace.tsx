// src/routes/workspace.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Search, Send, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Message = {
  id?: string;
  role: "user" | "assistant";
  content: string;
};

function Workspace() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
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
    loadConversations();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = contentRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages, sending]);

  function paint(progress: number) {
    const d = dragRef.current;
    d.progress = Math.max(0, Math.min(1, progress));

    if (frameRef.current) cancelAnimationFrame(frameRef.current);

    frameRef.current = requestAnimationFrame(() => {
      const sidebar = sidebarRef.current;
      const backdrop = backdropRef.current;
      if (!sidebar || !backdrop) return;

      const x = -d.width + d.width * d.progress;

      sidebar.style.transform = `translate3d(${x}px,0,0)`;
      backdrop.style.opacity = String(d.progress * 0.72);
      backdrop.style.pointerEvents = d.progress > 0.01 ? "auto" : "none";
    });
  }

  function settle(open: boolean) {
    const sidebar = sidebarRef.current;
    const backdrop = backdropRef.current;
    const d = dragRef.current;

    if (!sidebar || !backdrop) return;

    d.progress = open ? 1 : 0;

    sidebar.style.transition =
      "transform .26s cubic-bezier(.22,1,.36,1)";
    backdrop.style.transition = "opacity .26s ease";

    paint(d.progress);

    window.setTimeout(() => {
      if (sidebarRef.current) {
        sidebarRef.current.style.transition = "none";
      }
      if (backdropRef.current) {
        backdropRef.current.style.transition = "none";
      }
    }, 280);

    setSidebarOpen(open);
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

      if (!d.moved) {
        d.moved = true;
      }

      const next = d.startProgress + dx / d.width;

      paint(next);

      if (Math.abs(dx) > 8) {
        e.preventDefault();
      }
    };

    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || e.pointerId !== d.pointerId) return;

      d.active = false;

      if (!d.moved) {
        return;
      }

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

  async function loadConversations() {
    setLoadingHistory(true);

    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      navigate({ to: "/login" });
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at")
      .eq("user_id", auth.user.id)
      .order("updated_at", { ascending: false });

    setConversations(data ?? []);
    setLoadingHistory(false);
  }

  async function createConversation(firstMessage: string) {
    const { data: auth } = await supabase.auth.getUser();

    if (!auth.user) {
      navigate({ to: "/login" });
      return;
    }

    const title =
      firstMessage.length > 48
        ? `${firstMessage.slice(0, 48)}…`
        : firstMessage;

    const { data: conversation, error: conversationError } =
      await supabase
        .from("conversations")
        .insert({
          user_id: auth.user.id,
          title,
        })
        .select("id,title,created_at,updated_at")
        .single();

    if (conversationError || !conversation) {
      console.error(conversationError);
      return;
    }

    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversation.id,
        user_id: auth.user.id,
        role: "user",
        content: firstMessage,
      });

    if (messageError) {
      console.error(messageError);
      return;
    }

    navigate({
      to: "/workspace/$conversationId",
      params: { conversationId: conversation.id },
    });
  }

  function send() {
    const value = input.trim();
    if (!value || sending) return;

    setInput("");
    createConversation(value);
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
      className="workspace-root"
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
          minHeight: 68,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          borderBottom: "1px solid rgba(255,255,255,.08)",
        }}
      >
        <button
          type="button"
          onClick={() => settle(true)}
          aria-label="Abrir menu"
          style={{
            width: 40,
            height: 40,
            display: "grid",
            placeItems: "center",
            border: 0,
            outline: 0,
            background: "transparent",
            color: "rgba(255,255,255,.82)",
            cursor: "pointer",
          }}
        >
          <Menu size={22} />
        </button>

        <div style={{ marginLeft: 10, fontWeight: 700, fontSize: 18 }}>
          DecidlyAI
        </div>

        <div
          style={{
            marginLeft: 12,
            fontSize: 12,
            color: "rgba(255,255,255,.4)",
          }}
        >
          Workspace
        </div>
      </header>

      <main
        ref={contentRef}
        style={{
          height: "calc(100dvh - 68px)",
          overflowY: "auto",
          padding: "36px 18px 250px",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 720,
            margin: "0 auto",
          }}
        >
          {messages.length === 0 ? (
            <div style={{ textAlign: "center", paddingTop: 100 }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 30,
                  fontWeight: 700,
                  letterSpacing: "-.03em",
                }}
              >
                O que você precisa decidir?
              </h1>

              <p
                style={{
                  margin: "14px auto 28px",
                  maxWidth: 560,
                  color: "rgba(255,255,255,.48)",
                  lineHeight: 1.6,
                }}
              >
                Compare opções, organize seus pensamentos e tome decisões
                com mais clareza.
              </p>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {[
                  "Preciso tomar uma decisão",
                  "Compare duas opções para mim",
                  "Quais são os prós e contras?",
                  "Estou em dúvida entre duas escolhas",
                ].map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => {
                      setInput(text);
                      requestAnimationFrame(() => {
                        textareaRef.current?.focus();
                        autoResize();
                      });
                    }}
                    style={{
                      border: "1px solid rgba(255,255,255,.1)",
                      borderRadius: 999,
                      padding: "10px 14px",
                      background: "rgba(255,255,255,.035)",
                      color: "rgba(255,255,255,.72)",
                      cursor: "pointer",
                    }}
                  >
                    {text}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={message.id ?? `${message.role}-${index}`}
                style={{
                  display: "flex",
                  justifyContent:
                    message.role === "user" ? "flex-end" : "flex-start",
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
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {message.content}
                </div>
              </div>
            ))
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
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            maxWidth: 720,
            margin: "0 auto",
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: 10,
              padding: 10,
              borderRadius: 20,
              background: "#141019",
              border: "1px solid rgba(255,255,255,.1)",
              boxShadow: "0 12px 40px rgba(0,0,0,.35)",
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
              disabled={sending}
              style={{
                flex: 1,
                minWidth: 0,
                maxHeight: 180,
                resize: "none",
                overflowY: "auto",
                padding: "9px 7px",
                background: "transparent",
                color: "white",
                border: "0 !important",
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
              aria-label="Enviar"
              style={{
                flexShrink: 0,
                width: 42,
                height: 42,
                border: 0,
                outline: 0,
                borderRadius: 13,
                display: "grid",
                placeItems: "center",
                background: input.trim() ? "#7651e8" : "rgba(255,255,255,.08)",
                color: "white",
                cursor: input.trim() ? "pointer" : "default",
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
          boxSizing: "border-box",
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
              cursor: "pointer",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          onClick={() => settle(false)}
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
            cursor: "pointer",
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
              padding: "8px 8px 10px",
              fontSize: 11,
              color: "rgba(255,255,255,.35)",
              textTransform: "uppercase",
              letterSpacing: ".08em",
            }}
          >
            Histórico
          </div>

          {loadingHistory ? null : filtered.length === 0 ? (
            <div
              style={{
                padding: 12,
                color: "rgba(255,255,255,.35)",
                fontSize: 13,
              }}
            >
              Nenhuma conversa.
            </div>
          ) : (
            filtered.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                onClick={() => {
                  settle(false);
                  navigate({
                    to: "/workspace/$conversationId",
                    params: { conversationId: conversation.id },
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
                  cursor: "pointer",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {conversation.title}
              </button>
            ))
          )}
        </div>
      </aside>
    </div>
  );
}