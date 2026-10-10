import type { Metadata } from "next";
import { Database, LockKeyhole, PackageSearch, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn, signUp } from "./actions";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar ou criar conta" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ modo?: string; erro?: string; sucesso?: string }> }) {
  const params = await searchParams;
  const configured = hasSupabaseConfig();
  if (configured) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect("/conta");
  }
  const signup = params.modo === "cadastro";

  return <main className="page-shell py-10 md:py-16"><section className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,.1)] lg:grid-cols-[.9fr_1.1fr]">
    <div className="bg-[#002055] p-7 text-white md:p-10"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Shopping China Brasil</p><h1 className="mt-3 text-3xl font-bold leading-tight">Sua conta, pedidos e entregas em um só lugar</h1><div className="mt-8 grid gap-5 text-sm text-white/75"><Feature icon={<PackageSearch />} title="Acompanhe seus pedidos" text="Consulte status, valores e código de rastreamento." /><Feature icon={<Database />} title="Histórico centralizado" text="Compras protegidas no banco Supabase, disponíveis em qualquer dispositivo." /><Feature icon={<LockKeyhole />} title="Acesso seguro" text="Senha protegida pelo Supabase Auth e acesso aos pedidos controlado por RLS." /></div></div>
    <div className="flex flex-col justify-center p-7 md:p-12"><span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811]"><UserRound size={26} /></span><p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Área do cliente</p><h2 className="mt-2 text-2xl font-bold text-[#002055]">{signup ? "Criar minha conta" : "Entrar na minha conta"}</h2>
      {!configured ? <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Integração preparada.</strong> Falta conectar a URL e a chave publicável do projeto Supabase para habilitar o cadastro.</div> : <form action={signup ? signUp : signIn} className="mt-6 grid gap-4">{signup ? <label className="text-sm font-semibold text-[#002055]">Nome completo<input name="name" autoComplete="name" required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label> : null}<label className="text-sm font-semibold text-[#002055]">E-mail<input name="email" type="email" autoComplete="email" required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label><label className="text-sm font-semibold text-[#002055]">Senha<input name="password" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label>{params.erro ? <p className="rounded-xl bg-red-50 p-3 text-xs leading-5 text-[#bd0811]">{params.erro}</p> : null}{params.sucesso ? <p className="rounded-xl bg-green-50 p-3 text-xs leading-5 text-[#168c45]">{params.sucesso}</p> : null}<button className="mt-1 rounded-full bg-[#bd0811] px-6 py-4 text-sm font-bold text-white hover:bg-[#97070e]">{signup ? "Criar conta" : "Entrar"}</button></form>}
      <a href={signup ? "/entrar" : "/entrar?modo=cadastro"} className="mt-5 text-center text-sm font-semibold text-[#002055] hover:text-[#bd0811]">{signup ? "Já tenho conta" : "Ainda não tenho conta"}</a><p className="mt-4 text-center text-xs leading-5 text-slate-400">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
    </div>
  </section></main>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="flex gap-3"><span className="mt-0.5 text-[#fcb92c]">{icon}</span><div><strong className="block text-white">{title}</strong><span className="mt-1 block leading-5">{text}</span></div></div>; }
