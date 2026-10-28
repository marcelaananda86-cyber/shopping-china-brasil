import type { Metadata } from "next";
import { BadgeCheck, Headphones, MapPin, PackageCheck, ShieldCheck, Truck } from "lucide-react";
import { HardLink } from "@/components/hard-link";
import { STORE } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Sobre a Shopping China Brasil",
  description: "Conheça a operação, os canais oficiais e o compromisso da Shopping China Brasil com produtos originais e entrega transparente.",
  alternates: { canonical: "/sobre" },
};

export default function AboutPage() {
  return <main className="page-shell py-10 md:py-14">
    <section className="overflow-hidden rounded-[32px] bg-[#002055] px-6 py-10 text-white md:px-12 md:py-14">
      <p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Quem somos</p>
      <h1 className="mt-3 max-w-4xl text-3xl font-bold leading-tight md:text-5xl">Tradição Shopping China com atendimento e entrega para o Brasil</h1>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-white/75 md:text-base">A Shopping China Brasil apresenta em reais o catálogo da operação Shopping China Importados de Ciudad del Este. A loja é operada pela {STORE.legalName}, com preço, estoque, frete e prazo informados antes do pagamento.</p>
    </section>
    <section className="mt-7 grid gap-4 md:grid-cols-3">
      <Card icon={<BadgeCheck />} title="Produtos originais" text="Catálogo de marcas reconhecidas, com código, imagens e especificações de cada item." />
      <Card icon={<PackageCheck />} title="Preço transparente" text="Valores exibidos em reais e total completo apresentado antes da confirmação do PIX." />
      <Card icon={<Truck />} title="Entrega no Brasil" text="Frete calculado pelo estado e entrega estimada em até 20 dias após o pagamento." />
    </section>
    <section className="mt-7 grid gap-7 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-2 md:p-10">
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Identificação da empresa</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">{STORE.legalName}</h2><div className="mt-5 space-y-3 text-sm leading-6 text-slate-600"><p className="flex gap-3"><MapPin className="mt-0.5 shrink-0 text-[#bd0811]" size={19} />{STORE.address.streetAddress}, {STORE.address.addressLocality}, Paraguai.</p><p className="flex gap-3"><Headphones className="mt-0.5 shrink-0 text-[#bd0811]" size={19} />{STORE.email}<br />{STORE.phone}<br />WhatsApp {STORE.whatsapp}</p></div></div>
      <div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Compromisso com o cliente</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">Compra clara do início ao pós-venda</h2><p className="mt-4 text-sm leading-7 text-slate-600">Publicamos políticas de entrega, pagamento, privacidade, devolução e reembolso. O cliente pode comprar sem criar uma conta e recebe um pedido identificado para acompanhar o atendimento.</p><HardLink href="/contato" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#002055] px-6 py-3 text-sm font-bold text-white hover:bg-[#bd0811]"><ShieldCheck size={18} /> Falar com o atendimento</HardLink></div>
    </section>
  </main>;
}

function Card({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#eef3fa] text-[#bd0811]">{icon}</span><h2 className="mt-5 text-lg font-bold text-[#002055]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></article>;
}
