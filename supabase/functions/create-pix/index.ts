import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type JsonObject = Record<string, unknown>;
type CartInput = { id: string; quantity: number };
type CheckoutInput = {
  idempotencyKey: string;
  items: CartInput[];
  customer: { name: string; email: string; phone: string; document: string };
  shipping: { street: string; number: string; complement?: string; neighborhood: string; city: string; state: string; zipCode: string };
  utm?: Partial<Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content" | "utm_term", string>>;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const blackcatKey = Deno.env.get("BLACKCAT_API_KEY");
const blackcatBaseUrl = "https://api.blackcatoficial.com/api";
const pixBatchMaxCents = 200_000;
const fallbackUsdBrl = 5.12;

Deno.serve(async (request) => {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) return json({ error: "authentication_required" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "authentication_required" }, 401);

    const service = createClient(supabaseUrl, serviceKey);
    if (request.method === "GET") {
      const orderId = new URL(request.url).searchParams.get("orderId");
      if (!orderId) return json({ error: "order_id_required" }, 400);
      return await readOrder(service, orderId, user.id);
    }
    if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
    if (!blackcatKey) return json({ error: "pix_not_configured", message: "A integração PIX está aguardando a chave da BlackCat." }, 503);

    const input = await request.json() as CheckoutInput;
    const validationError = validateInput(input);
    if (validationError) return json({ error: "invalid_checkout", message: validationError }, 400);
    const customerEmail = user.email ?? input.customer.email.trim().toLowerCase();

    const existing = await service.from("orders").select("id").eq("customer_id", user.id).eq("checkout_attempt_id", input.idempotencyKey).maybeSingle();
    if (existing.data?.id) return await ensurePayments(service, existing.data.id, user.id, customerEmail, input);

    const uniqueIds = [...new Set(input.items.map((item) => item.id))];
    const { data: products, error: productError } = await service.from("products")
      .select("id,slug,title,image_url,price_cents,availability,active,stock")
      .in("id", uniqueIds);
    if (productError) throw productError;
    if (!products || products.length !== uniqueIds.length) return json({ error: "product_unavailable", message: "Um ou mais produtos não estão disponíveis." }, 409);

    const byId = new Map(products.map((product) => [product.id, product]));
    const orderItems = input.items.map((item) => {
      const product = byId.get(item.id);
      if (!product || !product.active || product.availability !== "in_stock") throw new CheckoutError("product_unavailable", "Um ou mais produtos não estão disponíveis.", 409);
      if (product.stock > 0 && item.quantity > product.stock) throw new CheckoutError("insufficient_stock", `Quantidade indisponível para ${product.title}.`, 409);
      return { product, quantity: item.quantity };
    });
    const subtotalCents = orderItems.reduce((total, item) => total + item.product.price_cents * item.quantity, 0);
    const itemCount = orderItems.reduce((total, item) => total + item.quantity, 0);
    if (subtotalCents <= 0) return json({ error: "invalid_total" }, 400);

    const cepAddress = await lookupCep(input.shipping.zipCode);
    if (!cepAddress) return json({ error: "invalid_cep", message: "Não foi possível validar o CEP informado." }, 400);
    const shippingCents = shippingPriceCents(cepAddress.state);
    const totalCents = subtotalCents + shippingCents;
    const shipping = {
      street: input.shipping.street.trim() || cepAddress.street,
      number: input.shipping.number.trim(),
      complement: input.shipping.complement?.trim() ?? "",
      neighborhood: input.shipping.neighborhood.trim() || cepAddress.neighborhood,
      city: cepAddress.city,
      state: cepAddress.state,
      zipCode: digits(input.shipping.zipCode),
      region: cepAddress.region,
    };

    const usdBrl = await getSourceExchangeRate();
    if (subtotalCents > Math.round(500 * usdBrl * 100) && itemCount !== 1) {
      return json({ error: "high_value_multiple_items", message: "Acima de US$ 500, o pedido deve conter somente uma unidade de um produto." }, 409);
    }

    const { data: order, error: orderError } = await service.from("orders").insert({
      customer_id: user.id,
      status: "pending_payment",
      subtotal_cents: subtotalCents,
      shipping_cents: shippingCents,
      total_cents: totalCents,
      payment_method: "pix",
      shipping_deadline_days: 20,
      shipping_address: shipping,
      customer_name: input.customer.name.trim(),
      customer_email: customerEmail,
      customer_phone: digits(input.customer.phone),
      customer_document: digits(input.customer.document),
      checkout_attempt_id: input.idempotencyKey,
    }).select("id").single();
    if (orderError || !order) throw orderError ?? new Error("order_creation_failed");

    const { error: itemsError } = await service.from("order_items").insert(orderItems.map(({ product, quantity }) => ({
      order_id: order.id,
      product_id: product.id,
      slug: product.slug,
      title: product.title,
      image_url: product.image_url,
      unit_price_cents: product.price_cents,
      quantity,
    })));
    if (itemsError) throw itemsError;

    await service.from("profiles").update({ name: input.customer.name.trim(), email: customerEmail, phone: digits(input.customer.phone) }).eq("id", user.id);
    return await ensurePayments(service, order.id, user.id, customerEmail, input);
  } catch (error) {
    if (error instanceof CheckoutError) return json({ error: error.code, message: error.message }, error.status);
    console.error(error);
    return json({ error: "internal_error", message: "Não foi possível gerar o PIX. Tente novamente." }, 500);
  }
});

