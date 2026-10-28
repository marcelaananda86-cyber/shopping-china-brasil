import type { Metadata } from "next";
import { Database, LockKeyhole, PackageSearch, UserRound } from "lucide-react";
import { redirect } from "next/navigation";
import { signIn, signInWithGoogle, signUp } from "./actions";
import { createSupabaseServerClient, hasSupabaseConfig, isGoogleAuthEnabled } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-navigation";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar ou criar conta" };

type SignInSearchParams = {
  modo?: string;
  erro?: string;
  sucesso?: string;
  aviso?: string;
  next?: string;
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<SignInSearchParams> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const configured = hasSupabaseConfig();
  const googleEnabled = configured ? await isGoogleAuthEnabled() : false;
  if (configured) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(next);
  }
  const signup = params.modo === "cadastro";
  const switchHref = signup
    ? `/entrar?next=${encodeURIComponent(next)}`
    : `/entrar?modo=cadastro&next=${encodeURIComponent(next)}`;

  return <main className="page-shell py-10 md:py-16">
    <section className="mx-auto grid max-w-5xl overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,.1)] lg:grid-cols-[.9fr_1.1fr]">
      <div className="bg-[#002055] p-7 text-white md:p-10">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#fcb92c]">Shopping China Brasil</p>
        <h1 className="mt-3 text-3xl font-bold leading-tight">Sua conta, pedidos e entregas em um só lugar</h1>
        <div className="mt-8 grid gap-5 text-sm text-white/75">
          <Feature icon={<PackageSearch />} title="Acompanhe seus pedidos" text="Consulte status, valores e código de rastreamento." />
          <Feature icon={<Database />} title="Histórico de compras" text="Acesse seus pedidos anteriores com segurança em qualquer dispositivo." />
          <Feature icon={<LockKeyhole />} title="Compra somente com conta" text="A autenticação é obrigatória antes do checkout para proteger seus dados e seu pedido." />
        </div>
      </div>

      <div className="flex flex-col justify-center p-7 md:p-12">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef3fa] text-[#bd0811]"><UserRound size={26} /></span>
        <p className="mt-6 text-xs font-bold uppercase tracking-[.18em] text-[#bd0811]">Área do cliente</p>
        <h2 className="mt-2 text-2xl font-bold text-[#002055]">{signup ? "Criar minha conta" : "Entrar na minha conta"}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">{signup ? "Cadastre-se gratuitamente para comprar e acompanhar seus pedidos." : "Acesse sua conta para continuar sua compra com segurança."}</p>

        {params.aviso ? <p className="mt-5 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-[#002055]"><strong>Conta necessária.</strong> {params.aviso}</p> : null}
        {params.erro ? <p className="mt-5 rounded-xl bg-red-50 p-3 text-xs leading-5 text-[#bd0811]">{params.erro}</p> : null}
        {params.sucesso ? <p className="mt-5 rounded-xl bg-green-50 p-3 text-xs leading-5 text-[#168c45]">{params.sucesso}</p> : null}

        {configured ? <>
          {googleEnabled ? <form action={signInWithGoogle} className="mt-6">
              <input type="hidden" name="next" value={next} />
              <button type="submit" className="flex h-13 w-full items-center justify-center gap-3 rounded-full border border-slate-300 bg-white px-6 text-sm font-bold text-[#002055] shadow-sm transition hover:border-slate-400 hover:bg-slate-50"><GoogleIcon /> Continuar com Google</button>
            </form> : <div className="mt-6">
              <button type="button" disabled className="flex h-13 w-full cursor-not-allowed items-center justify-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-6 text-sm font-bold text-slate-400"><GoogleIcon /> Continuar com Google</button>
              <p className="mt-2 text-center text-[11px] leading-5 text-slate-400">Esta opção de acesso estará disponível em breve.</p>
            </div>}
          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.12em] text-slate-400"><span className="h-px flex-1 bg-slate-200" /><span>ou use seu e-mail</span><span className="h-px flex-1 bg-slate-200" /></div>
          <form action={signup ? signUp : signIn} className="grid gap-4">
            <input type="hidden" name="next" value={next} />
            {signup ? <label className="text-sm font-semibold text-[#002055]">Nome completo<input name="name" autoComplete="name" required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label> : null}
            <label className="text-sm font-semibold text-[#002055]">E-mail<input name="email" type="email" autoComplete="email" required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label>
            <label className="text-sm font-semibold text-[#002055]">Senha<input name="password" type="password" minLength={8} autoComplete={signup ? "new-password" : "current-password"} required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label>
            {signup ? <label className="text-sm font-semibold text-[#002055]">Confirmar senha<input name="passwordConfirmation" type="password" minLength={8} autoComplete="new-password" required className="mt-2 h-12 w-full rounded-xl border border-slate-300 px-4 font-normal outline-none focus:border-[#002055]" /></label> : null}
            <button className="mt-1 rounded-full bg-[#bd0811] px-6 py-4 text-sm font-bold text-white hover:bg-[#97070e]">{signup ? "Criar conta e continuar" : "Entrar e continuar"}</button>
          </form>
        </> : <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><strong>Cadastro temporariamente indisponível.</strong> Estamos finalizando esta área. Tente novamente em alguns instantes.</div>}

        <a href={switchHref} className="mt-5 text-center text-sm font-semibold text-[#002055] hover:text-[#bd0811]">{signup ? "Já tenho conta" : "Ainda não tenho conta — criar agora"}</a>
        <p className="mt-4 text-center text-xs leading-5 text-slate-400">Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.</p>
      </div>
    </section>
  </main>;
}

function Feature({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="flex gap-3"><span className="mt-0.5 text-[#fcb92c]">{icon}</span><div><strong className="block text-white">{title}</strong><span className="mt-1 block leading-5">{text}</span></div></div>;
}

function GoogleIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
    <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.33 2.98-7.41Z" />
    <path fill="#34A853" d="M12 22c2.7 0 4.98-.9 6.63-2.42l-3.24-2.53c-.9.6-2.05.96-3.39.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
    <path fill="#FBBC05" d="M6.39 13.88A6 6 0 0 1 6.07 12c0-.65.11-1.29.32-1.88V7.5H3.04A10 10 0 0 0 2 12c0 1.61.39 3.13 1.04 4.5l3.35-2.62Z" />
    <path fill="#EA4335" d="M12 5.99c1.47 0 2.79.5 3.83 1.5l2.87-2.87A9.63 9.63 0 0 0 12 2a10 10 0 0 0-8.96 5.5l3.35 2.62C7.18 7.75 9.39 5.99 12 5.99Z" />
  </svg>;
}
