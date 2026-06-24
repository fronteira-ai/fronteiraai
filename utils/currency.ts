// Conversão por taxa fixa removida (ADR-009): o banco já guarda price_usd e
// price_brl como valores independentes por oferta, definidos por quem
// cadastra — não derivados matematicamente um do outro.

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
