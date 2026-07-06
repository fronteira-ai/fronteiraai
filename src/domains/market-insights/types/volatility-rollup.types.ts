import type { VolatilityClass } from "@/src/domains/realtime-commerce";

// Release 1.8 — Program C — Market Intelligence Engine, Wave 1. Objective 6
// (Volatility Engine) — deliberately NOT a new volatility algorithm.
// `VolatilityEngine` (realtime-commerce, Program A Wave 2) already computes
// frequency/amplitude/velocity/persistence per raw product-in-store; these
// types are the *rollup* of that existing score to levels it doesn't cover
// on its own — canonical product (across every store selling it), category,
// and merchant.

export interface CanonicalVolatilityProfile {
  canonicalProductId: string;
  /** Average of VolatilityEngine's 0-100 score across every raw product
   * linked to this canonical product with enough price history to score. */
  score: number;
  classification: VolatilityClass;
  productsScored: number;
}

export interface CategoryVolatilityProfile {
  categoryId: string;
  averageScore: number;
  canonicalProductsScored: number;
}

export interface MerchantAggressivenessProfile {
  storeId: string;
  /** Fraction (0-1) of this store's price changes in the window that were
   * decreases — "merchants mais agressivos" from the Wave brief: a store
   * that cuts prices more often than it raises them. Pure statistic, no ML. */
  priceDropShare: number;
  priceChangeCount: number;
  windowDays: number;
}
