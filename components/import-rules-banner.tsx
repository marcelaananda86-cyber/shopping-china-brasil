"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ExternalLink, FileCheck2, Landmark, Scale, ShieldCheck, X } from "lucide-react";
import { OPERATIONAL_LIMIT_USD, PIX_BATCH_MAX_BRL } from "@/lib/commerce-rules";
import { formatMoney } from "@/components/cart-provider";
import { useExchangeRate } from "@/components/exchange-rate-provider";

export function ImportRulesBanner() {
  const [open, setOpen] = useState(false);
  const exchangeRate = useExchangeRate();

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", close);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", close);
    };
  }, [open]);

  return (
    <>
      <div className="border-b border-amber-200 bg-[#fff7df] text-[#002055]">
        <div className="page-shell flex min-h-10 items-center justify-center gap-2 py-1.5 text-center text-[11px] leading-4 sm:min-h-11 sm:py-2 sm:text-sm">
          <ShieldCheck size={17} className="shrink-0 text-[#bd0811]" />
          <span className="sm:hidden"><strong>Compras para o Brasil:</strong> veja limites e condições.</span>
          <span className="hidden sm:inline"><strong>Compras para o Brasil:</strong> até US$ {OPERATIONAL_LIMIT_USD} por pedido; acima da cota, somente 1 produto com PIX em lotes.</span>
          <button type="button" onClick={() => setOpen(true)} className="shrink-0 font-bold text-[#bd0811] underline decoration-[#bd0811]/30 underline-offset-4 hover:decoration-[#bd0811]">Entenda</button>
        </div>
      </div>

      {open ? <div className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="import-rules-title">
        <button type="button" onClick={() => setOpen(false)} className="absolute inset-0 bg-[#001a46]/75 backdrop-blur-sm" aria-label="Fechar aviso" />
        <section className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-5 sm:px-8">
            <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Transparência na compra internacional</p><h2 id="import-rules-title" className="mt-1 text-2xl font-bold text-[#002055]">Como funciona o limite e o pagamento</h2></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-full border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" aria-label="Fechar"><X /></button>
          </div>

          <div className="px-5 py-6 sm:px-8 sm:py-8">
            <div className="rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex gap-3"><Scale className="mt-0.5 shrink-0 text-[#168c45]" /><div><h3 className="font-bold text-[#002055]">Operação autorizada para vendas ao Brasil</h3><p className="mt-2 text-sm leading-6 text-slate-600">A operação Shopping China Brasil segue a autorização judicial e fiscal informada pela empresa. A faixa padrão é de <strong>US$ 500 por pedido</strong>. Acima dessa cota, a compra é permitida somente quando o pedido contém <strong>uma unidade de um único produto</strong>, com pagamento organizado em lotes de PIX.</p></div></div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <RuleCard icon={<Landmark />} title="Faixa padrão do pedido" text={`Pedidos de até US$ ${OPERATIONAL_LIMIT_USD} seguem com pagamento único. A conversão para reais utiliza a cotação comercial do dólar vigente no dia, atualizada automaticamente${exchangeRate.fallback ? ". Em caso de indisponibilidade, exibimos temporariamente a última cotação registrada" : ""}.`} />
              <RuleCard icon={<CircleDollarSign />} title="PIX em parcelas" text={`O pagamento pode ser organizado em parcelas PIX de até ${formatMoney(PIX_BATCH_MAX_BRL)}. Isso facilita o pagamento, mas não muda o preço total da compra, da nota ou da declaração aduaneira.`} />
              <RuleCard icon={<FileCheck2 />} title="Um produto por pedido" text="Acima de US$ 500, o carrinho deve conter somente uma unidade de um produto. Para comprar outro item, finalize-o em um novo pedido separado." />
            </div>

            <div className="mt-6 rounded-2xl bg-[#002055] p-5 text-white sm:p-6">
              <h3 className="font-bold">Exemplo simples</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">Um iPhone de <strong className="text-white">R$ 6.000</strong>, sozinho no carrinho, pode ser pago em <strong className="text-white">3 PIX de R$ 2.000</strong>. Um iPhone e um PS5 juntos no mesmo pedido não são permitidos acima da cota: cada produto deve ser finalizado em uma compra separada.</p>
            </div>

            <div className="mt-6 flex gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 shrink-0 text-[#002055]" /><p><strong className="text-[#002055]">Compra integralmente documentada.</strong> Mesmo quando o cliente paga em vários PIX, o sistema mantém o valor total do produto e do pedido nos registros comerciais, fiscais e aduaneiros.</p></div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className="max-w-2xl text-xs leading-5 text-slate-500">A quantidade e o valor de cada PIX são apresentados no carrinho. Frete, cotação e encargos definitivos são informados antes da confirmação.</p>
              <div className="flex flex-wrap gap-3">
                <a href="https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/manuais/remessas-postal-e-expressa/preciso-pagar-impostos-nas-compras-internacionais/quais-sao-os-impostos-devidos" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#002055] hover:text-[#bd0811]">Regras de encomendas <ExternalLink size={14} /></a>
                <a href="https://www.gov.br/receitafederal/pt-br/assuntos/aduana-e-comercio-exterior/viagens-internacionais/guia-do-viajante" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-[#002055] hover:text-[#bd0811]">Guia do viajante <ExternalLink size={14} /></a>
              </div>
            </div>
          </div>
        </section>
      </div> : null}
    </>
  );
}

function RuleCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811] [&_svg]:h-5 [&_svg]:w-5">{icon}</span><h3 className="mt-4 font-bold text-[#002055]">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></article>;
}
