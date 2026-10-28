import type { Metadata } from "next";
import { FileText, LockKeyhole, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { HardLink } from "@/components/hard-link";

export const metadata: Metadata = { title: "Políticas da loja", alternates: { canonical: "/politicas" } };
const policies = [
  ["/politicas/entrega", "Política de entrega", "Prazo de até 20 dias, rastreamento e recebimento.", <Truck key="truck" />],
  ["/politicas/trocas-e-devolucoes", "Trocas, devoluções e reembolsos", "Arrependimento, defeitos, métodos e prazos.", <RotateCcw key="return" />],
  ["/politicas/privacidade", "Política de privacidade", "Como os dados são coletados, usados e protegidos.", <LockKeyhole key="lock" />],
  ["/politicas/pagamentos", "Pagamentos e segurança", "PIX em lotes, valores e confirmação do pedido.", <ShieldCheck key="shield" />],
  ["/termos", "Termos de uso e compra", "Condições gerais aplicáveis à utilização da loja.", <FileText key="file" />],
] as const;

export default function PoliciesPage() { return <main className="page-shell py-10 md:py-14"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bd0811]">Transparência</p><h1 className="mt-2 text-3xl font-bold text-[#002055]">Políticas da loja</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Informações públicas e acessíveis sobre compra, entrega, devolução, pagamento e uso de dados.</p><div className="mt-8 grid gap-4 md:grid-cols-2">{policies.map(([href, title, text, icon]) => <HardLink key={href} href={href} className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#bd0811] hover:shadow-lg"><span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811]">{icon}</span><h2 className="mt-5 text-lg font-bold text-[#002055] group-hover:text-[#bd0811]">{title}</h2><p className="mt-2 text-sm leading-6 text-slate-500">{text}</p></HardLink>)}</div></main>; }
