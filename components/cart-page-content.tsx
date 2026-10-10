"use client";

import { AlertTriangle, CheckCircle2, CircleDollarSign, Minus, Plus, Scale, ShieldCheck, ShoppingBag, Trash2, Truck } from "lucide-react";
import { formatMoney, priceToNumber, useCart } from "@/components/cart-provider";
import { HardLink } from "@/components/hard-link";
import { calculatePixBatches, estimateUsd, isHighValueOrderAllowed, OPERATIONAL_LIMIT_BRL, OPERATIONAL_LIMIT_USD, REFERENCE_USD_BRL } from "@/lib/commerce-rules";

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

  const estimatedUsd = estimateUsd(subtotal);
  const aboveOperationalLimit = subtotal > OPERATIONAL_LIMIT_BRL;
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const highValueOrderAllowed = isHighValueOrderAllowed(subtotal, itemCount);
  const limitProgress = Math.min(100, (subtotal / OPERATIONAL_LIMIT_BRL) * 100);
  const pixBatches = calculatePixBatches(subtotal);

  const whatsappMessage = encodeURIComponent([
    "Olá! Quero finalizar este pedido:",
    ...items.map((item) => `• ${item.quantity}x ${item.title} (${item.id}) — ${item.price ?? "consultar"}`),
    `Subtotal informado: ${formatMoney(subtotal)}`,
    `Estimativa referencial: US$ ${estimatedUsd.toFixed(2)}`,
    pixBatches.length > 1 ? `Sugestão de pagamento: ${pixBatches.length} PIX (${pixBatches.map(formatMoney).join(" + ")})` : "",
  ].join("\n"));

  return (
    <div className="grid items-start gap-7 lg:grid-cols-[1fr_390px]">
      <div className="space-y-5">
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Política de compra internacional</p><h2 className="mt-1 text-xl font-bold text-[#002055]">Limite operacional por pedido</h2></div>
          <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${!highValueOrderAllowed ? "bg-red-50 text-[#bd0811]" : aboveOperationalLimit ? "bg-blue-50 text-[#002055]" : "bg-green-50 text-[#168c45]"}`}>{!highValueOrderAllowed ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}{!highValueOrderAllowed ? "Separe os produtos" : aboveOperationalLimit ? "PIX em lotes habilitado" : "Pagamento único"}</span>
        </div>
        <div className="mt-5 flex items-end justify-between gap-3"><div><p className="text-2xl font-bold text-[#002055]">US$ {estimatedUsd.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p><p className="mt-1 text-xs text-slate-500">Estimativa com dólar referencial a {formatMoney(REFERENCE_USD_BRL)}</p></div><p className="text-right text-xs text-slate-500">Limite atual<br /><strong className="text-[#002055]">US$ {OPERATIONAL_LIMIT_USD}</strong></p></div>
        <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full transition-all ${aboveOperationalLimit ? "bg-[#002055]" : "bg-[#168c45]"}`} style={{ width: `${limitProgress}%` }} /></div>
        <p className={`mt-4 rounded-2xl p-4 text-xs leading-5 ${!highValueOrderAllowed ? "border border-red-200 bg-red-50 text-[#bd0811]" : aboveOperationalLimit ? "bg-blue-50 text-[#002055]" : "bg-slate-50 text-slate-600"}`}>{!highValueOrderAllowed ? <><strong>Este pedido ultrapassa US$ 500 e contém mais de uma unidade.</strong> Acima da cota, é permitido somente um produto por pedido. Remova os demais itens, finalize o primeiro e faça uma nova compra para o próximo produto.</> : aboveOperationalLimit ? <><strong>Este pedido ultrapassa a faixa padrão de US$ 500 e contém um único produto, portanto a compra está liberada.</strong> O pagamento será organizado em lotes de PIX conforme o plano abaixo, mantendo o valor total do pedido nos documentos comerciais, fiscais e aduaneiros.</> : <>Seu pedido está na faixa de pagamento único. A cotação e os encargos definitivos serão confirmados antes do pagamento.</>}</p>
      </section>

      {pixBatches.length > 1 && highValueOrderAllowed ? <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7">
        <div className="flex gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811]"><CircleDollarSign size={22} /></span><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[#bd0811]">Facilidade de pagamento</p><h2 className="mt-1 text-xl font-bold text-[#002055]">Plano sugerido de PIX</h2></div></div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{pixBatches.map((batch, index) => <div key={`${batch}-${index}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"><span className="text-xs font-semibold text-slate-500">PIX {index + 1} de {pixBatches.length}</span><strong className="text-sm text-[#002055]">{formatMoney(batch)}</strong></div>)}</div>
        <div className="mt-4 flex gap-2 rounded-2xl bg-[#eef3fa] p-4 text-xs leading-5 text-slate-600"><Scale size={18} className="mt-0.5 shrink-0 text-[#bd0811]" /><p><strong className="text-[#002055]">O PIX parcelado é apenas uma forma de pagamento.</strong> O pedido, a nota e a declaração mantêm o valor total de {formatMoney(subtotal)}.</p></div>
      </section> : null}
      </div>

      <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_16px_50px_rgba(15,23,42,.07)] lg:sticky lg:top-36">
        <h2 className="text-xl font-bold text-[#002055]">Resumo do pedido</h2>
        <div className="mt-5 space-y-3 border-y border-slate-200 py-5 text-sm"><div className="flex justify-between text-slate-500"><span>Produtos</span><span>{formatMoney(subtotal)}</span></div><div className="flex justify-between text-slate-500"><span>Entrega</span><span>Em até 20 dias</span></div></div>
        <div className="flex items-end justify-between py-5"><span className="font-semibold text-[#002055]">Subtotal</span><span className="text-2xl font-bold text-[#002055]">{formatMoney(subtotal)}</span></div>
        {hasUnknownPrices ? <p className="mb-4 rounded-xl bg-red-50 p-3 text-xs leading-5 text-[#bd0811]">Há itens com preço sob consulta; o valor final será confirmado pelo atendimento.</p> : null}
        {highValueOrderAllowed ? <a href={`https://api.whatsapp.com/send?phone=595981701701&text=${whatsappMessage}`} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center rounded-full bg-[#bd0811] px-6 py-4 text-center text-sm font-bold text-white shadow-lg shadow-red-950/10 hover:bg-[#97070e]">Finalizar pedido</a> : <><div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs leading-5 text-[#bd0811]"><strong>Não é possível finalizar este carrinho.</strong> Mantenha apenas uma unidade de um produto e faça pedidos separados para os demais.</div><button type="button" disabled className="flex w-full cursor-not-allowed items-center justify-center rounded-full bg-slate-300 px-6 py-4 text-center text-sm font-bold text-slate-600">Separe em pedidos individuais</button></>}
        <HardLink href="/" className="mt-3 flex w-full items-center justify-center py-2 text-sm font-semibold text-[#002055] hover:text-[#bd0811]">Continuar comprando</HardLink>
        <div className="mt-5 grid gap-3 border-t border-slate-100 pt-5"><p className="flex items-center gap-2 text-xs text-slate-500"><ShieldCheck size={17} className="text-[#168c45]" /> Compra protegida e produtos originais</p><p className="flex items-center gap-2 text-xs text-slate-500"><Truck size={17} className="text-[#168c45]" /> Entrega no Brasil em até 20 dias</p></div>
      </aside>
    </div>
  );
}
