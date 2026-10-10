import type { Metadata } from "next";
import { ArrowRight, Search } from "lucide-react";
import catalogData from "@/public/data/catalog-index.json";
import { HardLink } from "@/components/hard-link";

type CatalogItem = { id: string; slug: string; title: string };

export const metadata: Metadata = { title: "Busca de produtos" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = normalizedQuery.length >= 2
    ? (catalogData as CatalogItem[])
      .map((item) => ({ item, score: score(normalize(item.title), normalizedQuery, terms) }))
      .filter((result) => result.score > 0)
      .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "pt-BR"))
    : [];
  const visible = matches.slice(0, 60);

  return (
    <main className="page-shell py-8 md:py-12">
      <div className="rounded-3xl bg-[#002055] px-5 py-8 text-white md:px-10 md:py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Catálogo completo</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Encontre seu produto</h1>
        <form action="/busca" method="get" className="relative mt-6 max-w-3xl"><Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#002055]" /><input name="q" defaultValue={query} autoFocus placeholder="Digite marca, modelo ou produto" className="h-14 w-full rounded-full bg-white pl-12 pr-32 text-sm text-[#002055] outline-none ring-[#fcb92c] focus:ring-3" /><button type="submit" className="absolute right-2 top-2 h-10 rounded-full bg-[#bd0811] px-6 text-sm font-bold text-white hover:bg-[#97070e]">Buscar</button></form>
      </div>

      <section className="mt-8">
        {normalizedQuery.length < 2 ? <Empty title="Digite pelo menos dois caracteres" text="Pesquise pelo nome do produto, marca ou modelo." /> : null}
        {normalizedQuery.length >= 2 && matches.length === 0 ? <Empty title="Nenhum produto encontrado" text={`Não encontramos resultados para “${query}”. Tente usar palavras mais curtas.`} /> : null}
        {matches.length ? <><div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Resultados da busca</p><h2 className="mt-1 text-2xl font-bold text-[#002055]">{matches.length.toLocaleString("pt-BR")} produtos para “{query}”</h2></div>{matches.length > visible.length ? <p className="text-xs text-slate-500">Exibindo os 60 resultados mais relevantes</p> : null}</div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{visible.map(({ item }) => <HardLink key={item.id} href={`/produto/${item.slug}`} className="group flex min-h-28 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fb3cf] hover:shadow-lg"><div><p className="text-[11px] font-bold uppercase tracking-wide text-[#bd0811]">Código {item.id}</p><h3 className="mt-2 line-clamp-3 text-sm font-semibold uppercase leading-5 text-[#002055]">{item.title}</h3></div><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[#002055] transition group-hover:bg-[#002055] group-hover:text-white"><ArrowRight size={18} /></span></HardLink>)}</div></> : null}
      </section>
    </main>
  );
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto text-slate-300" size={38} /><h2 className="mt-4 text-xl font-bold text-[#002055]">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function score(title: string, query: string, terms: string[]) { if (!terms.every((term) => title.includes(term))) return 0; if (title === query) return 1000; if (title.startsWith(query)) return 800; if (title.split(/\s+/).some((word) => word.startsWith(query))) return 600; return 300 + terms.reduce((total, term) => total + (title.split(/\s+/).some((word) => word.startsWith(term)) ? 25 : 5), 0); }
