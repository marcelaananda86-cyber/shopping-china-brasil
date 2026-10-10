"use client";

import { useState } from "react";
import { Check, CircleDollarSign, CreditCard, Minus, PackageCheck, Plus, Scale, ShieldCheck, ShoppingCart, Truck } from "lucide-react";
import { priceToNumber, useCart } from "@/components/cart-provider";
import { estimateUsd, OPERATIONAL_LIMIT_BRL, OPERATIONAL_LIMIT_USD } from "@/lib/commerce-rules";

type PurchaseProduct = {
  id: string;
  slug: string;
  title: string;
  image: string;
  price: string | null;
  availability: string;
};

export function ProductPurchasePanel({ product }: { product: PurchaseProduct }) {
  const { addItem } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [cep, setCep] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const available = !product.availability || /InStock/i.test(product.availability);
  const numericPrice = priceToNumber(product.price);
  const itemAboveOperationalLimit = numericPrice !== null && numericPrice > OPERATIONAL_LIMIT_BRL;

  function calculateDelivery(event: React.FormEvent) {
    event.preventDefault();
    const digits = cep.replace(/\D/g, "");
    setDeliveryMessage(digits.length === 8 ? "CEP válido. Prazo e valor serão confirmados na finalização." : "Informe um CEP válido com 8 números.");
  }

  function buyNow() {
    addItem(product, quantity, false);
    window.location.assign("/carrinho");
  }

  return (
    <div className="mt-7">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#168c45]">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-50"><Check size={15} /></span>
        {available ? "Disponível para compra" : "Consulte a disponibilidade"}
      </div>

      {itemAboveOperationalLimit ? <div className="mt-4 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-[#002055]"><CircleDollarSign size={19} className="mt-0.5 shrink-0" /><p><strong>Compra autorizada com PIX em lotes.</strong> Este produto ultrapassa a faixa padrão de US$ {OPERATIONAL_LIMIT_USD} e deve ser comprado sozinho, com uma unidade por pedido. O carrinho montará o plano de pagamento e manterá o valor integral na documentação.</p></div> : null}

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-slate-500">Quantidade</label>
          <div className="inline-flex h-12 items-center overflow-hidden rounded-full border border-slate-300 bg-white">
            <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="h-full px-4 text-slate-500 hover:bg-slate-50" aria-label="Diminuir quantidade"><Minus size={17} /></button>
            <span className="min-w-10 text-center font-bold text-[#002055]">{quantity}</span>
            <button type="button" onClick={() => setQuantity((value) => Math.min(99, value + 1))} className="h-full px-4 text-slate-500 hover:bg-slate-50" aria-label="Aumentar quantidade"><Plus size={17} /></button>
          </div>
        </div>
        <button type="button" onClick={() => addItem(product, quantity)} className="flex h-12 flex-1 items-center justify-center gap-2 rounded-full border-2 border-[#bd0811] px-5 text-sm font-bold text-[#bd0811] transition hover:bg-red-50"><ShoppingCart size={19} /> Adicionar</button>
      </div>
      <button type="button" onClick={buyNow} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#bd0811] px-6 py-4 text-base font-bold text-white shadow-lg shadow-red-950/15 transition hover:-translate-y-0.5 hover:bg-[#97070e] hover:shadow-xl"><CreditCard size={20} /> Comprar agora</button>

      <form onSubmit={calculateDelivery} className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <label htmlFor="product-cep" className="flex items-center gap-2 text-sm font-bold text-[#002055]"><Truck size={18} className="text-[#bd0811]" /> Calcule a entrega para o Brasil</label>
        <div className="mt-3 flex gap-2">
          <input id="product-cep" inputMode="numeric" value={cep} onChange={(event) => setCep(formatCep(event.target.value))} placeholder="00000-000" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-[#002055] focus:ring-2 focus:ring-[#002055]/10" />
          <button type="submit" className="rounded-xl bg-[#002055] px-5 text-sm font-bold text-white hover:bg-[#123b73]">Calcular</button>
        </div>
        {deliveryMessage ? <p className={`mt-2 text-xs ${deliveryMessage.startsWith("CEP válido") ? "text-[#168c45]" : "text-[#bd0811]"}`}>{deliveryMessage}</p> : null}
      </form>

      <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600">
        <Benefit icon={<ShieldCheck size={18} />} title="Compra protegida" text="Ambiente seguro" />
        <Benefit icon={<PackageCheck size={18} />} title="Produto original" text="Procedência garantida" />
      </div>
      {numericPrice !== null ? <p className="mt-4 flex items-center gap-2 text-[11px] leading-4 text-slate-500"><Scale size={15} className="shrink-0 text-[#bd0811]" /> Valor estimado de US$ {estimateUsd(numericPrice).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}; conversão e encargos confirmados no fechamento.</p> : null}
    </div>
  );
}

function Benefit({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3 text-[#002055]"><span className="text-[#bd0811]">{icon}</span><span><strong className="block text-xs">{title}</strong><span className="text-[11px] text-slate-500">{text}</span></span></div>;
}

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
