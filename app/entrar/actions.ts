"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth-navigation";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) redirect("/entrar?erro=Informe um e-mail válido e uma senha de pelo menos 8 caracteres.");
  return { email, password };
}

export async function signIn(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { email, password } = credentials(formData);
  const next = safeNextPath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/entrar?erro=${encodeURIComponent("E-mail ou senha inválidos.")}&next=${encodeURIComponent(next)}`);
  redirect(next);
}

export async function signUp(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const { email, password } = credentials(formData);
  const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const next = safeNextPath(formData.get("next"));
  if (name.length < 2) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent("Informe seu nome completo.")}&next=${encodeURIComponent(next)}`);
  if (password !== passwordConfirmation) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent("As senhas informadas não são iguais.")}&next=${encodeURIComponent(next)}`);
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent("Não foi possível determinar o endereço do site.")}&next=${encodeURIComponent(next)}`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect(`/entrar?modo=cadastro&erro=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  if (data.session) redirect(next);
  redirect(`/entrar?sucesso=${encodeURIComponent("Cadastro realizado. Confira seu e-mail para confirmar a conta.")}&next=${encodeURIComponent(next)}`);
}

export async function signInWithGoogle(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const next = safeNextPath(formData.get("next"));
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (!origin) redirect(`/entrar?erro=${encodeURIComponent("Não foi possível iniciar o acesso com Google.")}&next=${encodeURIComponent(next)}`);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/confirm?next=${encodeURIComponent(next)}`,
      queryParams: { access_type: "offline", prompt: "consent" },
    },
  });
  if (error || !data.url) redirect(`/entrar?erro=${encodeURIComponent("Não foi possível entrar com Google. Tente novamente.")}&next=${encodeURIComponent(next)}`);
  redirect(data.url);
}

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}
