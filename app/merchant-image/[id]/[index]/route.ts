export const dynamic = "force-dynamic";

type ImageRow = {
  image_url: string | null;
  additional_image_urls: string[] | null;
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string; index: string }> },
) {
  const { id, index: rawIndex } = await context.params;
  const index = Number(rawIndex);

  if (!/^\d+$/.test(id) || !Number.isInteger(index) || index < 0 || index > 10) {
    return new Response("Imagem inválida", { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !key) {
    return new Response("Imagem temporariamente indisponível", { status: 503 });
  }

  const params = new URLSearchParams({
    select: "image_url,additional_image_urls",
    id: `eq.${id}`,
    limit: "1",
  });
  const productResponse = await fetch(`${supabaseUrl}/rest/v1/merchant_products?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    next: { revalidate: 86400 },
  });
  if (!productResponse.ok) {
    return new Response("Imagem temporariamente indisponível", { status: 503 });
  }

  const [product] = await productResponse.json() as ImageRow[];
  const imageUrl = index === 0
    ? product?.image_url
    : product?.additional_image_urls?.[index - 1];
  if (!imageUrl) return new Response("Imagem não encontrada", { status: 404 });

  const imageResponse = await fetch(imageUrl, {
    headers: {
      Accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "User-Agent": "ShoppingChinaBrasil-MerchantImage/1.0",
    },
    redirect: "follow",
    next: { revalidate: 604800 },
  });
  const contentType = imageResponse.headers.get("content-type")?.split(";")[0] ?? "";
  if (!imageResponse.ok || !contentType.startsWith("image/")) {
    return new Response("Imagem não encontrada", { status: 404 });
  }

  return new Response(imageResponse.body, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
