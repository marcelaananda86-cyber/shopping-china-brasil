export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return new Response("Supabase catalog is not configured", { status: 503 });

  const products: MerchantProduct[] = [];
  for (let from = 0; from < 30000; from += 1000) {
    const response = await fetch(`${supabaseUrl}/rest/v1/merchant_products?select=id,slug,title,description,brand,gtin,mpn,condition,image_url,additional_image_urls,price_cents,currency,availability&order=id.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
      next: { revalidate: 900 },
    });
    if (!response.ok) return new Response("Catalog feed is temporarily unavailable", { status: 503 });
    const batch = await response.json() as MerchantProduct[];
    products.push(...batch);
    if (batch.length < 1000) break;
  }

  const origin = new URL(request.url).origin;
  const items = products.map((product) => {
    const optional = [
      product.brand ? `<g:brand>${xml(product.brand)}</g:brand>` : "",
      product.gtin ? `<g:gtin>${xml(product.gtin)}</g:gtin>` : "",
      product.mpn ? `<g:mpn>${xml(product.mpn)}</g:mpn>` : "",
      !product.gtin && !product.mpn ? "<g:identifier_exists>no</g:identifier_exists>" : "",
      ...(product.additional_image_urls ?? []).slice(0, 10).map((image) => `<g:additional_image_link>${xml(image)}</g:additional_image_link>`),
    ].join("");
    return `<item><g:id>${xml(product.id)}</g:id><title>${xml(product.title)}</title><description>${xml(product.description || product.title)}</description><link>${xml(`${origin}/produto/${product.slug}`)}</link><g:image_link>${xml(product.image_url)}</g:image_link><g:availability>${xml(product.availability)}</g:availability><g:price>${(product.price_cents / 100).toFixed(2)} ${xml(product.currency)}</g:price><g:condition>${xml(product.condition)}</g:condition>${optional}</item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Shopping China Brasil</title><link>${xml(origin)}</link><description>Catálogo Shopping China Brasil</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
}

type MerchantProduct = { id: string; slug: string; title: string; description: string; brand: string | null; gtin: string | null; mpn: string | null; condition: string; image_url: string; additional_image_urls: string[]; price_cents: number; currency: string; availability: string };
function xml(value: string) { return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!); }
