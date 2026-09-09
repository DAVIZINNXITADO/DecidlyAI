import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Menu, Plus, Search, Sparkles, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

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
  const [error, setError] = useState<string | null>(null);

  const sidebar = useRef<HTMLElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);

  const progress = useRef(0);
  const startX = useRef(0);
  const startProgress = useRef(0);
  const dragging = useRef(false);
  const raf = useRef<number | null>(null);

  /*
   * Atualiza visualmente a posição do menu.
   *
   * O valor nunca passa de 0..1.
   * Isso evita que o sidebar seja arrastado para posições inesperadas.
   */
  const paint = (value: number) => {
    progress.current = Math.max(0, Math.min(1, value));

    if (raf.current !== null) {
      cancelAnimationFrame(raf.current);
    }

    raf.current = requestAnimationFrame(() => {
      const current = progress.current;

      if (sidebar.current) {
        sidebar.current.style.transform =
          `translate3d(${-WIDTH + WIDTH * current}px, 0, 0)`;
      }

      if (backdrop.current) {
        backdrop.current.style.opacity = String(current * 0.72);
        backdrop.current.style.pointerEvents =
          current > 0.01 ? "auto" : "none";
      }
    });
  };

  const settle = (shouldOpen: boolean) => {
    setOpen(shouldOpen);

    if (sidebar.current) {
      sidebar.current.style.transition =
        "transform 260ms cubic-bezier(.22,1,.36,1)";
    }

    if (backdrop.current) {
      backdrop.current.style.transition = "opacity 260ms ease";
    }

    paint(shouldOpen ? 1 : 0);

    window.setTimeout(() => {
      if (sidebar.current) {
        sidebar.current.style.transition = "none";
      }

      if (backdrop.current) {
        backdrop.current.style.transition = "none";
      }
    }, 280);
  };

  /*
   * Carrega somente as conversas pertencentes ao usuário autenticado.
   *
   * A segurança definitiva deve estar no RLS do Supabase.
   */
  useEffect(() => {
    let alive = true;

    const loadWorkspace = async () => {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!alive) return;

      if (authError || !user) {
        await navigate({ to: "/login" });
        return;
      }

      setUserId(user.id);

      const { data, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, user_id, title, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (!alive) return;

      if (conversationsError) {
        setError("Não foi possível carregar suas decisões.");
        return;
      }

      setItems((data ?? []) as Conversation[]);
    };

    void loadWorkspace();

    return () => {
      alive = false;
    };
  }, [navigate]);

  /*
   * Cria uma nova conversa.
   *
   * Não enviamos dados sensíveis para a URL.
   * O texto inicial fica temporariamente em sessionStorage apenas
   * para a próxima rota conseguir iniciar a conversa.
   */
  const create = async () => {
    const text = input.trim();

    if (!text || busy) return;

    setBusy(true);
    setError(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      const currentUserId = user?.id ?? userId;

      if (authError || !currentUserId) {
        setError(
          "Sua sessão expirou. Faça login novamente para continuar.",
        );

        await navigate({ to: "/login" });
        return;
      }

      const id = crypto.randomUUID();

      const title =
        text.length > 70
          ? `${text.slice(0, 70)}…`
          : text;

      const { error: insertError } = await supabase
        .from("conversations")
        .insert({
          id,
          user_id: currentUserId,
          title,
        });

      if (insertError) {
        setError(
          "Não foi possível criar a conversa. Tente novamente.",
        );
        return;
      }

      /*
       * O texto inicial não vai para a URL.
       * sessionStorage é isolado por origem e não é enviado
       * automaticamente para o servidor.
       */
      sessionStorage.setItem(
        `decidly-pending-${id}`,
        text,
      );

      setInput("");

      await navigate({
        to: "/workspace/$conversationId",
        params: {
          conversationId: id,
        },
      });
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível iniciar a conversa.",
      );
    } finally {
      setBusy(false);
    }
  };

  const filtered = items.filter((item) =>
    item.title
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  /*
   * Gestos do sidebar.
   */

  const begin = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.currentTarget.setPointerCapture(event.pointerId);

    dragging.current = true;
    startX.current = event.clientX;
    startProgress.current = progress.current;

    if (sidebar.current) {
      sidebar.current.style.transition = "none";
    }

    if (backdrop.current) {
      backdrop.current.style.transition = "none";
    }
  };

  const move = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (!dragging.current) return;

    const delta =
      (event.clientX - startX.current) / WIDTH;

    paint(startProgress.current + delta);
  };

  const end = () => {
    if (!dragging.current) return;

    dragging.current = false;

    settle(progress.current > 0.5);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#0d0a11] text-white">
      {/* Backdrop */}
      <div
        ref={backdrop}
        onClick={() => settle(false)}
        className="pointer-events-none fixed inset-0 z-20 bg-black opacity-0"
      />

      {/* Sidebar */}
      <aside
        ref={sidebar}
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        className="
          fixed inset-y-0 left-0 z-30
          flex w-[min(86vw,320px)] flex-col
          border-r border-white/10
          bg-[#17111f]
          p-[18px_15px]
          shadow-[20px_0_55px_rgba(0,0,0,.45)]
          will-change-transform
          touch-pan-y
        "
        style={{
          transform: `translate3d(-${WIDTH}px,0,0)`,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between font-semibold">
          <span>DecidlyAI</span>

          <button
            type="button"
            aria-label="Fechar menu"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
            onClick={() => settle(false)}
            className="
              grid h-9 w-9 place-items-center
              rounded-[10px]
              bg-white/5
              text-white
              hover:bg-white/10
            "
          >
            <X size={20} />
          </button>
        </div>

        {/* New conversation */}
        <button
          type="button"
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          onClick={() => {
            settle(false);
            requestAnimationFrame(() => {
              document
                .querySelector<HTMLTextAreaElement>(
                  "#workspace-input",
                )
                ?.focus();
            });
          }}
          className="
            mt-[25px]
            rounded-xl
            bg-[#7651e8]
            px-3
            py-3
            text-center
            text-sm
            font-semibold
            transition
            hover:bg-violet-500
          "
        >
          <span className="flex items-center justify-center gap-2">
            <Plus size={17} />
            Nova decisão
          </span>
        </button>

        {/* Search */}
        <label
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          className="
            mt-3.5
            flex items-center gap-2
            rounded-xl
            border border-white/10
            bg-white/[.04]
            px-3
            text-white/40
          "
        >
          <Search size={16} />

          <input
            value={query}
            onChange={(event) =>
              setQuery(event.target.value)
            }
            placeholder="Pesquisar decisões"
            aria-label="Pesquisar decisões"
            className="
              min-w-0
              flex-1
              bg-transparent
              py-2.5
              text-sm
              text-white
              outline-none
              placeholder:text-white/35
            "
          />
        </label>

        {/* History */}
        <div
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          className="
            mt-[18px]
            flex-1
            space-y-1
            overflow-y-auto
            text-[13px]
          "
        >
          {filtered.length === 0 ? (
            <p className="px-2.5 py-3 text-white/35">
              Nenhuma decisão encontrada.
            </p>
          ) : (
            filtered.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => {
                  void navigate({
                    to: "/workspace/$conversationId",
                    params: {
                      conversationId: item.id,
                    },
                  });

                  settle(false);
                }}
                className="
                  block
                  w-full
                  truncate
                  rounded-[10px]
                  px-2.5
                  py-2.5
                  text-left
                  text-white/65
                  transition
                  hover:bg-white/[.06]
                "
              >
                {item.title}
              </button>
            ))
          )}
        </div>

        {/* Account */}
        <div
          className="
            border-t
            border-white/10
            pt-[15px]
            text-xs
            text-white/40
          "
        >
          Minha conta
        </div>
      </aside>

      {/* Edge swipe area */}
      <div
        className="
          fixed
          left-0
          top-[68px]
          bottom-0
          z-10
          w-5
          touch-none
        "
        onPointerDown={begin}
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
      />

      {/* Main application */}
      <main className="flex min-h-screen flex-col">
        {/* Topbar */}
        <header
          className="
            flex
            h-[68px]
            shrink-0
            items-center
            gap-3.5
            border-b
            border-white/[.07]
            px-[18px]
          "
        >
          <button
            type="button"
            aria-label="Abrir menu"
            onClick={() => settle(!open)}
            className="
              grid
              h-10
              w-10
              place-items-center
              rounded-xl
              border
              border-white/10
              bg-white/[.04]
              text-white
              transition
              hover:bg-white/[.08]
            "
          >
            <Menu size={21} />
          </button>

          <strong className="font-semibold tracking-tight">
            DecidlyAI
          </strong>

          <span
            className="
              ml-auto
              text-xs
              text-white/35
            "
          >
            Workspace
          </span>
        </header>

        {/* Content */}
        <section
          className="
            flex
            min-h-0
            flex-1
            justify-center
            overflow-y-auto
            px-[18px]
            pb-[250px]
            pt-7
          "
        >
          <div className="w-full max-w-[720px]">
            <div
              className="
                mx-auto
                mt-5
                max-w-[720px]
                text-center
                text-white/45
              "
            >
              <div
                className="
                  mx-auto
                  grid
                  h-[52px]
                  w-[52px]
                  place-items-center
                  overflow-hidden
                  rounded-[17px]
                  bg-violet-600/20
                "
              >
                <img
                  src="/appicon.png"
                  alt="DecidlyAI"
                  className="h-full w-full object-cover"
                  draggable={false}
                />
              </div>

              <h1
                className="
                  mt-4
                  text-2xl
                  font-semibold
                  tracking-tight
                  text-white
                  sm:text-[24px]
                "
              >
                Qual decisão você precisa analisar?
              </h1>

              <p className="mt-2 text-sm">
                Descreva sua situação e organize suas
                possibilidades.
              </p>

              {error && (
                <div
                  role="alert"
                  className="
                    mx-auto
                    mt-5
                    max-w-[720px]
                    rounded-xl
                    border
                    border-red-400/20
                    bg-red-400/10
                    px-4
                    py-3
                    text-left
                    text-sm
                    text-red-200
                  "
                >
                  {error}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Composer */}
        <div
          className="
            fixed
            inset-x-0
            bottom-0
            z-10
            px-3
            pt-[9px]
            sm:px-3.5
          "
          style={{
            paddingBottom:
              "max(12px, env(safe-area-inset-bottom))",
            background:
              "linear-gradient(to top, #0d0a11 72%, transparent)",
          }}
        >
          <div className="mx-auto w-full max-w-[720px]">
            <div
              className="
                rounded-[20px]
                border
                border-white/[.14]
                bg-[#15101d]/95
                p-[9px]
                shadow-[0_-8px_32px_rgba(0,0,0,.25)]
                backdrop-blur-xl
              "
            >
              <textarea
                id="workspace-input"
                autoFocus
                rows={2}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onInput={(event) => {
                  const element = event.currentTarget;

                  element.style.height = "auto";

                  element.style.height =
                    `${Math.min(
                      element.scrollHeight,
                      150,
                    )}px`;
                }}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    (event.ctrlKey || event.metaKey)
                  ) {
                    event.preventDefault();
                    void create();
                  }
                }}
                placeholder="Mande o que você quer decidir para a DecidlyAI te ajudar"
                className="
                  block
                  min-h-[61px]
                  max-h-[150px]
                  w-full
                  resize-y
                  border-0
                  bg-transparent
                  px-2
                  py-1.5
                  text-[15px]
                  leading-[1.45]
                  text-white
                  outline-none
                  placeholder:text-white/55
                "
              />

              <div
                className="
                  flex
                  items-center
                  justify-between
                  px-1
                  pb-0
                "
              >
                <span className="text-[11px] text-white/30">
                  Ctrl + Enter para enviar
                </span>

                <button
                  type="button"
                  aria-label="Enviar"
                  onClick={() => void create()}
                  disabled={!input.trim() || busy}
                  className="
                    grid
                    h-9
                    w-9
                    place-items-center
                    rounded-xl
                    bg-[#7651e8]
                    text-[21px]
                    leading-none
                    transition
                    hover:bg-violet-500
                    disabled:cursor-default
                    disabled:opacity-35
                  "
                >
                  {busy ? (
                    <span
                      className="
                        block
                        h-[18px]
                        w-[18px]
                        animate-spin
                        rounded-full
                        border-2
                        border-white/30
                        border-t-white
                      "
                    />
                  ) : (
                    "↑"
                  )}
                </button>
              </div>
            </div>

            <p
              className="
                mx-1
                mt-2
                text-center
                text-[11px]
                leading-[1.4]
                text-white/[.38]
              "
            >
              DecidlyAI é um agente de AI que pode cometer
              erros, olhe duas vezes a resposta dela antes
              de usar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}