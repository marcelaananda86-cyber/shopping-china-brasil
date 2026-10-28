export type ProductCardData = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string | null;
  oldPrice?: string | null;
  discount?: number | null;
};

export type SearchSort = "relevance" | "newest" | "name-asc" | "name-desc" | "price-asc" | "price-desc";

export type SearchPageData = {
  products: ProductCardData[];
  total: number;
  page: number;
  lastPage: number;
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

const SEARCH_FILTERS: Record<SearchSort, number> = {
  relevance: 0,
  newest: 5,
  "name-asc": 1,
  "name-desc": 2,
  "price-asc": 3,
  "price-desc": 4,
};

const SEARCH_PAGE_SIZE = 24;
const MAX_RELEVANCE_PAGES = 8;
const ACCESSORY_TERMS = [
  "adaptador", "auricular", "base", "bateria", "bolsa", "cabo", "capa", "carregador", "case", "cooler",
  "controle", "control", "fone", "headset", "jogo", "juego", "pelicula", "protetor", "soporte", "suporte", "volante",
];
const MAIN_PRODUCT_TERMS = ["camera", "celular", "console", "impressora", "monitor", "notebook", "perfume", "relogio", "smartphone", "smartwatch", "tablet", "televisor", "tv"];
const SEARCH_TERM_ALIASES: Record<string, string[]> = {
  capa: ["case"],
  case: ["capa"],
  control: ["controle"],
  controle: ["control"],
  fone: ["auricular", "headset"],
  jogo: ["juego"],
  juego: ["jogo"],
  soporte: ["suporte"],
  suporte: ["soporte"],
};

export async function getSearchPage(query: string, page = 1, sort: SearchSort = "relevance"): Promise<SearchPageData | null> {
  const cleanQuery = query.trim();
  if (cleanQuery.length < 2) return { products: [], total: 0, page: 1, lastPage: 1 };

  const safePage = Math.max(1, page);

  try {
    const firstPageToFetch = sort === "relevance" ? 1 : safePage;
    const firstHtml = await fetchSearchHtml(cleanQuery, firstPageToFetch, sort);
    const firstResult = firstHtml ? parseSearchHtml(firstHtml) : null;
    if (!firstResult) return null;

    if (sort !== "relevance") {
      return { products: firstResult.products, total: firstResult.total, page: safePage, lastPage: firstResult.lastPage };
    }

    const relevancePageCount = Math.min(firstResult.lastPage, MAX_RELEVANCE_PAGES);
    const remainingPages = Array.from({ length: Math.max(0, relevancePageCount - 1) }, (_, index) => index + 2);
    const remainingResults = await Promise.all(remainingPages.map(async (pageNumber) => {
      const html = await fetchSearchHtml(cleanQuery, pageNumber, sort);
      return html ? parseSearchHtml(html)?.products ?? [] : [];
    }));
    const rankedProducts = rankSearchProducts(cleanQuery, uniqueById([firstResult.products, ...remainingResults].flat()));
    const start = (safePage - 1) * SEARCH_PAGE_SIZE;
    let products = rankedProducts.slice(start, start + SEARCH_PAGE_SIZE);

    if (products.length === 0 && safePage > relevancePageCount && safePage <= firstResult.lastPage) {
      const requestedHtml = await fetchSearchHtml(cleanQuery, safePage, sort);
      products = requestedHtml ? parseSearchHtml(requestedHtml)?.products ?? [] : [];
    }

    return {
      products,
      total: firstResult.total,
      page: safePage,
      lastPage: firstResult.lastPage,
    };
  } catch {
    return null;
  }
}

async function fetchSearchHtml(query: string, page: number, sort: SearchSort) {
  const params = new URLSearchParams({
    query,
    page: String(page),
    filter: String(SEARCH_FILTERS[sort] ?? SEARCH_FILTERS.relevance),
  });
  const response = await fetch(`${SOURCE}/site/search?${params.toString()}`, {
    headers: { "user-agent": "ShoppingChinaBrasilSearch/1.0" },
    next: { revalidate: 300 },
  });
  return response.ok ? response.text() : null;
}

function parseSearchHtml(html: string): SearchPageData | null {
  const productSectionIndex = html.indexOf('id="search-products-url"');
  if (productSectionIndex === -1) return null;
  const products = extractProductCards(html.slice(productSectionIndex));
  const total = Number(html.match(/de\s*<b>(\d+)<\/b>\s*en total/)?.[1] ?? 0);
  const lastPage = Math.max(1, ...[...html.matchAll(/[?&]page=(\d+)/g)].map((match) => Number(match[1])));
  if (total > 0 && products.length === 0) return null;
  return { products, total, page: 1, lastPage };
}

function rankSearchProducts(query: string, products: ProductCardData[]) {
  const normalizedQuery = normalizeSearchText(query);
  const queryTerms = normalizedQuery.split(/\s+/).filter((term) => term.length > 1);
  const primaryTypes = inferPrimaryTypes(normalizedQuery);
  const explicitAccessoryIntent = ACCESSORY_TERMS.some((term) => hasTerm(normalizedQuery, term));

  return products
    .map((product, sourceIndex) => ({ product, sourceIndex, score: searchRelevanceScore(product.title, normalizedQuery, queryTerms, primaryTypes, explicitAccessoryIntent) }))
    .sort((a, b) => b.score - a.score || a.sourceIndex - b.sourceIndex)
    .map(({ product }) => product);
}

function searchRelevanceScore(title: string, query: string, queryTerms: string[], primaryTypes: string[], explicitAccessoryIntent: boolean) {
  const normalizedTitle = normalizeSearchText(title);
  let score = 0;

  if (normalizedTitle === query) score += 10_000;
  if (normalizedTitle.startsWith(query)) score += 3_000;
  else if (normalizedTitle.includes(query)) score += 1_500;

  const matchedTerms = queryTerms.filter((term) => titleMatchesQueryTerm(normalizedTitle, term));
  score += matchedTerms.length * 350;
  if (queryTerms.length > 0 && matchedTerms.length === queryTerms.length) score += 700;

  const requestedAccessories = ACCESSORY_TERMS.filter((term) => hasTerm(query, term));
  const mainType = MAIN_PRODUCT_TERMS.find((term) => hasTerm(normalizedTitle, term));
  if (mainType && (!explicitAccessoryIntent || hasTerm(query, mainType))) {
    score += normalizedTitle.startsWith(mainType) ? 900 : 500;
  }

  if (explicitAccessoryIntent) {
    for (const accessory of requestedAccessories) {
      if (titleMatchesQueryTerm(normalizedTitle, accessory)) {
        score += titleStartsWithTerm(normalizedTitle, accessory) ? 4_500 : 3_000;
      }
    }
  }

  if (primaryTypes.length > 0 && !explicitAccessoryIntent) {
    const matchingPrimaryType = primaryTypes.find((term) => hasTerm(normalizedTitle, term));
    if (matchingPrimaryType) score += normalizedTitle.startsWith(matchingPrimaryType) ? 4_500 : 3_500;

    for (const accessory of ACCESSORY_TERMS) {
      if (!primaryTypes.includes(accessory) && !hasTerm(query, accessory) && hasTerm(normalizedTitle, accessory)) {
        score -= normalizedTitle.startsWith(accessory) ? 1_600 : 1_100;
      }
    }

    if (primaryTypes.includes("console") && !hasTerm(query, "portatil") && hasTerm(normalizedTitle, "portatil")) {
      score -= 2_500;
    }
  }

  return score;
}

function inferPrimaryTypes(query: string) {
  if (/\b(?:ps5|playstation\s*5|xbox|nintendo\s+switch)\b/.test(query)) return ["console"];
  if (/\b(?:iphone|galaxy)\b/.test(query)) return ["celular", "smartphone"];
  if (/\b(?:macbook|notebook|laptop)\b/.test(query)) return ["notebook"];
  if (/\b(?:airpods)\b/.test(query)) return ["fone", "auricular"];
  if (/\b(?:apple\s+watch|smartwatch)\b/.test(query)) return ["smartwatch", "relogio"];
  return [];
}

function titleMatchesQueryTerm(title: string, term: string) {
  if (hasTerm(title, term)) return true;
  if (SEARCH_TERM_ALIASES[term]?.some((alias) => hasTerm(title, alias))) return true;
  if (term === "ps5") return /\bplaystation\s*5\b/.test(title);
  if (term === "playstation" && hasTerm(title, "ps5")) return true;
  return false;
}

function titleStartsWithTerm(title: string, term: string) {
  return title.startsWith(`${term} `) || SEARCH_TERM_ALIASES[term]?.some((alias) => title.startsWith(`${alias} `)) === true;
}

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hasTerm(value: string, term: string) {
  return new RegExp(`(?:^|\\s)${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|\\s)`).test(value);
}

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
  return { title, total, page, lastPage, products: extractProductCards(content) };
}

