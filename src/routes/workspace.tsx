import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Menu,
  Plus,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

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

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type AiMessage = {
  role: "user" | "assistant";
  content: string;
};

type Subscription = {
  plan: string | null;
  status: string | null;
  expires_at: string | null;
};

const WIDTH = 320;

/*
 * ============================================================
 * ERROS AMIGÁVEIS DA AI
 * ============================================================
 */

function getFriendlyAiError(
  status?: number,
  backendMessage?: string,
): string {
  const message = (
    backendMessage || ""
  ).toLowerCase();

  if (
    status === 402 ||
    message.includes("crédito") ||
    message.includes("credit")
  ) {
    return "Desculpe pelo inconveniente, mas no momento você não possui créditos disponíveis para continuar usando a DecidlyAI. Pedimos desculpas pelo transtorno. Quando houver créditos disponíveis novamente, tente enviar sua mensagem outra vez.";
  }

  if (
    status === 429 ||
    message.includes("quota") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("limite de requisições")
  ) {
    return "Opa, nosso serviço atingiu temporariamente o limite de requisições para esta IA. Pedimos desculpas pelo inconveniente e agradecemos pela sua paciência. Por favor, tente novamente mais tarde.";
  }

  if (
    status === 401 ||
    status === 403 ||
    message.includes("authentication") ||
    message.includes("unauthorized")
  ) {
    return "Desculpe pelo inconveniente. No momento não consegui confirmar sua sessão corretamente. Por favor, tente entrar novamente e depois envie sua mensagem mais uma vez.";
  }

  if (
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  ) {
    return "Desculpe pelo inconveniente. Estou enfrentando uma dificuldade temporária no nosso serviço e não consegui processar sua mensagem agora. Por favor, tente novamente mais tarde.";
  }

  if (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("tempo limite")
  ) {
    return "Desculpe pelo inconveniente. Demorei mais do que o esperado para processar sua mensagem e não consegui concluir a resposta desta vez. Por favor, tente novamente mais tarde.";
  }

  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("connection") ||
    message.includes("conectar")
  ) {
    return "Desculpe pelo inconveniente. No momento estou com uma dificuldade temporária para me conectar ao nosso serviço. Por favor, tente novamente mais tarde.";
  }

  return "Desculpe pelo inconveniente. Ocorreu uma dificuldade temporária enquanto eu processava sua mensagem. Nossa equipe ou sistemas podem estar passando por uma instabilidade momentânea. Por favor, tente novamente mais tarde.";
}

/*
 * ============================================================
 * WORKSPACE
 * ============================================================
 */

