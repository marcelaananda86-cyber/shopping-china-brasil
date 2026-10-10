import { getSourceExchangeRate } from "@/lib/exchange-rate";

export async function GET() {
  const rate = await getSourceExchangeRate();
  return Response.json(rate, { headers: { "cache-control": "public, max-age=300, s-maxage=900" } });
}
