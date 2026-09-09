import { createFileRoute } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Menu,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
  Mic,
  MicOff,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type Subscription = {
  id: string;
  user_id: string;
  plan: string | null;
  status: string | null;
  current_period_end: string | null;
};

const SIDEBAR_MAX_WIDTH = 320;

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult:
    | ((
        event: {
          results: ArrayLike<{
            isFinal: boolean;
            0: {
              transcript: string;
            };
          }>;
        },
      ) => void)
    | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProgress, setSidebarProgress] = useState(0);
  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const [isListening, setIsListening] = useState(false);

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const shouldKeepListeningRef = useRef(false);

  const dragState = useRef<{
    active: boolean;
    startX: number;
    startProgress: number;
  }>({
    active: false,
    startX: 0,
    startProgress: 0,
  });

  /*
   * ---------------------------------------------------------
   * MOBILE KEYBOARD
   * ---------------------------------------------------------
   */

  useEffect(() => {
    const viewport = window.visualViewport;

    if (!viewport) return;

    const updateKeyboard = () => {
      const keyboardHeight = Math.max(
        0,
        Math.round(
          window.innerHeight -
            viewport.height -
            viewport.offsetTop,
        ),
      );

      setKeyboardOffset(keyboardHeight);

      if (keyboardHeight > 0) {
        requestAnimationFrame(() => {
          const chat = chatRef.current;

          if (chat) {
            chat.scrollTop = chat.scrollHeight;
          }
        });
      }
    };

    updateKeyboard();

    viewport.addEventListener("resize", updateKeyboard);
    viewport.addEventListener("scroll", updateKeyboard);

    return () => {
      viewport.removeEventListener("resize", updateKeyboard);
      viewport.removeEventListener("scroll", updateKeyboard);
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * AUTO SCROLL
   * ---------------------------------------------------------
   */

  useEffect(() => {
    requestAnimationFrame(() => {
      const chat = chatRef.current;

      if (chat) {
        chat.scrollTop = chat.scrollHeight;
      }
    });
  }, [messages, isLoading]);

  /*
   * ---------------------------------------------------------
   * AUTH
   * ---------------------------------------------------------
   */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (user) {
        setUserId(user.id);
      }
    };

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * CONVERSATIONS
   * ---------------------------------------------------------
   */

  const loadConversations = useCallback(async (currentUserId: string) => {
    const { data } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at")
      .eq("user_id", currentUserId)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (data) {
      setConversations(data);
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    loadConversations(userId);
  }, [userId, loadConversations]);

  /*
   * ---------------------------------------------------------
   * SIDEBAR
   * ---------------------------------------------------------
   */

  const paintSidebar = useCallback((progress: number) => {
    const next = Math.min(1, Math.max(0, progress));

    setSidebarProgress(next);

    if (sidebarRef.current) {
      sidebarRef.current.style.transform = `translate3d(${
        -100 + next * 100
      }%, 0, 0)`;
    }
  }, []);

  const settleSidebar = useCallback(
    (progress: number) => {
      const next = progress >= 0.5 ? 1 : 0;

      setSidebarProgress(next);

      if (sidebarRef.current) {
        sidebarRef.current.style.transition =
          "transform 220ms cubic-bezier(.22,.61,.36,1)";
        sidebarRef.current.style.transform = `translate3d(${
          -100 + next * 100
        }%, 0, 0)`;

        window.setTimeout(() => {
          if (sidebarRef.current) {
            sidebarRef.current.style.transition = "";
          }
        }, 230);
      }

      setSidebarOpen(next === 1);
    },
    [],
  );

  const startSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    dragState.current = {
      active: true,
      startX: event.clientX,
      startProgress: sidebarProgress,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!dragState.current.active) return;

    const delta = event.clientX - dragState.current.startX;

    const progress =
      dragState.current.startProgress +
      delta / SIDEBAR_MAX_WIDTH;

    paintSidebar(progress);
  };

  const endSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!dragState.current.active) return;

    dragState.current.active = false;

    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // noop
    }

    settleSidebar(sidebarProgress);
  };

  /*
   * ---------------------------------------------------------
   * NEW CONVERSATION
   * ---------------------------------------------------------
   */

  const newConversation = () => {
    setMessages([]);
    setInput("");
    setErrorMessage("");
    setSidebarOpen(false);
    setSidebarProgress(0);

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /*
   * ---------------------------------------------------------
   * SAVE CONVERSATION
   * ---------------------------------------------------------
   */

  const saveConversationTitle = async (
    currentUserId: string,
    text: string,
  ) => {
    const title =
      text.trim().length > 60
        ? `${text.trim().slice(0, 60)}...`
        : text.trim();

    if (!title) return;

    await supabase.from("conversations").insert({
      user_id: currentUserId,
      title,
    });

    await loadConversations(currentUserId);
  };

  /*
   * ---------------------------------------------------------
   * AI
   * ---------------------------------------------------------
   */

  const getAIModel = async (currentUserId: string) => {
    const { data } = await supabase
      .from("subscription")
      .select(
        "id,user_id,plan,status,current_period_end",
      )
      .eq("user_id", currentUserId)
      .order("current_period_end", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle<Subscription>();

    if (!data) {
      return "decidly-ai-free";
    }

    const isActive =
      data.status === "active" &&
      (
        !data.current_period_end ||
        new Date(data.current_period_end).getTime() > Date.now()
      );

    const isVip =
      data.plan === "vip" ||
      data.plan === "VIP" ||
      data.plan === "decidly-ai-vip";

    if (isActive && isVip) {
      return "decidly-ai";
    }

    return "decidly-ai-free";
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) return;

    if (!userId) {
      setErrorMessage(
        "Você precisa estar conectado para enviar uma mensagem.",
      );
      return;
    }

    setErrorMessage("");
    setInput("");
    setIsLoading(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);

    try {
      const model = await getAIModel(userId);

      const history = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const { data, error } = await supabase.functions.invoke(
        model,
        {
          body: {
            message: text,
            history,
          },
        },
      );

      if (error) {
        const status = error.context?.status;

        if (status === 402) {
          throw new Error(
            "Seu plano atual não permite usar este recurso.",
          );
        }

        if (status === 429) {
          throw new Error(
            "Muitas solicitações no momento. Tente novamente em alguns instantes.",
          );
        }

        if (status === 401 || status === 403) {
          throw new Error(
            "Sua sessão não permite realizar esta ação.",
          );
        }

        if (status && status >= 500) {
          throw new Error(
            "A DecidlyAI está temporariamente indisponível. Tente novamente.",
          );
        }

        throw new Error(
          "Não foi possível obter uma resposta agora.",
        );
      }

      const answer =
        data?.answer ??
        data?.response ??
        data?.message ??
        data?.content;

      if (
        typeof answer !== "string" ||
        !answer.trim()
      ) {
        throw new Error(
          "Não foi possível obter uma resposta agora.",
        );
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      if (messages.length === 0) {
        await saveConversationTitle(userId, text);
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível obter uma resposta agora.",
      );
    } finally {
      setIsLoading(false);

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
      });
    }
  };

  /*
   * ---------------------------------------------------------
   * TEXTAREA
   * ---------------------------------------------------------
   */

  const resizeTextarea = () => {
    const textarea = textareaRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, 58),
      140,
    );

    textarea.style.height = `${nextHeight}px`;
  };

  useEffect(() => {
    resizeTextarea();
  }, [input]);

  const handleTextareaKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      sendMessage();
    }
  };

  const handleTextareaFocus = () => {
    setTimeout(() => {
      textareaRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      const chat = chatRef.current;

      if (chat) {
        chat.scrollTop = chat.scrollHeight;
      }
    }, 100);
  };

  /*
   * ---------------------------------------------------------
   * MICROPHONE
   * ---------------------------------------------------------
   *
   * IMPORTANTE:
   * O navegador não fornece detecção automática de idioma
   * perfeita. Aqui usamos o idioma configurado no navegador.
   *
   * Não existe select ocupando espaço no compositor.
   */

  const stopListening = useCallback(() => {
    shouldKeepListeningRef.current = false;

    const recognition = recognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // noop
      }
    }

    setIsListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setErrorMessage(
        "O reconhecimento de voz não é compatível com este navegador. Tente usar o Chrome ou Edge.",
      );
      return;
    }

    if (isLoading) return;

    if (isListening) {
      stopListening();
      return;
    }

    setErrorMessage("");

    const recognition = new SpeechRecognition();

    /*
     * Usa o idioma do navegador automaticamente.
     * Exemplos:
     * pt-BR, en-US, es-ES, fr-FR...
     */
    const browserLanguage =
      navigator.language || "pt-BR";

    recognition.lang = browserLanguage;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
      setIsListening(true);
      shouldKeepListeningRef.current = true;
    };

    recognition.onresult = (event) => {
      let transcript = "";

      for (
        let i = 0;
        i < event.results.length;
        i++
      ) {
        transcript += event.results[i][0].transcript;
      }

      if (transcript.trim()) {
        setInput((current) => {
          const existing = current.trim();

          if (!existing) {
            return transcript.trim();
          }

          return `${existing} ${transcript.trim()}`;
        });
      }
    };

    recognition.onerror = (event) => {
      shouldKeepListeningRef.current = false;
      setIsListening(false);

      if (event.error === "not-allowed") {
        setErrorMessage(
          "Permissão do microfone bloqueada. Permita o acesso ao microfone no navegador.",
        );
        return;
      }

      if (event.error === "no-speech") {
        setErrorMessage(
          "Não consegui ouvir sua voz. Tente falar novamente.",
        );
        return;
      }

      if (event.error === "audio-capture") {
        setErrorMessage(
          "Não foi possível acessar o microfone.",
        );
        return;
      }

      if (event.error === "network") {
        setErrorMessage(
          "O reconhecimento de voz precisa de conexão com a internet.",
        );
        return;
      }

      setErrorMessage(
        "Não foi possível usar o microfone agora.",
      );
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
      shouldKeepListeningRef.current = false;

      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        resizeTextarea();
      });
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      setErrorMessage(
        "Não foi possível iniciar o microfone. Tente novamente.",
      );
    }
  }, [
    isListening,
    isLoading,
    stopListening,
  ]);

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;

      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // noop
        }
      }
    };
  }, []);

  /*
   * ---------------------------------------------------------
   * SEARCH
   * ---------------------------------------------------------
   */

  const filteredConversations = conversations.filter(
    (conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.toLowerCase()),
  );

  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white">
      {/* SIDEBAR */}

      <div
        ref={sidebarRef}
        className="fixed inset-y-0 left-0 z-[100] w-[min(320px,88vw)] bg-[#120d19] shadow-2xl"
        style={{
          transform: `translate3d(${
            -100 + sidebarProgress * 100
          }%, 0, 0)`,
        }}
        onPointerDown={startSidebarDrag}
        onPointerMove={moveSidebarDrag}
        onPointerUp={endSidebarDrag}
        onPointerCancel={endSidebarDrag}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-2">
              <img
                src="/appicon.png"
                alt="DecidlyAI"
                className="h-8 w-8 rounded-xl"
              />

              <span className="font-semibold">
                DecidlyAI
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setSidebarOpen(false);
                setSidebarProgress(0);
              }}
              className="rounded-xl p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="px-3">
            <button
              type="button"
              onClick={newConversation}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              <Plus size={18} />
              Nova conversa
            </button>
          </div>

          <div className="px-3 pt-4">
            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 py-2.5">
              <Search
                size={17}
                className="text-white/40"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Pesquisar"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-3 py-4">
            <div className="mb-2 px-2 text-xs font-medium text-white/35">
              Conversas
            </div>

            <div className="space-y-1">
              {filteredConversations.map(
                (conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <div className="truncate">
                      {conversation.title}
                    </div>
                  </button>
                ),
              )}

              {filteredConversations.length === 0 && (
                <div className="px-3 py-3 text-sm text-white/30">
                  Nenhuma conversa encontrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SIDEBAR BACKDROP */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[90] bg-black/50"
          onClick={() => {
            setSidebarOpen(false);
            setSidebarProgress(0);
          }}
        />
      )}

      {/* FIXED MENU BUTTON */}

      <button
        type="button"
        onClick={() => {
          setSidebarOpen(true);
          setSidebarProgress(1);
        }}
        className="fixed left-4 top-4 z-[110] flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17111e]/90 text-white shadow-lg backdrop-blur-md transition hover:bg-[#211827]"
        aria-label="Abrir menu"
      >
        <Menu size={21} />
      </button>

      {/* TOP BAR */}

      <header className="fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-center pointer-events-none">
        <div className="flex items-center gap-2">
          <img
            src="/appicon.png"
            alt="DecidlyAI"
            className="h-7 w-7 rounded-lg"
          />

          <span className="text-sm font-semibold">
            DecidlyAI
          </span>
        </div>
      </header>

      {/* CHAT */}

      <main
        ref={chatRef}
        className="h-[100dvh] overflow-y-auto overscroll-contain px-4 pb-32 pt-24"
      >
        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
          {messages.length === 0 ? (
            <div className="flex flex-1 items-center justify-center pb-32">
              <div className="w-full max-w-2xl text-center">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06]">
                  <Sparkles
                    size={25}
                    className="text-white/80"
                  />
                </div>

                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  O que você está decidindo?
                </h1>

                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/45">
                  Explique a situação, as opções que você tem e o que está te deixando em dúvida.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-5 pb-10">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[85%] rounded-2xl bg-white/[0.08] px-4 py-3 text-sm leading-6"
                        : "max-w-[90%] text-sm leading-7 text-white/85"
                    }
                  >
                    {message.role === "assistant" ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                      >
                        {message.content}
                      </ReactMarkdown>
                    ) : (
                      message.content
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-white/40">
                  <Sparkles size={15} />
                  <span>
                    DecidlyAI está pensando...
                  </span>
                </div>
              )}

              {errorMessage && (
                <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {errorMessage}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* COMPOSER */}

      <div
        className="fixed left-0 right-0 z-50 px-3 sm:px-4"
        style={{
          bottom: 0,
          transform: `translate3d(0, -${keyboardOffset}px, 0)`,
          transition:
            "transform 90ms linear",
        }}
      >
        <div className="mx-auto w-full max-w-3xl pb-3 sm:pb-5">
          <div className="rounded-[26px] bg-[#17111e]/95 px-2 py-2 shadow-2xl backdrop-blur-xl">
            <div className="flex items-end gap-1">
              {/* MICROPHONE */}

              <button
                type="button"
                onClick={startListening}
                disabled={isLoading}
                className={`mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition ${
                  isListening
                    ? "bg-white text-black"
                    : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                } disabled:cursor-not-allowed disabled:opacity-30`}
                aria-label={
                  isListening
                    ? "Parar microfone"
                    : "Usar microfone"
                }
                title={
                  isListening
                    ? "Parar microfone"
                    : "Usar microfone"
                }
              >
                {isListening ? (
                  <MicOff size={20} />
                ) : (
                  <Mic size={20} />
                )}
              </button>

              {/* TEXTAREA */}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(event.target.value)
                }
                onKeyDown={handleTextareaKeyDown}
                onFocus={handleTextareaFocus}
                placeholder="Escreva sua decisão..."
                rows={1}
                disabled={isLoading}
                className="min-h-[58px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-2 py-3 text-[15px] leading-6 text-white outline-none ring-0 shadow-none placeholder:text-white/35 focus:border-0 focus:outline-none focus:ring-0 disabled:opacity-50"
              />

              {/* SEND */}

              <button
                type="button"
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className="mb-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-25"
                aria-label="Enviar"
              >
                <Send size={18} />
              </button>
            </div>
          </div>

          <p className="mt-2 text-center text-[11px] text-white/25">
            A DecidlyAI pode cometer erros. Verifique informações importantes.
          </p>
        </div>
      </div>
    </div>
  );
}