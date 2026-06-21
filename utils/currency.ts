const USD_TO_BRL_RATE = 5.4;

const EXCHANGE_RATES_TO_USD: Record<string, number> = {
  USD: 1,
  BRL: 1 / USD_TO_BRL_RATE,
};

export function convertToUSD(value: number, currency: string): number {
  const rate = EXCHANGE_RATES_TO_USD[currency] ?? 1;
  return value * rate;
}

export function convertToBRL(value: number, currency: string): number {
  return convertToUSD(value, currency) * USD_TO_BRL_RATE;
}

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function discountPercentage(original: number, current: number): number {
  if (original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}
