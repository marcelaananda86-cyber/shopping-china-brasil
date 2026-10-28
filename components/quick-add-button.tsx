"use client";

import { ShoppingCart } from "lucide-react";
import type { ProductCardData } from "@/lib/shopping-china";
import { useCart } from "@/components/cart-provider";

export function QuickAddButton({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  return <button type="button" onClick={() => addItem(product)} className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-full bg-[#002055] px-2 text-[11px] font-bold text-white transition hover:bg-[#bd0811] sm:gap-2 sm:px-3 sm:text-xs"><ShoppingCart size={15} /> Adicionar</button>;
}
