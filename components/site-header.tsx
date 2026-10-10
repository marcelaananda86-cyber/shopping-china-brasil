"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import type { CategoryData } from "@/lib/shopping-china";

type CatalogItem = { id: string; slug: string; title: string };

export function SiteHeader({ categories }: { categories: CategoryData[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [catalog, setCatalog] = useState<CatalogItem[] | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (searchBox.current && !searchBox.current.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  async function loadCatalog() {
    if (catalog) return;
    const response = await fetch("/data/catalog-index.json");
    setCatalog(await response.json());
  }

  const results = useMemo(() => {
    const query = normalize(search.trim());
    if (!catalog || query.length < 2) return [];
    return catalog.filter((item) => normalize(item.title).includes(query)).slice(0, 8);
  }, [catalog, search]);

  return (
    <>
      <header className="sticky top-0 z-50 shadow-[0_4px_18px_rgba(0,32,85,.12)]">
        <div className="bg-[#001a46] text-white">
          <div className="page-shell flex h-[72px] items-center gap-3 md:gap-6">
            <button type="button" className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir categorias"><Menu size={24} /></button>
            <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Shopping China Brasil — início">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/shopping-china/logo-mark.webp" alt="" className="h-10 w-12 object-contain brightness-0 invert" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/shopping-china/logo-word.webp" alt="Shopping China" className="hidden h-9 w-auto object-contain brightness-0 invert sm:block" />
            </Link>
            <div ref={searchBox} className="relative mx-auto min-w-0 w-full max-w-3xl">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#002055]" size={20} />
              <input
                type="search"
                value={search}
                onFocus={() => { setSearchOpen(true); void loadCatalog(); }}
                onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); void loadCatalog(); }}
                placeholder="O que você está procurando?"
                className="h-11 w-full rounded-full border-0 bg-white pl-12 pr-4 text-sm text-[#002055] outline-none ring-[#fcb92c] placeholder:text-slate-400 focus:ring-3"
              />
              {searchOpen && search.length >= 2 ? (
                <div className="absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl">
                  {catalog === null ? <p className="p-5 text-sm text-slate-500">Carregando catálogo…</p> : null}
                  {catalog && results.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum produto encontrado.</p> : null}
                  {results.map((item) => (
                    <Link key={item.id} href={`/produto/${item.slug}`} onClick={() => setSearchOpen(false)} className="block border-b border-slate-100 px-5 py-3 text-sm font-medium text-[#002055] last:border-0 hover:bg-slate-50">{item.title}</Link>
                  ))}
                  {results.length ? <div className="bg-slate-50 px-5 py-2 text-xs text-slate-500">Pesquisa em 27.134 produtos espelhados</div> : null}
                </div>
              ) : null}
            </div>
            <div className="hidden shrink-0 items-center gap-2 lg:flex">
              <Link href="#contato" className="header-action"><UserRound size={20} /><span>Ajuda</span></Link>
              <button type="button" className="header-action opacity-60" aria-label="Carrinho em breve" title="Carrinho será ativado na próxima etapa"><ShoppingBag size={20} /><span>Carrinho</span></button>
            </div>
          </div>
        </div>
        <nav className="hidden border-b border-slate-200 bg-white xl:block">
          <div className="page-shell flex h-11 items-center justify-between gap-3 overflow-hidden text-[13px] font-semibold uppercase text-[#002055]">
            {categories.slice(0, 9).map((category) => <Link key={category.slug} href={`/categoria/${category.slug}`} className="whitespace-nowrap hover:text-[#bd0811]">{category.name}</Link>)}
            <button type="button" onClick={() => setMenuOpen(true)} className="flex items-center gap-1 whitespace-nowrap text-[#bd0811]">Todas <ChevronDown size={15} /></button>
          </div>
        </nav>
      </header>

      {menuOpen ? (
        <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label="Todas as categorias">
          <button className="absolute inset-0 bg-[#001a46]/65 backdrop-blur-sm" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <aside className="absolute inset-y-0 left-0 w-[min(92vw,520px)] overflow-y-auto bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-[#002055] px-6 py-5 text-white">
              <div><p className="text-xs uppercase tracking-[.2em] text-[#fcb92c]">Shopping China</p><h2 className="text-xl font-bold">Todas as categorias</h2></div>
              <button onClick={() => setMenuOpen(false)} className="rounded-full p-2 hover:bg-white/10" aria-label="Fechar"><X /></button>
            </div>
            <div className="grid gap-1 p-4 sm:grid-cols-2">
              {categories.map((category) => (
                <details key={category.slug} className="group rounded-xl border border-transparent open:border-slate-200 open:bg-slate-50">
                  <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-3 font-semibold text-[#002055] hover:bg-slate-50">
                    {category.icon ? <img src={category.icon} alt="" className="h-7 w-7 rounded-full border border-slate-200 object-contain" /> : null}
                    <Link href={`/categoria/${category.slug}`} onClick={() => setMenuOpen(false)} className="flex-1">{category.name}</Link>
                    <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-1 px-4 pb-3">
                    {category.children.map((child) => <Link key={child.slug} href={`/categoria/${category.slug}/${child.slug}`} onClick={() => setMenuOpen(false)} className="rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-white hover:text-[#bd0811]">{child.name}</Link>)}
                  </div>
                </details>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
