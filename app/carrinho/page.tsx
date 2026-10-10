import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart-page-content";

export const metadata: Metadata = { title: "Carrinho de compras" };

export default function CartPage() {
  return <main className="page-shell py-8 md:py-12"><CartPageContent /></main>;
}
