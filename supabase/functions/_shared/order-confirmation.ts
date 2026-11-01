import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;
// O cliente sem tipos gerados preserva a tipagem dinâmica das tabelas do Supabase.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ServiceClient = SupabaseClient<any, "public", "public", any, any>;

type OrderItem = {
  product_id: string;
  slug: string;
  title: string;
  image_url: string;
  unit_price_cents: number;
  quantity: number;
};

type PaidOrder = {
  id: string;
  status: string;
  customer_name: string | null;
  customer_email: string | null;
  subtotal_cents: number;
  shipping_cents: number;
  total_cents: number;
  currency: string;
  shipping_deadline_days: number;
  shipping_address: JsonObject | null;
  created_at: string;
  paid_at: string | null;
  order_items: OrderItem[];
};

const defaultSiteUrl = "https://shoppingchinabrasil.com";
const defaultSenderName = "Shopping China Brasil";

export async function sendOrderConfirmationEmail(service: ServiceClient, orderId: string) {
  const apiKey = Deno.env.get("BREVO_API_KEY")?.trim();
  const senderEmail = Deno.env.get("BREVO_SENDER_EMAIL")?.trim().toLowerCase();
  if (!apiKey || !senderEmail) {
    console.info("order_confirmation_email_not_configured", orderId);
    return { sent: false, reason: "not_configured" } as const;
  }

  const { data: claimed, error: claimError } = await service.rpc("claim_order_confirmation_email", { p_order_id: orderId });
  if (claimError) {
    console.error("order_confirmation_email_claim_failed", orderId, claimError.message);
    return { sent: false, reason: "claim_failed" } as const;
  }
  if (!claimed) return { sent: false, reason: "already_processed" } as const;

  try {
    const { data, error } = await service.from("orders")
      .select("id,status,customer_name,customer_email,subtotal_cents,shipping_cents,total_cents,currency,shipping_deadline_days,shipping_address,created_at,paid_at,order_items(product_id,slug,title,image_url,unit_price_cents,quantity)")
      .eq("id", orderId)
      .single();
    if (error || !data) throw new Error(error?.message ?? "order_not_found");

    const order = data as unknown as PaidOrder;
    const recipient = order.customer_email?.trim().toLowerCase() ?? "";
    if (order.status !== "paid") throw new Error("order_not_paid");
    if (!isEmail(recipient)) throw new Error("invalid_customer_email");

    const siteUrl = (Deno.env.get("SITE_URL")?.trim() || defaultSiteUrl).replace(/\/$/, "");
    const senderName = Deno.env.get("BREVO_SENDER_NAME")?.trim() || defaultSenderName;
    const replyToEmail = Deno.env.get("BREVO_REPLY_TO_EMAIL")?.trim().toLowerCase();
    const idempotencyKey = await stableUuid(`shopping-china-brasil:order-confirmation:${order.id}`);
    const body: JsonObject = {
      sender: { name: senderName, email: senderEmail },
      to: [{ email: recipient, name: order.customer_name?.trim() || undefined }],
      subject: `Pagamento confirmado — pedido ${order.id}`,
      htmlContent: renderOrderConfirmationEmail(order, siteUrl),
      headers: { IdempotencyKey: idempotencyKey },
      tags: ["confirmacao-pedido"],
    };
    if (replyToEmail && isEmail(replyToEmail)) body.replyTo = { email: replyToEmail, name: senderName };

    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json", "api-key": apiKey },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({})) as JsonObject;
    if (!response.ok) {
      const providerMessage = String(result.message ?? result.code ?? `brevo_http_${response.status}`);
      throw new Error(providerMessage);
    }

    const messageId = String(result.messageId ?? "").slice(0, 500) || null;
    const { error: updateError } = await service.from("orders").update({
      confirmation_email_status: "sent",
      confirmation_email_sent_at: new Date().toISOString(),
      confirmation_email_message_id: messageId,
      confirmation_email_error: null,
    }).eq("id", order.id);
    if (updateError) throw new Error(`email_sent_but_status_update_failed:${updateError.message}`);

    console.info("order_confirmation_email_sent", order.id, messageId);
    return { sent: true, messageId } as const;
  } catch (error) {
    const message = sanitizeError(error);
    await service.from("orders").update({
      confirmation_email_status: "failed",
      confirmation_email_error: message,
    }).eq("id", orderId).is("confirmation_email_sent_at", null);
    console.error("order_confirmation_email_failed", orderId, message);
    return { sent: false, reason: "send_failed" } as const;
  }
}

