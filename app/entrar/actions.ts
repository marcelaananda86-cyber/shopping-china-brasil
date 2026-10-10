"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) redirect("/entrar?erro=Informe um e-mail válido e uma senha de pelo menos 8 caracteres.");
  return { email, password };
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { email, password } = credentials(formData);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/entrar?erro=${encodeURIComponent("E-mail ou senha inválidos.")}`);
  redirect("/conta");
}

export async function signUp(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { email, password } = credentials(formData);
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent("Informe seu nome completo.")}`);
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, ...(origin ? { emailRedirectTo: `${origin}/auth/confirm` } : {}) },
  });
  if (error) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent(error.message)}`);
  redirect(`/entrar?sucesso=${encodeURIComponent("Cadastro realizado. Confira seu e-mail para confirmar a conta.")}`);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