async function ensurePayments(service: ReturnType<typeof createClient>, orderId: string, userId: string, email: string, input: CheckoutInput) {
  const { data: order, error } = await service.from("orders")
    .select("id,customer_id,status,total_cents,customer_name,customer_phone,customer_document,shipping_address,order_items(title,quantity,unit_price_cents),order_payments(*)")
    .eq("id", orderId).eq("customer_id", userId).single();
  if (error || !order) return json({ error: "order_not_found" }, 404);
  if (order.status !== "pending_payment") return json({ error: "order_not_payable" }, 409);

  const batches = calculateBatches(order.total_cents);
  const existing = new Map((order.order_payments ?? []).map((payment: JsonObject) => [Number(payment.batch_number), payment]));
  for (let index = 0; index < batches.length; index += 1) {
    const batchNumber = index + 1;
    if (existing.has(batchNumber)) continue;
    const shipping = asObject(order.shipping_address);
    const response = await fetch(`${blackcatBaseUrl}/sales/create-sale`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": blackcatKey! },
      body: JSON.stringify({
        amount: batches[index],
        currency: "BRL",
        paymentMethod: "pix",
        items: [{ title: `Pedido ${order.id} — PIX ${batchNumber} de ${batches.length}`, unitPrice: batches[index], quantity: 1, tangible: true }],
        customer: {
          name: String(order.customer_name),
          email,
          phone: String(order.customer_phone),
          document: { number: String(order.customer_document), type: "cpf" },
        },
        shipping: {
          name: String(order.customer_name), street: shipping.street, number: shipping.number,
          complement: shipping.complement || undefined, neighborhood: shipping.neighborhood,
          city: shipping.city, state: shipping.state, zipCode: shipping.zipCode,
        },
        pix: { expiresInDays: 1 },
        postbackUrl: `${supabaseUrl}/functions/v1/blackcat-webhook`,
        metadata: JSON.stringify({ orderId: order.id, batchNumber, batchCount: batches.length }),
        externalRef: `${order.id}-PIX-${batchNumber}`,
        ...cleanUtm(input.utm),
      }),
    });
    const result = await response.json() as JsonObject;
    const data = asObject(result.data);
    const paymentData = asObject(data.paymentData);
    if (!response.ok || result.success !== true || !data.transactionId) {
      console.error("blackcat_create_sale_failed", response.status, result);
      return json({ error: "pix_provider_error", message: "Não foi possível gerar todos os pagamentos PIX. Tente novamente.", orderId }, 502);
    }
    const { error: paymentError } = await service.from("order_payments").insert({
      order_id: order.id,
      batch_number: batchNumber,
      batch_count: batches.length,
      amount_cents: batches[index],
      provider_transaction_id: String(data.transactionId),
      status: mapStatus(String(data.status ?? "PENDING")),
      pix_copy_paste: String(paymentData.copyPaste ?? paymentData.qrCode ?? ""),
      pix_qr_code_base64: String(paymentData.qrCodeBase64 ?? ""),
      invoice_url: data.invoiceUrl ? String(data.invoiceUrl) : null,
      expires_at: paymentData.expiresAt ? String(paymentData.expiresAt) : null,
    });
    if (paymentError) throw paymentError;
  }
  return await readOrder(service, order.id, userId);
}

