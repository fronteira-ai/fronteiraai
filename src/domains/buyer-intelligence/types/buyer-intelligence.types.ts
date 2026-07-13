import type { CanonicalProduct, CanonicalOfferView, OfferRankFactor, CanonicalPriceAggregation } from "@/src/domains/canonical-catalog";
import type { PriceStatistics, SavingsOpportunity, CanonicalVolatilityProfile } from "@/src/domains/market-insights";
import type { FreshnessScore } from "@/src/domains/realtime-commerce";
import type { ExchangeRate } from "@/src/domains/exchange";
import type { MerchantBadgeRecord } from "@/src/domains/trust/types/trust.types";
import type { TrustBadge } from "@/src/domains/trust/types/enums";

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

// ── Release 2.0 — Wave 3 (Experience Iteration 3 — Should I Buy Now). ────
// Every field below is read from CanonicalPriceHistoryService's already-
// computed `trend`/`variationPercent` (via the bundle), PriceIntelligenceService's
// already-computed median, VolatilityRollupService's already-computed
// classification, ExchangeHistoryService's already-stored rate history, and
// FreshnessService's already-computed classification. PurchaseTimingComposer
// introduces no new price math anywhere — see docs/product/PURCHASE_TIMING_DECISION.md.

export type PurchaseTimingVerdict = "buy_now" | "can_wait" | "better_wait" | "insufficient_data";

/** Same shape/discipline as BestDealReason — every reason traces to one
 * named existing signal, never free text invented at render time. */
export interface PurchaseTimingReason {
  factor: string;
  label: string;
  evidence: string;
}

export interface ExchangeTrendContext {
  direction: "favorable" | "unfavorable" | "stable";
  /** The oldest and newest ExchangeRate in the lookback window
   * (ExchangeHistoryService.getRange — already-stored rows, no new fetch
   * mechanism) — "favorable" means USD/BRL fell (fewer Reais per dollar)
   * across that window, a plain first-vs-last comparison. */
  fromRate: ExchangeRate;
  toRate: ExchangeRate;
  changePercent: number;
}

export interface PurchaseTimingResult {
  canonicalProductId: string;
  verdict: PurchaseTimingVerdict;
  reasons: PurchaseTimingReason[];
  priceAggregation: CanonicalPriceAggregation;
  priceStatistics: PriceStatistics | null;
  volatility: CanonicalVolatilityProfile | null;
  exchangeTrend: ExchangeTrendContext | null;
  errors: Partial<Record<ComposerErrorKey | "volatility" | "exchangeTrend", string>>;
}

// ── Release 2.0 — Wave 4 (Experience Iteration 4 — Trust Experience). ────
// Every field below is read from BadgeService/MerchantProfileService/
// TrustHistoryService (already-tested trust domain services) or from
// RankedOfferIntelligence (isVerifiedStore/freshness, already resolved by
// ComparisonIntelligenceComposer in Wave 1). TrustComposer introduces no new
// trust score, no new badge rule, no new verification logic — see
// docs/product/TRUST_DECISION_ARCHITECTURE.md.

/** Same shape/discipline as BestDealReason/PurchaseTimingReason — every
 * signal traces to one named existing value, never free text invented at
 * render time. */
export interface TrustSignalLine {
  factor: string;
  label: string;
  evidence: string;
}

/** Built by comparing the oldest and newest of up to 30
 * TrustHistoryService snapshots (a first-vs-last comparison, same
 * discipline as PurchaseTimingComposer's price trend) — "unknown" when
 * fewer than 2 snapshots exist, never guessed from a single data point. */
export type TrustHistoryTrend = "improving" | "stable" | "declining" | "unknown";

export interface TrustCardResult {
  storeId: string;
  /** null when this store has no merchant linked yet (IMerchantStoreLinkRepository) —
   * every merchant-dependent field below is then null/empty and the card
   * shows "Informação indisponível", never a fabricated status. */
  merchantId: string | null;
  /** Read directly from RankedOfferIntelligence.isVerifiedStore when composed
   * from an offer — the exact same value already shown elsewhere in the app,
   * never a second/competing definition of "verified". */
  isVerified: boolean;
  badgeLevel: TrustBadge | null;
  trustScore: number | null;
  activeBadges: MerchantBadgeRecord[];
  freshness: FreshnessScore | null;
  inStock: boolean | null;
  historyTrend: TrustHistoryTrend;
  signals: TrustSignalLine[];
  /** Objetivo 3 — honest caveats, e.g. "loja não vinculada a um perfil de
   * confiança", "histórico insuficiente para avaliar consistência". Never
   * flips isVerified/badgeLevel/trustScore, only documents their absence. */
  limitations: string[];
  errors: Partial<Record<"profile" | "history", string>>;
}

/** Objetivo 5 — Search Results compact version: verification only, no
 * profile/history fetch, same batched read pattern as
 * ComparisonIntelligenceComposer's own store-verification resolution. */
export interface CompactTrustBadge {
  storeId: string;
  isVerified: boolean;
}
