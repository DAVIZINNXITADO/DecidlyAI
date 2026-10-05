import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const toBytes = (value: string) => new TextEncoder().encode(value);
const equal = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, index) => value === b[index]);
const hex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

async function validSignature(raw: string, signature: string, secret: string) {
  if (!signature) return false;
  const key = await crypto.subtle.importKey("raw", toBytes(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, toBytes(raw)));
  const expectedBase64 = btoa(String.fromCharCode(...digest));
  const expectedHex = hex(digest);
  return equal(toBytes(signature.trim()), toBytes(expectedBase64)) || signature.trim().toLowerCase() === expectedHex;
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);
  const secret = Deno.env.get("ABACATEPAY_WEBHOOK_SECRET");
  const urlSecret = new URL(request.url).searchParams.get("webhookSecret");
  if (!secret || urlSecret !== secret) return json({ error: "Unauthorized" }, 401);
  const raw = await request.text();
  const signature = request.headers.get("X-Webhook-Signature") || "";
  if (signature && !(await validSignature(raw, signature, secret))) return json({ error: "Invalid signature" }, 401);
  try {
    const payload = JSON.parse(raw) as Record<string, unknown>;
    const event = String(payload.event || "");
    if (!["checkout.completed", "billing.paid"].includes(event)) return json({ ok: true, ignored: true });
    const data = (payload.data && typeof payload.data === "object" ? payload.data : {}) as Record<string, unknown>;
    const metadata = (data.metadata && typeof data.metadata === "object" ? data.metadata : {}) as Record<string, unknown>;
    const customer = (data.customer && typeof data.customer === "object" ? data.customer : {}) as Record<string, unknown>;
    const userId = String(metadata.userId || metadata.user_id || "");
    const eventId = String(payload.id || data.id || data.billingId || data.checkoutId || "");
    const externalId = String(data.externalId || data.external_id || "");
    const amount = Number(data.amount || data.amountCents || data.amount_cents || 190);
    if (!eventId || !userId) return json({ error: "Missing event or user identity" }, 400);
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceKey) return json({ error: "Server configuration error" }, 500);
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: result, error } = await admin.rpc("apply_abacatepay_payment", { p_event_id: eventId, p_user_id: userId, p_external_id: externalId, p_amount_cents: Math.round(amount), p_credits: Number(metadata.credits || 10), p_payload: payload });
    if (error) throw error;
    return json({ ok: true, result, customer: customer.email ? "linked" : "anonymous" });
  } catch (error) {
    console.error("AbacatePay webhook error", error);
    return json({ error: error instanceof Error ? error.message : "Webhook processing failed" }, 500);
  }
});
