import type { Metadata } from "next";
import { CartPageContent } from "@/components/cart-page-content";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Carrinho de compras" };
export const dynamic = "force-dynamic";

export default async function CartPage() {
  let authenticated = false;
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    authenticated = Boolean(data.user);
  }
  return <main className="page-shell py-8 md:py-12"><CartPageContent authenticated={authenticated} /></main>;
}
