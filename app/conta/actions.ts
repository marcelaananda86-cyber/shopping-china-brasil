"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const states = new Set(["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"]);

export async function saveProfile(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar?next=%2Fconta");

  const name = field(formData, "name", 120);
  const phone = digits(field(formData, "phone", 20));
  const address = {
    zipCode: digits(field(formData, "zipCode", 10)),
    street: field(formData, "street", 160),
    number: field(formData, "number", 30),
    complement: field(formData, "complement", 100),
    neighborhood: field(formData, "neighborhood", 100),
    city: field(formData, "city", 100),
    state: field(formData, "state", 2).toUpperCase(),
  };
  if (name.length < 2 || !/^\d{10,11}$/.test(phone) || address.zipCode.length !== 8 || address.street.length < 3 || !address.number || address.neighborhood.length < 2 || address.city.length < 2 || !states.has(address.state)) {
    redirect(`/conta?erro=${encodeURIComponent("Confira seu nome, telefone e endereço antes de salvar.")}#dados`);
  }
  const { error } = await supabase.from("profiles").update({ name, phone, address }).eq("id", user.id);
  if (error) redirect(`/conta?erro=${encodeURIComponent("Não foi possível salvar seus dados. Tente novamente.")}#dados`);
  redirect("/conta?salvo=1#dados");
}

function field(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "").trim().slice(0, maxLength);
}
function digits(value: string) { return value.replace(/\D/g, ""); }
