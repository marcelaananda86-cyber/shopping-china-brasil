export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/site-config";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return new Response("Catálogo temporariamente indisponível", { status: 503 });

  const products: MerchantProduct[] = [];
  for (let from = 0; from < 30000; from += 1000) {
    const response = await fetch(`${supabaseUrl}/rest/v1/merchant_products?select=id,slug,title,description,brand,gtin,mpn,condition,image_url,additional_image_urls,price_cents,currency,availability,google_product_category&order=id.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
      next: { revalidate: 900 },
    });
    if (!response.ok) return new Response("Catalog feed is temporarily unavailable", { status: 503 });
    const batch = await response.json() as MerchantProduct[];
    products.push(...batch);
    if (batch.length < 1000) break;
  }

  const eligibleProducts = products.filter(isMerchantEligible);
  const items = eligibleProducts.map((product) => {
    const optional = [
      product.brand ? `<g:brand>${xml(product.brand)}</g:brand>` : "",
      product.gtin ? `<g:gtin>${xml(product.gtin)}</g:gtin>` : "",
      product.mpn ? `<g:mpn>${xml(product.mpn)}</g:mpn>` : "",
      product.google_product_category ? `<g:google_product_category>${xml(product.google_product_category)}</g:google_product_category>` : "",
      !product.gtin && !product.mpn ? "<g:identifier_exists>no</g:identifier_exists>" : "",
      ...(product.additional_image_urls ?? []).slice(0, 10).map((image) => `<g:additional_image_link>${xml(image)}</g:additional_image_link>`),
    ].join("");
    return `<item><g:id>${xml(product.id)}</g:id><title>${xml(product.title.slice(0, 150))}</title><description>${xml((product.description || product.title).slice(0, 5000))}</description><link>${xml(`${SITE_URL}/produto/${product.slug}`)}</link><g:image_link>${xml(product.image_url)}</g:image_link><g:availability>${xml(product.availability)}</g:availability><g:price>${(product.price_cents / 100).toFixed(2)} ${xml(product.currency)}</g:price><g:condition>${xml(product.condition)}</g:condition>${optional}</item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Shopping China Brasil</title><link>${xml(SITE_URL)}</link><description>Catálogo Shopping China Brasil</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
}

type MerchantProduct = { id: string; slug: string; title: string; description: string; brand: string | null; gtin: string | null; mpn: string | null; condition: string; image_url: string; additional_image_urls: string[]; price_cents: number; currency: string; availability: string; google_product_category: string | null };
function xml(value: string) { return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!); }

const restrictedProductPattern = /\b(cigarro|cigarette|tabaco|tobacco|vape|vaper|charuto|cachimbo|narguile|arma|pistola|revolver|rifle|municao|munição|cartucho de arma|adulto|erotico|erótico)\b/i;
function isMerchantEligible(product: MerchantProduct) {
  return Boolean(
    product.id && product.slug && product.title && product.brand && product.image_url &&
    product.price_cents > 0 && product.currency === "BRL" &&
    ["in_stock", "out_of_stock", "preorder", "backorder"].includes(product.availability) &&
    !restrictedProductPattern.test(product.title),
  );
}
