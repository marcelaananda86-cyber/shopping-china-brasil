import { notFound } from "next/navigation";
import { BadgeCheck, Clock3, MapPin, ShieldCheck, Truck } from "lucide-react";
import { ProductGallery } from "@/components/product-gallery";
import { HardLink } from "@/components/hard-link";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { getProductDetail } from "@/lib/shopping-china";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();
  const numericPrice = product.price ? Number(product.price.replace(/[^\d,]/g, "").replace(",", ".")) : null;
  const available = /InStock|in_stock/i.test(product.availability);
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    sku: product.id,
    ...(product.gtin ? { gtin: product.gtin } : {}),
    ...(product.mpn ? { mpn: product.mpn } : {}),
    ...(product.brand ? { brand: { "@type": "Brand", name: product.brand } } : {}),
    image: product.images,
    description: product.description,
    offers: numericPrice === null ? undefined : {
      "@type": "Offer",
      price: numericPrice.toFixed(2),
      priceCurrency: "BRL",
      availability: available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      shippingDetails: { "@type": "OfferShippingDetails", deliveryTime: { "@type": "ShippingDeliveryTime", transitTime: { "@type": "QuantitativeValue", minValue: 1, maxValue: 20, unitCode: "DAY" } } },
      hasMerchantReturnPolicy: { "@type": "MerchantReturnPolicy", applicableCountry: "BR", returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow", merchantReturnDays: 7, returnMethod: "https://schema.org/ReturnByMail" },
    },
  };
  return (
    <main className="page-shell py-6 md:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema).replace(/</g, "\\u003c") }} />
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <HardLink href="/" className="hover:text-[#bd0811]">Início</HardLink>
        {product.breadcrumbs.map((item) => <span key={item.path} className="flex items-center gap-2"><span>/</span><HardLink href={`/categoria/${item.path}`} className="hover:text-[#bd0811]">{item.name}</HardLink></span>)}
      </nav>
      <div className="grid min-w-0 items-start gap-7 lg:grid-cols-[minmax(0,1.15fr)_minmax(390px,.85fr)] xl:gap-12">
        <div className="min-w-0 lg:sticky lg:top-36"><ProductGallery images={product.images} title={product.title} /></div>
        <section className="min-w-0 overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_16px_50px_rgba(15,23,42,.06)] md:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Código {product.id}</p>
            {product.brand ? <div className="flex items-center gap-2 text-xs text-slate-500"><span>Marca:</span>{product.brandImage ? <img src={product.brandImage} alt={product.brand} className="h-9 max-w-28 rounded-lg border border-slate-200 object-contain p-1" /> : <strong className="text-[#002055]">{product.brand}</strong>}</div> : null}
          </div>
          <h1 className="mt-4 break-words text-2xl font-bold uppercase leading-[1.18] text-[#002055] md:text-3xl">{product.title}</h1>
          <div className="mt-6 border-y border-slate-200 py-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Preço do produto</p>
            <p className="mt-1 text-4xl font-bold tracking-tight text-[#002055]">{product.price ?? "Consulte"}</p>
            <p className="mt-2 flex items-center gap-2 text-xs text-slate-500"><Clock3 size={14} /> Valor sincronizado com o catálogo atual.</p>
          </div>
          <ProductPurchasePanel product={{ id: product.id, slug: product.slug, title: product.title, image: product.images[0] ?? "", price: product.price, availability: product.availability }} />
        </section>
      </div>

      <section className="mt-8 grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 md:p-7">
        <Info icon={<BadgeCheck />} title="Produto original" text="Procedência Shopping China" />
        <Info icon={<MapPin />} title="Estoque verificado" text="Filial Ciudad del Este" />
        <Info icon={<ShieldCheck />} title="Compra protegida" text="Carrinho seguro e persistente" />
        <Info icon={<Truck />} title="Entrega no Brasil" text="Receba em até 20 dias" />
      </section>

      {product.description || product.specifications.length ? <section className="mt-8 grid gap-10 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10 lg:grid-cols-[1.15fr_.85fr]">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Sobre o produto</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">Descrição</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{product.description || "Consulte a equipe para mais informações."}</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Detalhes técnicos</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">Especificações</h2>{product.specifications.length ? <ul className="mt-4 divide-y divide-slate-100 text-sm text-slate-600">{product.specifications.map((item) => <li key={item} className="py-3">{item}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">Consulte a equipe para mais informações.</p>}</div>
      </section> : null}
    </main>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-[#002055] [&_svg]:shrink-0 [&_svg]:text-[#bd0811]"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">{icon}</span><div><p className="text-sm font-bold">{title}</p><p className="text-xs leading-5 text-slate-500">{text}</p></div></div>;
}
