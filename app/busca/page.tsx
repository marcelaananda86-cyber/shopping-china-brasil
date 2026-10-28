import type { Metadata } from "next";
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from "lucide-react";
import catalogData from "@/public/data/catalog-index.json";
import { HardLink } from "@/components/hard-link";
import { ProductCard } from "@/components/product-card";
import { getSearchPage, type ProductCardData, type SearchSort } from "@/lib/shopping-china";

type CatalogItem = { id: string; slug: string; title: string };
type SearchParams = { q?: string; page?: string; sort?: string };

const PAGE_SIZE = 24;
const SORT_OPTIONS: Array<{ value: SearchSort; label: string }> = [
  { value: "relevance", label: "Mais relevantes" },
  { value: "newest", label: "Novidades" },
  { value: "name-asc", label: "Nome: A–Z" },
  { value: "name-desc", label: "Nome: Z–A" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];

export const metadata: Metadata = { title: "Busca de produtos", robots: { index: false, follow: true } };
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const normalizedQuery = normalize(query);
  const currentPage = Math.max(1, Number(params.page) || 1);
  const requestedSort = params.sort as SearchSort;
  const sort = SORT_OPTIONS.some((option) => option.value === requestedSort) ? requestedSort : "relevance";

  const remote = normalizedQuery.length >= 2 ? await getSearchPage(query, currentPage, sort) : null;
  const fallback = !remote && normalizedQuery.length >= 2 ? getFallbackResults(query, currentPage) : null;
  const products = remote?.products ?? fallback?.products ?? [];
  const total = remote?.total ?? fallback?.total ?? 0;
  const lastPage = remote?.lastPage ?? fallback?.lastPage ?? 1;
  const firstResult = total ? (currentPage - 1) * PAGE_SIZE + 1 : 0;
  const lastResult = products.length ? Math.min(total, firstResult + products.length - 1) : 0;

  return (
    <main className="page-shell py-8 md:py-12">
      <div className="rounded-3xl bg-[#002055] px-5 py-8 text-white shadow-[0_18px_55px_rgba(0,32,85,.18)] md:px-10 md:py-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Catálogo completo</p>
        <h1 className="mt-2 text-3xl font-bold md:text-4xl">Encontre seu produto</h1>
        <form action="/busca" method="get" className="relative mt-6 max-w-4xl">
          <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#002055]" />
          <input name="q" defaultValue={query} autoFocus placeholder="Digite marca, modelo ou produto" className="h-14 w-full rounded-full bg-white pl-12 pr-32 text-sm text-[#002055] outline-none ring-[#fcb92c] focus:ring-3" />
          <button type="submit" className="absolute right-2 top-2 h-10 rounded-full bg-[#bd0811] px-6 text-sm font-bold text-white transition hover:bg-[#97070e]">Buscar</button>
        </form>
      </div>

      <section className="mt-8">
        {normalizedQuery.length < 2 ? <Empty title="Digite pelo menos dois caracteres" text="Pesquise pelo nome do produto, marca ou modelo." /> : null}
        {normalizedQuery.length >= 2 && total === 0 ? <Empty title="Nenhum produto encontrado" text={`Não encontramos resultados para “${query}”. Tente usar palavras mais curtas.`} /> : null}

        {total > 0 ? (
          <>
            <div className="border-b-3 border-[#bd0811] pb-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Resultados da busca</p>
                  <h2 className="mt-1 text-2xl font-bold text-[#002055]">Produtos para “{query}”</h2>
                  <p className="mt-1 text-sm text-slate-500">Mostrando {firstResult}–{lastResult} de {total.toLocaleString("pt-BR")} produtos</p>
                </div>
                <form action="/busca" method="get" className="flex items-center gap-2">
                  <input type="hidden" name="q" value={query} />
                  <SlidersHorizontal size={17} className="text-[#002055]" />
                  <label htmlFor="search-sort" className="sr-only">Ordenar resultados</label>
                  <select id="search-sort" name="sort" defaultValue={sort} className="h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-[#002055] outline-none focus:border-[#002055]">
                    {SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                  <button type="submit" className="h-11 rounded-xl bg-[#002055] px-4 text-sm font-bold text-white transition hover:bg-[#bd0811]">Ordenar</button>
                </form>
              </div>
            </div>

            {fallback ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs text-amber-800">O catálogo ao vivo está temporariamente indisponível. Exibindo resultados do índice local.</p> : null}

            <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {products.map((product) => <ProductCard key={product.id} product={product} />)}
            </div>

            {lastPage > 1 ? <Pagination query={query} sort={sort} currentPage={currentPage} lastPage={lastPage} /> : null}
          </>
        ) : null}
      </section>
    </main>
  );
}

function Pagination({ query, sort, currentPage, lastPage }: { query: string; sort: SearchSort; currentPage: number; lastPage: number }) {
  const pages = Array.from(new Set([1, currentPage - 1, currentPage, currentPage + 1, lastPage])).filter((page) => page >= 1 && page <= lastPage).sort((a, b) => a - b);
  const href = (page: number) => `/busca?${new URLSearchParams({ q: query, sort, page: String(page) }).toString()}`;

  return (
    <nav aria-label="Paginação dos resultados" className="mt-10 flex flex-wrap items-center justify-center gap-2">
      <PageLink href={href(currentPage - 1)} disabled={currentPage <= 1} label="Anterior" icon={<ChevronLeft size={17} />} />
      {pages.map((page, index) => (
        <span key={page} className="contents">
          {index > 0 && page - pages[index - 1] > 1 ? <span className="px-1 text-slate-400">…</span> : null}
          <HardLink href={href(page)} aria-current={page === currentPage ? "page" : undefined} className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold ${page === currentPage ? "bg-[#002055] text-white" : "border border-slate-300 bg-white text-[#002055] hover:border-[#002055]"}`}>{page}</HardLink>
        </span>
      ))}
      <PageLink href={href(currentPage + 1)} disabled={currentPage >= lastPage} label="Próxima" icon={<ChevronRight size={17} />} after />
    </nav>
  );
}

function PageLink({ href, disabled, label, icon, after = false }: { href: string; disabled: boolean; label: string; icon: React.ReactNode; after?: boolean }) {
  const content = <>{after ? null : icon}<span>{label}</span>{after ? icon : null}</>;
  const classes = "inline-flex h-10 items-center gap-1 rounded-full border px-4 text-sm font-semibold";
  return disabled ? <span className={`${classes} border-slate-200 text-slate-300`}>{content}</span> : <HardLink href={href} className={`${classes} border-slate-300 bg-white text-[#002055] hover:border-[#002055]`}>{content}</HardLink>;
}

function getFallbackResults(query: string, page: number) {
  const normalizedQuery = normalize(query);
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);
  const matches = (catalogData as CatalogItem[])
    .map((item) => ({ item, score: score(normalize(item.title), normalizedQuery, terms) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title, "pt-BR"));
  const products: ProductCardData[] = matches.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(({ item }) => ({
    ...item,
    image: "/assets/shopping-china/logo-mark.webp",
    price: null,
  }));
  return { products, total: matches.length, lastPage: Math.max(1, Math.ceil(matches.length / PAGE_SIZE)) };
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center"><Search className="mx-auto text-slate-300" size={38} /><h2 className="mt-4 text-xl font-bold text-[#002055]">{title}</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}

function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function score(title: string, query: string, terms: string[]) { if (!terms.every((term) => title.includes(term))) return 0; if (title === query) return 1000; if (title.startsWith(query)) return 800; if (title.split(/\s+/).some((word) => word.startsWith(query))) return 600; return 300 + terms.reduce((total, term) => total + (title.split(/\s+/).some((word) => word.startsWith(term)) ? 25 : 5), 0); }
