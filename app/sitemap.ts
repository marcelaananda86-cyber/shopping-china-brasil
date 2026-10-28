import type { MetadataRoute } from "next";
import categories from "@/public/data/categories.json";
import { SITE_URL } from "@/lib/site-config";

type SitemapProduct = { slug: string; updated_at: string | null };

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPages: MetadataRoute.Sitemap = ["", "/sobre", "/politicas", "/politicas/entrega", "/politicas/trocas-e-devolucoes", "/politicas/privacidade", "/politicas/pagamentos", "/termos", "/contato"].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path ? "monthly" : "daily",
    priority: path ? 0.6 : 1,
  }));
  const categoryPages: MetadataRoute.Sitemap = categories.flatMap((category) => [
    { url: `${SITE_URL}/categoria/${category.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.8 },
    ...category.children.map((child) => ({ url: `${SITE_URL}/categoria/${child.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.7 })),
  ]);
  const products = await getProducts();
  const productPages: MetadataRoute.Sitemap = products.map((product) => ({
    url: `${SITE_URL}/produto/${product.slug}`,
    lastModified: product.updated_at ? new Date(product.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));
  return [...staticPages, ...categoryPages, ...productPages];
}

async function getProducts() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return [];
  const products: SitemapProduct[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const response = await fetch(`${supabaseUrl}/rest/v1/merchant_products?select=slug,updated_at&order=id.asc`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}` },
      next: { revalidate: 3600 },
    });
    if (!response.ok) break;
    const batch = await response.json() as SitemapProduct[];
    products.push(...batch);
    if (batch.length < 1000) break;
  }
  return products;
}
