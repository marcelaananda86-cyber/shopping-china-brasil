import { NextResponse } from "next/server";
import { getSearchPage, type SearchSort } from "@/lib/shopping-china";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const SORTS = new Set<SearchSort>(["relevance", "newest", "name-asc", "name-desc", "price-asc", "price-desc"]);

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const requestedSort = url.searchParams.get("sort") as SearchSort | null;
  const sort = requestedSort && SORTS.has(requestedSort) ? requestedSort : "relevance";
  const limit = Math.min(24, Math.max(1, Number(url.searchParams.get("limit")) || 24));

  if (query.length < 2) return NextResponse.json({ products: [], total: 0, page: 1, lastPage: 1 });

  const result = await getSearchPage(query, page, sort);
  if (!result) return NextResponse.json({ error: "Não foi possível consultar o catálogo agora." }, { status: 502 });

  return NextResponse.json({ ...result, products: result.products.slice(0, limit) }, {
    // Netlify's edge cache can collapse query-string variants for this route.
    // Search responses must never be shared between different terms.
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Netlify-CDN-Cache-Control": "no-store",
      "Netlify-Vary": "query=q|page|sort|limit",
      Vary: "Accept-Encoding",
    },
  });
}
