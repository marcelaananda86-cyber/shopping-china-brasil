import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const blackcatKey = Deno.env.get("BLACKCAT_API_KEY");
const blackcatBaseUrl = "https://api.blackcatoficial.com/api";

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: true });
  if (!blackcatKey) return json({ error: "not_configured" }, 503);
  try {
    const payload = await request.json() as JsonObject;
    const transactionId = String(payload.transactionId ?? "");
    if (!transactionId) return json({ error: "transaction_id_required" }, 400);

    const service = createClient(supabaseUrl, serviceKey);
    const { data: payment } = await service.from("order_payments").select("id,order_id").eq("provider_transaction_id", transactionId).maybeSingle();
    if (!payment) return json({ ok: true, ignored: true });

    const verification = await fetch(`${blackcatBaseUrl}/sales/${encodeURIComponent(transactionId)}/status`, { headers: { "X-API-Key": blackcatKey } });
    const verified = await verification.json() as JsonObject;
    const data = asObject(verified.data);
    if (!verification.ok || verified.success !== true || String(data.transactionId ?? "") !== transactionId) return json({ error: "provider_verification_failed" }, 502);

    const status = mapStatus(String(data.status ?? "PENDING"));
    await service.from("order_payments").update({
      status,
      paid_at: data.paidAt ? String(data.paidAt) : status === "paid" ? new Date().toISOString() : null,
      end_to_end_id: data.endToEndId ? String(data.endToEndId) : null,
    }).eq("id", payment.id);

    const { data: payments } = await service.from("order_payments").select("status").eq("order_id", payment.order_id);
    if (payments?.length && payments.every((item) => item.status === "paid")) {
      await service.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", payment.order_id).eq("status", "pending_payment");
    } else if (payments?.length && payments.every((item) => ["cancelled", "refunded"].includes(item.status))) {
      await service.from("orders").update({ status: "cancelled" }).eq("id", payment.order_id).eq("status", "pending_payment");
    }
    return json({ ok: true });
  } catch (error) {
    console.error(error);
    return json({ error: "internal_error" }, 500);
  }
});

function mapStatus(value: string) {
  if (value.toUpperCase() === "PAID") return "paid";
  if (value.toUpperCase() === "REFUNDED") return "refunded";
  if (["CANCELLED", "FAILED"].includes(value.toUpperCase())) return "cancelled";
  return "pending";
}
function asObject(value: unknown): JsonObject { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {}; }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }
