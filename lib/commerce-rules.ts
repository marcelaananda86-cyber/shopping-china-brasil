export const OPERATIONAL_LIMIT_USD = 500;
export const REFERENCE_USD_BRL = 6;
export const OPERATIONAL_LIMIT_BRL = OPERATIONAL_LIMIT_USD * REFERENCE_USD_BRL;
export const PIX_BATCH_MAX_BRL = 2000;

export function estimateUsd(valueBrl: number) {
  return valueBrl / REFERENCE_USD_BRL;
}

export function calculatePixBatches(total: number) {
  if (total <= 0) return [];
  const count = Math.max(1, Math.ceil(total / PIX_BATCH_MAX_BRL));
  const base = Math.floor((total / count) * 100) / 100;
  return Array.from({ length: count }, (_, index) => index === count - 1
    ? Number((total - base * (count - 1)).toFixed(2))
    : base);
}

export function isHighValueOrderAllowed(total: number, itemCount: number) {
  return total <= OPERATIONAL_LIMIT_BRL || itemCount === 1;
}
