import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import decidlyaiMarkUrl from "../assets/decidlyai-mark-160.png";
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
  RefreshCw,
  Download,
  Copy,
  Check,
  Coins,
  Volume2,
  Square,
  MoreHorizontal,
  Gift,
  Link2,
  Mail,
  Users,
  Loader2,
  Share2,
  MessageSquareText,
  Paperclip,
  FileText,
  WandSparkles,
  Image as ImageIcon,
  Type,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { SiFacebook, SiReddit, SiWhatsapp, SiX } from "react-icons/si";
import { FaLinkedinIn } from "react-icons/fa6";
import remarkGfm from "remark-gfm";
import { supabase } from "../lib/supabase";
import { streamAi } from "../lib/ai-stream";
import { requestTtsAudio } from "../lib/tts";
import { createPdfBlob } from "../lib/pdf";
import { createTextImage, MAX_TEXT_IMAGE_CHARS } from "../lib/text-image";
import { ensureToolActionResponse, inferRequestedTool, parseDeveloperCommand, resolveSelectedToolForRequest } from "../lib/tool-actions";
import { useLanguageContext } from "../lib/LanguageProvider";
import { RichResponse, parseBlocks, responseProtocolInstructions, type ResponseAction } from "../components/RichResponse";
import { ToolCenter, type SelectedTool, type ToolId } from "../components/ToolCenter";
import { AdsterraNativeBanner, AdsterraSocialBar } from "../components/AdsterraAds";
import {
  availableCredits,
  dailyCreditsBalance,
  normalizeCreditWallet,
  type CreditWallet,
} from "../lib/credits";
import { DEFAULT_USER_PREFERENCES, normalizeUserPreferences, type UserPreferences } from "../lib/user-preferences";

export const Route = createFileRoute("/workspace")({
  component: Workspace,
});

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolLabel?: string;
  toolId?: ToolId;
};

type ChatAttachment = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  extractedText?: string;
  dataUrl?: string;
};

const MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;
const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_TEXT = 30_000;

function imageMimeType(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  if (/\.png$/i.test(file.name)) return "image/png";
  if (/\.jpe?g$/i.test(file.name)) return "image/jpeg";
  if (/\.webp$/i.test(file.name)) return "image/webp";
  return "";
}

function replaceActionWithArtifact(content: string, requestId: string, replacement: string) {
  const escapedId = requestId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`\\[action\\b(?=[^\\]]*\\b(?:request_id|id)=["']${escapedId}["'])[^\\]]*\\][\\s\\S]*?\\[\\/action\\]`, "i");
  return content.replace(pattern, replacement);
}

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  is_pinned?: boolean;
};

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Subscription = {
  plan?: string | null;
  status?: string | null;
  expires_at?: string | null;
};

const SIDEBAR_MAX_WIDTH = 320;
const INITIAL_CHAT_LIMIT = 15;
const LOAD_MORE_CHAT_LIMIT = 25;
const FORM_SUBMIT_FEEDBACK_URL = "https://formsubmit.co/ajax/decidlyai@gmail.com";
const WORKSPACE_EVENT = {
  id: "invite-30",
  label: "Convide e ganhe!",
  title: "Convide um amigo e ganhe 30 créditos",
  description: "Compartilhe seu link. Quando o convite for qualificado, você recebe 30 créditos nesta campanha.",
  reward: 30,
} as const;
const INVITE_SHARE_TEXT = "Você recebeu um convite para conhecer o DecidlyAI! Crie sua conta e ganhe 30 créditos para organizar seus pensamentos, comparar possibilidades e tomar decisões com mais clareza. É gratuito para começar.";

function safePublicName(value: string | null | undefined) {
  const firstName = String(value ?? "").trim().split(/\s+/)[0] ?? "";
  return firstName.slice(0, 24);
}

async function extractPdfText(file: File) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    disableWorker: true,
  }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= Math.min(document.numPages, 8); pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" "));
  }
  return pages.join("\n\n").trim().slice(0, MAX_ATTACHMENT_TEXT);
}

