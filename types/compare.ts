import { ProductWithRelations } from "@/types/product";
import { OfferWithStore } from "@/types/offer";
import { OfferPriceMetrics } from "@/types/priceHistory";
import type { OfferRankFactor } from "@/src/domains/canonical-catalog";

export interface RankedOffer {
  offer: OfferWithStore;
  rank: number;
  rankScore: number;
  priceMetrics: OfferPriceMetrics | null;
  /** Release 2.0 — Wave 1. Explainability factors from OfferRankingService
   * ("Loja Recomendada" — why this store, not just a bare score). Optional
   * because it's undefined for the pre-canonical-link empty-comparison case. */
  factors?: OfferRankFactor[];
}

// Calculated across all offers for one product
export interface CompareSummary {
  lowestPriceUSD: number | null;
  highestPriceUSD: number | null;
  absoluteDifferenceUSD: number | null;
  percentageDifference: number | null;
  maxSavingsUSD: number | null;
  storeCount: number;
  availableCount: number;
}

export interface CompareResult {
  product: ProductWithRelations;
  offers: RankedOffer[];
  summary: CompareSummary;
}
