import { ProductWithRelations } from "@/types/product";
import { OfferWithStore } from "@/types/offer";
import { OfferPriceMetrics } from "@/types/priceHistory";

export interface RankedOffer {
  offer: OfferWithStore;
  rank: number;
  rankScore: number;
  priceMetrics: OfferPriceMetrics | null;
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
