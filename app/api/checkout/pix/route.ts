import { NextRequest } from "next/server";
import { createSupabaseServerClient, hasSupabaseConfig } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!hasAllowedOrigin(request)) {
    return Response.json({ error: "invalid_origin", message: "Origem do checkout não autorizada." }, { status: 403 });
  }
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

function hasAllowedOrigin(request: NextRequest) {
  const originHeader = request.headers.get("origin");
  if (!originHeader) return true;

  let origin: string;
  try {
    origin = new URL(originHeader).origin;
  } catch {
    return false;
  }

  const allowedOrigins = new Set<string>([request.nextUrl.origin]);
  const publicSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (publicSiteUrl) {
    try {
      allowedOrigins.add(new URL(publicSiteUrl).origin);
    } catch {
      // An invalid optional public URL must not break checkout requests.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (host) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || request.nextUrl.protocol.replace(":", "") || "https";
    allowedOrigins.add(`${protocol}://${host}`);
  }

  return allowedOrigins.has(origin);
}
