export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string | null;
  oldPrice?: string | null;
  discount?: number | null;
};

export type CategoryData = {
  slug: string;
  name: string;
  icon: string | null;
  children: { slug: string; name: string }[];
};

export type ProductDetailData = {
  id: string;
  slug: string;
  title: string;
  price: string | null;
  currency: string;
  availability: string;
  brand: string | null;
  gtin: string | null;
  mpn: string | null;
  brandImage: string | null;
  images: string[];
  description: string;
  specifications: string[];
  breadcrumbs: { name: string; path: string }[];
  syncedAt?: string | null;
};

const SOURCE = "https://www.shoppingchina.com.br";

export async function getCategoryPage(path: string, page = 1) {
  const safePath = path.split("/").map(encodeURIComponent).join("/");
  const response = await fetch(`${SOURCE}/${safePath}?page=${Math.max(1, page)}`, {
    headers: { "user-agent": "ShoppingChinaBrasilMirror/1.0" },
    next: { revalidate: 1800 },
  });
  if (!response.ok) return null;
  const html = await response.text();
  const content = html.slice(html.indexOf('id="search-products-url"'));
  const title = decodeHtml(html.match(/<h2[^>]*>([^<]+)<\/h2>/)?.[1]?.trim() ?? titleFromSlug(path.split("/").at(-1) ?? path));
  const total = Number(html.match(/de\s*<b>(\d+)<\/b>\s*en total/)?.[1] ?? 0);
  const lastPage = Math.max(1, ...[...html.matchAll(/[?&]page=(\d+)/g)].map((match) => Number(match[1])));
  const products: ProductCardData[] = [];
  const anchors = content.match(/<a href="https:\/\/www\.shoppingchina\.com\.br\/produto\/[^"]+">[\s\S]*?<\/a>/g) ?? [];

  for (const block of anchors) {
    if (!block.includes("card-img-top")) continue;
    const oldUrl = decodeHtml(block.match(/href="([^"]+)"/)?.[1] ?? "");
    const slug = oldUrl.split("/produto/")[1];
    const imageTag = block.match(/<img[^>]+class="[^"]*card-img-top[^"]*"[^>]*>/)?.[0] ?? "";
    const image = decodeHtml(imageTag.match(/src="([^"]+)"/)?.[1] ?? "");
    const titleText = decodeHtml(imageTag.match(/alt="([^"]+)"/)?.[1] ?? "Produto");
    const price = block.match(/R\$\s*[\d.]+,\d{2}/g)?.at(-1) ?? null;
    if (!slug || !image) continue;
    products.push({ id: slug.match(/-(\d+)$/)?.[1] ?? slug, slug, title: titleText, image, price });
  }

  return { title, total, page, lastPage, products: uniqueById(products) };
}

