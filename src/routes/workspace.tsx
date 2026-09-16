import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
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
  MicOff,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Check,
  Coins,
  Volume2,
  Square,
  MoreHorizontal,
  Gift,
  Link2,
  Loader2,
  Share2,
  MessageSquareText,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { streamAi } from "../lib/ai-stream";
import { requestTtsAudio } from "../lib/tts";
import {
  availableCredits,
  dailyCreditsBalance,
  normalizeCreditWallet,
  type CreditWallet,
} from "../lib/credits";

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
  is_pinned?: boolean;
};

type Subscription = {
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

const SIDEBAR_MAX_WIDTH = 320;
const INITIAL_CHAT_LIMIT = 15;
const LOAD_MORE_CHAT_LIMIT = 25;
const WORKSPACE_EVENT = {
  id: "invite-30",
  label: "Convide e ganhe!",
  title: "Convide um amigo e ganhe 30 créditos",
  description: "Compartilhe seu link. Quando o convite for qualificado, você recebe 30 créditos nesta campanha.",
  reward: 30,
} as const;

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
  const [requestPhase, setRequestPhase] = useState<"idle" | "sending" | "thinking">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [accountOpen, setAccountOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [shareMessage, setShareMessage] = useState<ChatMessage | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<ChatMessage | null>(null);
  const [feedbackChoice, setFeedbackChoice] = useState<"like" | "dislike">("like");
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralCopied, setReferralCopied] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [creditWallet, setCreditWallet] = useState<CreditWallet>({
    free_credits: 0,
    purchased_credits: 0,
    total_credits: 0,
    daily_credits_used: 0,
    daily_credits_limit: 10,
    daily_credits_reset_at: null,
  });
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [thinkingLabel, setThinkingLabel] = useState("Organizando sua decisão...");
  const navigate = useNavigate();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  const [listening, setListening] = useState(false);
  const [likes, setLikes] = useState<Record<string, boolean>>({});
  const [dislikes, setDislikes] =
    useState<Record<string, boolean>>({});
  const [copiedMessageId, setCopiedMessageId] =
    useState<string | null>(null);

  const [readingMessageId, setReadingMessageId] =
    useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);

  const [readingCharIndex, setReadingCharIndex] =
    useState(-1);

  const chatRef = useRef<HTMLDivElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  const autoScrollRef = useRef(true);

  const lastTranscriptRef = useRef("");

  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speechSessionRef = useRef(0);
  const requestStartedAtRef = useRef<number | null>(null);

  const loadCreditWallet = useCallback(async () => {
    if (!userId) return;
    setCreditsLoading(true);
    const { data } = await supabase
      .from("ai_credits")
      .select("free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (data) {
      setCreditWallet(normalizeCreditWallet(data));
    }
    setCreditsLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setReferralCode("");
      return;
    }
    void supabase
      .from("referral_codes")
      .select("code")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => setReferralCode(typeof data?.code === "string" ? data.code : ""));
  }, [userId]);

  useEffect(() => {
    void loadCreditWallet();
    const timer = window.setInterval(() => void loadCreditWallet(), 15000);
    const refreshOnFocus = () => void loadCreditWallet();
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") void loadCreditWallet();
    };
    window.addEventListener("focus", refreshOnFocus);
    document.addEventListener("visibilitychange", refreshOnVisibility);

    if (!userId) {
      return () => {
        window.clearInterval(timer);
        window.removeEventListener("focus", refreshOnFocus);
        document.removeEventListener("visibilitychange", refreshOnVisibility);
      };
    }

    const channel = supabase
      .channel(`credits-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "ai_credits", filter: `user_id=eq.${userId}` }, () => {
        void loadCreditWallet();
      })
      .subscribe();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refreshOnFocus);
      document.removeEventListener("visibilitychange", refreshOnVisibility);
      void supabase.removeChannel(channel);
    };
  }, [loadCreditWallet]);

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
        if (!user) {
          setUserId(null);
          setUserEmail("");
          setUserName("");
          setPreferredName("");
          setConversations([]);
          setMessages([]);
          setActiveConversationId(null);
          void navigate({ to: "/login", replace: true });
          return;
        }

        setUserId(user.id);
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
            if (!session?.user) {
              setUserId(null);
              setUserEmail("");
              setUserName("");
              setPreferredName("");
              setConversations([]);
              setMessages([]);
              setActiveConversationId(null);
              void navigate({ to: "/login", replace: true });
              return;
            }

            setUserId(
              session.user.id,
            );
            setUserEmail(session.user.email ?? "");
            const metadata = session.user.user_metadata as
              | { name?: string; full_name?: string; display_name?: string }
              | undefined;
            const accountName =
              metadata?.name?.trim() ||
                metadata?.full_name?.trim() ||
                metadata?.display_name?.trim() ||
                session.user.email?.split("@")[0] ||
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
  }, [navigate]);

  /*
   * ============================================================
   * CONVERSATIONS
   * ============================================================
   */

  const loadConversations =
    useCallback(async () => {
      if (!userId) {
        setConversations([]);
        setMessages([]);
        setActiveConversationId(null);
        return;
      }

      const {
        data,
        error: conversationsError,
      } = await supabase
        .from("conversations")
        .select(
          "id,title,created_at,updated_at,is_pinned",
        )
        .eq("user_id", userId)
        .order("updated_at", {
          ascending: false,
        })
        .limit(1000);

      if (conversationsError) {
        return;
      }

      setConversations(
        ((data ?? []) as Conversation[]).sort((a, b) => {
          if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
        }),
      );
      setMessages([]);
      setActiveConversationId(null);

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

  useEffect(() => {
    if (!userId) {
      setLikes({});
      setDislikes({});
      return;
    }
    void supabase
      .from("message_feedback")
      .select("message_id,feedback,comment")
      .eq("user_id", userId)
      .then(({ data }) => {
        const nextLikes: Record<string, boolean> = {};
        const nextDislikes: Record<string, boolean> = {};
        (data ?? []).forEach((item) => {
          if (item.feedback === "like") nextLikes[item.message_id] = true;
          if (item.feedback === "dislike") nextDislikes[item.message_id] = true;
        });
        setLikes(nextLikes);
        setDislikes(nextDislikes);
      });
  }, [userId]);

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
      setRequestPhase("sending");
      setElapsedSeconds(0);
      requestStartedAtRef.current = Date.now();
      const abortController = new AbortController();
      streamAbortRef.current = abortController;

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
        let pendingFrame: number | null = null;
        let latestAccumulated = "";
        const flushAssistant = () => {
          pendingFrame = null;
          const content = latestAccumulated;
          if (!content) return;
          setMessages((current) => {
            const exists = current.some((item) => item.id === assistantId);
            if (!exists) return [...current, { id: assistantId, role: "assistant", content }];
            return current.map((item) => item.id === assistantId ? { ...item, content } : item);
          });
        };
        setRequestPhase("thinking");
        const answer = await streamAi(functionName, {
          message: privateContext
            ? `${privateContext}\n\nMensagem do usuário:\n${text}`
            : text,
          history,
          signal: abortController.signal,
          onDelta: (_delta, accumulated) => {
            if (requestPhase !== "thinking") {
              setRequestPhase("thinking");
              requestStartedAtRef.current = requestStartedAtRef.current || Date.now();
            }
            latestAccumulated = accumulated;
            if (chatRef.current) {
              const distanceFromBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight;
              autoScrollRef.current = distanceFromBottom < 120;
            }
            if (pendingFrame === null) pendingFrame = window.requestAnimationFrame(flushAssistant);
          },
        });

        if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
        latestAccumulated = answer;
        flushAssistant();

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
        if (caughtError instanceof DOMException && caughtError.name === "AbortError") {
          return;
        }
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
            "Seus créditos acabaram por agora. Você pode esperar a renovação diária ou abrir a área de créditos para ver as opções disponíveis.",
          );
        } else if (message === "429" || status === 429) {
          setError(
            "A IA está recebendo muitas solicitações. Aguarde alguns segundos e tente novamente — sua conversa continua salva.",
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
        setRequestPhase("idle");
        setElapsedSeconds(0);
        requestStartedAtRef.current = null;
        streamAbortRef.current = null;
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
      requestPhase,
    ],
  );

  const stopGeneration = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsLoading(false);
    setRequestPhase("idle");
    requestStartedAtRef.current = null;
  }, []);

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

      if (!SpeechRecognitionConstructor) {
        setError("Este navegador não oferece transcrição por voz. Use o Chrome ou Edge no Android.");
        return;
      }

      const recognition = new SpeechRecognitionConstructor();

      recognition.lang = "pt-BR";

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

    }, [
      listening,
    ]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  /*
   * ============================================================
   * STOP READING
   * ============================================================
   */

  const stopReading =
    useCallback(() => {
      speechSessionRef.current += 1;

      ttsAudioRef.current?.pause();
      if (ttsAudioRef.current) {
        ttsAudioRef.current.currentTime = 0;
        ttsAudioRef.current.src = "";
      }
      ttsAudioRef.current = null;

      setReadingLoading(false);
      setReadingMessageId(null);
      setReadingCharIndex(-1);
    }, []);

  /*
   * ============================================================
   * READ MESSAGE
   * ============================================================
   */

  const readMessage = useCallback(
    async (message: ChatMessage) => {
      if (
        readingMessageId ===
        message.id
      ) {
        stopReading();
        return;
      }

      speechSessionRef.current += 1;

      const session =
        speechSessionRef.current;

      setReadingMessageId(
        message.id,
      );
      setReadingLoading(true);

      setReadingCharIndex(-1);

      const speakableText = message.content
        .replace(/```[\s\S]*?```/g, " ")
        .replace(/[*_#>`~-]/g, "")
        .replace(/\s+/g, " ")
        .trim();
      try {
        const audio = await requestTtsAudio(speakableText);
        if (speechSessionRef.current !== session) return;
        ttsAudioRef.current = audio;
        setReadingLoading(false);
        audio.onended = () => {
          if (speechSessionRef.current === session) stopReading();
        };
        await audio.play();
      } catch {
        if (speechSessionRef.current !== session) return;
        if (typeof window.speechSynthesis === "undefined" || typeof window.SpeechSynthesisUtterance === "undefined") {
          setReadingLoading(false);
          setError("A leitura de voz não está disponível neste navegador.");
          stopReading();
          return;
        }
        const utterance = new SpeechSynthesisUtterance(speakableText);
        utterance.lang = language === "en-US" ? "en-US" : "pt-BR";
        utterance.rate = 0.98;
        utterance.onend = () => {
          if (speechSessionRef.current === session) stopReading();
        };
        utterance.onerror = () => {
          if (speechSessionRef.current === session) {
            setError("Não foi possível iniciar a leitura de voz.");
            stopReading();
          }
        };
        window.speechSynthesis.cancel();
        setReadingLoading(false);
        window.speechSynthesis.speak(utterance);
      }
    },
    [
      readingMessageId,
      stopReading,
      language,
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

  const saveFeedback = useCallback(async (id: string, feedback: "like" | "dislike", comment = "") => {
    if (!userId) return;
    setFeedbackSaving(true);
    const { error: deleteError } = await supabase.from("message_feedback").delete().eq("user_id", userId).eq("message_id", id);
    if (deleteError) {
      setFeedbackSaving(false);
      setError("Não foi possível registrar sua avaliação. Verifique sua conexão e tente novamente.");
      return;
    }
    const { error: insertError } = await supabase.from("message_feedback").insert({ user_id: userId, message_id: id, feedback, comment: comment.trim() || null });
    setFeedbackSaving(false);
    if (insertError) {
      setError("Não foi possível registrar sua avaliação. Verifique sua conexão e tente novamente.");
      return;
    }
    setLikes((current) => ({ ...current, [id]: feedback === "like" }));
    setDislikes((current) => ({ ...current, [id]: feedback === "dislike" }));
    setFeedbackMessage(null);
    setFeedbackComment("");
  }, [userId]);
  const openFeedback = useCallback((message: ChatMessage, feedback: "like" | "dislike") => {
    setFeedbackMessage(message);
    setFeedbackChoice(feedback);
    setFeedbackComment("");
  }, []);
  const toggleLike = useCallback((message: ChatMessage) => { openFeedback(message, "like"); }, [openFeedback]);
  const toggleDislike = useCallback((message: ChatMessage) => { openFeedback(message, "dislike"); }, [openFeedback]);

  const togglePinned = useCallback(async (conversation: Conversation) => {
    const nextPinned = !conversation.is_pinned;
    const { error: pinError } = await supabase.from("conversations").update({ is_pinned: nextPinned }).eq("id", conversation.id).eq("user_id", userId);
    if (pinError) {
      setError("Não foi possível atualizar esta conversa.");
      return;
    }
    setConversations((current) => current.map((item) => item.id === conversation.id ? { ...item, is_pinned: nextPinned } : item).sort((a, b) => Number(Boolean(b.is_pinned)) - Number(Boolean(a.is_pinned)) || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()));
    setChatMenuId(null);
  }, [userId]);

  const copyReferralLink = useCallback(async () => {
    if (!referralCode) return;
    await navigator.clipboard?.writeText(`${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`);
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 1800);
  }, [referralCode]);

  useEffect(() => {
    if (!isLoading || !requestStartedAtRef.current) return;
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - (requestStartedAtRef.current || Date.now())) / 1000)));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [isLoading]);

  /*
   * ============================================================
   * AUTO SCROLL
   * ============================================================
   */

  useEffect(() => {
    requestAnimationFrame(() => {
      if (chatRef.current && autoScrollRef.current) {
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

  const dailyBalance = dailyCreditsBalance(creditWallet);
  const usableCredits = availableCredits(creditWallet);

  return (
    <div
      className="workspace-shell relative min-h-[100dvh] overflow-hidden bg-[#0d0912] text-white"
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

      {!sidebarOpen && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setCreditsOpen(true);
            void loadCreditWallet();
          }}
          className="fixed right-4 top-4 z-[130] flex items-center gap-2 rounded-full bg-[#17101f]/95 px-3.5 py-2.5 text-sm font-semibold text-white/85 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white"
          aria-label="Abrir créditos"
        >
          <Coins size={17} className="text-violet-300" />
          <span>{usableCredits.toFixed(2)}</span>
        </button>
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
                                onClick={() => void togglePinned(conversation)}
                                className="w-full rounded-lg px-3 py-2.5 text-left text-sm text-white/85 transition hover:bg-white/[0.08] hover:text-white"
                              >
                                {conversation.is_pinned ? "Desafixar chat" : "Fixar chat"}
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
              onClick={() => setEventOpen(true)}
              className="mb-2 flex w-full items-center gap-3 rounded-xl border border-amber-300/20 bg-amber-300/[0.08] px-3 py-3 text-left text-sm font-semibold text-amber-100 transition hover:bg-amber-300/[0.14]"
            >
              <Gift size={18} />
              <span className="min-w-0 flex-1 truncate">{WORKSPACE_EVENT.label}</span>
              <span className="text-xs text-amber-200/80">+{WORKSPACE_EVENT.reward}</span>
            </button>
            <Link to="/credits" onClick={closeSidebar} className="mb-2 flex w-full items-center gap-3 rounded-xl bg-[#21152d] px-3 py-3 text-left text-sm font-semibold text-violet-100 shadow-sm ring-1 ring-violet-300/20 transition hover:bg-[#2a1b38]">
              <Coins size={18} />
              <span className="flex-1">Credits</span>
              <span className="text-xs text-violet-200/70">{usableCredits.toFixed(2)}</span>
            </Link>
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

      {creditsOpen && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onPointerDown={() => setCreditsOpen(false)}
        >
          <section
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl border border-white/10 bg-[#18101f] p-5 shadow-2xl"
            onPointerDown={(event) => event.stopPropagation()}
            aria-labelledby="credits-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300/80">Carteira</p>
                <h2 id="credits-title" className="mt-1 text-2xl font-semibold text-white">Seus créditos</h2>
                <p className="mt-1 text-sm text-white/45">Convites e anúncios entram nos créditos grátis.</p>
              </div>
              <button type="button" onClick={() => setCreditsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar créditos"><X size={18} /></button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[11px] text-white/45">Disponível</p><p className="mt-1 text-lg font-semibold text-white">{usableCredits.toFixed(2)}</p></div>
              <div className="rounded-2xl bg-amber-400/[0.10] p-3"><p className="text-[11px] text-white/55">Créditos diários</p><p className="mt-1 text-lg font-semibold text-amber-200">{dailyBalance.toFixed(0)}/{creditWallet.daily_credits_limit >= 999999 ? "∞" : creditWallet.daily_credits_limit.toFixed(0)}</p></div>
              <div className="rounded-2xl bg-violet-400/[0.10] p-3"><p className="text-[11px] text-white/55">Grátis</p><p className="mt-1 text-lg font-semibold text-violet-200">{creditWallet.free_credits.toFixed(2)}</p></div>
              <div className="rounded-2xl bg-emerald-400/[0.10] p-3"><p className="text-[11px] text-white/55">Comprados</p><p className="mt-1 text-lg font-semibold text-emerald-200">{creditWallet.purchased_credits.toFixed(2)}</p></div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="font-semibold text-white">Conseguir créditos grátis</p>
                <p className="mt-1 text-sm leading-5 text-white/50">Receba a renovação diária e, quando os eventos forem ativados, ganhe créditos ao convidar amigos ou assistir anúncios recompensados.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45"><span className="rounded-full bg-white/[0.06] px-2.5 py-1">Renovação diária</span><span className="rounded-full bg-white/[0.06] px-2.5 py-1">Convites</span><span className="rounded-full bg-white/[0.06] px-2.5 py-1">Anúncios</span></div>
              </div>
              <div className="rounded-2xl border border-violet-300/15 bg-violet-400/[0.07] p-4">
                <p className="font-semibold text-white">Comprar créditos</p>
                <p className="mt-1 text-sm leading-5 text-white/50">Os créditos comprados ficam separados do saldo grátis e não entram no limite de acúmulo.</p>
                <a href="/credits/buy" className="mt-3 flex w-full items-center justify-center rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-violet-400">Ver pacotes de créditos</a>
              </div>
            </div>

            {creditsLoading && <p className="mt-4 text-center text-xs text-white/35">Atualizando saldo…</p>}
          </section>
        </div>
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

      {shareMessage && (
        <div className="fixed inset-0 z-[330] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm" onPointerDown={() => setShareMessage(null)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#18101f] p-6 shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Compartilhar</p><h2 className="mt-2 text-2xl font-semibold">Envie esta resposta</h2></div><button type="button" onClick={() => setShareMessage(null)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar compartilhamento"><X size={18} /></button></div>
            <p className="mt-4 max-h-24 overflow-hidden rounded-2xl bg-black/20 p-4 text-sm leading-6 text-white/55">{shareMessage.content}</p>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Olha esta reflexão do DecidlyAI: ${shareMessage.content}`)}`} className="rounded-xl bg-[#25D366] px-3 py-3 text-center text-sm font-semibold text-black">WhatsApp</a>
              <a target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} className="rounded-xl bg-[#1877F2] px-3 py-3 text-center text-sm font-semibold text-white">Facebook</a>
              <a target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage.content.slice(0, 240))}&url=${encodeURIComponent(window.location.href)}`} className="rounded-xl bg-black px-3 py-3 text-center text-sm font-semibold text-white">X</a>
              <a target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} className="rounded-xl bg-[#0A66C2] px-3 py-3 text-center text-sm font-semibold text-white">LinkedIn</a>
              <a target="_blank" rel="noreferrer" href={`https://www.reddit.com/submit?title=${encodeURIComponent("Reflexão do DecidlyAI")}&text=${encodeURIComponent(shareMessage.content)}`} className="rounded-xl bg-[#FF4500] px-3 py-3 text-center text-sm font-semibold text-white">Reddit</a>
              <button type="button" onClick={() => void navigator.clipboard?.writeText(shareMessage.content)} className="rounded-xl border border-white/10 px-3 py-3 text-sm font-semibold text-white/70 hover:bg-white/[0.06]">Copiar texto</button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && <button type="button" onClick={() => void navigator.share?.({ title: "DecidlyAI", text: shareMessage.content, url: window.location.href })} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white"><Share2 size={17} />Abrir compartilhamento do celular</button>}
          </div>
        </div>
      )}
      {feedbackMessage && (
        <div className="fixed inset-0 z-[330] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm" onPointerDown={() => setFeedbackMessage(null)}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#18101f] p-6 shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Sua opinião</p><h2 className="mt-2 text-2xl font-semibold">O que achou da resposta?</h2></div><button type="button" onClick={() => setFeedbackMessage(null)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar feedback"><X size={18} /></button></div>
            <div className="mt-4 flex items-center gap-2 rounded-2xl bg-black/20 p-3 text-sm text-white/55"><MessageSquareText size={17} className="text-violet-300" /><span>{feedbackChoice === "like" ? "O que foi útil para você?" : "O que podemos melhorar?"}</span></div>
            <textarea value={feedbackComment} onChange={(event) => setFeedbackComment(event.target.value.slice(0, 500))} placeholder="Escreva um comentário (opcional)" className="mt-4 min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white outline-none placeholder:text-white/25 focus:border-violet-300/50" />
            <button type="button" disabled={feedbackSaving} onClick={() => void saveFeedback(feedbackMessage.id, feedbackChoice, feedbackComment)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white disabled:opacity-50">{feedbackSaving ? <Loader2 size={17} className="animate-spin" /> : null}{feedbackSaving ? "Salvando…" : "Enviar feedback"}</button>
          </div>
        </div>
      )}
      {eventOpen && (
        <div
          className="fixed inset-0 z-[320] flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm"
          onPointerDown={() => setEventOpen(false)}
        >
          <div className="w-full max-w-md rounded-3xl border border-amber-300/20 bg-[#18101f] p-6 shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Evento atual</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{WORKSPACE_EVENT.title}</h2>
                <p className="mt-2 text-sm leading-6 text-white/50">{WORKSPACE_EVENT.description}</p>
              </div>
              <button type="button" onClick={() => setEventOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar evento"><X size={18} /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/35">Seu link de convite</p>
              <p className="mt-2 break-all text-sm text-violet-200">{referralCode ? `${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}` : "Gerando seu link…"}</p>
            </div>
            <button type="button" disabled={!referralCode} onClick={() => void copyReferralLink()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-300 px-4 py-3 font-semibold text-[#20150a] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"><Link2 size={17} />{referralCopied ? "Link copiado" : "Copiar link de convite"}</button>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              <a target="_blank" rel="noreferrer" href={referralCode ? `https://wa.me/?text=${encodeURIComponent(`Convidei você para conhecer o DecidlyAI: ${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`)}` : "#"} className="rounded-xl bg-[#25D366] px-2 py-2.5 text-center text-xs font-semibold text-black">WhatsApp</a>
              <a target="_blank" rel="noreferrer" href={referralCode ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(`${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`)}` : "#"} className="rounded-xl bg-[#1877F2] px-2 py-2.5 text-center text-xs font-semibold text-white">Facebook</a>
              <a target="_blank" rel="noreferrer" href={referralCode ? `https://twitter.com/intent/tweet?text=${encodeURIComponent("Conheça o DecidlyAI")}&url=${encodeURIComponent(`${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`)}` : "#"} className="rounded-xl bg-black px-2 py-2.5 text-center text-xs font-semibold text-white">X</a>
              <a target="_blank" rel="noreferrer" href={referralCode ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`)}` : "#"} className="rounded-xl bg-[#0A66C2] px-2 py-2.5 text-center text-xs font-semibold text-white">LinkedIn</a>
              <a target="_blank" rel="noreferrer" href={referralCode ? `https://www.reddit.com/submit?title=${encodeURIComponent("Conheça o DecidlyAI")}&url=${encodeURIComponent(`${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}`)}` : "#"} className="rounded-xl bg-[#FF4500] px-2 py-2.5 text-center text-xs font-semibold text-white">Reddit</a>
            </div>
            <Link to="/credits/free" onClick={() => setEventOpen(false)} className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm text-white/60 transition hover:bg-white/[0.06] hover:text-white">Ver regras de créditos e convites</Link>
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
            <Link to="/settings" onClick={() => setAccountOpen(false)} className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.1] hover:text-white">Account &amp; Settings</Link>
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
          onScroll={() => {
            if (!chatRef.current) return;
            const distanceFromBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight;
            autoScrollRef.current = distanceFromBottom < 120;
          }}
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
                    {preferredName ? `Olá, ${preferredName.split(" ")[0]}!` : "O que você está decidindo?"}
                  </h1>
                </div>

                <p className="max-w-md text-center text-sm leading-6 text-white/45">
                  {preferredName
                    ? "Explique a situação, as opções que você tem e o que está te deixando em dúvida."
                    : "Explique a situação, as opções que você tem e o que está te deixando em dúvida."}
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  <Link to="/credits" className="inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/[0.08] px-4 py-2 text-xs text-violet-100 transition hover:bg-violet-400/[0.15]">
                    <Coins size={14} /> {usableCredits.toFixed(2)} créditos disponíveis
                  </Link>
                  <button type="button" onClick={() => setEventOpen(true)} className="inline-flex items-center gap-2 rounded-full border border-amber-300/25 bg-amber-300/[0.1] px-4 py-2 text-xs font-semibold text-amber-100 transition hover:bg-amber-300/[0.18]">
                    <Gift size={14} /> Convide e ganhe!
                  </button>
                </div>

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
                                      message,
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
                                      message,
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

                                <button type="button" onClick={() => setShareMessage(message)} className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white" aria-label="Compartilhar resposta">
                                  <Share2 size={16} />
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
                                  {readingLoading ? <span className="text-[10px] font-semibold">...</span> : isReading ? <Square size={15} fill="currentColor" /> : <Volume2 size={16} />}
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
                    <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/15 bg-violet-400/[0.07] px-3 py-2 text-sm text-white/60">
                      <Loader2 size={15} className="animate-spin text-violet-300" />
                      <span>{requestPhase === "sending" ? "Enviando…" : thinkingLabel}</span>
                      {requestPhase === "thinking" && <span className="tabular-nums text-violet-200/80">{elapsedSeconds}s</span>}
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
          <div className="relative mx-auto max-w-3xl">
            <div
              className="rounded-[30px] bg-[#17101f] px-3 py-2 shadow-2xl"
              style={{
                border: "none",
                outline: "none",
                boxShadow:
                  "0 20px 45px rgba(0,0,0,.25)",
              }}
            >
              <div className="flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    onFocus={handleTextareaFocus}
                    placeholder="Escreva sua decisão..."
                    rows={1}
                    className="min-h-[58px] max-h-[140px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-3 text-[15px] leading-6 text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none", appearance: "none", WebkitAppearance: "none" }}
                  />

                <button
                  type="button"
                  onClick={
                    toggleListening
                  }
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
                  {listening ? <MicOff size={19} /> : <Mic size={19} />}
                </button>

                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={!input.trim() || isLoading}
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
