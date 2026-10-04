import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation } from "@tanstack/react-router";
import { Check, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useLanguageContext } from "../lib/LanguageProvider";

const FORM_SUBMIT_AJAX_URL = "https://formsubmit.co/ajax/decidlyai@gmail.com";
const FORM_SUBMIT_FALLBACK_URL = "https://formsubmit.co/decidlyai@gmail.com";
const MAX_MESSAGE_LENGTH = 3000;

type FeedbackStatus = "idle" | "submitting" | "success" | "error";

type FormSubmitResponse = {
  success?: unknown;
  error?: unknown;
  message?: unknown;
};

function indicatesSuccess(payload: FormSubmitResponse) {
  const success = payload.success;
  // FormSubmit currently returns success as the string "true". Accept the
  // documented boolean/string variants, but never infer success from HTTP 2xx alone.
  return success === true || (typeof success === "string" && success.toLowerCase() === "true");
}

export function FeedbackWidget() {
  const { language } = useLanguageContext();
  const location = useLocation({ select: (currentLocation) => currentLocation.pathname });
  const isPortuguese = language === "pt-BR";
  const isWorkspace = location.startsWith("/workspace") || location.startsWith("/pt-br/workspace");
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("feedback");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<FeedbackStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLButtonElement>(null);

  const closeWidget = useCallback(() => {
    if (status === "submitting") return;
    setOpen(false);
    window.setTimeout(() => openerRef.current?.focus(), 0);
  }, [status]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => messageRef.current?.focus(), 0);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && status !== "submitting") {
        closeWidget();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeWidget, open, status]);

  function resetAfterSuccess() {
    setCategory("feedback");
    setMessage("");
    setEmail("");
    setHoneypot("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
      setStatus("error");
      setStatusMessage(
        isPortuguese
          ? "Descreva seu feedback com pelo menos 5 caracteres."
          : "Please describe your feedback with at least 5 characters.",
      );
      messageRef.current?.focus();
      return;
    }

    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }

    setStatus("submitting");
    setStatusMessage("");

    const formData = new URLSearchParams();
    formData.set("category", category);
    formData.set("message", trimmedMessage);
    if (email.trim()) formData.set("email", email.trim());
    formData.set("_subject", "Novo feedback — DecidlyAI");
    formData.set("_template", "table");
    formData.set("_honey", honeypot);

    try {
      const response = await fetch(FORM_SUBMIT_AJAX_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        },
        body: formData.toString(),
      });
      const responseText = await response.text();
      let payload: FormSubmitResponse;
      try {
        payload = JSON.parse(responseText) as FormSubmitResponse;
      } catch {
        payload = {};
      }

      if (!response.ok || !indicatesSuccess(payload) || payload.error === true) {
        throw new Error("FormSubmit did not confirm the submission.");
      }

      setStatus("success");
      setStatusMessage(
        isPortuguese
          ? "Feedback enviado. Obrigado por ajudar a melhorar o DecidlyAI."
          : "Feedback sent. Thank you for helping improve DecidlyAI.",
      );
      resetAfterSuccess();
    } catch {
      setStatus("error");
      setStatusMessage(
        isPortuguese
          ? "Não foi possível enviar agora. Tente novamente em instantes; seus campos foram preservados."
          : "We could not send this right now. Please try again shortly; your fields were preserved.",
      );
    }
  }

  const title = isPortuguese ? "Enviar feedback" : "Send feedback";
  const description = isPortuguese
    ? "Conte o que podemos melhorar. Não envie senhas ou dados sensíveis."
    : "Tell us what we can improve. Do not send passwords or sensitive data.";
  const categories = isPortuguese
    ? [
        ["feedback", "Feedback geral"],
        ["suggestion", "Sugestão"],
        ["bug", "Problema ou bug"],
        ["other", "Outro"],
      ]
    : [
        ["feedback", "General feedback"],
        ["suggestion", "Suggestion"],
        ["bug", "Problem or bug"],
        ["other", "Other"],
      ];

  return (
    <div
      className={`fixed right-4 z-[90] w-auto max-w-[calc(100vw-2rem)] sm:right-6 ${
        isWorkspace
          ? "bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-[calc(6.5rem+env(safe-area-inset-bottom))]"
          : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
      }`}
    >
      {open ? (
        <section
          id="decidly-feedback-panel"
          role="dialog"
          aria-modal="true"
          aria-labelledby="decidly-feedback-title"
          className="mb-3 w-[min(25rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-violet-400/25 bg-slate-950/95 shadow-2xl shadow-violet-950/40 backdrop-blur-xl"
        >
          <div className="flex max-h-[min(38rem,calc(100vh-2rem))] flex-col overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
              <div>
                <h2 id="decidly-feedback-title" className="text-base font-semibold text-white">
                  {title}
                </h2>
                <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
              </div>
              <button
                type="button"
                onClick={closeWidget}
                aria-label={isPortuguese ? "Fechar feedback" : "Close feedback"}
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form
              method="POST"
              action={FORM_SUBMIT_FALLBACK_URL}
              onSubmit={handleSubmit}
              className="space-y-4 px-5 py-4"
            >
              <input type="hidden" name="_subject" value="Novo feedback — DecidlyAI" />
              <input type="hidden" name="_template" value="table" />
              <div
                className="absolute -left-[10000px] h-px w-px overflow-hidden"
                aria-hidden="true"
              >
                <label htmlFor="decidly-feedback-honey">Website</label>
                <input
                  id="decidly-feedback-honey"
                  type="text"
                  name="_honey"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </div>

              <div>
                <label
                  htmlFor="decidly-feedback-category"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  {isPortuguese ? "Tipo" : "Type"}
                </label>
                <select
                  id="decidly-feedback-category"
                  name="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                >
                  {categories.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="decidly-feedback-message"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  {isPortuguese ? "Mensagem" : "Message"}
                </label>
                <textarea
                  ref={messageRef}
                  id="decidly-feedback-message"
                  name="message"
                  required
                  minLength={5}
                  maxLength={MAX_MESSAGE_LENGTH}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder={
                    isPortuguese
                      ? "O que aconteceu ou o que você sugere?"
                      : "What happened or what do you suggest?"
                  }
                  className="min-h-32 w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm leading-5 text-white outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
                <div className="mt-1 flex justify-between gap-3 text-[11px] text-slate-500">
                  <span>{isPortuguese ? "Mínimo de 5 caracteres" : "At least 5 characters"}</span>
                  <span aria-live="polite">
                    {message.length}/{MAX_MESSAGE_LENGTH}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="decidly-feedback-email"
                  className="mb-1.5 block text-xs font-medium text-slate-300"
                >
                  {isPortuguese ? "Seu e-mail (opcional)" : "Your email (optional)"}
                </label>
                <input
                  id="decidly-feedback-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder={isPortuguese ? "Para podermos responder" : "So we can reply"}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {statusMessage ? (
                <p
                  role="status"
                  aria-live="polite"
                  className={`rounded-xl border px-3 py-2.5 text-xs leading-5 ${
                    status === "success"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                  }`}
                >
                  {status === "success" ? <Check className="mr-1.5 inline h-3.5 w-3.5" /> : null}
                  {statusMessage}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={status === "submitting"}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-950/30 hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {status === "submitting"
                  ? isPortuguese
                    ? "Enviando..."
                    : "Sending..."
                  : isPortuguese
                    ? "Enviar feedback"
                    : "Send feedback"}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <button
        ref={openerRef}
        type="button"
        onClick={() => {
          setOpen(true);
          if (status === "success") {
            setStatus("idle");
            setStatusMessage("");
          }
        }}
        aria-label={title}
        aria-expanded={open}
        aria-controls="decidly-feedback-panel"
        className="inline-flex items-center gap-2 rounded-full border border-violet-300/25 bg-slate-950/95 px-4 py-3 text-sm font-semibold text-violet-100 shadow-xl shadow-violet-950/30 backdrop-blur-xl hover:border-violet-300/50 hover:bg-violet-950/90"
      >
        <MessageSquare className="h-4 w-4 text-violet-300" />
        <span>{title}</span>
      </button>
    </div>
  );
}
