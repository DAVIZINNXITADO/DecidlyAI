import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { EdgeTTS } from "jsr:@edge-tts/universal";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VOICE = "pt-BR-AntonioNeural";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.texto === "string" ? body.texto.trim() : "";

    if (!text) {
      return new Response(JSON.stringify({ error: "texto obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const tts = new EdgeTTS(text.slice(0, 12000), VOICE, {
      rate: "+0%",
      pitch: "+0Hz",
      volume: "+0%",
    });
    const result = await tts.synthesize();
    const audio = await result.audio.arrayBuffer();

    return new Response(audio, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("decidly-tts error", error);
    return new Response(JSON.stringify({ error: "tts_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
