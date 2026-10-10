import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

const syncSecret = Deno.env.get("SYNC_CATALOG_SECRET");

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!syncSecret || request.headers.get("x-sync-secret") !== syncSecret) {
    return json({ error: "unauthorized" }, 401);
  }

  const requestedLimit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  const limit = Math.min(100, Math.max(1, requestedLimit));
  const { data: products, error } = await supabase.rpc("claim_products_for_sync", {
    batch_size: limit,
  });
  if (error) return json({ error: error.message }, 500);

  const results = await runWithConcurrency(products ?? [], 10, syncProduct);
  const succeeded = results.filter((result) => result.status === "fulfilled").length;
  return json({
    selected: products?.length ?? 0,
    succeeded,
    failed: results.length - succeeded,
    finished_at: new Date().toISOString(),
  });
});

async function runWithConcurrency<T>(
  values: T[],
  concurrency: number,
  operation: (value: T) => Promise<void>,
) {
  const results: PromiseSettledResult<void>[] = new Array(values.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, values.length) }, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      try {
        await operation(values[index]);
        results[index] = { status: "fulfilled", value: undefined };
      } catch (reason) {
        results[index] = { status: "rejected", reason };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

async function syncProduct(product: { id: string; slug: string; source_url: string }) {
  try {
    const response = await fetch(product.source_url, {
      headers: { "user-agent": "ShoppingChinaBrasilCatalogSync/1.0" },
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`source_http_${response.status}`);
    const html = await response.text();
    const structured = readProductJsonLd(html) ?? readProductHtmlFallback(html);
    if (!structured) throw new Error("product_json_ld_missing");
    const offer = Array.isArray(structured.offers) ? structured.offers[0] : structured.offers;
    const price = Number(offer?.price);
    if (!Number.isFinite(price) || price <= 0) throw new Error("invalid_price");
    const availability = normalizeAvailability(String(offer?.availability ?? ""));
    const imageList = (Array.isArray(structured.image) ? structured.image : [structured.image])
      .filter((value): value is string => typeof value === "string" && Boolean(value));
    const brand = typeof structured.brand === "object" ? structured.brand?.name : structured.brand;
    const currentTime = new Date();
    const { error } = await supabase.from("products").update({
      title: String(structured.name ?? product.slug),
      description: stripHtml(String(structured.description ?? "")),
      brand: brand ? String(brand) : null,
      gtin: findGtin(structured),
      mpn: structured.mpn ? String(structured.mpn) : null,
      image_url: String(imageList[0] ?? ""),
      additional_image_urls: imageList.slice(1),
      price_cents: Math.round(price * 100),
      currency: "BRL",
      availability,
      stock: availability === "in_stock" ? 1 : 0,
      active: Boolean(imageList[0]) && price > 0 && availability !== "out_of_stock",
      source_updated_at: currentTime.toISOString(),
      synced_at: currentTime.toISOString(),
      next_sync_at: new Date(currentTime.getTime() + 15 * 60 * 1000).toISOString(),
      sync_error: null,
      updated_at: currentTime.toISOString(),
    }).eq("id", product.id);
    if (error) throw error;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_sync_error";
    await supabase.from("products").update({
      sync_error: message.slice(0, 500),
      next_sync_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", product.id);
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
    } catch {
      // Some legacy pages contain malformed JSON-LD; the row is retried later.
    }
  }
  return null;
}

function readProductHtmlFallback(html: string): Record<string, any> | null {
  const productStart = html.indexOf("<!--PRODUCT-->");
  const productEnd = html.indexOf("<!--RELATED-->", productStart);
  if (productStart < 0 || productEnd < 0) return null;
  const main = html.slice(productStart, productEnd);
  const title = stripHtml(main.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? "");
  const image = decodeHtml(main.match(/<img[^>]+id=["']first-img["'][^>]+src=["']([^"']+)/i)?.[1] ?? "");
  const priceText = main.match(/R\$\s*([\d.]+,\d{2})/i)?.[1] ?? "";
  const price = Number(priceText.replaceAll(".", "").replace(",", "."));
  if (!title || !image || !Number.isFinite(price) || price <= 0) return null;
  const brandBlock = main.match(/Marca:[\s\S]*?<img[^>]+alt=["']([^"']+)/i)?.[1];
  const descriptionBlock = main.match(/>Descrição<\/h6>([\s\S]*?)<div class=\s*["']sc-text-grey/i)?.[1] ?? "";
  return {
    "@type": "Product",
    name: title,
    description: stripHtml(descriptionBlock) || title,
    image,
    brand: brandBlock ? { name: decodeHtml(brandBlock) } : undefined,
    offers: {
      price,
      priceCurrency: "BRL",
      availability: "http://schema.org/InStock",
    },
  };
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

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function decodeHtml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&aacute;", "á")
    .replaceAll("&eacute;", "é")
    .replaceAll("&iacute;", "í")
    .replaceAll("&oacute;", "ó")
    .replaceAll("&uacute;", "ú")
    .replaceAll("&ccedil;", "ç");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