function extractProductCards(content: string): ProductCardData[] {
  const products: ProductCardData[] = [];
  const anchors = content.match(/<a href="https:\/\/www\.shoppingchina\.com\.br\/produto\/[^\"]+">[\s\S]*?<\/a>/g) ?? [];

  for (const block of anchors) {
    if (!block.includes("card-img-top")) continue;
    const oldUrl = decodeHtml(block.match(/href="([^"]+)"/)?.[1] ?? "");
    const slug = oldUrl.split("/produto/")[1];
    const imageTag = block.match(/<img[^>]+class="[^"]*card-img-top[^"]*"[^>]*>/)?.[0] ?? "";
    const image = decodeHtml(imageTag.match(/src="([^"]+)"/)?.[1] ?? "");
    const title = decodeHtml(imageTag.match(/alt="([^"]+)"/)?.[1] ?? "Produto");
    const prices = block.match(/R\$\s*[\d.]+,\d{2}/g) ?? [];
    const price = prices.at(-1) ?? null;
    const oldPrice = prices.length > 1 ? prices[0] : null;
    const explicitDiscount = Number(block.match(/-(\d+)\s*%/)?.[1]);
    const calculatedDiscount = oldPrice && price ? calculateDiscount(oldPrice, price) : null;
    const discount = Number.isFinite(explicitDiscount) && explicitDiscount > 0 ? explicitDiscount : calculatedDiscount;
    if (!slug || !image) continue;
    products.push({
      id: slug.match(/-(\d+)$/)?.[1] ?? slug,
      slug,
      title,
      image,
      price,
      oldPrice,
      discount,
    });
  }

  return uniqueById(products);
}

