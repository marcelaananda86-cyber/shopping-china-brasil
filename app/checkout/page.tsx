import type { Metadata } from "next";
import { CheckoutPageContent } from "@/components/checkout-page-content";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage() {
  let customer = { name: "", email: "", phone: "", cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };
  if (hasSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("name,email,phone,address").eq("id", user.id).maybeSingle();
      const address = profile?.address && typeof profile.address === "object" ? profile.address as Record<string, unknown> : {};
      customer = {
        name: String(profile?.name ?? user.user_metadata?.name ?? user.user_metadata?.full_name ?? ""),
        email: String(profile?.email ?? user.email ?? ""),
        phone: String(profile?.phone ?? ""),
        cep: String(address.zipCode ?? ""),
        street: String(address.street ?? ""),
        number: String(address.number ?? ""),
        complement: String(address.complement ?? ""),
        neighborhood: String(address.neighborhood ?? ""),
        city: String(address.city ?? ""),
        state: String(address.state ?? ""),
      };
    }
  }

  return <main className="bg-[#f5f7fb] py-7 md:py-11"><div className="page-shell"><CheckoutPageContent initialCustomer={customer} /></div></main>;
}
