import { notFound } from "next/navigation";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { HardLink } from "@/components/hard-link";
import { getCategoryPage } from "@/lib/shopping-china";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params, searchParams }: { params: Promise<{ slug: string[] }>; searchParams: Promise<{ page?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const currentPage = Math.max(1, Number(query.page) || 1);
  const path = slug.join("/");
  const category = await getCategoryPage(path, currentPage);
  if (!category) notFound();

  return (
    <main className="page-shell py-8 md:py-12">
      <nav className="mb-5 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
        <HardLink href="/" className="hover:text-[#bd0811]">Início</HardLink>
        {slug.map((part, index) => <span key={part} className="flex items-center gap-2"><span>/</span><HardLink href={`/categoria/${slug.slice(0, index + 1).join("/")}`} className="hover:text-[#bd0811]">{part.replaceAll("-", " ")}</HardLink></span>)}
      </nav>
      <div className="flex flex-col justify-between gap-4 border-b-3 border-[#bd0811] pb-5 sm:flex-row sm:items-end">
        <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Departamento</p><h1 className="mt-1 text-3xl font-bold uppercase text-[#002055]">{category.title}</h1><p className="mt-2 text-sm text-slate-500">{category.total.toLocaleString("pt-BR")} produtos encontrados</p></div>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-[#002055]"><SlidersHorizontal size={17} /> Ordenar: relevância</button>
      </div>

      {category.products.length ? (
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">{category.products.map((product) => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <div className="my-20 rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center"><h2 className="text-xl font-bold text-[#002055]">Nenhum produto nesta página</h2><p className="mt-2 text-sm text-slate-500">Tente voltar uma página ou escolha outra categoria.</p></div>
      )}

      <div className="mt-10 flex items-center justify-center gap-3">
        <PageButton disabled={currentPage <= 1} href={`/categoria/${path}?page=${currentPage - 1}`} label="Anterior" icon={<ChevronLeft size={18} />} />
        <span className="rounded-full bg-[#002055] px-5 py-2 text-sm font-bold text-white">Página {currentPage} de {category.lastPage}</span>
        <PageButton disabled={currentPage >= category.lastPage} href={`/categoria/${path}?page=${currentPage + 1}`} label="Próxima" icon={<ChevronRight size={18} />} after />
      </div>
    </main>
  );
}

function PageButton({ disabled, href, label, icon, after = false }: { disabled: boolean; href: string; label: string; icon: React.ReactNode; after?: boolean }) {
  const content = <>{after ? null : icon}<span>{label}</span>{after ? icon : null}</>;
  return disabled ? <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-300">{content}</span> : <HardLink href={href} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#002055] hover:border-[#002055]">{content}</HardLink>;
}
