import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SOURCE = "https://www.shoppingchina.com.br";
const SITEMAP = "https://shoppingchina.com.py/sitemap_br.xml";
const outDir = path.join(ROOT, "public", "data");
const assetDir = path.join(ROOT, "public", "assets", "shopping-china");

await mkdir(outDir, { recursive: true });
await mkdir(assetDir, { recursive: true });

const html = await fetchText(`${SOURCE}/`);
const sitemap = await fetchText(SITEMAP);

const categoryNames = {
  "acessorios-de-moda": "Acessórios de Moda",
  alimentos: "Alimentos",
  bebidas: "Bebidas",
  brinquedos: "Brinquedos",
  "cameras-digitais": "Câmeras digitais",
  camping: "Camping",
  "casa-e-decoracao": "Casa e decoração",
  cosmeticos: "Cosméticos",
  eletrodomesticos: "Eletrodomésticos",
  eletronicos: "Eletrônicos",
  esportes: "Esportes",
  ferragens: "Ferragens",
  informatica: "Informática",
  "material-escolar-e-musical": "Material escolar e musical",
  "moto-racing": "Moto racing",
  "mundo-bebe": "Mundo Bebê",
  perfumaria: "Perfumaria",
  pesca: "Pesca",
  "pets-shop": "Pets shop",
  "saude-e-beleza": "Saúde e beleza",
  tabacos: "Tabacos",
  tunning: "Tunning",
};

