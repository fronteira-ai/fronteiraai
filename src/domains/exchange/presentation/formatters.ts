// Program ΔR — Mission ΔR-1.2 (Objetivo 7 — Padronização de precisão). The
// ONE place every currency string in the platform is formatted — moved
// from utils/currency.ts (which used to duplicate this per-file) so
// PricePresentationService and every screen share the exact same rounding,
// symbol, and thousands-separator rules. Pure functions, no I/O.

export function formatUSD(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

export function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

/** "1 USD = R$ 5,42" — always 2 decimal places on the rate side, matching
 * formatBRL's own precision so the two never disagree visually. */
export function formatRate(rate: number, quoteCurrencyLabel: string): string {
  return `1 USD = ${quoteCurrencyLabel} ${rate.toFixed(2).replace(".", ",")}`;
}

const STALE_LABEL = "Cotação desatualizada";

/** Objetivo 5 — never hides staleness: an isStale=true timestamp always
 * reads "Cotação desatualizada", regardless of how recent capturedAt is. */
export function formatTimestamp(capturedAt: string | null, isStale: boolean): string {
  if (isStale) return STALE_LABEL;
  if (!capturedAt) return "Sem cotação disponível";

  const ageMs = Date.now() - new Date(capturedAt).getTime();
  const ageMin = Math.round(ageMs / 60_000);
  if (ageMin < 1) return "Atualizado agora mesmo";
  if (ageMin === 1) return "Atualizado há 1 min";
  if (ageMin < 60) return `Atualizado há ${ageMin} min`;

  const ageHours = Math.round(ageMin / 60);
  return ageHours === 1 ? "Atualizado há 1h" : `Atualizado há ${ageHours}h`;
}

export function formatPercent(value: number, decimals = 0): string {
  return `${value.toFixed(decimals)}%`;
}
