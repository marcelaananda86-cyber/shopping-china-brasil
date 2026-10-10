import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, Clock3, MapPin, MessageCircle, ShieldCheck } from "lucide-react";
import { ProductGallery } from "@/components/product-gallery";
import { getProductDetail } from "@/lib/shopping-china";

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductDetail(slug);
  if (!product) notFound();
  const whatsappText = encodeURIComponent(`Olá! Preciso de mais informações sobre este produto: *${product.id}* ${product.title}`);

  return (
    <main className="page-shell py-8 md:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <Link href="/" className="hover:text-[#bd0811]">Início</Link>
        {product.breadcrumbs.map((item) => <span key={item.path} className="flex items-center gap-2"><span>/</span><Link href={`/categoria/${item.path}`} className="hover:text-[#bd0811]">{item.name}</Link></span>)}
      </nav>
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <ProductGallery images={product.images} title={product.title} />
        <section className="flex flex-col">
          <p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Código {product.id}</p>
          <h1 className="mt-3 text-2xl font-bold uppercase leading-tight text-[#002055] md:text-4xl">{product.title}</h1>
          <div className="mt-7 border-y border-slate-200 py-6">
            <p className="text-xs uppercase tracking-wide text-slate-500">Preço no catálogo atual</p>
            <p className="mt-1 text-3xl font-bold text-[#002055]">{product.price ?? "Consulte"}</p>
            <p className="mt-2 text-xs text-slate-500">Preço sob o Regime de Turismo, sujeito a alteração e disponibilidade.</p>
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Info icon={<BadgeCheck />} title="Produto original" text="Procedência Shopping China" />
            <Info icon={<MapPin />} title="Estoque da filial" text="Ciudad del Este" />
            <Info icon={<ShieldCheck />} title="Compra protegida" text="Checkout Brasil em preparação" />
            <Info icon={<Clock3 />} title="Preço atualizado" text="Sincronizado com o catálogo" />
          </div>
          {product.brand ? <div className="mt-7 flex items-center gap-3"><span className="text-sm text-slate-500">Marca:</span>{product.brandImage ? <img src={product.brandImage} alt={product.brand} className="h-12 max-w-32 rounded-lg border border-slate-200 object-contain p-1" /> : <strong className="text-[#002055]">{product.brand}</strong>}</div> : null}
          <a href={`https://api.whatsapp.com/send?phone=595981701701&text=${whatsappText}`} target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-[#168c45] px-6 py-4 font-bold text-white shadow-lg shadow-green-900/10 hover:bg-[#11753a]"><MessageCircle size={21} /> Consultar pelo WhatsApp</a>
        </section>
      </div>

      {product.description || product.specifications.length ? <section className="mt-14 grid gap-8 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-10 lg:grid-cols-2">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Sobre o produto</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">Descrição</h2><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-600">{product.description || "Consulte a equipe para mais informações."}</p></div>
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Detalhes técnicos</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">Especificações</h2>{product.specifications.length ? <ul className="mt-4 divide-y divide-slate-100 text-sm text-slate-600">{product.specifications.map((item) => <li key={item} className="py-3">{item}</li>)}</ul> : <p className="mt-4 text-sm text-slate-500">Consulte a equipe para mais informações.</p>}</div>
      </section> : null}
    </main>
  );
}

function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3 text-[#002055] [&_svg]:shrink-0 [&_svg]:text-[#bd0811]"><span>{icon}</span><div><p className="text-sm font-bold">{title}</p><p className="text-xs text-slate-500">{text}</p></div></div>;
}
