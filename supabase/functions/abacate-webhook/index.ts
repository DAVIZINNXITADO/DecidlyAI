import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PRODUCT_ID = "prod_Sy00DekE56ayMWQcQSJFL632";
const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
const encoder = new TextEncoder();
const asObject = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};

function constantTimeBase64Equal(expected: string, received: string): boolean {
  const left = encoder.encode(expected);
  const right = encoder.encode(received.trim());
  if (right.length > 256) return false;
  let difference = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function validSignature(rawBody: string, signature: string, publicKey: string): Promise<boolean> {
  if (!signature || signature.length > 256) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(publicKey),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
  const expected = btoa(String.fromCharCode(...digest));
  return constantTimeBase64Equal(expected, signature);
}

function centsFrom(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return value > 0 && value < 10 ? Math.round(value * 100) : Math.round(value);
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const configuredSecret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");
  const urlSecret = new URL(request.url).searchParams.get("webhookSecret");
  if (!configuredSecret || !urlSecret || urlSecret !== configuredSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  const rawBody = await request.text();
  const signature = request.headers.get("X-Webhook-Signature");
  if (signature) {
    const publicKey = Deno.env.get("ABACATEPAY_PUBLIC_KEY");
    if (!publicKey) {
      console.error("AbacatePay webhook signature key is not configured");
      return json({ error: "Configuração de assinatura indisponível." }, 500);
    }
    try {
      if (!(await validSignature(rawBody, signature, publicKey))) {
        return json({ error: "Assinatura inválida." }, 401);
      }
    } catch {
      console.error("AbacatePay webhook signature verification failed");
      return json({ error: "Assinatura inválida." }, 401);
    }
  } else {
    console.info("AbacatePay webhook accepted with URL secret only; signature header absent");
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return json({ error: "Payload JSON inválido." }, 400);
  }
  const event = typeof payload.event === "string" ? payload.event : "";
  if (!event) return json({ error: "Evento ausente no payload." }, 400);
  if (event !== "checkout.completed" && event !== "billing.paid") {
    return json({ ok: true, ignored: true });
  }

  const data = asObject(payload.data);
  const checkout = asObject(data.checkout);
  const billing = asObject(data.billing);
  const payment = Object.keys(checkout).length
    ? checkout
    : Object.keys(billing).length
      ? billing
      : data;
  const metadata = {
    ...asObject(data.metadata),
    ...asObject(payment.metadata),
  };
  const externalId = String(payment.externalId ?? payment.external_id ?? data.externalId ?? data.external_id ?? "");
  const metadataUserId = typeof metadata.userId === "string"
    ? metadata.userId
    : typeof metadata.user_id === "string"
      ? metadata.user_id
      : "";
  const userId = metadataUserId;
  const eventId = typeof payload.id === "string" ? payload.id : "";
  const userIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!eventId || eventId.length > 200 || !userId || !userIdPattern.test(userId)) {
    return json({ error: "Identidade do evento ou do usuário ausente/inválida." }, 400);
  }

  const providerStatus = typeof payment.status === "string" ? payment.status.toUpperCase() : "";
  if (providerStatus && providerStatus !== "PAID" && providerStatus !== "COMPLETED") {
    return json({ error: "O pagamento ainda não está confirmado." }, 400);
  }
  const amountCents = centsFrom(payment.paidAmount ?? payment.paid_amount ?? payment.amountCents ?? payment.amount_cents ?? payment.amount);
  if (amountCents !== 190) return json({ error: "Valor do pagamento inválido para o pacote de créditos." }, 400);
  const currency = String(payment.currency ?? payment.currencyCode ?? "BRL").toUpperCase();
  if (currency !== "BRL") return json({ error: "Moeda do pagamento inválida." }, 400);

  const items = Array.isArray(payment.items) ? payment.items : [];
  const correctProduct = items.length === 1
    && asObject(items[0]).id === PRODUCT_ID
    && Number(asObject(items[0]).quantity) === 1;
  const internalPackage = metadata.package === "credits-10";
  if (!correctProduct && !internalPackage) {
    return json({ error: "Produto de créditos ausente ou inválido." }, 400);
  }

  const providerPaymentId = String(payment.id ?? payment.checkoutId ?? payment.billingId ?? "");
  const idempotencyId = externalId || (providerPaymentId ? `abacate-${providerPaymentId}` : "");
  if (idempotencyId.length < 5 || idempotencyId.length > 200) {
    return json({ error: "Identificador do pagamento ausente ou inválido." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.error("AbacatePay webhook database configuration missing");
    return json({ error: "Processamento temporariamente indisponível." }, 500);
  }

  const safePayload = {
    id: eventId,
    event,
    apiVersion: payload.apiVersion ?? null,
    devMode: payload.devMode ?? null,
    checkout: {
      id: providerPaymentId || null,
      externalId: idempotencyId,
      amount: amountCents,
      paidAmount: amountCents,
      status: providerStatus || "PAID",
      items: items.length ? items.map((item) => {
        const value = asObject(item);
        return { id: value.id, quantity: value.quantity };
      }) : [{ id: PRODUCT_ID, quantity: 1 }],
    },
  };

  try {
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: result, error } = await admin.rpc("apply_abacatepay_payment", {
      p_event_id: eventId,
      p_user_id: userId,
      p_external_id: idempotencyId,
      p_amount_cents: amountCents,
      p_credits: 10,
      p_payload: safePayload,
    });
    if (error) {
      console.error("AbacatePay payment application failed", {
        eventId,
        databaseCode: error.code ?? "unknown",
      });
      if (error.code === "22023") return json({ error: "Dados do pagamento inválidos." }, 400);
      return json({ error: "Não foi possível registrar o pagamento; uma nova tentativa será processada." }, 500);
    }
    return json({ ok: true, result });
  } catch (error) {
    console.error("AbacatePay webhook transient processing error", {
      eventId,
      name: error instanceof Error ? error.name : "unknown",
    });
    return json({ error: "Falha temporária ao registrar o pagamento." }, 500);
  }
});
