export default function Loading() {
  return <main className="page-shell py-12"><div className="h-8 w-72 animate-pulse rounded-lg bg-slate-200" /><div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{Array.from({ length: 12 }, (_, index) => <div key={index} className="aspect-[3/4] animate-pulse rounded-2xl bg-slate-200" />)}</div></main>;
}
