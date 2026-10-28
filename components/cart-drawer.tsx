"use client";

import { useEffect } from "react";
import { AlertTriangle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { formatMoney, priceToNumber, useCart } from "@/components/cart-provider";
import { HardLink } from "@/components/hard-link";
import { estimateUsd, isHighValueOrderAllowed, operationalLimitBrl, OPERATIONAL_LIMIT_USD } from "@/lib/commerce-rules";
import { useExchangeRate } from "@/components/exchange-rate-provider";

export function CartDrawer() {
  const { items, drawerOpen, closeCart, itemCount, subtotal, hasUnknownPrices, removeItem, setQuantity } = useCart();
  const exchangeRate = useExchangeRate();

  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && closeCart();
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [drawerOpen, closeCart]);

  if (!drawerOpen) return null;
  const operationalLimit = operationalLimitBrl(exchangeRate.usdBrl);
  const aboveOperationalLimit = subtotal > operationalLimit;
  const highValueOrderAllowed = isHighValueOrderAllowed(subtotal, itemCount, exchangeRate.usdBrl);
  const progress = Math.min(100, (subtotal / operationalLimit) * 100);

  return (
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Seu carrinho">
      <button type="button" onClick={closeCart} className="absolute inset-0 bg-[#001a46]/65 backdrop-blur-sm" aria-label="Fechar carrinho" />
      <aside className="absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl sm:w-[min(94vw,470px)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
          <div className="flex items-center gap-3 text-[#002055]">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3fa]"><ShoppingBag size={21} /></span>
            <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Seu pedido</p><h2 className="text-xl font-bold">Carrinho <span className="text-sm font-normal text-slate-500">({itemCount})</span></h2></div>
          </div>
          <button type="button" onClick={closeCart} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-[#002055]" aria-label="Fechar"><X /></button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <span className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-slate-400"><ShoppingBag size={34} /></span>
            <h3 className="mt-5 text-xl font-bold text-[#002055]">Seu carrinho está vazio</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Explore o catálogo e adicione os produtos que deseja comprar.</p>
            <button type="button" onClick={closeCart} className="mt-6 rounded-full bg-[#002055] px-6 py-3 text-sm font-bold text-white hover:bg-[#bd0811]">Continuar comprando</button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-2">
              {items.map((item) => {
                const unitPrice = priceToNumber(item.price);
                return (
                  <article key={item.id} className="grid grid-cols-[82px_1fr] gap-4 border-b border-slate-100 py-5">
                    <HardLink href={`/produto/${item.slug}`} onClick={closeCart} className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image} alt="" className="h-full w-full object-contain" />
                    </HardLink>
                    <div className="min-w-0">
                      <HardLink href={`/produto/${item.slug}`} onClick={closeCart} className="line-clamp-2 text-sm font-semibold uppercase leading-5 text-[#002055] hover:text-[#bd0811]">{item.title}</HardLink>
                      <p className="mt-1 text-sm font-bold text-[#002055]">{unitPrice === null ? "Preço sob consulta" : formatMoney(unitPrice * item.quantity)}</p>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center overflow-hidden rounded-full border border-slate-200">
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity - 1)} className="p-2 text-slate-500 hover:bg-slate-50" aria-label="Diminuir quantidade"><Minus size={14} /></button>
                          <span className="min-w-8 text-center text-sm font-bold text-[#002055]">{item.quantity}</span>
                          <button type="button" onClick={() => setQuantity(item.id, item.quantity + 1)} className="p-2 text-slate-500 hover:bg-slate-50" aria-label="Aumentar quantidade"><Plus size={14} /></button>
                        </div>
                        <button type="button" onClick={() => removeItem(item.id)} className="p-2 text-slate-400 hover:text-[#bd0811]" aria-label={`Remover ${item.title}`}><Trash2 size={17} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="border-t border-slate-200 bg-slate-50 px-5 py-5 [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]">
              <div className="flex items-end justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-slate-500">Subtotal</p><p className="mt-1 text-2xl font-bold text-[#002055]">{formatMoney(subtotal)}</p></div><p className="pb-1 text-right text-xs text-slate-500">Entrega em<br />até 20 dias</p></div>
              <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3">
                <div className="flex items-center justify-between gap-3 text-[11px]"><span className="font-semibold text-[#002055]">US$ {estimateUsd(subtotal, exchangeRate.usdBrl).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} estimados</span><span className="text-slate-500">Limite US$ {OPERATIONAL_LIMIT_USD}</span></div>
                <p className="mt-1 text-[10px] text-slate-400">Câmbio Shopping China: {formatMoney(exchangeRate.usdBrl)}</p>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${aboveOperationalLimit ? "bg-[#002055]" : "bg-[#168c45]"}`} style={{ width: `${progress}%` }} /></div>
                {aboveOperationalLimit ? <p className={`mt-2 text-[11px] leading-4 ${highValueOrderAllowed ? "text-[#002055]" : "text-[#bd0811]"}`}>{highValueOrderAllowed ? "Pagamento em lotes disponível para este produto único." : "Acima de US$ 500, deixe somente uma unidade de um produto neste pedido."}</p> : null}
              </div>
              {!highValueOrderAllowed ? <div className="mt-3 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-[#bd0811]"><AlertTriangle size={17} className="mt-0.5 shrink-0" /><p><strong>Separe sua compra.</strong> Finalize um produto por vez e crie outro pedido para o próximo item.</p></div> : null}
              {hasUnknownPrices ? <p className="mt-2 text-xs text-[#bd0811]">Alguns itens dependem de confirmação de preço.</p> : null}
              <HardLink href="/carrinho" onClick={closeCart} className="mt-5 flex w-full items-center justify-center rounded-full bg-[#bd0811] px-6 py-4 text-sm font-bold text-white shadow-lg shadow-red-950/10 hover:bg-[#97070e]">Revisar e finalizar pedido</HardLink>
              <button type="button" onClick={closeCart} className="mt-2 w-full py-2 text-sm font-semibold text-[#002055] hover:text-[#bd0811]">Continuar comprando</button>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
