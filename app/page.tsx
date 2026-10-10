import Link from "next/link";
import { ArrowRight, BadgeCheck, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import homeData from "@/public/data/home.json";
import { HeroCarousel } from "@/components/hero-carousel";
import { ProductCard } from "@/components/product-card";
import type { ProductCardData } from "@/lib/shopping-china";

export default function Home() {
  return (
    <main>
      <HeroCarousel banners={homeData.banners} />

      <section className="border-b border-slate-200 bg-white">
        <div className="page-shell grid grid-cols-1 divide-y divide-slate-200 py-2 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <TrustItem icon={<BadgeCheck />} title="Produtos originais" text="As melhores marcas do mundo" />
          <TrustItem icon={<MapPin />} title="Ciudad del Este" text="Estoque da filial principal" />
          <TrustItem icon={<ShieldCheck />} title="Compra segura" text="Nova operação Brasil em preparação" />
        </div>
      </section>

      <section className="page-shell py-12">
        <SectionHeading eyebrow="Explore" title="Setores mais visitados" description="Encontre rapidamente os departamentos preferidos dos nossos clientes." />
        <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {homeData.popular.map((category, index) => (
            <Link key={category.slug} href={`/categoria/${category.slug}`} className="group overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <div className="aspect-square overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/assets/shopping-china/popular-${index + 1}.webp`} alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <h3 className="px-2 py-3 text-center text-sm font-bold uppercase text-[#002055]">{category.name}</h3>
            </Link>
          ))}
        </div>
      </section>

      <ProductSection eyebrow="Seleção Shopping China" title="Oportunidades únicas" description="Produtos escolhidos com condições especiais por tempo limitado." products={homeData.sections.opportunities as ProductCardData[]} />

      <section className="my-8 bg-[#002055] text-white">
        <div className="page-shell grid items-center gap-6 py-10 md:grid-cols-[1fr_auto]">
          <div className="flex items-start gap-4">
            <span className="rounded-2xl bg-[#fcb92c] p-3 text-[#002055]"><Sparkles size={26} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#fcb92c]">Novidade</p><h2 className="mt-1 text-2xl font-bold md:text-3xl">O catálogo completo agora tem uma nova casa</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/70">Mais de 27 mil produtos organizados para pesquisa e navegação, com preços apresentados em reais.</p></div>
          </div>
          <Link href="/categoria/eletronicos" className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-[#002055] hover:bg-[#fcb92c]">Explorar catálogo <ArrowRight size={18} /></Link>
        </div>
      </section>

      <ProductSection eyebrow="Acabaram de chegar" title="Novos produtos" description="Lançamentos e novidades que entraram recentemente no catálogo." products={homeData.sections.releases as ProductCardData[]} />
      <ProductSection eyebrow="Vale a pena conferir" title="Ofertas em destaque" description="Encontre produtos selecionados com preços especiais." products={homeData.sections.offers as ProductCardData[]} />
    </main>
  );
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
