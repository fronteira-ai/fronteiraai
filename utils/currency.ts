// Program ΔR — Mission ΔR-1.2 (Universal Price Presentation). formatUSD/
// formatBRL moved to src/domains/exchange (the domain that owns money
// presentation platform-wide, per the CTO's decision — no ad hoc currency
// formatting outside it) — import them from "@/src/domains/exchange"
// instead. discountPercentage stays here: it is a plain percentage
// calculation between two already-known numbers, not a money-formatting
// concern.
export function discountPercentage(original: number, current: number): number {
  if (original <= current) return 0;
  return Math.round(((original - current) / original) * 100);
}
