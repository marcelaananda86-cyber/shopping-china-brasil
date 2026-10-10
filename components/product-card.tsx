import Link from "next/link";
import type { ProductCardData } from "@/lib/shopping-china";

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link href={`/produto/${product.slug}`} className="product-card group">
      <div className="product-image-wrap">
        {product.discount ? <span className="discount-badge">-{product.discount}%</span> : null}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={product.image} alt={product.title} loading="lazy" className="product-image" />
      </div>
      <div className="flex min-h-28 flex-col px-4 pb-4 pt-3">
        <h3 className="line-clamp-3 text-sm font-semibold uppercase leading-5 text-[#002055]">{product.title}</h3>
        <div className="mt-auto pt-3">
          {product.oldPrice ? <span className="mr-2 text-xs text-slate-400 line-through">{product.oldPrice}</span> : null}
          <span className={product.discount ? "font-bold text-[#bd0811]" : "font-bold text-[#002055]"}>
            {product.price ?? "Consulte"}
          </span>
        </div>
      </div>
    </Link>
  );
}
