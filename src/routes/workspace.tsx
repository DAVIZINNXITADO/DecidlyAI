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
  Sparkles,
  X,
  Mic,
  MicOff,
  ArrowUp,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Volume2,
  VolumeX,
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

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEvent = {
  results: ArrayLike<SpeechRecognitionResult>;
  resultIndex: number;
};

type SpeechRecognitionErrorEvent = {
  error: string;
};

type SpeechRecognitionInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;

  start: () => void;
  stop: () => void;
  abort: () => void;

  onstart: (() => void) | null;
  onend: (() => void) | null;

  onerror:
    | ((event: SpeechRecognitionErrorEvent) => void)
    | null;

  onresult:
    | ((event: SpeechRecognitionEvent) => void)
    | null;
};

type SpeechRecognitionConstructor =
  new () => SpeechRecognitionInstance;

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
  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  /* MICROFONE */
  const [isListening, setIsListening] = useState(false);

  /* AÇÕES */
  const [likedMessages, setLikedMessages] =
    useState<Record<string, boolean>>({});

  const [dislikedMessages, setDislikedMessages] =
    useState<Record<string, boolean>>({});

  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  /* LEITOR */
  const [readingMessageId, setReadingMessageId] =
    useState<string | null>(null);

  const [readingCharIndex, setReadingCharIndex] =
    useState(-1);

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const lastTranscriptRef = useRef("");

  const speechRef =
    useRef<SpeechSynthesisUtterance | null>(null);

  const sidebarDragRef = useRef<{
    active: boolean;
    startX: number;
    startProgress: number;
  }>({
    active: false,
    startX: 0,
    startProgress: 0,
  });

  /*
   * =========================================================
   * SIDEBAR
   * =========================================================
   */

  const paintSidebar = useCallback(
    (progress: number) => {
      const next = Math.min(
        1,
        Math.max(0, progress),
      );

      setSidebarProgress(next);

      if (sidebarRef.current) {
        sidebarRef.current.style.transform =
          `translate3d(${
            -100 + next * 100
          }%, 0, 0)`;
      }
    },
    [],
  );

  const openSidebar = () => {
    setSidebarOpen(true);
    paintSidebar(1);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    paintSidebar(0);
  };

  const startSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    /*
     * Só começa o arrastar quando o toque
     * estiver na região lateral da sidebar.
     *
     * Isso evita que clicar em conversa,
     * pesquisar ou nova conversa arraste tudo.
     */
    const rect =
      event.currentTarget.getBoundingClientRect();

    const localX =
      event.clientX - rect.left;

    const isEdge =
      localX >= rect.width - 28;

    if (!isEdge) return;

    sidebarDragRef.current = {
      active: true,
      startX: event.clientX,
      startProgress: sidebarProgress,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  };

  const moveSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!sidebarDragRef.current.active) {
      return;
    }

    const delta =
      event.clientX -
      sidebarDragRef.current.startX;

    const progress =
      sidebarDragRef.current.startProgress +
      delta / SIDEBAR_MAX_WIDTH;

    paintSidebar(progress);
  };

  const endSidebarDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!sidebarDragRef.current.active) {
      return;
    }

    sidebarDragRef.current.active = false;

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // noop
    }

    const finalProgress =
      sidebarProgress;

    if (finalProgress > 0.5) {
      openSidebar();
    } else {
      closeSidebar();
    }
  };

  /*
   * =========================================================
   * EDGE SWIPE PARA ABRIR
   * =========================================================
   */

  const edgeDragRef = useRef<{
    active: boolean;
    startX: number;
  }>({
    active: false,
    startX: 0,
  });

  const handleEdgePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (sidebarOpen) return;

    edgeDragRef.current = {
      active: true,
      startX: event.clientX,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  };

  const handleEdgePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!edgeDragRef.current.active) {
      return;
    }

    const delta =
      event.clientX -
      edgeDragRef.current.startX;

    if (delta <= 0) return;

    const progress =
      Math.min(
        1,
        delta / SIDEBAR_MAX_WIDTH,
      );

    paintSidebar(progress);
  };

  const handleEdgePointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (!edgeDragRef.current.active) {
      return;
    }

    edgeDragRef.current.active = false;

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // noop
    }

    if (sidebarProgress >= 0.35) {
      openSidebar();
    } else {
      closeSidebar();
    }
  };

  /*
   * =========================================================
   * MOBILE KEYBOARD
   * =========================================================
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

      setKeyboardOffset(
        keyboardHeight,
      );

      if (keyboardHeight > 0) {
        requestAnimationFrame(() => {
          const chat = chatRef.current;

          if (chat) {
            chat.scrollTop =
              chat.scrollHeight;
          }
        });
      }
    };

    updateKeyboard();

    viewport.addEventListener(
      "resize",
      updateKeyboard,
    );

    viewport.addEventListener(
      "scroll",
      updateKeyboard,
    );

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
   * =========================================================
   * AUTO SCROLL
   * =========================================================
   */

  useEffect(() => {
    requestAnimationFrame(() => {
      const chat = chatRef.current;

      if (chat) {
        chat.scrollTop =
          chat.scrollHeight;
      }
    });
  }, [messages, isLoading]);

  /*
   * =========================================================
   * AUTH
   * =========================================================
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
   * =========================================================
   * CONVERSATIONS
   * =========================================================
   */

  const loadConversations =
    useCallback(
      async (currentUserId: string) => {
        const { data } =
          await supabase
            .from("conversations")
            .select(
              "id,title,created_at,updated_at",
            )
            .eq(
              "user_id",
              currentUserId,
            )
            .order("updated_at", {
              ascending: false,
            })
            .limit(30);

        if (data) {
          setConversations(data);
        }
      },
      [],
    );

  useEffect(() => {
    if (!userId) return;

    loadConversations(userId);
  }, [
    userId,
    loadConversations,
  ]);

  /*
   * =========================================================
   * NOVA CONVERSA
   * =========================================================
   */

  const newConversation = () => {
    setMessages([]);
    setInput("");
    setErrorMessage("");

    closeSidebar();

    /*
     * Aqui o foco continua porque foi
     * uma ação direta do usuário.
     */
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  };

  /*
   * =========================================================
   * SAVE CONVERSATION
   * =========================================================
   */

  const saveConversationTitle =
    async (
      currentUserId: string,
      text: string,
    ) => {
      const title =
        text.trim().length > 60
          ? `${text.trim().slice(
              0,
              60,
            )}...`
          : text.trim();

      if (!title) return;

      await supabase
        .from("conversations")
        .insert({
          user_id: currentUserId,
          title,
        });

      await loadConversations(
        currentUserId,
      );
    };

  /*
   * =========================================================
   * AI
   * =========================================================
   */

  const getAIModel = async (
    currentUserId: string,
  ) => {
    const { data } =
      await supabase
        .from("subscription")
        .select(
          "id,user_id,plan,status,current_period_end",
        )
        .eq(
          "user_id",
          currentUserId,
        )
        .order(
          "current_period_end",
          {
            ascending: false,
          },
        )
        .limit(1)
        .maybeSingle<Subscription>();

    if (!data) {
      return "decidly-ai-free";
    }

    const isActive =
      data.status === "active" &&
      (
        !data.current_period_end ||
        new Date(
          data.current_period_end,
        ).getTime() > Date.now()
      );

    const isVip =
      data.plan === "vip" ||
      data.plan === "VIP" ||
      data.plan ===
        "decidly-ai-vip";

    if (
      isActive &&
      isVip
    ) {
      return "decidly-ai";
    }

    return "decidly-ai-free";
  };

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    if (!userId) {
      setErrorMessage(
        "Você precisa estar conectado para enviar uma mensagem.",
      );
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {
        // noop
      }

      setIsListening(false);
    }

    setErrorMessage("");
    setInput("");
    setIsLoading(true);

    const userMessage: ChatMessage =
      {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
      };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    try {
      const model =
        await getAIModel(userId);

      const history = [
        ...messages,
        userMessage,
      ].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const {
        data,
        error,
      } =
        await supabase.functions.invoke(
          model,
          {
            body: {
              message: text,
              history,
            },
          },
        );

      if (error) {
        const status =
          error.context?.status;

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

        if (
          status === 401 ||
          status === 403
        ) {
          throw new Error(
            "Sua sessão não permite realizar esta ação.",
          );
        }

        if (
          status &&
          status >= 500
        ) {
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
        typeof answer !==
          "string" ||
        !answer.trim()
      ) {
        throw new Error(
          "Não foi possível obter uma resposta agora.",
        );
      }

      const assistantMessage:
        ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: answer,
        };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);

      if (messages.length === 0) {
        await saveConversationTitle(
          userId,
          text,
        );
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível obter uma resposta agora.",
      );
    } finally {
      /*
       * IMPORTANTE:
       * não fazemos focus aqui.
       *
       * Isso evita o teclado abrir
       * sozinho quando a IA responde.
       */
      setIsLoading(false);
    }
  };

  /*
   * =========================================================
   * TEXTAREA
   * =========================================================
   */

  const resizeTextarea =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) return;

      textarea.style.height =
        "auto";

      const nextHeight =
        Math.min(
          Math.max(
            textarea.scrollHeight,
            58,
          ),
          140,
        );

      textarea.style.height =
        `${nextHeight}px`;
    }, []);

  useEffect(() => {
    resizeTextarea();
  }, [
    input,
    resizeTextarea,
  ]);

  const handleTextareaKeyDown =
    (
      event: React.KeyboardEvent<HTMLTextAreaElement>,
    ) => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey ||
          event.metaKey)
      ) {
        event.preventDefault();
        sendMessage();
      }
    };

  const handleTextareaFocus =
    () => {
      setTimeout(() => {
        textareaRef.current?.scrollIntoView(
          {
            behavior: "smooth",
            block: "center",
          },
        );

        const chat =
          chatRef.current;

        if (chat) {
          chat.scrollTop =
            chat.scrollHeight;
        }
      }, 100);
    };

  /*
   * =========================================================
   * MICROFONE
   * =========================================================
   */

  const stopListening =
    useCallback(() => {
      const recognition =
        recognitionRef.current;

      if (recognition) {
        try {
          recognition.stop();
        } catch {
          // noop
        }
      }

      setIsListening(false);
    }, []);

  const startListening =
    useCallback(() => {
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

      lastTranscriptRef.current =
        "";

      const recognition =
        new SpeechRecognition();

      recognition.lang =
        navigator.language ||
        "pt-BR";

      recognition.continuous =
        false;

      recognition.interimResults =
        false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult =
        (event) => {
          const index =
            event.resultIndex;

          const result =
            event.results[index];

          if (
            !result ||
            !result.isFinal
          ) {
            return;
          }

          const transcript =
            result[0]?.transcript
              ?.trim();

          if (!transcript) return;

          const normalized =
            transcript
              .replace(
                /\s+/g,
                " ",
              )
              .trim()
              .toLowerCase();

          /*
           * Evita o mesmo resultado
           * várias vezes.
           */
          if (
            lastTranscriptRef.current ===
            normalized
          ) {
            return;
          }

          lastTranscriptRef.current =
            normalized;

          setInput((current) => {
            const existing =
              current
                .replace(
                  /\s+/g,
                  " ",
                )
                .trim();

            if (!existing) {
              return transcript;
            }

            const existingWords =
              existing.split(" ");

            const transcriptWords =
              transcript.split(" ");

            const lastWords =
              existingWords.slice(
                -transcriptWords.length,
              );

            /*
             * Protege contra:
             * Oi Oi Oi Oi
             */
            if (
              lastWords.length ===
                transcriptWords.length &&
              lastWords
                .join(" ")
                .toLowerCase() ===
                transcriptWords
                  .join(" ")
                  .toLowerCase()
            ) {
              return current;
            }

            return `${existing} ${transcript}`;
          });
        };

      recognition.onerror =
        (event) => {
          setIsListening(false);

          if (
            event.error ===
            "not-allowed"
          ) {
            setErrorMessage(
              "Permissão do microfone bloqueada. Permita o acesso ao microfone no navegador.",
            );
            return;
          }

          if (
            event.error ===
            "no-speech"
          ) {
            setErrorMessage(
              "Não consegui ouvir sua voz. Tente falar novamente.",
            );
            return;
          }

          if (
            event.error ===
            "audio-capture"
          ) {
            setErrorMessage(
              "Não foi possível acessar o microfone.",
            );
            return;
          }

          setErrorMessage(
            "Não foi possível usar o microfone agora.",
          );
        };

      recognition.onend =
        () => {
          setIsListening(false);

          recognitionRef.current =
            null;

          requestAnimationFrame(
            () => {
              textareaRef.current?.focus();
              resizeTextarea();
            },
          );
        };

      recognitionRef.current =
        recognition;

      try {
        recognition.start();
      } catch {
        recognitionRef.current =
          null;

        setIsListening(false);

        setErrorMessage(
          "Não foi possível iniciar o microfone. Tente novamente.",
        );
      }
    }, [
      isListening,
      isLoading,
      stopListening,
      resizeTextarea,
    ]);

  useEffect(() => {
    return () => {
      if (
        recognitionRef.current
      ) {
        try {
          recognitionRef.current.abort();
        } catch {
          // noop
        }

        recognitionRef.current =
          null;
      }
    };
  }, []);

  /*
   * =========================================================
   * LEITOR DE TEXTO
   * =========================================================
   */

  const stopReading = useCallback(
    () => {
      if (
        typeof window !==
        "undefined"
      ) {
        window.speechSynthesis.cancel();
      }

      speechRef.current =
        null;

      setReadingMessageId(null);
      setReadingCharIndex(-1);
    },
    [],
  );

  const readMessage = useCallback(
    (message: ChatMessage) => {
      if (
        typeof window ===
        "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setErrorMessage(
          "A leitura de texto não é compatível com este navegador.",
        );
        return;
      }

      /*
       * Se clicou na mesma mensagem
       * enquanto ela está lendo,
       * para a leitura.
       */
      if (
        readingMessageId ===
        message.id
      ) {
        stopReading();
        return;
      }

      /*
       * Cancela qualquer leitura anterior.
       */
      window.speechSynthesis.cancel();

      setReadingMessageId(
        message.id,
      );

      setReadingCharIndex(0);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      /*
       * Velocidade razoável e rápida.
       */
      utterance.rate = 1.15;

      utterance.pitch = 1;

      utterance.volume = 1;

      /*
       * Tenta usar português quando
       * o navegador tiver uma voz PT-BR.
       */
      const voices =
        window.speechSynthesis.getVoices();

      const portugueseVoice =
        voices.find((voice) =>
          voice.lang
            .toLowerCase()
            .startsWith("pt"),
        );

      if (portugueseVoice) {
        utterance.voice =
          portugueseVoice;
        utterance.lang =
          portugueseVoice.lang;
      } else {
        utterance.lang =
          navigator.language ||
          "pt-BR";
      }

      utterance.onboundary =
        (event) => {
          if (
            event.name ===
              "word" &&
            typeof event.charIndex ===
              "number"
          ) {
            setReadingCharIndex(
              event.charIndex,
            );
          }
        };

      utterance.onend = () => {
        speechRef.current =
          null;

        setReadingMessageId(
          null,
        );

        setReadingCharIndex(
          -1,
        );
      };

      utterance.onerror = () => {
        speechRef.current =
          null;

        setReadingMessageId(
          null,
        );

        setReadingCharIndex(
          -1,
        );
      };

      speechRef.current =
        utterance;

      window.speechSynthesis.speak(
        utterance,
      );
    },
    [
      readingMessageId,
      stopReading,
    ],
  );

  /*
   * =========================================================
   * DESTACAR PALAVRA SENDO LIDA
   * =========================================================
   */

  const renderReadingText = (
    text: string,
    charIndex: number,
  ) => {
    if (charIndex < 0) {
      return text;
    }

    const before =
      text.slice(
        0,
        charIndex,
      );

    const remaining =
      text.slice(charIndex);

    /*
     * Pega a primeira palavra a partir
     * do índice informado pelo navegador.
     */
    const match =
      remaining.match(
        /^\S+/,
      );

    if (!match) {
      return text;
    }

    const word =
      match[0];

    const wordStart =
      charIndex;

    const wordEnd =
      wordStart +
      word.length;

    return (
      <>
        {before}

        <mark
          className="rounded-md bg-[#A78BFA]/35 px-1 text-white transition-colors"
        >
          {text.slice(
            wordStart,
            wordEnd,
          )}
        </mark>

        {text.slice(wordEnd)}
      </>
    );
  };

  /*
   * =========================================================
   * LIKE / DISLIKE
   * =========================================================
   */

  const handleLike = (
    messageId: string,
  ) => {
    setLikedMessages(
      (current) => ({
        ...current,
        [messageId]:
          !current[messageId],
      }),
    );

    setDislikedMessages(
      (current) => ({
        ...current,
        [messageId]: false,
      }),
    );
  };

  const handleDislike = (
    messageId: string,
  ) => {
    setDislikedMessages(
      (current) => ({
        ...current,
        [messageId]:
          !current[messageId],
      }),
    );

    setLikedMessages(
      (current) => ({
        ...current,
        [messageId]: false,
      }),
    );
  };

  /*
   * =========================================================
   * COPIAR
   * =========================================================
   */

  const handleCopy = async (
    message: ChatMessage,
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopiedMessageId(
        message.id,
      );

      window.setTimeout(() => {
        setCopiedMessageId(
          (current) =>
            current ===
            message.id
              ? null
              : current,
        );
      }, 1800);
    } catch {
      setErrorMessage(
        "Não foi possível copiar a mensagem.",
      );
    }
  };

  /*
   * =========================================================
   * FILTER
   * =========================================================
   */

  const filteredConversations =
    conversations.filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(
            search.toLowerCase(),
          ),
    );

  /*
   * =========================================================
   * RENDER
   * =========================================================
   */

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white">

      {/* =====================================================
          ÁREA INVISÍVEL PARA SWIPE DA BORDA
          ===================================================== */}

      {!sidebarOpen && (
        <div
          className="fixed bottom-0 left-0 top-0 z-[105] w-6 touch-none"
          onPointerDown={
            handleEdgePointerDown
          }
          onPointerMove={
            handleEdgePointerMove
          }
          onPointerUp={
            handleEdgePointerUp
          }
          onPointerCancel={
            handleEdgePointerUp
          }
        />
      )}

      {/* =====================================================
          SIDEBAR
          ===================================================== */}

      <div
        ref={sidebarRef}
        className="fixed inset-y-0 left-0 z-[100] w-[min(320px,88vw)] bg-[#120d19] shadow-2xl"
        style={{
          transform:
            `translate3d(${
              -100 +
              sidebarProgress *
                100
            }%, 0, 0)`,
        }}
        onPointerDown={
          startSidebarDrag
        }
        onPointerMove={
          moveSidebarDrag
        }
        onPointerUp={
          endSidebarDrag
        }
        onPointerCancel={
          endSidebarDrag
        }
      >

        <div className="flex h-full flex-col">

          {/* HEADER DA SIDEBAR */}

          <div className="flex items-center justify-between px-5 py-5">

            <div className="flex items-center gap-3">

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
              onClick={
                closeSidebar
              }
              className="flex h-10 w-10 items-center justify-center rounded-xl text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={21} />
            </button>

          </div>

          {/* NOVA CONVERSA */}

          <div className="px-3">

            <button
              type="button"
              onClick={
                newConversation
              }
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition hover:bg-white/10"
            >
              <Plus size={20} />
              Nova conversa
            </button>

          </div>

          {/* PESQUISA */}

          <div className="px-3 pt-4">

            <div className="flex items-center gap-2 rounded-2xl bg-white/[0.06] px-3 py-2.5">

              <Search
                size={18}
                className="text-white/40"
              />

              <input
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />

            </div>

          </div>

          {/* CONVERSAS */}

          <div className="flex-1 overflow-y-auto px-3 py-4">

            <div className="mb-2 px-2 text-xs font-medium text-white/35">
              Conversas
            </div>

            <div className="space-y-1">

              {filteredConversations.map(
                (conversation) => (
                  <button
                    key={
                      conversation.id
                    }
                    type="button"
                    className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/70 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <div className="truncate">
                      {
                        conversation.title
                      }
                    </div>
                  </button>
                ),
              )}

              {filteredConversations.length ===
                0 && (
                <div className="px-3 py-3 text-sm text-white/30">
                  Nenhuma conversa encontrada.
                </div>
              )}

            </div>

          </div>

          {/* ÁREA DE ARRASTAR PARA FECHAR */}

          <div
            className="absolute bottom-0 right-0 top-0 w-7 cursor-ew-resize touch-none"
            aria-hidden="true"
          />

        </div>

      </div>

      {/* =====================================================
          BACKDROP
          ===================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[90] bg-black/50"
          onClick={
            closeSidebar
          }
        />
      )}

      {/* =====================================================
          BOTÃO MENU
          ===================================================== */}

      {!sidebarOpen && (
        <button
          type="button"
          onClick={
            openSidebar
          }
          className="fixed left-4 top-4 z-[110] flex h-11 w-11 items-center justify-center rounded-2xl bg-[#17111e]/95 text-white shadow-lg backdrop-blur-md transition hover:bg-[#211827]"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
      )}

      {/* =====================================================
          LOGO/NOME — SOMENTE INÍCIO
          ===================================================== */}

      {messages.length ===
        0 && (
        <header className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex h-16 items-center justify-center">

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
      )}

      {/* =====================================================
          CHAT
          ===================================================== */}

      <main
        ref={chatRef}
        className="h-[100dvh] overflow-y-auto overscroll-contain px-4 pb-32 pt-24"
      >

        <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">

          {messages.length ===
          0 ? (
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

              {messages.map(
                (message) => (
                  <div
                    key={
                      message.id
                    }
                    className={
                      message.role ===
                      "user"
                        ? "flex justify-end"
                        : "flex justify-start"
                    }
                  >

                    <div
                      className={
                        message.role ===
                        "user"
                          ? "max-w-[85%] rounded-2xl bg-[#8B5CF6] px-4 py-3 text-sm leading-6 text-white shadow-[0_4px_18px_rgba(139,92,246,0.18)]"
                          : "max-w-[90%] text-sm leading-7 text-white/85"
                      }
                    >

                      {message.role ===
                      "assistant" ? (
                        <>

                          {/* RESPOSTA */}

                          {readingMessageId ===
                          message.id ? (
                            <div className="whitespace-pre-wrap">
                              {renderReadingText(
                                message.content,
                                readingCharIndex,
                              )}
                            </div>
                          ) : (
                            <ReactMarkdown
                              remarkPlugins={[
                                remarkGfm,
                              ]}
                            >
                              {
                                message.content
                              }
                            </ReactMarkdown>
                          )}

                          {/* AÇÕES */}

                          <div className="mt-3 flex items-center gap-1">

                            {/* LIKE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleLike(
                                  message.id,
                                )
                              }
                              className={`
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                transition

                                ${
                                  likedMessages[
                                    message.id
                                  ]
                                    ? "bg-[#8B5CF6]/20 text-[#A78BFA]"
                                    : "text-white/30 hover:bg-white/[0.06] hover:text-white/70"
                                }
                              `}
                              aria-label="Gostei"
                            >
                              <ThumbsUp
                                size={16}
                                fill={
                                  likedMessages[
                                    message.id
                                  ]
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>

                            {/* DISLIKE */}

                            <button
                              type="button"
                              onClick={() =>
                                handleDislike(
                                  message.id,
                                )
                              }
                              className={`
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                transition

                                ${
                                  dislikedMessages[
                                    message.id
                                  ]
                                    ? "bg-white/[0.08] text-white"
                                    : "text-white/30 hover:bg-white/[0.06] hover:text-white/70"
                                }
                              `}
                              aria-label="Não gostei"
                            >
                              <ThumbsDown
                                size={16}
                                fill={
                                  dislikedMessages[
                                    message.id
                                  ]
                                    ? "currentColor"
                                    : "none"
                                }
                              />
                            </button>

                            {/* COPIAR */}

                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(
                                  message,
                                )
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/[0.06] hover:text-white/70"
                              aria-label="Copiar mensagem"
                            >
                              {copiedMessageId ===
                              message.id ? (
                                <Check
                                  size={16}
                                />
                              ) : (
                                <Copy
                                  size={16}
                                />
                              )}
                            </button>

                            {/* OUVIR */}

                            <button
                              type="button"
                              onClick={() =>
                                readMessage(
                                  message,
                                )
                              }
                              className={`
                                flex
                                h-8
                                w-8
                                items-center
                                justify-center
                                rounded-lg
                                transition

                                ${
                                  readingMessageId ===
                                  message.id
                                    ? "bg-[#8B5CF6]/20 text-[#A78BFA]"
                                    : "text-white/30 hover:bg-white/[0.06] hover:text-white/70"
                                }
                              `}
                              aria-label={
                                readingMessageId ===
                                message.id
                                  ? "Parar leitura"
                                  : "Ouvir mensagem"
                              }
                            >
                              {readingMessageId ===
                              message.id ? (
                                <VolumeX
                                  size={17}
                                />
                              ) : (
                                <Volume2
                                  size={17}
                                />
                              )}
                            </button>

                            {copiedMessageId ===
                              message.id && (
                              <span className="ml-1 text-[11px] text-white/35">
                                Copiado
                              </span>
                            )}

                          </div>

                        </>
                      ) : (
                        message.content
                      )}

                    </div>

                  </div>
                ),
              )}

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

      {/* =====================================================
          COMPOSER
          ===================================================== */}

      <div
        className="fixed left-0 right-0 z-50 px-3 sm:px-4"
        style={{
          bottom: 0,
          transform:
            `translate3d(0, -${keyboardOffset}px, 0)`,
          transition:
            "transform 90ms linear",
        }}
      >

        <div className="mx-auto w-full max-w-3xl pb-3 sm:pb-5">

          <div className="rounded-[26px] bg-[#17111e]/95 px-3 py-2 shadow-2xl backdrop-blur-xl">

            <div className="flex items-end gap-2">

              {/* TEXTAREA */}

              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleTextareaKeyDown
                }
                onFocus={
                  handleTextareaFocus
                }
                placeholder="Escreva sua decisão..."
                rows={1}
                disabled={isLoading}
                spellCheck
                autoComplete="off"
                className="
                  min-h-[58px]
                  flex-1
                  resize-none
                  overflow-y-auto
                  bg-transparent
                  px-1
                  py-3
                  text-[15px]
                  leading-6
                  text-white
                  placeholder:text-white/35

                  !border-0
                  !border-none
                  !outline-0
                  !outline-none
                  !ring-0
                  !shadow-none

                  focus:!border-0
                  focus:!border-none
                  focus:!outline-0
                  focus:!outline-none
                  focus:!ring-0
                  focus:!shadow-none

                  active:!border-0
                  active:!outline-none
                  active:!ring-0

                  disabled:opacity-50
                "
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              />

              {/* MICROFONE */}

              <button
                type="button"
                onClick={
                  startListening
                }
                disabled={isLoading}
                className={`
                  mb-1
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  transition-all

                  ${
                    isListening
                      ? "bg-white text-[#17111e] shadow-lg"
                      : "text-white/45 hover:bg-white/[0.06] hover:text-white"
                  }

                  disabled:cursor-not-allowed
                  disabled:opacity-30
                `}
                aria-label={
                  isListening
                    ? "Parar microfone"
                    : "Usar microfone"
                }
              >

                {isListening ? (
                  <MicOff
                    size={19}
                    strokeWidth={2.2}
                  />
                ) : (
                  <Mic
                    size={19}
                    strokeWidth={2.2}
                  />
                )}

              </button>

              {/* ENVIAR */}

              <button
                type="button"
                onClick={
                  sendMessage
                }
                disabled={
                  !input.trim() ||
                  isLoading
                }
                className="
                  mb-1
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-full

                  bg-[#8B5CF6]
                  text-white

                  shadow-[0_4px_18px_rgba(139,92,246,0.25)]

                  transition-all
                  duration-200

                  hover:bg-[#9B6CFF]
                  hover:shadow-[0_5px_22px_rgba(139,92,246,0.35)]

                  active:scale-95

                  disabled:cursor-not-allowed
                  disabled:bg-[#8B5CF6]/25
                  disabled:text-white/30
                  disabled:shadow-none
                "
                aria-label="Enviar"
              >

                <ArrowUp
                  size={20}
                  strokeWidth={2.5}
                />

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