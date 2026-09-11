const ttsUrl = (import.meta.env.VITE_TTS_URL as string | undefined)?.trim();

export async function requestTtsAudio(text: string): Promise<HTMLAudioElement> {
  if (!ttsUrl) {
    throw new Error("TTS_NOT_CONFIGURED");
  }

  const response = await fetch(ttsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texto: text }),
  });

  if (!response.ok) {
    throw new Error(`TTS_HTTP_${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.size) {
    throw new Error("TTS_EMPTY_AUDIO");
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = "auto";
  audio.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
  audio.addEventListener("error", () => URL.revokeObjectURL(url), { once: true });
  return audio;
}

export function isServerTtsConfigured(): boolean {
  return Boolean(ttsUrl);
}
