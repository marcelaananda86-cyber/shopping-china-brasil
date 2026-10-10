import Link from "next/link";

export default function NotFound() {
  return <main className="page-shell py-24 text-center"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#bd0811]">Página não encontrada</p><h1 className="mt-3 text-4xl font-bold text-[#002055]">Este item não está disponível</h1><p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-slate-500">O catálogo pode ter sido atualizado. Use a busca para localizar o produto ou continue navegando pelas categorias.</p><Link href="/" className="mt-8 inline-flex rounded-full bg-[#002055] px-6 py-3 font-bold text-white hover:bg-[#bd0811]">Voltar ao início</Link></main>;
}
