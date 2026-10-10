"use client";

import { useEffect, useState } from "react";
import { CircleDollarSign, ExternalLink, FileCheck2, Landmark, Scale, ShieldCheck, X } from "lucide-react";
import { OPERATIONAL_LIMIT_USD, PIX_BATCH_MAX_BRL, REFERENCE_USD_BRL } from "@/lib/commerce-rules";
import { formatMoney } from "@/components/cart-provider";

export function ImportRulesBanner() {
  const [open, setOpen] = useState(false);

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
        <div className="page-shell flex min-h-11 items-center justify-center gap-2 py-2 text-center text-xs sm:text-sm">
          <ShieldCheck size={17} className="shrink-0 text-[#bd0811]" />
          <span><strong>Compras para o Brasil:</strong> limite operacional de US$ {OPERATIONAL_LIMIT_USD} por pedido e opção de PIX em parcelas.</span>
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
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex gap-3"><Scale className="mt-0.5 shrink-0 text-[#bd0811]" /><div><h3 className="font-bold text-[#002055]">Primeiro, uma distinção importante</h3><p className="mt-2 text-sm leading-6 text-slate-600">A cota de <strong>US$ 500</strong> prevista pela Receita Federal refere-se à bagagem acompanhada de viajantes que entram no Brasil por via terrestre, fluvial ou lacustre. Ela não é, por si só, o limite geral de uma compra enviada por e-commerce. Encomendas internacionais possuem regras próprias, declaração aduaneira e tributação.</p></div></div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <RuleCard icon={<Landmark />} title="Limite operacional da loja" text={`Nesta fase, cada pedido automático fica limitado a US$ ${OPERATIONAL_LIMIT_USD}. A conversão exibida no carrinho usa uma cotação referencial de ${formatMoney(REFERENCE_USD_BRL)} por dólar e será confirmada no fechamento.`} />
              <RuleCard icon={<CircleDollarSign />} title="PIX em parcelas" text={`O pagamento pode ser organizado em parcelas PIX de até ${formatMoney(PIX_BATCH_MAX_BRL)}. Isso facilita o pagamento, mas não muda o preço total da compra, da nota ou da declaração aduaneira.`} />
              <RuleCard icon={<FileCheck2 />} title="Compra acima do limite" text="O pedido segue para análise assistida. Verificamos a modalidade de importação, os tributos e a documentação correta antes de confirmar a venda." />
            </div>

            <div className="mt-6 rounded-2xl bg-[#002055] p-5 text-white sm:p-6">
              <h3 className="font-bold">Exemplo simples</h3>
              <p className="mt-2 text-sm leading-6 text-white/75">Um produto de <strong className="text-white">R$ 6.000</strong> pode, se aprovado, ser pago em <strong className="text-white">3 PIX de R$ 2.000</strong>. Para fins comerciais, fiscais e aduaneiros ele continua sendo uma única compra de R$ 6.000. O parcelamento não transforma o produto em três compras menores.</p>
            </div>

            <div className="mt-6 flex gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm leading-6 text-slate-600"><ShieldCheck className="mt-0.5 shrink-0 text-[#bd0811]" /><p><strong className="text-[#002055]">Não realizamos fracionamento artificial.</strong> Uma mesma compra não será dividida em encomendas para ocultar valor, evitar tributos ou contornar controles. Pedidos acima do limite são tratados pela modalidade aduaneira adequada.</p></div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5">
              <p className="max-w-2xl text-xs leading-5 text-slate-500">As condições finais dependem do produto, do destino, do frete, da cotação aplicável e da modalidade de importação. O valor total é informado antes da confirmação.</p>
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
