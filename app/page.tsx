import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import homeData from "@/public/data/home.json";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import { HardLink } from "@/components/hard-link";
import type { ProductCardData } from "@/lib/shopping-china";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const liveSections = await getLiveHomeSections();
  return (
    <main>
      <HeroCarousel banners={homeData.banners} />

      <section className="border-b border-slate-200 bg-white">
        <div className="page-shell grid grid-cols-1 divide-y divide-slate-200 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TrustItem icon={<BadgeCheck />} title="Produtos originais" text="As melhores marcas do mundo" />
          <TrustItem icon={<MapPin />} title="Ciudad del Este" text="Estoque da filial principal" />
          <TrustItem icon={<ShieldCheck />} title="Compra segura" text="Dados e pedidos protegidos" />
        </div>
      </section>

      <section className="page-shell py-12">
        <SectionHeading eyebrow="Explore" title="Setores mais visitados" description="Encontre rapidamente os departamentos preferidos dos nossos clientes." />
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {homeData.popular.map((category, index) => (
            <HardLink key={category.slug} href={`/categoria/${category.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/shopping-china/popular-${index + 1}.webp`} alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <h3 className="px-2 py-3 text-center text-sm font-bold uppercase text-[#002055]">{category.name}</h3>
            </HardLink>
          ))}
        </div>
      </section>

      <ProductSection eyebrow="Seleção Shopping China" title="Oportunidades únicas" description="Produtos escolhidos com preços sincronizados com o catálogo atual." products={liveSections.opportunities} />

      <section className="my-8 bg-[#002055] text-white">
        <div className="page-shell grid items-center gap-6 py-10 md:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-[#fcb92c] p-3 text-[#002055]"><Sparkles size={26} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#fcb92c]">Novidade</p><h2 className="mt-1 text-2xl font-bold md:text-3xl">O catálogo completo agora tem uma nova casa</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Mais de 27 mil produtos organizados para pesquisa e navegação, com preços apresentados em reais.</p></div>
          </div>
          <HardLink href="/categoria/eletronicos" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-[#002055] hover:bg-[#fcb92c]">Explorar catálogo <ArrowRight size={18} /></HardLink>
        </div>
      </section>

      <ProductSection eyebrow="Acabaram de chegar" title="Novos produtos" description="Lançamentos e novidades que entraram recentemente no catálogo." products={liveSections.releases} />
      <ProductSection eyebrow="Vale a pena conferir" title="Ofertas em destaque" description="Encontre produtos selecionados com preços atualizados." products={liveSections.offers} />
    </main>
  );
}

type LiveProduct = { id: string; slug: string; title: string; image_url: string; price_cents: number; availability: string };

async function getLiveHomeSections() {
  const fallback = {
    opportunities: homeData.sections.opportunities as ProductCardData[],
    releases: homeData.sections.releases as ProductCardData[],
    offers: homeData.sections.offers as ProductCardData[],
  };
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) return fallback;
  const all = [...fallback.opportunities, ...fallback.releases, ...fallback.offers];
  const ids = [...new Set(all.map((product) => product.id))];
  try {
    const params = new URLSearchParams({
      select: "id,slug,title,image_url,price_cents,availability",
      id: `in.(${ids.join(",")})`,
    });
    const headers = { apikey: key, Authorization: `Bearer ${key}` };
    const [response, newestResponse] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/merchant_products?${params}`, { headers, next: { revalidate: 900 } }),
      fetch(`${supabaseUrl}/rest/v1/merchant_products?select=id,slug,title,image_url,price_cents,availability&availability=eq.in_stock&price_cents=gt.0&order=updated_at.desc&limit=36`, { headers, next: { revalidate: 900 } }),
    ]);
    if (!response.ok || !newestResponse.ok) return withoutStalePrices(fallback);
    const products = await response.json() as LiveProduct[];
    const newest = await newestResponse.json() as LiveProduct[];
    const liveById = new Map(products.map((product) => [product.id, product]));
    const used = new Set<string>();
    const toCard = (product: LiveProduct): ProductCardData => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      image: product.image_url,
      price: formatBrl(product.price_cents),
      oldPrice: null,
      discount: null,
    });
    const hydrate = (items: ProductCardData[]) => {
      const cards = items.flatMap((fallbackProduct) => {
      const product = liveById.get(fallbackProduct.id);
        if (!product || used.has(product.id)) return [];
        used.add(product.id);
        return [toCard(product)];
      });
      for (const product of newest) {
        if (cards.length >= items.length) break;
        if (used.has(product.id)) continue;
        used.add(product.id);
        cards.push(toCard(product));
      }
      return cards;
    };
    return { opportunities: hydrate(fallback.opportunities), releases: hydrate(fallback.releases), offers: hydrate(fallback.offers) };
  } catch {
    return withoutStalePrices(fallback);
  }
}

function withoutStalePrices(sections: { opportunities: ProductCardData[]; releases: ProductCardData[]; offers: ProductCardData[] }) {
  const clean = (items: ProductCardData[]) => items.map((product) => ({ ...product, price: null, oldPrice: null, discount: null }));
  return { opportunities: clean(sections.opportunities), releases: clean(sections.releases), offers: clean(sections.offers) };
}

function formatBrl(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function TrustItem({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center justify-center gap-3 px-4 py-4 text-[#002055] [&_svg]:shrink-0 [&_svg]:text-[#bd0811]"><span>{icon}</span><div><p className="text-sm font-bold">{title}</p><p className="text-xs text-slate-500">{text}</p></div></div>;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="text-center"><p className="text-xs font-bold uppercase tracking-[.22em] text-[#bd0811]">{eyebrow}</p><h2 className="mt-2 text-2xl font-bold text-[#002055] md:text-3xl">{title}</h2><p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500">{description}</p></div>;
}

function ProductSection({ eyebrow, title, description, products }: { eyebrow: string; title: string; description: string; products: ProductCardData[] }) {
  if (!products.length) return null;
  return <section className="page-shell py-12"><SectionHeading eyebrow={eyebrow} title={title} description={description} /><div className="product-row mt-7">{products.slice(0, 12).map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
