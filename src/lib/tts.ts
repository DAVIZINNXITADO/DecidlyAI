import { supabase } from "./supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const ttsUrl = supabaseUrl ? `${supabaseUrl}/functions/v1/decidly-tts` : "";

export async function requestTtsAudio(text: string): Promise<HTMLAudioElement> {
  if (!ttsUrl) {
    throw new Error("TTS_NOT_CONFIGURED");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token || !supabaseAnonKey) throw new Error("AUTH");

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ texto: text }),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => "");
    throw new Error(`TTS_HTTP_${response.status}${details ? `_${details.slice(0, 80)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("TTS_EMPTY_AUDIO");
  }
  if (!contentType.includes("audio/")) {
    throw new Error("TTS_INVALID_CONTENT_TYPE");
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.volume = 1;
  audio.load();
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
  return audio;
}

export function isServerTtsConfigured(): boolean {
  return Boolean(ttsUrl);
}