function calculateDiscount(oldPrice: string, price: string) {
  const oldValue = parseBrl(oldPrice);
  const currentValue = parseBrl(price);
  if (!oldValue || !currentValue || currentValue >= oldValue) return null;
  return Math.max(1, Math.round((1 - currentValue / oldValue) * 100));
}

function parseBrl(value: string) {
  return Number(value.replace(/[^\d,]/g, "").replace(",", "."));
}

export async function getProductDetail(slug: string): Promise<ProductDetailData | null> {
  const [databaseProduct, sourceProduct] = await Promise.all([
    getSupabaseProductDetail(slug),
    getSourceProductDetail(slug),
  ]);

  if (databaseProduct && sourceProduct) return mergeProductDetails(databaseProduct, sourceProduct);
  if (databaseProduct) return databaseProduct;
  if (process.env.CATALOG_SUPABASE_REQUIRED === "true") return null;
  return sourceProduct;
}

function mergeProductDetails(database: ProductDetailData, source: ProductDetailData): ProductDetailData {
  return {
    ...source,
    id: database.id || source.id,
    slug: database.slug || source.slug,
    title: source.title || database.title,
    price: database.price || source.price,
    currency: database.currency || source.currency,
    availability: database.availability || source.availability,
    brand: database.brand || source.brand,
    gtin: database.gtin || source.gtin,
    mpn: database.mpn || source.mpn,
    brandImage: source.brandImage || database.brandImage,
    images: uniqueStrings([...source.images, ...database.images]),
    description: source.description.length >= database.description.length ? source.description : database.description,
    specifications: source.specifications.length ? source.specifications : database.specifications,
    breadcrumbs: source.breadcrumbs.length ? source.breadcrumbs : database.breadcrumbs,
    syncedAt: database.syncedAt || source.syncedAt,
  };
}

