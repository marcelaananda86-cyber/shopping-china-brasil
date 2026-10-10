"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { FALLBACK_REFERENCE_USD_BRL } from "@/lib/commerce-rules";
import type { ExchangeRateData } from "@/lib/exchange-rate";

const fallback: ExchangeRateData = { usdBrl: FALLBACK_REFERENCE_USD_BRL, source: "shopping-china", sourceUrl: "https://www.shoppingchina.com.br/", fetchedAt: new Date(0).toISOString(), fallback: true };
const ExchangeRateContext = createContext<ExchangeRateData>(fallback);

export function ExchangeRateProvider({ initial, children }: { initial: ExchangeRateData; children: React.ReactNode }) {
  const [value, setValue] = useState(initial);
  useEffect(() => {
    let active = true;
    async function refresh() {
      try {
        const response = await fetch("/api/exchange-rate", { cache: "no-store" });
        if (response.ok && active) setValue(await response.json());
      } catch { /* keep last valid rate */ }
    }
    void refresh();
    const interval = window.setInterval(refresh, 15 * 60 * 1000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);
  const context = useMemo(() => value, [value]);
  return <ExchangeRateContext.Provider value={context}>{children}</ExchangeRateContext.Provider>;
}

export function useExchangeRate() {
  return useContext(ExchangeRateContext);
}