async function readOrder(service: ReturnType<typeof createClient>, orderId: string, userId: string) {
  const { data: order, error } = await service.from("orders")
    .select("id,status,subtotal_cents,shipping_cents,total_cents,created_at,order_payments(batch_number,batch_count,amount_cents,provider_transaction_id,status,pix_copy_paste,pix_qr_code_base64,invoice_url,expires_at,paid_at)")
    .eq("id", orderId).eq("customer_id", userId).single();
  if (error || !order) return json({ error: "order_not_found" }, 404);
  return json({ success: true, order: { ...order, payments: order.order_payments, order_payments: undefined } });
}

function validateInput(input: CheckoutInput) {
  if (!input || !/^[0-9a-f-]{36}$/i.test(input.idempotencyKey ?? "")) return "Identificador do checkout inválido.";
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 50) return "Carrinho inválido.";
  if (input.items.some((item) => !item.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) return "Quantidade inválida.";
  if (input.customer?.name?.trim().split(/\s+/).length < 2) return "Informe o nome completo.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customer?.email?.trim() ?? "")) return "Informe um e-mail válido.";
  if (!/^\d{10,11}$/.test(digits(input.customer?.phone ?? ""))) return "Informe um telefone válido.";
  if (!validCpf(input.customer?.document ?? "")) return "Informe um CPF válido.";
  const shipping = input.shipping;
  if (!shipping || shipping.street?.trim().length < 3 || !shipping.number?.trim() || shipping.neighborhood?.trim().length < 2 || shipping.city?.trim().length < 2 || !/^[A-Z]{2}$/.test(shipping.state ?? "") || digits(shipping.zipCode ?? "").length !== 8) return "Confira o endereço de entrega.";
  return null;
}

function calculateBatches(totalCents: number) {
  const count = Math.max(1, Math.ceil(totalCents / pixBatchMaxCents));
  const base = Math.floor(totalCents / count);
  return Array.from({ length: count }, (_, index) => index === count - 1 ? totalCents - base * (count - 1) : base);
}

async function getSourceExchangeRate() {
  try {
    const response = await fetch("https://www.shoppingchina.com.br/", { headers: { "user-agent": "ShoppingChinaBrasilCheckout/1.0" } });
    const html = await response.text();
    const value = html.match(/regular_price_usd\s*\*\s*([0-9]+(?:\.[0-9]+)?)/)?.[1] ?? html.match(/>([0-9]+(?:[.,][0-9]+)?)R\$<\/span>/i)?.[1];
    const rate = Number((value ?? "").replace(",", "."));
    return Number.isFinite(rate) && rate >= 1 && rate <= 20 ? rate : fallbackUsdBrl;
  } catch { return fallbackUsdBrl; }
}

async function lookupCep(value: string) {
  const cep = digits(value);
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (!response.ok) return null;
    const data = await response.json() as JsonObject;
    if (data.erro === true || !data.localidade || !data.uf) return null;
    return {
      street: String(data.logradouro ?? ""),
      neighborhood: String(data.bairro ?? ""),
      city: String(data.localidade),
      state: String(data.uf).toUpperCase(),
      region: String(data.regiao ?? ""),
    };
  } catch { return null; }
}

function shippingPriceCents(state: string) {
  if (["PR", "SC", "RS"].includes(state)) return 4_990;
  if (["DF", "ES", "GO", "MG", "MS", "MT", "RJ", "SP"].includes(state)) return 7_990;
  return 9_490;
}

function cleanUtm(value: CheckoutInput["utm"]) {
  const output: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const) {
    const item = value?.[key]?.trim().slice(0, 200);
    if (item) output[key] = item;
  }
  return output;
}

function mapStatus(value: string) {
  if (value.toUpperCase() === "PAID") return "paid";
  if (value.toUpperCase() === "REFUNDED") return "refunded";
  if (["CANCELLED", "FAILED"].includes(value.toUpperCase())) return "cancelled";
  return "pending";
}

function validCpf(value: string) {
  const cpf = digits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  for (let digit = 9; digit < 11; digit += 1) {
    let sum = 0;
    for (let index = 0; index < digit; index += 1) sum += Number(cpf[index]) * (digit + 1 - index);
    if (((sum * 10) % 11) % 10 !== Number(cpf[digit])) return false;
  }
  return true;
}

function digits(value: string) { return String(value).replace(/\D/g, ""); }
function asObject(value: unknown): JsonObject { return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {}; }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } }); }

class CheckoutError extends Error {
  constructor(public code: string, message: string, public status: number) { super(message); }
}
