import { ParaguAIAdvisorComposer } from "../services/ParaguAIAdvisorComposer";
import type { BestDealResult, PurchaseTimingResult, TrustCardResult, RankedOfferIntelligence } from "../types/buyer-intelligence.types";
import type { CanonicalProduct, CanonicalPriceAggregation } from "@/src/domains/canonical-catalog";
import { FreshnessClass } from "@/src/domains/realtime-commerce";
import { TrustBadge } from "@/src/domains/trust/types/enums";

function makeCanonicalProduct(): CanonicalProduct {
  return {
    id: "canonical-1",
    canonicalSlug: "iphone-15-pro",
    name: "iPhone 15 Pro",
    brandId: "brand-1",
    categoryId: "category-1",
    imageUrl: null,
    specifications: null,
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
  };
}

function makeRanked(): RankedOfferIntelligence {
  return {
    offer: {
      offerId: "offer-1",
      productId: "product-1",
      storeId: "store-1",
      storeSlug: "store-1",
      priceUSD: 90,
      inStock: true,
      stockQuantity: 5,
      updatedAt: new Date().toISOString(),
      condition: "new",
      warranty: null,
      productUrl: null,
    },
    rank: 1,
    rankScore: 90,
    factors: [],
    isVerifiedStore: true,
    freshness: { offerId: "offer-1", score: 100, classification: FreshnessClass.Live, ageSeconds: 10, lastChangeAt: null },
  };
}

function makeBestDeal(overrides: Partial<BestDealResult> = {}): BestDealResult {
  return {
    canonicalProduct: makeCanonicalProduct(),
    recommendedOffer: makeRanked(),
    reasons: [{ factor: "price", label: "Melhor preço", evidence: "Menor preço entre 3 lojas" }],
    priceStatistics: null,
    savingsOpportunity: {
      canonicalProductId: "canonical-1",
      cheapestStoreId: "store-1",
      cheapestStoreSlug: "store-1",
      cheapestPriceUSD: 90,
      mostExpensiveStoreId: "store-2",
      mostExpensiveStoreSlug: "store-2",
      mostExpensivePriceUSD: 120,
      maxSavingsUSD: 30,
      maxSavingsPercent: 25,
    },
    exchangeContext: null,
    nearTie: null,
    totalOffers: 3,
    errors: {},
    ...overrides,
  };
}

function makeAggregation(overrides: Partial<CanonicalPriceAggregation> = {}): CanonicalPriceAggregation {
  return {
    lowestPriceUSD: 90,
    highestPriceUSD: 90,
    averagePriceUSD: 90,
    lastPriceUSD: 90,
    variationPercent: 0,
    trend: "stable",
    lastUpdatedAt: "2026-07-13T00:00:00Z",
    firstSeenAt: "2026-06-01T00:00:00Z",
    ...overrides,
  };
}

function makePurchaseTiming(overrides: Partial<PurchaseTimingResult> = {}): PurchaseTimingResult {
  return {
    canonicalProductId: "canonical-1",
    verdict: "buy_now",
    reasons: [{ factor: "trend", label: "Preço em queda", evidence: "Variação de -10%" }],
    priceAggregation: makeAggregation({ trend: "down", variationPercent: -10 }),
    priceStatistics: null,
    volatility: null,
    exchangeTrend: null,
    errors: {},
    ...overrides,
  };
}

function makeTrust(overrides: Partial<TrustCardResult> = {}): TrustCardResult {
  return {
    storeId: "store-1",
    merchantId: "merchant-1",
    isVerified: true,
    badgeLevel: TrustBadge.Verified,
    trustScore: 82,
    activeBadges: [],
    freshness: null,
    inStock: true,
    historyTrend: "stable",
    signals: [],
    limitations: [],
    errors: {},
    ...overrides,
  };
}

describe("ParaguAIAdvisorComposer", () => {
  it("returns insufficient_data when there is no bestDeal (no canonical link) — never guesses", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(null, null, null);
    expect(result.recommendation).toBe("insufficient_data");
    expect(result.conflicts).toHaveLength(0);
  });

  it("recommends buy_now when price, timing, and trust all agree — no conflict", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(makeBestDeal(), makePurchaseTiming({ verdict: "buy_now" }), makeTrust({ isVerified: true }));
    expect(result.recommendation).toBe("buy_now");
    expect(result.conflicts).toHaveLength(0);
  });

  it("flags a conflict (never hides it) when price is excellent but trust is low", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(makeBestDeal(), makePurchaseTiming({ verdict: "buy_now" }), makeTrust({ isVerified: false }));
    expect(result.recommendation).toBe("good_deal_caution");
    expect(result.conflicts).toHaveLength(1);
    expect(result.conflicts[0].signalA).toBe("Preço excelente");
    expect(result.conflicts[0].signalB).toBe("Confiança baixa");
  });

  it("flags a conflict when price is excellent but purchase timing says better_wait", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(makeBestDeal(), makePurchaseTiming({ verdict: "better_wait" }), makeTrust({ isVerified: true }));
    expect(result.recommendation).toBe("good_deal_caution");
    expect(result.conflicts.some((c) => c.signalB === "Melhor aguardar")).toBe(true);
  });

  it("recommends wait when timing says better_wait and there is no excellent-price conflict", () => {
    const composer = new ParaguAIAdvisorComposer();
    const bestDealNoSavings = makeBestDeal({ savingsOpportunity: null });
    const result = composer.compose(bestDealNoSavings, makePurchaseTiming({ verdict: "better_wait" }), makeTrust({ isVerified: true }));
    expect(result.recommendation).toBe("wait");
    expect(result.conflicts).toHaveLength(0);
  });

  it("does not flag a trust conflict for an unclaimed store (merchantId null) — that is a different, already-documented case", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(makeBestDeal(), makePurchaseTiming({ verdict: "buy_now" }), makeTrust({ merchantId: null, isVerified: false }));
    expect(result.conflicts.some((c) => c.signalB === "Confiança baixa")).toBe(false);
  });

  it("caps the Recommendation Summary at 5 lines", () => {
    const composer = new ParaguAIAdvisorComposer();
    const result = composer.compose(makeBestDeal(), makePurchaseTiming({ verdict: "better_wait" }), makeTrust({ isVerified: false }));
    expect(result.summary.length).toBeLessThanOrEqual(5);
    expect(result.summary[0].icon).toBe("🏆");
  });
});
