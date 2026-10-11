import type { Metadata } from "next";
import { CheckoutPageContent } from "@/components/checkout-page-content";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  let customer = { name: "", email: "", phone: "" };

  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name,email,phone").eq("id", user.id).maybeSingle();
      customer = {
        name: String(profile?.name ?? user.user_metadata?.name ?? ""),
        email: String(profile?.email ?? user.email ?? ""),
        phone: String(profile?.phone ?? ""),
      };
    }
  }

  return <main className="bg-[#f5f7fb] py-7 md:py-11"><div className="page-shell"><CheckoutPageContent initialCustomer={customer} /></div></main>;
}
