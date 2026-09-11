import { createFileRoute, useNavigate } from "@tanstack/react-router";
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
  ArrowUp,
  AudioLines,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Volume2,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { streamAi } from "../lib/ai-stream";

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

function AudioWave({ active }: { active: boolean }) {
  return (
    <span className="flex h-4 items-center gap-[2px]" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((bar) => (
        <span
          key={bar}
          className={`w-[2px] rounded-full bg-current ${active ? "audio-wave-bar" : "h-1"}`}
          style={active ? { animationDelay: `${bar * 90}ms` } : undefined}
        />
      ))}
    </span>
  );
}

function RealAudioWave({ levels }: { levels: number[] }) {
  return (
    <span
      className="flex h-8 flex-1 items-center justify-center gap-[2px] overflow-hidden"
      aria-hidden="true"
    >
      {levels.map((level, index) => (
        <span
          key={index}
          className="w-[3px] shrink-0 rounded-full bg-white/65 transition-[height] duration-75"
          style={{ height: `${Math.max(4, Math.round(level * 30))}px` }}
        />
      ))}
    </span>
  );
}

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
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("Organizando sua decisão...");
  const navigate = useNavigate();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [listening, setListening] = useState(false);
  const [waveformLevels, setWaveformLevels] = useState<number[]>(() =>
    Array.from({ length: 44 }, () => 0.12),
  );

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

  const [selectedVoiceName, setSelectedVoiceName] = useState("");

  const [speechSettingsOpen, setSpeechSettingsOpen] =
    useState(false);

  const [availableVoices, setAvailableVoices] =
    useState<SpeechSynthesisVoice[]>([]);

  const chatRef = useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);

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
        setUserEmail(user?.email ?? "");
        const metadata = user?.user_metadata as
          | { name?: string; full_name?: string; display_name?: string }
          | undefined;
        const accountName =
          metadata?.name?.trim() ||
            metadata?.full_name?.trim() ||
            metadata?.display_name?.trim() ||
            user?.email?.split("@")[0] ||
            "";
        setUserName(accountName);
        setPreferredName(
          window.localStorage.getItem("decidly-preferred-name")?.trim() || accountName,
        );
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
            setUserEmail(session?.user?.email ?? "");
            const metadata = session?.user?.user_metadata as
              | { name?: string; full_name?: string; display_name?: string }
              | undefined;
            const accountName =
              metadata?.name?.trim() ||
                metadata?.full_name?.trim() ||
                metadata?.display_name?.trim() ||
                session?.user?.email?.split("@")[0] ||
                "";
            setUserName(accountName);
            setPreferredName(
              window.localStorage.getItem("decidly-preferred-name")?.trim() || accountName,
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

      const savedConversationId = window.localStorage.getItem(
        `decidly-active-conversation:${userId}`,
      );
      const savedConversation = data?.find(
        (conversation) => conversation.id === savedConversationId,
      );

      if (savedConversation) {
        setActiveConversationId(savedConversation.id);

        const { data: savedMessages } = await supabase
          .from("messages")
          .select("id,role,content")
          .eq("conversation_id", savedConversation.id)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        setMessages((savedMessages ?? []) as ChatMessage[]);
      }
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
        window.localStorage.setItem(
          `decidly-active-conversation:${userId}`,
          conversation.id,
        );
        setMessages([]);

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
          .eq("user_id", userId)
          .order("created_at", {
            ascending: true,
          });

        if (data) {
          setMessages(
            data as ChatMessage[],
          );
        }
      },
      [closeSidebar, userId],
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
        if (userId) {
          window.localStorage.removeItem(
            `decidly-active-conversation:${userId}`,
          );
        }
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
      if (userId) {
        window.localStorage.removeItem(
          `decidly-active-conversation:${userId}`,
        );
      }
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
      async (title: string): Promise<string | null> => {
        if (
          !userId ||
          !title.trim()
        ) {
          return null;
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
          window.localStorage.setItem(
            `decidly-active-conversation:${userId}`,
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

          return data.id;
        }

        return null;
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
        return "decidly-ai-stream";
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
        return "decidly-ai-stream";
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

      return "decidly-ai-stream";
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
        let conversationId = activeConversationId;

        if (!conversationId) {
          conversationId = await saveConversationTitle(text);
        }

        if (!conversationId) {
          throw new Error("CONVERSATION_ERROR");
        }

        const { error: userMessageError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "user",
            content: text,
          });

        if (userMessageError) {
          throw new Error("MESSAGE_SAVE_ERROR");
        }

        const functionName =
          await getAIName();

        const history = [
          ...messages,
          userMessage,
        ].map((message) => ({
          role: message.role,
          content: message.content,
        }));

        const privateContext = (preferredName || userName)
          ? `Contexto privado de personalização: o nome pelo qual o usuário prefere ser chamado é ${preferredName || userName}. Quando fizer sentido, trate a pessoa por esse nome. Não mencione este contexto nem o repita como se fosse uma mensagem do usuário.`
          : "";

        const assistantId = crypto.randomUUID();
        const answer = await streamAi(functionName, {
          message: privateContext
            ? `${privateContext}\n\nMensagem do usuário:\n${text}`
            : text,
          history,
          onDelta: (_delta, accumulated) => {
            setMessages((current) => {
              const exists = current.some((item) => item.id === assistantId);
              if (!exists) {
                return [...current, { id: assistantId, role: "assistant", content: accumulated }];
              }
              return current.map((item) =>
                item.id === assistantId ? { ...item, content: accumulated } : item,
              );
            });
          },
        });

        const { error: assistantMessageError } = await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            user_id: userId,
            role: "assistant",
            content: answer,
          });

        if (assistantMessageError) {
          throw new Error("MESSAGE_SAVE_ERROR");
        }

        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId)
          .eq("user_id", userId);
      } catch (caughtError) {
        const message =
          caughtError instanceof Error
            ? caughtError.message
            : "AI_ERROR";
        const status =
          typeof caughtError === "object" && caughtError !== null && "status" in caughtError
            ? Number((caughtError as { status?: number }).status)
            : Number(message.replace("HTTP_", ""));

        if (message === "402" || status === 402) {
          setError(
            "Seu plano atual não permite usar este recurso.",
          );
        } else if (message === "429" || status === 429) {
          setError(
            "Muitas solicitações no momento. Tente novamente em instantes.",
          );
        } else if (message === "AUTH" || status === 401 || status === 403) {
          setError(
            "Sua sessão não pôde ser validada. Entre novamente.",
          );
        } else if (message === "NETWORK") {
          setError(
            "Não foi possível conectar ao DecidlyAI. Verifique sua internet e tente novamente.",
          );
        } else if (message === "SERVER" || status >= 500) {
          setError(
            "O serviço está temporariamente indisponível.",
          );
        } else if (
          message === "CONVERSATION_ERROR" ||
          message === "MESSAGE_SAVE_ERROR"
        ) {
          setError(
            "Não foi possível salvar esta conversa. Verifique sua conexão e tente novamente.",
          );
        } else {
          setError(
            import.meta.env.DEV
              ? `Falha da IA: ${message}`
              : `Não foi possível obter uma resposta agora. ${message && message !== "AI_ERROR" ? message : "Tente novamente."}`,
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
      userName,
      preferredName,
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

  const stopAudioCapture = useCallback(() => {
    if (waveformFrameRef.current !== null) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    analyserRef.current = null;
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      void audioContextRef.current.close();
    }
    audioContextRef.current = null;
    setWaveformLevels(Array.from({ length: 44 }, () => 0.12));
  }, []);

  const startAudioCapture = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("MIC_UNSUPPORTED");
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextConstructor) {
      stream.getTracks().forEach((track) => track.stop());
      throw new Error("AUDIO_UNSUPPORTED");
    }
    const context = new AudioContextConstructor();
    await context.resume();
    const analyser = context.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.72;
    context.createMediaStreamSource(stream).connect(analyser);
    mediaStreamRef.current = stream;
    audioContextRef.current = context;
    analyserRef.current = analyser;

    const data = new Uint8Array(analyser.frequencyBinCount);
    const draw = () => {
      analyser.getByteFrequencyData(data);
      const levels = Array.from({ length: 44 }, (_, index) => {
        const sourceIndex = Math.floor((index / 44) * data.length);
        return Math.max(0.1, Math.min(1, (data[sourceIndex] ?? 0) / 110));
      });
      setWaveformLevels(levels);
      waveformFrameRef.current = window.requestAnimationFrame(draw);
    };
    draw();
  }, []);

  const toggleListening =
  useCallback(() => {
      if (listening) {
        recognitionRef.current?.stop();
        recognitionRef.current =
          null;
        stopAudioCapture();
        setListening(false);
        return;
      }

      const SpeechRecognitionConstructor =
        window.SpeechRecognition ??
        window.webkitSpeechRecognition;

      if (!SpeechRecognitionConstructor) {
        void startAudioCapture()
          .then(() => {
            setListening(true);
            setError("O microfone está ativo, mas este navegador não oferece transcrição automática.");
          })
          .catch(() => setError("Permita o acesso ao microfone para usar a voz."));
        return;
      }

      const recognition = new SpeechRecognitionConstructor();

      recognition.lang =
        speechLanguage;

      recognition.continuous = true;
      recognition.interimResults = true;
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

        if (!result) {
          return;
        }

        const transcript =
          result[0]?.transcript?.trim() ??
          "";

        if (!transcript || !result.isFinal) {
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
        } else if (event.error === "audio-capture") {
          setError("O microfone não foi encontrado ou está sendo usado por outro aplicativo.");
        } else if (event.error === "no-speech") {
          setError("Nenhuma fala foi detectada. Toque no microfone e fale novamente.");
        } else if (event.error === "network") {
          setError("O reconhecimento de voz precisa de conexão com a internet neste navegador.");
        } else if (event.error !== "aborted") {
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
        stopAudioCapture();
      };

      recognitionRef.current = recognition;

      try {
        recognition.start();
        setListening(true);
      } catch {
        setError("Não foi possível iniciar o reconhecimento. Toque novamente no microfone.");
        recognitionRef.current = null;
        return;
      }

      void startAudioCapture().catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "NotAllowedError") {
            setError("Permita o acesso ao microfone para usar a voz.");
          } else if (error instanceof Error && error.message === "MIC_UNSUPPORTED") {
            setError("Este navegador não oferece captura de áudio para o microfone.");
          } else {
            setError("Não foi possível iniciar o microfone. Verifique a permissão do navegador.");
          }
          stopAudioCapture();
          if (recognitionRef.current) recognitionRef.current.abort();
        });
    }, [
      listening,
      speechLanguage,
      startAudioCapture,
      stopAudioCapture,
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

        const selectedVoice = candidates.find(
          (voice) => voice.name === selectedVoiceName,
        );
        if (selectedVoice) return selectedVoice;

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
      [availableVoices, selectedVoiceName],
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

      const voice =
        findBestVoice(
          speechLanguage,
          speechGender,
        );
      const speakableText = message.content
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[*_#>`~-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      const chunks = speakableText.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [speakableText];
      let chunkIndex = 0;

      const speakNext = () => {
        if (speechSessionRef.current !== session || chunkIndex >= chunks.length) {
          speechRef.current = null;
          setReadingMessageId(null);
          setReadingCharIndex(-1);
          return;
        }

        const utterance = new SpeechSynthesisUtterance(chunks[chunkIndex++].trim());
        utterance.rate = 1.05;
        utterance.pitch = 1;
        utterance.volume = 1;
        utterance.lang = voice?.lang || speechLanguage;
        if (voice) utterance.voice = voice;
        utterance.onstart = () => setReadingMessageId(message.id);
        utterance.onboundary = (event) => {
          if (speechSessionRef.current === session && event.name === "word") {
            setReadingCharIndex(event.charIndex);
          }
        };
        utterance.onend = speakNext;
        utterance.onerror = () => {
          if (speechSessionRef.current === session) {
            setError("Não foi possível reproduzir o áudio. Toque novamente para tentar.");
            stopReading();
          }
        };
        speechRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      };

      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      speakNext();
    },
    [
      readingMessageId,
      speechLanguage,
      speechGender,
      selectedVoiceName,
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

      stopAudioCapture();
    };
  }, [stopAudioCapture]);

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

  useEffect(() => {
    if (!isLoading) {
      setThinkingLabel("Organizando sua decisão...");
      return;
    }

    const labels = [
      "Organizando sua decisão...",
      "Comparando possibilidades...",
      "Preparando uma perspectiva útil...",
    ];
    let index = 0;
    const timer = window.setInterval(() => {
      index = (index + 1) % labels.length;
      setThinkingLabel(labels[index]);
    }, 1800);

    return () => window.clearInterval(timer);
  }, [isLoading]);

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

    {!sidebarOpen && (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      openSidebar();
    }}
    className="fixed left-4 top-4 z-[130] flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/75 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white"
    aria-label="Abrir menu"
  >
    <Menu size={21} />
  </button>
)}

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

          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-xs text-white/45">Vozes disponíveis</label>
              <span className="text-[10px] text-white/30">{availableVoices.length}</span>
            </div>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-xl bg-white/[0.04] p-2">
              {availableVoices.length > 0 ? (
                availableVoices.map((voice) => (
                  <div key={`${voice.name}-${voice.lang}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[11px] text-white/60">
                    <span className="truncate">{voice.name}</span>
                    <span className="shrink-0 text-white/30">{voice.lang}</span>
                  </div>
                ))
              ) : (
                <p className="px-2 py-1 text-[11px] leading-4 text-white/35">O navegador ainda não disponibilizou vozes.</p>
              )}
            </div>
          </div>

          <select
            value={selectedVoiceName}
            onChange={(event) => setSelectedVoiceName(event.target.value)}
            className="mt-2 w-full rounded-xl bg-white/[0.06] px-3 py-2.5 text-xs text-white outline-none"
            aria-label="Selecionar voz do navegador"
          >
            <option value="" className="bg-[#18101f]">Automática</option>
            {availableVoices.map((voice) => (
              <option key={`${voice.name}-option-${voice.lang}`} value={voice.name} className="bg-[#18101f]">
                {voice.name} · {voice.lang}
              </option>
            ))}
          </select>

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
          </div>

          {/* ==================================================
              LISTA DE CHATS
              ================================================== */}

          <div className="mt-3 flex-1 overflow-y-auto px-3 pb-4">
            {visibleConversations.length ===
            0 ? (
              <div className="px-3 py-8 text-center text-sm text-white/35">
                Nenhuma conversa encontrada.
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  {visibleConversations.map(
                    (conversation) => {
                      const isActive =
                        activeConversationId ===
                        conversation.id;

                      const isMenuOpen =
                        chatMenuId ===
                        conversation.id;

                      return (
                        <div
                          key={
                            conversation.id
                          }
                          className="relative"
                          onPointerDown={(
                            event,
                          ) => {
                            event.stopPropagation();

                            startChatLongPress(
                              event,
                              conversation,
                            );
                          }}
                          onPointerUp={
                            cancelChatLongPress
                          }
                          onPointerCancel={
                            cancelChatLongPress
                          }
                          onPointerLeave={
                            cancelChatLongPress
                          }
                        >
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();

                              void selectConversation(
                                conversation,
                              );
                            }}
                            className={`w-full rounded-xl px-3 py-3 pr-10 text-left text-sm transition ${
                              isActive
                                ? "bg-white/[0.13] text-white"
                                : "text-white/70 hover:bg-white/[0.05] hover:text-white"
                            }`}
                          >
                            <div className="truncate font-medium">
                              {
                                conversation.title
                              }
                            </div>
                          </button>

                          {/* Menu aparece somente após segurar */}
                          {isMenuOpen && (
                            <div
                              onPointerDown={(
                                event,
                              ) =>
                                event.stopPropagation()
                              }
                              className="absolute right-2 top-[calc(100%-4px)] z-[140] w-[180px] overflow-hidden rounded-xl bg-[#21152d] p-1 shadow-2xl ring-1 ring-white/10"
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  openRenameChat(
                                    conversation,
                                  )
                                }
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                Renomear chat
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  openDeleteChat(
                                    conversation,
                                  )
                                }
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-red-300 transition hover:bg-red-500/[0.08]"
                              >
                                Deletar chat
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {/* PRIMEIRO BOTÃO:
                    mostra 25 chats adicionais */}
                {hasMoreChats && (
                  <button
                    type="button"
                    onClick={() => {
                      setVisibleChatCount(
                        (current) =>
                          current +
                          LOAD_MORE_CHAT_LIMIT,
                      );
                    }}
                    className="mt-3 w-full rounded-xl px-3 py-2.5 text-sm text-white/50 transition hover:bg-white/[0.05] hover:text-white"
                  >
                    Ver mais
                  </button>
                )}

                {/* Quando já foram carregados mais de 15
                    e ainda existem chats, oferece Ver tudo */}
                {showViewAll && (
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleChatCount(
                        filteredConversations.length,
                      )
                    }
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-sm text-white/35 transition hover:bg-white/[0.05] hover:text-white/70"
                  >
                    Ver tudo
                  </button>
                )}
              </>
            )}
          </div>

          {/* ==================================================
              CONTA + CONFIGURAÇÕES
              ================================================== */}

          <div className="border-t border-white/[0.06] px-3 py-3">
            <button
              type="button"
              onClick={() => setAccountOpen(true)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                <span className="text-xs font-semibold">
                  {(userName.trim().charAt(0) || "C").toUpperCase()}
                </span>
              </div>

              <span className="min-w-0 truncate">{userName || "Conta"}</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSpeechSettingsOpen(
                  true,
                )
              }
              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-white/60 transition hover:bg-white/[0.05] hover:text-white"
            >
              <Settings size={18} />
              <span>Configurações</span>
            </button>
          </div>

          {/* Handle independente */}
          <div
            className="absolute right-0 top-0 h-full w-5 touch-none"
            onPointerDown={
              beginSidebarDrag
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
        </div>
      </aside>

      {/* ======================================================
          BACKDROP
          ====================================================== */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Fechar menu"
          className="fixed inset-0 z-[90] bg-black/45"
          onClick={
            closeSidebar
          }
        />
      )}

      {/* ======================================================
          MODAL RENOMEAR
          ====================================================== */}

      {renameChatId && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4"
          onPointerDown={
            cancelRenameChat
          }
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#18101f] p-5 shadow-2xl ring-1 ring-white/10"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2 className="text-base font-semibold">
              Renomear chat
            </h2>

            <input
              autoFocus
              value={renameValue}
              onChange={(event) =>
                setRenameValue(
                  event.target.value,
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  void saveRenamedChat();
                }

                if (
                  event.key ===
                  "Escape"
                ) {
                  cancelRenameChat();
                }
              }}
              className="mt-4 w-full rounded-xl bg-white/[0.06] px-3 py-3 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-[#8B5CF6]/50"
            />

            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={
                  cancelRenameChat
                }
                className="rounded-xl px-4 py-2.5 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void saveRenamedChat()
                }
                className="rounded-xl bg-[#8B5CF6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9B6AF7]"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================
          CONFIRMAÇÃO DELETAR
          ====================================================== */}

      {deleteChatId && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 px-4"
          onPointerDown={
            cancelDeleteChat
          }
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-[#18101f] p-5 shadow-2xl ring-1 ring-white/10"
            onPointerDown={(event) =>
              event.stopPropagation()
            }
          >
            <h2 className="text-base font-semibold">
              Deletar chat?
            </h2>

            <p className="mt-2 text-sm leading-6 text-white/45">
              Essa ação não poderá ser
              desfeita.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={
                  cancelDeleteChat
                }
                className="rounded-xl px-4 py-2.5 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void confirmDeleteChat()
                }
                className="rounded-xl bg-red-500/15 px-4 py-2.5 text-sm font-medium text-red-300 hover:bg-red-500/25"
              >
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}

      {accountOpen && (
        <div
          className="fixed inset-0 z-[320] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
          onPointerDown={() => setAccountOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border border-white/10 bg-[#18101f] p-6 shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Sua conta</p>
                <h2 className="mt-2 text-2xl font-semibold">Como prefere ser chamado?</h2>
                <p className="mt-2 text-sm text-white/35">{userEmail || "Conta autenticada"}</p>
                <p className="mt-3 text-sm leading-6 text-white/45">Esse nome personaliza suas conversas. Ele não aparece como uma mensagem no chat.</p>
              </div>
              <button type="button" onClick={() => setAccountOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar conta"><X size={18} /></button>
            </div>
            <label className="mt-6 block text-sm font-medium text-white/75" htmlFor="preferred-name">Nome de preferência</label>
            <input
              id="preferred-name"
              value={preferredName}
              onChange={(event) => setPreferredName(event.target.value.slice(0, 40))}
              placeholder={userName || "Ex.: Davi"}
              className="mt-2 h-12 w-full rounded-xl border border-white/10 bg-black/20 px-4 text-white outline-none placeholder:text-white/25 focus:border-violet-300/50"
            />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setAccountOpen(false)} className="rounded-xl px-4 py-3 text-sm text-white/55 hover:bg-white/[0.06] hover:text-white">Cancelar</button>
              <button type="button" onClick={() => { window.localStorage.setItem("decidly-preferred-name", preferredName.trim()); setAccountOpen(false); }} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400">Salvar preferência</button>
            </div>
            <button type="button" onClick={() => { void supabase.auth.signOut(); navigate({ to: "/login" }); }} className="mt-5 w-full rounded-xl border border-red-400/20 px-4 py-3 text-sm text-red-300 hover:bg-red-400/[0.08]">Sair da conta</button>
          </div>
        </div>
      )}

      {/* ======================================================
          CHAT
          ====================================================== */}

      <main className="relative z-10 h-[100dvh] min-h-0 overflow-hidden">
        <div
          ref={chatRef}
          className="h-full overflow-y-auto px-4 pb-40 pt-4 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            {messages.length ===
              0 && (
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
                    {userName ? `Olá, ${userName.split(" ")[0]}!` : "O que você está decidindo?"}
                  </h1>
                </div>

                <p className="max-w-md text-center text-sm leading-6 text-white/45">
                  {userName
                    ? "Explique a situação, as opções que você tem e o que está te deixando em dúvida."
                    : "Explique a situação, as opções que você tem e o que está te deixando em dúvida."}
                </p>

                <div className="mt-7 grid w-full max-w-xl gap-2 sm:grid-cols-3">
                  {[
                    "Devo aceitar uma nova oportunidade?",
                    "Como comparar duas opções?",
                    "Quero organizar uma decisão importante",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => {
                        setInput(suggestion);
                        requestAnimationFrame(() => textareaRef.current?.focus());
                      }}
                      className="rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3 text-left text-xs leading-5 text-white/55 transition hover:border-violet-300/30 hover:bg-violet-400/[0.08] hover:text-white"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.length >
              0 && (
              <div className="space-y-7 pt-16">
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
                              ? "max-w-[88%] rounded-2xl bg-[#8B5CF6] px-4 py-3 text-[15px] leading-6 text-white"
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
                                          {
                                            children
                                          }
                                        </p>
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

                                      li: ({
                                        children,
                                      }) => (
                                        <li>
                                          {
                                            children
                                          }
                                        </li>
                                      ),

                                      code: ({
                                        children,
                                      }) => (
                                        <code className="rounded-md bg-white/10 px-1.5 py-0.5 text-sm">
                                          {
                                            children
                                          }
                                        </code>
                                      ),
                                    }}
                                  >
                                    {
                                      message.content
                                    }
                                  </ReactMarkdown>
                                )}
                              </div>

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
                                      size={
                                        16
                                      }
                                    />
                                  ) : (
                                    <Copy
                                      size={
                                        16
                                      }
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
                                    <AudioWave active />
                                  ) : (
                                    <Volume2 size={16} />
                                  )}
                                </button>
                              </div>
                            </>
                          ) : (
                            <div className="whitespace-pre-wrap">
                              {
                                message.content
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  },
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="text-sm text-white/45">
                      {thinkingLabel}
                    </div>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-red-400/15 bg-red-500/[0.06] px-4 py-3 text-sm text-red-200/80">
                <span>{error}</span>
                <button type="button" onClick={() => setError("")} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-red-200 hover:bg-red-400/10">Fechar</button>
              </div>
            )}

            {messages.length >
              0 && (
              <div className="mt-8 pb-6 text-center text-xs text-white/30">
                A DecidlyAI pode cometer erros. Verifique informações importantes.
              </div>
            )}
          </div>
        </div>

        {/* ======================================================
            COMPOSER
            ====================================================== */}

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
          <div className="relative mx-auto w-full max-w-[1024px]">
            <div
              className="h-[68px] rounded-[34px] bg-[#242424] px-3 py-2 shadow-2xl"
              style={{
                border: "none",
                outline: "none",
                boxShadow:
                  "0 20px 45px rgba(0,0,0,.25)",
              }}
            >
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  className="mb-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/10"
                  aria-label="Adicionar anexo ou ação"
                  title="Mais opções em breve"
                >
                  <Plus size={34} strokeWidth={1.7} />
                </button>

                {listening ? (
                  <RealAudioWave levels={waveformLevels} />
                ) : (
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    onFocus={handleTextareaFocus}
                    placeholder="Escreva sua decisão..."
                    rows={1}
                    className="min-h-[48px] max-h-[140px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2 text-[17px] leading-6 text-white placeholder:text-white/45 focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none", appearance: "none", WebkitAppearance: "none" }}
                  />
                )}

                <button
                  type="button"
                  onClick={
                    toggleListening
                  }
                  className={`mb-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition ${
                    listening
                      ? "bg-white/[0.08] text-white"
                      : "text-white/45 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-label={
                    listening
                      ? "Parar microfone"
                      : "Usar microfone"
                  }
                >
                  {listening ? <span className="block h-4 w-4 rounded-[3px] bg-white" /> : <Mic size={28} strokeWidth={1.8} />}
                </button>

                <button
                  type="button"
                  onClick={() => (input.trim() ? void sendMessage() : toggleListening())}
                  disabled={isLoading}
                  className="mb-0 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-white transition hover:bg-[#9B6AF7] disabled:cursor-not-allowed disabled:opacity-45"
                  aria-label={input.trim() ? "Enviar" : "Ativar voz"}
                >
                  {input.trim() ? <ArrowUp size={22} /> : <AudioLines size={24} strokeWidth={2.2} />}
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
