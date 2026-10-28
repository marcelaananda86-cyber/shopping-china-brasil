"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Menu, Search, ShoppingBag, UserRound, X } from "lucide-react";
import type { CategoryData, ProductCardData } from "@/lib/shopping-china";
import { HardLink } from "@/components/hard-link";
import { useCart } from "@/components/cart-provider";

export function SiteHeader({ categories }: { categories: CategoryData[] }) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ProductCardData[]>([]);
  const [resultTotal, setResultTotal] = useState(0);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchBox = useRef<HTMLFormElement>(null);
  const { itemCount, openCart } = useCart();

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (searchBox.current && !searchBox.current.contains(event.target as Node)) setSearchOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const query = search.trim();
    if (normalize(query).length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(false);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(query)}&limit=6`, { signal: controller.signal });
        if (!response.ok) throw new Error("Falha ao consultar catálogo");
        const data = await response.json() as { products: ProductCardData[]; total: number };
        setResults(data.products);
        setResultTotal(data.total);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setResultTotal(0);
          setSearchError(true);
        }
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [search]);

  function updateSearch(value: string) {
    setSearch(value);
    setSearchOpen(true);
    setActiveResult(-1);
    if (normalize(value.trim()).length < 2) {
      setResults([]);
      setResultTotal(0);
      setSearchLoading(false);
      setSearchError(false);
    }
  }

  function submitSearch(event: React.FormEvent) {
    event.preventDefault();
    if (activeResult >= 0 && results[activeResult]) {
      router.push(`/produto/${results[activeResult].slug}`);
      setSearchOpen(false);
      return;
    }
    const query = search.trim();
    if (normalize(query).length >= 2) {
      router.push(`/busca?q=${encodeURIComponent(query)}`);
      setSearchOpen(false);
    }
  }

  function handleSearchKey(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSearchOpen(true);
      setActiveResult((value) => Math.min(results.length - 1, value + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveResult((value) => Math.max(-1, value - 1));
    } else if (event.key === "Escape") {
      setSearchOpen(false);
      setActiveResult(-1);
    }
  }

  return (
    <>
      <header className="sticky top-0 z-50 shadow-[0_4px_18px_rgba(0,32,85,.12)]">
        <div className="bg-[#001a46] text-white">
          <div className="page-shell flex h-[72px] items-center gap-3 md:gap-6">
            <button type="button" className="icon-button" onClick={() => setMenuOpen(true)} aria-label="Abrir categorias"><Menu size={24} /></button>
            <HardLink href="/" className="flex shrink-0 items-center gap-2" aria-label="Shopping China Brasil — início">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/shopping-china/logo-mark.webp" alt="" className="h-10 w-12 object-contain brightness-0 invert" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/shopping-china/logo-word.webp" alt="Shopping China" className="hidden h-9 w-auto object-contain brightness-0 invert sm:block" />
            </HardLink>
            <form ref={searchBox} onSubmit={submitSearch} className="relative mx-auto min-w-0 w-full max-w-3xl" role="search">
              <button type="submit" className="absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-[#002055] hover:bg-slate-100" aria-label="Pesquisar"><Search size={20} /></button>
              <input
                type="search"
                value={search}
                onFocus={() => setSearchOpen(true)}
                onChange={(event) => updateSearch(event.target.value)}
                onKeyDown={handleSearchKey}
                placeholder="O que você está procurando?"
                aria-label="Pesquisar produtos"
                aria-expanded={searchOpen && normalize(search).length >= 2}
                aria-controls="catalog-search-results"
                aria-activedescendant={activeResult >= 0 ? `search-result-${activeResult}` : undefined}
                autoComplete="off"
                className="h-11 w-full rounded-full border-0 bg-white pl-12 pr-11 text-sm text-[#002055] outline-none ring-[#fcb92c] placeholder:text-slate-400 focus:ring-3"
              />
              {search ? <button type="button" onClick={() => updateSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-[#002055]" aria-label="Limpar pesquisa"><X size={17} /></button> : null}
              {searchOpen && normalize(search).length >= 2 ? (
                <div id="catalog-search-results" className="absolute left-0 right-0 top-[calc(100%+10px)] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl" role="listbox">
                  {searchLoading ? <p className="p-5 text-sm text-slate-500">Buscando produtos…</p> : null}
                  {searchError ? <p className="p-5 text-sm text-[#bd0811]">Não foi possível carregar a busca. Tente novamente.</p> : null}
                  {!searchLoading && !searchError && results.length === 0 ? <p className="p-5 text-sm text-slate-500">Nenhum produto encontrado.</p> : null}
                  {results.map((item, index) => (
                    <HardLink id={`search-result-${index}`} key={item.id} href={`/produto/${item.slug}`} onMouseEnter={() => setActiveResult(index)} onClick={() => setSearchOpen(false)} role="option" aria-selected={index === activeResult} className={`flex items-center gap-3 border-b border-slate-100 px-4 py-3 ${index === activeResult ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-xl border border-slate-100 bg-white object-contain p-1" />
                      <span className="min-w-0 flex-1"><span className="line-clamp-2 text-xs font-semibold uppercase leading-4 text-[#002055]">{item.title}</span><span className="mt-1 block text-[11px] text-slate-400">Código {item.id}</span></span>
                      <span className="shrink-0 text-xs font-bold text-[#bd0811]">{item.price ?? "Consulte"}</span>
                    </HardLink>
                  ))}
                  {results.length ? <HardLink href={`/busca?q=${encodeURIComponent(search.trim())}`} onClick={() => setSearchOpen(false)} className="flex items-center justify-between bg-slate-50 px-5 py-3 text-xs font-bold text-[#002055] hover:bg-slate-100"><span>Ver todos os resultados</span><span className="text-slate-400">{resultTotal.toLocaleString("pt-BR")} produtos</span></HardLink> : null}
                </div>
              ) : null}
            </form>
            <div className="flex shrink-0 items-center gap-1 lg:gap-2">
              <HardLink href="/entrar" className="header-action"><UserRound size={20} /><span className="hidden lg:inline">Conta</span></HardLink>
              <button type="button" onClick={openCart} className="header-action relative" aria-label={`Abrir carrinho com ${itemCount} itens`}><ShoppingBag size={20} /><span className="hidden sm:inline">Carrinho</span>{itemCount > 0 ? <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fcb92c] px-1 text-[10px] font-bold text-[#002055]">{itemCount > 99 ? "99+" : itemCount}</span> : null}</button>
            </div>
          </div>
        </div>
        <nav className="hidden border-b border-slate-200 bg-white xl:block">
          <div className="page-shell flex h-11 items-center justify-between gap-3 overflow-hidden text-[13px] font-semibold uppercase text-[#002055]">
            {categories.slice(0, 9).map((category) => <HardLink key={category.slug} href={`/categoria/${category.slug}`} className="whitespace-nowrap hover:text-[#bd0811]">{category.name}</HardLink>)}
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
                    <HardLink href={`/categoria/${category.slug}`} onClick={() => setMenuOpen(false)} className="flex-1">{category.name}</HardLink>
                    <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="grid gap-1 px-4 pb-3">
                    {category.children.map((child) => <HardLink key={child.slug} href={`/categoria/${category.slug}/${child.slug}`} onClick={() => setMenuOpen(false)} className="rounded px-2 py-1.5 text-sm text-slate-600 hover:bg-white hover:text-[#bd0811]">{child.name}</HardLink>)}
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