function Workspace() {
  const { language } = useLanguageContext();
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
  const messageLongPressTimerRef = useRef<number | null>(null);

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [requestPhase, setRequestPhase] = useState<"idle" | "sending" | "thinking">("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [limitPopup, setLimitPopup] = useState<{ title: string; message: string } | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
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
  const [creditRewardNotice, setCreditRewardNotice] = useState<number | null>(null);
  const [creditRewardFlight, setCreditRewardFlight] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [quickPanelOpen, setQuickPanelOpen] = useState(false);
  const [creditWallet, setCreditWallet] = useState<CreditWallet>({
    free_credits: 0,
    purchased_credits: 0,
    total_credits: 0,
    daily_credits_used: 0,
    daily_credits_limit: 10,
    daily_credits_reset_at: null,
  });
  const [creditsLoading, setCreditsLoading] = useState(false);
  const [workspacePreferences, setWorkspacePreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [thinkingLabel, setThinkingLabel] = useState("Organizando sua decisão...");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [extraGuidance, setExtraGuidance] = useState("");
  const [selectedTool, setSelectedTool] = useState<SelectedTool | null>(null);
  const [requestTool, setRequestTool] = useState<SelectedTool | null>(null);
  const [pendingQuestion, setPendingQuestion] = useState<{ id: string; text: string; ai: string } | null>(null);
  const [workspaceEntered, setWorkspaceEntered] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installOpen, setInstallOpen] = useState(false);
  const [installNeverShow, setInstallNeverShow] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const enterTimer = window.setTimeout(() => setWorkspaceEntered(true), 80);
    return () => window.clearTimeout(enterTimer);
  }, []);

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      const installEvent = event as BeforeInstallPromptEvent;
      setInstallPrompt(installEvent);
      if (window.localStorage.getItem("decidly-pwa-install-dismissed") !== "true") {
        window.setTimeout(() => setInstallOpen(true), 900);
      }
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const continueOnWeb = useCallback(() => {
    if (installNeverShow) window.localStorage.setItem("decidly-pwa-install-dismissed", "true");
    setInstallOpen(false);
  }, [installNeverShow]);

  const installApp = useCallback(async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
    setInstallOpen(false);
  }, [installPrompt]);
  const [viewportHeight, setViewportHeight] = useState(0);

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
  const quickActionsRef = useRef<HTMLDivElement | null>(null);
  const quickTriggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);

  const attachmentInputRef = useRef<HTMLInputElement | null>(null);

  const recognitionRef =
    useRef<SpeechRecognition | null>(null);

  const streamAbortRef = useRef<AbortController | null>(null);
  const autoScrollRef = useRef(true);

  const lastTranscriptRef = useRef("");

  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);

  const speechSessionRef = useRef(0);
  const requestStartedAtRef = useRef<number | null>(null);

  const answerQuestion = useCallback((answer: string) => {
    if (!pendingQuestion) return;
    setExtraGuidance((current) => `${current}${current ? "\n" : ""}${pendingQuestion.text}\nResposta: ${answer}`);
    setPendingQuestion(null);
  }, [pendingQuestion]);

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

  const handleResponseAction = useCallback(async (action: ResponseAction, messageId: string) => {
    if (action.type === "create_image") {
      setNotice("");
      setError("A geração de imagens por IA está temporariamente suspensa por segurança. Nenhum crédito foi usado. Você ainda pode usar Imagem de texto no botão +.");
      return;
    }
    if (!userId) throw new Error("Entre na sua conta para criar o arquivo.");
    if (!new Set(["create_pdf", "create_text_image"]).has(action.type)) {
      throw new Error("Essa ferramenta ainda não está disponível.");
    }
    const targetMessage = messages.find((item) => item.id === messageId);
    if (!targetMessage || targetMessage.role !== "assistant") {
      throw new Error("Não encontrei a resposta que originou este arquivo.");
    }
    setError("");
    setNotice("");

    const refreshWallet = async () => {
      const { data } = await supabase
        .from("ai_credits")
        .select("free_credits,purchased_credits,total_credits,daily_credits_used,daily_credits_limit,daily_credits_reset_at")
        .eq("user_id", userId)
        .maybeSingle();
      if (data) setCreditWallet(normalizeCreditWallet(data));
    };

    const errorText = (message: string) => {
      if (message.includes("insufficient_credits")) return "Créditos insuficientes para esta ferramenta.";
      if (message.includes("daily_artifact_limit:pdf")) return "Você atingiu o limite diário de PDFs do seu plano.";
      if (message.includes("daily_artifact_limit:professional_image")) return "Você atingiu o limite diário de imagens por IA do seu plano.";
      if (message.includes("daily_artifact_limit:basic_image")) return "Você atingiu o limite diário de imagens básicas do seu plano.";
      if (message.includes("credit_wallet_unavailable")) return "Não foi possível consultar sua carteira de créditos.";
      return message;
    };

    const persistArtifact = async (artifact: { kind: "file" | "image"; path: string; fileName?: string; alt?: string }) => {
      const imageExtension = artifact.path.toLowerCase().endsWith(".png")
        ? "png"
        : artifact.path.toLowerCase().endsWith(".webp")
          ? "webp"
          : "jpg";
      const defaultName = artifact.kind === "file"
        ? "DecidlyAI.pdf"
        : `DecidlyAI-imagem.${imageExtension}`;
      const safeName = (artifact.fileName || defaultName).replace(/["<>]/g, "");
      const replacement = artifact.kind === "file"
        ? `[generated_file path="${artifact.path}" name="${safeName}"][/generated_file]`
        : `[generated_image path="${artifact.path}" name="${safeName}" alt="${artifact.alt || "Imagem gerada"}"][/generated_image]`;
      const replaced = replaceActionWithArtifact(targetMessage.content, action.requestId, replacement);
      const nextContent = replaced === targetMessage.content
        ? `${targetMessage.content}\n\n${replacement}`
        : replaced;
      setMessages((current) => current.map((item) => item.id === messageId ? { ...item, content: nextContent } : item));
      const { error: saveError } = await supabase
        .from("messages")
        .update({ content: nextContent })
        .eq("id", messageId)
        .eq("user_id", userId);
      if (saveError) {
        setNotice("Arquivo criado e armazenado, mas não foi anexado ao histórico. Atualize a carteira de créditos para ver o saldo.");
      } else {
        setNotice(artifact.kind === "file" ? "PDF criado e anexado à conversa." : "Imagem criada e anexada à conversa.");
      }
    };

    if (action.type === "create_image") {
      const { data, error } = await supabase.functions.invoke("generate-ai-image", {
        body: { operation_id: action.requestId, prompt: action.description },
      });
      if (error) {
        let message = error.message || "Falha na geração da imagem.";
        const context = error.context;
        if (context instanceof Response) {
          const payload = await context.clone().json().catch(() => null) as { error?: string; code?: string } | null;
          if (payload?.code === "daily_artifact_limit:professional_image") {
            message = "Você atingiu o limite diário de imagens por IA do seu plano.";
          } else if (payload?.error) {
            message = payload.error;
          }
        }
        if (message.includes("limite diário") || message.includes("daily_artifact_limit")) {
          setLimitPopup({ title: "Limite atingido", message: "Você atingiu o limite de criações por enquanto. Tente novamente quando o limite for renovado." });
        }
        // A Edge Function reserva o crédito antes de chamar o provedor. Se a
        // resposta cair depois dessa reserva, o cliente tenta liberar a operação
        // também. O RPC é idempotente: se a função já estornou ou nunca reservou,
        // nenhuma segunda cobrança é criada.
        const { error: releaseError } = await supabase.rpc("release_ai_artifact", {
          p_request_id: action.requestId,
          p_reason: `generate-ai-image: ${message}`.slice(0, 180),
        });
        if (releaseError) {
          console.error("Não foi possível confirmar o estorno da imagem:", releaseError);
        }
        await refreshWallet();
        throw new Error(message);
      }
      const result = data as { path?: string; replayed?: boolean } | null;
      if (!result?.path) {
        await supabase.rpc("release_ai_artifact", {
          p_request_id: action.requestId,
          p_reason: "generate-ai-image: resposta sem arquivo",
        });
        await refreshWallet();
        throw new Error("O serviço não retornou o arquivo da imagem. Os créditos reservados foram devolvidos.");
      }
      await persistArtifact({ kind: "image", path: result.path, alt: "Imagem gerada por IA" });
      await refreshWallet();
      return;
    }

    const artifactType = action.type === "create_pdf" ? "pdf_create" : "text_image";
    let reservationCreated = false;
    let uploadedPath = "";
    try {
      const { data, error } = await supabase.rpc("reserve_ai_artifact", {
        p_request_id: action.requestId,
        p_artifact_type: artifactType,
      });
      if (error) throw new Error(errorText(error.message));
      const reservation = data as {
        status?: string;
        replayed?: boolean;
        metadata?: { storage_path?: string; file_name?: string };
      } | null;
      if (reservation?.status === "settled" && reservation.metadata?.storage_path) {
        const isPdf = action.type === "create_pdf";
        await persistArtifact({
          kind: isPdf ? "file" : "image",
          path: reservation.metadata.storage_path,
          fileName: reservation.metadata.file_name || (isPdf ? "DecidlyAI.pdf" : "decidlyai-imagem-de-texto.png"),
          ...(!isPdf ? { alt: "Imagem de texto" } : {}),
        });
        await refreshWallet();
        return;
      }
      if (reservation?.status === "reserved" && reservation.replayed) {
        throw new Error("Esta geração já está em andamento. Aguarde alguns minutos antes de tentar novamente.");
      }
      reservationCreated = reservation?.status === "reserved";
      if (!reservationCreated) throw new Error("Não foi possível reservar os créditos.");

      let blob: Blob;
      let fileName: string;
      let mimeType: string;
      if (action.type === "create_pdf") {
        const pdf = await createPdfBlob({ title: action.title, content: action.description, fileName: action.title });
        blob = pdf.blob;
        fileName = pdf.fileName;
        mimeType = "application/pdf";
      } else {
        blob = await createTextImage(action.description, action.imageDesign);
        fileName = "decidlyai-imagem-de-texto.png";
        mimeType = "image/png";
      }

      uploadedPath = `${userId}/${action.requestId}.${action.type === "create_pdf" ? "pdf" : "png"}`;
      const { error: uploadError } = await supabase.storage.from("decidlyai-artifacts").upload(uploadedPath, blob, {
        contentType: mimeType,
        upsert: true,
      });
      if (uploadError) throw new Error("Não foi possível guardar o arquivo com segurança.");

      const { error: settleError } = await supabase.rpc("settle_ai_artifact", {
        p_request_id: action.requestId,
        p_result_metadata: {
          storage_path: uploadedPath,
          file_name: fileName,
          mime_type: mimeType,
        },
      });
      if (settleError) throw new Error("Não foi possível registrar a conclusão do arquivo.");
      reservationCreated = false;

      await persistArtifact({
        kind: action.type === "create_pdf" ? "file" : "image",
        path: uploadedPath,
        fileName,
        ...(action.type !== "create_pdf" ? { alt: "Imagem de texto" } : {}),
      });
      await refreshWallet();
    } catch (caughtError) {
      if (uploadedPath) await supabase.storage.from("decidlyai-artifacts").remove([uploadedPath]);
      if (reservationCreated) {
        await supabase.rpc("release_ai_artifact", {
          p_request_id: action.requestId,
          p_reason: caughtError instanceof Error ? caughtError.message.slice(0, 180) : "artifact_generation_failed",
        });
      }
      await refreshWallet();
      throw caughtError instanceof Error ? caughtError : new Error("Não foi possível criar o arquivo.");
    }
  }, [messages, userId]);

  useEffect(() => {
    if (!userId) {
      setReferralCode("");
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data: generatedCode, error: generationError } = await supabase.rpc("ensure_referral_code");
      if (!cancelled && !generationError && typeof generatedCode === "string") {
        setReferralCode(generatedCode);
        return;
      }
      const { data } = await supabase
        .from("referral_codes")
        .select("code")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) setReferralCode(typeof data?.code === "string" ? data.code : "");
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    let active = true;
    const checkReferralRewards = async () => {
      const { data } = await supabase.from("referral_events").select("id,reward_credits,status,created_at,qualified_at").eq("inviter_user_id", userId).eq("status", "qualified").order("qualified_at", { ascending: false }).limit(25);
      if (!active || !data) return;
      const storageKey = `decidly-seen-referrals-${userId}`;
      const storedSeen = window.localStorage.getItem(storageKey);
      const seen = new Set(JSON.parse(storedSeen || "[]") as string[]);
      if (!storedSeen) {
        const recentCutoff = Date.now() - 2 * 60 * 1000;
        data.filter((item) => new Date(item.qualified_at || item.created_at).getTime() < recentCutoff).forEach((item) => seen.add(String(item.id)));
      }
      const fresh = data.find((item) => !seen.has(String(item.id)));
      if (fresh) {
        seen.add(String(fresh.id));
        window.localStorage.setItem(storageKey, JSON.stringify([...seen]));
        setCreditRewardNotice(Number(fresh.reward_credits || 30));
      }
    };
    void checkReferralRewards();
    const timer = window.setInterval(() => void checkReferralRewards(), 12000);
    return () => { active = false; window.clearInterval(timer); };
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
    const viewport = window.visualViewport;
    let lastHeight = 0;
    const updateViewportHeight = () => {
      const nextHeight = Math.round(viewport?.height ?? window.innerHeight);
      if (!nextHeight || nextHeight === lastHeight) return;
      lastHeight = nextHeight;
      setViewportHeight(nextHeight);

      if (document.activeElement === textareaRef.current) {
        requestAnimationFrame(() => {
          if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
        });
      }
    };

    updateViewportHeight();
    window.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("resize", updateViewportHeight);
    viewport?.addEventListener("scroll", updateViewportHeight);
    return () => {
      window.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("resize", updateViewportHeight);
      viewport?.removeEventListener("scroll", updateViewportHeight);
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
          setDeveloperMode(false);
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
        const { data: profile } = await supabase.from("profiles").select("plan,developer_mode").eq("id", user.id).maybeSingle();
        setDeveloperMode(profile?.developer_mode === true || String(profile?.plan || "").toLowerCase() === "dev");
        setUserEmail(user?.email ?? "");
        const savedPreferredName = safePublicName(window.localStorage.getItem("decidly-preferred-name"));
        setUserName("Conta");
        setPreferredName(savedPreferredName);
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
              setDeveloperMode(false);
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
            void supabase.from("profiles").select("plan,developer_mode").eq("id", session.user.id).maybeSingle().then(({ data: profile }) => {
              if (mounted) setDeveloperMode(profile?.developer_mode === true || String(profile?.plan || "").toLowerCase() === "dev");
            });
            setUserEmail(session.user.email ?? "");
            const savedPreferredName = safePublicName(window.localStorage.getItem("decidly-preferred-name"));
            setUserName("Conta");
            setPreferredName(savedPreferredName);
          }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    if (!userId) {
      setWorkspacePreferences(DEFAULT_USER_PREFERENCES);
      return;
    }
    void supabase.from("user_preferences")
      .select("idioma_preferido,tema,densidade_do_chat,tom_da_ia,modelo_preferido,notificacoes_de_credito,rolagem_apos_resposta,mostrar_indicadores_credito")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const preferences = normalizeUserPreferences(data);
        setWorkspacePreferences(preferences);
        autoScrollRef.current = preferences.rolagem_apos_resposta !== "never";
      });
    return () => { cancelled = true; };
  }, [userId]);

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

        const { data: savedMessages, error: savedMessagesError } = await supabase
          .from("messages")
          .select("id,role,content,tool_id,tool_label")
          .eq("conversation_id", savedConversation.id)
          .eq("user_id", userId)
          .order("created_at", { ascending: true });

        if (savedMessagesError) {
          const { data: legacyMessages } = await supabase
            .from("messages")
            .select("id,role,content")
            .eq("conversation_id", savedConversation.id)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });
          setMessages((legacyMessages ?? []).map((message) => ({
            id: message.id,
            role: message.role as ChatMessage["role"],
            content: message.content,
          })));
        } else {
          setMessages((savedMessages ?? []).map((message) => ({
            id: message.id,
            role: message.role as ChatMessage["role"],
            content: message.content,
            ...(message.tool_id ? { toolId: message.tool_id as ToolId } : {}),
            ...(message.tool_label ? { toolLabel: message.tool_label } : {}),
          })));
        }
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
        const { data, error } = await supabase
          .from("messages")
          .select(
            "id,role,content,tool_id,tool_label",
          )
          .eq(
            "conversation_id",
            conversation.id,
          )
          .eq("user_id", userId)
          .order("created_at", {
            ascending: true,
          });

        if (error) {
          const { data: legacyMessages } = await supabase
            .from("messages")
            .select("id,role,content")
            .eq("conversation_id", conversation.id)
            .eq("user_id", userId)
            .order("created_at", { ascending: true });
          setMessages(
            (legacyMessages ?? []).map((message) => ({
              id: message.id,
              role: message.role as ChatMessage["role"],
              content: message.content,
            })),
          );
        } else if (data) {
          setMessages(data.map((message) => ({
            id: message.id,
            role: message.role as ChatMessage["role"],
            content: message.content,
            ...(message.tool_id ? { toolId: message.tool_id as ToolId } : {}),
            ...(message.tool_label ? { toolLabel: message.tool_label } : {}),
          })));
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
      setAttachments([]);
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

  const addAttachments = useCallback(async (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      setError(`Você pode anexar no máximo ${MAX_ATTACHMENTS} arquivos por mensagem. Remova um anexo antes de adicionar outros.`);
      return;
    }
    if (!files.length) {
      setError(`Você pode anexar no máximo ${MAX_ATTACHMENTS} arquivos por mensagem.`);
      return;
    }
    const next: ChatAttachment[] = [];
    for (const file of files) {
      if (file.size > MAX_ATTACHMENT_BYTES) {
        setError(`${file.name} excede o limite de 4 MB.`);
        continue;
      }
      try {
        if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
          const extractedText = await extractPdfText(file);
          if (!extractedText) throw new Error("Não foi possível encontrar texto neste PDF.");
          next.push({ id: crypto.randomUUID(), name: file.name, mimeType: "application/pdf", size: file.size, extractedText });
        } else if (file.type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(file.name)) {
          const extractedText = (await file.text()).slice(0, MAX_ATTACHMENT_TEXT);
          if (!extractedText.trim()) throw new Error("O arquivo de texto está vazio.");
          next.push({ id: crypto.randomUUID(), name: file.name, mimeType: file.type || "text/plain", size: file.size, extractedText });
        } else if (imageMimeType(file)) {
          const mimeType = imageMimeType(file);
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
            reader.readAsDataURL(file);
          });
          next.push({ id: crypto.randomUUID(), name: file.name, mimeType, size: file.size, dataUrl });
        } else {
          setError(`${file.name}: formato não suportado. Use PDF, TXT, MD, CSV, JSON ou imagem.`);
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? `${file.name}: ${caughtError.message}` : `Não foi possível ler ${file.name}.`);
      }
    }
    setAttachments((current) => [...current, ...next].slice(0, MAX_ATTACHMENTS));
    if (next.length) setError("");
  }, [attachments.length]);

  const removeAttachment = useCallback((id: string) => {
    setAttachments((current) => current.filter((attachment) => attachment.id !== id));
  }, []);

  /*
   * ============================================================
   * AI
   * ============================================================
   */

  const getAIName = useCallback(
    async () => {
      if (!userId) return "decidly-ai-stream";
      const { data } = await supabase
        .from("subscription")
        .select("plan,status,expires_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const subscription = data as Subscription | null;
      const active = subscription?.status === "active" || subscription?.status === "trialing";
      const isVIP = subscription?.plan === "vip" || subscription?.plan === "VIP";
      const notExpired = !subscription?.expires_at || new Date(subscription.expires_at).getTime() > Date.now();
      if (active && isVIP && notExpired) return "decidly-ai";
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
    async (textOverride?: string, historyOverride?: ChatMessage[]) => {
      const rawText = (textOverride ?? input).trim();
      const developerCommand = developerMode ? parseDeveloperCommand(rawText) : null;
      const text = developerCommand?.text || rawText;
      const guidance = extraGuidance.trim();
      const selectedAttachments = attachments;
      const attachmentLabels = selectedAttachments.map((attachment) => `📎 ${attachment.name}`).join("\n");
      const attachmentContext = selectedAttachments
        .filter((attachment) => attachment.extractedText)
        .map((attachment) => `Arquivo anexado: ${attachment.name}\n${attachment.extractedText}`)
        .join("\n\n");
      const imageInstruction = selectedAttachments.some((attachment) => attachment.dataUrl)
        ? "Há uma imagem anexada nesta mensagem. Analise visualmente o conteúdo da imagem e responda ao que o usuário perguntou sobre ela. Não peça o contexto novamente se a imagem permitir uma resposta."
        : "";
      const promptText = [text || "Analise os arquivos anexados.", imageInstruction, attachmentContext].filter(Boolean).join("\n\n");

      if ((!text && !selectedAttachments.length) || isLoading) {
        return;
      }

      if (!userId) {
        setError(
          "Você precisa estar conectado para continuar.",
        );
        return;
      }

      if (developerCommand?.attach) {
        attachmentInputRef.current?.click();
        setInput("");
        return;
      }

      const inferredTool = developerCommand?.tool || inferRequestedTool(text);
      const requestsDisabledImage = !developerCommand?.tool && (
        selectedTool?.id === "create_image" || (!selectedTool && inferredTool?.id === "create_image")
      );
      if (requestsDisabledImage) {
        setSelectedTool(null);
        setToolsOpen(false);
        setNotice("");
        setError("A geração de imagens por IA está temporariamente suspensa por segurança. Nenhum crédito foi usado. Você ainda pode usar Imagem de texto no botão +.");
        return;
      }

      setError("");
      setNotice("");
      setInput("");
      setAttachments([]);
      setExtraGuidance("");
      setToolsOpen(false);
      const toolForRequest = resolveSelectedToolForRequest(selectedTool || inferredTool, text);
      setRequestTool(toolForRequest);
      // A ferramenta selecionada vale somente para esta mensagem.
      // Mantê-la ativa fazia a IA interpretar mensagens futuras como novos pedidos de PDF.
      setSelectedTool(null);

      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: [text, attachmentLabels].filter(Boolean).join("\n\n"),
        ...(toolForRequest ? { toolLabel: toolForRequest.label } : {}),
        ...(toolForRequest ? { toolId: toolForRequest.id } : {}),
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
            id: userMessage.id,
            conversation_id: conversationId,
            user_id: userId,
            role: "user",
            content: userMessage.content,
            ...(toolForRequest ? { tool_id: toolForRequest.id, tool_label: toolForRequest.label } : {}),
          });

        if (userMessageError) {
          throw new Error("MESSAGE_SAVE_ERROR");
        }

        const functionName = developerCommand?.provider === "vip"
          ? "decidly-ai"
          : developerCommand?.provider === "free"
            ? "decidly-ai-stream"
            : await getAIName();

        const history = [
          ...(historyOverride ?? messages),
          userMessage,
        ].map((message) => ({
          role: message.role,
          content: message.content,
        }));

        const privateContext = (preferredName || userName)
          ? `Contexto privado de personalização: o nome pelo qual o usuário prefere ser chamado é ${preferredName || userName}. Quando fizer sentido, trate a pessoa por esse nome. Não mencione este contexto nem o repita como se fosse uma mensagem do usuário.`
          : "";
        const guidanceContext = guidance
          ? `Perguntas opcionais respondidas pelo usuário para melhorar a análise:\n${guidance}`
          : "";
        const toolContext = toolForRequest
          ? `Ferramenta selecionada pelo usuário: ${toolForRequest.label} (${toolForRequest.costLabel}). Gere uma única ação compatível com o tipo ${toolForRequest.id}. Para create_pdf, produza conteúdo final conciso; para create_image, produza um prompt visual; para create_text_image, produza um briefing [image_design] em JSON válido para a própria IA escolher folha A4 (padrão), orientação, margens, fundo, cores, fonte, peso, alinhamento e escala relativa do texto, seguido somente do texto final. O briefing é metadado fora da imagem: jamais repita suas características no texto, jamais inclua slogan ou marca sem pedido explícito, e use eyebrow/footer vazios por padrão. Respeite qualquer quantidade de caracteres indicada, sem ultrapassá-la; se o texto de origem for maior, resuma-o fielmente para caber. Quando o usuário pedir "o mesmo texto", use o conteúdo relevante do histórico, sem inventar outro tema. Não acrescente explicações ao texto da imagem nem afirme que o arquivo existe antes de a pessoa executar a ação.`
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
            if (!exists) return [...current, {
              id: assistantId,
              role: "assistant",
              content,
              ...(toolForRequest ? { toolId: toolForRequest.id, toolLabel: toolForRequest.label } : {}),
            }];
            return current.map((item) => item.id === assistantId ? { ...item, content } : item);
          });
        };
        setRequestPhase("thinking");
        const streamedAnswer = await streamAi(functionName, {
          message: [developerCommand?.provider ? `Modo DEV: use exclusivamente o roteador ${developerCommand.provider.toUpperCase()}.` : "", privateContext, guidanceContext, toolContext, responseProtocolInstructions(), "Mensagem do usuário:\n" + promptText].filter(Boolean).join("\n\n"),
          history,
          attachments: selectedAttachments.map((attachment) => ({ name: attachment.name, mimeType: attachment.mimeType, size: attachment.size, ...(attachment.dataUrl ? { dataUrl: attachment.dataUrl } : {}) })),
          language,
          ...(developerCommand?.provider ? { mode: developerCommand.provider } : {}),
          signal: abortController.signal,
          onDelta: (_delta, accumulated) => {
            latestAccumulated = accumulated;
            if (chatRef.current) {
              const distanceFromBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight;
              autoScrollRef.current = workspacePreferences.rolagem_apos_resposta === "always"
                || (workspacePreferences.rolagem_apos_resposta === "near_bottom" && distanceFromBottom < 120);
            }
            if (pendingFrame === null) pendingFrame = window.requestAnimationFrame(flushAssistant);
          },
        });

        if (pendingFrame !== null) window.cancelAnimationFrame(pendingFrame);
        const answer = ensureToolActionResponse(streamedAnswer, toolForRequest, text);
        latestAccumulated = answer;
        flushAssistant();

        const questionMatch = answer.match(/\[question(?:\s+id=([^\s\]]+))?\]([\s\S]*?)\[\/question\]/i);
        if (questionMatch?.[2]?.trim()) {
          setPendingQuestion({ id: questionMatch[1] || crypto.randomUUID(), text: questionMatch[2].trim(), ai: "IA atual" });
        }

        const { error: assistantMessageError } = await supabase
          .from("messages")
          .insert({
            id: assistantId,
            conversation_id: conversationId,
            user_id: userId,
            role: "assistant",
            content: answer,
          });

        if (assistantMessageError) {
          throw new Error("MESSAGE_SAVE_ERROR");
        }

        if (toolForRequest && (toolForRequest.id === "create_pdf" || toolForRequest.id === "create_image")) {
          const actionBlock = parseBlocks(answer).find((block) => block.kind === "action" && block.requestId && block.actionType === toolForRequest.id);
          if (actionBlock?.requestId) {
            await handleResponseAction({ type: toolForRequest.id, title: actionBlock.title || toolForRequest.label, description: actionBlock.value, requestId: actionBlock.requestId }, assistantId);
          }
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

        if (message.includes("daily_artifact_limit") || message.includes("limite diário") || (status === 429 && requestTool)) {
          setError("");
          setLimitPopup({ title: "Limite atingido", message: "Você atingiu o limite de criações por enquanto. Tente novamente quando o limite for renovado." });
        } else if (message === "402" || status === 402) {
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
        setRequestTool(null);
        setElapsedSeconds(0);
        requestStartedAtRef.current = null;
        streamAbortRef.current = null;
      }
    },
    [
      input,
      developerMode,
      isLoading,
      userId,
      getAIName,
      messages,
      saveConversationTitle,
      activeConversationId,
      userName,
      preferredName,
      extraGuidance,
      selectedTool,
      handleResponseAction,
      attachments,
    ],
  );

  const stopGeneration = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    setIsLoading(false);
    setRequestPhase("idle");
    setRequestTool(null);
    requestStartedAtRef.current = null;
  }, []);

  const removeMessagesFrom = useCallback(async (startIndex: number) => {
    if (!userId || !activeConversationId) return false;
    const removedIds = messages.slice(startIndex).map((message) => message.id);
    if (!removedIds.length) return true;
    const { error: deleteError } = await supabase
      .from("messages")
      .delete()
      .in("id", removedIds)
      .eq("conversation_id", activeConversationId)
      .eq("user_id", userId);
    if (deleteError) {
      setError("Não foi possível preparar a mensagem para reenviar.");
      return false;
    }
    setMessages((current) => current.slice(0, startIndex));
    return true;
  }, [activeConversationId, messages, userId]);

  const editUserMessage = useCallback(async (message: ChatMessage) => {
    if (isLoading) return;
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    if (messageIndex < 0) return;
    if (await removeMessagesFrom(messageIndex)) {
      setInput(message.content);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  }, [isLoading, messages, removeMessagesFrom]);

  const clearMessageLongPress = useCallback(() => {
    if (messageLongPressTimerRef.current !== null) {
      window.clearTimeout(messageLongPressTimerRef.current);
      messageLongPressTimerRef.current = null;
    }
  }, []);

  const startMessageLongPress = useCallback((event: ReactPointerEvent<HTMLDivElement>, message: ChatMessage) => {
    if (isLoading || (event.pointerType === "mouse" && event.button !== 0)) return;
    clearMessageLongPress();
    messageLongPressTimerRef.current = window.setTimeout(() => {
      messageLongPressTimerRef.current = null;
      void editUserMessage(message);
    }, 650);
  }, [clearMessageLongPress, editUserMessage, isLoading]);

  useEffect(() => () => clearMessageLongPress(), [clearMessageLongPress]);

  const regenerateAssistantMessage = useCallback(async (message: ChatMessage) => {
    if (isLoading) return;
    const messageIndex = messages.findIndex((item) => item.id === message.id);
    const previousUser = messages.slice(0, messageIndex).reverse().find((item) => item.role === "user");
    const userIndex = previousUser ? messages.findIndex((item) => item.id === previousUser.id) : -1;
    if (messageIndex < 0 || userIndex < 0 || !previousUser) return;
    if (await removeMessagesFrom(userIndex)) {
      setError("");
      void sendMessage(previousUser.content, messages.slice(0, userIndex - 0));
    }
  }, [isLoading, messages, removeMessagesFrom, sendMessage]);

  const exportConversation = useCallback(() => {
    if (!messages.length) {
      setNotice("Ainda não há mensagens para exportar.");
      return;
    }
    const title = conversations.find((item) => item.id === activeConversationId)?.title || "Conversa DecidlyAI";
    const text = [
      title,
      "=".repeat(title.length),
      "",
      ...messages.map((message) => `${message.role === "user" ? "Você" : "DecidlyAI"}:\n${message.content}`),
    ].join("\n\n");
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${title.replace(/[^a-z0-9À-ÿ]+/gi, "-").replace(/^-|-$/g, "").slice(0, 70) || "conversa-decidlyai"}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Conversa exportada em TXT.");
  }, [activeConversationId, conversations, messages]);

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
    if (workspacePreferences.rolagem_apos_resposta === "never") {
      autoScrollRef.current = false;
      return;
    }
    autoScrollRef.current = true;
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
        if (typeof window.speechSynthesis !== "undefined" && typeof window.SpeechSynthesisUtterance !== "undefined") {
          const utterance = new SpeechSynthesisUtterance(speakableText);
          utterance.lang = language === "en-US" ? "en-US" : "pt-BR";
          utterance.rate = 0.98;
          utterance.pitch = 1;
          utterance.onend = () => {
            if (speechSessionRef.current === session) stopReading();
          };
          utterance.onerror = () => {
            if (speechSessionRef.current === session) {
              setError("Não foi possível iniciar a leitura de voz. Verifique o volume do aparelho.");
              stopReading();
            }
          };
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
          setReadingLoading(false);
          return;
        }
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
        setError("Não foi possível iniciar a leitura de voz. Verifique o volume do aparelho.");
        stopReading();
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
    const messageIndex = messages.findIndex((message) => message.id === id);
    const aiMessage = messages[messageIndex];
    const conversationContext = messages
      .slice(Math.max(0, messageIndex - 6), Math.max(0, messageIndex))
      .map((message) => `${message.role === "user" ? "Usuário" : "DecidlyAI"}: ${message.content}`)
      .join("\n\n")
      .slice(0, 6000);
    const { error: insertError } = await supabase.from("message_feedback").insert({
      user_id: userId,
      message_id: id,
      conversation_id: activeConversationId,
      conversation_context: conversationContext || null,
      feedback,
      comment: comment.trim() || null,
    });
    if (insertError) {
      setFeedbackSaving(false);
      setError("Não foi possível registrar sua avaliação. Verifique sua conexão e tente novamente.");
      return;
    }

    const feedbackForm = new URLSearchParams();
    feedbackForm.set("application", "DecidlyAI");
    feedbackForm.set("user_id", userId);
    feedbackForm.set("user_email", userEmail);
    feedbackForm.set("conversation_id", activeConversationId ?? "");
    feedbackForm.set("conversation_context", conversationContext);
    feedbackForm.set("ai_message", aiMessage?.content ?? "");
    feedbackForm.set("feedback", feedback);
    feedbackForm.set("comment", comment.trim());
    feedbackForm.set("_subject", "DecidlyAI — feedback de resposta da IA");
    feedbackForm.set("_template", "table");
    feedbackForm.set("_honey", "");

    let forwardingError = false;
    try {
      const response = await fetch(FORM_SUBMIT_FEEDBACK_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: feedbackForm.toString(),
      });
      const responseText = await response.text();
      const payload = JSON.parse(responseText) as { success?: unknown; error?: unknown };
      const confirmed =
        payload.success === true ||
        (typeof payload.success === "string" && payload.success.toLowerCase() === "true");
      if (!response.ok || !confirmed || payload.error === true) {
        forwardingError = true;
      }
    } catch {
      forwardingError = true;
    }

    setLikes((current) => ({ ...current, [id]: feedback === "like" }));
    setDislikes((current) => ({ ...current, [id]: feedback === "dislike" }));
    setFeedbackMessage(null);
    setFeedbackComment("");
    setFeedbackSaving(false);
    if (forwardingError) {
      setError("Sua avaliação foi salva, mas não foi possível encaminhá-la agora. Tente novamente mais tarde.");
    }
  }, [activeConversationId, messages, userEmail, userId]);
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

  const referralUrl = referralCode ? `${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}` : "";
  const shareReferralLink = useCallback(async () => {
    if (!referralUrl) return;
    const shareData = { title: "Convide e Ganhe!", text: INVITE_SHARE_TEXT, url: referralUrl };
    if (navigator.share) {
      try { await navigator.share(shareData); return; }
      catch (error) { if (error instanceof DOMException && error.name === "AbortError") return; }
    }
    await navigator.clipboard?.writeText(referralUrl);
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 1800);
  }, [referralUrl]);
  const copyReferralLink = useCallback(async () => {
    if (!referralUrl) return;
    await navigator.clipboard?.writeText(referralUrl);
    setReferralCopied(true);
    window.setTimeout(() => setReferralCopied(false), 1800);
  }, [referralUrl]);

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
  }, [messages, isLoading, workspacePreferences.rolagem_apos_resposta]);

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
      setThinkingLabel(labels[index] ?? "");
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
  const closeCreditReward = () => {
    void loadCreditWallet();
    setCreditRewardNotice(null);
    setCreditRewardFlight(true);
    window.setTimeout(() => setCreditRewardFlight(false), 900);
  };

  return (
    <div
      data-chat-density={workspacePreferences.densidade_do_chat}
      className={`workspace-shell relative min-h-[100dvh] overflow-hidden text-white ${workspaceEntered ? "workspace-entered" : ""}`}
      onPointerDown={(event) => {
        if (chatMenuId) {
          setChatMenuId(null);
        }
        if (quickPanelOpen && !quickActionsRef.current?.contains(event.target as Node)) {
          setQuickPanelOpen(false);
        }
      }}
    >
      <AdsterraSocialBar />
      {creditRewardFlight && <div className="credit-flight" aria-hidden="true">+30</div>}
      {creditRewardNotice !== null && (
        <div className="fixed inset-0 z-[360] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm" onPointerDown={closeCreditReward}>
          <div className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-emerald-300/20 bg-[#18101f] p-7 text-center shadow-2xl shadow-emerald-950/30" onPointerDown={(event) => event.stopPropagation()}>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 overflow-hidden"><span className="credit-coin credit-coin-1">+{creditRewardNotice}</span><span className="credit-coin credit-coin-2">+{creditRewardNotice}</span><span className="credit-coin credit-coin-3">+{creditRewardNotice}</span></div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300 ring-8 ring-emerald-400/5"><Gift size={30} /></div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">Convite confirmado</p>
            <h2 className="mt-2 text-2xl font-semibold">Você recebeu créditos!</h2>
            <p className="mt-3 leading-6 text-white/55">Uma nova pessoa criou uma conta pelo seu convite. Você recebeu <strong className="text-emerald-300">+{creditRewardNotice} créditos</strong>.</p>
            <button type="button" onClick={closeCreditReward} className="mt-6 w-full rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-[#07130d] transition hover:bg-emerald-300">Ver créditos atualizados</button>
          </div>
        </div>
      )}
      {/* ======================================================
          MENU FIXO
          ====================================================== */}

      {!sidebarOpen && (
        <div className="fixed left-4 top-4 z-[130]">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setQuickPanelOpen(false);
              openSidebar();
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/75 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
            aria-label="Abrir menu de conversas"
          >
            <Menu size={21} />
          </button>
        </div>
      )}

      {!sidebarOpen && (
        <div className="fixed right-4 top-4 z-[130]">
          <div
            ref={quickActionsRef}
            className="relative"
            onPointerDown={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setQuickPanelOpen(false);
                quickTriggerRef.current?.focus();
              }
            }}
          >
            <button
              ref={quickTriggerRef}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setQuickPanelOpen((current) => !current);
                if (!quickPanelOpen) void loadCreditWallet();
              }}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-[#17101f]/95 text-white/75 shadow-lg backdrop-blur-xl transition hover:bg-[#21152d] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-200"
              aria-label="Abrir atalhos do workspace"
              aria-expanded={quickPanelOpen}
              aria-controls="workspace-quick-actions"
              title="Atalhos"
            >
              <MoreHorizontal size={21} />
            </button>
            {quickPanelOpen && (
              <section
                id="workspace-quick-actions"
                aria-label="Atalhos do workspace"
                className="absolute right-0 top-[calc(100%+0.5rem)] w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-white/10 bg-[#18101f]/[0.98] shadow-2xl shadow-black/40 backdrop-blur-xl"
              >
                <button
                  type="button"
                  onClick={() => {
                    setQuickPanelOpen(false);
                    setCreditsOpen(true);
                    void loadCreditWallet();
                  }}
                  className="flex w-full items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-3 text-left transition hover:bg-white/[0.05] focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-200"
                  aria-label="Ver saldo e detalhes dos créditos"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <Coins size={19} className="shrink-0 text-violet-300" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-xs text-white/50">Créditos disponíveis</span>
                      <span className="mt-0.5 block text-lg font-semibold text-white">
                        {creditsLoading
                          ? "Atualizando…"
                          : workspacePreferences.mostrar_indicadores_credito
                            ? usableCredits.toFixed(2)
                            : "Ocultos"}
                      </span>
                    </span>
                  </span>
                  <span className="shrink-0 text-xs font-medium text-violet-200">Ver carteira</span>
                </button>
                <div className="grid gap-1 p-2">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPanelOpen(false);
                      void exportConversation();
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-200"
                    aria-label="Baixar conversa como arquivo de texto"
                  >
                    <Download size={17} className="text-white/55" aria-hidden="true" />
                    Baixar conversa
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuickPanelOpen(false);
                      openSidebar();
                      window.setTimeout(() => searchInputRef.current?.focus(), 220);
                    }}
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm text-white/80 transition hover:bg-white/[0.06] hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-violet-200"
                    aria-label="Pesquisar conversas"
                  >
                    <Search size={17} className="text-white/55" aria-hidden="true" />
                    Pesquisar conversas
                  </button>
                </div>
                <p className="border-t border-white/[0.08] px-4 py-2.5 text-[11px] text-white/35">
                  Mais atalhos em breve
                </p>
              </section>
            )}
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
                ref={searchInputRef}
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

          <div className="hidden justify-center lg:flex">
            <AdsterraNativeBanner placement="rail-160x300" />
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
                <p className="mt-1 text-sm text-white/45">Convites válidos podem gerar créditos grátis.</p>
              </div>
              <button type="button" onClick={() => setCreditsOpen(false)} className="flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar créditos"><X size={18} /></button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-2xl bg-white/[0.06] p-3"><p className="text-[11px] text-white/45">Disponível</p><p className="mt-1 text-lg font-semibold text-white">{usableCredits.toFixed(2)}</p></div>
              <div className="rounded-2xl bg-amber-400/[0.10] p-3"><p className="text-[11px] text-white/55">Créditos diários</p><p className="mt-1 text-lg font-semibold text-amber-200">{dailyBalance.toFixed(2)}/{creditWallet.daily_credits_limit >= 999999 ? "∞" : creditWallet.daily_credits_limit.toFixed(0)}</p></div>
              <div className="rounded-2xl bg-violet-400/[0.10] p-3"><p className="text-[11px] text-white/55">Grátis</p><p className="mt-1 text-lg font-semibold text-violet-200">{creditWallet.free_credits.toFixed(2)}</p></div>
              <div className="rounded-2xl bg-emerald-400/[0.10] p-3"><p className="text-[11px] text-white/55">Comprados</p><p className="mt-1 text-lg font-semibold text-emerald-200">{creditWallet.purchased_credits.toFixed(2)}</p></div>
            </div>

            <div className="mt-5 space-y-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="font-semibold text-white">Conseguir créditos grátis</p>
                <p className="mt-1 text-sm leading-5 text-white/50">Receba a renovação diária e ganhe créditos ao convidar pessoas elegíveis.</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45"><span className="rounded-full bg-white/[0.06] px-2.5 py-1">Renovação diária</span><span className="rounded-full bg-white/[0.06] px-2.5 py-1">Convites</span></div>
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
          <div className="w-full max-w-md rounded-3xl border border-violet-300/20 bg-[#18101f] p-6 shadow-2xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="relative min-h-[142px] pr-20">
              <div className="relative z-10 max-w-[78%] text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Compartilhar resposta</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">Leve esta reflexão com você</h2>
                <p className="mt-3 text-sm leading-6 text-white/50">Envie esta ideia para alguém ou guarde o texto para depois.</p>
              </div>
              <div className="absolute right-0 top-8 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-violet-300 via-violet-500 to-indigo-600 text-white shadow-xl shadow-violet-950/30">
                <MessageSquareText size={38} strokeWidth={1.8} />
                <Sparkles className="absolute -right-2 -top-2 text-violet-100" size={20} />
              </div>
              <button type="button" onClick={() => setShareMessage(null)} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06] text-white/55 hover:bg-white/10 hover:text-white" aria-label="Fechar compartilhamento"><X size={18} /></button>
            </div>
            <p className="mt-2 max-h-28 overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-400/[0.07] p-4 text-sm leading-6 text-white/65">{shareMessage.content}</p>
            <button type="button" onClick={() => void navigator.share?.({ title: "Uma reflexão do DecidlyAI", text: shareMessage.content, url: window.location.href })} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-400"><Share2 size={18} />Compartilhar</button>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a aria-label="WhatsApp" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Olha esta reflexão do DecidlyAI: ${shareMessage.content}`)}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:-translate-y-0.5" title="WhatsApp"><SiWhatsapp size={23} /></a>
              <a aria-label="Facebook" target="_blank" rel="noreferrer" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg transition hover:-translate-y-0.5" title="Facebook"><SiFacebook size={22} /></a>
              <a aria-label="X" target="_blank" rel="noreferrer" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage.content.slice(0, 240))}&url=${encodeURIComponent(window.location.href)}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/15 transition hover:-translate-y-0.5" title="X"><SiX size={20} /></a>
              <a aria-label="LinkedIn" target="_blank" rel="noreferrer" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-lg transition hover:-translate-y-0.5" title="LinkedIn"><FaLinkedinIn size={22} /></a>
              <a aria-label="Reddit" target="_blank" rel="noreferrer" href={`https://www.reddit.com/submit?title=${encodeURIComponent("Reflexão do DecidlyAI")}&text=${encodeURIComponent(shareMessage.content)}`} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF4500] text-white shadow-lg transition hover:-translate-y-0.5" title="Reddit"><SiReddit size={23} /></a>
            </div>
            <button type="button" onClick={() => void navigator.clipboard?.writeText(shareMessage.content)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/65 transition hover:bg-white/[0.06] hover:text-white"><Copy size={16} />Copiar texto</button>
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
            <div className="relative min-h-[150px] pr-20">
              <div className="relative z-10 max-w-[78%] text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Convide e Ganhe!</p>
                <h2 className="mt-2 text-2xl font-semibold leading-tight text-white">{WORKSPACE_EVENT.title}</h2>
                <p className="mt-3 text-sm leading-6 text-white/50">{WORKSPACE_EVENT.description}</p>
              </div>
              <div className="absolute right-0 top-8 flex h-20 w-20 items-center justify-center rounded-[1.7rem] bg-gradient-to-br from-amber-200 via-amber-300 to-orange-400 text-[#24150b] shadow-xl shadow-amber-500/20">
                <Mail size={38} strokeWidth={1.8} />
                <Sparkles className="absolute -right-2 -top-2 text-amber-100" size={20} />
                <Users className="absolute -bottom-2 -left-2 rounded-full bg-[#18101f] p-1 text-violet-200" size={25} />
              </div>
              <button type="button" onClick={() => setEventOpen(false)} className="absolute right-0 top-0 flex h-9 w-9 items-center justify-center rounded-xl text-white/45 hover:bg-white/[0.06] hover:text-white" aria-label="Fechar evento"><X size={18} /></button>
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-white/35">Seu link de convite</p>
              <p className="mt-2 break-all text-sm text-violet-200">{referralCode ? `${window.location.origin}/login?ref=${referralCode}&campaign=${WORKSPACE_EVENT.id}` : "Gerando seu link…"}</p>
            </div>
            <button type="button" disabled={!referralCode} onClick={() => void copyReferralLink()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3.5 font-semibold text-[#20150a] shadow-lg shadow-black/10 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"><Link2 size={17} />{referralCopied ? "Link copiado" : "Copiar link de convite"}</button>
            <button type="button" disabled={!referralCode} onClick={() => void shareReferralLink()} className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-950/25 transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-50"><Share2 size={18} />Compartilhar</button>
            <div className="mt-4 flex items-center justify-center gap-3">
              <a aria-label="Compartilhar no WhatsApp" target="_blank" rel="noreferrer" href={referralCode ? `https://wa.me/?text=${encodeURIComponent(`${INVITE_SHARE_TEXT} ${referralUrl}`)}` : "#"} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/15 transition hover:-translate-y-0.5" title="WhatsApp"><SiWhatsapp size={23} /></a>
              <a aria-label="Compartilhar no Facebook" target="_blank" rel="noreferrer" href={referralCode ? `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}` : "#"} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-lg shadow-[#1877F2]/15 transition hover:-translate-y-0.5" title="Facebook"><SiFacebook size={22} /></a>
              <a aria-label="Compartilhar no X" target="_blank" rel="noreferrer" href={referralCode ? `https://twitter.com/intent/tweet?text=${encodeURIComponent(INVITE_SHARE_TEXT)}&url=${encodeURIComponent(referralUrl)}` : "#"} className="flex h-12 w-12 items-center justify-center rounded-full bg-black text-white ring-1 ring-white/15 transition hover:-translate-y-0.5" title="X"><SiX size={20} /></a>
              <a aria-label="Compartilhar no LinkedIn" target="_blank" rel="noreferrer" href={referralCode ? `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralUrl)}` : "#"} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0A66C2] text-white shadow-lg shadow-[#0A66C2]/15 transition hover:-translate-y-0.5" title="LinkedIn"><FaLinkedinIn size={22} /></a>
              <a aria-label="Compartilhar no Reddit" target="_blank" rel="noreferrer" href={referralCode ? `https://www.reddit.com/submit?title=${encodeURIComponent(INVITE_SHARE_TEXT)}&url=${encodeURIComponent(referralUrl)}` : "#"} className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FF4500] text-white shadow-lg shadow-[#FF4500]/15 transition hover:-translate-y-0.5" title="Reddit"><SiReddit size={23} /></a>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2"><Link to="/como-funciona" onClick={() => setEventOpen(false)} className="flex w-full items-center justify-center rounded-xl border border-white/10 px-3 py-3 text-center text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">Como funciona</Link><Link to="/referral-history" onClick={() => setEventOpen(false)} className="flex w-full items-center justify-center rounded-xl border border-white/10 px-3 py-3 text-center text-xs text-white/60 transition hover:bg-white/[0.06] hover:text-white">Histórico de convites</Link></div>
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
              <button type="button" onClick={() => { const safeName = safePublicName(preferredName); setPreferredName(safeName); window.localStorage.setItem("decidly-preferred-name", safeName); setAccountOpen(false); }} className="rounded-xl bg-violet-500 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-400">Salvar preferência</button>
            </div>
            <Link to="/settings" onClick={() => setAccountOpen(false)} className="mt-3 flex w-full items-center justify-center rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-semibold text-white/80 hover:bg-white/[0.1] hover:text-white">Account &amp; Settings</Link>
            <button type="button" onClick={() => { void supabase.auth.signOut(); navigate({ to: "/login" }); }} className="mt-5 w-full rounded-xl border border-red-400/20 px-4 py-3 text-sm text-red-300 hover:bg-red-400/[0.08]">Sair da conta</button>
          </div>
        </div>
      )}

      {/* ======================================================
          CHAT
          ====================================================== */}

      <main
        className="relative z-10 flex min-h-0 flex-col overflow-hidden"
        style={{ height: viewportHeight > 0 ? `${viewportHeight}px` : "100dvh" }}
      >
        <div
          ref={chatRef}
          onScroll={() => {
            if (!chatRef.current) return;
            const distanceFromBottom = chatRef.current.scrollHeight - chatRef.current.scrollTop - chatRef.current.clientHeight;
            autoScrollRef.current = workspacePreferences.rolagem_apos_resposta === "always"
              || (workspacePreferences.rolagem_apos_resposta === "near_bottom" && distanceFromBottom < 120);
          }}
          className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-4 sm:px-6"
        >
          <div className="mx-auto w-full max-w-3xl">
            {messages.length ===
              0 && (
              <div className="flex min-h-full flex-col items-center justify-center px-4 py-8">
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
                        onPointerDown={message.role === "user" ? (event) => startMessageLongPress(event, message) : undefined}
                        onPointerUp={message.role === "user" ? clearMessageLongPress : undefined}
                        onPointerCancel={message.role === "user" ? clearMessageLongPress : undefined}
                        onPointerLeave={message.role === "user" ? clearMessageLongPress : undefined}
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
                                ) : message.toolId === "create_image" && isLoading ? (
                                  <div className="inline-flex items-center gap-2 rounded-2xl border border-violet-300/15 bg-violet-400/[0.07] px-3 py-2 text-sm text-white/60"><Loader2 size={15} className="animate-spin text-violet-300" />Preparando sua imagem…</div>
                                ) : <RichResponse content={message.content} messageId={message.id} onActionRequest={handleResponseAction} onImageEditRequest={(prompt) => { setSelectedTool({ id: "create_text_image", label: "Imagem de texto", cost: 0.5, costLabel: "0,5 crédito" }); setInput(prompt); requestAnimationFrame(() => textareaRef.current?.focus()); }} />}
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
                                  onClick={() => void regenerateAssistantMessage(message)}
                                  disabled={isLoading}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                                  aria-label="Regenerar resposta"
                                  title="Regenerar resposta"
                                >
                                  <RefreshCw size={15} />
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
                            <>
                              {message.toolLabel && (
                                <span className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-medium text-white/80">
                                  {message.toolId === "create_image" ? <ImageIcon size={12} /> : message.toolId === "create_text_image" ? <Type size={12} /> : <FileText size={12} />} {message.toolLabel}
                                </span>
                              )}
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            </>
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
                      <span>
                        {requestTool?.id === "create_image"
                          ? "Preparando sua imagem…"
                          : requestTool
                            ? requestPhase === "sending"
                            ? `Enviando para a IA · ${requestTool.label}…`
                            : `A IA está preparando · ${requestTool.label}`
                          : requestPhase === "sending"
                            ? "Enviando…"
                            : thinkingLabel}
                      </span>
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

            {notice && (
              <div role="status" className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-emerald-400/15 bg-emerald-500/[0.06] px-4 py-3 text-sm text-emerald-200/85">
                <span className="inline-flex items-center gap-2"><Check size={15} />{notice}</span>
                <button type="button" onClick={() => setNotice("")} className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-200 hover:bg-emerald-400/10">Fechar</button>
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
          className="relative z-[50] w-full shrink-0 px-3 pt-2 sm:px-6 sm:pt-3"
          style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
        >
          <div className="relative mx-auto max-w-3xl">
            {pendingQuestion && (
              <div className="mb-3 rounded-3xl border border-violet-300/20 bg-[#21152d] p-4 shadow-xl shadow-black/20">
                <div className="flex items-start justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-300">✦ {pendingQuestion.ai} quer saber</p><p className="mt-2 text-sm leading-6 text-white/80">{pendingQuestion.text}</p></div>
                  <button type="button" onClick={() => setPendingQuestion(null)} className="rounded-xl p-1.5 text-white/40 hover:bg-white/10 hover:text-white" aria-label="Ignorar pergunta"><X size={17} /></button>
                </div>
                <div className="mt-3 flex gap-2"><button type="button" onClick={() => { setInput("Resposta: "); requestAnimationFrame(() => textareaRef.current?.focus()); }} className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-semibold text-white hover:bg-violet-400">Responder</button><button type="button" onClick={() => setPendingQuestion(null)} className="rounded-xl border border-white/10 px-3 py-2 text-xs text-white/60 hover:bg-white/10 hover:text-white">Ignorar</button></div>
              </div>
            )}
            {selectedTool && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] px-3 py-2">
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  {selectedTool.id === "create_image" ? <ImageIcon size={15} className="shrink-0 text-violet-200" /> : selectedTool.id === "create_text_image" ? <Type size={15} className="shrink-0 text-violet-200" /> : <FileText size={15} className="shrink-0 text-violet-200" />}
                  <span><span className="text-white/45">Ativo neste envio · </span><strong className="font-medium text-violet-100">{selectedTool.label} · {selectedTool.costLabel}</strong></span>
                </span>
                <button type="button" onClick={() => setSelectedTool(null)} className="rounded-lg p-1 text-white/45 transition hover:bg-white/10 hover:text-white" aria-label="Desativar ferramenta selecionada"><X size={14} /></button>
              </div>
            )}
            {attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex max-w-full items-center gap-2 rounded-xl bg-violet-400/[0.1] px-2.5 py-1.5 text-xs text-violet-100">
                    <Paperclip size={13} className="shrink-0 text-violet-300" />
                    <span className="max-w-[14rem] truncate">{attachment.name}</span>
                    <button type="button" onClick={() => removeAttachment(attachment.id)} className="rounded-md p-0.5 text-white/45 hover:bg-white/10 hover:text-white" aria-label={`Remover ${attachment.name}`}><X size={13} /></button>
                  </div>
                ))}
              </div>
            )}
            {toolsOpen && (
              <ToolCenter selected={selectedTool} onSelect={setSelectedTool} onClose={() => setToolsOpen(false)} onAttach={() => attachmentInputRef.current?.click()} />
            )}
            <input
              ref={attachmentInputRef}
              type="file"
              accept=".pdf,.txt,.md,.csv,.json,image/png,image/jpeg,image/webp"
              multiple
              className="hidden"
              onChange={(event) => {
                void addAttachments(event.target.files);
                event.currentTarget.value = "";
              }}
            />
            <div
              className="rounded-[26px] bg-[#17101f] px-2.5 py-1.5 shadow-2xl"
              style={{
                border: "none",
                outline: "none",
                boxShadow:
                  "0 20px 45px rgba(0,0,0,.25)",
              }}
            >
              <div className="flex items-end gap-1.5">
                <div className="mb-0.5 flex shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => setToolsOpen((open) => !open)} className={`flex h-8 w-8 items-center justify-center rounded-full transition ${toolsOpen ? "bg-violet-400/15 text-violet-200" : "text-white/45 hover:bg-white/5 hover:text-white"}`} aria-label="Abrir ferramentas"><Plus size={17} strokeWidth={2.2} className={toolsOpen ? "rotate-45 transition-transform" : "transition-transform"} /></button>
                </div>
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={handleTextareaKeyDown}
                    onFocus={handleTextareaFocus}
                    placeholder="Escreva sua decisão..."
                    rows={1}
                    className="min-h-[48px] max-h-[128px] flex-1 resize-none overflow-y-auto bg-transparent px-2 py-2.5 text-[15px] leading-6 text-white placeholder:text-white/35 focus:outline-none focus:ring-0"
                    style={{ border: "none", outline: "none", boxShadow: "none", appearance: "none", WebkitAppearance: "none" }}
                  />

                <button type="button" onClick={toggleListening} className={`mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition ${listening ? "bg-[#8B5CF6]/20 text-[#A78BFA]" : "text-white/45 hover:bg-white/5 hover:text-white"}`} aria-label={listening ? "Parar microfone" : "Usar microfone"}>{listening ? <MicOff size={16} /> : <Mic size={16} />}</button>

                <button
                  type="button"
                  onClick={() => void sendMessage()}
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-white transition hover:bg-[#9B6AF7] disabled:cursor-not-allowed disabled:opacity-30"
                  aria-label="Enviar"
                >
                  <ArrowUp size={17} />
                </button>
              </div>
            </div>

            <div className="mt-2 text-center text-[10px] text-white/20">
              Ctrl + Enter para enviar
            </div>
          </div>
        </div>
      </main>

      {limitPopup && (
        <div className="fixed inset-0 z-[175] flex items-center justify-center bg-[#0d0912]/75 p-4 backdrop-blur-sm">
          <div role="alertdialog" aria-modal="true" aria-labelledby="limit-popup-title" className="w-full max-w-md rounded-[2rem] border border-amber-300/20 bg-[#21152d] p-6 text-white shadow-2xl shadow-black/50 sm:p-7">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">Criação pausada</p><h2 id="limit-popup-title" className="mt-1 text-xl font-bold">{limitPopup.title}</h2></div><button type="button" onClick={() => setLimitPopup(null)} className="rounded-xl p-2 text-white/45 hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={18} /></button></div>
            <p className="mt-5 text-sm leading-6 text-white/65">{limitPopup.message}</p>
            <button type="button" onClick={() => setLimitPopup(null)} className="mt-6 w-full rounded-2xl bg-violet-500 px-4 py-3.5 font-semibold text-white hover:bg-violet-400">Entendi</button>
          </div>
        </div>
      )}

      {installOpen && installPrompt && (
        <div className="fixed inset-0 z-[180] flex items-end justify-center bg-[#0d0912]/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[#21152d] p-6 text-white shadow-2xl shadow-black/40 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src={decidlyaiMarkUrl}
                  alt=""
                  width={56}
                  height={56}
                  className="h-14 w-14 rounded-2xl bg-white object-cover shadow-lg"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">
                    DecidlyAI
                  </p>
                  <h2 className="mt-1 text-xl font-bold">Leve suas decisões com você</h2>
                </div>
              </div>
              <button type="button" onClick={() => setInstallOpen(false)} className="rounded-xl p-2 text-white/45 transition hover:bg-white/10 hover:text-white" aria-label="Fechar"><X size={18} /></button>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-white/65">Instale o app para abrir o DecidlyAI mais rápido, com uma experiência limpa e acesso direto pela tela inicial.</p>
            <label className="mt-5 flex cursor-pointer items-center gap-3 text-sm text-white/60">
              <input type="checkbox" checked={installNeverShow} onChange={(event) => setInstallNeverShow(event.target.checked)} className="h-4 w-4 accent-violet-500" />
              Não mostrar novamente
            </label>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => void installApp()} className="rounded-2xl bg-violet-500 px-4 py-3.5 font-semibold text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-400">Instalar app</button>
              <button type="button" onClick={continueOnWeb} className="rounded-2xl border border-white/15 px-4 py-3.5 font-semibold text-white/75 transition hover:bg-white/10 hover:text-white">Continuar na web</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
