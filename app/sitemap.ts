import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.URL ??
    process.env.DEPLOY_PRIME_URL ??
    "http://localhost:5173"
  ).replace(/\/$/, "");
  return ["", "/politicas", "/politicas/entrega", "/politicas/trocas-e-devolucoes", "/politicas/privacidade", "/politicas/pagamentos", "/termos", "/contato"].map((path) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: path ? "monthly" : "daily", priority: path ? 0.5 : 1 }));
}
