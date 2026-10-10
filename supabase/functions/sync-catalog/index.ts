import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 50);
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const now = new Date().toISOString();
  const { data: products, error } = await supabase
    .from("products")
    .select("id,slug,source_url")
    .lte("next_sync_at", now)
    .order("next_sync_at", { ascending: true })
    .limit(limit);
  if (error) return json({ error: error.message }, 500);

  const results = await Promise.allSettled((products ?? []).map(syncProduct));
  const succeeded = results.filter((result) => result.status === "fulfilled").length;
  return json({ selected: products?.length ?? 0, succeeded, failed: results.length - succeeded, finished_at: new Date().toISOString() });
});

async function syncProduct(product: { id: string; slug: string; source_url: string }) {
  try {
    const response = await fetch(product.source_url, { headers: { "user-agent": "ShoppingChinaBrasilCatalogSync/1.0" } });
    if (!response.ok) throw new Error(`source_http_${response.status}`);
    const html = await response.text();
    const structured = readProductJsonLd(html);
    if (!structured) throw new Error("product_json_ld_missing");
    const offer = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    const price = Number(offer?.price);
    if (!Number.isFinite(price) || price < 0) throw new Error("invalid_price");
    const availability = normalizeAvailability(String(offer?.availability ?? ""));
    const imageList = Array.isArray(structured.image) ? structured.image : [structured.image].filter(Boolean);
    const brand = typeof structured.brand === "object" ? structured.brand?.name : structured.brand;
    const now = new Date();
    const { error } = await supabase.from("products").update({
      title: String(structured.name ?? product.slug),
      description: stripHtml(String(structured.description ?? "")),
      brand: brand ? String(brand) : null,
      gtin: findGtin(structured),
      mpn: structured.mpn ? String(structured.mpn) : null,
      image_url: String(imageList[0] ?? ""),
      additional_image_urls: imageList.slice(1).map(String),
      price_cents: Math.round(price * 100),
      currency: "BRL",
      availability,
      stock: availability === "in_stock" ? 1 : 0,
      active: Boolean(imageList[0]) && availability !== "out_of_stock",
      source_updated_at: now.toISOString(),
      synced_at: now.toISOString(),
      next_sync_at: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
      sync_error: null,
      updated_at: now.toISOString(),
    }).eq("id", product.id);
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_sync_error";
    await supabase.from("products").update({ sync_error: message.slice(0, 500), next_sync_at: new Date(Date.now() + 5 * 60 * 1000).toISOString() }).eq("id", product.id);
    throw error;
  }
}

function readProductJsonLd(html: string): Record<string, any> | null {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      const entries = Array.isArray(value) ? value : value?.["@graph"] ?? [value];
      const product = entries.find((entry: any) => entry?.["@type"] === "Product");
      if (product) return product;
    } catch { /* ignore malformed legacy markup */ }
  }
  return null;
}

function findGtin(value: Record<string, any>) {
  return value.gtin14 ?? value.gtin13 ?? value.gtin12 ?? value.gtin8 ?? value.gtin ?? null;
}

function normalizeAvailability(value: string) {
  if (/InStock/i.test(value)) return "in_stock";
  if (/PreOrder/i.test(value)) return "preorder";
  if (/BackOrder/i.test(value)) return "backorder";
  return "out_of_stock";
}

function stripHtml(value: string) { return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); }
function json(body: unknown, status = 200) { return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } }); }
