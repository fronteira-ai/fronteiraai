import type { CanonicalProduct, CanonicalOfferView, OfferRankFactor, CanonicalPriceAggregation } from "@/src/domains/canonical-catalog";
import type { PriceStatistics, SavingsOpportunity } from "@/src/domains/market-insights";
import type { FreshnessScore } from "@/src/domains/realtime-commerce";

// Release 2.0 — Wave 1 (Buyer Intelligence Layer). Deliberately a pure DTO
// module: every field here is read, never computed, by the composers in
// ../services/ — see BUYER_INTELLIGENCE_LAYER.md. No new scoring/algorithm
// is introduced anywhere in this domain.

export interface RankedOfferIntelligence {
  offer: CanonicalOfferView;
  rank: number;
  rankScore: number;
  factors: OfferRankFactor[];
  isVerifiedStore: boolean;
  freshness: FreshnessScore | null;
}

export type ComposerErrorKey = "priceStatistics" | "savingsOpportunity" | "freshness" | "verification";

export interface ComparisonIntelligenceBundle {
  canonicalProduct: CanonicalProduct;
  offers: RankedOfferIntelligence[];
  totalOffers: number;
  priceAggregation: CanonicalPriceAggregation;
  priceStatistics: PriceStatistics | null;
  savingsOpportunity: SavingsOpportunity | null;
  /** Promise.allSettled-style per-key isolation (same pattern as
   * ExchangeDashboardService/RealtimeCommerceDashboardService/
   * MarketplaceOperationsDashboardService) — one failing sub-call never
   * blanks the whole bundle. */
  errors: Partial<Record<ComposerErrorKey, string>>;
}

export interface ProductIntelligenceBundle {
  /** null when this product's offers haven't been linked to a canonical
   * product yet (Product Identity, Shadow Mode) — never an error, the page
   * just renders without the canonical-dependent cards. */
  comparison: ComparisonIntelligenceBundle | null;
}

export interface SearchIntelligenceBadge {
  productId: string;
  /** true only when this product IS canonical-linked AND its current lowest
   * price is meaningfully below the cross-store median (see
   * SearchIntelligenceComposer for the exact condition) — the compact
   * "Preço Abaixo da Média" signal, not the full PriceStatistics payload. */
  belowAveragePrice: boolean;
}
