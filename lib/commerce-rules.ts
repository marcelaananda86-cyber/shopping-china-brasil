export const OPERATIONAL_LIMIT_USD = 500;
export const FALLBACK_REFERENCE_USD_BRL = 5.12;
export const PIX_BATCH_MAX_BRL = 2000;

export function operationalLimitBrl(rate = FALLBACK_REFERENCE_USD_BRL) {
  return OPERATIONAL_LIMIT_USD * rate;
}

export function estimateUsd(valueBrl: number, rate = FALLBACK_REFERENCE_USD_BRL) {
  return valueBrl / rate;
}

export function calculatePixBatches(total: number) {
  if (total <= 0) return [];
  const count = Math.max(1, Math.ceil(total / PIX_BATCH_MAX_BRL));
  const base = Math.floor((total / count) * 100) / 100;
  return Array.from({ length: count }, (_, index) => index === count - 1
    ? Number((total - base * (count - 1)).toFixed(2))
    : base);
}

export function isHighValueOrderAllowed(total: number, itemCount: number, rate = FALLBACK_REFERENCE_USD_BRL) {
  return total <= operationalLimitBrl(rate) || itemCount === 1;
}
