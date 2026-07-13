import type { CanonicalProduct, CanonicalOfferView, OfferRankFactor, CanonicalPriceAggregation } from "@/src/domains/canonical-catalog";
import type { PriceStatistics, SavingsOpportunity } from "@/src/domains/market-insights";
import type { FreshnessScore } from "@/src/domains/realtime-commerce";
import type { ExchangeRate } from "@/src/domains/exchange";

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
  /** Release 2.0 — Wave 2. true when this product's own price already
   * equals the cross-store lowest for its canonical group (>=2 stores) —
   * the compact "🏆 Melhor Compra" signal for a results grid, computed from
   * the exact same PriceStatistics call as belowAveragePrice, never a
   * second query and never the full BestDealComposer pipeline. */
  isBestDeal: boolean;
}

// ── Release 2.0 — Wave 2 (Experience Iteration 2 — Best Deal). ──────────
// Every field below is read from ComparisonIntelligenceBundle (already
// built by ComparisonIntelligenceComposer) or from ExchangeRateService —
// BestDealComposer computes nothing new, it only selects, labels, and
// compares numbers that already exist. See docs/product/DECISION_LAYER.md.

/** One line of the "why this store" explanation — always traceable to a
 * named existing factor, never free text invented at render time. */
export interface BestDealReason {
  /** Matches OfferRankingService's factor names ("price", "availability",
   * "recency", "trust", "listing-quality") plus two composer-level labels
   * ("savings", "freshness") that restate a value already computed
   * elsewhere (SavingsOpportunity, FreshnessScore) in buyer-facing words. */
  factor: string;
  label: string;
  evidence: string;
}

/** Objetivo 6 — "duas lojas equivalentes". Built by comparing the two
 * already-computed rankScore numbers (OfferRankingService, 0-100 scale) —
 * a threshold comparison, not a new score. See BestDealComposer for the
 * exact, documented threshold and BUYER_INTELLIGENCE_LAYER.md/
 * DECISION_LAYER.md for why this doesn't count as new intelligence. */
export interface NearTieInfo {
  isNearTie: boolean;
  /** The rank-1 and rank-2 offers being compared. */
  contenders: RankedOfferIntelligence[];
  /** The single existing factor with the largest weight gap between the
   * two contenders — "the main difference" cited in the explanation. */
  differentiatingFactor: BestDealReason | null;
}

export interface ExchangeContext {
  rate: ExchangeRate;
}

export interface BestDealResult {
  canonicalProduct: CanonicalProduct;
  /** The rank-1 offer — never recomputed, read directly from
   * ComparisonIntelligenceBundle.offers. */
  recommendedOffer: RankedOfferIntelligence;
  reasons: BestDealReason[];
  priceStatistics: PriceStatistics | null;
  savingsOpportunity: SavingsOpportunity | null;
  exchangeContext: ExchangeContext | null;
  nearTie: NearTieInfo | null;
  totalOffers: number;
  errors: Partial<Record<ComposerErrorKey | "exchangeRate", string>>;
}
