import type { PriceTrend } from "@/src/domains/canonical-catalog";

// Release 1.8 — Program C — Market Intelligence Engine, Wave 1. Objective 4
// (Price History API) — internal only, no public endpoint. Composes
// CanonicalPriceHistoryService (canonical-catalog) + market_changes
// (realtime-commerce) + VolatilityRollupService (this domain); duplicates
// none of them.
export interface PriceHistoryProfile {
  canonicalProductId: string;
  lastPriceUSD: number | null;
  lastUpdatedAt: string | null;
  firstSeenAt: string | null;
  trend: PriceTrend;
  /** Count of price_increased/price_decreased `market_changes` across every
   * raw product linked to this canonical product, divided by weeks in the
   * window — "frequência de alteração", a plain rate, not a normalized score. */
  changeFrequencyPerWeek: number;
  /** 100 - VolatilityRollupService's canonical score — literal inverse, no
   * second statistic. `null` when there isn't enough price history to
   * compute volatility yet (see VolatilityRollupService.getCanonicalVolatility). */
  stabilityScore: number | null;
}
