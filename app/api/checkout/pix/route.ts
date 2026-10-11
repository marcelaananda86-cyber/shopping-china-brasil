import { NextRequest } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).origin !== request.nextUrl.origin) return Response.json({ error: "invalid_origin" }, { status: 403 });
  return forward(request, "POST");
}

export async function GET(request: NextRequest) {
  return forward(request, "GET");
}

async function forward(request: NextRequest, method: "GET" | "POST") {
  if (!hasSupabaseConfig()) return Response.json({ error: "service_unavailable" }, { status: 503 });
  const supabase = await createSupabaseServerClient();
  const [{ data: userData }, { data: sessionData }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.auth.getSession(),
  ]);
  if (!userData.user || !sessionData.session?.access_token) return Response.json({ error: "authentication_required" }, { status: 401 });

  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const target = new URL(`${baseUrl}/functions/v1/create-pix`);
  if (method === "GET") {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (orderId) target.searchParams.set("orderId", orderId);
  }

  const response = await fetch(target, {
    method,
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      "Content-Type": "application/json",
    },
    body: method === "POST" ? await request.text() : undefined,
    cache: "no-store",
  });
  return new Response(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json", "cache-control": "no-store" },
  });
}