export async function getProductDetail(slug: string): Promise<ProductDetailData | null> {
  const databaseProduct = await getSupabaseProductDetail(slug);
  if (databaseProduct) return databaseProduct;
  if (process.env.CATALOG_SUPABASE_REQUIRED === "true") return null;

  const response = await fetch(`${SOURCE}/produto/${encodeURIComponent(slug)}`, {
    headers: { "user-agent": "ShoppingChinaBrasilMirror/1.0" },
    next: { revalidate: 1800 },
  });
  if (!response.ok) return null;
  const html = await response.text();
  let structured: Record<string, unknown> | null = null;

  for (const match of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    try {
      const candidate = JSON.parse(match[1]);
      if (candidate?.["@type"] === "Product") structured = candidate;
    } catch {
      // Legacy pages can contain invalid structured data; HTML fallbacks still work.
    }
  }

  const main = html.slice(html.indexOf("<!--PRODUCT-->"), html.indexOf("<!--RELATED-->"));
  const imageUrls = [...main.matchAll(/<img[^>]+src="([^"]+)"/g)]
    .map((match) => decodeHtml(match[1]))
    .filter((url) => url.includes("active_storage"));
  const images = [...new Set(imageUrls)];
  const title = decodeHtml(
    main.match(/<h3[^>]*>([\s\S]*?)<\/h3>/)?.[1]?.replace(/<[^>]+>/g, " ") ??
    (structured?.name as string | undefined) ??
    titleFromSlug(slug),
  ).replace(/\s+/g, " ").trim();
  const offers = structured?.offers as Record<string, unknown> | undefined;
  const brand = structured?.brand as Record<string, unknown> | undefined;
  const descriptionBlock = main.match(/<h6[^>]*>Descrição<\/h6>([\s\S]*?)<div class=\s*"sc-text-grey"/)?.[1] ?? "";
  const contentBlocks = [...descriptionBlock.matchAll(/<div class="trix-content">([\s\S]*?)<\/div>\s*<\/div>/g)].map((match) => match[1]);
  const plainBlocks = contentBlocks.length ? contentBlocks : [descriptionBlock];
  const description = stripHtml(plainBlocks[0] ?? "");
  const specifications = (plainBlocks[1] ?? "")
    .replace(/<div>/g, "\n")
    .split("\n")
    .map(stripHtml)
    .filter(Boolean);
  const brandImage = main.match(/Marca:[\s\S]*?<img[^>]+src="([^"]+)"/)?.[1] ?? null;
  const breadcrumbBlock = html.match(/<ol class\s*=\s*"breadcrumb">([\s\S]*?)<\/ol>/)?.[1] ?? "";
  const breadcrumbs = [...breadcrumbBlock.matchAll(/href="https:\/\/www\.shoppingchina\.com\.br\/([^"]+)"[^>]*>([^<]+)<\/a>/g)]
    .map((match) => ({ name: decodeHtml(match[2].trim()), path: match[1] }));
  const priceNumber = Number(offers?.price);

  return {
    id: String(structured?.["@id"] ?? slug.match(/-(\d+)$/)?.[1] ?? slug),
    slug,
    title,
    price: Number.isFinite(priceNumber) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceNumber) : null,
    currency: String(offers?.priceCurrency ?? "BRL"),
    availability: String(offers?.availability ?? ""),
    brand: typeof brand?.name === "string" ? brand.name : null,
    gtin: getStructuredString(structured, ["gtin14", "gtin13", "gtin12", "gtin8", "gtin"]),
    mpn: getStructuredString(structured, ["mpn", "sku"]),
    brandImage: brandImage ? decodeHtml(brandImage) : null,
    images: images.length ? images : (typeof structured?.image === "string" ? [structured.image] : []),
    description,
    specifications,
    breadcrumbs,
  };
}

async function getSupabaseProductDetail(slug: string): Promise<ProductDetailData | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  const fields = "id,slug,title,description,brand,gtin,mpn,image_url,additional_image_urls,price_cents,currency,availability,synced_at";
  try {
    const response = await fetch(`${url}/rest/v1/products?slug=eq.${encodeURIComponent(slug)}&active=eq.true&select=${fields}&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 300 },
    });
    if (!response.ok) return null;
    const [row] = await response.json() as Array<Record<string, unknown>>;
    if (!row) return null;
    const priceCents = Number(row.price_cents);
    const images = [row.image_url, ...(Array.isArray(row.additional_image_urls) ? row.additional_image_urls : [])].filter((value): value is string => typeof value === "string" && Boolean(value));
    return {
      id: String(row.id),
      slug: String(row.slug),
      title: String(row.title),
      price: Number.isFinite(priceCents) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceCents / 100) : null,
      currency: String(row.currency ?? "BRL"),
      availability: String(row.availability ?? "out_of_stock"),
      brand: row.brand ? String(row.brand) : null,
      gtin: row.gtin ? String(row.gtin) : null,
      mpn: row.mpn ? String(row.mpn) : null,
      brandImage: null,
      images,
      description: String(row.description ?? ""),
      specifications: [],
      breadcrumbs: [],
      syncedAt: row.synced_at ? String(row.synced_at) : null,
    };
  } catch {
    return null;
  }
}

function getStructuredString(value: Record<string, unknown> | null, keys: string[]) {
  for (const key of keys) if (typeof value?.[key] === "string" && value[key]) return String(value[key]);
  return null;
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<br\s*\/?\s*>/gi, "\n").replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .trim();
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

function titleFromSlug(value: string) {
  return value.split("-").map((word) => word.length <= 3 ? word : `${word[0].toUpperCase()}${word.slice(1)}`).join(" ");
}

function uniqueById<T extends { id: string }>(items: T[]) {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}
