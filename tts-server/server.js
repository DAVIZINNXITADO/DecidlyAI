import express from "express";
import { EdgeTTS } from "edge-tts-node";

const app = express();
const port = Number(process.env.PORT || 3000);
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const voice = process.env.TTS_VOICE || "pt-BR-AntonioNeural";

app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", allowedOrigin);
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/tts", async (req, res) => {
  const text = typeof req.body?.texto === "string" ? req.body.texto.trim() : "";
  if (!text) return res.status(400).json({ erro: "texto obrigatório" });

  try {
    const tts = new EdgeTTS();
    const audio = await tts.synthesize(text.slice(0, 12000), voice, {
      rate: "+0%",
      pitch: "+0Hz",
    });

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Disposition": "inline",
      "Cache-Control": "no-store",
    });
    return res.send(Buffer.from(audio.audio));
  } catch (error) {
    console.error("TTS error:", error);
    return res.status(500).json({ erro: "falha no TTS" });
  }
});

app.listen(port, "0.0.0.0", () => {
  console.log(`TTS server listening on port ${port} with voice ${voice}`);
});
