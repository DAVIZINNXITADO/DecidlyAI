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
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const chatRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastTranscriptRef = useRef("");

  const speechRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechSessionRef = useRef(0);

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
    if (typeof window === "undefined" || !window.visualViewport) {
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

    loadUser();

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

    const { data, error: conversationsError } = await supabase
      .from("conversations")
      .select("id,title,created_at,updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (conversationsError) {
      return;
    }

    setConversations(data ?? []);
  }, [userId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  /*
   * ============================================================
   * SIDEBAR
   * ============================================================
   */

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
    setSidebarProgress(0);
  }, []);

  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
    setSidebarProgress(1);
  }, []);

  const beginSidebarDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
        return;
      }

      sidebarDragRef.current = {
        active: true,
        startX: event.clientX,
        startProgress: sidebarOpen ? 1 : 0,
      };

      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [sidebarOpen],
  );

  const moveSidebarDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!sidebarDragRef.current.active) {
        return;
      }

      const { startX, startProgress } = sidebarDragRef.current;

      const delta = event.clientX - startX;

      const nextProgress = Math.min(
        1,
        Math.max(
          0,
          startProgress + delta / SIDEBAR_MAX_WIDTH,
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
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer-capture cleanup errors.
      }

      setSidebarProgress((current) => {
        if (current > 0.45) {
          setSidebarOpen(true);
          return 1;
        }

        setSidebarOpen(false);
        return 0;
      });
    },
    [],
  );

  /*
   * Borda esquerda para abrir a sidebar por gesto.
   */

  const startEdgeDrag = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.pointerType === "mouse" && event.button !== 0) {
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

      const delta = event.clientX - edgeDragRef.current.startX;

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
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        // Ignore pointer-capture cleanup errors.
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
   * NEW CONVERSATION
   * ============================================================
   */

  const startNewConversation = useCallback(() => {
    setMessages([]);
    setInput("");
    setError("");
    setLikes({});
    setDislikes({});
    setCopiedMessageId(null);
    setReadingMessageId(null);
    setReadingCharIndex(-1);

    closeSidebar();

    requestAnimationFrame(() => {
      textareaRef.current?.focus();
    });
  }, [closeSidebar]);

  /*
   * ============================================================
   * SAVE CONVERSATION
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
   * AI SELECTION
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
      .order("created_at", { ascending: false })
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
      new Date(subscription.expires_at).getTime() > Date.now();

    if (active && isVIP && notExpired) {
      return "decidly-ai";
    }

    return "decidly-ai-free";
  }, [userId]);

  /*
   * ============================================================
   * SEND MESSAGE
   * ============================================================
   */

  const sendMessage = useCallback(async () => {
    const text = input.trim();

    if (!text || isLoading) {
      return;
    }

    if (!userId) {
      setError("Você precisa estar conectado para continuar.");
      return;
    }

    setError("");
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    setMessages((current) => [...current, userMessage]);
    setIsLoading(true);

    try {
      const functionName = await getAIName();

      const history = [...messages, userMessage].map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const { data, error: functionError } =
        await supabase.functions.invoke(functionName, {
          body: {
            message: text,
            history,
          },
        });

      if (functionError) {
        const status =
          (functionError as { context?: Response })?.context
            ?.status;

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
      /*
       * NÃO fazemos focus() aqui.
       * Isso evita que o teclado mobile reabra
       * automaticamente quando a IA termina.
       */
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

    const nextHeight = Math.min(
      Math.max(textarea.scrollHeight, 58),
      140,
    );

    textarea.style.height = `${nextHeight}px`;
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
   * MICROPHONE
   * ============================================================
   */

  const toggleListening = useCallback(() => {
    if (
      typeof window === "undefined" ||
      !("webkitSpeechRecognition" in window) &&
        !("SpeechRecognition" in window)
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
      /*
       * Usa SOMENTE o resultado atual/final.
       * Isso evita o problema de "hi hi hi hi".
       */
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

      if (normalized === lastTranscriptRef.current) {
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
        );

        let overlap = 0;

        for (let size = maxOverlap; size > 0; size--) {
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

        const remainingWords =
          transcriptWords.slice(overlap);

        if (remainingWords.length === 0) {
          return currentText;
        }

        return `${currentText} ${remainingWords.join(" ")}`;
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
    recognition.start();
  }, [listening, speechLanguage]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /*
   * ============================================================
   * TEXT TO SPEECH
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

  const findBestVoice = useCallback(
    (
      language: string,
      gender: VoiceGender,
    ): SpeechSynthesisVoice | null => {
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
        "masculino",
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
        "feminino",
      ];

      const keywords =
        gender === "male"
          ? maleKeywords
          : femaleKeywords;

      const genderVoice = candidates.find((voice) => {
        const name = voice.name.toLowerCase();

        return keywords.some((keyword) =>
          name.includes(keyword),
        );
      });

      if (genderVoice) {
        return genderVoice;
      }

      /*
       * Algumas plataformas não informam o gênero no nome.
       * Nesse caso, simplesmente usa a melhor voz daquele idioma.
       */
      return candidates[0] ?? null;
    },
    [availableVoices],
  );

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

      /*
       * Cancela qualquer leitura anterior.
       */
      window.speechSynthesis.cancel();

      speechSessionRef.current += 1;

      const session =
        speechSessionRef.current;

      setReadingMessageId(message.id);
      setReadingCharIndex(0);

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
          speechSessionRef.current !== session
        ) {
          return;
        }

        setReadingMessageId(message.id);
        setReadingCharIndex(0);
      };

      utterance.onboundary = (event) => {
        if (
          speechSessionRef.current !== session
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
          speechSessionRef.current !== session
        ) {
          return;
        }

        speechRef.current = null;
        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      utterance.onerror = () => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        speechRef.current = null;
        setReadingMessageId(null);
        setReadingCharIndex(-1);
      };

      speechRef.current = utterance;

      /*
       * Pequeno atraso depois do cancel().
       *
       * Isso evita um problema comum em alguns navegadores
       * mobile em que o primeiro clique é cancelado.
       */
      window.setTimeout(() => {
        if (
          speechSessionRef.current !== session
        ) {
          return;
        }

        window.speechSynthesis.speak(utterance);
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
   * HIGHLIGHT DA PALAVRA
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
    const wordEnd =
      wordStart + word.length;

    return (
      <>
        {before}

        <mark className="rounded-md bg-[#A78BFA]/35 px-1 text-white transition-colors">
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
   * SCROLL
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
   * FILTER
   * ============================================================
   */

  const filteredConversations =
    conversations.filter((conversation) =>
      conversation.title
        .toLowerCase()
        .includes(search.toLowerCase()),
    );

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white"
      style={{
        paddingBottom:
          keyboardOffset > 0
            ? `${keyboardOffset}px`
            : undefined,
      }}
    >
      {/* ======================================================
          BOTÃO MENU FIXO
          ====================================================== */}

      {!sidebarOpen && (
        <button
          type="button"
          onClick={openSidebar}
          className="fixed left-4 top-4 z-[110] flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#17101f]/95 text-white shadow-lg backdrop-blur-xl transition hover:bg-[#21152d]"
          aria-label="Abrir menu"
        >
          <Menu size={21} />
        </button>
      )}

      {/* ======================================================
          BORDA PARA SWIPE ABRIR
          ====================================================== */}

      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 z-[105] h-full w-5 touch-none"
          onPointerDown={startEdgeDrag}
          onPointerMove={moveEdgeDrag}
          onPointerUp={endEdgeDrag}
          onPointerCancel={endEdgeDrag}
        />
      )}

      {/* ======================================================
          SIDEBAR
          ====================================================== */}

      <div
        ref={sidebarRef}
        className="fixed left-0 top-0 z-[100] h-[100dvh] w-[min(320px,88vw)] border-r border-white/10 bg-[#120c18]/98 shadow-2xl backdrop-blur-2xl"
        style={{
          transform: `translateX(calc(-100% + ${
            sidebarProgress * 100
          }%))`,
          transition: sidebarDragRef.current.active
            ? "none"
            : "transform 180ms ease-out",
        }}
      >
        <div className="flex h-full flex-col">
          {/* Sidebar header */}
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

            <button
              type="button"
              onClick={closeSidebar}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={19} />
            </button>
          </div>

          {/* Nova conversa */}
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

          {/* Pesquisa */}
          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.045] px-3 py-2.5">
              <Search
                size={17}
                className="shrink-0 text-white/35"
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

          {/* Conversas */}
          <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
            {filteredConversations.length === 0 ? (
              <div className="px-3 py-8 text-center text-sm text-white/35">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              <div className="space-y-1">
                {filteredConversations.map(
                  (conversation) => (
                    <button
                      key={conversation.id}
                      type="button"
                      className="w-full rounded-xl px-3 py-3 text-left text-sm text-white/70 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <div className="truncate">
                        {conversation.title}
                      </div>
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* Handle de arrastar independente */}
          <div
            className="absolute right-0 top-0 h-full w-5 touch-none"
            onPointerDown={beginSidebarDrag}
            onPointerMove={moveSidebarDrag}
            onPointerUp={endSidebarDrag}
            onPointerCancel={endSidebarDrag}
          />
        </div>
      </div>

      {/* ======================================================
          BACKDROP
          ====================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[90] bg-black/45"
          onClick={closeSidebar}
        />
      )}

      {/* ======================================================
          CHAT
          ====================================================== */}

      <main
        className="relative z-10 h-[100dvh] min-h-0 overflow-hidden"
        style={{
          transform:
            sidebarProgress > 0 && sidebarProgress < 1
              ? `translateX(${
                  sidebarProgress * 20
                }px)`
              : undefined,
        }}
      >
        <div
          ref={chatRef}
          className="h-full overflow-y-auto px-4 pb-40 pt-4 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            {/* ==================================================
                WELCOME
                ================================================== */}

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
                  Explique a situação, as opções que
                  você tem e o que está te deixando
                  em dúvida.
                </p>
              </div>
            )}

            {/* ==================================================
                MESSAGES
                ================================================== */}

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
                            ? "max-w-[88%] rounded-2xl bg-[#251432] px-4 py-3 text-[15px] leading-6 text-white"
                            : "w-full max-w-[88%]"
                        }
                      >
                        {message.role ===
                        "assistant" ? (
                          <>
                            <div
                              className={`text-[15px] leading-7 text-white/90 ${
                                isReading
                                  ? "select-none"
                                  : ""
                              }`}
                            >
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
                                      <li>
                                        {children}
                                      </li>
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

                            {/* Ações */}
                            <div className="mt-3 flex items-center gap-1 text-white/35">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleLike(
                                    message.id,
                                  )
                                }
                                className={`flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white ${
                                  likes[message.id]
                                    ? "text-[#A78BFA]"
                                    : ""
                                }`}
                                aria-label="Curtir"
                              >
                                <ThumbsUp
                                  size={16}
                                />
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
                                <ThumbsDown
                                  size={16}
                                />
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
                                  <Check
                                    size={16}
                                  />
                                ) : (
                                  <Copy
                                    size={16}
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
                                  <VolumeX
                                    size={16}
                                  />
                                ) : (
                                  <Volume2
                                    size={16}
                                  />
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

                {/* ==================================================
                    LOADING
                    ================================================== */}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="text-sm text-white/45">
                      DecidlyAI está pensando...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-5 rounded-xl border border-red-400/10 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200/80">
                {error}
              </div>
            )}

            {/* Aviso */}
            {messages.length > 0 && (
              <div className="mt-8 pb-6 text-center text-xs text-white/30">
                A DecidlyAI pode cometer erros. Verifique
                informações importantes.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================
            COMPOSER
            ====================================================== */}

        <div
          className="fixed bottom-0 left-0 right-0 z-[50] px-3 pb-3 sm:px-6 sm:pb-5"
          style={{
            bottom:
              keyboardOffset > 0
                ? `${keyboardOffset}px`
                : "0px",
            transition:
              "bottom 100ms ease-out",
          }}
        >
          <div className="mx-auto max-w-3xl">
            {/* Configuração de voz */}
            <div className="mb-2 flex items-center justify-end gap-2">
              <select
                value={speechLanguage}
                onChange={(event) =>
                  setSpeechLanguage(
                    event.target.value,
                  )
                }
                className="max-w-[150px] rounded-lg border border-white/10 bg-[#17101f] px-2 py-1.5 text-xs text-white/70 outline-none"
                aria-label="Idioma da voz"
              >
                {SPEECH_LANGUAGES.map(
                  (language) => (
                    <option
                      key={language.value}
                      value={language.value}
                    >
                      {language.label}
                    </option>
                  ),
                )}
              </select>

              <select
                value={speechGender}
                onChange={(event) =>
                  setSpeechGender(
                    event.target.value as VoiceGender,
                  )
                }
                className="rounded-lg border border-white/10 bg-[#17101f] px-2 py-1.5 text-xs text-white/70 outline-none"
                aria-label="Tipo de voz"
              >
                <option value="male">
                  Masculina
                </option>
                <option value="female">
                  Feminina
                </option>
              </select>
            </div>

            <div className="rounded-2xl bg-[#17101f] px-3 py-2 shadow-2xl ring-1 ring-white/[0.06]">
              <div className="flex items-end gap-2">
                {/* Microfone */}
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition ${
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

                {/* Textarea */}
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) =>
                    setInput(event.target.value)
                  }
                  onKeyDown={
                    handleTextareaKeyDown
                  }
                  onFocus={
                    handleTextareaFocus
                  }
                  placeholder="Escreva sua decisão..."
                  rows={1}
                  className="min-h-[58px] max-h-[140px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-1 py-3 text-[15px] leading-6 text-white outline-none ring-0 placeholder:text-white/35 focus:border-0 focus:outline-none focus:ring-0"
                />

                {/* Enviar */}
                <button
                  type="button"
                  onClick={() =>
                    void sendMessage()
                  }
                  disabled={
                    !input.trim() || isLoading
                  }
                  className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#8B5CF6] text-white transition hover:bg-[#9B6AF7] disabled:cursor-not-allowed disabled:opacity-30"
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
    </div>
  );
}