export function renderOrderConfirmationEmail(order: PaidOrder, siteUrl = defaultSiteUrl) {
  const customerName = escapeHtml(firstName(order.customer_name) || "cliente");
  const paidAt = formatDate(order.paid_at ?? order.created_at);
  const address = formatAddress(order.shipping_address);
  const itemRows = (order.order_items ?? []).map((item) => {
    const imageUrl = `${siteUrl}/merchant-image/${encodeURIComponent(item.product_id)}/0`;
    const lineTotal = item.unit_price_cents * item.quantity;
    return `<tr>
      <td style="padding:16px 0;border-bottom:1px solid #e5eaf2;vertical-align:middle;width:72px"><img src="${escapeAttribute(imageUrl)}" width="60" height="60" alt="" style="display:block;width:60px;height:60px;object-fit:contain;border:1px solid #e5eaf2;border-radius:12px;background:#fff"></td>
      <td style="padding:16px 12px;border-bottom:1px solid #e5eaf2;vertical-align:middle"><div style="font-size:14px;line-height:20px;font-weight:700;color:#002055">${escapeHtml(titleCase(item.title))}</div><div style="margin-top:4px;font-size:12px;color:#6b7b96">Quantidade: ${item.quantity}</div></td>
      <td style="padding:16px 0;border-bottom:1px solid #e5eaf2;vertical-align:middle;text-align:right;white-space:nowrap;font-size:14px;font-weight:700;color:#002055">${formatMoney(lineTotal)}</td>
    </tr>`;
  }).join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pagamento confirmado</title>
<style>@media only screen and (max-width:620px){.email-shell{width:100%!important}.content{padding:26px 20px!important}.hero-title{font-size:28px!important;line-height:34px!important}.summary{padding:20px!important}.hide-mobile{display:none!important}}</style></head>
<body style="margin:0;padding:0;background:#f3f6fa;font-family:Arial,'Helvetica Neue',sans-serif;color:#15233b">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f6fa"><tr><td align="center" style="padding:28px 12px">
  <table role="presentation" class="email-shell" width="620" cellspacing="0" cellpadding="0" border="0" style="width:620px;max-width:620px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 14px 45px rgba(0,32,85,.10)">
    <tr><td style="height:6px;background:#ffb81c"></td></tr>
    <tr><td style="padding:24px 32px;background:#002055"><a href="${escapeAttribute(siteUrl)}" style="text-decoration:none"><img src="${escapeAttribute(siteUrl)}/assets/shopping-china/logo-footer.webp" width="190" alt="Shopping China Brasil" style="display:block;width:190px;max-width:75%;height:auto"></a></td></tr>
    <tr><td class="content" style="padding:38px 38px 18px">
      <div style="display:inline-block;padding:8px 13px;border-radius:999px;background:#eaf8f0;color:#147a3d;font-size:12px;font-weight:700;letter-spacing:.7px;text-transform:uppercase">✓ Pagamento confirmado</div>
      <h1 class="hero-title" style="margin:20px 0 10px;font-size:34px;line-height:41px;color:#002055">Tudo certo, ${customerName}!</h1>
      <p style="margin:0;font-size:16px;line-height:26px;color:#5f6f89">Recebemos o seu pagamento via PIX. O pedido <strong style="color:#002055">${escapeHtml(order.id)}</strong> já entrou em preparação e você será avisado quando houver uma nova atualização.</p>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;background:#f6f8fb;border:1px solid #e5eaf2;border-radius:16px"><tr>
        <td style="padding:16px 18px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7e8da5">Pedido</div><div style="margin-top:5px;font-size:14px;font-weight:700;color:#002055">${escapeHtml(order.id)}</div></td>
        <td class="hide-mobile" style="padding:16px 18px;border-left:1px solid #e5eaf2"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7e8da5">Pagamento</div><div style="margin-top:5px;font-size:14px;font-weight:700;color:#147a3d">PIX aprovado</div></td>
        <td class="hide-mobile" style="padding:16px 18px;border-left:1px solid #e5eaf2"><div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#7e8da5">Confirmado em</div><div style="margin-top:5px;font-size:14px;font-weight:700;color:#002055">${escapeHtml(paidAt)}</div></td>
      </tr></table>
    </td></tr>
    <tr><td class="content" style="padding:12px 38px 20px"><h2 style="margin:0 0 4px;font-size:19px;color:#002055">Itens do pedido</h2><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">${itemRows}</table></td></tr>
    <tr><td class="content" style="padding:8px 38px 32px">
      <table role="presentation" class="summary" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding:24px;background:#002055;border-radius:18px;color:#fff">
        <tr><td style="padding:4px 0;font-size:13px;color:#cbd7ea">Produtos</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#fff">${formatMoney(order.subtotal_cents)}</td></tr>
        <tr><td style="padding:4px 0;font-size:13px;color:#cbd7ea">Entrega</td><td style="padding:4px 0;text-align:right;font-size:13px;color:#fff">${formatMoney(order.shipping_cents)}</td></tr>
        <tr><td style="padding:15px 0 0;border-top:1px solid #284777;font-size:16px;font-weight:700">Total pago</td><td style="padding:15px 0 0;border-top:1px solid #284777;text-align:right;font-size:22px;font-weight:800;color:#ffb81c">${formatMoney(order.total_cents)}</td></tr>
      </table>
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:24px"><tr><td style="padding:19px;border:1px solid #e5eaf2;border-radius:16px">
        <div style="font-size:13px;font-weight:700;color:#002055">Endereço de entrega</div><div style="margin-top:7px;font-size:13px;line-height:21px;color:#64748b">${escapeHtml(address || "Endereço informado no checkout")}</div><div style="margin-top:7px;font-size:12px;font-weight:700;color:#bd0811">Previsão: em até ${order.shipping_deadline_days} dias</div>
      </td></tr></table>
      <div style="text-align:center;margin-top:28px"><a href="${escapeAttribute(siteUrl)}/conta" style="display:inline-block;padding:15px 28px;border-radius:999px;background:#bd0811;color:#fff;text-decoration:none;font-size:14px;font-weight:700">Acompanhar meu pedido</a></div>
      <p style="margin:22px 0 0;text-align:center;font-size:12px;line-height:19px;color:#7e8da5">Você não precisa enviar comprovante. A confirmação foi realizada automaticamente pela operadora do pagamento.</p>
    </td></tr>
    <tr><td style="padding:24px 32px;background:#f6f8fb;border-top:1px solid #e5eaf2;text-align:center"><p style="margin:0;font-size:12px;line-height:19px;color:#75859e">Shopping China Brasil · Compra segura e pedido rastreável<br><a href="${escapeAttribute(siteUrl)}/contato" style="color:#002055;font-weight:700;text-decoration:none">Fale com o atendimento</a></p></td></tr>
  </table>
</td></tr></table></body></html>`;
}

function firstName(value: string | null) {
  return value?.trim().split(/\s+/)[0] ?? "";
}

function formatAddress(value: JsonObject | null) {
  if (!value) return "";
  const street = String(value.street ?? "").trim();
  const number = String(value.number ?? "").trim();
  const complement = String(value.complement ?? "").trim();
  const neighborhood = String(value.neighborhood ?? "").trim();
  const city = String(value.city ?? "").trim();
  const state = String(value.state ?? "").trim();
  const zip = String(value.zipCode ?? "").replace(/\D/g, "");
  const line1 = [street, number].filter(Boolean).join(", ");
  const line2 = [complement, neighborhood].filter(Boolean).join(" · ");
  const line3 = [city, state].filter(Boolean).join(" - ");
  const cep = zip.length === 8 ? `CEP ${zip.slice(0, 5)}-${zip.slice(5)}` : "";
  return [line1, line2, line3, cep].filter(Boolean).join(" · ");
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(cents || 0) / 100);
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "agora";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }).format(date);
}

function titleCase(value: string) {
  const normalized = String(value ?? "").trim().toLocaleLowerCase("pt-BR");
  return normalized.replace(/(^|[\s\-/])([\p{L}\p{N}])/gu, (_, prefix, letter) => `${prefix}${letter.toLocaleUpperCase("pt-BR")}`);
}

function escapeHtml(value: string) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]!));
}

function escapeAttribute(value: string) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function sanitizeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return message.replace(/[\r\n\t]+/g, " ").slice(0, 1000) || "unknown_error";
}

async function stableUuid(value: string) {
  const bytes = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))).slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