const allUrls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeEntities(match[1]));
const productUrls = allUrls.filter((url) => url.includes("/br/produto/"));
const catalog = productUrls.map((url) => {
  const slug = url.split("/produto/")[1];
  const id = slug.match(/-(\d+)$/)?.[1] ?? slug;
  const words = slug.replace(/-\d+$/, "").split("-");
  const title = words.join(" ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  return { id, slug, title };
});

const categoryPaths = allUrls
  .filter((url) => url.includes("/br/"))
  .map((url) => url.split("/br/")[1]?.replace(/\/$/, ""))
  .filter(Boolean)
  .filter((value) => !value.includes("produto/") && !value.includes("sc-blogs") && !value.includes("sitemap"));

const categories = Object.entries(categoryNames).map(([slug, name]) => {
  const children = [...new Set(categoryPaths
    .filter((value) => value.startsWith(`${slug}/`))
    .map((value) => value.slice(slug.length + 1))
    .filter((value) => value && !value.includes("/")))]
    .map((child) => ({ slug: child, name: titleFromSlug(child) }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  const iconMatch = html.match(new RegExp(`alt="${escapeRegExp(name)}"[^>]+src="([^"]+)"`));
  return { slug, name, icon: iconMatch?.[1] ?? null, children };
});

const heroSection = between(html, '<section id="main-banners">', "</section>");
const desktopBanners = [...heroSection.matchAll(/class="w-100 d-none d-md-block"[^>]+src="([^"]+)"/g)].map((match) => decodeEntities(match[1]));
const mobileBanners = [...heroSection.matchAll(/class="w-100 d-block d-md-none"[^>]+src="([^"]+)"/g)].map((match) => decodeEntities(match[1]));

const popularSection = between(html, 'id="most-visited"', "</section>");
const popular = [...popularSection.matchAll(/href="https:\/\/www\.shoppingchina\.com\.br\/([^"/?]+)"[\s\S]*?<img[^>]+alt="([^"]+)"[^>]+src="([^"]+)"/g)]
  .map((match) => ({ slug: match[1], name: decodeEntities(match[2]), image: decodeEntities(match[3]) }));

const uniqueSection = between(html, 'id="unique"', "</section>");
const releasesSection = between(html, "Fique por dentro dos nossos novos produtos", "</section>");
const dealsSection = between(html, "Encontre o produto dos seus sonhos", "</section>");

const home = {
  syncedAt: new Date().toISOString(),
  source: SOURCE,
  banners: desktopBanners.map((desktop, index) => ({ desktop, mobile: mobileBanners[index] ?? desktop })),
  popular,
  sections: {
    opportunities: extractProducts(uniqueSection),
    releases: extractProducts(releasesSection),
    offers: extractProducts(dealsSection),
  },
};

await Promise.all([
  writeJson(path.join(outDir, "catalog-index.json"), catalog),
  writeJson(path.join(outDir, "categories.json"), categories),
  writeJson(path.join(outDir, "home.json"), home),
]);

const downloads = [
  { url: `${SOURCE}/img/photos/logo/logo.webp`, file: "logo-mark.webp" },
  { url: `${SOURCE}/img/photos/logo/shochi_texto.webp`, file: "logo-word.webp" },
  { url: `${SOURCE}/img/footer/logo_ecommerce.webp`, file: "logo-footer.webp" },
  ...desktopBanners.map((url, index) => ({ url, file: `hero-${index + 1}-desktop.webp` })),
  ...mobileBanners.map((url, index) => ({ url, file: `hero-${index + 1}-mobile.webp` })),
  ...popular.map((item, index) => ({ url: item.image, file: `popular-${index + 1}.webp` })),
];

await Promise.all(downloads.map(async ({ url, file }) => {
  const response = await fetch(url, { headers: { "user-agent": "ShoppingChinaBrasilSync/1.0" } });
  if (!response.ok) throw new Error(`Falha ao baixar ${url}: ${response.status}`);
  await writeFile(path.join(assetDir, file), Buffer.from(await response.arrayBuffer()));
}));

console.log(JSON.stringify({
  products: catalog.length,
  categories: categories.length,
  subcategories: categories.reduce((total, item) => total + item.children.length, 0),
  banners: home.banners.length,
  homeProducts: Object.values(home.sections).reduce((total, items) => total + items.length, 0),
  assets: downloads.length,
}, null, 2));

async function fetchText(url) {
  const response = await fetch(url, { headers: { "user-agent": "ShoppingChinaBrasilSync/1.0" } });
  if (!response.ok) throw new Error(`Falha ao acessar ${url}: ${response.status}`);
  return response.text();
}

function extractProducts(section) {
  const products = [];
  const anchors = section.match(/<a href="https:\/\/www\.shoppingchina\.com\.br\/produto\/[^"]+">[\s\S]*?<\/a>/g) ?? [];
  for (const block of anchors) {
    const url = block.match(/href="([^"]+)"/)?.[1];
    const slug = url?.split("/produto/")[1];
    const image = block.match(/<img[^>]+(?:alt="([^"]*)"[^>]+src="([^"]+)"|src="([^"]+)"[^>]+alt="([^"]*)")/) ?? [];
    const title = decodeEntities(image[1] || image[4] || block.match(/prod-title[^>]*>([^<]+)/)?.[1] || "Produto");
    const imageUrl = decodeEntities(image[2] || image[3] || "");
    const prices = [...block.matchAll(/R\$\s*[\d.]+,\d{2}/g)].map((match) => match[0]);
    const discount = block.match(/-(\d+)\s*%/)?.[1];
    if (!slug || !imageUrl) continue;
    products.push({
      id: slug.match(/-(\d+)$/)?.[1] ?? slug,
      slug,
      title,
      image: imageUrl,
      oldPrice: prices.length > 1 ? prices[0] : null,
      price: prices.at(-1) ?? null,
      discount: discount ? Number(discount) : null,
    });
  }
  return [...new Map(products.map((item) => [item.id, item])).values()];
}

function between(value, start, end) {
  const startIndex = value.indexOf(start);
  if (startIndex === -1) return "";
  const endIndex = value.indexOf(end, startIndex);
  return value.slice(startIndex, endIndex === -1 ? undefined : endIndex + end.length);
}

function titleFromSlug(slug) {
  return slug.split("-").map((word) => word.length <= 3 ? word : word[0].toUpperCase() + word.slice(1)).join(" ");
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&nbsp;", " ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function writeJson(file, value) {
  await writeFile(file, `${JSON.stringify(value)}\n`);
}
