export const OPERATIONAL_LIMIT_USD = 500;
export const FALLBACK_REFERENCE_USD_BRL = 5.12;
export const PIX_BATCH_MAX_BRL = 2000;

const SOUTH_STATES = new Set(["PR", "SC", "RS"]);
const CENTRAL_STATES = new Set(["DF", "ES", "GO", "MG", "MS", "MT", "RJ", "SP"]);

export function shippingPriceForState(state: string) {
  const normalized = state.trim().toUpperCase();
  if (SOUTH_STATES.has(normalized)) return 49.9;
  if (CENTRAL_STATES.has(normalized)) return 79.9;
  if (/^[A-Z]{2}$/.test(normalized)) return 94.9;
  return null;
}

export function shippingRegionLabel(state: string) {
  const normalized = state.trim().toUpperCase();
  if (SOUTH_STATES.has(normalized)) return "Região Sul";
  if (CENTRAL_STATES.has(normalized)) return "Sudeste e Centro-Oeste";
  if (/^[A-Z]{2}$/.test(normalized)) return "Norte e Nordeste";
  return "Informe o CEP";
}

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
