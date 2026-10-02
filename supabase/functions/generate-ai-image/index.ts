import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const jsonHeaders = { ...corsHeaders, "Content-Type": "application/json" };
const BUCKET = "decidlyai-artifacts";
const MAX_PROMPT_CHARS = 1_500;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
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
  let requestId = "";
  let reservationCreated = false;
  try {
    const authorization = request.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const falKey = Deno.env.get("FAL_KEY");
    if (!authorization?.startsWith("Bearer ") || !supabaseUrl || !anonKey || !serviceKey) {
      throw new ApiError("Sessão ou configuração do serviço inválida.", 401);
    }
    if (!falKey) throw new ApiError("A geração de imagens ainda não está configurada no servidor.", 503);

    authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
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
      if (message.includes("insufficient_credits")) throw new ApiError("Créditos insuficientes. A geração de imagem custa 6 créditos.", 402);
      throw new ApiError("Não foi possível reservar os créditos para esta imagem.", 500);
    }

    const reserved = reservation as { status?: string; replayed?: boolean; metadata?: { storage_path?: string } } | null;
    if (reserved?.status === "settled" && reserved.metadata?.storage_path) {
      return Response.json({ success: true, path: reserved.metadata.storage_path, replayed: true }, { headers: jsonHeaders });
    }
    if (reserved?.status === "reserved" && reserved.replayed) {
      throw new ApiError("Esta geração já está em andamento. Aguarde antes de tentar novamente.", 409);
    }
    reservationCreated = true;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60_000);
    let result: { images?: Array<{ url?: string; content_type?: string | null }> };
    try {
      const falResponse = await fetch("https://fal.run/fal-ai/flux/schnell", {
        method: "POST",
        signal: controller.signal,
        headers: { Authorization: `Key ${falKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          num_inference_steps: 4,
          image_size: { width: 1024, height: 1024 },
          num_images: 1,
          output_format: "jpeg",
          enable_safety_checker: true,
        }),
      });
      if (!falResponse.ok) {
        throw new ApiError(`A geração de imagem falhou no provedor (HTTP ${falResponse.status}). Nenhuma imagem foi salva.`, 502);
      }
      result = await falResponse.json() as { images?: Array<{ url?: string; content_type?: string | null }> };
    } finally {
      clearTimeout(timeoutId);
    }

    const imageUrl = result.images?.[0]?.url;
    if (!imageUrl) throw new ApiError("O provedor não retornou uma imagem.", 502);
    const parsedImageUrl = new URL(imageUrl);
    if (parsedImageUrl.protocol !== "https:" || !(parsedImageUrl.hostname === "fal.media" || parsedImageUrl.hostname.endsWith(".fal.media"))) {
      throw new ApiError("O provedor retornou uma origem de imagem inválida.", 502);
    }

    const imageController = new AbortController();
    const imageTimeout = setTimeout(() => imageController.abort(), 30_000);
    let imageResponse: Response;
    let contentType = "";
    let imageBytes: Uint8Array;
    try {
      imageResponse = await fetch(parsedImageUrl, { signal: imageController.signal });
      if (!imageResponse.ok) throw new ApiError("Não foi possível salvar a imagem retornada pelo provedor.", 502);
      contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
      if (contentType !== "image/jpeg" && contentType !== "image/png") {
        throw new ApiError("O provedor retornou um formato de imagem não permitido.", 502);
      }
      const advertisedSize = Number(imageResponse.headers.get("content-length") || 0);
      if (advertisedSize > MAX_IMAGE_BYTES) throw new ApiError("A imagem retornada excedeu o limite de tamanho.", 502);
      imageBytes = await readLimitedImage(imageResponse, MAX_IMAGE_BYTES);
    } finally {
      clearTimeout(imageTimeout);
    }
    if (!imageBytes.length || imageBytes.length > MAX_IMAGE_BYTES) {
      throw new ApiError("A imagem retornada excedeu o limite de tamanho.", 502);
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const extension = contentType === "image/png" ? "png" : "jpg";
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
    if (reservationCreated && authClient && requestId && UUID_PATTERN.test(requestId)) {
      await authClient.rpc("release_ai_artifact", {
        p_request_id: requestId,
        p_reason: error instanceof Error ? error.message.slice(0, 180) : "generation_failed",
      }).catch(() => undefined);
    }
    const status = error instanceof ApiError ? error.status : 500;
    const message = error instanceof ApiError
      ? error.message
      : error instanceof Error && error.name === "AbortError"
        ? "A geração excedeu o tempo limite. Os créditos reservados serão devolvidos."
        : "Não foi possível gerar a imagem agora. Os créditos reservados serão devolvidos.";
    return Response.json({ error: message }, { status, headers: jsonHeaders });
  }
});
