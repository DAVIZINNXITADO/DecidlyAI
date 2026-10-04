import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const BUCKET = "decidlyai-artifacts";
const POLLINATIONS_BASE_URL = "https://image.pollinations.ai/prompt/";
const POLLINATIONS_IMAGE_MODEL = "sana";
const MAX_PROMPT_CHARS = 1_500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function readLimitedImage(response: Response, maxBytes: number) {
  const reader = response.body?.getReader();
  if (!reader) throw new ApiError("O provedor retornou uma imagem vazia.", 502);
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new ApiError("A imagem retornada excedeu o limite de tamanho.", 502);
    }
    chunks.push(value);
  }
  const imageBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    imageBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return imageBytes;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return Response.json({ error: "Método não permitido." }, { status: 405, headers: jsonHeaders });

  let authClient: ReturnType<typeof createClient> | null = null;
  let releaseClient: ReturnType<typeof createClient> | null = null;
  let requestId = "";
  let reservationCreated = false;
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey) {
      throw new ApiError("Sessão ou configuração do serviço inválida.", 401);
    }

    authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    releaseClient = createClient(supabaseUrl, serviceKey, { global: { headers: { Authorization: authorization } } });
    const accessToken = authorization.slice("Bearer ".length);
    const { data: userData } = await authClient.auth.getUser(accessToken);
    if (!userData.user) throw new ApiError("Sessão inválida. Entre novamente.", 401);

    const body = await request.json() as { operation_id?: unknown; prompt?: unknown };
    requestId = typeof body.operation_id === "string" ? body.operation_id : "";
    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!UUID_PATTERN.test(requestId)) throw new ApiError("Identificador da geração inválido.", 400);
    if (prompt.length < 8 || prompt.length > MAX_PROMPT_CHARS) {
      throw new ApiError(`A descrição da imagem deve ter entre 8 e ${MAX_PROMPT_CHARS} caracteres.`, 400);
    }

    const { data: reservation, error: reserveError } = await authClient.rpc("reserve_ai_artifact", {
      p_request_id: requestId,
      p_artifact_type: "image",
    });
    if (reserveError) {
      const message = reserveError.message ?? "";
      if (message.includes("insufficient_credits")) throw new ApiError("Créditos insuficientes. A geração de imagem profissional custa 2,5 créditos.", 402);
      if (message.includes("daily_artifact_limit:professional_image")) throw new ApiError("Você atingiu o limite diário de imagens profissionais do seu plano.", 429, "daily_artifact_limit:professional_image");
      throw new ApiError("Não foi possível reservar os créditos para esta imagem.", 500);
    }

    const reserved = reservation as { status?: string; replayed?: boolean; metadata?: { storage_path?: string; mime_type?: string } } | null;
    if (reserved?.status === "settled" && reserved.metadata?.storage_path) {
      return Response.json({ success: true, path: reserved.metadata.storage_path, mime_type: reserved.metadata.mime_type, replayed: true }, { headers: jsonHeaders });
    }
    if (reserved?.status === "reserved" && reserved.replayed) {
      throw new ApiError("Esta geração já está em andamento. Aguarde antes de tentar novamente.", 409);
    }
    reservationCreated = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90_000);
    const seed = Math.floor(Math.random() * 1000000);
    const pollinationsUrl = `${POLLINATIONS_BASE_URL}${encodeURIComponent(prompt)}?width=768&height=768&seed=${seed}&model=${POLLINATIONS_IMAGE_MODEL}&nologo=true`;
    let imageResponse: Response;
    let contentType = "";
    let imageBytes: Uint8Array;
    try {
      imageResponse = await fetch(pollinationsUrl, {
        method: "GET",
        signal: controller.signal,
      });
      if (!imageResponse.ok) {
        if (imageResponse.status === 429) {
          throw new ApiError("O Pollinations.ai está temporariamente indisponível ou sob alta demanda (HTTP 429). Tente novamente em alguns instantes; os créditos desta tentativa serão devolvidos.", 429, "provider_rate_limited");
        }
        throw new ApiError(`A geração de imagem falhou no Pollinations.ai (HTTP ${imageResponse.status}). Nenhuma imagem foi salva; os créditos serão devolvidos.`, 502, "provider_error");
      }
      const modelUsed = imageResponse.headers.get("x-model-used")?.trim().toLowerCase();
      if (modelUsed !== POLLINATIONS_IMAGE_MODEL) {
        throw new ApiError("O Pollinations.ai não confirmou o modelo Sana esperado. Nenhuma imagem foi salva; os créditos serão devolvidos.", 502, "unexpected_image_model");
      }
      contentType = imageResponse.headers.get("content-type")?.split(";")[0]?.toLowerCase() ?? "";
      if (contentType !== "image/jpeg" && contentType !== "image/png" && contentType !== "image/webp") {
        throw new ApiError("O Pollinations.ai retornou um formato de imagem não permitido.", 502, "invalid_image_type");
      }
      const advertisedSize = Number(imageResponse.headers.get("content-length") || 0);
      if (advertisedSize > MAX_IMAGE_BYTES) throw new ApiError("A imagem retornada excedeu o limite de tamanho.", 502, "image_too_large");
      imageBytes = await readLimitedImage(imageResponse, MAX_IMAGE_BYTES);
    } finally {
      clearTimeout(timeoutId);
    }

    if (!imageBytes.length || imageBytes.length > MAX_IMAGE_BYTES) {
      throw new ApiError("A imagem retornada excedeu o limite de tamanho.", 502, "image_too_large");
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const extension = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    const path = `${userData.user.id}/${requestId}.${extension}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, imageBytes, {
      contentType,
      upsert: true,
    });
    if (uploadError) throw new ApiError("Não foi possível guardar a imagem com segurança.", 500);

    const { error: settleError } = await authClient.rpc("settle_ai_artifact", {
      p_request_id: requestId,
      p_result_metadata: { storage_path: path, mime_type: contentType, prompt_chars: prompt.length },
    });
    if (settleError) {
      await admin.storage.from(BUCKET).remove([path]);
      throw new ApiError("Não foi possível finalizar a geração e registrar o arquivo.", 500);
    }

    return Response.json({ success: true, path, mime_type: contentType }, { headers: jsonHeaders });
  } catch (error) {
    if (reservationCreated && (releaseClient || authClient) && requestId && UUID_PATTERN.test(requestId)) {
      const { error: releaseError } = await (releaseClient || authClient!).rpc("release_ai_artifact", {
        p_request_id: requestId,
        p_reason: error instanceof Error ? error.message.slice(0, 180) : "generation_failed",
      });
      if (releaseError) console.error("Falha ao devolver créditos da imagem:", releaseError.message);
    }
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError
      ? error.message
      : error instanceof Error && error.name === "AbortError"
        ? "A geração excedeu o tempo limite. Os créditos reservados serão devolvidos."
        : "Não foi possível gerar a imagem agora. Os créditos reservados serão devolvidos.";
    return Response.json({ error: message, ...(error instanceof ApiError && error.code ? { code: error.code } : {}) }, { status, headers: jsonHeaders });
  }
});
