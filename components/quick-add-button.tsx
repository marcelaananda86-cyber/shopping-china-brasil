"use client";

import { ShoppingCart } from "lucide-react";
import type { ProductCardData } from "@/lib/shopping-china";
import { useCart } from "@/components/cart-provider";

export function QuickAddButton({ product }: { product: ProductCardData }) {
  const { addItem } = useCart();
  return <button type="button" onClick={() => addItem(product)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-[#002055] px-3 py-2.5 text-xs font-bold text-white transition hover:bg-[#bd0811]"><ShoppingCart size={15} /> Adicionar</button>;
}
