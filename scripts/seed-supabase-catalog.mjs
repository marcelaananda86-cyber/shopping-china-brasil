import { readFile } from "node:fs/promises";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
}

const catalog = JSON.parse(await readFile(new URL("../public/data/catalog-index.json", import.meta.url), "utf8"));
const home = JSON.parse(await readFile(new URL("../public/data/home.json", import.meta.url), "utf8"));
const featured = new Map(
  Object.values(home.sections)
    .flat()
    .map((product) => [String(product.id), product]),
);

const seenSlugs = new Set();
const uniqueCatalog = [...new Map(catalog.map((product) => [String(product.id), product])).values()]
  .filter((product) => {
    if (seenSlugs.has(product.slug)) return false;
    seenSlugs.add(product.slug);
    return true;
  });

const rows = uniqueCatalog.map((product) => {
  const highlight = featured.get(String(product.id));
  return {
    id: String(product.id),
    slug: product.slug,
    title: product.title,
    image_url: highlight?.image ?? "",
    price_cents: parsePrice(highlight?.price),
    currency: "BRL",
    availability: "out_of_stock",
    stock: 0,
    active: false,
    source_url: `https://www.shoppingchina.com.br/produto/${product.slug}`,
    next_sync_at: highlight ? "1970-01-01T00:00:00.000Z" : new Date().toISOString(),
  };
});

const batchSize = 500;
for (let index = 0; index < rows.length; index += batchSize) {
  const batch = rows.slice(index, index + batchSize);
  const response = await fetch(`${supabaseUrl}/rest/v1/products?on_conflict=id`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(batch),
  });
  if (!response.ok) {
    throw new Error(`Falha no lote ${index / batchSize + 1}: ${response.status} ${await response.text()}`);
  }
  process.stdout.write(`\rCatálogo preparado: ${Math.min(index + batch.length, rows.length)}/${rows.length}`);
}

process.stdout.write(`\n${rows.length} produtos cadastrados para sincronização.\n`);

function parsePrice(value) {
  if (!value) return 0;
  const normalized = String(value).replace(/[^\d,.-]/g, "").replaceAll(".", "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}
