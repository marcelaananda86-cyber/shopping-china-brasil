import { FALLBACK_REFERENCE_USD_BRL } from "@/lib/commerce-rules";

const SOURCE_URL = "https://www.shoppingchina.com.br/";

export type ExchangeRateData = {
  usdBrl: number;
  source: "shopping-china";
  sourceUrl: string;
  fetchedAt: string;
  fallback: boolean;
};

export async function getSourceExchangeRate(): Promise<ExchangeRateData> {
  try {
    const response = await fetch(SOURCE_URL, {
      headers: { "user-agent": "ShoppingChinaBrasilExchangeRate/1.0" },
      next: { revalidate: 900 },
    });
    if (!response.ok) throw new Error(`source_http_${response.status}`);
    const html = await response.text();
    const scriptRate = html.match(/regular_price_usd\s*\*\s*([0-9]+(?:\.[0-9]+)?)/)?.[1];
    const badgeRate = html.match(/>([0-9]+(?:[.,][0-9]+)?)R\$<\/span>/i)?.[1];
    const usdBrl = Number((scriptRate ?? badgeRate ?? "").replace(",", "."));
    if (!Number.isFinite(usdBrl) || usdBrl < 1 || usdBrl > 20) throw new Error("invalid_source_rate");
    return { usdBrl, source: "shopping-china", sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), fallback: false };
  } catch {
    return { usdBrl: FALLBACK_REFERENCE_USD_BRL, source: "shopping-china", sourceUrl: SOURCE_URL, fetchedAt: new Date().toISOString(), fallback: true };
  }
}
