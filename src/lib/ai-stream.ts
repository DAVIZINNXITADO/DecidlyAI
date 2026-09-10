import { supabase } from "./supabase";

type ChatMessage = { role: "user" | "assistant"; content: string };

type Options = {
  message: string;
  history: ChatMessage[];
  onDelta?: (text: string, accumulated: string) => void;
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

export async function streamAi(functionName: string, options: Options): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const baseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const anonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;
  if (!token || !baseUrl || !anonKey) throw new Error("AUTH");

  const response = await fetch(`${baseUrl}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      "Content-Type": "application/json",
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify({ message: options.message, history: options.history, stream: true }),
  });

  if (!response.ok) {
    const error = new Error(`HTTP_${response.status}`);
    Object.assign(error, { status: response.status });
    throw error;
  }

  if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
    const complete = textFrom(await response.json()).trim();
    if (!complete) throw new Error("EMPTY_RESPONSE");
    options.onDelta?.(complete, complete);
    return complete;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let done = false;

  const consume = (block: string) => {
    const raw = block.split("\n").filter((line) => line.startsWith("data:")).map((line) => line.slice(5).trim()).join("\n");
    if (!raw || raw === "[DONE]") { done = true; return; }
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return; }
    const value = parsed as Record<string, unknown>;
    if (typeof value.error === "string") throw new Error(value.error);
    const next = textFrom(parsed);
    if (!next) return;
    const delta = typeof value.accumulated === "string" && value.accumulated.startsWith(accumulated)
      ? value.accumulated.slice(accumulated.length)
      : next;
    accumulated = typeof value.accumulated === "string" ? value.accumulated : accumulated + delta;
    options.onDelta?.(delta, accumulated);
    if (value.complete === true) done = true;
  };

  while (!done) {
    const { value, done: readerDone } = await reader.read();
    if (readerDone) break;
    buffer += decoder.decode(value, { stream: true });
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
  return accumulated.trim();
}
