import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowUp,
  Check,
  Copy,
  Menu,
  Mic,
  MicOff,
  Plus,
  Search,
  Settings,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type Message = {
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

type VoiceGender = "male" | "female";

type SpeechRecognitionResultEventLike = Event & {
  resultIndex: number;
  results: {
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
    length: number;
  };
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: Event) => void) | null;
  onresult:
    | ((event: SpeechRecognitionResultEventLike) => void)
    | null;
};

const LANGUAGES = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
  { value: "it-IT", label: "Italiano" },
  { value: "ja-JP", label: "日本語" },
  { value: "ko-KR", label: "한국어" },
  { value: "zh-CN", label: "中文" },
  { value: "ru-RU", label: "Русский" },
];

const SIDEBAR_WIDTH = 300;

function Workspace() {
  const [userId, setUserId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [conversations, setConversations] = useState<
    Conversation[]
  >([]);
  const [search, setSearch] = useState("");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProgress, setSidebarProgress] = useState(0);

  const [settingsOpen, setSettingsOpen] = useState(false);

  const [listening, setListening] = useState(false);

  const [likes, setLikes] = useState<
    Record<string, boolean>
  >({});
  const [dislikes, setDislikes] = useState<
    Record<string, boolean>
  >({});
  const [copiedId, setCopiedId] = useState<string | null>(
    null,
  );

  const [speechLanguage, setSpeechLanguage] =
    useState("pt-BR");

  const [speechGender, setSpeechGender] =
    useState<VoiceGender>("male");

  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const [readingMessageId, setReadingMessageId] =
    useState<string | null>(null);

  const [readingCharIndex, setReadingCharIndex] =
    useState(-1);

  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(
    null,
  );

  const chatRef = useRef<HTMLDivElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognitionLike | null>(null);

  const lastTranscriptRef = useRef("");

  const speechSessionRef = useRef(0);

  /*
   * ============================================================
   * AUTH
   * ============================================================
   */

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setUserId(user?.id ?? null);
      }
    };

    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setUserId(session?.user?.id ?? null);
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ============================================================
   * TECLADO MOBILE
   * ============================================================
   */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !window.visualViewport
    ) {
      return;
    }

    const viewport = window.visualViewport;

    const updateKeyboard = () => {
      const offset = Math.max(
        0,
        Math.round(
          window.innerHeight -
            viewport.height -
            viewport.offsetTop,
        ),
      );

      setKeyboardOffset(offset);
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
   * ============================================================
   * CONVERSAS
   * ============================================================
   */

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    const { data } = await supabase
      .from("conversations")
      .select(
        "id,title,created_at,updated_at",
      )
      .eq("user_id", userId)
      .order("updated_at", {
        ascending: false,
      })
      .limit(50);

    setConversations(data ?? []);
  }, [userId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const openSidebar = () => {
    setSidebarOpen(true);
    setSidebarProgress(1);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
    setSidebarProgress(0);
  };

  const handleSidebarPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    const element = event.currentTarget;

    element.setPointerCapture(event.pointerId);

    (
      element as HTMLDivElement & {
        dataset: {
          startX?: string;
        };
      }
    ).dataset.startX = String(event.clientX);
  };

  const handleSidebarPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const element = event.currentTarget;

    const startX = Number(
      (
        element as HTMLDivElement & {
          dataset: {
            startX?: string;
          };
        }
      ).dataset.startX,
    );

    if (!Number.isFinite(startX)) {
      return;
    }

    const delta = event.clientX - startX;

    const progress = Math.max(
      0,
      Math.min(
        1,
        1 + delta / SIDEBAR_WIDTH,
      ),
    );

    setSidebarProgress(progress);
  };

  const handleSidebarPointerUp = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const element = event.currentTarget;

    try {
      element.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // ignore
    }

    const shouldStayOpen =
      sidebarProgress >= 0.5;

    if (shouldStayOpen) {
      setSidebarOpen(true);
      setSidebarProgress(1);
    } else {
      closeSidebar();
    }

    delete (
      element as HTMLDivElement & {
        dataset: {
          startX?: string;
        };
      }
    ).dataset.startX;
  };

  /*
   * ============================================================
   * NOVA CONVERSA
   * ============================================================
   */

  const newConversation = () => {
    setMessages([]);
    setInput("");
    setError("");
    setLikes({});
    setDislikes({});
    setCopiedId(null);
    setReadingMessageId(null);
    setReadingCharIndex(-1);
    closeSidebar();
  };

  /*
   * ============================================================
   * SPEECH SYNTHESIS
   * ============================================================
   */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const loadVoices = () => {
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter(Boolean),
      );
    };

    loadVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      loadVoices,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        loadVoices,
      );

      window.speechSynthesis.cancel();
    };
  }, []);

  const findBestVoice = useCallback(
    (
      language: string,
      gender: VoiceGender,
    ) => {
      const sameLanguage = voices.filter(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(
              language
                .toLowerCase()
                .split("-")[0],
            ),
      );

      if (!sameLanguage.length) {
        return null;
      }

      const maleWords = [
        "male",
        "man",
        "homem",
        "mascul",
        "male voice",
        "google português brasil",
      ];

      const femaleWords = [
        "female",
        "woman",
        "mulher",
        "fem",
        "female voice",
      ];

      const keywords =
        gender === "male"
          ? maleWords
          : femaleWords;

      const genderVoice =
        sameLanguage.find((voice) => {
          const name =
            voice.name.toLowerCase();

          return keywords.some((word) =>
            name.includes(word),
          );
        });

      return (
        genderVoice ??
        sameLanguage.find(
          (voice) => voice.default,
        ) ??
        sameLanguage[0]
      );
    },
    [voices],
  );

  const stopReading = useCallback(() => {
    speechSessionRef.current += 1;

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setReadingMessageId(null);
    setReadingCharIndex(-1);
  }, []);

  const readMessage = useCallback(
    (message: Message) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setError(
          "A leitura de voz não está disponível neste navegador.",
        );
        return;
      }

      if (readingMessageId === message.id) {
        stopReading();
        return;
      }

      window.speechSynthesis.cancel();

      const session =
        speechSessionRef.current + 1;

      speechSessionRef.current = session;

      setReadingMessageId(message.id);
      setReadingCharIndex(-1);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      utterance.lang = speechLanguage;
      utterance.rate = 1.15;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = findBestVoice(
        speechLanguage,
        speechGender,
      );

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onboundary = (event) => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        setReadingCharIndex(
          event.charIndex,
        );
      };

      utterance.onend = () => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      utterance.onerror = () => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      speechRef.current = utterance;

      /*
       * Pequeno atraso para navegadores mobile
       * que precisam que o speechSynthesis seja
       * chamado depois do cancel().
       */
      window.setTimeout(() => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        window.speechSynthesis.speak(
          utterance,
        );
      }, 50);
    },
    [
      readingMessageId,
      stopReading,
      speechLanguage,
      speechGender,
      findBestVoice,
    ],
  );

  /*
   * ============================================================
   * MICROFONE
   * ============================================================
   */

  const toggleMicrophone = () => {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    if (
      typeof window === "undefined"
    ) {
      return;
    }

    const speechWindow =
      window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      };

    const Recognition =
      speechWindow.SpeechRecognition ??
      speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setError(
        "O reconhecimento de voz não está disponível neste navegador.",
      );
      return;
    }

    const recognition = new Recognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = speechLanguage;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      lastTranscriptRef.current = "";
    };

    recognition.onresult = (
      event,
    ) => {
      /*
       * Usa somente resultIndex.
       * Isso evita o problema de o navegador
       * repetir "hi hi hi hi".
       */
      const result =
        event.results[event.resultIndex];

      if (!result?.isFinal) {
        return;
      }

      const transcript =
        result[0]?.transcript
          ?.trim() ?? "";

      if (!transcript) {
        return;
      }

      const normalized =
        transcript
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim();

      if (
        normalized ===
        lastTranscriptRef.current
      ) {
        return;
      }

      lastTranscriptRef.current =
        normalized;

      setInput((current) => {
        const existing =
          current.trim();

        if (!existing) {
          return transcript;
        }

        const existingWords =
          existing.split(/\s+/);

        const newWords =
          transcript.split(/\s+/);

        let overlap = 0;

        const maxOverlap = Math.min(
          existingWords.length,
          newWords.length,
          8,
        );

        for (
          let size = maxOverlap;
          size >= 1;
          size--
        ) {
          const end = existingWords
            .slice(-size)
            .join(" ")
            .toLowerCase();

          const start = newWords
            .slice(0, size)
            .join(" ")
            .toLowerCase();

          if (end === start) {
            overlap = size;
            break;
          }
        }

        const addition =
          newWords
            .slice(overlap)
            .join(" ");

        if (!addition) {
          return existing;
        }

        return `${existing} ${addition}`;
      });
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  };

  /*
   * ============================================================
   * ENVIAR PARA IA
   * ============================================================
   */

  const sendMessage = async () => {
    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    if (!userId) {
      setError(
        "Você precisa estar conectado para continuar.",
      );
      return;
    }

    setInput("");
    setError("");
    setIsLoading(true);

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const nextMessages = [
      ...messages,
      userMessage,
    ];

    setMessages(nextMessages);

    try {
      /*
       * O cliente não é uma barreira de segurança.
       * A Edge Function deve validar o JWT,
       * plano e créditos no servidor.
       */
      const { data, error: invokeError } =
        await supabase.functions.invoke(
          "decidly-ai",
          {
            body: {
              message: text,
              history: nextMessages.map(
                (message) => ({
                  role: message.role,
                  content:
                    message.content,
                }),
              ),
            },
          },
        );

      if (invokeError) {
        const status =
          (
            invokeError as {
              context?: Response;
            }
          ).context?.status;

        if (status === 401 || status === 403) {
          throw new Error("AUTH");
        }

        if (status === 402) {
          throw new Error("CREDITS");
        }

        if (status === 429) {
          throw new Error("RATE");
        }

        throw new Error("AI");
      }

      const answer =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.response ===
              "string"
            ? data.response
            : typeof data?.message ===
                "string"
              ? data.message
              : "";

      if (!answer) {
        throw new Error("AI");
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: answer,
      };

      setMessages((current) => [
        ...current,
        assistantMessage,
      ]);
    } catch (caughtError) {
      const code =
        caughtError instanceof Error
          ? caughtError.message
          : "AI";

      if (code === "AUTH") {
        setError(
          "Sua sessão não pôde ser validada.",
        );
      } else if (code === "CREDITS") {
        setError(
          "Você não possui créditos disponíveis para continuar.",
        );
      } else if (code === "RATE") {
        setError(
          "Muitas solicitações no momento. Tente novamente em instantes.",
        );
      } else {
        setError(
          "Não foi possível obter uma resposta agora. Tente novamente.",
        );
      }

      /*
       * Remove a mensagem do usuário se a chamada falhou,
       * para não deixar uma mensagem sem resposta.
       */
      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !== userMessage.id,
        ),
      );
    } finally {
      /*
       * IMPORTANTE:
       * não chamar textarea.focus() aqui.
       *
       * Assim o teclado mobile não abre sozinho
       * depois da resposta da IA.
       */
      setIsLoading(false);
    }
  };

  /*
   * ============================================================
   * TEXTAREA
   * ============================================================
   */

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      textarea.scrollHeight,
      140,
    )}px`;
  }, [input]);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey)
    ) {
      event.preventDefault();
      void sendMessage();
    }
  };

  /*
   * ============================================================
   * AÇÕES DAS MENSAGENS
   * ============================================================
   */

  const copyMessage = async (
    message: Message,
  ) => {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopiedId(message.id);

      window.setTimeout(() => {
        setCopiedId((current) =>
          current === message.id
            ? null
            : current,
        );
      }, 1500);
    } catch {
      // ignore
    }
  };

  const toggleLike = (
    messageId: string,
  ) => {
    setLikes((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));

    setDislikes((current) => ({
      ...current,
      [messageId]: false,
    }));
  };

  const toggleDislike = (
    messageId: string,
  ) => {
    setDislikes((current) => ({
      ...current,
      [messageId]: !current[messageId],
    }));

    setLikes((current) => ({
      ...current,
      [messageId]: false,
    }));
  };

  /*
   * ============================================================
   * FILTRO SIDEBAR
   * ============================================================
   */

  const filteredConversations =
    conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(
          search.toLowerCase(),
        ),
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      className="fixed inset-0 overflow-hidden text-white"
      style={{
        background: "#0d0912",
      }}
    >
      {/* ======================================================
          BOTÃO MENU FIXO
          ====================================================== */}

      <button
        type="button"
        onClick={() => {
          if (sidebarOpen) {
            closeSidebar();
          } else {
            openSidebar();
          }
        }}
        aria-label="Abrir menu"
        className="fixed left-4 top-4 z-[80] flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        {sidebarOpen ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}
      </button>

      {/* ======================================================
          CONFIGURAÇÕES FIXAS
          ====================================================== */}

      <button
        type="button"
        onClick={() =>
          setSettingsOpen(
            (current) => !current,
          )
        }
        aria-label="Configurações de voz"
        className="fixed right-4 top-4 z-[80] flex h-10 w-10 items-center justify-center rounded-xl text-white/80 transition hover:bg-white/10 hover:text-white"
      >
        <Settings size={20} />
      </button>

      {/* ======================================================
          PAINEL DE CONFIGURAÇÕES
          ====================================================== */}

      {settingsOpen && (
        <div
          className="fixed right-4 top-[60px] z-[75] w-[260px] rounded-2xl p-4 shadow-2xl"
          style={{
            background: "#18101f",
          }}
        >
          <div className="mb-4">
            <div className="mb-1 text-sm font-semibold">
              Configurações de voz
            </div>

            <div className="text-xs text-white/45">
              Escolha o idioma e a voz da leitura.
            </div>
          </div>

          <label className="mb-2 block text-xs text-white/60">
            Idioma
          </label>

          <select
            value={speechLanguage}
            onChange={(event) =>
              setSpeechLanguage(
                event.target.value,
              )
            }
            className="mb-4 w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:outline-none"
          >
            {LANGUAGES.map(
              (language) => (
                <option
                  key={language.value}
                  value={language.value}
                  className="bg-[#18101f]"
                >
                  {language.label}
                </option>
              ),
            )}
          </select>

          <label className="mb-2 block text-xs text-white/60">
            Voz
          </label>

          <select
            value={speechGender}
            onChange={(event) =>
              setSpeechGender(
                event.target
                  .value as VoiceGender,
              )
            }
            className="w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:outline-none"
          >
            <option
              value="male"
              className="bg-[#18101f]"
            >
              Masculina
            </option>

            <option
              value="female"
              className="bg-[#18101f]"
            >
              Feminina
            </option>
          </select>
        </div>
      )}

      {/* ======================================================
          ÁREA INVISÍVEL PARA ABRIR SIDEBAR POR SWIPE
          ====================================================== */}

      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 z-[70] h-full w-5 touch-pan-y"
          onPointerDown={(
            event,
          ) => {
            edgeDragRef.current = {
              active: true,
              startX: event.clientX,
            };

            event.currentTarget.setPointerCapture(
              event.pointerId,
            );
          }}
          onPointerMove={(
            event,
          ) => {
            if (
              !edgeDragRef.current.active
            ) {
              return;
            }

            const delta =
              event.clientX -
              edgeDragRef.current.startX;

            if (delta > 0) {
              setSidebarProgress(
                Math.min(
                  1,
                  delta /
                    SIDEBAR_WIDTH,
                ),
              );
            }
          }}
          onPointerUp={(
            event,
          ) => {
            edgeDragRef.current.active =
              false;

            try {
              event.currentTarget.releasePointerCapture(
                event.pointerId,
              );
            } catch {
              // ignore
            }

            if (
              sidebarProgress > 0.2
            ) {
              openSidebar();
            } else {
              setSidebarProgress(0);
            }
          }}
        />
      )}

      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <aside
        className="fixed bottom-0 left-0 top-0 z-[60] w-[300px] touch-pan-y border-r border-white/[0.06]"
        style={{
          background: "#120c18",
          transform: `translateX(${
            -SIDEBAR_WIDTH *
            (1 - sidebarProgress)
          }px)`,
          transition:
            sidebarDragRef.current.active ||
            edgeDragRef.current.active
              ? "none"
              : "transform 220ms ease",
        }}
      >
        {/* HANDLE DE ARRASTAR */}
        <div
          className="absolute right-0 top-0 h-full w-6 touch-none"
          onPointerDown={
            handleSidebarPointerDown
          }
          onPointerMove={
            handleSidebarPointerMove
          }
          onPointerUp={
            handleSidebarPointerUp
          }
          onPointerCancel={
            handleSidebarPointerUp
          }
        />

        <div className="flex h-full flex-col p-4">
          <div className="mb-5 flex items-center justify-between pl-1">
            <div className="flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-lg"
                style={{
                  background:
                    "rgba(139,92,246,.16)",
                }}
              >
                <Sparkles
                  size={17}
                  className="text-violet-400"
                />
              </div>

              <span className="text-sm font-semibold">
                DecidlyAI
              </span>
            </div>

            <button
              type="button"
              onClick={closeSidebar}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
            >
              <X size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={newConversation}
            className="mb-4 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium transition hover:bg-white/[0.06]"
          >
            <Plus size={17} />
            Nova decisão
          </button>

          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Pesquisar"
              className="h-10 w-full rounded-xl bg-white/[0.045] pl-9 pr-3 text-sm text-white outline-none placeholder:text-white/30 focus:outline-none focus:ring-0"
            />
          </div>

          <div className="mb-2 px-1 text-[11px] font-medium uppercase tracking-wider text-white/30">
            Conversas
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {filteredConversations.length ===
            0 ? (
              <div className="px-1 py-5 text-sm text-white/35">
                Nenhuma conversa ainda.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map(
                  (conversation) => (
                    <button
                      key={
                        conversation.id
                      }
                      type="button"
                      className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-white/65 transition hover:bg-white/[0.05] hover:text-white"
                      onClick={() => {
                        closeSidebar();
                      }}
                    >
                      <div className="truncate">
                        {
                          conversation.title
                        }
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ======================================================
          CHAT
          ====================================================== */}

      <main
        className="absolute inset-0"
        style={{
          paddingBottom:
            keyboardOffset > 0
              ? keyboardOffset
              : 0,
        }}
      >
        <div
          ref={chatRef}
          className="h-full overflow-y-auto"
        >
          <div
            className={`mx-auto w-full max-w-3xl px-4 pb-40 pt-20 ${
              messages.length === 0
                ? "min-h-full"
                : ""
            }`}
          >
            {/* ==================================================
                WELCOME
                ================================================== */}

            {messages.length === 0 && (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Sparkles
                    size={24}
                    className="text-violet-400"
                  />
                </div>

                <h1 className="text-2xl font-semibold tracking-tight">
                  O que você está decidindo?
                </h1>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
                  Explique a situação, as opções que você tem e o que está te deixando em dúvida.
                </p>

                <p className="mt-5 text-xs text-white/30">
                  A DecidlyAI pode cometer erros. Verifique informações importantes.
                </p>
              </div>
            )}

            {/* ==================================================
                MENSAGENS
                ================================================== */}

            {messages.length > 0 && (
              <div className="space-y-7">
                {messages.map(
                  (message) => {
                    const isReading =
                      readingMessageId ===
                      message.id;

                    return (
                      <div
                        key={message.id}
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
                              ? "max-w-[85%] rounded-2xl bg-violet-500/15 px-4 py-3 text-[15px] leading-6 text-white"
                              : "w-full max-w-[90%]"
                          }
                        >
                          {message.role ===
                          "assistant" ? (
                            <>
                              <div
                                className="text-[15px] leading-7 text-white/90"
                                style={{
                                  wordBreak:
                                    "break-word",
                                }}
                              >
                                {isReading ? (
                                  <HighlightedText
                                    text={
                                      message.content
                                    }
                                    charIndex={
                                      readingCharIndex
                                    }
                                  />
                                ) : (
                                  <ReactMarkdown
                                    remarkPlugins={[
                                      remarkGfm,
                                    ]}
                                    components={{
                                      p: ({
                                        children,
                                      }) => (
                                        <p className="mb-3 last:mb-0">
                                          {
                                            children
                                          }
                                        </p>
                                      ),
                                      ul: ({
                                        children,
                                      }) => (
                                        <ul className="mb-3 list-disc space-y-1 pl-5">
                                          {
                                            children
                                          }
                                        </ul>
                                      ),
                                      ol: ({
                                        children,
                                      }) => (
                                        <ol className="mb-3 list-decimal space-y-1 pl-5">
                                          {
                                            children
                                          }
                                        </ol>
                                      ),
                                      strong: ({
                                        children,
                                      }) => (
                                        <strong className="font-semibold text-white">
                                          {
                                            children
                                          }
                                        </strong>
                                      ),
                                    }}
                                  >
                                    {
                                      message.content
                                    }
                                  </ReactMarkdown>
                                )}
                              </div>

                              <div className="mt-3 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleLike(
                                      message.id,
                                    )
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                    likes[
                                      message.id
                                    ]
                                      ? "bg-white/10 text-violet-300"
                                      : "text-white/30 hover:bg-white/5 hover:text-white/70"
                                  }`}
                                  aria-label="Gostei"
                                >
                                  <ThumbsUp
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleDislike(
                                      message.id,
                                    )
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                    dislikes[
                                      message.id
                                    ]
                                      ? "bg-white/10 text-violet-300"
                                      : "text-white/30 hover:bg-white/5 hover:text-white/70"
                                  }`}
                                  aria-label="Não gostei"
                                >
                                  <ThumbsDown
                                    size={15}
                                  />
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void copyMessage(
                                      message,
                                    )
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 transition hover:bg-white/5 hover:text-white/70"
                                  aria-label="Copiar"
                                >
                                  {copiedId ===
                                  message.id ? (
                                    <Check
                                      size={15}
                                    />
                                  ) : (
                                    <Copy
                                      size={15}
                                    />
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    readMessage(
                                      message,
                                    )
                                  }
                                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                                    isReading
                                      ? "bg-violet-500/15 text-violet-300"
                                      : "text-white/30 hover:bg-white/5 hover:text-white/70"
                                  }`}
                                  aria-label={
                                    isReading
                                      ? "Parar leitura"
                                      : "Ouvir mensagem"
                                  }
                                >
                                  {isReading ? (
                                    <VolumeX
                                      size={15}
                                    />
                                  ) : (
                                    <Volume2
                                      size={15}
                                    />
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            message.content
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="text-sm text-white/45">
                      DecidlyAI está pensando...
                    </div>
                  </div>
                )}

                {error && (
                  <div className="text-center text-sm text-red-300/80">
                    {error}
                  </div>
                )}

                <div className="pt-2 text-center text-xs text-white/25">
                  A DecidlyAI pode cometer erros. Verifique informações importantes.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ====================================================
            COMPOSER
            ==================================================== */}

        <div
          className="pointer-events-none fixed left-0 right-0 z-40 px-4"
          style={{
            bottom:
              keyboardOffset > 0
                ? keyboardOffset + 12
                : 18,
            transition:
              "bottom 100ms ease-out",
          }}
        >
          <div className="pointer-events-auto mx-auto w-full max-w-3xl">
            {/*
             * =================================================
             * IMPORTANTE:
             * NÃO existe border
             * NÃO existe outline
             * NÃO existe ring
             * NÃO existe shadow
             *
             * Visual:
             *
             * | Escreva sua decisão... | 🎙 ↑
             * =================================================
             */}

            <div
              className="flex min-h-[58px] items-end gap-2 rounded-2xl px-4 py-2"
              style={{
                background: "#17101f",
                border: "none",
                outline: "none",
                boxShadow: "none",
              }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) =>
                  setInput(
                    event.target.value,
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                onFocus={() => {
                  requestAnimationFrame(
                    () => {
                      if (
                        chatRef.current
                      ) {
                        chatRef.current.scrollTop =
                          chatRef.current.scrollHeight;
                      }
                    },
                  );
                }}
                rows={1}
                placeholder="Escreva sua decisão..."
                disabled={isLoading}
                className="min-h-[42px] max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-0 py-2.5 text-[15px] leading-6 text-white placeholder:text-white/35"
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                  WebkitAppearance:
                    "none",
                }}
              />

              {/* 🎙 MICROFONE À DIREITA */}
              <button
                type="button"
                onClick={
                  toggleMicrophone
                }
                disabled={isLoading}
                aria-label={
                  listening
                    ? "Parar microfone"
                    : "Usar microfone"
                }
                className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
                  listening
                    ? "bg-violet-500/15 text-violet-300"
                    : "text-white/45 hover:bg-white/5 hover:text-white"
                }`}
                style={{
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              >
                {listening ? (
                  <MicOff size={19} />
                ) : (
                  <Mic size={19} />
                )}
              </button>

              {/* ↑ BOTÃO ROXO */}
              <button
                type="button"
                onClick={() =>
                  void sendMessage()
                }
                disabled={
                  !input.trim() ||
                  isLoading
                }
                aria-label="Enviar"
                className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition disabled:cursor-not-allowed disabled:opacity-25"
                style={{
                  background: "#8B5CF6",
                  border: "none",
                  outline: "none",
                  boxShadow: "none",
                }}
              >
                <ArrowUp size={19} />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/*
 * ==============================================================
 * TEXTO COM PALAVRA DESTACADA DURANTE A LEITURA
 * ==============================================================
 */

function HighlightedText({
  text,
  charIndex,
}: {
  text: string;
  charIndex: number;
}) {
  if (charIndex < 0) {
    return <>{text}</>;
  }

  const before = text.slice(
    0,
    charIndex,
  );

  const remaining = text.slice(
    charIndex,
  );

  const match =
    remaining.match(/^\S+/);

  if (!match) {
    return <>{text}</>;
  }

  const word = match[0];

  const after = remaining.slice(
    word.length,
  );

  return (
    <>
      {before}

      <span className="rounded bg-violet-500/25 text-violet-200">
        {word}
      </span>

      {after}
    </>
  );
}