function Workspace() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState<string | null>(null);

  const [input, setInput] = useState("");

  const [items, setItems] = useState<
    Conversation[]
  >([]);

  const [messages, setMessages] = useState<
    Message[]
  >([]);

  const [query, setQuery] = useState("");

  const [busy, setBusy] = useState(false);

  const [open, setOpen] = useState(false);

  const [error, setError] = useState<
    string | null
  >(null);

  const [activeConversation, setActiveConversation] =
    useState<string | null>(null);

  const [modelLabel, setModelLabel] =
    useState<"Free" | "VIP" | null>(null);

  const sidebarRef =
    useRef<HTMLElement>(null);

  const backdropRef =
    useRef<HTMLDivElement>(null);

  const contentRef =
    useRef<HTMLElement>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  const composerRef =
    useRef<HTMLDivElement>(null);

  const progress = useRef(0);
  const startX = useRef(0);
  const startProgress = useRef(0);
  const dragging = useRef(false);

  const raf = useRef<number | null>(null);

  /*
   * ==========================================================
   * SIDEBAR
   * ==========================================================
   */

  const paint = useCallback(
    (value: number) => {
      progress.current = Math.max(
        0,
        Math.min(1, value),
      );

      if (raf.current !== null) {
        cancelAnimationFrame(raf.current);
      }

      raf.current =
        requestAnimationFrame(() => {
          const current =
            progress.current;

          if (sidebarRef.current) {
            sidebarRef.current.style.transform =
              `translate3d(${-WIDTH + WIDTH * current}px,0,0)`;
          }

          if (backdropRef.current) {
            backdropRef.current.style.opacity =
              String(current * 0.72);

            backdropRef.current.style.pointerEvents =
              current > 0.01
                ? "auto"
                : "none";
          }
        });
    },
    [],
  );

  const settle = useCallback(
    (shouldOpen: boolean) => {
      setOpen(shouldOpen);

      if (sidebarRef.current) {
        sidebarRef.current.style.transition =
          "transform 260ms cubic-bezier(.22,1,.36,1)";
      }

      if (backdropRef.current) {
        backdropRef.current.style.transition =
          "opacity 260ms ease";
      }

      paint(
        shouldOpen ? 1 : 0,
      );

      window.setTimeout(() => {
        if (sidebarRef.current) {
          sidebarRef.current.style.transition =
            "none";
        }

        if (backdropRef.current) {
          backdropRef.current.style.transition =
            "none";
        }
      }, 280);
    },
    [paint],
  );

  const beginDrag = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    event.currentTarget.setPointerCapture(
      event.pointerId,
    );

    dragging.current = true;
    startX.current = event.clientX;
    startProgress.current =
      progress.current;

    if (sidebarRef.current) {
      sidebarRef.current.style.transition =
        "none";
    }
  };

  const moveDrag = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (!dragging.current) return;

    const delta =
      (event.clientX -
        startX.current) /
      WIDTH;

    paint(
      startProgress.current +
        delta,
    );
  };

  const endDrag = () => {
    if (!dragging.current) return;

    dragging.current = false;

    settle(
      progress.current > 0.5,
    );
  };

  /*
   * ==========================================================
   * AUTENTICAÇÃO + HISTÓRICO
   * ==========================================================
   */

  useEffect(() => {
    let alive = true;

    const loadWorkspace =
      async () => {
        const {
          data: { user },
          error: authError,
        } =
          await supabase.auth.getUser();

        if (!alive) return;

        if (authError || !user) {
          await navigate({
            to: "/login",
          });

          return;
        }

        setUserId(user.id);

        const {
          data,
          error:
            conversationsError,
        } = await supabase
          .from("conversations")
          .select(
            "id,user_id,title,created_at,updated_at",
          )
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "updated_at",
            {
              ascending: false,
            },
          );

        if (!alive) return;

        if (conversationsError) {
          setError(
            "Não foi possível carregar suas decisões.",
          );

          return;
        }

        setItems(
          (data ??
            []) as Conversation[],
        );
      };

    void loadWorkspace();

    return () => {
      alive = false;
    };
  }, [navigate]);

  /*
   * ==========================================================
   * CARREGAR CONVERSA
   * ==========================================================
   */

  const loadConversation =
    async (
      conversation: Conversation,
    ) => {
      if (!userId) return;

      setError(null);

      setActiveConversation(
        conversation.id,
      );

      settle(false);

      /*
       * Importante:
       * user_id é filtrado junto com conversation_id.
       *
       * Mesmo se alguém tentar manipular o ID,
       * o RLS do Supabase deve bloquear acesso
       * a mensagens de outro usuário.
       */
      const {
        data,
        error: messagesError,
      } = await supabase
        .from("messages")
        .select(
          "id,role,content",
        )
        .eq(
          "conversation_id",
          conversation.id,
        )
        .eq(
          "user_id",
          userId,
        )
        .order(
          "created_at",
          {
            ascending: true,
          },
        );

      if (messagesError) {
        setMessages([]);

        setError(
          "Não foi possível carregar essa decisão.",
        );

        return;
      }

      setMessages(
        (data ??
          []) as Message[],
      );

      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({
          top:
            contentRef.current
              ?.scrollHeight ?? 0,
          behavior: "smooth",
        });
      });
    };

  /*
   * ==========================================================
   * NOVA DECISÃO
   * ==========================================================
   */

  const newDecision = () => {
    setActiveConversation(null);
    setMessages([]);
    setInput("");
    setError(null);

    settle(false);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /*
   * ==========================================================
   * SELEÇÃO DA AI
   * ==========================================================
   *
   * Esta é a mesma lógica do ai-test.
   */

  const getAiFunction =
    async () => {
      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

      if (
        userError ||
        !user
      ) {
        throw {
          status: 401,
          message:
            "Usuário não autenticado",
        };
      }

      const {
        data: subscription,
        error:
          subscriptionError,
      } = await supabase
        .from("subscription")
        .select(`
          plan,
          status,
          expires_at
        `)
        .eq(
          "user_id",
          user.id,
        )
        .order(
          "created_at",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle<Subscription>();

      if (subscriptionError) {
        console.error(
          "Erro ao buscar assinatura:",
          subscriptionError,
        );

        setModelLabel("Free");

        return "decidly-ai-free";
      }

      const now = new Date();

      const plan =
        subscription?.plan
          ?.trim()
          .toLowerCase();

      const status =
        subscription?.status
          ?.trim()
          .toLowerCase();

      const expiresAt =
        subscription?.expires_at
          ? new Date(
              subscription.expires_at,
            )
          : null;

      const hasExpired =
        expiresAt !== null &&
        expiresAt.getTime() <
          now.getTime();

      const isVip =
        plan === "vip" &&
        (
          status === "active" ||
          status === "ativo"
        ) &&
        !hasExpired;

      if (isVip) {
        setModelLabel("VIP");

        return "decidly-ai";
      }

      setModelLabel("Free");

      return "decidly-ai-free";
    };

  /*
   * ==========================================================
   * CRIAR CONVERSA
   * ==========================================================
   */

  const createConversation =
    async (
      text: string,
    ) => {
      if (!userId) {
        throw {
          status: 401,
          message:
            "Usuário não autenticado",
        };
      }

      const id =
        crypto.randomUUID();

      const title =
        text.length > 70
          ? `${text.slice(
              0,
              70,
            )}…`
          : text;

      const {
        data,
        error:
          insertError,
      } = await supabase
        .from("conversations")
        .insert({
          id,
          user_id: userId,
          title,
        })
        .select(
          "id,user_id,title,created_at,updated_at",
        )
        .single();

      if (insertError) {
        throw {
          status: insertError.code,
          message:
            insertError.message,
        };
      }

      if (data) {
        setItems(
          (current) => [
            data as Conversation,
            ...current,
          ],
        );
      }

      setActiveConversation(id);

      return id;
    };

  /*
   * ==========================================================
   * ENVIAR MENSAGEM
   * ==========================================================
   */

  const sendMessage =
    async () => {
      const trimmedMessage =
        input.trim();

      if (
        !trimmedMessage ||
        busy
      ) {
        return;
      }

      setError(null);

      /*
       * Descobre/cria a conversa.
       */

      let conversationId =
        activeConversation;

      try {
        if (!conversationId) {
          conversationId =
            await createConversation(
              trimmedMessage,
            );
        }
      } catch (err) {
        setMessages(
          (current) => [
            ...current,
            {
              id:
                crypto.randomUUID(),
              role: "assistant",
              content:
                getFriendlyAiError(
                  typeof err ===
                    "object" &&
                    err !== null
                    ? (err as any)
                        .status
                    : undefined,
                  typeof err ===
                    "object" &&
                    err !== null
                    ? (err as any)
                        .message
                    : "",
                ),
            },
          ],
        );

        return;
      }

      /*
       * Mensagem do usuário.
       */

      const userMessage: Message = {
        id:
          crypto.randomUUID(),
        role: "user",
        content:
          trimmedMessage,
      };

      const updatedMessages: Message[] =
        [
          ...messages,
          userMessage,
        ];

      setMessages(
        updatedMessages,
      );

      setInput("");

      if (textareaRef.current) {
        textareaRef.current.style.height =
          "61px";
      }

      setBusy(true);

      requestAnimationFrame(() => {
        contentRef.current?.scrollTo({
          top:
            contentRef.current
              ?.scrollHeight ?? 0,
          behavior: "smooth",
        });
      });

      try {
        /*
         * Usa exatamente a mesma seleção
         * Free/VIP do ai-test.
         */

        const functionName =
          await getAiFunction();

        /*
         * Enviamos somente as últimas 12
         * mensagens para manter o contexto.
         */

        const history: AiMessage[] =
          updatedMessages
            .slice(-12)
            .map(
              ({
                role,
                content,
              }) => ({
                role,
                content,
              }),
            );

        const {
          data,
          error:
            functionError,
        } =
          await supabase.functions.invoke(
            functionName,
            {
              body: {
                message:
                  trimmedMessage,
                history,
              },
            },
          );

        /*
         * Erro HTTP da Edge Function.
         */

        if (functionError) {
          let status:
            | number
            | undefined;

          let backendMessage = "";

          try {
            const context =
              (functionError as any)
                .context;

            status =
              context?.status;

            if (context) {
              const errorBody =
                await context
                  .clone()
                  .json()
                  .catch(
                    () => null,
                  );

              if (
                errorBody &&
                typeof errorBody.error ===
                  "string"
              ) {
                backendMessage =
                  errorBody.error;
              }
            }
          } catch {
            /*
             * Nunca expomos erro técnico.
             */
          }

          throw {
            status,
            message:
              backendMessage ||
              functionError.message ||
              "",
          };
        }

        /*
         * Backend pode retornar 200
         * com { error: "..." }.
         */

        if (data?.error) {
          throw {
            status:
              typeof data.status ===
              "number"
                ? data.status
                : undefined,

            message:
              typeof data.error ===
              "string"
                ? data.error
                : "",
          };
        }

        /*
         * Resposta inválida.
         */

        if (
          typeof data?.response !==
            "string" ||
          data.response
            .trim()
            .length === 0
        ) {
          throw {
            message:
              "Resposta inválida",
          };
        }

        const assistantMessage: Message =
          {
            id:
              crypto.randomUUID(),
            role: "assistant",
            content:
              data.response,
          };

        setMessages(
          (current) => [
            ...current,
            assistantMessage,
          ],
        );

        /*
         * Salva as mensagens no banco.
         *
         * Se sua Edge Function já salva mensagens,
         * remova este bloco para não duplicar.
         */

        const { error: saveError } =
          await supabase
            .from("messages")
            .insert([
              {
                id: userMessage.id,
                conversation_id:
                  conversationId,
                user_id: userId,
                role: "user",
                content:
                  trimmedMessage,
              },
              {
                id:
                  assistantMessage.id,
                conversation_id:
                  conversationId,
                user_id: userId,
                role: "assistant",
                content:
                  data.response,
              },
            ]);

        if (saveError) {
          console.error(
            "Erro ao salvar mensagens:",
            saveError,
          );
        }

        /*
         * Atualiza o timestamp da conversa.
         */

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
          );
      } catch (err) {
        let status:
          | number
          | undefined;

        let errorMessage = "";

        if (
          err &&
          typeof err === "object"
        ) {
          status =
            (err as any).status;

          errorMessage =
            (err as any).message ||
            "";
        }

        const friendlyMessage =
          getFriendlyAiError(
            status,
            errorMessage,
          );

        setMessages(
          (current) => [
            ...current,
            {
              id:
                crypto.randomUUID(),
              role: "assistant",
              content:
                friendlyMessage,
            },
          ],
        );
      } finally {
        setBusy(false);

        requestAnimationFrame(() => {
          textareaRef.current?.focus();

          contentRef.current?.scrollTo({
            top:
              contentRef.current
                ?.scrollHeight ?? 0,
            behavior: "smooth",
          });
        });
      }
    };

  /*
   * ==========================================================
   * TEXTAREA
   * ==========================================================
   */

  const handleInput = (
    event: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    const value =
      event.target.value;

    setInput(value);

    const element =
      event.currentTarget;

    element.style.height =
      "auto";

    element.style.height =
      `${Math.min(
        element.scrollHeight,
        150,
      )}px`;
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey ||
        event.metaKey)
    ) {
      event.preventDefault();

      void sendMessage();
    }
  };

  /*
   * ==========================================================
   * TECLADO MOBILE
   * ==========================================================
   */

  useEffect(() => {
    const viewport =
      window.visualViewport;

    if (!viewport) return;

    const updateKeyboard =
      () => {
        const keyboardHeight =
          Math.max(
            0,
            window.innerHeight -
              viewport.height -
              viewport.offsetTop,
          );

        if (composerRef.current) {
          composerRef.current.style.transform =
            `translate3d(0,-${keyboardHeight}px,0)`;
        }

        if (contentRef.current) {
          contentRef.current.style.paddingBottom =
            `${Math.max(
              250,
              keyboardHeight + 190,
            )}px`;
        }
      };

    viewport.addEventListener(
      "resize",
      updateKeyboard,
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboard,
    );

    updateKeyboard();

    return () => {
      viewport.removeEventListener(
        "resize",
        updateKeyboard,
      );

      viewport.removeEventListener(
        "scroll",
        updateKeyboard,
      );
    };
  }, []);

  /*
   * ==========================================================
   * FILTRO
   * ==========================================================
   */

  const filtered =
    items.filter((item) =>
      item.title
        .toLowerCase()
        .includes(
          query
            .trim()
            .toLowerCase(),
        ),
    );

  /*
   * ==========================================================
   * RENDER
   * ==========================================================
   */

  return (
    <div
      className="
        min-h-screen
        overflow-hidden
        bg-[#0d0a11]
        text-white
      "
    >
      {/* BACKDROP */}

      <div
        ref={backdropRef}
        onClick={() =>
          settle(false)
        }
        className="
          pointer-events-none
          fixed
          inset-0
          z-20
          bg-black
          opacity-0
        "
      />

      {/* SIDEBAR */}

      <aside
        ref={sidebarRef}
        onPointerDown={
          beginDrag
        }
        onPointerMove={
          moveDrag
        }
        onPointerUp={
          endDrag
        }
        onPointerCancel={
          endDrag
        }
        className="
          fixed
          inset-y-0
          left-0
          z-30
          flex
          w-[min(86vw,320px)]
          flex-col
          border-r
          border-white/10
          bg-[#17111f]
          p-[18px_15px]
          shadow-[20px_0_55px_rgba(0,0,0,.45)]
          will-change-transform
          touch-pan-y
        "
        style={{
          transform:
            `translate3d(-${WIDTH}px,0,0)`,
        }}
      >
        <div className="flex items-center justify-between font-semibold">
          <span>
            DecidlyAI
          </span>

          <button
            type="button"
            aria-label="Fechar menu"
            onPointerDown={(
              event,
            ) =>
              event.stopPropagation()
            }
            onClick={() =>
              settle(false)
            }
            className="
              grid
              h-9
              w-9
              place-items-center
              rounded-[10px]
              bg-white/5
              text-white
              hover:bg-white/10
            "
          >
            <X size={20} />
          </button>
        </div>

        <button
          type="button"
          onPointerDown={(
            event,
          ) =>
            event.stopPropagation()
          }
          onClick={
            newDecision
          }
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

        <label
          onPointerDown={(
            event,
          ) =>
            event.stopPropagation()
          }
          className="
            mt-3.5
            flex
            items-center
            gap-2
            rounded-xl
            border
            border-white/10
            bg-white/[.04]
            px-3
            text-white/40
          "
        >
          <Search size={16} />

          <input
            value={query}
            onChange={(
              event,
            ) =>
              setQuery(
                event.target
                  .value,
              )
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

        <div
          onPointerDown={(
            event,
          ) =>
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
          {filtered.length ===
          0 ? (
            <p className="px-2.5 py-3 text-white/35">
              Nenhuma decisão encontrada.
            </p>
          ) : (
            filtered.map(
              (item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() =>
                    void loadConversation(
                      item,
                    )
                  }
                  className={`
                    block
                    w-full
                    truncate
                    rounded-[10px]
                    px-2.5
                    py-2.5
                    text-left
                    text-sm
                    transition
                    ${
                      activeConversation ===
                      item.id
                        ? "bg-white/[.08] text-white"
                        : "text-white/65 hover:bg-white/[.06]"
                    }
                  `}
                >
                  {
                    item.title
                  }
                </button>
              ),
            )
          )}
        </div>

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

      {/* ÁREA DE SWIPE */}

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
        onPointerDown={
          beginDrag
        }
        onPointerMove={
          moveDrag
        }
        onPointerUp={
          endDrag
        }
        onPointerCancel={
          endDrag
        }
      />

      {/* MAIN */}

      <main className="flex min-h-screen flex-col">
        {/* TOPBAR */}

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
            onClick={() =>
              settle(!open)
            }
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

          <span className="ml-auto text-xs text-white/35">
            Workspace
          </span>
        </header>

        {/* CHAT */}

        <section
          ref={contentRef}
          className="
            min-h-0
            flex-1
            overflow-y-auto
            px-[18px]
            pb-[250px]
            pt-7
          "
        >
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-[22px]">
            {/* WELCOME */}

            {messages.length ===
              0 && (
              <div
                className="
                  mt-5
                  mb-2
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
                    draggable={
                      false
                    }
                  />
                </div>

                <h1
                  className="
                    mt-4
                    text-[24px]
                    font-semibold
                    tracking-tight
                    text-white
                  "
                >
                  Qual decisão você precisa analisar?
                </h1>

                <p className="mt-2 text-sm">
                  Descreva sua situação e
                  organize suas possibilidades.
                </p>
              </div>
            )}

            {/* MENSAGENS */}

            {messages.map(
              (chatMessage) => (
                <div
                  key={
                    chatMessage.id
                  }
                  className={`
                    max-w-[82%]
                    whitespace-pre-wrap
                    break-words
                    rounded-[18px]
                    px-4
                    py-[13px]
                    text-sm
                    leading-[1.55]
                    ${
                      chatMessage.role ===
                      "user"
                        ? "ml-auto rounded-br-[5px] bg-[#7651e8] text-white"
                        : "mr-auto rounded-bl-[5px] border border-white/10 bg-white/[.045] text-white/[.78]"
                    }
                  `}
                >
                  {chatMessage.role ===
                  "assistant" ? (
                    <div className="max-w-full overflow-x-auto">
                      <div
                        className="
                          prose
                          prose-invert
                          max-w-none
                          break-words

                          prose-p:my-2
                          prose-p:leading-relaxed

                          prose-headings:mt-4
                          prose-headings:mb-2

                          prose-h1:text-xl
                          prose-h2:text-lg
                          prose-h3:text-base

                          prose-headings:text-white

                          prose-strong:text-white

                          prose-ul:my-2
                          prose-ol:my-2

                          prose-li:my-1

                          prose-table:my-3
                          prose-table:text-sm

                          prose-th:px-3
                          prose-th:py-2

                          prose-td:px-3
                          prose-td:py-2

                          prose-hr:border-white/10
                        "
                      >
                        <ReactMarkdown
                          remarkPlugins={[
                            remarkGfm,
                          ]}
                        >
                          {
                            chatMessage.content
                          }
                        </ReactMarkdown>
                      </div>
                    </div>
                  ) : (
                    chatMessage.content
                  )}
                </div>
              ),
            )}

            {/* LOADING */}

            {busy && (
              <div
                className="
                  mr-auto
                  flex
                  items-center
                  gap-2
                  rounded-[18px]
                  rounded-bl-[5px]
                  border
                  border-white/10
                  bg-white/[.045]
                  px-4
                  py-[13px]
                  text-sm
                  text-white/45
                "
              >
                <Sparkles
                  size={15}
                />

                <span>
                  DecidlyAI está pensando...
                </span>
              </div>
            )}

            {/* ERRO */}

            {error && (
              <div
                role="alert"
                className="
                  rounded-xl
                  border
                  border-red-400/20
                  bg-red-400/10
                  px-4
                  py-3
                  text-sm
                  text-red-200
                "
              >
                {error}
              </div>
            )}
          </div>
        </section>

        {/* COMPOSER */}

        <div
          ref={composerRef}
          className="
            fixed
            inset-x-0
            bottom-0
            z-10
            px-3
            pt-[9px]
            transition-transform
            duration-75
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
                ref={textareaRef}
                value={input}
                onChange={
                  handleInput
                }
                onKeyDown={
                  handleKeyDown
                }
                rows={2}
                disabled={busy}
                placeholder="Mande o que você quer decidir para a DecidlyAI te ajudar"
                className="
                  block
                  min-h-[61px]
                  max-h-[150px]
                  w-full
                  resize-none
                  overflow-y-auto
                  border-0
                  bg-transparent
                  px-2
                  py-1.5
                  text-[15px]
                  leading-[1.45]
                  text-white
                  outline-none
                  ring-0
                  placeholder:text-white/55

                  focus:border-0
                  focus:outline-none
                  focus:ring-0

                  disabled:cursor-not-allowed
                  disabled:opacity-60
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
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={
                    !input.trim() ||
                    busy
                  }
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
              DecidlyAI é um agente de AI que pode
              cometer erros, olhe duas vezes a resposta
              dela antes de usar.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}