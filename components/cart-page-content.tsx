"use client";

import { Minus, Plus, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { formatMoney, priceToNumber, useCart } from "@/components/cart-provider";
import { HardLink } from "@/components/hard-link";

export function CartPageContent() {
  const { items, hydrated, subtotal, hasUnknownPrices, setQuantity, removeItem, clearCart } = useCart();

  if (!hydrated) return <div className="h-96 animate-pulse rounded-3xl bg-slate-100" />;
  if (!items.length) return (
    <div className="rounded-3xl border border-slate-200 bg-white px-6 py-20 text-center shadow-sm">
      <span className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ShoppingBag size={40} /></span>
      <h1 className="mt-6 text-3xl font-bold text-[#002055]">Seu carrinho está vazio</h1>
      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500">Encontre seus produtos no catálogo e use o botão “Adicionar” ou “Comprar agora”.</p>
      <HardLink href="/" className="mt-7 inline-flex rounded-full bg-[#002055] px-7 py-3.5 text-sm font-bold text-white hover:bg-[#bd0811]">Explorar produtos</HardLink>
    </div>
  );

  const whatsappMessage = encodeURIComponent([
    "Olá! Quero finalizar este pedido:",
    ...items.map((item) => `• ${item.quantity}x ${item.title} (${item.id}) — ${item.price ?? "consultar"}`),
    `Subtotal informado: ${formatMoney(subtotal)}`,
  ].join("\n"));

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1fr_390px]">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 md:px-7"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Revise seu pedido</p><h1 className="mt-1 text-2xl font-bold text-[#002055]">Carrinho de compras</h1></div><button type="button" onClick={clearCart} className="text-xs font-semibold text-slate-500 hover:text-[#bd0811]">Limpar carrinho</button></div>
        <div className="divide-y divide-slate-100 px-5 md:px-7">
          {items.map((item) => {
            const unitPrice = priceToNumber(item.price);
            return <article key={item.id} className="grid gap-4 py-6 sm:grid-cols-[120px_1fr_auto] sm:items-center">
              <HardLink href={`/produto/${item.slug}`} className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 p-2"><img src={item.image} alt={item.title} className="h-full w-full object-contain" /></HardLink>
              <div><p className="text-xs font-bold uppercase tracking-wide text-[#bd0811]">Código {item.id}</p><HardLink href={`/produto/${item.slug}`} className="mt-1 block max-w-xl font-semibold uppercase leading-6 text-[#002055] hover:text-[#bd0811]">{item.title}</HardLink><p className="mt-2 text-sm font-bold text-[#002055]">{item.price ?? "Preço sob consulta"}</p><button type="button" onClick={() => removeItem(item.id)} className="mt-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-[#bd0811]"><Trash2 size={14} /> Remover</button></div>
              <div className="flex items-center justify-between gap-4 sm:block sm:text-right">
                <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200"><button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="p-2.5 hover:bg-slate-50" aria-label="Diminuir"><Minus size={15} /></button><span className="min-w-9 text-center text-sm font-bold">{item.quantity}</span><button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="p-2.5 hover:bg-slate-50" aria-label="Aumentar"><Plus size={15} /></button></div>
                <p className="text-base font-bold text-[#002055] sm:mt-4">{unitPrice === null ? "Sob consulta" : formatMoney(unitPrice * item.quantity)}</p>
              </div>
            </article>;
          })}
        </div>
      </section>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,.07)] lg:sticky lg:top-36">
        <h2 className="text-xl font-bold text-[#002055]">Resumo do pedido</h2>
        <div className="mt-5 space-y-3 border-y border-slate-200 py-5 text-sm"><div className="flex justify-between text-slate-500"><span>Produtos</span><span>{formatMoney(subtotal)}</span></div><div className="flex justify-between text-slate-500"><span>Entrega</span><span>Calculada por CEP</span></div></div>
        <div className="flex items-end justify-between py-5"><span className="font-semibold text-[#002055]">Subtotal</span><span className="text-2xl font-bold text-[#002055]">{formatMoney(subtotal)}</span></div>
        {hasUnknownPrices ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs leading-5 text-[#bd0811]">Há itens com preço sob consulta; o valor final será confirmado pelo atendimento.</p> : null}
        <a href={`https://api.whatsapp.com/send?phone=595981701701&text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center rounded-full bg-[#bd0811] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-950/10 hover:bg-[#97070e]">Finalizar pedido</a>
        <HardLink href="/" className="mt-3 flex w-full items-center justify-center py-2 text-sm font-semibold text-[#002055] hover:text-[#bd0811]">Continuar comprando</HardLink>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5"><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={17} className="text-[#168c45]" /> Compra protegida e produtos originais</p><p className="flex items-center gap-2 text-xs text-slate-500"><Truck size={17} className="text-[#168c45]" /> Entrega nacional confirmada no atendimento</p></div>
      </aside>
    </div>
  );
}
