import type { Metadata } from "next";
import { CircleUserRound, Clock3, LogOut, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { redirect } from "next/navigation";
import { signOut } from "@/app/entrar/actions";
import { HardLink } from "@/components/hard-link";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minha conta" };

const statusLabels: Record<string, string> = { pending_payment: "Aguardando pagamento", paid: "Pagamento confirmado", processing: "Em preparação", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado", refunded: "Reembolsado" };

export default async function AccountPage() {
  if (!hasSupabaseConfig()) redirect("/entrar");
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");
  const { data: orders } = await supabase.from("orders").select("id,status,total_cents,shipping_deadline_days,tracking_code,created_at,order_items(id,title,quantity,unit_price_cents)").order("created_at", { ascending: false }).limit(50);
  const name = String(user.user_metadata?.name ?? user.email ?? "Cliente");

  return <main className="page-shell py-8 md:py-12"><section className="flex flex-col justify-between gap-5 rounded-3xl bg-[#002055] p-6 text-white md:flex-row md:items-center md:p-8"><div className="flex items-center gap-4"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10"><CircleUserRound size={28} /></span><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[#fcb92c]">Minha conta</p><h1 className="mt-1 text-2xl font-bold">{name}</h1><p className="mt-1 text-sm text-white/65">{user.email}</p></div></div><form action={signOut}><button className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-bold hover:bg-white hover:text-[#002055]"><LogOut size={17} /> Sair</button></form></section>
    <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_300px]"><section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:p-7"><p className="text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Histórico</p><h2 className="mt-1 text-2xl font-bold text-[#002055]">Meus pedidos</h2>{orders?.length ? <div className="mt-6 grid gap-4">{orders.map((order) => <article key={order.id} className="rounded-2xl border border-slate-200 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Pedido {order.id}</p><p className="mt-1 text-sm text-slate-500">Realizado em {new Date(order.created_at).toLocaleDateString("pt-BR")}</p></div><span className="rounded-full bg-[#eef3fa] px-3 py-1.5 text-xs font-bold text-[#002055]">{statusLabels[order.status] ?? order.status}</span></div><div className="mt-4 grid gap-2 border-y border-slate-100 py-4">{order.order_items?.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span className="line-clamp-1 text-slate-600">{item.quantity}x {item.title}</span><strong className="shrink-0 text-[#002055]">{money(item.unit_price_cents * item.quantity)}</strong></div>)}</div><div className="mt-4 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">Total <strong className="ml-2 text-lg text-[#002055]">{money(order.total_cents)}</strong></span>{order.tracking_code ? <span className="inline-flex items-center gap-2 text-xs font-bold text-[#168c45]"><Truck size={16} /> Rastreio: {order.tracking_code}</span> : <span className="inline-flex items-center gap-2 text-xs text-slate-500"><Clock3 size={16} /> Entrega em até {order.shipping_deadline_days} dias</span>}</div></article>)}</div> : <div className="mt-8 rounded-2xl bg-slate-50 px-6 py-12 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm"><ShoppingBag size={28} /></span><h3 className="mt-4 font-bold text-[#002055]">Você ainda não possui pedidos</h3><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">As compras confirmadas com esta conta aparecerão aqui com status e rastreamento.</p><HardLink href="/" className="mt-5 inline-flex rounded-full bg-[#bd0811] px-5 py-3 text-sm font-bold text-white">Começar a comprar</HardLink></div>}</section>
      <aside className="space-y-4"><Info icon={<PackageCheck />} title="Entrega em até 20 dias" text="Prazo contado após a confirmação do pagamento." /><Info icon={<Truck />} title="Acompanhamento" text="O rastreio aparece no pedido assim que for emitido." /><HardLink href="#contato" className="block rounded-2xl border border-slate-200 bg-white p-5 text-sm font-bold text-[#002055] shadow-sm">Falar com o atendimento →</HardLink></aside></div>
  </main>;
}

function money(cents: number) { return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100); }
function Info({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811]">{icon}</span><h3 className="mt-4 font-bold text-[#002055]">{title}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{text}</p></div>; }
