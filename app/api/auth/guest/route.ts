import { NextRequest } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) return Response.json({ error: "invalid_origin" }, { status: 403 });
  if (!hasSupabaseConfig()) return Response.json({ error: "service_unavailable" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return Response.json({ success: true });
  const { error } = await supabase.auth.signInAnonymously();
  if (error) return Response.json({ error: "guest_session_unavailable", message: "Não foi possível iniciar o checkout. Tente novamente." }, { status: 503 });
  return Response.json({ success: true });
}

function hasAllowedOrigin(request: NextRequest) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;
  try {
    const origin = new URL(originHeader).origin;
    const allowed = new Set([request.nextUrl.origin]);
    const publicUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (publicUrl) allowed.add(new URL(publicUrl).origin);
    const host = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() || request.headers.get("host");
    if (host) allowed.add(`${request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"}://${host}`);
    return allowed.has(origin);
  } catch {
    return false;
  }
}
