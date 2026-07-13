import { ProductWithRelations } from "@/types/product";
import { OfferWithStore } from "@/types/offer";
import { OfferPriceMetrics } from "@/types/priceHistory";
import type { OfferRankFactor } from "@/src/domains/canonical-catalog";
import type { BestDealResult, PurchaseTimingResult } from "@/src/domains/buyer-intelligence";

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
  /** Release 2.0 — Wave 2 (Best Deal). null when there's no canonical link
   * yet (Shadow Mode) — same BestDealComposer output used on the product
   * page, just resolved from data this service already fetched. */
  bestDeal: BestDealResult | null;
  bestDealStoreName: string | null;
  /** Release 2.0 — Wave 3 (Should I Buy Now). Same null-when-no-canonical-
   * link convention as bestDeal. */
  purchaseTiming: PurchaseTimingResult | null;
}
