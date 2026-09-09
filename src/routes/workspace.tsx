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

type RecognitionResultEvent = Event & {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      isFinal: boolean;
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type Recognition = {
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
    | ((event: RecognitionResultEvent) => void)
    | null;
};

const SIDEBAR_WIDTH = 300;

const LANGUAGES = [
  {
    value: "pt-BR",
    label: "Português (Brasil)",
  },
  {
    value: "en-US",
    label: "English (US)",
  },
  {
    value: "es-ES",
    label: "Español",
  },
  {
    value: "fr-FR",
    label: "Français",
  },
  {
    value: "de-DE",
    label: "Deutsch",
  },
  {
    value: "it-IT",
    label: "Italiano",
  },
  {
    value: "ja-JP",
    label: "日本語",
  },
  {
    value: "ko-KR",
    label: "한국어",
  },
  {
    value: "zh-CN",
    label: "中文",
  },
  {
    value: "ru-RU",
    label: "Русский",
  },
];

function Workspace() {
  const [userId, setUserId] = useState<string | null>(
    null,
  );

  const [messages, setMessages] = useState<Message[]>(
    [],
  );

  const [input, setInput] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [error, setError] = useState("");

  const [conversations, setConversations] =
    useState<Conversation[]>([]);

  const [search, setSearch] = useState("");

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [sidebarProgress, setSidebarProgress] =
    useState(0);

  const [settingsOpen, setSettingsOpen] =
    useState(false);

  const [listening, setListening] =
    useState(false);

  const [likes, setLikes] =
    useState<Record<string, boolean>>({});

  const [dislikes, setDislikes] =
    useState<Record<string, boolean>>({});

  const [copiedId, setCopiedId] =
    useState<string | null>(null);

  const [readingMessageId, setReadingMessageId] =
    useState<string | null>(null);

  const [readingCharIndex, setReadingCharIndex] =
    useState(-1);

  const [speechLanguage, setSpeechLanguage] =
    useState("pt-BR");

  const [speechGender, setSpeechGender] =
    useState<VoiceGender>("male");

  const [voices, setVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const [keyboardOffset, setKeyboardOffset] =
    useState(0);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const chatRef =
    useRef<HTMLDivElement | null>(null);

  /*
   * CORREÇÃO DO ERRO:
   * essas duas refs existem antes de serem usadas.
   */
  const sidebarDragRef = useRef({
    active: false,
    startX: 0,
  });

  const edgeDragRef = useRef({
    active: false,
    startX: 0,
  });

  const recognitionRef =
    useRef<Recognition | null>(null);

  const lastTranscriptRef =
    useRef("");

  const speechSessionRef =
    useRef(0);

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
    } =
      supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (mounted) {
            setUserId(
              session?.user?.id ?? null,
            );
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

    const viewport =
      window.visualViewport;

    const updateKeyboard = () => {
      const height = Math.max(
        0,
        Math.round(
          window.innerHeight -
            viewport.height -
            viewport.offsetTop,
        ),
      );

      setKeyboardOffset(height);
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

  const loadConversations =
    useCallback(async () => {
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

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    setSidebarProgress(1);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSidebarProgress(0);
  }, []);

  const startSidebarDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    sidebarDragRef.current = {
      active: true,
      startX: event.clientX,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  };

  const moveSidebarDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      !sidebarDragRef.current.active
    ) {
      return;
    }

    const delta =
      event.clientX -
      sidebarDragRef.current.startX;

    const progress = Math.max(
      0,
      Math.min(
        1,
        1 + delta / SIDEBAR_WIDTH,
      ),
    );

    setSidebarProgress(progress);
  };

  const endSidebarDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      !sidebarDragRef.current.active
    ) {
      return;
    }

    sidebarDragRef.current.active =
      false;

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // ignore
    }

    setSidebarProgress(
      (current) => {
        if (current >= 0.5) {
          setSidebarOpen(true);
          return 1;
        }

        setSidebarOpen(false);
        return 0;
      },
    );
  };

  /*
   * Área invisível na esquerda para abrir
   * o menu por swipe.
   */

  const startEdgeDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType === "mouse" &&
      event.button !== 0
    ) {
      return;
    }

    edgeDragRef.current = {
      active: true,
      startX: event.clientX,
    };

    event.currentTarget.setPointerCapture(
      event.pointerId,
    );
  };

  const moveEdgeDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!edgeDragRef.current.active) {
      return;
    }

    const delta =
      event.clientX -
      edgeDragRef.current.startX;

    if (delta <= 0) {
      return;
    }

    setSidebarProgress(
      Math.min(
        1,
        delta / SIDEBAR_WIDTH,
      ),
    );
  };

  const endEdgeDrag = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!edgeDragRef.current.active) {
      return;
    }

    edgeDragRef.current.active =
      false;

    try {
      event.currentTarget.releasePointerCapture(
        event.pointerId,
      );
    } catch {
      // ignore
    }

    setSidebarProgress(
      (current) => {
        if (current >= 0.25) {
          setSidebarOpen(true);
          return 1;
        }

        return 0;
      },
    );
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

    speechSessionRef.current += 1;

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    setReadingMessageId(null);
    setReadingCharIndex(-1);

    closeSidebar();
  };

  /*
   * ============================================================
   * VOZES
   * ============================================================
   */

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window)
    ) {
      return;
    }

    const updateVoices = () => {
      setVoices(
        window.speechSynthesis
          .getVoices()
          .filter(Boolean),
      );
    };

    updateVoices();

    window.speechSynthesis.addEventListener(
      "voiceschanged",
      updateVoices,
    );

    return () => {
      window.speechSynthesis.removeEventListener(
        "voiceschanged",
        updateVoices,
      );

      window.speechSynthesis.cancel();
    };
  }, []);

  const findVoice = useCallback(
    (
      language: string,
      gender: VoiceGender,
    ) => {
      const languagePrefix =
        language
          .toLowerCase()
          .split("-")[0];

      const matching = voices.filter(
        (voice) =>
          voice.lang
            .toLowerCase()
            .startsWith(
              languagePrefix,
            ),
      );

      if (!matching.length) {
        return null;
      }

      const maleKeywords = [
        "male",
        "man",
        "homem",
        "mascul",
      ];

      const femaleKeywords = [
        "female",
        "woman",
        "mulher",
        "fem",
      ];

      const keywords =
        gender === "male"
          ? maleKeywords
          : femaleKeywords;

      const genderMatch =
        matching.find((voice) => {
          const name =
            voice.name.toLowerCase();

          return keywords.some(
            (keyword) =>
              name.includes(keyword),
          );
        });

      return (
        genderMatch ??
        matching.find(
          (voice) => voice.default,
        ) ??
        matching[0]
      );
    },
    [voices],
  );

  /*
   * ============================================================
   * LEITOR
   * ============================================================
   */

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

      if (
        readingMessageId ===
        message.id
      ) {
        stopReading();
        return;
      }

      window.speechSynthesis.cancel();

      const session =
        speechSessionRef.current + 1;

      speechSessionRef.current =
        session;

      setReadingMessageId(
        message.id,
      );

      setReadingCharIndex(-1);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      utterance.lang =
        speechLanguage;

      utterance.rate = 1.15;
      utterance.pitch = 1;
      utterance.volume = 1;

      const voice = findVoice(
        speechLanguage,
        speechGender,
      );

      if (voice) {
        utterance.voice = voice;
      }

      utterance.onboundary = (
        event,
      ) => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        setReadingCharIndex(
          event.charIndex,
        );
      };

      utterance.onend = () => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      utterance.onerror = () => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      setTimeout(() => {
        if (
          speechSessionRef.current !==
          session
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
      findVoice,
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
        SpeechRecognition?: new () => Recognition;
        webkitSpeechRecognition?: new () => Recognition;
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

    const recognition =
      new Recognition();

    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.lang = speechLanguage;

    recognition.onstart = () => {
      setListening(true);
      setError("");
      lastTranscriptRef.current =
        "";
    };

    recognition.onresult = (
      event,
    ) => {
      const result =
        event.results[
          event.resultIndex
        ];

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

        const maxOverlap =
          Math.min(
            existingWords.length,
            newWords.length,
            8,
          );

        for (
          let size = maxOverlap;
          size >= 1;
          size--
        ) {
          const end =
            existingWords
              .slice(-size)
              .join(" ")
              .toLowerCase();

          const start =
            newWords
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
      recognitionRef.current =
        null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current =
        null;
    };

    recognitionRef.current =
      recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current =
        null;
    }
  };

  /*
   * ============================================================
   * ENVIAR
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

    const history = [
      ...messages,
      userMessage,
    ];

    setMessages(history);

    try {
      /*
       * A Edge Function precisa validar o JWT,
       * créditos e plano no servidor.
       */
      const {
        data,
        error: invokeError,
      } = await supabase.functions.invoke(
        "decidly-ai",
        {
          body: {
            message: text,
            history: history.map(
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

        if (
          status === 401 ||
          status === 403
        ) {
          throw new Error(
            "AUTH",
          );
        }

        if (status === 402) {
          throw new Error(
            "CREDITS",
          );
        }

        if (status === 429) {
          throw new Error(
            "RATE",
          );
        }

        throw new Error("AI");
      }

      const answer =
        typeof data?.answer ===
        "string"
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

      const assistantMessage: Message =
        {
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
      } else if (
        code === "CREDITS"
      ) {
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

      setMessages((current) =>
        current.filter(
          (message) =>
            message.id !==
            userMessage.id,
        ),
      );
    } finally {
      /*
       * NÃO dar focus aqui.
       * Isso evita que o teclado mobile
       * abra novamente após a resposta.
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

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        140,
      )}px`;
  }, [input]);

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
   * ============================================================
   * COPIAR / LIKE / DISLIKE
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

      setTimeout(() => {
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
      [messageId]:
        !current[messageId],
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
      [messageId]:
        !current[messageId],
    }));

    setLikes((current) => ({
      ...current,
      [messageId]: false,
    }));
  };

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
          MENU FIXO
          ====================================================== */}

      <button
        type="button"
        onClick={() =>
          sidebarOpen
            ? closeSidebar()
            : openSidebar()
        }
        aria-label="Menu"
        className="fixed left-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white"
        style={{
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
      >
        {sidebarOpen ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}
      </button>

      {/* ======================================================
          CONFIG FIXA
          ====================================================== */}

      <button
        type="button"
        onClick={() =>
          setSettingsOpen(
            (current) => !current,
          )
        }
        aria-label="Configurações"
        className="fixed right-4 top-4 z-[90] flex h-10 w-10 items-center justify-center rounded-xl text-white/75 transition hover:bg-white/10 hover:text-white"
        style={{
          border: "none",
          outline: "none",
          boxShadow: "none",
        }}
      >
        <Settings size={20} />
      </button>

      {/* ======================================================
          CONFIGURAÇÕES
          ====================================================== */}

      {settingsOpen && (
        <div
          className="fixed right-4 top-[60px] z-[85] w-[260px] rounded-2xl p-4 shadow-2xl"
          style={{
            background: "#18101f",
          }}
        >
          <div className="mb-4">
            <div className="text-sm font-semibold">
              Configurações de voz
            </div>

            <div className="mt-1 text-xs text-white/40">
              Idioma e voz da leitura.
            </div>
          </div>

          <label className="mb-2 block text-xs text-white/55">
            Idioma
          </label>

          <select
            value={speechLanguage}
            onChange={(event) =>
              setSpeechLanguage(
                event.target.value,
              )
            }
            className="mb-4 w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:outline-none focus:ring-0"
            style={{
              border: "none",
            }}
          >
            {LANGUAGES.map(
              (language) => (
                <option
                  key={
                    language.value
                  }
                  value={
                    language.value
                  }
                  className="bg-[#18101f]"
                >
                  {language.label}
                </option>
              ),
            )}
          </select>

          <label className="mb-2 block text-xs text-white/55">
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
            className="w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm text-white outline-none focus:outline-none focus:ring-0"
            style={{
              border: "none",
            }}
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
          SWIPE PARA ABRIR
          ====================================================== */}

      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 z-[75] h-full w-6 touch-none"
          onPointerDown={
            startEdgeDrag
          }
          onPointerMove={
            moveEdgeDrag
          }
          onPointerUp={
            endEdgeDrag
          }
          onPointerCancel={
            endEdgeDrag
          }
        />
      )}

      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <aside
        className="fixed bottom-0 left-0 top-0 z-[70] w-[300px] border-r border-white/[0.06]"
        style={{
          background: "#120c18",
          transform: `translateX(${
            -SIDEBAR_WIDTH *
            (1 - sidebarProgress)
          }px)`,
          transition:
            sidebarDragRef.current
              .active
              ? "none"
              : "transform 220ms ease",
        }}
      >
        {/* Handle independente para arrastar */}
        <div
          className="absolute right-0 top-0 z-10 h-full w-6 touch-none"
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
              onClick={
                closeSidebar
              }
              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/45 hover:bg-white/5 hover:text-white"
              style={{
                border: "none",
                outline: "none",
              }}
            >
              <X size={17} />
            </button>
          </div>

          <button
            type="button"
            onClick={
              newConversation
            }
            className="mb-4 flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm font-medium hover:bg-white/[0.06]"
            style={{
              border: "none",
              outline: "none",
            }}
          >
            <Plus size={17} />
            Nova decisão
          </button>

          <div className="relative mb-4">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30"
            />

            <input
              value={search}
              onChange={(event) =>
                setSearch(
                  event.target.value,
                )
              }
              placeholder="Pesquisar"
              className="h-10 w-full rounded-xl bg-white/[0.045] pl-9 pr-3 text-sm text-white placeholder:text-white/30 outline-none focus:outline-none focus:ring-0"
              style={{
                border: "none",
              }}
            />
          </div>

          <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-white/25">
            Conversas
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {filteredConversations.length ===
            0 ? (
              <div className="px-1 py-5 text-sm text-white/30">
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
                      className="w-full truncate rounded-xl px-3 py-2.5 text-left text-sm text-white/60 hover:bg-white/[0.05] hover:text-white"
                      style={{
                        border:
                          "none",
                        outline:
                          "none",
                      }}
                      onClick={() =>
                        closeSidebar()
                      }
                    >
                      {
                        conversation.title
                      }
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

      <main className="absolute inset-0">
        <div
          ref={chatRef}
          className="h-full overflow-y-auto"
        >
          <div className="mx-auto w-full max-w-3xl px-4 pb-40 pt-20">
            {/* ==================================================
                PRIMEIRA TELA
                ================================================== */}

            {messages.length === 0 && (
              <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10">
                  <Sparkles
                    size={24}
                    className="text-violet-400"
                  />
                </div>

                <h1 className="text-2xl font-semibold">
                  O que você está decidindo?
                </h1>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/45">
                  Explique a situação, as opções que você tem e o que está te deixando em dúvida.
                </p>

                <p className="mt-5 text-xs text-white/25">
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
                    const reading =
                      readingMessageId ===
                      message.id;

                    if (
                      message.role ===
                      "user"
                    ) {
                      return (
                        <div
                          key={
                            message.id
                          }
                          className="flex justify-end"
                        >
                          <div className="max-w-[85%] rounded-2xl bg-violet-500/15 px-4 py-3 text-[15px] leading-6">
                            {
                              message.content
                            }
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={
                          message.id
                        }
                        className="flex justify-start"
                      >
                        <div className="w-full max-w-[90%]">
                          <div className="text-[15px] leading-7 text-white/90">
                            {reading ? (
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
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                likes[
                                  message.id
                                ]
                                  ? "text-violet-300"
                                  : "text-white/30 hover:text-white/70"
                              }`}
                              style={{
                                border:
                                  "none",
                                outline:
                                  "none",
                              }}
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
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                dislikes[
                                  message.id
                                ]
                                  ? "text-violet-300"
                                  : "text-white/30 hover:text-white/70"
                              }`}
                              style={{
                                border:
                                  "none",
                                outline:
                                  "none",
                              }}
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
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-white/30 hover:text-white/70"
                              style={{
                                border:
                                  "none",
                                outline:
                                  "none",
                              }}
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
                                reading
                                  ? stopReading()
                                  : readMessage(
                                      message,
                                    )
                              }
                              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                                reading
                                  ? "text-violet-300"
                                  : "text-white/30 hover:text-white/70"
                              }`}
                              style={{
                                border:
                                  "none",
                                outline:
                                  "none",
                              }}
                            >
                              {reading ? (
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
                        </div>
                      </div>
                    );
                  },
                )}

                {isLoading && (
                  <div className="text-sm text-white/45">
                    DecidlyAI está pensando...
                  </div>
                )}

                {error && (
                  <div className="text-sm text-red-300/80">
                    {error}
                  </div>
                )}

                <div className="pt-2 text-xs text-white/25">
                  A DecidlyAI pode cometer erros. Verifique informações importantes.
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ======================================================
          COMPOSER
          ====================================================== */}

      <div
        className="pointer-events-none fixed left-0 right-0 z-[50] px-4"
        style={{
          bottom:
            keyboardOffset > 0
              ? keyboardOffset + 10
              : 16,
          transition:
            "bottom 100ms ease-out",
        }}
      >
        <div className="pointer-events-auto mx-auto w-full max-w-3xl">
          <div
            className="flex min-h-[58px] items-end gap-1 rounded-2xl px-4 py-2"
            style={{
              background: "#17101f",

              /*
               * ZERO bordas.
               */
              border: "none",
              outline: "none",
              boxShadow: "none",
            }}
          >
            {/* TEXTO */}
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
              rows={1}
              disabled={isLoading}
              placeholder="Escreva sua decisão..."
              className="min-h-[42px] max-h-[140px] min-w-0 flex-1 resize-none bg-transparent px-0 py-2.5 text-[15px] leading-6 text-white placeholder:text-white/35"
              style={{
                border: "none",
                outline: "none",
                boxShadow: "none",
                appearance: "none",
                WebkitAppearance:
                  "none",
              }}
            />

            {/* 🎙 MICROFONE — DEPOIS DO TEXTO */}
            <button
              type="button"
              onClick={
                toggleMicrophone
              }
              disabled={isLoading}
              aria-label={
                listening
                  ? "Parar microfone"
                  : "Microfone"
              }
              className={`mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                listening
                  ? "text-violet-300"
                  : "text-white/45 hover:text-white"
              }`}
              style={{
                border: "none",
                outline: "none",
                boxShadow: "none",
                background:
                  "transparent",
              }}
            >
              {listening ? (
                <MicOff size={19} />
              ) : (
                <Mic size={19} />
              )}
            </button>

            {/* ↑ ENVIO ROXO */}
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
              className="mb-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition disabled:opacity-25"
              style={{
                background:
                  "#8B5CF6",
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
    </div>
  );
}

/*
 * ==============================================================
 * DESTAQUE DA PALAVRA DURANTE A LEITURA
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