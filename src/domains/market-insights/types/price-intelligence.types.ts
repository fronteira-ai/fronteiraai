// Release 1.8 — Program C — Market Intelligence Engine, Wave 1.
// Objective 2 (Price Intelligence) + Objective 5 (Savings Engine).

export interface PriceStatistics {
  canonicalProductId: string;
  storeCount: number;
  lowestPriceUSD: number;
  highestPriceUSD: number;
  averagePriceUSD: number;
  medianPriceUSD: number;
  /** highest - lowest, in USD — "faixa de preço" */
  priceRangeUSD: number;
  /** Coefficient of variation (stddev / mean * 100) — "dispersão entre
   * lojas": a standard, explainable statistical dispersion measure, no ML. */
  dispersionPercent: number;
  computedAt: string;
}

export interface SavingsOpportunity {
  canonicalProductId: string;
  cheapestStoreId: string;
  cheapestStoreSlug: string;
  cheapestPriceUSD: number;
  mostExpensiveStoreId: string;
  mostExpensiveStoreSlug: string;
  mostExpensivePriceUSD: number;
  maxSavingsUSD: number;
  maxSavingsPercent: number;
}
