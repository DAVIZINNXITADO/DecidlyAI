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
  MoreHorizontal,
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
const INITIAL_CHAT_LIMIT = 15;
const LOAD_MORE_CHAT_LIMIT = 25;

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

  const [activeConversationId, setActiveConversationId] =
    useState<string | null>(null);

  const [visibleChatCount, setVisibleChatCount] =
    useState(INITIAL_CHAT_LIMIT);

  const [chatMenuId, setChatMenuId] =
    useState<string | null>(null);

  const [renameChatId, setRenameChatId] =
    useState<string | null>(null);

  const [renameValue, setRenameValue] =
    useState("");

  const [deleteChatId, setDeleteChatId] =
    useState<string | null>(null);

  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [listening, setListening] = useState(false);

  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [dislikes, setDislikes] =
    useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  const [readingMessageId, setReadingMessageId] =
    useState<string | null>(null);

  const [readingCharIndex, setReadingCharIndex] =
    useState(-1);

  const [speechLanguage, setSpeechLanguage] =
    useState("pt-BR");

  const [speechGender, setSpeechGender] =
    useState<VoiceGender>("male");

  const [speechSettingsOpen, setSpeechSettingsOpen] =
    useState(false);

  const [availableVoices, setAvailableVoices] =
    useState<SpeechSynthesisVoice[]>([]);

  const chatRef = useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  const lastTranscriptRef = useRef("");

  const speechRef =
    useRef<SpeechSynthesisUtterance | null>(null);

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
        if (
          chatRef.current &&
          keyboardHeight > 0
        ) {
          chatRef.current.scrollTop =
            chatRef.current.scrollHeight;
        }
      });
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
   * CONVERSATIONS
   * ============================================================
   */

  const loadConversations =
    useCallback(async () => {
      if (!userId) {
        setConversations([]);
        return;
      }

      const {
        data,
        error: conversationsError,
      } = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at",
        )
        .eq("user_id", userId)
        .order("updated_at", {
          ascending: false,
        })
        .limit(1000);

      if (conversationsError) {
        return;
      }

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
    (
      event: ReactPointerEvent<HTMLDivElement>,
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
        startProgress: sidebarProgress,
      };

      event.currentTarget.setPointerCapture(
        event.pointerId,
      );
    },
    [sidebarProgress],
  );

  const moveSidebarDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (
        !sidebarDragRef.current.active
      ) {
        return;
      }

      const delta =
        event.clientX -
        sidebarDragRef.current.startX;

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
    (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (
        !sidebarDragRef.current.active
      ) {
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
        return 0;
      });
    },
    [],
  );

  const startEdgeDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
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
    },
    [],
  );

  const moveEdgeDrag = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
    ) => {
      if (!edgeDragRef.current.active) {
        return;
      }

      const delta =
        event.clientX -
        edgeDragRef.current.startX;

      if (delta <= 0) {
        setSidebarProgress(0);
        return;
      }

      setSidebarProgress(
        Math.min(
          1,
          delta / SIDEBAR_MAX_WIDTH,
        ),
      );
    },
    [],
  );

  const endEdgeDrag = useCallback(
    (
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
   * LONG PRESS DOS CHATS
   * ============================================================
   */

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(
        longPressTimerRef.current,
      );

      longPressTimerRef.current = null;
    }
  }, []);

  const startChatLongPress = useCallback(
    (
      event: ReactPointerEvent<HTMLDivElement>,
      conversation: Conversation,
    ) => {
      if (
        event.pointerType === "mouse" &&
        event.button !== 0
      ) {
        return;
      }

      clearLongPress();

      longPressTriggeredRef.current = false;

      longPressTimerRef.current =
        window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          setChatMenuId(conversation.id);
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

  /*
   * ============================================================
   * SELECIONAR CHAT
   * ============================================================
   */

  const selectConversation =
    useCallback(
      async (
        conversation: Conversation,
      ) => {
        if (
          longPressTriggeredRef.current
        ) {
          longPressTriggeredRef.current = false;
          return;
        }

        setActiveConversationId(
          conversation.id,
        );

        setChatMenuId(null);
        closeSidebar();

        /*
         * Mantém a seleção visual imediatamente.
         *
         * Se a tabela de mensagens existir no projeto,
         * carregamos as mensagens dessa conversa.
         */
        const { data } = await supabase
          .from("messages")
          .select(
            "id,role,content",
          )
          .eq(
            "conversation_id",
            conversation.id,
          )
          .order("created_at", {
            ascending: true,
          });

        if (data) {
          setMessages(
            data as ChatMessage[],
          );
        }
      },
      [closeSidebar],
    );

  /*
   * ============================================================
   * RENOMEAR CHAT
   * ============================================================
   */

  const openRenameChat = useCallback(
    (conversation: Conversation) => {
      setChatMenuId(null);
      setRenameChatId(
        conversation.id,
      );
      setRenameValue(
        conversation.title,
      );
    },
    [],
  );

  const cancelRenameChat =
    useCallback(() => {
      setRenameChatId(null);
      setRenameValue("");
    }, []);

  const saveRenamedChat =
    useCallback(async () => {
      if (
        !renameChatId ||
        !renameValue.trim()
      ) {
        return;
      }

      const safeTitle =
        renameValue
          .trim()
          .slice(0, 80);

      const { error } =
        await supabase
          .from("conversations")
          .update({
            title: safeTitle,
            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            renameChatId,
          )
          .eq(
            "user_id",
            userId,
          );

      if (error) {
        setError(
          "Não foi possível renomear o chat.",
        );
        return;
      }

      setConversations(
        (current) =>
          current.map(
            (conversation) =>
              conversation.id ===
              renameChatId
                ? {
                    ...conversation,
                    title: safeTitle,
                  }
                : conversation,
          ),
      );

      setRenameChatId(null);
      setRenameValue("");
    }, [
      renameChatId,
      renameValue,
      userId,
    ]);

  /*
   * ============================================================
   * DELETAR CHAT
   * ============================================================
   */

  const openDeleteChat =
    useCallback(
      (conversation: Conversation) => {
        setChatMenuId(null);
        setDeleteChatId(
          conversation.id,
        );
      },
      [],
    );

  const cancelDeleteChat =
    useCallback(() => {
      setDeleteChatId(null);
    }, []);

  const confirmDeleteChat =
    useCallback(async () => {
      if (!deleteChatId) {
        return;
      }

      const { error } =
        await supabase
          .from("conversations")
          .delete()
          .eq(
            "id",
            deleteChatId,
          )
          .eq(
            "user_id",
            userId,
          );

      if (error) {
        setError(
          "Não foi possível deletar o chat.",
        );
        return;
      }

      setConversations(
        (current) =>
          current.filter(
            (conversation) =>
              conversation.id !==
              deleteChatId,
          ),
      );

      if (
        activeConversationId ===
        deleteChatId
      ) {
        setActiveConversationId(
          null,
        );
        setMessages([]);
      }

      setDeleteChatId(null);
    }, [
      deleteChatId,
      userId,
      activeConversationId,
    ]);

  /*
   * ============================================================
   * NOVA CONVERSA
   * ============================================================
   */

  const startNewConversation =
    useCallback(() => {
      setMessages([]);
      setInput("");
      setError("");
      setLikes({});
      setDislikes({});
      setCopiedMessageId(null);
      setActiveConversationId(null);
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

  const saveConversationTitle =
    useCallback(
      async (title: string) => {
        if (
          !userId ||
          !title.trim()
        ) {
          return;
        }

        const safeTitle = title
          .trim()
          .slice(0, 80);

        const { data, error: insertError } =
          await supabase
            .from("conversations")
            .insert({
              user_id: userId,
              title: safeTitle,
            })
            .select(
              "id,title,created_at,updated_at",
            )
            .single();

        if (!insertError && data) {
          setActiveConversationId(
            data.id,
          );

          setConversations(
            (current) => [
              data,
              ...current.filter(
                (conversation) =>
                  conversation.id !==
                  data.id,
              ),
            ],
          );
        }
      },
      [userId],
    );

  /*
   * ============================================================
   * AI
   * ============================================================
   */

  const getAIName = useCallback(
    async () => {
      if (!userId) {
        return "decidly-ai-free";
      }

      const { data } = await supabase
        .from("subscription")
        .select(
          "plan,status,expires_at",
        )
        .eq("user_id", userId)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

      const subscription =
        data as Subscription | null;

      if (!subscription) {
        return "decidly-ai-free";
      }

      const active =
        subscription.status ===
          "active" ||
        subscription.status ===
          "trialing";

      const isVIP =
        subscription.plan ===
          "vip" ||
        subscription.plan ===
          "VIP";

      const notExpired =
        !subscription.expires_at ||
        new Date(
          subscription.expires_at,
        ).getTime() > Date.now();

      if (
        active &&
        isVIP &&
        notExpired
      ) {
        return "decidly-ai";
      }

      return "decidly-ai-free";
    },
    [userId],
  );

  /*
   * ============================================================
   * SEND
   * ============================================================
   */

  const sendMessage = useCallback(
    async () => {
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
        const functionName =
          await getAIName();

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

          if (
            status === 401 ||
            status === 403
          ) {
            throw new Error("AUTH");
          }

          if (
            status &&
            status >= 500
          ) {
            throw new Error("SERVER");
          }

          throw new Error("AI_ERROR");
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
          throw new Error(
            "AI_ERROR",
          );
        }

        const assistantMessage: ChatMessage =
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: answer,
          };

        setMessages((current) => [
          ...current,
          assistantMessage,
        ]);

        if (
          messages.length === 0 &&
          !activeConversationId
        ) {
          await saveConversationTitle(
            text,
          );
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
        } else if (
          message === "429"
        ) {
          setError(
            "Muitas solicitações no momento. Tente novamente em instantes.",
          );
        } else if (
          message === "AUTH"
        ) {
          setError(
            "Sua sessão não pôde ser validada. Entre novamente.",
          );
        } else if (
          message === "SERVER"
        ) {
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
         * NÃO focar novamente o textarea.
         * Mantém o comportamento instantâneo atual.
         */
        setIsLoading(false);
      }
    },
    [
      input,
      isLoading,
      userId,
      getAIName,
      messages,
      saveConversationTitle,
      activeConversationId,
    ],
  );

  /*
   * ============================================================
   * TEXTAREA
   * ============================================================
   */

  const resizeTextarea =
    useCallback(() => {
      const textarea =
        textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.style.height = "auto";

      textarea.style.height =
        `${Math.min(
          Math.max(
            textarea.scrollHeight,
            58,
          ),
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
      (event.ctrlKey ||
        event.metaKey)
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

  const toggleListening =
    useCallback(() => {
      if (
        typeof window ===
          "undefined" ||
        (!(
          "webkitSpeechRecognition" in
          window
        ) &&
          !(
            "SpeechRecognition" in
            window
          ))
      ) {
        setError(
          "O reconhecimento de voz não é compatível com este navegador.",
        );
        return;
      }

      if (listening) {
        recognitionRef.current?.stop();
        recognitionRef.current =
          null;
        setListening(false);
        return;
      }

      const SpeechRecognitionConstructor =
        window.SpeechRecognition ??
        window.webkitSpeechRecognition;

      if (
        !SpeechRecognitionConstructor
      ) {
        setError(
          "O reconhecimento de voz não é compatível com este navegador.",
        );
        return;
      }

      const recognition =
        new SpeechRecognitionConstructor();

      recognition.lang =
        speechLanguage;

      recognition.continuous = false;
      recognition.interimResults =
        false;
      recognition.maxAlternatives = 1;

      lastTranscriptRef.current = "";

      recognition.onstart = () => {
        setListening(true);
        setError("");
      };

      recognition.onresult = (
        event,
      ) => {
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
          result[0]?.transcript?.trim() ??
          "";

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
          const currentText =
            current.trim();

          if (!currentText) {
            return transcript;
          }

          const currentWords =
            currentText
              .split(/\s+/)
              .filter(Boolean);

          const transcriptWords =
            transcript
              .split(/\s+/)
              .filter(Boolean);

          const maxOverlap =
            Math.min(
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
            const a =
              currentWords
                .slice(-size)
                .join(" ")
                .toLowerCase();

            const b =
              transcriptWords
                .slice(0, size)
                .join(" ")
                .toLowerCase();

            if (a === b) {
              overlap = size;
              break;
            }
          }

          const remaining =
            transcriptWords.slice(
              overlap,
            );

          if (
            remaining.length === 0
          ) {
            return currentText;
          }

          return `${currentText} ${remaining.join(
            " ",
          )}`;
        });
      };

      recognition.onerror = (
        event,
      ) => {
        if (
          event.error ===
          "not-allowed"
        ) {
          setError(
            "Permita o acesso ao microfone para usar a voz.",
          );
        } else if (
          event.error !== "aborted"
        ) {
          setError(
            "Não foi possível reconhecer sua voz. Tente novamente.",
          );
        }

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
    }, [
      listening,
      speechLanguage,
    ]);

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
      typeof window ===
        "undefined" ||
      !(
        "speechSynthesis" in
        window
      )
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

  const findBestVoice =
    useCallback(
      (
        language: string,
        gender: VoiceGender,
      ) => {
        if (
          availableVoices.length === 0
        ) {
          return null;
        }

        const normalizedLanguage =
          language.toLowerCase();

        const languageCode =
          normalizedLanguage.split(
            "-",
          )[0];

        const languageVoices =
          availableVoices.filter(
            (voice) => {
              const voiceLanguage =
                voice.lang.toLowerCase();

              return (
                voiceLanguage ===
                  normalizedLanguage ||
                voiceLanguage.startsWith(
                  `${languageCode}-`,
                )
              );
            },
          );

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

        const genderVoice =
          candidates.find(
            (voice) => {
              const name =
                voice.name.toLowerCase();

              return keywords.some(
                (keyword) =>
                  name.includes(
                    keyword,
                  ),
              );
            },
          );

        return (
          genderVoice ??
          candidates.find(
            (voice) =>
              voice.default,
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

  const stopReading =
    useCallback(() => {
      speechSessionRef.current += 1;

      if (
        typeof window !==
          "undefined" &&
        "speechSynthesis" in
          window
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
        typeof window ===
          "undefined" ||
        !(
          "speechSynthesis" in
          window
        )
      ) {
        setError(
          "A leitura em voz alta não é compatível com este navegador.",
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

      speechSessionRef.current += 1;

      const session =
        speechSessionRef.current;

      setReadingMessageId(
        message.id,
      );

      setReadingCharIndex(-1);

      const utterance =
        new SpeechSynthesisUtterance(
          message.content,
        );

      utterance.rate = 1.15;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang =
        speechLanguage;

      const voice =
        findBestVoice(
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

        setReadingMessageId(
          message.id,
        );
      };

      utterance.onboundary = (
        event,
      ) => {
        if (
          speechSessionRef.current !==
          session
        ) {
          return;
        }

        if (
          event.name === "word"
        ) {
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

      speechRef.current =
        utterance;

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
        typeof window !==
          "undefined" &&
        "speechSynthesis" in
          window
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
      return text;
    }

    const word = match[0];

    const wordStart = charIndex;

    const wordEnd =
      wordStart + word.length;

    return (
      <>
        {before}

        <mark className="rounded-md bg-[#8B5CF6]/35 px-1 text-white">
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
   * ============================================================
   * COPY
   * ============================================================
   */

  const copyMessage =
    useCallback(
      async (message: ChatMessage) => {
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

  const toggleLike = (
    id: string,
  ) => {
    setLikes((current) => ({
      ...current,
      [id]: !current[id],
    }));

    setDislikes((current) => ({
      ...current,
      [id]: false,
    }));
  };

  const toggleDislike = (
    id: string,
  ) => {
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
   * FILTER + PAGINAÇÃO
   * ============================================================
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

  const visibleConversations =
    filteredConversations.slice(
      0,
      visibleChatCount,
    );

  const hasMoreChats =
    visibleChatCount <
    filteredConversations.length;

  const showViewAll =
    visibleChatCount >
      INITIAL_CHAT_LIMIT &&
    hasMoreChats;

  /*
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white"
      onPointerDown={() => {
        if (chatMenuId) {
          setChatMenuId(null);
        }
      }}
    >
      {/* ======================================================
          MENU FIXO
          ====================================================== */}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          sidebarOpen
            ? closeSidebar()
            : openSidebar();
        }}
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

      {/* ======================================================
          CONFIGURAÇÕES FIXAS
          ====================================================== */}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();

          setSpeechSettingsOpen(
            (current) => !current,
          );
        }}
        className="fixed right-4 top-4 z-[130] flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/70 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white"
        aria-label="Configurações de voz"
        aria-expanded={
          speechSettingsOpen
        }
      >
        <Settings size={20} />
      </button>

      {/* ======================================================
          PAINEL DE CONFIGURAÇÕES
          ====================================================== */}

      {speechSettingsOpen && (
        <div
          onPointerDown={(event) =>
            event.stopPropagation()
          }
          className="fixed right-4 top-[64px] z-[125] w-[260px] rounded-2xl bg-[#18101f] p-4 shadow-2xl ring-1 ring-white/10"
        >
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
                setSpeechSettingsOpen(
                  false,
                )
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

          <label className="mb-1.5 block text-xs text-white/45">
            Voz
          </label>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                setSpeechGender(
                  "male",
                )
              }
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                speechGender ===
                "male"
                  ? "bg-[#8B5CF6] text-white"
                  : "bg-white/[0.06] text-white/55 hover:bg-white/[0.09] hover:text-white"
              }`}
            >
              Masculina
            </button>

            <button
              type="button"
              onClick={() =>
                setSpeechGender(
                  "female",
                )
              }
              className={`rounded-xl px-3 py-2.5 text-sm transition ${
                speechGender ===
                "female"
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

      {/* ======================================================
          SWIPE DA BORDA
          ====================================================== */}

      {!sidebarOpen && (
        <div
          className="fixed left-0 top-0 z-[105] h-full w-5 touch-none"
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
        onPointerDown={(event) =>
          event.stopPropagation()
        }
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

            {/* ÚNICO X DO SIDEBAR.
                O X circular fixo externo não é usado para
                representar o fechamento do sidebar. */}
            <button
              type="button"
              onClick={
                closeSidebar
              }
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/5 hover:text-white"
              aria-label="Fechar menu"
            >
              <X size={19} />
            </button>
          </div>

          <div className="px-3">
            <button
              type="button"
              onClick={
                startNewConversation
              }
              className="flex w-full items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium transition hover:bg-white/[0.09]"
            >
              <Plus size={18} />
              Nova conversa
            </button>
          </div>

          <div className="px-3 pt-3">
            <div className="flex items-center gap-2 rounded-xl bg-white/[0.045] px-3 py-2.5">
              <Search
                size={17}
                className="shrink-0 text-white/35"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(
                    event.target.value,
                  );
                  setVisibleChatCount(
                    INITIAL_CHAT_LIMIT,
                  );
                }}
                placeholder="Pesquisar"
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
              />
            </div>
          </