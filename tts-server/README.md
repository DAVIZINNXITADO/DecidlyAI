# Servidor de voz DecidlyAI

Este serviço gera áudio MP3 usando `edge-tts-node` e a voz `pt-BR-AntonioNeural`. Ele deve ser hospedado em um serviço Node separado do frontend e exposto por HTTPS.

```bash
cd tts-server
npm install
ALLOWED_ORIGIN=https://seu-site.com npm start
```

Depois, configure no frontend:

```bash
VITE_TTS_URL=https://seu-servidor-de-voz.com/tts
```

A variável `TTS_VOICE` pode trocar a voz sem alterar o frontend. O endpoint aceita `POST /tts` com `{ "texto": "..." }` e retorna `audio/mpeg`.
