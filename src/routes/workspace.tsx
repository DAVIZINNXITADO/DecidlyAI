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
  Settings,
  User,
  MoreHorizontal,
  Pencil,
  Trash2,
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
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

type VoiceGender = "male" | "female";

const SIDEBAR_MAX_WIDTH = 320;

const SPEECH_LANGUAGES = [
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

function Workspace() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarProgress, setSidebarProgress] = useState(0);

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [listening, setListening] = useState(false);

  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [dislikes, setDislikes] = useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [readingMessageId, setReadingMessageId] = useState<string | null>(null);
  const [readingCharIndex, setReadingCharIndex] = useState(-1);

  const [speechLanguage, setSpeechLanguage] = useState("pt-BR");
  const [speechGender, setSpeechGender] = useState<VoiceGender>("male");
  const [speechSettingsOpen, setSpeechSettingsOpen] = useState(false);

  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const [visibleChatCount, setVisibleChatCount] = useState(5);
  const [chatMenuId, setChatMenuId] = useState<string | null>(null);
  const [renameChatId, setRenameChatId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null);

  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef("");

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSessionRef = useRef(0);

  const longPressTimerRef = useRef<number | null>(null);

  const sidebarDragRef = useRef<{
    active: boolean;
    startX: number;
    startProgress: number;
  }>({
    active: false,
    startX: 0,
    startProgress: 0,
  });

  const edgeDragRef = useRef<{
    active: boolean;
    startX: number;
  }>({
    active: false,
    startX: 0,
  });

  /*
   * ============================================================
   * KEYBOARD MOBILE
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
      const keyboardHeight = Math.max(
        0,
        Math.round(
          window.innerHeight -
            viewport.height -
            viewport.offsetTop,
        ),
      );

      setKeyboardOffset(keyboardHeight);

      requestAnimationFrame(() => {
        if (chatRef.current && keyboardHeight > 0) {
          chatRef.current.scrollTop = chatRef.current.scrollHeight;
        }
      });
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /*
   * ============================================================
   * CONVERSATIONS
   * ============================================================
   */

  const loadConversations = useCallback(async () => {
    if (!userId) {
      setConversations([]);
      return;
    }

    const {
      data,
      error: conversationsError,
    } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", {
        ascending: false,
      });

    if (conversationsError) {
      return;
    }

    setConversations(data ?? []);
    setVisibleChatCount(5);
  }, [userId]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSidebarProgress(0);
    setChatMenuId(null);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    setSidebarProgress(1);
  }, []);

  const beginSidebarDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      sidebarDragRef.current = {
        active: true,
        startX: event.clientX,
        startProgress: sidebarProgress,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [sidebarProgress],
  );

  const moveSidebarDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!sidebarDragRef.current.active) {
        return;
      }

      const delta =
        event.clientX - sidebarDragRef.current.startX;

      const nextProgress = Math.min(
        1,
        Math.max(
          0,
          sidebarDragRef.current.startProgress +
            delta / SIDEBAR_MAX_WIDTH,
        ),
      );

      setSidebarProgress(nextProgress);
    },
    [],
  );

  const endSidebarDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!sidebarDragRef.current.active) {
        return;
      }

      sidebarDragRef.current.active = false;

      try {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      } catch {
        // ignore
      }

      setSidebarProgress((current) => {
        if (current > 0.5) {
          setSidebarOpen(true);
          return 1;
        }

        setSidebarOpen(false);
        setChatMenuId(null);
        return 0;
      });
    },
    [],
  );

  const startEdgeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
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

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [],
  );

  const moveEdgeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!edgeDragRef.current.active) {
        return;
      }

      const delta =
        event.clientX - edgeDragRef.current.startX;

      if (delta <= 0) {
        setSidebarProgress(0);
        return;
      }

      setSidebarProgress(
        Math.min(1, delta / SIDEBAR_MAX_WIDTH),
      );
    },
    [],
  );

  const endEdgeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!edgeDragRef.current.active) {
        return;
      }

      edgeDragRef.current.active = false;

      try {
        event.currentTarget.releasePointerCapture(
          event.pointerId,
        );
      } catch {
        // ignore
      }

      setSidebarProgress((current) => {
        if (current > 0.25) {
          setSidebarOpen(true);
          return 1;
        }

        return 0;
      });
    },
    [],
  );

  /*
   * ============================================================
   * NOVA CONVERSA
   * ============================================================
   */

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setInput("");
    setError("");
    setLikes({});
    setDislikes({});
    setCopiedMessageId(null);
    setChatMenuId(null);

    speechSessionRef.current += 1;

    if (
      typeof window !== "undefined" &&
      "speechSynthesis" in window
    ) {
      window.speechSynthesis.cancel();
    }

    speechRef.current = null;
    setReadingMessageId(null);
    setReadingCharIndex(-1);

    closeSidebar();

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [closeSidebar]);

  /*
   * ============================================================
   * SAVE TITLE
   * ============================================================
   */

  const saveConversationTitle = useCallback(
    async (title: string) => {
      if (!userId || !title.trim()) {
        return;
      }

      const safeTitle = title.trim().slice(0, 80);

      const { error: insertError } = await supabase
        .from("conversations")
        .insert({
          user_id: userId,
          title: safeTitle,
        });

      if (!insertError) {
        await loadConversations();
      }
    },
    [userId, loadConversations],
  );

  /*
   * ============================================================
   * CHAT LONG PRESS / MENU
   * ============================================================
   */

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const startChatLongPress = useCallback(
    (conversation: Conversation) => {
      clearLongPress();

      longPressTimerRef.current = window.setTimeout(() => {
        setChatMenuId(conversation.id);
        longPressTimerRef.current = null;
      }, 600);
    },
    [clearLongPress],
  );

  const cancelChatLongPress = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  useEffect(() => {
    return () => {
      clearLongPress();
    };
  }, [clearLongPress]);

  const openRenameChat = useCallback(
    (conversation: Conversation) => {
      setChatMenuId(null);
      setRenameChatId(conversation.id);
      setRenameValue(conversation.title);
    },
    [],
  );

  const confirmRenameChat = useCallback(async () => {
    if (!renameChatId || !userId || !renameValue.trim()) {
      return;
    }

    const title = renameValue.trim().slice(0, 80);

    const { error: updateError } = await supabase
      .from("conversations")
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq("id", renameChatId)
      .eq("user_id", userId);

    if (updateError) {
      setError("Não foi possível renomear o chat.");
      return;
    }

    setConversations((current) =>
      current.map((conversation) =>
        conversation.id === renameChatId
          ? {
              ...conversation,
              title,
              updated_at: new Date().toISOString(),
            }
          : conversation,
      ),
    );

    setRenameChatId(null);
    setRenameValue("");
  }, [renameChatId, renameValue, userId]);

  const requestDeleteChat = useCallback(
    (conversation: Conversation) => {
      setChatMenuId(null);
      setDeleteChatId(conversation.id);
    },
    [],
  );

  const confirmDeleteChat = useCallback(async () => {
    if (!deleteChatId || !userId) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("conversations")
      .delete()
      .eq("id", deleteChatId)
      .eq("user_id", userId);

    if (deleteError) {
      setError("Não foi possível deletar o chat.");
      return;
    }

    setConversations((current) =>
      current.filter(
        (conversation) =>
          conversation.id !== deleteChatId,
      ),
    );

    setDeleteChatId(null);
  }, [deleteChatId, userId]);

  /*
   * ============================================================
   * AI
   * ============================================================
   */

  const getAIName = useCallback(async () => {
    if (!userId) {
      return "decidly-ai-free";
    }

    const { data } = await supabase
      .from("subscription")
      .select("plan,status,expires_at")
      .eq("user_id", userId)
      .order("created_at", {
        ascending: false,
      })
      .limit(1)
      .maybeSingle();

    const subscription = data as Subscription | null;

    if (!subscription) {
      return "decidly-ai-free";
    }

    const active =
      subscription.status === "active" ||
      subscription.status === "trialing";

    const isVIP =
      subscription.plan === "vip" ||
      subscription.plan === "VIP";

    const notExpired =
      !subscription.expires_at ||
      new Date(subscription.expires_at).getTime() >
        Date.now();

    if (active && isVIP && notExpired) {
      return "decidly-ai";
    }

    return "decidly-ai-free";
  }, [userId]);

  /*
   * ============================================================
   * SEND
   * ============================================================
   */

  const sendMessage = useCallback(async () => {
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

    setError("");
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [
      ...current,
      userMessage,
    ]);

    setIsLoading(true);

    try {
      const functionName = await getAIName();

      const history = [
        ...messages,
        userMessage,
      ].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const {
        data,
        error: functionError,
      } = await supabase.functions.invoke(
        functionName,
        {
          body: {
            message: text,
            history,
          },
        },
      );

      if (functionError) {
        const status =
          (
            functionError as {
              context?: Response;
            }
          )?.context?.status;

        if (status === 402) {
          throw new Error("402");
        }

        if (status === 429) {
          throw new Error("429");
        }

        if (status === 401 || status === 403) {
          throw new Error("AUTH");
        }

        if (status && status >= 500) {
          throw new Error("SERVER");
        }

        throw new Error("AI_ERROR");
      }

      const answer =
        typeof data?.answer === "string"
          ? data.answer
          : typeof data?.response === "string"
            ? data.response
            : typeof data?.message === "string"
              ? data.message
              : "";

      if (!answer) {
        throw new Error("AI_ERROR");
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
        await saveConversationTitle(text);
      }
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "AI_ERROR";

      if (message === "402") {
        setError(
          "Seu plano atual não permite usar este recurso.",
        );
      } else if (message === "429") {
        setError(
          "Muitas solicitações no momento. Tente novamente em instantes.",
        );
      } else if (message === "AUTH") {
        setError(
          "Sua sessão não pôde ser validada. Entre novamente.",
        );
      } else if (message === "SERVER") {
        setError(
          "O serviço está temporariamente indisponível.",
        );
      } else {
        setError(
          "Não foi possível obter uma resposta agora. Tente novamente.",
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    input,
    isLoading,
    userId,
    getAIName,
    messages,
    saveConversationTitle,
  ]);

  /*
   * ============================================================
   * TEXTAREA
   * ============================================================
   */

  const resizeTextarea = useCallback(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";

    textarea.style.height = `${Math.min(
      Math.max(textarea.scrollHeight, 58),
      140,
    )}px`;
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  const handleTextareaKeyDown = (
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

  const handleTextareaFocus = () => {
    requestAnimationFrame(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop =
          chatRef.current.scrollHeight;
      }
    });
  };

  /*
   * ============================================================
   * MICROFONE
   * ============================================================
   */

  const toggleListening = useCallback(() => {
    if (
      typeof window === "undefined" ||
      (!("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window))
    ) {
      setError(
        "O reconhecimento de voz não é compatível com este navegador.",
      );
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setListening(false);
      return;
    }

    const SpeechRecognitionConstructor =
      window.SpeechRecognition ??
      window.webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setError(
        "O reconhecimento de voz não é compatível com este navegador.",
      );
      return;
    }

    const recognition =
      new SpeechRecognitionConstructor();

    recognition.lang = speechLanguage;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    lastTranscriptRef.current = "";

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };

    recognition.onresult = (event) => {
      const index = event.resultIndex;
      const result = event.results[index];

      if (!result || !result.isFinal) {
        return;
      }

      const transcript =
        result[0]?.transcript?.trim() ?? "";

      if (!transcript) {
        return;
      }

      const normalized = transcript
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();

      if (
        normalized ===
        lastTranscriptRef.current
      ) {
        return;
      }

      lastTranscriptRef.current = normalized;

      setInput((current) => {
        const currentText = current.trim();

        if (!currentText) {
          return transcript;
        }

        const currentWords = currentText
          .split(/\s+/)
          .filter(Boolean);

        const transcriptWords = transcript
          .split(/\s+/)
          .filter(Boolean);

        const maxOverlap = Math.min(
          currentWords.length,
          transcriptWords.length,
          8,
        );

        let overlap = 0;

        for (
          let size = maxOverlap;
          size > 0;
          size--
        ) {
          const a = currentWords
            .slice(-size)
            .join(" ")
            .toLowerCase();

          const b = transcriptWords
            .slice(0, size)
            .join(" ")
            .toLowerCase();

          if (a === b) {
            overlap = size;
            break;
          }
        }

        const remaining = transcriptWords.slice(
          overlap,
        );

        if (remaining.length === 0) {
          return currentText;
        }

        return `${currentText} ${remaining.join(" ")}`;
      });
    };

    recognition.onerror = (event) => {
      if (event.error === "not-allowed") {
        setError(
          "Permita o acesso ao microfone para usar a voz.",
        );
      } else if (event.error !== "aborted") {
        setError(
          "Não foi possível reconhecer sua voz. Tente novamente.",
        );
      }

      setListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch {
      setListening(false);
      recognitionRef.current = null;
    }
  }, [listening, speechLanguage]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /*
   * ============================================================
   * VOICES
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
      setAvailableVoices(
        window.speechSynthesis.getVoices(),
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

  /*
   * ============================================================
   * FIND VOICE
   * ============================================================
   */

  const findBestVoice = useCallback(
    (
      language: string,
      gender: VoiceGender,
    ) => {
      if (availableVoices.length === 0) {
        return null;
      }

      const normalizedLanguage =
        language.toLowerCase();

      const languageCode =
        normalizedLanguage.split("-")[0];

      const languageVoices =
        availableVoices.filter((voice) => {
          const voiceLanguage =
            voice.lang.toLowerCase();

          return (
            voiceLanguage === normalizedLanguage ||
            voiceLanguage.startsWith(
              `${languageCode}-`,
            )
          );
        });

      const candidates =
        languageVoices.length > 0
          ? languageVoices
          : availableVoices;

      const maleKeywords = [
        "male",
        "man",
        "mascul",
        "homem",
        "maschio",
        "hombre",
        "männ",
        "男",
      ];

      const femaleKeywords = [
        "female",
        "woman",
        "fem",
        "mulher",
        "femin",
        "donna",
        "mujer",
        "weib",
        "女",
      ];

      const keywords =
        gender === "male"
          ? maleKeywords
          : femaleKeywords;

      const genderVoice = candidates.find(
        (voice) => {
          const name =
            voice.name.toLowerCase();

          return keywords.some((keyword) =>
            name.includes(keyword),
          );
        },
      );

      return (
        genderVoice ??
        candidates.find(
          (voice) => voice.default,
        ) ??
        candidates[0] ??
        null
      );
    },
    [availableVoices],
  );

  /*
   * ============================================================
   * STOP READING
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

    speechRef.current = null;

    setReadingMessageId(null);
    setReadingCharIndex(-1);
  }, []);

  /*
   * ============================================================
   * READ MESSAGE
   * ============================================================
   */

  const readMessage = useCallback(
    (message: ChatMessage) => {
      if (
        typeof window === "undefined" ||
        !("speechSynthesis" in window)
      ) {
        setError(
          "A leitura em voz alta não é compatível com este navegador.",
        );
        return;
      }

      if (readingMessageId === message.id) {
        stopReading();
        return;
      }

      window.speechSynthesis.cancel();

      speechSessionRef.current += 1;

      const session = speechSessionRef.current;

      setReadingMessageId(message.id);
      setReadingCharIndex(-1);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      utterance.rate = 1.15;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = speechLanguage;

      const voice = findBestVoice(
        speechLanguage,
        speechGender,
      );

      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      utterance.onstart = () => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        setReadingMessageId(message.id);
      };

      utterance.onboundary = (event) => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        if (event.name === "word") {
          setReadingCharIndex(
            event.charIndex,
          );
        }
      };

      utterance.onend = () => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        speechRef.current = null;

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

        speechRef.current = null;

        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      speechRef.current = utterance;

      window.setTimeout(() => {
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
      speechLanguage,
      speechGender,
      findBestVoice,
      stopReading,
    ],
  );

  /*
   * ============================================================
   * CLEANUP SPEECH
   * ============================================================
   */

  useEffect(() => {
    return () => {
      speechSessionRef.current += 1;

      if (
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  /*
   * ============================================================
   * HIGHLIGHT
   * ============================================================
   */

  const renderReadingText = (
    text: string,
    charIndex: number,
  ) => {
    if (
      charIndex < 0 ||
      charIndex >= text.length
    ) {
      return text;
    }

    const before = text.slice(0, charIndex);
    const remaining = text.slice(charIndex);

    const match = remaining.match(/^\S+/);

    if (!match) {
      return text;
    }

    const word = match[0];

    const wordStart = charIndex;
    const wordEnd = wordStart + word.length;

    return (
      <>
        {before}

        <mark className="rounded-md bg-[#8B5CF6]/35 px-1 text-white">
          {text.slice(wordStart, wordEnd)}
        </mark>

        {text.slice(wordEnd)}
      </>
    );
  };

  /*
   * ============================================================
   * COPY
   * ============================================================
   */

  const copyMessage = useCallback(
    async (message: ChatMessage) => {
      try {
        await navigator.clipboard.writeText(
          message.content,
        );

        setCopiedMessageId(message.id);

        window.setTimeout(() => {
          setCopiedMessageId((current) =>
            current === message.id
              ? null
              : current,
          );
        }, 1500);
      } catch {
        setError(
          "Não foi possível copiar a mensagem.",
        );
      }
    },
    [],
  );

  /*
   * ============================================================
   * LIKE / DISLIKE
   * ============================================================
   */

  const toggleLike = (id: string) => {
    setLikes((current) => ({
      ...current,
      [id]: !current[id],
    }));

    setDislikes((current) => ({
      ...current,
      [id]: false,
    }));
  };

  const toggleDislike = (id: string) => {
    setDislikes((current) => ({
      ...current,
      [id]: !current[id],
    }));

    setLikes((current) => ({
      ...current,
      [id]: false,
    }));
  };

  /*
   * ============================================================
   * AUTO SCROLL
   * ============================================================
   */

  useEffect(() => {
    requestAnimationFrame(() => {
      if (chatRef.current) {
        chatRef.current.scrollTop =
          chatRef.current.scrollHeight;
      }
    });
  }, [messages, isLoading]);

  /*
   * ============================================================
   * FILTER / PAGINATION
   * ============================================================
   */

  const filteredConversations =
    conversations.filter(
      (conversation) =>
        conversation.title
          .toLowerCase()
          .includes(search.toLowerCase()),
    );

  const visibleConversations =
    filteredConversations.slice(
      0,
      visibleChatCount,
    );

  const hasMoreChats =
    visibleChatCount <
    filteredConversations.length;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white">

      {/* MENU FIXO */}

      <button
        type="button"
        onClick={() =>
          sidebarOpen
            ? closeSidebar()
            : openSidebar()
        }
        className="fixed left-4 top-4 z-[130] flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/75 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white"
        aria-label={
          sidebarOpen
            ? "Fechar menu"
            : "Abrir menu"
        }
      >
        {sidebarOpen ? (
          <X size={21} />
        ) : (
          <Menu size={21} />
        )}
      </button>

      {/* CONFIGURAÇÕES FIXAS */}

      <button
        type="button"
        onClick={() =>
          setSpeechSettingsOpen(
            (current) => !current,
          )
        }
        className="fixed right-4 top-4 z-[130] flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white"
        aria-label="Configurações de voz"
        aria-expanded={
          speechSettingsOpen
        }
      >
        <Settings size={20} />
      </button>

      {/* PAINEL DE CONFIGURAÇÕES DE VOZ */}

      {speechSettingsOpen && (
        <div className="fixed right-4 top-[64px] z-[125] w-[260px] rounded-2xl bg-[#18101f] p-4 shadow-2xl ring-1 ring-white/10">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">
                Configurações de voz
              </div>

              <div className="mt-1 text-xs text-white/40">
                Escolha o idioma e a voz.
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setSpeechSettingsOpen(false)
              }
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white"
              aria-label="Fechar configurações"
            >
              <X size={15} />
            </button>
          </div>

          <label className="mb-1.5 block text-xs text-white/45">
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
              boxShadow: "none",
            }}
          >
            {SPEECH_LANGUAGES.map(
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

          <label className="mb-1.5 block text-xs text-white/45">
            Voz
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setSpeechGender("male")
              }
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                speechGender === "male"
                  ? "bg-[#8B5CF6] text-white"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              Masculina
            </button>

            <button
              type="button"
              onClick={() =>
                setSpeechGender("female")
              }
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                speechGender === "female"
                  ? "bg-[#8B5CF6] text-white"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              Feminina
            </button>
          </div>

          <div className="mt-3 text-[10px] leading-4 text-white/25">
            A disponibilidade das vozes depende do navegador e do dispositivo.
          </div>
        </div>
      )}

      {/* SWIPE DA BORDA */}

      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 z-[105] h-full w-5 touch-none"
          onPointerDown={startEdgeDrag}
          onPointerMove={moveEdgeDrag}
          onPointerUp={endEdgeDrag}
          onPointerCancel={endEdgeDrag}
        />
      )}

      {/* SIDEBAR */}

      <aside
        className="fixed left-0 top-0 z-[100] h-[100dvh] w-[min(320px,88vw)] bg-[#120c18]/98 shadow-2xl backdrop-blur-2xl"
        style={{
          transform: `translateX(calc(-100% + ${
            sidebarProgress * 100
          }%))`,
          transition:
            sidebarDragRef.current.active
              ? "none"
              : "transform 180ms ease-out",
        }}
      >
        <div className="flex h-full flex-col">

          {/* CABEÇALHO */}

          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
              <img
                src="/appicon.png"
                alt="DecidlyAI"
                className="h-9 w-9 rounded-xl"
              />

              <div>
                <div className="text-sm font-semibold">
                  DecidlyAI
                </div>

                <div className="text-xs text-white/45">
                  Suas conversas
                </div>
              </div>
            </div>

            {/* ESTE É O X ORIGINAL — MANTIDO */}

            <button
              type="button"
              onClick={closeSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={19} />
            </button>
          </div>

          {/* NOVA CONVERSA */}

          <div className="px-3">
            <button
              type="button"
              onClick={startNewConversation}
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.09]"
            >
              <Plus size={18} />
              Nova conversa
            </button>
          </div>

          {/* PESQUISA */}

          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.045] px-3 py-2.5">
              <Search
                size={17}
                className="shrink-0 text-white/35"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setVisibleChatCount(5);
                }}
                placeholder="Pesquisar"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          </div>

          {/* LISTA DE CHATS */}

          <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
            {filteredConversations.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-white/35">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {visibleConversations.map(
                    (conversation) => (
                      <div
                        key={conversation.id}
                        className="relative"
                        onPointerDown={() =>
                          startChatLongPress(
                            conversation,
                          )
                        }
                        onPointerUp={
                          cancelChatLongPress
                        }
                        onPointerCancel={
                          cancelChatLongPress
                        }
                        onPointerLeave={
                          cancelChatLongPress
                        }
                        onContextMenu={(event) =>
                          event.preventDefault()
                        }
                      >
                        <button
                          type="button"
                          onClick={() => {
                            cancelChatLongPress();

                            if (
                              chatMenuId ===
                              conversation.id
                            ) {
                              setChatMenuId(null);
                            }
                          }}
                          className="w-full rounded-xl px-3 py-3 text-left text-sm text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                        >
                          <div className="truncate pr-8">
                            {conversation.title}
                          </div>
                        </button>

                        {/* MENU DO CHAT */}

                        {chatMenuId ===
                          conversation.id && (
                          <div
                            className="absolute left-2 right-2 top-[calc(100%-4px)] z-[170] overflow-hidden rounded-xl bg-[#21152d] p-1 shadow-2xl ring-1 ring-white/10"
                            onPointerDown={(event) =>
                              event.stopPropagation()
                            }
                          >
                            <button
                              type="button"
                              onClick={() =>
                                openRenameChat(
                                  conversation,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/[0.07] hover:text-white"
                            >
                              <Pencil size={16} />
                              Renomear chat
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                requestDeleteChat(
                                  conversation,
                                )
                              }
                              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/10 hover:text-red-200"
                            >
                              <Trash2 size={16} />
                              Deletar chat
                            </button>
                          </div>
                        )}
                      </div>
                    ),
                  )}
                </div>

                {/* PAGINAÇÃO */}

                {hasMoreChats && (
                  <div className="mt-2 flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setVisibleChatCount(
                          (current) =>
                            Math.min(
                              current + 25,
                              filteredConversations.length,
                            ),
                        )
                      }
                      className="w-full rounded-xl px-3 py-2.5 text-sm text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      Ver mais
                    </button>

                    {visibleChatCount >= 30 && (
                      <button
                        type="button"
                        onClick={() =>
                          setVisibleChatCount(
                            filteredConversations.length,
                          )
                        }
                        className="w-full rounded-xl px-3 py-2.5 text-sm text-[#A78BFA] transition hover:bg-[#8B5CF6]/10 hover:text-[#C4B5FD]"
                      >
                        Ver tudo
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* RODAPÉ DA SIDEBAR */}

          <div className="border-t border-white/[0.06] px-3 py-3">
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              <User size={18} />
              <span>Conta</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSpeechSettingsOpen(
                  true,
                )
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm text-white/65 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Settings size={18} />
              <span>Configurações</span>
            </button>
          </div>

          {/* Handle independente */}

          <div
            className="absolute right-0 top-0 h-full w-5 touch-none"
            onPointerDown={beginSidebarDrag}
            onPointerMove={moveSidebarDrag}
            onPointerUp={endSidebarDrag}
            onPointerCancel={endSidebarDrag}
          />
        </div>
      </aside>

      {/* BACKDROP */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[90] bg-black/45"
          onClick={closeSidebar}
        />
      )}

      {/* FECHAR MENU DE CHAT AO TOCAR FORA */}

      {chatMenuId && (
        <button
          type="button"
          aria-label="Fechar menu do chat"
          className="fixed inset-0 z-[150] cursor-default bg-transparent"
          onClick={() => setChatMenuId(null)}
        />
      )}

      {/* CHAT */}

      <main className="relative z-10 h-[100dvh] min-h-0 overflow-hidden">

        <div
          ref={chatRef}
          className="h-full overflow-y-auto px-4 pb-40 pt-4 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">

            {/* WELCOME */}

            {messages.length === 0 && (
              <div className="flex min-h-[calc(100dvh-180px)] flex-col items-center justify-center px-4">
                <img
                  src="/appicon.png"
                  alt="DecidlyAI"
                  className="mb-5 h-16 w-16 rounded-2xl shadow-xl"
                />

                <div className="mb-2 flex items-center gap-2">
                  <Sparkles
                    size={18}
                    className="text-[#A78BFA]"
                  />

                  <h1 className="text-xl font-semibold">
                    O que você está decidindo?
                  </h1>
                </div>

                <p className="max-w-md text-center text-sm leading-6 text-white/45">
                  Explique a situação, as opções que você tem e o que está te deixando em dúvida.
                </p>
              </div>
            )}

            {/* MESSAGES */}

            {messages.length > 0 && (
              <div className="space-y-7 pt-16">
                {messages.map((message) => {
                  const isReading =
                    readingMessageId ===
                    message.id;

                  return (
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
                            ? "max-w-[88%] rounded-2xl bg-[#8B5CF6] px-4 py-3 text-[15px] leading-6 text-white shadow-lg shadow-[#8B5CF6]/10"
                            : "w-full max-w-[88%]"
                        }
                      >
                        {message.role ===
                        "assistant" ? (
                          <>
                            <div className="text-[15px] leading-7 text-white/90">
                              {isReading ? (
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
                                  components={{
                                    p: ({
                                      children,
                                    }) => (
                                      <p className="mb-3 last:mb-0">
                                        {children}
                                      </p>
                                    ),

                                    strong: ({
                                      children,
                                    }) => (
                                      <strong className="font-semibold text-white">
                                        {children}
                                      </strong>
                                    ),

                                    ul: ({
                                      children,
                                    }) => (
                                      <ul className="mb-3 list-disc space-y-1 pl-5">
                                        {children}
                                      </ul>
                                    ),

                                    ol: ({
                                      children,
                                    }) => (
                                      <ol className="mb-3 list-decimal space-y-1 pl-5">
                                        {children}
                                      </ol>
                                    ),

                                    li: ({
                                      children,
                                    }) => (
                                      <li>{children}</li>
                                    ),

                                    code: ({
                                      children,
                                    }) => (
                                      <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm">
                                        {children}
                                      </code>
                                    ),
                                  }}
                                >
                                  {message.content}
                                </ReactMarkdown>
                              )}
                            </div>

                            {/* AÇÕES */}

                            <div className="mt-3 flex items-center gap-1 text-white/35">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleLike(
                                    message.id,
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white ${
                                  likes[
                                    message.id
                                  ]
                                    ? "text-[#A78BFA]"
                                    : ""
                                }`}
                                aria-label="Curtir"
                              >
                                <ThumbsUp size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  toggleDislike(
                                    message.id,
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white ${
                                  dislikes[
                                    message.id
                                  ]
                                    ? "text-[#A78BFA]"
                                    : ""
                                }`}
                                aria-label="Não gostei"
                              >
                                <ThumbsDown size={16} />
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void copyMessage(
                                    message,
                                  )
                                }
                                className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white"
                                aria-label="Copiar"
                              >
                                {copiedMessageId ===
                                message.id ? (
                                  <Check size={16} />
                                ) : (
                                  <Copy size={16} />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  readMessage(
                                    message,
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white ${
                                  isReading
                                    ? "text-[#A78BFA]"
                                    : ""
                                }`}
                                aria-label={
                                  isReading
                                    ? "Parar leitura"
                                    : "Ouvir mensagem"
                                }
                              >
                                {isReading ? (
                                  <VolumeX size={16} />
                                ) : (
                                  <Volume2 size={16} />
                                )}
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="whitespace-pre-wrap">
                            {message.content}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="text-sm text-white/45">
                      DecidlyAI está pensando...
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-5 rounded-xl bg-red-500/[0.06] px-4 py-3 text-sm text-red-200/80">
                {error}
              </div>
            )}

            {messages.length > 0 && (
              <div className="mt-8 pb-6 text-center text-xs text-white/30">
                A DecidlyAI pode cometer erros. Verifique informações importantes.
              </div>
            )}
          </div>
        </div>

        {/* COMPOSER */}

        <div
          className="fixed left-0 right-0 z-[50] px-3 pb-3 sm:px-6 sm:pb-5"
          style={{
            bottom:
              keyboardOffset > 0
                ? `${keyboardOffset}px`
                : "0px",
            transition:
              "bottom 100ms ease-out",
          }}
        >
          <div className="relative mx-auto max-w-3xl">

            {/* CAIXA PILL */}

            <div
              className="overflow-hidden rounded-[32px] bg-[#17101f] px-3 py-2 shadow-2xl"
              style={{
                border: "none",
                outline: "none",
                boxShadow:
                  "0 20px 45px rgba(0,0,0,.25)",
              }}
            >
              <div className="flex items-end gap-2">

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
                    handleTextareaKeyDown
                  }
                  onFocus={
                    handleTextareaFocus
                  }
                  placeholder="Escreva sua decisão..."
                  rows={1}
                  className="min-h-[58px] max-h-[140px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-3 text-[15px] leading-6 text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                  style={{
                    border: "none",
                    outline: "none",
                    boxShadow: "none",
                    appearance: "none",
                    WebkitAppearance:
                      "none",
                  }}
                />

                {/* MICROFONE */}

                <button
                  type="button"
                  onClick={toggleListening}
                  className={`mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                    listening
                      ? "bg-[#8B5CF6]/20 text-[#A78BFA]"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-label={
                    listening
                      ? "Parar microfone"
                      : "Usar microfone"
                  }
                >
                  {listening ? (
                    <MicOff size={19} />
                  ) : (
                    <Mic size={19} />
                  )}
                </button>

                {/* ENVIAR */}

                <button
                  type="button"
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={
                    !input.trim() ||
                    isLoading
                  }
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-white transition hover:bg-[#9B6AF7] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <ArrowUp size={20} />
                </button>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] text-white/20">
              Ctrl + Enter para enviar
            </div>
          </div>
        </div>
      </main>

      {/* MODAL RENOMEAR */}

      {renameChatId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-2xl bg-[#18101f] p-5 shadow-2xl ring-1 ring-white/10"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <div className="text-base font-semibold text-white">
              Renomear chat
            </div>

            <div className="mt-1 text-sm text-white/40">
              Escolha um novo nome para esta conversa.
            </div>

            <input
              autoFocus
              value={renameValue}
              onChange={(event) =>
                setRenameValue(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void confirmRenameChat();
                }

                if (event.key === "Escape") {
                  setRenameChatId(null);
                  setRenameValue("");
                }
              }}
              maxLength={80}
              className="mt-4 w-full rounded-xl bg-white/[0.06] px-3 py-3 text-sm text-white outline-none ring-1 ring-white/10 placeholder:text-white/25 focus:ring-[#8B5CF6]/50"
              placeholder="Nome do chat"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRenameChatId(null);
                  setRenameValue("");
                }}
                className="rounded-xl px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!renameValue.trim()}
                onClick={() =>
                  void confirmRenameChat()
                }
                className="rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#9B6AF7] disabled:opacity-30"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DELETAR */}

      {deleteChatId && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#18101f] p-5 shadow-2xl ring-1 ring-white/10">
            <div className="text-base font-semibold text-white">
              Deletar chat?
            </div>

            <div className="mt-2 text-sm leading-6 text-white/45">
              Essa ação vai apagar esta conversa permanentemente. Deseja continuar?
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() =>
                  setDeleteChatId(null)
                }
                className="rounded-xl px-4 py-2.5 text-sm text-white/55 transition hover:bg-white/5 hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmDeleteChat()
                }
                className="rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300 transition hover:bg-red-500/25"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}