export const dynamic = "force-dynamic";

import { SITE_URL } from "@/lib/site-config";

// Lote inicial, revisado manualmente, para a primeira análise da conta.
// O catálogo completo só deve ser liberado depois que este conjunto estiver aprovado.
const CURATED_PRODUCT_IDS = [
  "1036065", "980834", "789059", "1051791", "883438", "920977", "1039430", "860483", "906073", "1034852",
  "760395", "1070861", "721923", "893318", "847358", "949030", "1011529", "1011790", "1070868", "1058857",
  "801561", "1072916", "717490", "601887", "601888", "773142", "1095239", "1094969", "1070157", "1073108",
  "1090272", "1060084", "1069492", "1025207", "801824", "813141", "789057", "30946", "770943", "700074",
  "815977", "888584", "795888", "716822", "799359", "779789", "624288", "825156", "915866", "796259",
] as const;

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return new Response("Catálogo temporariamente indisponível", { status: 503 });

  const params = new URLSearchParams({
    select: "id,slug,title,description,brand,gtin,mpn,condition,image_url,additional_image_urls,price_cents,currency,availability,google_product_category,updated_at",
    availability: "eq.in_stock",
    price_cents: "gt.0",
    brand: "not.is.null",
    description: "not.eq.",
    id: `in.(${CURATED_PRODUCT_IDS.join(",")})`,
    limit: String(CURATED_PRODUCT_IDS.length),
  });
  const response = await fetch(`${supabaseUrl}/rest/v1/merchant_products?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 900 },
  });
  if (!response.ok) return new Response("Catalog feed is temporarily unavailable", { status: 503 });

  const products = await response.json() as MerchantProduct[];
  const eligibleProducts = products
    .filter(isMerchantEligible)
    .sort((left, right) => CURATED_PRODUCT_IDS.indexOf(left.id as (typeof CURATED_PRODUCT_IDS)[number]) - CURATED_PRODUCT_IDS.indexOf(right.id as (typeof CURATED_PRODUCT_IDS)[number]));
  const items = eligibleProducts.map((product) => {
    const optional = [
      product.brand ? `<g:brand>${xml(product.brand)}</g:brand>` : "",
      product.gtin ? `<g:gtin>${xml(product.gtin)}</g:gtin>` : "",
      product.mpn ? `<g:mpn>${xml(product.mpn)}</g:mpn>` : "",
      product.google_product_category ? `<g:google_product_category>${xml(product.google_product_category)}</g:google_product_category>` : "",
      !product.gtin && !product.mpn ? "<g:identifier_exists>no</g:identifier_exists>" : "",
      ...(product.additional_image_urls ?? []).slice(0, 10).map((_, index) =>
        `<g:additional_image_link>${xml(merchantImageUrl(product.id, index + 1))}</g:additional_image_link>`
      ),
    ].join("");
    return `<item><g:id>SCB-${xml(product.id)}</g:id><title>${xml(merchantTitle(product.title).slice(0, 150))}</title><description>${xml((product.description || product.title).slice(0, 5000))}</description><link>${xml(`${SITE_URL}/produto/${product.slug}`)}</link><g:image_link>${xml(merchantImageUrl(product.id))}</g:image_link><g:availability>${xml(product.availability)}</g:availability><g:price>${(product.price_cents / 100).toFixed(2)} ${xml(product.currency)}</g:price><g:condition>${xml(product.condition)}</g:condition>${optional}</item>`;
  }).join("");
  const body = `<?xml version="1.0" encoding="UTF-8"?><rss xmlns:g="http://base.google.com/ns/1.0" version="2.0"><channel><title>Shopping China Brasil</title><link>${xml(SITE_URL)}</link><description>Catálogo Shopping China Brasil</description>${items}</channel></rss>`;
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300, s-maxage=900" } });
}

type MerchantProduct = { id: string; slug: string; title: string; description: string; brand: string | null; gtin: string | null; mpn: string | null; condition: string; image_url: string; additional_image_urls: string[]; price_cents: number; currency: string; availability: string; google_product_category: string | null; updated_at: string };
function xml(value: string) { return value.replace(/[<>&"']/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!); }

function merchantImageUrl(productId: string, index = 0) {
  return `${SITE_URL}/merchant-image/${encodeURIComponent(productId)}/${index}`;
}

const preservedMerchantTerms = new Set([
  "3D", "4K", "5G", "8K", "A16", "AI", "AM", "AMD", "AMOLED", "CPU", "DDR4", "DDR5", "GB", "GHz",
  "GPS", "GPU", "HD", "HDMI", "HDR", "Hz", "iPad", "iPhone", "LED", "MP", "OLED", "PC", "PS4", "PS5",
  "RAM", "RJ45", "SSD", "TB", "TV", "UHD", "USB", "USB-C", "Wi-Fi", "Xbox",
]);

function merchantTitle(value: string) {
  const letters = value.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, "");
  const uppercaseLetters = letters.replace(/[^A-ZÀ-ÖØ-Þ]/g, "");
  if (!letters || uppercaseLetters.length / letters.length < 0.75) return value;

  return value.toLocaleLowerCase("pt-BR").replace(/\b[\p{L}\p{N}][\p{L}\p{N}-]*\b/gu, (word, offset) => {
    const preserved = [...preservedMerchantTerms].find((term) => term.toLocaleLowerCase("pt-BR") === word);
    if (preserved) return preserved;
    if (offset > 0 && /^(a|as|com|da|das|de|do|dos|e|em|para|por)$/.test(word)) return word;
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
}

const restrictedProductPattern = /\b(cigarro|cigarette|tabaco|tobacco|vape|vaper|charuto|cachimbo|narguile|arma|pistola|revolver|rifle|municao|munição|cartucho de arma|adulto|erotico|erótico)\b/i;
function isMerchantEligible(product: MerchantProduct) {
  return Boolean(
    product.id && product.slug && product.title && product.brand && product.image_url &&
    product.description?.trim().length >= 250 &&
    product.price_cents > 0 && product.currency === "BRL" && product.availability === "in_stock" &&
    !restrictedProductPattern.test(product.title),
  );
}