async function getSourceProductDetail(slug: string): Promise<ProductDetailData | null> {
  try {
    const response = await fetch(`${SOURCE}/produto/${encodeURIComponent(slug)}`, {
      headers: { "user-agent": "ShoppingChinaBrasilMirror/1.0" },
      next: { revalidate: 1800 },
    });
    if (!response.ok) return null;
    const html = await response.text();
    const structured = readProductStructuredData(html);

    const productStart = html.indexOf("<!--PRODUCT-->");
    const productEnd = html.indexOf("<!--RELATED-->", productStart);
    if (productStart < 0 || productEnd < 0) return null;
    const main = html.slice(productStart, productEnd);
    const galleryImages = [...main.matchAll(/<img\b[^>]*(?:src|data-src)=["']([^"']+)["'][^>]*>/gi)]
      .map((match) => decodeHtml(match[1]))
      .filter((url) => url.includes("active_storage"));
    const structuredImages = normalizeStructuredImages(structured?.image);
    const images = uniqueStrings([...galleryImages, ...structuredImages]);
    const title = decodeHtml(
      main.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]?.replace(/<[^>]+>/g, " ") ??
      (structured?.name as string | undefined) ??
      titleFromSlug(slug),
    ).replace(/\s+/g, " ").trim();
    const offerValue = Array.isArray(structured?.offers) ? structured.offers[0] : structured?.offers;
    const offers = isRecord(offerValue) ? offerValue : undefined;
    const brandValue = structured?.brand;
    const brand = isRecord(brandValue) ? brandValue : undefined;
    const descriptionBlock = main.match(/<h6[^>]*>\s*Descrição\s*<\/h6>([\s\S]*?)<div class=\s*["']sc-text-grey["']/i)?.[1] ?? "";
    const contentBlocks = [...descriptionBlock.matchAll(/<div class=["']trix-content["']>([\s\S]*?)<\/div>\s*<\/div>/gi)]
      .map((match) => match[1]);
    const plainBlocks = contentBlocks.length ? contentBlocks : [descriptionBlock];
    const description = stripHtml(plainBlocks[0] ?? "");
    const specifications = htmlToLines(plainBlocks[1] ?? "");
    const brandImage = main.match(/Marca:[\s\S]*?<img[^>]+src=["']([^"']+)["']/i)?.[1] ?? null;
    const breadcrumbBlock = html.match(/<ol class\s*=\s*["']breadcrumb["']>([\s\S]*?)<\/ol>/i)?.[1] ?? "";
    const breadcrumbs = [...breadcrumbBlock.matchAll(/href=["']https:\/\/www\.shoppingchina\.com\.br\/([^"']+)["'][^>]*>([^<]+)<\/a>/gi)]
      .map((match) => ({ name: decodeHtml(match[2].trim()), path: match[1] }));
    const priceNumber = Number(offers?.price);

    return {
      id: String(structured?.["@id"] ?? slug.match(/-(\d+)$/)?.[1] ?? slug),
      slug,
      title,
      price: Number.isFinite(priceNumber) ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(priceNumber) : null,
      currency: String(offers?.priceCurrency ?? "BRL"),
      availability: String(offers?.availability ?? ""),
      brand: typeof brand?.name === "string" ? brand.name : (typeof brandValue === "string" ? brandValue : null),
      gtin: getStructuredString(structured, ["gtin14", "gtin13", "gtin12", "gtin8", "gtin"]),
      mpn: getStructuredString(structured, ["mpn", "sku"]),
      brandImage: brandImage ? decodeHtml(brandImage) : null,
      images,
      description,
      specifications,
      breadcrumbs,
    };
  } catch {
    return null;
  }
}

function readProductStructuredData(html: string): Record<string, unknown> | null {
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const value = JSON.parse(match[1]);
      const entries = Array.isArray(value) ? value : (Array.isArray(value?.["@graph"]) ? value["@graph"] : [value]);
      const product = entries.find((entry: unknown) => isRecord(entry) && entry["@type"] === "Product");
      if (isRecord(product)) return product;
    } catch {
      // Some legacy product pages contain malformed JSON-LD; HTML fallbacks still work.
    }
  }
  return null;
}

function normalizeStructuredImages(value: unknown) {
  const values = Array.isArray(value) ? value : [value];
  return values.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (isRecord(item) && typeof item.url === "string") return [item.url];
    return [];
  });
}

function htmlToLines(value: string) {
  return uniqueStrings(
    decodeHtml(value)
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<\/(?:div|li|p)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
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
