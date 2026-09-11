import { supabase } from "./supabase";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Options = {
  message: string;
  history: ChatMessage[];
  onDelta?: (text: string, accumulated: string) => void;
  signal?: AbortSignal;
};

function textFrom(data: unknown): string {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";
  const value = data as Record<string, unknown>;
  if (typeof value.response === "string") return value.response;
  if (typeof value.answer === "string") return value.answer;
  if (typeof value.delta === "string") return value.delta;
  return "";
}

function errorFrom(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const value = data as Record<string, unknown>;
  if (typeof value.error === "string") {
    const details = typeof value.details === "string" ? ` — ${value.details}` : "";
    return `${value.error}${details}`;
  }
  return "";
}

function cleanDoneMarker(text: string): string {
  return text.replace(/\s*\[DONE\]\s*$/gi, "").trimEnd();
}

export async function streamAi(functionName: string, options: Options): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const baseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!token || !baseUrl || !anonKey) throw new Error("AUTH");

  let response: Response;
  try {
    response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
        Accept: "text/event-stream, application/json",
      },
      signal: options.signal,
      body: JSON.stringify({ message: options.message, history: options.history, stream: true }),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new Error("NETWORK");
  }

  if (!response.ok) {
    const error = new Error(`HTTP_${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }

  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const data = await response.json().catch(() => ({}));
    const serverError = errorFrom(data);
    if (serverError) throw new Error(serverError);
    const complete = cleanDoneMarker(textFrom(data));
    if (!complete) throw new Error("EMPTY_RESPONSE");
    options.onDelta?.(complete, complete);
    return complete;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let completeReceived = false;
  let doneReceived = false;

  const consume = (block: string) => {
    const normalized = block.replaceAll("\r\n", "\n");
    const raw = normalized.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!raw) return;
    if (raw === "[DONE]") { doneReceived = true; return; }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    const value = parsed as Record<string, unknown>;
    if (typeof value.error === "string") throw new Error(errorFrom(value) || value.error);
    if (value.complete === true) {
      const completeText = typeof value.response === "string" ? value.response : textFrom(parsed);
      if (completeText && !accumulated) {
        accumulated = cleanDoneMarker(completeText);
        options.onDelta?.(completeText, accumulated);
      }
      completeReceived = true;
      return;
    }
    const next = textFrom(parsed);
    if (!next) return;
    const delta = typeof value.accumulated === "string" && value.accumulated.startsWith(accumulated)
      ? value.accumulated.slice(accumulated.length)
      : next;
    accumulated = cleanDoneMarker(
      typeof value.accumulated === "string" ? value.accumulated : accumulated + delta,
    );
    if (delta) options.onDelta?.(delta, accumulated);
  };

  while (!completeReceived && !doneReceived) {
    if (options.signal?.aborted) throw new DOMException("Stream aborted", "AbortError");
    const { value, done: readerDone } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });
    buffer = buffer.replaceAll("\r\n", "\n");
    let split = buffer.indexOf("\n\n");
    while (split >= 0) {
      consume(buffer.slice(0, split));
      buffer = buffer.slice(split + 2);
      split = buffer.indexOf("\n\n");
    }
  }
  buffer += decoder.decode();
  if (buffer.trim()) consume(buffer);
  if (!accumulated.trim()) throw new Error("EMPTY_RESPONSE");
  return cleanDoneMarker(accumulated);
}
